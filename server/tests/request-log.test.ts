import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { logger } from "../logger";
import { createUser, resetDatabase, shutdown, startServer, type Api, type TestServer } from "./helpers";

interface Line {
  method: string;
  route: string;
  status: number;
}

/** The access log is the only record of learners' failed sign-ins, so its route names must be right. */
describe("access log route names", () => {
  let server: TestServer;
  let api: Api;
  let lines: Line[] = [];
  const originalChild = logger.child;

  before(async () => {
    await resetDatabase();
    const sink = {
      info: (entry: Line, msg?: string) => void (msg === "request" && lines.push(entry)),
      warn: (entry: Line, msg?: string) => void (msg === "request" && lines.push(entry)),
      error: (entry: Line, msg?: string) => void (msg === "request" && lines.push(entry)),
    };
    // Test logs are silent; collect what requestContext would write.
    logger.child = (() => sink) as unknown as typeof logger.child;
    server = await startServer();
    api = server.api;
  });
  after(async () => {
    logger.child = originalChild;
    await server.close();
    await shutdown();
  });

  async function lineFor(send: () => Promise<unknown>): Promise<Line> {
    lines = [];
    await send();
    await new Promise((resolve) => setImmediate(resolve)); // the 'finish' handler runs after the answer is sent
    assert.equal(lines.length, 1, JSON.stringify(lines));
    return lines[0];
  }

  it("name a failed sign-in by its full path, like a successful one", async () => {
    const user = await createUser();
    const failed = await lineFor(() => api.post("/api/v1/auth/login", { username: user.username, password: "Wrong#Pass-1234" }));
    assert.deepEqual([failed.status, failed.route], [401, "/api/v1/auth/login"]);
    const ok = await lineFor(() => api.post("/api/v1/auth/login", { username: user.username, password: user.password }));
    assert.deepEqual([ok.status, ok.route], [200, "/api/v1/auth/login"]);
  });

  it("name the route pattern of other failures, never the number or id in the address", async () => {
    const unknown = await lineFor(() => api.get("/api/v1/verify/FSWA-AAAA-BBBB-CCCC"));
    assert.deepEqual([unknown.status, unknown.route], [404, "/api/v1/verify/:number"]);
    const page = await lineFor(() => api.get("/verify/FSWA-AAAA-BBBB-CCCC"));
    assert.deepEqual([page.status, page.route], [404, "/verify/:number"]);
  });

  it("name the router when the sign-in check refuses a request before any route matched", async () => {
    const line = await lineFor(() => api.get("/api/v1/courses/"));
    assert.deepEqual([line.status, line.route], [401, "/api/v1/courses (unmatched)"]);
    const admin = await lineFor(() => api.get("/api/v1/admin/users"));
    assert.deepEqual([admin.status, admin.route], [401, "/api/v1/admin (unmatched)"]);
  });

  it("keep unknown addresses anonymous", async () => {
    const line = await lineFor(() => api.get("/api/v1/no-such-thing/123456"));
    assert.equal(line.status, 404);
    assert.equal(line.route, "/api (unmatched)");
  });
});

// Must stay the first import: it switches the limiters back on before the configuration is read.
import "./limitsOn";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { certificates } from "@shared/schema";
import { createSession } from "../auth/sessions";
import { signAccessToken } from "../auth/tokens";
import { config } from "../config";
import { db } from "../db";
import { buildLimiters, ResilientStore } from "../middleware/rateLimit";
import { generateCertificateNumber } from "../services/certificate";
import { createCourse, createUser, resetDatabase, shutdown, signIn, startServer, STRONG_PASSWORD, uniq, type Api, type TestServer } from "./helpers";

before(async () => {
  await resetDatabase();
});
after(shutdown);

/** Every test gets its own server (and so its own counters): all requests come from 127.0.0.1. */
async function withServer(run: (api: Api) => Promise<void>): Promise<void> {
  const server: TestServer = await startServer(buildLimiters());
  try {
    await run(server.api);
  } finally {
    await server.close();
  }
}

const wrongLogin = (api: Api, username: string) => api.post("/api/v1/auth/login", { username, password: "Wrong#Pass-1234" });

describe("sign-in limits", () => {
  it("stop a password-guessing run on one account but leave its neighbours alone", async () => {
    await withServer(async (api) => {
      const victim = await createUser();
      const neighbour = await createUser();

      for (let i = 1; i <= 8; i++) {
        const res = await wrongLogin(api, victim.username);
        assert.equal(res.status, 401, `attempt ${i}`);
        assert.equal(res.body.code, "INVALID_CREDENTIALS");
      }

      // From now on even the right password is refused, until the window passes.
      const blocked = await api.post("/api/v1/auth/login", { username: victim.username, password: victim.password });
      assert.equal(blocked.status, 429);
      assert.equal(blocked.body.code, "RATE_LIMITED");
      assert.ok(blocked.body.requestId, "the standard error body is kept");
      const retry = Number(blocked.headers.get("retry-after"));
      assert.ok(retry > 0 && retry <= 15 * 60, `Retry-After ${retry}`);
      assert.equal(blocked.body.details.retryAfterSeconds, retry);

      // Spelling the name differently does not reset the counter.
      assert.equal((await wrongLogin(api, victim.username.toUpperCase())).status, 429);
      assert.equal((await wrongLogin(api, `  ${victim.username} `)).status, 429);

      // Someone else on the same site Wi-Fi is not affected.
      assert.equal((await api.post("/api/v1/auth/login", { username: neighbour.username, password: neighbour.password })).status, 200);
    });
  });

  it("do not count successful sign-ins, so crews logging in all day are never locked out", async () => {
    await withServer(async (api) => {
      const user = await createUser();
      for (let i = 0; i < 12; i++) assert.equal((await api.post("/api/v1/auth/login", { username: user.username, password: user.password })).status, 200, `sign-in ${i + 1}`);
      assert.equal((await wrongLogin(api, user.username)).status, 401, "typos are still just typos");
    });
  });

  it("slow down password guessing across many usernames from one address", async () => {
    await withServer(async (api) => {
      let blockedAt = 0;
      for (let i = 1; i <= 70; i++) {
        const res = await wrongLogin(api, uniq("ghost"));
        if (res.status === 429) {
          blockedAt = i;
          break;
        }
        assert.equal(res.status, 401);
      }
      assert.equal(blockedAt, 61, "60 failures per 15 minutes per address");
    });
  });
});

describe("password-reset limits", () => {
  it("allow three e-mails per address per hour and answer unknown addresses the same way", async () => {
    await withServer(async (api) => {
      const email = `${uniq("nobody")}@example.com`;
      const bodies: unknown[] = [];
      for (let i = 0; i < 3; i++) {
        const res = await api.post("/api/v1/auth/forgot-password", { email });
        assert.equal(res.status, 200);
        bodies.push(res.body);
      }
      assert.deepEqual(bodies[0], bodies[1]);
      assert.deepEqual(bodies[1], bodies[2]);
      const fourth = await api.post("/api/v1/auth/forgot-password", { email: email.toUpperCase() });
      assert.equal(fourth.status, 429, "case does not matter");
      assert.equal(fourth.body.code, "RATE_LIMITED");
      assert.equal((await api.post("/api/v1/auth/forgot-password", { email: `${uniq("other")}@example.com` })).status, 200, "another address is fine");
    });
  });
});

describe("other limits", () => {
  it("cap registrations per address at the configured number", async () => {
    const original = config.rateLimits.registerPerHour;
    config.rateLimits.registerPerHour = 25;
    try {
      await withServer(async (api) => {
        const statuses: number[] = [];
        for (let i = 0; i < 26; i++) statuses.push((await api.post("/api/v1/auth/register", {})).status);
        assert.deepEqual(new Set(statuses.slice(0, 25)), new Set([400]), "the first 25 are just invalid");
        assert.equal(statuses[25], 429);
      });
    } finally {
      config.rateLimits.registerPerHour = original;
    }
  });

  it("let a whole crew register together behind the site's one address (the old cap of 40 an hour refused the 41st)", async () => {
    assert.ok(config.rateLimits.registerPerHour >= 200, `default ${config.rateLimits.registerPerHour}`);
    await withServer(async (api) => {
      for (let i = 1; i <= 120; i++) {
        const res = await api.post("/api/v1/auth/register", {});
        assert.equal(res.status, 400, `registration ${i} must reach validation, not the limiter`);
      }
    });
  });

  it("count signed-in traffic per person, not per address", async () => {
    await withServer(async (api) => {
      const busy = await signIn(api, await createUser());
      const other = await signIn(api, await createUser());
      let first429 = 0;
      for (let i = 1; i <= 305; i++) {
        const res = await api.get("/api/v1/auth/me", busy.token);
        if (res.status === 429) {
          first429 = i;
          break;
        }
        assert.equal(res.status, 200);
      }
      assert.equal(first429, 301, "300 requests a minute per person");
      assert.equal((await api.get("/api/v1/auth/me", other.token)).status, 200, "the colleague on the same Wi-Fi is unaffected");
    });
  });

  it("cap account export and password changes per person", async () => {
    await withServer(async (api) => {
      const me = await signIn(api, await createUser());
      const statuses: number[] = [];
      for (let i = 0; i < 11; i++) statuses.push((await api.get("/api/v1/auth/me/export", me.token)).status);
      assert.deepEqual(statuses.slice(0, 10), Array(10).fill(200));
      assert.equal(statuses[10], 429);
      const change = await api.post("/api/v1/auth/change-password", { currentPassword: STRONG_PASSWORD, newPassword: "Another#Pass-99" }, me.token);
      assert.equal(change.status, 429, "shares the same budget");
    });
  });
});

describe("a crew behind one address", () => {
  /** Certificates written straight to the database, and access tokens signed directly: no password hashing needed. */
  async function crewWithCertificates(size: number) {
    const fixture = await createCourse({ modules: 1 });
    const crew: { token: string; certificateId: string }[] = [];
    for (let i = 0; i < size; i++) {
      const user = await createUser();
      const [cert] = await db
        .insert(certificates)
        .values({ userId: user.id, courseId: fixture.courseId, certificateNumber: generateCertificateNumber(), issuedName: "Crew Member" })
        .returning({ id: certificates.id });
      crew.push({ token: signAccessToken({ id: user.id, role: "worker", tokenVersion: 0 }).token, certificateId: cert.id });
    }
    return crew;
  }

  it("can all download their certificates at the end of the course (the 31st used to be refused)", async () => {
    await withServer(async (api) => {
      const crew = await crewWithCertificates(36);
      for (const [i, member] of crew.entries()) {
        const link = await api.get(`/api/v1/certificates/${member.certificateId}/download-link`, member.token);
        assert.equal(link.status, 200, `link for learner ${i + 1}`);
        const url = new URL(link.body.url);
        const pdf = await api.download(url.pathname + url.search);
        assert.equal(pdf.status, 200, `signed download for learner ${i + 1}`);
        assert.equal((await api.download(`/api/v1/certificates/${member.certificateId}/pdf`, member.token)).status, 200, `bearer download for learner ${i + 1}`);
      }
    });
  });

  it("still limits one person, and one signed link, on their own", async () => {
    await withServer(async (api) => {
      const [me, colleague] = await crewWithCertificates(2);
      const statuses: number[] = [];
      for (let i = 0; i < 31; i++) statuses.push((await api.download(`/api/v1/certificates/${me.certificateId}/pdf`, me.token)).status);
      assert.deepEqual(statuses.slice(0, 30), Array(30).fill(200));
      assert.equal(statuses[30], 429, "30 PDFs per person per 10 minutes");
      assert.equal((await api.download(`/api/v1/certificates/${colleague.certificateId}/pdf`, colleague.token)).status, 200, "the colleague is unaffected");

      const link = await api.get(`/api/v1/certificates/${colleague.certificateId}/download-link`, colleague.token);
      const url = new URL(link.body.url);
      const viaLink: number[] = [];
      for (let i = 0; i < 31; i++) viaLink.push((await api.download(url.pathname + url.search)).status);
      assert.deepEqual(viaLink.slice(0, 30), Array(30).fill(200));
      assert.equal(viaLink[30], 429, "30 downloads per signed link");
    });
  });

  it("can all refresh their sessions (the 241st phone behind one address used to be refused within a minute)", async () => {
    await withServer(async (api) => {
      const user = await createUser();
      for (let i = 1; i <= 400; i++) {
        const session = await createSession({ id: user.id, role: "worker", tokenVersion: 0 });
        const res = await api.post("/api/v1/auth/refresh", { refreshToken: session.refreshToken });
        assert.equal(res.status, 200, `refresh ${i}: ${res.text}`);
      }
    });
  });

  it("refresh only against its own budget, not the anonymous one sized for sign-in screens", async () => {
    const original = { ...config.rateLimits };
    config.rateLimits.anonymousPerMinute = 20;
    config.rateLimits.refreshPer15Min = 60;
    try {
      await withServer(async (api) => {
        const user = await createUser();
        const statuses: number[] = [];
        for (let i = 0; i < 61; i++) {
          const session = await createSession({ id: user.id, role: "worker", tokenVersion: 0 });
          statuses.push((await api.post("/api/v1/auth/refresh", { refreshToken: session.refreshToken })).status);
        }
        assert.deepEqual(statuses.slice(0, 60), Array(60).fill(200), "far past the anonymous budget of 20");
        assert.equal(statuses[60], 429, "the refresh budget still applies");
        assert.equal((await api.get("/api/v1/config")).status, 200, "and the anonymous budget is untouched by refreshes");
      });
    } finally {
      Object.assign(config.rateLimits, original);
    }
  });
});

describe("the limiter library's own production checks", () => {
  // The tests switch these checks off (they are noisy there); production runs them on the first request.
  const checked = (store: ResilientStore, problems: string[]) =>
    rateLimit({
      windowMs: 60_000,
      limit: 100,
      store,
      keyGenerator: () => "ip:203.0.113.9",
      validate: true,
      logger: {
        warn: (error) => problems.push(String((error as { code?: string }).code ?? error)),
        error: (error) => problems.push(String((error as { code?: string }).code ?? error)),
      },
    });

  async function oneRequest(app: express.Express): Promise<number> {
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      return (await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/`)).status;
    } finally {
      server.close();
    }
  }

  it("do not call two budgets that count the same address in one request a double count (every sign-in does that)", async () => {
    const problems: string[] = [];
    const app = express();
    app.get("/", checked(new ResilientStore("anon"), problems), checked(new ResilientStore("login-ip"), problems), (_req, res) => {
      res.send("ok");
    });
    assert.equal(await oneRequest(app), 200);
    assert.deepEqual(problems, [], "no ERR_ERL_DOUBLE_COUNT on the start-up log");
  });

  it("still report two limiters that would really share one counter", async () => {
    const problems: string[] = [];
    const app = express();
    app.get("/", checked(new ResilientStore("same"), problems), checked(new ResilientStore("same"), problems), (_req, res) => {
      res.send("ok");
    });
    assert.equal(await oneRequest(app), 200);
    assert.deepEqual(problems, ["ERR_ERL_DOUBLE_COUNT"]);
  });
});

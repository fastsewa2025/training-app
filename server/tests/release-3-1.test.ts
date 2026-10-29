/**
 * What the 3.1 audit found and fixed, each held against the real server and database:
 * certificate dates in India time, passwords that no longer meet the rules, one-time passwords that
 * expire, e-mail changes that need the password, consent to the current privacy notice, learner
 * accounts created by staff, uploads for admins only, staff sign-ins in the audit log, broadcasts in
 * the background and connections closed while the API shuts down.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import { auditLogs, certificates, users } from "@shared/schema";
import { config } from "../config";
import { db } from "../db";
import { setDraining } from "../health";
import { broadcastTiming } from "../routes/admin/people";
import { registerPushToken } from "../services/notification";
import { generateCertificateNumber } from "../services/certificate";
import { Api, createCourse, createUser, newSession, resetDatabase, shutdown, signIn, startServer, STRONG_PASSWORD, uniq, type Session, type TestServer } from "./helpers";

let server: TestServer;
let api: Api;
let admin: Session;
let trainer: Session;

before(async () => {
  await resetDatabase();
  server = await startServer();
  api = server.api;
  admin = await newSession(api, "admin");
  trainer = await newSession(api, "trainer");
});
after(async () => {
  await server.close();
  await shutdown();
});

const V1 = "/api/v1";
const actions = async (action: string) => db.select().from(auditLogs).where(eq(auditLogs.action, action));
async function eventually<T>(read: () => Promise<T>, ok: (value: T) => boolean, label: string): Promise<T> {
  for (let i = 0; i < 50; i++) {
    const value = await read();
    if (ok(value)) return value;
    await new Promise((r) => setTimeout(r, 20));
  }
  assert.fail(`timed out waiting for ${label}`);
}

describe("certificate dates", () => {
  it("are the same India-time day on the public page and in its JSON as on the PDF", async () => {
    const fixture = await createCourse({ modules: 1 });
    const user = await createUser({ displayName: "Night Shift" });
    const number = generateCertificateNumber();
    // 01:30 on 25 October in India is still 24 October in UTC.
    await db.insert(certificates).values({ userId: user.id, courseId: fixture.courseId, certificateNumber: number, issuedName: "Night Shift", earnedAt: new Date("2026-10-24T20:00:00Z") });

    const json = await api.get(`${V1}/verify/${number}`);
    assert.equal(json.status, 200);
    assert.equal(json.body.issuedOn, "2026-10-25", "the UTC date (24th) used to be shown");
    assert.equal(json.body.issuedOnText, "25 October 2026");
    const page = await api.get(`/verify/${number}`);
    assert.match(page.text, /25 October 2026/);
    assert.ok(!page.text.includes("2026-10-24"));
  });
});

describe("passwords that no longer meet the rules", () => {
  it("must be replaced at the next sign-in: a learner's short one, a staff member's under 12 characters", async () => {
    const learner = await createUser({ password: "Ab3#xyz" }); // 7 characters: older versions allowed it
    const learnerLogin = await api.post(`${V1}/auth/login`, { username: learner.username, password: learner.password });
    assert.equal(learnerLogin.status, 200);
    assert.equal(learnerLogin.body.user.mustChangePassword, true);

    const staff = await createUser({ role: "trainer", password: "Tr4iner#Pass" }); // 12 characters: fine
    assert.equal((await api.post(`${V1}/auth/login`, { username: staff.username, password: staff.password })).body.user.mustChangePassword, false);
    const shortStaff = await createUser({ role: "admin", password: "Adm1n#Pass" }); // 10 characters: a learner's length
    assert.equal((await api.post(`${V1}/auth/login`, { username: shortStaff.username, password: shortStaff.password })).body.user.mustChangePassword, true);

    const fine = await createUser();
    assert.equal((await api.post(`${V1}/auth/login`, { username: fine.username, password: fine.password })).body.user.mustChangePassword, false);
  });
});

describe("one-time passwords", () => {
  it("come with an expiry, stop working after it, and the expiry ends with the person's own password", async () => {
    const learner = await createUser();
    const reset = await api.post(`${V1}/admin/workers/${learner.id}/reset-password`, {}, admin.token);
    assert.equal(reset.status, 200, reset.text);
    const expiresAt = Date.parse(reset.body.expiresAt);
    const hours = (expiresAt - Date.now()) / 3600_000;
    assert.ok(hours > config.auth.tempPasswordTtlHours - 0.1 && hours <= config.auth.tempPasswordTtlHours, `expires in ${hours.toFixed(2)} h`);

    // still valid: the person signs in and must choose their own
    const ok = await api.post(`${V1}/auth/login`, { username: learner.username, password: reset.body.temporaryPassword });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.user.mustChangePassword, true);

    // expired: refused with its own code, so the app can say "ask for a new one"
    await db.update(users).set({ tempPasswordExpiresAt: new Date(Date.now() - 1000) }).where(eq(users.id, learner.id));
    const late = await api.post(`${V1}/auth/login`, { username: learner.username, password: reset.body.temporaryPassword });
    assert.equal(late.status, 403);
    assert.equal(late.body.code, "TEMPORARY_PASSWORD_EXPIRED");
    const wrong = await api.post(`${V1}/auth/login`, { username: learner.username, password: "Not#The-Password-1" });
    assert.equal(wrong.body.code, "INVALID_CREDENTIALS", "only someone who knows the one-time password learns that it expired");

    // a fresh one works; choosing a password clears the expiry
    const again = await api.post(`${V1}/admin/workers/${learner.id}/reset-password`, {}, admin.token);
    const session = await api.post(`${V1}/auth/login`, { username: learner.username, password: again.body.temporaryPassword });
    const changed = await api.post(`${V1}/auth/change-password`, { currentPassword: again.body.temporaryPassword, newPassword: "Own#Choice-2027" }, session.body.accessToken);
    assert.equal(changed.status, 200, changed.text);
    const [row] = await db.select({ expires: users.tempPasswordExpiresAt, must: users.mustChangePassword }).from(users).where(eq(users.id, learner.id));
    assert.equal(row.expires, null);
    assert.equal(row.must, false);
  });

  it("also expire for new staff accounts", async () => {
    const created = await api.post(`${V1}/admin/staff`, { username: uniq("staff"), displayName: "New Trainer", role: "trainer" }, admin.token);
    assert.equal(created.status, 201, created.text);
    assert.ok(Date.parse(created.body.expiresAt) > Date.now());
    const [row] = await db.select({ expires: users.tempPasswordExpiresAt }).from(users).where(eq(users.id, created.body.user.id));
    assert.ok(row.expires instanceof Date);
  });
});

describe("changing the e-mail address (where reset codes go)", () => {
  it("needs the current password; keeping or removing the address does not", async () => {
    const user = await createUser({ email: `${uniq("old")}@example.org` });
    const session = await signIn(api, user);
    const target = `${uniq("new")}@example.org`;

    const bare = await api.patch(`${V1}/auth/me`, { email: target }, session.token);
    assert.equal(bare.status, 400);
    assert.equal(bare.body.code, "VALIDATION_ERROR");
    assert.ok(bare.body.details.fields.currentPassword, "the app shows it under the password field");

    const wrong = await api.patch(`${V1}/auth/me`, { email: target, currentPassword: "Wrong#Pass-1234" }, session.token);
    assert.equal(wrong.body.code, "CURRENT_PASSWORD_INCORRECT");

    const right = await api.patch(`${V1}/auth/me`, { email: target, currentPassword: user.password }, session.token);
    assert.equal(right.status, 200, right.text);
    assert.equal(right.body.email, target);

    // the profile screen always sends the e-mail field: an unchanged one (any spelling) needs nothing
    assert.equal((await api.patch(`${V1}/auth/me`, { displayName: "Same Person", email: target.toUpperCase() }, session.token)).status, 200);
    assert.equal((await api.patch(`${V1}/auth/me`, { email: null }, session.token)).body.email, null);
  });
});

describe("consent to the current privacy notice", () => {
  it("is asked of a learner who has none on record, and nothing else works until it is given", async () => {
    const learner = await createUser();
    await db.update(users).set({ consentVersion: null, consentAcceptedAt: null }).where(eq(users.id, learner.id));
    const session = await signIn(api, learner);

    const me = await api.get(`${V1}/auth/me`, session.token);
    assert.equal(me.body.consentRequired, true);
    const blocked = await api.get(`${V1}/courses`, session.token);
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.code, "CONSENT_UPDATE_REQUIRED");

    // the learner's rights over their data still work
    assert.equal((await api.get(`${V1}/auth/me/export`, session.token)).status, 200);

    assert.equal((await api.post(`${V1}/auth/consent`, { confirmAdult: true }, session.token)).body.code, "CONSENT_REQUIRED");
    assert.equal((await api.post(`${V1}/auth/consent`, { acceptTerms: true }, session.token)).body.code, "ADULT_CONFIRMATION_REQUIRED");
    const accepted = await api.post(`${V1}/auth/consent`, { acceptTerms: true, confirmAdult: true }, session.token);
    assert.equal(accepted.status, 200, accepted.text);
    assert.equal(accepted.body.consentRequired, false);
    assert.equal((await api.get(`${V1}/courses`, session.token)).status, 200);

    const [row] = await db.select({ v: users.consentVersion, at: users.consentAcceptedAt }).from(users).where(eq(users.id, learner.id));
    assert.equal(row.v, config.legal.consentVersion);
    assert.ok(row.at instanceof Date);
    const entries = await actions("consent.accepted");
    assert.ok(entries.some((e) => e.actorId === learner.id && (e.metadata as { version?: string }).version === config.legal.consentVersion), "the history of versions is in the audit log");
  });

  it("is asked again of everyone when CONSENT_VERSION is raised, but never of staff", async () => {
    const learner = await signIn(api, await createUser());
    const original = config.legal.consentVersion;
    try {
      config.legal.consentVersion = `${original}-updated`;
      assert.equal((await api.get(`${V1}/courses`, learner.token)).body.code, "CONSENT_UPDATE_REQUIRED");
      assert.equal((await api.get(`${V1}/courses`, trainer.token)).status, 200, "staff are not learners");
      assert.equal((await api.get(`${V1}/admin/dashboard`, admin.token)).status, 200);
      assert.equal((await api.post(`${V1}/auth/consent`, { acceptTerms: true, confirmAdult: true }, learner.token)).status, 200);
      assert.equal((await api.get(`${V1}/courses`, learner.token)).status, 200);
    } finally {
      config.legal.consentVersion = original;
    }
  });

  it("is already given by registering in the app", async () => {
    const res = await api.post(`${V1}/auth/register`, { username: uniq("reg"), password: STRONG_PASSWORD, displayName: "New Learner", acceptTerms: true, confirmAdult: true });
    assert.equal(res.status, 201, res.text);
    assert.equal(res.body.user.consentRequired, false);
  });
});

describe("learner accounts created by an administrator", () => {
  it("start with a one-time password, then the learner chooses a password and accepts the notice", async () => {
    const username = uniq("crew");
    const created = await api.post(`${V1}/admin/workers`, { username: username.toUpperCase(), displayName: "Mohan Lal", phoneNumber: "98765 11111", preferredLang: "hi" }, admin.token);
    assert.equal(created.status, 201, created.text);
    assert.equal(created.body.user.username, username);
    assert.equal(created.body.user.role, "worker");
    assert.equal(created.body.user.phoneNumber, "+919876511111");
    assert.equal(typeof created.body.temporaryPassword, "string");
    assert.ok(Date.parse(created.body.expiresAt) > Date.now());
    assert.equal((await actions("worker.created")).some((e) => e.targetId === created.body.user.id), true);

    const login = await api.post(`${V1}/auth/login`, { username, password: created.body.temporaryPassword });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.mustChangePassword, true);
    assert.equal(login.body.user.consentRequired, true, "staff cannot consent on the learner's behalf");
    assert.equal((await api.get(`${V1}/courses`, login.body.accessToken)).body.code, "PASSWORD_CHANGE_REQUIRED", "the password comes first");

    const changed = await api.post(`${V1}/auth/change-password`, { currentPassword: created.body.temporaryPassword, newPassword: "Mohan#Lal-2027" }, login.body.accessToken);
    assert.equal(changed.status, 200, changed.text);
    assert.equal((await api.get(`${V1}/courses`, changed.body.accessToken)).body.code, "CONSENT_UPDATE_REQUIRED", "then the notice");
    assert.equal((await api.post(`${V1}/auth/consent`, { acceptTerms: true, confirmAdult: true }, changed.body.accessToken)).status, 200);
    assert.equal((await api.get(`${V1}/courses`, changed.body.accessToken)).status, 200);
  });

  it("are for administrators only, and refuse a taken username or bad input", async () => {
    const body = { username: uniq("crew"), displayName: "Someone Here" };
    assert.equal((await api.post(`${V1}/admin/workers`, body, trainer.token)).status, 403);
    assert.equal((await api.post(`${V1}/admin/workers`, body, admin.token)).status, 201);
    assert.equal((await api.post(`${V1}/admin/workers`, body, admin.token)).body.code, "USERNAME_TAKEN");
    assert.equal((await api.post(`${V1}/admin/workers`, { ...body, username: "x" }, admin.token)).status, 400);
    assert.equal((await api.post(`${V1}/admin/workers`, { ...body, username: uniq("crew"), role: "admin" }, admin.token)).status, 400, "no role field");
  });
});

describe("media uploads", () => {
  it("are for administrators only (trainers can look, not change)", async () => {
    const sign = { kind: "image", filename: "x.png", contentType: "image/png", bytes: 10 };
    assert.equal((await api.post(`${V1}/admin/media/sign`, sign, trainer.token)).status, 403);
    assert.equal((await api.post(`${V1}/admin/media/complete`, { uploadId: "00000000-0000-0000-0000-000000000000" }, trainer.token)).status, 403);
    assert.equal((await api.get(`${V1}/admin/media/config`, trainer.token)).status, 200, "the settings stay readable");
  });
});

describe("staff sign-ins", () => {
  it("are in the audit log, failed ones too; learners' sign-ins are not", async () => {
    const staff = await createUser({ role: "admin" });
    assert.equal((await api.post(`${V1}/auth/login`, { username: staff.username, password: staff.password })).status, 200);
    assert.equal((await api.post(`${V1}/auth/login`, { username: staff.username, password: "Wrong#Password-99" })).status, 401);
    const learner = await createUser();
    await api.post(`${V1}/auth/login`, { username: learner.username, password: learner.password });

    const ok = await actions("staff.signed_in");
    assert.ok(ok.some((e) => e.actorId === staff.id && e.ip));
    const failed = await eventually(
      () => actions("staff.sign_in_failed"),
      (rows) => rows.some((e) => e.targetId === staff.id),
      "the failed sign-in entry"
    );
    assert.equal(failed.find((e) => e.targetId === staff.id)!.actorId, null, "nobody is signed in yet");
    const learnerRows = await db.select().from(auditLogs).where(and(eq(auditLogs.targetId, learner.id)));
    assert.equal(learnerRows.length, 0);
  });
});

describe("broadcasts", () => {
  it("answer 202 'sending' for a large audience instead of running into the proxy timeout, and one runs at a time", async () => {
    const learner = await createUser();
    await registerPushToken(learner.id, `ExponentPushToken[${uniq("bc")}xxxxxxxx]`, "android");
    const realFetch = globalThis.fetch;
    let release: (() => void) | null = null;
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      if (String(input).includes("exp.host")) {
        await new Promise<void>((resolve) => (release = resolve));
        return new Response(JSON.stringify({ data: [{ status: "ok" }] }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return realFetch(input, init);
    }) as typeof fetch;
    const wait = broadcastTiming.waitMs;
    broadcastTiming.waitMs = 100;
    try {
      const first = await api.post(`${V1}/admin/notify/broadcast`, { title: "Shift change", body: "Tomorrow starts at 7." }, admin.token);
      assert.equal(first.status, 202, first.text);
      assert.equal(first.body.status, "sending");
      assert.ok(first.body.devices >= 1);
      const second = await api.post(`${V1}/admin/notify/broadcast`, { title: "Again", body: "Twice?" }, admin.token);
      assert.equal(second.status, 409, "a second click must not send everything twice");

      await eventually(async () => release, (r) => r !== null, "the push request");
      release!();
      const entry = await eventually(
        () => actions("notify.broadcast"),
        (rows) => rows.some((e) => (e.metadata as { title?: string }).title === "Shift change"),
        "the delivery numbers in the audit log"
      );
      const meta = entry.find((e) => (e.metadata as { title?: string }).title === "Shift change")!.metadata as { sent: number; devices: number };
      assert.ok(meta.sent >= 1 && meta.devices >= 1);
    } finally {
      globalThis.fetch = realFetch;
      broadcastTiming.waitMs = wait;
    }
  });
});

describe("a learner's own data", () => {
  it("export lists every notice version accepted, the phones and the open sign-ins (never a token)", async () => {
    const learner = await createUser();
    await db.update(users).set({ consentVersion: null }).where(eq(users.id, learner.id));
    const session = await signIn(api, learner);
    await api.post(`${V1}/auth/consent`, { acceptTerms: true, confirmAdult: true }, session.token);
    await registerPushToken(learner.id, `ExponentPushToken[${uniq("ex")}xxxxxxxx]`, "android");

    const exported = await api.get(`${V1}/auth/me/export`, session.token);
    assert.equal(exported.status, 200);
    assert.equal(exported.body.consentHistory.length, 1);
    assert.equal(exported.body.consentHistory[0].version, config.legal.consentVersion);
    assert.equal(exported.body.devices.length, 1);
    assert.equal(exported.body.devices[0].platform, "android");
    assert.ok(exported.body.sessions.length >= 1);
    const text = JSON.stringify(exported.body);
    assert.ok(!text.includes(session.refreshToken) && !/tokenHash|token_hash|ExponentPushToken/.test(text), "no secrets or device addresses in the export");
  });

  it("erasure also removes the addresses the learner acted from in the audit log", async () => {
    const learner = await createUser();
    await db.update(users).set({ consentVersion: null }).where(eq(users.id, learner.id));
    const session = await signIn(api, learner);
    await api.post(`${V1}/auth/consent`, { acceptTerms: true, confirmAdult: true }, session.token);
    assert.ok((await actions("consent.accepted")).some((e) => e.actorId === learner.id && e.ip));
    assert.equal((await api.delete(`${V1}/auth/me`, { password: learner.password }, session.token)).status, 200);
    const left = (await actions("consent.accepted")).filter((e) => e.actorId === learner.id);
    assert.ok(left.length > 0, "the record that consent was given stays");
    assert.ok(left.every((e) => e.ip === null && e.actorUsername === null));
  });
});

// Last: draining is process-wide and cannot be undone.
describe("shutting down", () => {
  it("closes each connection after its answer, so a keep-alive socket cannot hold the process", async () => {
    const before = await api.get("/api/health");
    assert.notEqual(before.headers.get("connection"), "close");
    setDraining();
    const during = await api.get("/api/health");
    assert.equal(during.headers.get("connection"), "close");
    assert.equal((await api.get("/api/health/ready")).status, 503);
  });
});

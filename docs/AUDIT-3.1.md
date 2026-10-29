# Audit 3.1: what was wrong, what changed, what is left

Second audit of FastSewa, 24 October 2026. It started from release 3.0.0 and produced release 3.1.0.
The first pass, which answered the management report, is in [REMEDIATION.md](REMEDIATION.md); every change is listed in [CHANGELOG.md](../CHANGELOG.md).

## In short

* **25 findings, all fixed** (the last row groups three small ones). The worst were limits that a whole crew shares because their phones sit behind one site Wi-Fi address:
  certificate downloads, session refresh and registration were refused after 30, 240 and 40 people.
* **Each bug that a test can show was shown twice:** the same test file fails on 3.0.0 and passes on 3.1.0 (section 2).
* **394 automated tests pass** (353 in 3.0.0). Type check and lint are clean.
* **Not checked here:** the Docker image build, the GitHub workflows, real phones, real e-mail and storage services, load, and a penetration test (section 3).
* **My judgement:** ready for a controlled pilot (one or a few sites, a few hundred learners) once you have done section 5.
  Not ready for a large rollout until it has had a load test, a penetration test and a round of real-phone tests. Add a second sign-in factor for staff before many staff accounts exist.

## 1. What was found and fixed

Proof codes: **BT** = back-test (fails on 3.0.0, passes on 3.1.0, section 2); **T** = automated test; **RUN** = seen in a run of the built API in production mode or in a real browser; **READ** = found by reading the code, not reproduced.

### A. Would have hurt on the first day

| # | What was wrong | What people would see | Fix | Proof |
|---|----------------|-----------------------|-----|-------|
| 1 | Certificate PDFs were limited to 30 per 10 minutes **per address**, not per person | On a site Wi-Fi, the 31st learner who finished the course could not download the certificate | Limited per person and per signed link (30 per 10 minutes each), plus a loose CPU guard of 1000 per address | BT: learner 31 got 429 on 3.0.0; 36 of 36 got the PDF on 3.1.0 |
| 2 | Session refresh counted against the anonymous budget (240 a minute per address) as well as its own (300 per 15 minutes) | At shift start, every phone after the 240th in a minute (or 300th in 15 minutes) on one site got "too many requests" instead of its courses | Refresh only counts against its own budget, 3000 per 15 minutes (`RATE_LIMIT_REFRESH_PER_15MIN`) | BT: refresh 241 got 429 on 3.0.0; 400 of 400 passed on 3.1.0 |
| 3 | Registration allowed 40 an hour per address | After the trainer's briefing, learner 41 of a crew was refused for up to an hour | 200 an hour (`RATE_LIMIT_REGISTER_PER_HOUR`); the other per-address budgets are settings too | BT: registration 41 got 429; 120 of 120 passed |
| 4 | The certificate check page showed the UTC day; the PDF prints the India day | A certificate earned between midnight and 05:30 India time showed two different dates: it looks forged to an employer | India day (Asia/Kolkata) on the page, in its JSON and on the PDF | BT: earned 20:00 UTC on 24 October: page said 2026-10-24, PDF said 25 October; now both say the 25th |
| 5 | Shutdown waited for idle keep-alive connections, and the shipped nginx keeps up to 32 of them open to the API | Every restart and deploy waited for the 25-second force-close and ended with exit code 1 (looks like a crash; requests still running were cut) | While draining, each connection is closed as its answer finishes | RUN: with a keep-alive client, 25.0 s and exit 1 before; 6.3 s and exit 0 after |
| 6 | Consent was only recorded at registration | Accounts from before 3.0 had no record, and raising `CONSENT_VERSION` asked nobody (the DPDP notice duty) | Learners without a record for the current version can only accept, sign out, export or delete until they accept (`CONSENT_UPDATE_REQUIRED`); new consent screen in the app; each acceptance is in the audit log | T; RUN: on a database upgraded from 3.0.0, an account without a consent record got 403 on its courses, accepted, then got 200; browser run in English and Hindi |
| 7 | Staff could not create learner accounts | With `REGISTRATION_MODE=closed`, the safe setting for a pilot, there was no way to add anyone | Learners → Add a learner: one-time password, then the learner chooses a password and accepts the notice | T; RUN: browser run from the console to the learner's first screen |

### B. Security and privacy

| # | What was wrong | Risk | Fix | Proof |
|---|----------------|------|-----|-------|
| 8 | Changing the e-mail address did not ask for the password | Anyone holding an unlocked shared phone could put in their own address, then take the account with "Forgot password" | A new address needs the current password | BT: 200 on 3.0.0, 400 on 3.1.0; RUN: browser |
| 9 | Trainers could sign and finish media uploads | Trainers are meant to be read-only; a trainer account (or a stolen one) could put any file on your storage, served from your address | Upload is for admins only | BT: 200 on 3.0.0, 403 on 3.1.0 |
| 10 | Passwords below today's rule (for example a 7-character one from an older account) kept working | Weak passwords stay forever | A sign-in with such a password works once and must be replaced (staff below 12 characters too) | BT: `mustChangePassword` false on 3.0.0, true on 3.1.0 |
| 11 | One-time passwords never expired | One written on paper and never used was a way in forever | They expire after `TEMP_PASSWORD_TTL_HOURS` (72); the console shows until when | T |
| 12 | E-mail on port 587 fell back to plain text if the relay did not offer STARTTLS | The SMTP password and reset codes could cross the network in clear | TLS is required except on port 465 or a relay on the same machine (`SMTP_REQUIRE_TLS`) | T (not tried against a real relay) |
| 13 | Production started with the database password copied from `.env.example` (`change_me` and similar) | A guessable database password | Refused at start, with a message | T |
| 14 | Staff sign-ins and failed staff sign-ins were not in the audit log | A stolen admin password left no trace in the console | "Staff signed in" and "Staff sign in failed" entries | T; RUN |
| 15 | A failed request was logged under a cut route name (`/login`, not `/api/v1/auth/login`) | The runbook's search for wrong passwords, and any alert built from it, found nothing; learners' sign-ins are only in this log | The route is recorded when it matches; a request refused before any route names its area (`/api/v1/courses (unmatched)`) | T: fails on 3.0.0 (`/login`, `/:number`, `(unmatched)`), passes on 3.1.0; RUN: built API logs `/api/v1/auth/login` for a 401 |
| 16 | The data export left out the notices accepted, registered devices and open sessions; erasure left the learner's IP address in their own audit entries | Incomplete answer to an access request; personal data kept after erasure | Both fixed | T |

### C. Operations and quality

| # | What was wrong | Effect | Fix | Proof |
|---|----------------|--------|-----|-------|
| 17 | `docker-compose.yml` built every image with `APP_VERSION=3.0.0` unless you set it | `/api/health` said 3.0.0 whatever code ran, so the post-deploy version check failed on a good deploy and could not tell releases apart | The version is compiled into the build from `package.json` | RUN: built API reports 3.1.0 with `APP_VERSION` unset |
| 18 | A broadcast was sent inside the request | A large audience could outlast the proxy timeout; an admin who retried sent it twice | Sent in the background, one at a time: "sent" with numbers, or "sending" with the numbers in the audit log later | T |
| 19 | Each certificate PDF unpacked its fonts again: 383 ms of CPU | A crew downloading at once slows the server | Fonts unpacked once; a repeated download comes from memory | RUN: 116 ms per new certificate, 0.1 ms for a repeat (2 vCPU machine) |
| 20 | `tini` without `-g` | A stop signal during start-up migrations went only to the entry-point shell, not to the Node process running them, so it never got the chance to stop cleanly | `tini -g` (the signal goes to the whole process group) | READ (no Docker daemon here, see section 3) |
| 21 | CI did not check that the migrations match `shared/schema.ts` | A schema change without a migration would deploy and fail at run time | New CI step | RUN: the step passes now and fails on a simulated schema change |
| 22 | Abandoned local uploads were never deleted | The disk fills slowly | Deleted after 24 hours with the other housekeeping | T |
| 23 | The first sign-in after every start wrote a false `ERR_ERL_DOUBLE_COUNT` stack trace (not JSON) | An "error" in the log on every deploy, which trains people to ignore errors and would hide a real one | Each limiter's store has its own prefix; the limiter's own messages are JSON log lines | T: fails without the fix; RUN: in the 3.0.0 log, gone from the 3.1.0 log |
| 24 | The sign-in cache was cleared inside the database transaction | A request at the same moment as a password or staff change could keep the old account state for up to 10 seconds | Cleared after the commit | READ (the tests run without the cache) |
| 25 | Smaller ones: a copied `.env.example` did not start a development server; the development media allow-list trusted any machine's `/uploads`; the audit page called an anonymous failed sign-in "the learner themselves" | Confusion; development only | Fixed | T |

## 2. How it was checked

* **Back-tests.** One test file asserts the fixed behaviour for findings 1 to 4 and 8 to 10. On the original 3.0.0 code all 7 fail with the numbers in the table (learner 31, refresh 241, registration 41, 2026-10-24, 200, 200, false); on 3.1.0 all 7 pass.
  The access-log test (finding 15) fails 4 of 4 on 3.0.0. The double-count test (finding 23) fails when the fix is taken out. All were run again on the final code.
* **Automated tests:** 394 pass on PostgreSQL 16 (41 more than 3.0.0): 16 release tests, the access-log tests, and new cases in the rate-limit, configuration, media, certificate, admin and app-client tests. TypeScript (app, API, console) and ESLint (0 warnings) are clean.
* **The built API in production mode,** in the file layout the Dockerfile produces and started through `docker-entrypoint.sh`:
  * Upgrade: a database made by 3.0.0 was migrated to `0004` at start; `/api/health` said 3.1.0; an old account without consent was held at the consent step, accepted, then worked; closed registration answered 403.
  * Going back: 3.0.0 ran against the migrated database (sign-in worked), so a rollback needs no database restore.
  * Logs: one JSON line per request with the right route names; no false limiter error; shutdown on SIGTERM in about 6 to 7 seconds with exit 0.
* **A real browser** (Playwright on the app's web build and the console): an admin creates a learner; the learner signs in with the one-time password, chooses a password, is held until both consent boxes are ticked, reaches the home screen, and is asked for the password when changing the e-mail address; the consent screen in Hindi; the audit log shows the acceptance. Run again on the final code: passed.
* **Backups:** an encrypted backup and restore round trip with the 3.1 schema.
* **App:** the Android bundle exports (3.11 MB); a Hindi certificate PDF was rendered and looked at after the font change.

## 3. Not checked: treat as unknown, not as passed

* **The Docker image was not built.** Docker Hub and public.ecr.aws were blocked from this machine. Each stage was repeated by hand (dependency install, build from the copied files only, the production layout started as an unprivileged user), but `docker build` itself, `tini -g` (finding 20), the compose file's runtime and the image health check never ran. Run CI once before you trust it.
* **The GitHub workflows** (CI, release) never ran, including the new migration check.
* **No real phone.** The consent screen, the e-mail password field, push, video and the keystore were seen only in the web build.
* **No real SMTP, S3 or Cloudinary.** The TLS rule for e-mail (finding 12) is tested against the settings, not against a relay.
* **No load test and no penetration test.** The new budgets (3000 refreshes per 15 minutes per address and so on) are reasoned from crew sizes, not measured on a real site.
* **nginx** did not change in 3.1 and was not tested again.
* **Legal:** nobody with legal training has read the consent screen or the notice outline ([DPDP-CHECKLIST.md](DPDP-CHECKLIST.md)).

## 4. Before you deploy 3.1

* **Order of release.** Only the 3.1 app can show the consent screen. If learners already use the 3.0 app, count the ones the API will hold (the query is in [DEPLOYMENT.md](../DEPLOYMENT.md), "Updating, and going back").
  If it is 0, deploy in any order. If not, publish the 3.1 app first: on the 3.0 app those learners see "Something went wrong" on every screen until they update.
* **Also on the 3.0 app:** an expired one-time password shows "Something went wrong" instead of "expired"; changing the e-mail address fails (the 3.0 app does not send the password). Both work on 3.1.
* **Publish the notice before raising `CONSENT_VERSION`,** and tell crews through a Broadcast first. Never raise it before the 3.1 app is in the stores.
* **A new required setting check:** production now refuses the placeholder database password. A server still using `change_me` will not start: change the password first.
* **Take a backup first** (`scripts/ops/backup-db.sh`). The migration only adds a column, and 3.0.0 runs against it, so going back is a redeploy, not a restore.

## 5. What only you can do

The full list is in [REMEDIATION.md](REMEDIATION.md), section 6. The ones that block a launch:

- [ ] **EAS:** `eas init` (the project id is still a placeholder) and the real `EXPO_PUBLIC_API_URL` in `eas.json`. `npm run check:release` refuses placeholders.
- [ ] **Secrets:** `JWT_SECRET`, a strong database password, `PUBLIC_BASE_URL`, `REGISTRATION_MODE` (and its code), in a password manager.
- [ ] **Legal:** privacy notice and terms in English and Hindi, published at `PRIVACY_POLICY_URL` and `TERMS_URL`; `CONSENT_VERSION` matching them; a named grievance contact (`SUPPORT_EMAIL`, `SUPPORT_PHONE`); counsel's review.
- [ ] **Store accounts and push keys:** Apple and Google developer accounts, Firebase for Android, the Apple push key.
- [ ] **Run CI once,** including the image build and smoke test, before the first real deploy.
- [ ] **Real-phone tests** ([MOBILE-RELEASE.md](MOBILE-RELEASE.md), section 4) on a cheap Android phone and an iPhone, in Hindi and English.
- [ ] **A load test** of sign-in, refresh and video progress at your largest site's size, from one address, before a large rollout.

## 6. Still open, in the order I would do them

1. **A second sign-in factor (TOTP) for admins and trainers.** Today a stolen staff password is enough. Staff sign-ins are now audited, which helps you notice, not prevent.
2. **A minimum app version.** Nothing can make an old app update. Learners who never update are never shown the consent screen; check before 13 May 2027 that nobody uses an app older than 3.1 (ask trainers, or add the app version to requests).
3. **Private lesson media** (signed links or an unlisted host) if course material must not be public.
4. **Automatic retention:** a report of idle accounts and an erase job, once your counsel has set the periods.
5. **Digitally signed certificate PDFs,** if employers will rely on the PDF without scanning the QR code.
6. **PDF rendering off the request thread** (a worker), if crews much bigger than today download at once. Each new certificate costs about 116 ms of CPU; the limits keep it bounded.
7. **Registration says "e-mail already registered"** (someone can test whether an address has an account). Low risk; accept it or use `code`/`closed` mode.
8. **Device test automation** (Maestro or Detox) so the real-phone checks can be repeated for every release.

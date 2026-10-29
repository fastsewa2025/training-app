import { useEffect, useState } from "react";
import { isValidDisplayName, isValidEmail, isValidUsername, normalizeDisplayName, normalizeEmail, normalizePhone, normalizeUsername, USERNAME_MAX, USERNAME_MIN } from "@shared/validation";
import { api, download } from "../api";
import { formatDateTime, formatNumber, timeAgo, formatDate } from "../format";
import { useAction, useDebounced, useApi, useDocumentTitle } from "../hooks";
import { navigate, useQueryState } from "../router";
import { useSession } from "../session";
import type { Page, TemporaryPassword, WorkerRow } from "../types";
import { Badge, Button, EmptyState, ErrorNotice, Loading, Modal, Notice, PageHeader, Pagination, Panel, SecretBox, SelectField, TextField, fieldError, useToast } from "../ui";

const LANGUAGES = [
  { value: "hi", label: "Hindi" },
  { value: "en", label: "English" },
] as const;

interface CreatedLearner extends TemporaryPassword {
  user: { id: string; displayName: string };
}

/**
 * An administrator creates the account for a learner who cannot register on their own (or while
 * REGISTRATION_MODE=closed). The learner signs in with the one-time password, chooses their own
 * password and accepts the privacy notice themselves: staff never consent on a learner's behalf.
 */
function AddLearnerDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (created: CreatedLearner) => void }) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [lang, setLang] = useState<"hi" | "en">("hi");
  const [problems, setProblems] = useState<Record<string, string>>({});
  const create = useAction(() =>
    api.post<CreatedLearner>("/admin/workers", {
      username: normalizeUsername(username),
      displayName: normalizeDisplayName(displayName),
      phoneNumber: phone.trim() === "" ? null : phone.trim(),
      email: email.trim() === "" ? null : normalizeEmail(email),
      preferredLang: lang,
    })
  );
  const err = create.error;
  const shown = (field: string, code?: string) => problems[field] ?? (code && err?.code === code ? err.message : fieldError(err, field));

  const submit = async () => {
    const found: Record<string, string> = {};
    if (!isValidDisplayName(normalizeDisplayName(displayName))) found.displayName = "Use English or Hindi letters only (no digits or symbols)";
    if (!isValidUsername(normalizeUsername(username))) found.username = `${USERNAME_MIN}–${USERNAME_MAX} characters: lowercase letters, digits and underscore`;
    if (phone.trim() !== "" && !normalizePhone(phone)) found.phoneNumber = "Enter a valid mobile number";
    if (email.trim() !== "" && !isValidEmail(normalizeEmail(email))) found.email = "That does not look like an e-mail address";
    setProblems(found);
    if (Object.keys(found).length > 0) return;
    const result = await create.run();
    if (result.ok) onCreated(result.value);
  };

  const generic = err && Object.keys(err.fields).length === 0 && !["USERNAME_TAKEN", "EMAIL_TAKEN", "PHONE_INVALID"].includes(err.code);
  return (
    <Modal
      title="Add a learner"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button tone="primary" busy={create.busy} onClick={() => void submit()}>
            Create account
          </Button>
        </>
      }
    >
      <form
        className="form-grid"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {generic ? (
          <div className="wide">
            <ErrorNotice error={err} />
          </div>
        ) : null}
        <TextField label="Full name" required autoFocus maxLength={60} value={displayName} onChange={setDisplayName} error={shown("displayName")} hint="As it should be printed on the certificate." />
        <TextField label="Username" required maxLength={USERNAME_MAX} value={username} onChange={setUsername} autoComplete="off" spellCheck={false} error={shown("username", "USERNAME_TAKEN")} hint="They sign in with this. It cannot be changed later." />
        <TextField label="Mobile number" value={phone} onChange={setPhone} autoComplete="off" error={shown("phoneNumber", "PHONE_INVALID")} hint="Optional." />
        <TextField label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="off" error={shown("email", "EMAIL_TAKEN")} hint="Optional. Lets them reset the password themselves." />
        <SelectField className="wide" label="App language" value={lang} onChange={setLang} options={LANGUAGES} />
        <button type="submit" className="sr-only" tabIndex={-1}>
          Create
        </button>
      </form>
      <Notice tone="info">A one-time password is shown once, on the next screen. At the first sign-in the learner chooses their own password and accepts the privacy notice.</Notice>
    </Modal>
  );
}

const STATUS = [
  { value: "all", label: "All learners" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Deactivated" },
] as const;
const SORT = [
  { value: "created", label: "Newest first" },
  { value: "name", label: "Name A–Z" },
  { value: "lastLogin", label: "Recently active" },
] as const;

export function Learners() {
  useDocumentTitle("Learners");
  const { isAdmin } = useSession();
  const toast = useToast();
  const [filters, setFilters] = useQueryState({ q: "", status: "all", sort: "created", page: "1" });
  const [search, setSearch] = useState(filters.q);
  const debounced = useDebounced(search.trim(), 350);

  // The search box is typed into freely; the address only follows once typing pauses.
  useEffect(() => {
    if (debounced !== filters.q) setFilters({ q: debounced, page: "1" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const page = Math.max(1, Number(filters.page) || 1);
  const list = useApi<Page<WorkerRow>>("/admin/workers", { q: filters.q, status: filters.status, sort: filters.sort, page, pageSize: 25 });

  const exportCsv = useAction(async () => {
    await download("/admin/workers/export.csv", { q: filters.q, status: filters.status === "all" ? undefined : filters.status }, "fastsewa-learners.csv");
    toast("Export downloaded");
  });

  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState<CreatedLearner | null>(null);
  const rows = list.data?.items ?? [];
  const filtered = filters.q !== "" || filters.status !== "all";

  return (
    <>
      <PageHeader
        title="Learners"
        subtitle="Everyone who has registered in the mobile app, or whose account an administrator created."
        actions={
          isAdmin ? (
            <>
              <Button icon="download" busy={exportCsv.busy} onClick={() => void exportCsv.run()}>
                Export CSV
              </Button>
              <Button tone="primary" icon="plus" onClick={() => setAdding(true)}>
                Add a learner
              </Button>
            </>
          ) : null
        }
      />
      {adding ? (
        <AddLearnerDialog
          onClose={() => setAdding(false)}
          onCreated={(result) => {
            setAdding(false);
            setCreated(result);
            list.reload();
          }}
        />
      ) : null}
      {created ? (
        <Modal
          title="Learner account created"
          onClose={() => setCreated(null)}
          footer={
            <>
              <Button onClick={() => navigate(`/learners/${created.user.id}`)}>Open the learner</Button>
              <Button tone="primary" onClick={() => setCreated(null)}>
                Done
              </Button>
            </>
          }
        >
          <SecretBox label={`One-time password for @${created.username}`} value={created.temporaryPassword} />
          <Notice tone="warn">
            Give it to {created.user.displayName} privately. It is shown only now and works until {formatDateTime(created.expiresAt)}. At the first sign-in they choose their own password and accept the privacy notice.
          </Notice>
        </Modal>
      ) : null}
      {exportCsv.error ? <ErrorNotice error={exportCsv.error} /> : null}
      <Panel flush>
        <div className="filters">
          <div className="grow">
            <TextField label="Search" type="search" value={search} onChange={setSearch} placeholder="Name, username, phone or e-mail" autoComplete="off" spellCheck={false} />
          </div>
          <SelectField label="Show" value={filters.status as "all"} onChange={(v) => setFilters({ status: v, page: "1" })} options={STATUS} />
          <SelectField label="Sort by" value={filters.sort as "created"} onChange={(v) => setFilters({ sort: v, page: "1" })} options={SORT} />
        </div>
        {list.error ? (
          <div className="panel-body">
            <ErrorNotice error={list.error} onRetry={list.reload} />
          </div>
        ) : null}
        {!list.data && !list.error ? <Loading /> : null}
        {list.data && rows.length === 0 ? (
          <EmptyState
            title={filtered ? "No learner matches" : "No learners yet"}
            action={
              filtered ? (
                <Button
                  onClick={() => {
                    setSearch("");
                    setFilters({ q: "", status: "all", page: "1" });
                  }}
                >
                  Clear the search
                </Button>
              ) : undefined
            }
          >
            {filtered ? "Try a different spelling, or search by phone number." : "Learners appear here after they register in the mobile app, or after an administrator adds them."}
          </EmptyState>
        ) : null}
        {rows.length > 0 ? (
          <div className="table-wrap" aria-busy={list.loading}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th className="num">Courses</th>
                  <th className="num">Certificates</th>
                  <th>Last active</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => (
                  <tr key={w.id}>
                    <td className="primary-cell">
                      <a href={`#/learners/${w.id}`}>{w.displayName}</a>
                      <span className="sub">@{w.username}</span>
                    </td>
                    <td>
                      {w.phoneNumber ?? <span className="muted">—</span>}
                      {w.email ? <span className="sub">{w.email}</span> : null}
                    </td>
                    <td>
                      {w.isActive ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Deactivated</Badge>}
                      {w.mustChangePassword ? <span className="sub">Must change password</span> : null}
                    </td>
                    <td className="num">
                      {formatNumber(w.coursesCompleted)} / {formatNumber(w.coursesEnrolled)}
                    </td>
                    <td className="num">{formatNumber(w.certificates)}</td>
                    <td className="nowrap" title={w.lastLoginAt ?? undefined}>
                      {timeAgo(w.lastLoginAt)}
                    </td>
                    <td className="nowrap">{formatDate(w.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {list.data ? <Pagination page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} onPage={(p) => setFilters({ page: String(p) })} /> : null}
      </Panel>
      <p className="muted small">“Courses” shows completed / enrolled. Deactivated learners cannot sign in and their sessions end immediately.</p>
    </>
  );
}

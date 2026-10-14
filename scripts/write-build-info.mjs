// Writes public/build-info.json before `next build`, so the deployed site can say which commit it is and how many
// production dependency vulnerabilities it was built with. The backend's GET /api/superadmin/health reads it
// (the Super Admin console's System Health page). It never fails the build: every value falls back to null.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** `npm audit --json` output -> { total, critical, high } or null when it is not the shape we expect. */
export function summariseAudit(report) {
  const v = report?.metadata?.vulnerabilities;
  if (!v || typeof v.total !== "number") return null;
  const n = (k) => (typeof v[k] === "number" ? v[k] : 0);
  return { total: v.total, critical: n("critical"), high: n("high") };
}

const run = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 60_000, shell: cmd === "npm" && process.platform === "win32" });
  } catch (err) {
    // `npm audit` exits non-zero when it finds something but still prints the report.
    return typeof err?.stdout === "string" ? err.stdout : null;
  }
};

/**
 * @param {Record<string, string | undefined>} env
 * @param {() => string | null} auditJson
 * @returns {{ commit: string | null, commitMessage: string | null, builtAt: string, audit: { total: number, critical: number, high: number, checkedAt: string } | null }}
 */
export function buildInfo(env = process.env, auditJson = () => run("npm", ["audit", "--omit=dev", "--json"])) {
  const git = (...args) => run("git", args)?.trim() || null;
  const commit = (env.VERCEL_GIT_COMMIT_SHA || git("rev-parse", "HEAD") || "").slice(0, 7) || null;
  const commitMessage = env.VERCEL_GIT_COMMIT_MESSAGE?.split("\n")[0] || git("log", "-1", "--format=%s");
  let audit = null;
  try {
    const summary = summariseAudit(JSON.parse(auditJson() ?? "null"));
    if (summary) audit = { ...summary, checkedAt: new Date().toISOString() };
  } catch {
    audit = null;
  }
  return { commit, commitMessage, builtAt: new Date().toISOString(), audit };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const out = path.join(process.cwd(), "public", "build-info.json");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(buildInfo()));
    console.log("wrote public/build-info.json");
  } catch (err) {
    console.warn("build-info skipped:", err?.message ?? err);
  }
}

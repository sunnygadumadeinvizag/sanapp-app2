import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AppsMenu, getPlatformNav, PageShell, SessionGuard, UserMenu } from "iipe-common-ui";
import { prisma } from "@/lib/prisma";
import { verifyAppSession } from "@/lib/session";
import { buildAuthorizeUrl } from "@/lib/sso";
import { LeaveClient, type LeaveItem } from "./components/LeaveClient";

export const dynamic = "force-dynamic";

const SSO_BASE_URL = process.env.SSO_BASE_URL ?? "http://localhost:3000";
const MAIN_BASE_URL = process.env.MAIN_BASE_URL ?? "http://localhost:3001";

const SUBMIT_ROLES = ["ADMIN", "ACCOUNTS_OFFICER", "OPERATOR"];
const APPROVE_ROLES = ["ADMIN", "ACCOUNTS_OFFICER"];
const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  ACCOUNTS_OFFICER: "Accounts Officer",
  OPERATOR: "Operator",
  VIEWER: "Viewer",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const store = await cookies();
  const session = store.get("app2_session")?.value ?? "";
  const me = await verifyAppSession(session);
  // The proxy does not run for the exact basePath root, so guard it here.
  if (!me) {
    const state = crypto.randomUUID().replaceAll("-", "");
    const authorizeUrl = buildAuthorizeUrl(state);
    store.set("app2_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 300 });
    store.set("app2_return_to", "/", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
    redirect(authorizeUrl.toString());
  }

  if (!me) {
    return <p className="iipe-container">Session not found.</p>;
  }

  const leaves = await prisma.leaveRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { applicantUser: { select: { name: true } } },
  });

  const items: LeaveItem[] = leaves.map((l) => ({
    id: l.id,
    applicant: l.applicantUser.name,
    reason: l.reason,
    days: l.days,
    status: l.status,
    // Formatted once on the server so client hydration always matches.
    createdAtLabel: l.createdAt.toLocaleDateString("en-IN"),
  }));

  const canSubmit = SUBMIT_ROLES.includes(me.role);
  const canApprove = APPROVE_ROLES.includes(me.role);
  const canDelete = me.role === "ADMIN";

  return (
    <PageShell
      header={{
        navItems: getPlatformNav({ mainBaseUrl: MAIN_BASE_URL, ssoBaseUrl: SSO_BASE_URL, active: "home" }),
        right: (
          <>
            <AppsMenu launcherHref={`${MAIN_BASE_URL}/my-apps`} />
            <UserMenu
              name={me.name}
              email={me.email}
              role={ROLE_LABELS[me.role] ?? me.role}
              signOutHref="/api/logout"
            >
              <a href={`${SSO_BASE_URL}/account`}>My Account</a>
              <a href={`${MAIN_BASE_URL}/my-apps`}>My Apps</a>
            </UserMenu>
          </>
        ),
      }}
      sidebarItems={[
        { label: "Home", href: "/", active: true },
        { label: "Leave Requests", href: "/#leaves" },
        { label: "My Account", href: `${SSO_BASE_URL}/account` },
        { label: "SSO (identity)", href: SSO_BASE_URL },
        { label: "Main (access)", href: MAIN_BASE_URL },
      ]}
    >
      <SessionGuard channel="iipe-app2-session" />
      <h1 className="iipe-page-title">Leave Management</h1>
      <p className="iipe-page-sub">
        A second independent application with its own database (<code>app2_db</code>) and a{" "}
        <strong>different role model</strong> from App1: Admin · Accounts Officer · Operator ·
        Viewer.
      </p>

      {params.error && (
        <div className="iipe-alert danger">Sign-in error: {params.error}</div>
      )}

      <div className="iipe-card">
        <div className="iipe-row">
          <div>
            <h2 style={{ margin: 0 }}>{me.name}</h2>
            <div className="iipe-muted">
              @{me.username} · {me.email}
            </div>
          </div>
          <span className="iipe-spacer" />
          <span className="iipe-badge">{ROLE_LABELS[me.role] ?? me.role}</span>
        </div>
        <p className="iipe-muted" style={{ marginBottom: 0 }}>
          Same SSO identity as App1 — but a completely independent role inside this application.
        </p>
      </div>

      <div id="leaves">
        <LeaveClient
          canSubmit={canSubmit}
          canApprove={canApprove}
          canDelete={canDelete}
          initialLeaves={items}
        />
      </div>
    </PageShell>
  );
}

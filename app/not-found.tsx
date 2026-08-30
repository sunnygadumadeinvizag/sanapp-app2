import { cookies } from "next/headers";
import { apiPath, AppsMenu, getPlatformNav, lookupAppName, PageShell, SessionGuard, UserMenu } from "sanapp-common-ui";
import { verifyAppSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const SSO_BASE_URL = process.env.SSO_BASE_URL ?? "http://localhost:3000";
const MAIN_BASE_URL = process.env.MAIN_BASE_URL ?? "http://localhost:3001";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  ACCOUNTS_OFFICER: "Accounts Officer",
  OPERATOR: "Operator",
  VIEWER: "Viewer",
};

function NotFoundBody() {
  return (
    <>
      <h1 className="iipe-page-title">404 — Page not found</h1>
      <p className="iipe-page-sub">
        The page you are looking for does not exist or may have been moved.
      </p>
      <div className="iipe-card">
        <div className="iipe-form-actions">
          <a className="iipe-btn" href={apiPath("/")}>
            Back to Home
          </a>
          <a className="iipe-btn secondary" href={MAIN_BASE_URL}>
            Open My Apps
          </a>
        </div>
      </div>
    </>
  );
}

export default async function NotFoundPage() {
  const appName = await lookupAppName({
    mainBaseUrl: MAIN_BASE_URL,
    appKey: process.env.MAIN_API_KEY,
    basePath: process.env.BASE_PATH ?? "/app2",
    fallback: "Leave Management",
  });
  const store = await cookies();
  const session = store.get("app2_session")?.value ?? "";
  const me = await verifyAppSession(session);
  const themeRes = await fetch(`${SSO_BASE_URL}/api/theme`, {
    cache: "no-store",
    signal: AbortSignal.timeout(2000),
  }).then((r) => r.json()).catch(() => ({}));
  const showAccount = !themeRes.accountDisplayDisabled || me?.ssoRole === "SUPER_ADMIN";

  return (
    <PageShell
      appName={appName}
      header={{
        navItems: getPlatformNav({ mainBaseUrl: MAIN_BASE_URL, ssoBaseUrl: SSO_BASE_URL, active: "home" }),
        right: me ? (
          <>
            <AppsMenu launcherHref={MAIN_BASE_URL} />
            <UserMenu
              name={me.name}
              email={me.email}
              role={ROLE_LABELS[me.role] ?? me.role}
              signOutHref="/api/logout"
            >
              {showAccount && <a href={`${SSO_BASE_URL}/account`}>My Account</a>}
              {me.ssoRole === "SUPER_ADMIN" && (
                <>
                  <div className="iipe-dropdown-section">Admin Console</div>
                  <a href={`${MAIN_BASE_URL}/admin-console`}>Admin Console</a>
                </>
              )}
            </UserMenu>
          </>
        ) : undefined,
      }}
      sidebarItems={[
        { label: "Home", href: "/", active: false },

      ]}
    >
      <SessionGuard channel="sanapp-app2-session" />
      <NotFoundBody />
    </PageShell>
  );
}

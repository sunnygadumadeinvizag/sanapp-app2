import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AppsMenu, AppNotificationsView, getPlatformNav, lookupAppName, PageShell, SessionGuard, UserMenu } from "sanapp-common-ui";
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

export default async function NotificationsPage() {
  const appName = await lookupAppName({
    mainBaseUrl: MAIN_BASE_URL,
    appKey: process.env.MAIN_API_KEY,
    basePath: process.env.BASE_PATH ?? "/app2",
    fallback: "Leave Management",
  });
  const store = await cookies();
  const session = store.get("app2_session")?.value ?? "";
  const me = await verifyAppSession(session);
  if (!me) {
    redirect(process.env.APP_BASE_URL! + "/api/start-oauth");
  }

  return (
    <PageShell
      appName={appName}
      header={{
        navItems: getPlatformNav({ mainBaseUrl: MAIN_BASE_URL, ssoBaseUrl: SSO_BASE_URL, active: "home" }),
        right: (
          <>
            <AppsMenu launcherHref={MAIN_BASE_URL} />
            <UserMenu
              name={me.name}
              email={me.email}
              role={ROLE_LABELS[me.role] ?? me.role}
              signOutHref="/api/logout"
            >
              <a href={`${SSO_BASE_URL}/account`}>My Account</a>
              {me.ssoRole === "SUPER_ADMIN" && (
                <>
                  <div className="iipe-dropdown-section">Admin Console</div>
                  <a href={`${MAIN_BASE_URL}/admin-console`}>Admin Console</a>
                </>
              )}
            </UserMenu>
          </>
        ),
      }}
      sidebarItems={[
        { label: "Home", href: "/" },
        { label: "Leave Requests", href: "/#leaves" },
        { label: "App Notifications", href: "/notifications", active: true },
      ]}
    >
      <SessionGuard channel="sanapp-app2-session" />
      <h1 className="iipe-page-title">App Notifications</h1>
      <p className="iipe-page-sub">
        Alerts from {appName}. Notifications from every application also appear under the bell in
        the header.
      </p>
      <div className="mt-4">
        <AppNotificationsView appName={appName} />
      </div>
    </PageShell>
  );
}

import { logoutAction } from "@/actions/auth";
import { LogoutIcon } from "@/components/icons";
import { LocaleSwitch } from "@/components/locale-switch";
import { Logo } from "@/components/logo";
import { DesktopNav, MobileTabBar, ProfileLink } from "@/components/nav-links";
import { NotificationPoller } from "@/components/notification-poller";
import { PageTransition } from "@/components/page-transition";
import { pendingRequestCount } from "@/lib/friends";
import { unreadMessageCount } from "@/lib/messages";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/session";
import { displayName } from "@/lib/users";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const [pendingRequests, unreadMessages, { t }] = await Promise.all([
    pendingRequestCount(user.id),
    unreadMessageCount(user.id),
    getI18n(),
  ]);
  const me = { name: displayName(user), handle: user.handle, pendingRequests, unreadMessages };
  return (
    <div className="relative z-10 flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-velvet-800/80 bg-velvet-950/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
          <Logo href="/dashboard" />
          <DesktopNav me={me} />
          <div className="ml-auto flex items-center gap-1">
            <LocaleSwitch className="mr-1" />
            <ProfileLink me={me} />
            <form action={logoutAction}>
              <button className="btn-quiet size-10 p-0" aria-label={t.common.logout} title={t.common.logout}>
                <LogoutIcon className="size-4.5" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="contenu" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 outline-none px-4 pt-6 pb-28 sm:px-6 sm:pt-10 md:pb-16">
        <PageTransition>{children}</PageTransition>
      </main>
      <MobileTabBar me={me} />
      <NotificationPoller initial={{ pendingRequests, unreadMessages }} />
    </div>
  );
}

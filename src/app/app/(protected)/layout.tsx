import { cookies } from "next/headers";
import { Sidebar } from "@/components/ui/sidebar";
import { MobileTopBar } from "@/components/ui/mobile-top-bar";
import { MobileTabBar } from "@/components/ui/mobile-tab-bar";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ensureUserExists, getOrCreateProfile } from "@/lib/plan";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import { sendRedditConversionEvent } from "@/lib/telemetry/reddit-capi";

const REDDIT_SIGNUP_COOKIE = "replyflow_new_signup";

function generateConversionId(): string {
  return crypto.randomUUID?.() ?? `ev_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/app/signin");
  }

  const { userId, wasCreated } = ensureUserExists(session);
  if (wasCreated) {
    const conversionId = generateConversionId();
    await sendRedditConversionEvent({
      eventName: "SignUp",
      conversionId,
      user: {
        ...(session.user?.email && { email: session.user.email }),
        ...(session.user?.id && { external_id: session.user.id }),
      },
    });
    (await cookies()).set(REDDIT_SIGNUP_COOKIE, conversionId, { maxAge: 60, path: "/" });
  }
  getOrCreateProfile(userId);

  return (
    <div className="flex h-screen bg-[var(--rf-bg)] text-[var(--rf-text)]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileTopBar />
        <main className="rf-grid-bg flex-1 overflow-auto pb-16 md:pb-0">
          <OnboardingProvider>{children}</OnboardingProvider>
        </main>
        <MobileTabBar />
      </div>
    </div>
  );
}

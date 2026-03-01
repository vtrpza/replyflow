import { Sidebar } from "@/components/ui/sidebar";
import { MobileTopBar } from "@/components/ui/mobile-top-bar";
import { MobileTabBar } from "@/components/ui/mobile-tab-bar";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ensureUserExists, getOrCreateProfile } from "@/lib/plan";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import { sendRedditConversionEvent } from "@/lib/telemetry/reddit-capi";

/** Id used by RedditPixel to fire SignUp with same conversionId (dedup with CAPI). Must match id in reddit-pixel.tsx */
export const SIGNUP_CONVERSION_ID_ELEMENT_ID = "replyflow-signup-cid";

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
  let signupConversionId: string | null = null;
  if (wasCreated) {
    const conversionId = generateConversionId();
    signupConversionId = conversionId;
    await sendRedditConversionEvent({
      eventName: "SignUp",
      conversionId,
      user: {
        ...(session.user?.email && { email: session.user.email }),
        ...(session.user?.id && { external_id: session.user.id }),
      },
    });
  }
  getOrCreateProfile(userId);

  return (
    <div className="flex h-screen bg-[var(--rf-bg)] text-[var(--rf-text)]">
      {signupConversionId != null ? (
        <div
          id={SIGNUP_CONVERSION_ID_ELEMENT_ID}
          data-conversion-id={signupConversionId}
          aria-hidden="true"
          className="hidden"
        />
      ) : null}
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

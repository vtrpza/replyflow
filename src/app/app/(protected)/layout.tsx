import { Sidebar } from "@/components/ui/sidebar";
import { MobileTopBar } from "@/components/ui/mobile-top-bar";
import { MobileTabBar } from "@/components/ui/mobile-tab-bar";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ensureUserExists, getOrCreateProfile } from "@/lib/plan";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/app/signin");
  }

  const userId = ensureUserExists(session);
  getOrCreateProfile(userId);

  return (
    <div className="flex h-screen bg-[var(--rf-bg)] text-[var(--rf-text)]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileTopBar />
        <main className="rf-grid-bg flex-1 overflow-auto pb-16 md:pb-0">{children}</main>
        <MobileTabBar />
      </div>
    </div>
  );
}

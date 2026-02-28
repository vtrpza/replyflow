"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";
import { captureEvent } from "@/lib/analytics";

export default function SignInPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    if (session) {
      captureEvent("user_logged_in", { provider: "google" });
      router.push("/app");
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
            <Image
              src="/brand/replyflow/replyflow-icon.png"
              alt="ReplyFlow"
              width={64}
              height={64}
              className="rounded-2xl"
            />
          </div>
          <h1 className="text-2xl font-bold text-white">ReplyFlow</h1>
          <p className="text-zinc-500 mt-2">
            {t("signin.tagline")}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <h2 className="text-lg font-semibold text-zinc-200 mb-2 text-center">
            {t("signin.welcomeBack")}
          </h2>
          <p className="text-sm text-zinc-500 mb-6 text-center">
            {t("signin.description")}
          </p>

          <button
            onClick={() => {
              captureEvent("sign_in_clicked", { provider: "google" });
              signIn("google", { callbackUrl: "/app" });
            }}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t("signin.continueGoogle")}
          </button>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6">
          {t("signin.disclaimer")}
        </p>
      </div>
    </div>
  );
}

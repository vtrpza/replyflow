import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteUserAccount } from "@/lib/account/delete";
import { cancelUserSubscription } from "@/lib/billing/service";

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { confirmText?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (body.confirmText !== "delete my account") {
      return NextResponse.json({ error: "Confirmation text required" }, { status: 400 });
    }

    const userId = session.user.id;

    try {
      await cancelUserSubscription(userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "No provider subscription found") {
        console.log("No active subscription to cancel, proceeding with deletion");
      } else {
        console.error("Failed to cancel subscription before account deletion:", error);
        return NextResponse.json(
          { error: "Failed to cancel active subscription. Please cancel your subscription first, then try again." },
          { status: 500 },
        );
      }
    }

    await deleteUserAccount(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}

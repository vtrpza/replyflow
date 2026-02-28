import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteUserAccount } from "@/lib/account/delete";
import { cancelUserSubscription } from "@/lib/billing/service";

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (body.confirmText !== "delete my account") {
      return NextResponse.json({ error: "Confirmation text required" }, { status: 400 });
    }

    const userId = session.user.id;

    try {
      await cancelUserSubscription(userId);
    } catch {
      console.log("No active subscription to cancel, proceeding with deletion");
    }

    await deleteUserAccount(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}

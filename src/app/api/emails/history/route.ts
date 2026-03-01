import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { ensureUserExists, getEffectivePlan, getLimitsForPlan } from "@/lib/plan";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await ensureUserExists(session);

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const requestedLimit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const plan = getEffectivePlan(userId);
    const limits = getLimitsForPlan(plan);

    let limit = requestedLimit;
    if (plan === "free") {
      limit = Math.min(requestedLimit, limits.historyItems);
    }

    const query = db
      .select({
        email: schema.outboundEmails,
        account: {
          emailAddress: schema.connectedEmailAccounts.emailAddress,
        },
      })
      .from(schema.outboundEmails)
      .innerJoin(
        schema.connectedEmailAccounts,
        eq(schema.outboundEmails.accountId, schema.connectedEmailAccounts.id)
      )
      .where(eq(schema.outboundEmails.userId, userId));

    const allEmails = query.orderBy(desc(schema.outboundEmails.createdAt)).all();

    const filteredEmails = status
      ? allEmails.filter((e) => e.email.status === status)
      : allEmails;

    const freeCappedEmails = plan === "free" ? filteredEmails.slice(0, limits.historyItems) : filteredEmails;
    const paginatedEmails = freeCappedEmails.slice(offset, offset + limit);

    return NextResponse.json({
      emails: paginatedEmails.map((e) => ({
        ...e.email,
        senderEmail: e.account.emailAddress,
      })),
      total: freeCappedEmails.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("History GET error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

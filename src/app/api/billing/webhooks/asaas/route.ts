import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getBillingConfig } from "@/lib/billing/config";
import { handleAsaasWebhook } from "@/lib/billing/service";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  const config = getBillingConfig();
  const rawBody = await request.text();
  const payloadFingerprint = sha256(rawBody);

  const webhookToken = config.ASAAS_WEBHOOK_TOKEN;
  if (webhookToken) {
    const incomingToken = request.headers.get("asaas-access-token") || "";
    if (!safeEqual(incomingToken, webhookToken)) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
  }

  try {
    await handleAsaasWebhook({
      rawBody,
      payloadFingerprint,
    });
  } catch (error) {
    console.error("Billing webhook processing error:", error);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

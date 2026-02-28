import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { generateColdEmail } from "@/lib/outreach/email-generator";
import { assertWithinPlan, ensureUserExists, getEffectivePlan, getOrCreateProfile, upgradeRequiredResponse } from "@/lib/plan";
import { recordPlanIntentEvent, recordUpgradeBlockedIntent } from "@/lib/plan/intent-events";
import type { UserProfile } from "@/lib/types";
import path from "path";
import { upsertContactFromJobForUser } from "@/lib/contacts/upsert";
import { isDirectContactEmail } from "@/lib/contacts/email-quality";
import { getPostHogClient } from "@/lib/posthog-server";
import { BUILD_VERSION } from "@/lib/config";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = ensureUserExists(session);

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const conditions = [eq(schema.outreachRecords.userId, userId)];
    if (status) {
      conditions.push(eq(schema.outreachRecords.status, status));
    }

    const records = db
      .select({ outreach: schema.outreachRecords, job: schema.jobs })
      .from(schema.outreachRecords)
      .innerJoin(schema.jobs, eq(schema.outreachRecords.jobId, schema.jobs.id))
      .where(and(...conditions))
      .orderBy(desc(schema.outreachRecords.updatedAt))
      .all();

    const plan = getEffectivePlan(userId);

    const parsed = records.map((row) => {
      const revealed =
        plan === "pro"
          ? true
          : !!db
              .select()
              .from(schema.jobReveals)
              .where(
                and(
                  eq(schema.jobReveals.userId, userId),
                  eq(schema.jobReveals.jobId, row.job.id)
                )
              )
              .get();

      return {
        ...row.outreach,
        job: {
          ...row.job,
          contactEmail: revealed ? row.job.contactEmail : row.job.contactEmail ? "***" : null,
          contactLinkedin: revealed ? row.job.contactLinkedin : row.job.contactLinkedin ? "***" : null,
          contactWhatsapp: revealed ? row.job.contactWhatsapp : row.job.contactWhatsapp ? "***" : null,
          labels: JSON.parse(row.job.labels),
          techStack: JSON.parse(row.job.techStack),
        },
      };
    });

    return NextResponse.json({ records: parsed });
  } catch (error) {
    console.error("Outreach fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch outreach records" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = ensureUserExists(session);

    const body = await request.json();
    const { jobId, language = "pt-BR" } = body;

    if (!jobId) {
      return NextResponse.json({ error: "jobId required" }, { status: 400 });
    }

    const job = db.select().from(schema.jobs).where(eq(schema.jobs.id, jobId)).get();
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const existing = db
      .select()
      .from(schema.outreachRecords)
      .where(and(eq(schema.outreachRecords.userId, userId), eq(schema.outreachRecords.jobId, jobId)))
      .get();

    if (existing) {
      return NextResponse.json({
        success: true,
        outreach: {
          id: existing.id,
          email: {
            subject: existing.emailSubject,
            body: existing.emailBody,
          },
        },
        existing: true,
      });
    }

    if (job.contactEmail && isDirectContactEmail(job.contactEmail)) {
      upsertContactFromJobForUser(userId, {
        email: job.contactEmail,
        company: job.company,
        position: job.role,
        sourceRef: job.issueUrl,
        sourceType: job.sourceType || "github_repo",
        jobId: job.id,
        jobTitle: job.title,
        unlock: true,
        unlockSource: "outreach",
      });
    }

    const draftCheck = assertWithinPlan(userId, "drafts");
    if (!draftCheck.ok) {
      recordUpgradeBlockedIntent({
        userId,
        plan: getEffectivePlan(userId),
        feature: draftCheck.feature,
        route: "/api/outreach",
        limit: draftCheck.limit,
        period: draftCheck.period,
      });
      return NextResponse.json(upgradeRequiredResponse(draftCheck.feature, draftCheck.limit), { status: 402 });
    }

    const rawProfile = getOrCreateProfile(userId);
    const profile = {
      ...rawProfile,
      skills: JSON.parse(rawProfile.skills) as string[],
      preferredContractTypes: JSON.parse(rawProfile.preferredContractTypes) as string[],
      preferredLocations: JSON.parse(rawProfile.preferredLocations) as string[],
      highlights: JSON.parse(rawProfile.highlights) as string[],
      profileScoreMissing: JSON.parse(rawProfile.profileScoreMissing) as string[],
      profileScoreSuggestions: JSON.parse(rawProfile.profileScoreSuggestions) as string[],
    } as UserProfile;

    const plan = getEffectivePlan(userId);
    let contactEmail = job.contactEmail;

    if (plan === "free" && contactEmail) {
      const revealed = db
        .select()
        .from(schema.jobReveals)
        .where(and(eq(schema.jobReveals.userId, userId), eq(schema.jobReveals.jobId, jobId)))
        .get();

      if (!revealed) {
        contactEmail = null;
      }
    }

    const email = generateColdEmail(
      {
        title: job.title,
        company: job.company,
        role: job.role,
        techStack: JSON.parse(job.techStack),
        repoFullName: job.repoFullName,
        posterUsername: job.posterUsername,
        issueUrl: job.issueUrl,
        contactEmail,
      },
      profile,
      language
    );

    const now = new Date().toISOString();
    const outreachId = generateId();

    db.insert(schema.outreachRecords)
      .values({
        id: outreachId,
        userId,
        jobId: job.id,
        status: "email_drafted",
        emailSubject: email.subject,
        emailBody: email.body,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const outreachCount = db
      .select({ value: sql<number>`count(*)` })
      .from(schema.outreachRecords)
      .where(eq(schema.outreachRecords.userId, userId))
      .get();
    if (outreachCount?.value === 1) {
      const ph = getPostHogClient();
      ph.capture({
        distinctId: userId,
        event: "pipeline_created",
        properties: { build_version: BUILD_VERSION },
      });
      void ph.shutdown();
    }

    recordPlanIntentEvent({
      userId,
      plan,
      eventType: "core_action_draft",
      route: "/api/outreach",
      metadata: {
        jobId: job.id,
        language,
      },
    });

    const bodyLen = job.body?.length ?? 0;
    const inputLengthBucket = bodyLen < 200 ? "xs" : bodyLen < 500 ? "sm" : bodyLen < 2000 ? "md" : "lg";

    return NextResponse.json({
      success: true,
      outreach: {
        id: outreachId,
        email,
      },
      analytics: {
        is_first_reply: (outreachCount?.value ?? 0) <= 1,
        reply_type: "cold_email",
        input_length_bucket: inputLengthBucket,
      },
    });
  } catch (error) {
    console.error("Outreach create error:", error);
    return NextResponse.json({ error: "Failed to create outreach" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = ensureUserExists(session);

    const body = await request.json();
    const { id, status, notes, emailSubject, emailBody } = body;

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const existing = db
      .select()
      .from(schema.outreachRecords)
      .where(and(eq(schema.outreachRecords.id, id), eq(schema.outreachRecords.userId, userId)))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Outreach record not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updateData: Record<string, string | null> = { updatedAt: now };

    if (status) {
      updateData.status = status;
      if (status === "email_sent") updateData.sentAt = now;
      if (status === "followed_up") updateData.followedUpAt = now;
      if (status === "replied") updateData.repliedAt = now;
    }
    if (notes !== undefined) updateData.notes = notes;
    if (emailSubject !== undefined) updateData.emailSubject = emailSubject.trim() || null;
    if (emailBody !== undefined) updateData.emailBody = emailBody.trim() || null;

    db.update(schema.outreachRecords)
      .set(updateData)
      .where(eq(schema.outreachRecords.id, id))
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Outreach update error:", error);
    return NextResponse.json({ error: "Failed to update outreach" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = ensureUserExists(session);
    const plan = getEffectivePlan(userId);

    const body = await request.json();
    const { id, attachCV, toEmailOverride, accountId, emailSubject, emailBody } = body;

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const record = db
      .select({ outreach: schema.outreachRecords, job: schema.jobs })
      .from(schema.outreachRecords)
      .innerJoin(schema.jobs, eq(schema.outreachRecords.jobId, schema.jobs.id))
      .where(and(eq(schema.outreachRecords.id, id), eq(schema.outreachRecords.userId, userId)))
      .get();

    if (!record) {
      return NextResponse.json({ error: "Outreach record not found" }, { status: 404 });
    }

    const profile = getOrCreateProfile(userId);

    const subject = emailSubject ?? record.outreach.emailSubject;
    const bodyText = emailBody ?? record.outreach.emailBody;

    if (!subject || !bodyText) {
      return NextResponse.json({ error: "No email draft to send" }, { status: 400 });
    }

    let toEmail = toEmailOverride || null;

    if (!toEmail) {
      if (plan === "free" && record.job.contactEmail) {
        const reveal = db
          .select()
          .from(schema.jobReveals)
          .where(and(eq(schema.jobReveals.userId, userId), eq(schema.jobReveals.jobId, record.job.id)))
          .get();

        if (!reveal) {
          return NextResponse.json({ error: "Reveal contact before sending" }, { status: 400 });
        }
      }

      toEmail = record.job.contactEmail;
    }

    if (!toEmail) {
      return NextResponse.json({ error: "No recipient email provided" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail)) {
      return NextResponse.json({ error: "Invalid email address format" }, { status: 400 });
    }

    let account = accountId
      ? db
          .select()
          .from(schema.connectedEmailAccounts)
          .where(and(eq(schema.connectedEmailAccounts.id, accountId), eq(schema.connectedEmailAccounts.userId, userId)))
          .get()
      : null;

    if (!account) {
      const accounts = db
        .select()
        .from(schema.connectedEmailAccounts)
        .where(eq(schema.connectedEmailAccounts.userId, userId))
        .all();
      account = accounts.find((item) => item.isDefault) || accounts[0];
    }

    if (!account) {
      return NextResponse.json({ error: "No connected email account found" }, { status: 400 });
    }

    const sendCheck = assertWithinPlan(userId, "sends");
    if (!sendCheck.ok) {
      recordUpgradeBlockedIntent({
        userId,
        plan,
        feature: sendCheck.feature,
        route: "/api/outreach",
        limit: sendCheck.limit,
        period: sendCheck.period,
      });
      return NextResponse.json(upgradeRequiredResponse(sendCheck.feature, sendCheck.limit), { status: 402 });
    }

    let accessToken = account.accessToken;
    if (account.expiresAt && account.expiresAt < Date.now()) {
      if (!account.refreshToken) {
        return NextResponse.json({ error: "Token expired and no refresh token available" }, { status: 401 });
      }

      const { getEmailProvider } = await import("@/lib/providers/email");
      const provider = getEmailProvider(account.provider as "gmail");
      const refreshResult = await provider.refreshToken(account.refreshToken);

      if (!refreshResult.success || !refreshResult.accessToken) {
        return NextResponse.json({ error: "Failed to refresh token" }, { status: 401 });
      }

      accessToken = refreshResult.accessToken;
      db.update(schema.connectedEmailAccounts)
        .set({
          accessToken: refreshResult.accessToken,
          refreshToken: refreshResult.refreshToken || account.refreshToken,
          expiresAt: refreshResult.expiresAt || null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.connectedEmailAccounts.id, account.id))
        .run();
    }

    let attachments: Array<{ filename: string; content: string }> | undefined;
    if (attachCV) {
      const cvPath =
        attachCV === "br"
          ? path.join(process.cwd(), "data", "cv", "Vitor_Pouza_CV_BR_1pg.pdf")
          : path.join(process.cwd(), "data", "cv", "Vitor_Pouza_CV_EN_1pg-1.pdf");

      try {
        const fs = await import("fs");
        const fileBuffer = fs.readFileSync(cvPath);
        attachments = [
          {
            filename: attachCV === "br" ? "Vitor_Pouza_CV_BR.pdf" : "Vitor_Pouza_CV_EN.pdf",
            content: fileBuffer.toString("base64"),
          },
        ];
      } catch (error) {
        console.error("Failed to read CV file:", error);
      }
    }

    const { getEmailProvider } = await import("@/lib/providers/email");
    const provider = getEmailProvider(account.provider as "gmail");
    const sendResult = await provider.send(
      {
        to: toEmail,
        from: account.emailAddress,
        replyTo: profile.email || account.emailAddress,
        subject,
        bodyHtml: bodyText.replace(/\n/g, "<br>"),
        bodyText,
        attachments,
      },
      accessToken
    );

    if (!sendResult.success) {
      return NextResponse.json({ error: sendResult.error?.message || "Failed to send email" }, { status: 500 });
    }

    const now = new Date().toISOString();
    db.update(schema.outreachRecords)
      .set({ status: "email_sent", sentAt: now, updatedAt: now })
      .where(eq(schema.outreachRecords.id, id))
      .run();

    db.insert(schema.outboundEmails)
      .values({
        id: `outreach-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userId,
        accountId: account.id,
        recipientEmail: toEmail,
        senderEmail: account.emailAddress,
        replyTo: profile.email || null,
        subject,
        bodyHtml: bodyText.replace(/\n/g, "<br>"),
        bodyText,
        status: "sent",
        provider: account.provider,
        providerMessageId: sendResult.messageId || null,
        providerThreadId: sendResult.threadId || null,
        sentAt: now,
        createdAt: now,
      })
      .run();

    recordPlanIntentEvent({
      userId,
      plan,
      eventType: "core_action_send",
      route: "/api/outreach",
      metadata: {
        outreachId: id,
        accountId: account.id,
      },
    });

    return NextResponse.json({
      success: true,
      messageId: sendResult.messageId,
      sentTo: toEmail,
      attachedCV: attachCV ? (attachCV === "br" ? "Portuguese" : "English") : null,
    });
  } catch (error) {
    console.error("Outreach send error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq, isNull } from "drizzle-orm";
import { ensureUserExists } from "@/lib/plan";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language");
    const type = searchParams.get("type");

    let query = db.select().from(schema.emailTemplates);

    if (userId) {
      ensureUserExists(session);
      const userIdFinal = userId;
      query = query.where(
        (templates) =>
          eq(templates.userId, userIdFinal) ||
          (isNull(templates.userId) as unknown as typeof templates.userId)
      ) as typeof query;
    } else {
      query = query.where(isNull(schema.emailTemplates.userId)) as typeof query;
    }

    let templates = query.all();

    if (language) {
      templates = templates.filter((t) => t.language === language);
    }

    if (type) {
      templates = templates.filter((t) => t.type === type);
    }

    const sanitized = templates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      type: template.type,
      language: template.language,
      subject: template.subject,
      subjectVariants: template.subjectVariants
        ? JSON.parse(template.subjectVariants)
        : null,
      body: template.body,
      isDefault: template.isDefault,
      usageCount: template.usageCount,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    }));

    return NextResponse.json({ templates: sanitized });
  } catch (error) {
    console.error("Templates GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = ensureUserExists(session);

    const body = await request.json();
    const { name, description, type, language, subject, subjectVariants, body: templateBody } = body;

    if (!name || !type || !language || !subject || !templateBody) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const id = `template-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    db.insert(schema.emailTemplates)
      .values({
        id,
        userId,
        name,
        description: description || null,
        type,
        language,
        subject,
        subjectVariants: subjectVariants ? JSON.stringify(subjectVariants) : null,
        body: templateBody,
        isDefault: false,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return NextResponse.json({
      success: true,
      template: {
        id,
        name,
        description,
        type,
        language,
        subject,
        subjectVariants,
        body: templateBody,
      },
    });
  } catch (error) {
    console.error("Templates POST error:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}

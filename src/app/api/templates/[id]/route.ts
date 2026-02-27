import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const userId = session?.user?.id;

    const template = db
      .select()
      .from(schema.emailTemplates)
      .where(eq(schema.emailTemplates.id, id))
      .get();

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (template.userId && template.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      template: {
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
      },
    });
  } catch (error) {
    console.error("Template GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const existing = db
      .select()
      .from(schema.emailTemplates)
      .where(eq(schema.emailTemplates.id, id))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (existing.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, subject, subjectVariants, body: templateBody } = body;

    const now = new Date().toISOString();

    db.update(schema.emailTemplates)
      .set({
        name: name ?? existing.name,
        description: description ?? existing.description,
        subject: subject ?? existing.subject,
        subjectVariants: subjectVariants
          ? JSON.stringify(subjectVariants)
          : existing.subjectVariants,
        body: templateBody ?? existing.body,
        updatedAt: now,
      })
      .where(eq(schema.emailTemplates.id, id))
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Template PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const existing = db
      .select()
      .from(schema.emailTemplates)
      .where(eq(schema.emailTemplates.id, id))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (existing.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!existing.userId) {
      return NextResponse.json(
        { error: "Cannot delete global templates" },
        { status: 403 }
      );
    }

    db.delete(schema.emailTemplates)
      .where(eq(schema.emailTemplates.id, id))
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Template DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}

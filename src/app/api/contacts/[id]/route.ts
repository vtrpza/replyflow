import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { ensureUserExists } from "@/lib/plan";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const userId = ensureUserExists(session);
    const body = await request.json();

    const existing = db
      .select()
      .from(schema.contacts)
      .where(and(eq(schema.contacts.id, id), eq(schema.contacts.userId, userId)))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    db.update(schema.contacts)
      .set({
        name: body.name ?? existing.name,
        company: body.company ?? existing.company,
        position: body.position ?? existing.position,
        status: body.status ?? existing.status,
        notes: body.notes ?? existing.notes,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.contacts.id, id))
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contacts PATCH error:", error);
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const userId = ensureUserExists(session);

    db.delete(schema.contacts)
      .where(and(eq(schema.contacts.id, id), eq(schema.contacts.userId, userId)))
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contacts DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
  }
}

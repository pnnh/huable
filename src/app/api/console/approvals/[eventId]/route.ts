import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { approvalEvents, notes, channels } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireConsoleAuth } from "../../_auth";

export const runtime = "nodejs";

type Props = { params: Promise<{ eventId: string }> };

export async function PATCH(req: NextRequest, { params }: Props) {
    const authError = await requireConsoleAuth();
    if (authError) return authError;

    const user = await getCurrentUser();
    if (user.sysrole !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { eventId } = await params;
    if (!eventId || !/^[a-zA-Z0-9_-]+$/.test(eventId)) {
        return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const action = body.action;
    if (action !== "approve" && action !== "reject") {
        return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
    }

    const db = getDb();

    const [event] = await db
        .select()
        .from(approvalEvents)
        .where(eq(approvalEvents.id, eventId))
        .limit(1);

    if (!event) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (event.isHandled) {
        return NextResponse.json({ error: "Event already handled" }, { status: 409 });
    }

    const result = action === "approve" ? "approved" : "rejected";
    const now = Date.now();

    await db
        .update(approvalEvents)
        .set({ isHandled: true, handledAt: now, handledBy: user.id, result })
        .where(eq(approvalEvents.id, eventId));

    const targetApprovalStatus = action === "approve" ? "approved" : "rejected";
    if (event.type === "channel" && event.channelId) {
        await db
            .update(channels)
            .set({ approvalStatus: targetApprovalStatus })
            .where(eq(channels.id, event.channelId));
    } else if (event.noteId) {
        await db
            .update(notes)
            .set({ approvalStatus: targetApprovalStatus })
            .where(eq(notes.id, event.noteId));
    }

    return NextResponse.json({ ok: true });
}

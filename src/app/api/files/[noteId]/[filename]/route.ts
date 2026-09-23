import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { getDb } from "@/db/index";
import { noteAttachments, notes, channels, approvalEvents } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";

async function revertToDraftAndVoidPendingEvent(db: ReturnType<typeof getDb>, noteId: string): Promise<void> {
    const now = Date.now();
    await db.update(notes).set({ approvalStatus: "draft", updatedAt: now }).where(eq(notes.id, noteId));
    await db
        .update(approvalEvents)
        .set({ isHandled: true, handledBy: null, result: null, handledAt: now })
        .where(and(eq(approvalEvents.noteId, noteId), eq(approvalEvents.isHandled, false)));
}

export const runtime = "nodejs";

type Params = { noteId: string; filename: string };

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const { noteId, filename } = await params;
    const db = getDb();

    const [note] = await db
        .select({ userId: notes.userId, channelId: notes.channelId, approvalStatus: notes.approvalStatus })
        .from(notes)
        .where(eq(notes.id, noteId))
        .limit(1);

    if (!note) {
        return new NextResponse("Not found", { status: 404 });
    }

    // Attachments are not their own approval entity (see spec.md), so their visibility must
    // mirror the owning note's: the owner/an admin can always fetch them (e.g. to preview while
    // still a draft), everyone else only once the note and its channel are both approved (FR-018).
    const isDev = process.env.NODE_ENV === "development";
    let isOwnerOrAdmin = false;
    if (await isAuthenticated()) {
        const user = await getCurrentUser();
        isOwnerOrAdmin = user.id === note.userId || user.sysrole === "admin";
    }

    if (!isOwnerOrAdmin && !isDev) {
        let publiclyVisible = false;
        if (note.approvalStatus === "approved" && note.channelId) {
            const [channel] = await db
                .select({ approvalStatus: channels.approvalStatus })
                .from(channels)
                .where(eq(channels.id, note.channelId))
                .limit(1);
            publiclyVisible = channel?.approvalStatus === "approved";
        }
        if (!publiclyVisible) {
            return new NextResponse("Not found", { status: 404 });
        }
    }

    const storage = getStorage();
    const data = await storage.read(noteId, filename);

    if (!data) {
        return new NextResponse("Not found", { status: 404 });
    }

    // Determine content type from extension
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    const contentTypeMap: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        pdf: "application/pdf",
        txt: "text/plain",
    };
    const contentType = contentTypeMap[ext] ?? "application/octet-stream";

    return new NextResponse(new Uint8Array(data), {
        headers: { "Content-Type": contentType },
    });
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const { noteId, filename } = await params;
    const db = getDb();
    const storage = getStorage();

    // Delete DB record first
    await db
        .delete(noteAttachments)
        .where(and(eq(noteAttachments.noteId, noteId), eq(noteAttachments.filename, filename)));

    // Deleting an attachment counts as editing the note: revert any non-draft status back to
    // "draft" and void the pending approval event, if any (see spec.md FR-003/FR-017).
    const [note] = await db.select({ approvalStatus: notes.approvalStatus }).from(notes).where(eq(notes.id, noteId)).limit(1);
    if (note && note.approvalStatus !== "draft") {
        await revertToDraftAndVoidPendingEvent(db, noteId);
    }

    // Delete file (ignore if already gone)
    await storage.delete(noteId, filename).catch(() => undefined);

    return new NextResponse(null, { status: 204 });
}


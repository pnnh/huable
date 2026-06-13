import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { getDb } from "@/db/index";
import { noteAttachments, notes, approvalEvents } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";

type Params = { noteId: string; filename: string };

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const { noteId, filename } = await params;
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

    // Reset approval status and create approval event only when note is published in a channel (prod only; dev allows immediate public visibility)
    const [note] = await db.select({ channelId: notes.channelId, isPublished: notes.isPublished }).from(notes).where(eq(notes.id, noteId)).limit(1);
    if (note?.channelId && note.isPublished && process.env.NODE_ENV !== "development") {
        await db.update(notes).set({ approvalStatus: "pending", updatedAt: Date.now() }).where(eq(notes.id, noteId));
        await db.insert(approvalEvents).values({ noteId, action: "updated", createdAt: Date.now() });
    }

    // Delete file (ignore if already gone)
    await storage.delete(noteId, filename).catch(() => undefined);

    return new NextResponse(null, { status: 204 });
}


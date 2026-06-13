import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { getDb } from "@/db/index";
import { noteAttachments, notes, approvalEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireConsoleAuth } from "../_auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const authError = await requireConsoleAuth();
    if (authError) return authError;

    const formData = await req.formData();
    const file = formData.get("file");
    const noteId = formData.get("noteId");

    if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (!noteId || typeof noteId !== "string") {
        return NextResponse.json({ error: "Missing noteId" }, { status: 400 });
    }

    // Verify the note exists before accepting upload
    const db = getDb();
    const existingNotes = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);
    if (existingNotes.length === 0) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const mimeType = file.type || "application/octet-stream";
    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = getStorage();

    await storage.save(noteId, filename, buffer);

    // Upsert attachment record (ignore duplicate filename for the same note)
    await db
        .insert(noteAttachments)
        .values({ noteId, filename, mimeType })
        .onConflictDoNothing();

    // Reset approval status and create approval event only when note is published in a channel
    const note = existingNotes[0];
    if (note.channelId && note.isPublished) {
        await db.update(notes).set({ approvalStatus: "pending", updatedAt: Date.now() }).where(eq(notes.id, noteId));
        await db.insert(approvalEvents).values({ noteId, action: "updated", createdAt: Date.now() });
    }

    const url = `/api/files/${noteId}/${encodeURIComponent(filename)}`;
    return NextResponse.json({ filename, noteId, url });
}

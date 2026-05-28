import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/index";
import { noteAttachments } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

type Params = { noteId: string };

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const { noteId } = await params;
    const db = getDb();
    const attachments = await db
        .select()
        .from(noteAttachments)
        .where(eq(noteAttachments.noteId, noteId));

    return NextResponse.json(attachments);
}

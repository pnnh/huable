import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { notes, createId } from "@/db/schema";
import {
    assertUniqueNameInParent,
    resolveOwnedDirectory,
    NameConflictError,
    DirectoryNotFoundError,
} from "@/lib/notesTree";
import { requireConsoleAuth } from "../../_auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const authError = await requireConsoleAuth();
    if (authError) return authError;

    const user = await getCurrentUser();
    const db = getDb();

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const title = (typeof body.title === "string" ? body.title : "").trim();
    const description = typeof body.description === "string" ? body.description : "";
    const parentId = body.parentId === null || body.parentId === undefined ? null : String(body.parentId);

    if (!title) {
        return NextResponse.json({ error: "title_required" }, { status: 400 });
    }

    try {
        await resolveOwnedDirectory(db, user.id, parentId);
        await assertUniqueNameInParent(db, user.id, parentId, title);
    } catch (err) {
        if (err instanceof DirectoryNotFoundError) {
            return NextResponse.json({ error: "parent_not_found" }, { status: 404 });
        }
        if (err instanceof NameConflictError) {
            return NextResponse.json({ error: "name_conflict", message: err.message }, { status: 409 });
        }
        throw err;
    }

    const id = createId();
    const now = Date.now();

    await db.insert(notes).values({
        id,
        userId: user.id,
        channelId: null,
        parentId,
        title,
        body: description,
        mimeType: "directory",
        approvalStatus: "draft",
        createdAt: now,
        updatedAt: now,
    });

    return NextResponse.json(
        { id, title, mimeType: "directory", parentId },
        { status: 201 },
    );
}

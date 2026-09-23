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
import { MAX_FILE_SIZE_BYTES, hasAllowedExtension, titleFromFilename } from "@/lib/noteUploadLimits";
import { requireConsoleAuth } from "../../_auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const authError = await requireConsoleAuth();
    if (authError) return authError;

    const user = await getCurrentUser();
    const db = getDb();

    const formData = await req.formData();
    const file = formData.get("file");
    const rawParentId = formData.get("parentId");
    const parentId = typeof rawParentId === "string" && rawParentId ? rawParentId : null;

    if (!file || !(file instanceof File) || !hasAllowedExtension(file.name)) {
        return NextResponse.json({ error: "invalid_file" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: "file_too_large" }, { status: 413 });
    }

    const title = titleFromFilename(file.name).trim();
    if (!title) {
        return NextResponse.json({ error: "invalid_file" }, { status: 400 });
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
    const body = await file.text();

    await db.insert(notes).values({
        id,
        userId: user.id,
        channelId: null,
        parentId,
        title,
        body,
        mimeType: "text/markdown",
        approvalStatus: "draft",
        createdAt: now,
        updatedAt: now,
    });

    return NextResponse.json({ id, title, parentId }, { status: 201 });
}

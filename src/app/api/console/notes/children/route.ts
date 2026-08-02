import { NextRequest, NextResponse } from "next/server";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { notes } from "@/db/schema";
import { resolveOwnedDirectory, DirectoryNotFoundError } from "@/lib/notesTree";
import { requireConsoleAuth } from "../../_auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const authError = await requireConsoleAuth();
    if (authError) return authError;

    const user = await getCurrentUser();
    const db = getDb();

    const parentId = req.nextUrl.searchParams.get("parentId");

    try {
        await resolveOwnedDirectory(db, user.id, parentId);
    } catch (err) {
        if (err instanceof DirectoryNotFoundError) {
            return NextResponse.json({ error: "parent_not_found" }, { status: 404 });
        }
        throw err;
    }

    const children = await db
        .select()
        .from(notes)
        .where(
            and(
                eq(notes.userId, user.id),
                parentId === null ? isNull(notes.parentId) : eq(notes.parentId, parentId),
            ),
        )
        .orderBy(desc(notes.updatedAt));

    const directoryIds = children.filter((n) => n.mimeType === "directory").map((n) => n.id);

    const childCounts = directoryIds.length
        ? await db
            .select({ parentId: notes.parentId, cnt: count() })
            .from(notes)
            .where(and(eq(notes.userId, user.id), inArray(notes.parentId, directoryIds)))
            .groupBy(notes.parentId)
        : [];

    const countByParentId = new Map(childCounts.map((row) => [row.parentId, row.cnt]));

    return NextResponse.json(
        children.map((note) => ({
            id: note.id,
            title: note.title,
            mimeType: note.mimeType,
            hasChildren: (countByParentId.get(note.id) ?? 0) > 0,
            updatedAt: note.updatedAt,
        })),
    );
}

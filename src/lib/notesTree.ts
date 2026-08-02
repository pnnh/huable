import { and, eq, isNull } from "drizzle-orm";
import type { getDb } from "@/db/index";
import { notes } from "@/db/schema";

type Db = ReturnType<typeof getDb>;

export class NameConflictError extends Error {
  constructor() {
    super("A directory or note with this name already exists in this location");
    this.name = "NameConflictError";
  }
}

export class DirectoryNotFoundError extends Error {
  constructor() {
    super("Directory not found or not owned by the current user");
    this.name = "DirectoryNotFoundError";
  }
}

// Throws NameConflictError if a note or directory with the same title already
// exists under the same parent (parentId === null means the root level).
export async function assertUniqueNameInParent(
  db: Db,
  userId: string,
  parentId: string | null,
  title: string,
  excludeId?: string,
): Promise<void> {
  const rows = await db
    .select({ id: notes.id })
    .from(notes)
    .where(
      and(
        eq(notes.userId, userId),
        eq(notes.title, title),
        parentId === null ? isNull(notes.parentId) : eq(notes.parentId, parentId),
      ),
    );

  if (rows.some((row) => row.id !== excludeId)) {
    throw new NameConflictError();
  }
}

// Verifies that parentId (when provided) refers to a directory owned by userId.
// Returns the directory record, or null when parentId is null (root level).
export async function resolveOwnedDirectory(db: Db, userId: string, parentId: string | null) {
  if (parentId === null) return null;

  const [directory] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, parentId), eq(notes.userId, userId), eq(notes.mimeType, "directory")))
    .limit(1);

  if (!directory) {
    throw new DirectoryNotFoundError();
  }

  return directory;
}

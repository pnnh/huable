// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import path from "node:path";
import * as schema from "@/db/schema";
import { createId } from "@/db/schema";

let testDb: ReturnType<typeof drizzle>;

vi.mock("@/db/index", () => ({
    getDb: () => testDb,
}));

let currentUserId = "";

vi.mock("@/lib/auth", () => ({
    isAuthenticated: vi.fn(async () => true),
    getCurrentUser: vi.fn(async () => ({
        id: currentUserId,
        name: "Test User",
        email: "test@example.com",
        nickname: null,
        bio: null,
        sysrole: "normal" as const,
    })),
}));

// Import the route handler after the module mocks above are registered.
const { POST } = await import("./route");

function makeRequest(file: File, parentId?: string): NextRequest {
    const formData = new FormData();
    formData.set("file", file);
    if (parentId) formData.set("parentId", parentId);
    return new NextRequest("http://localhost/api/console/notes/upload", {
        method: "POST",
        body: formData,
    });
}

let ownerId: string;

beforeEach(() => {
    const sqlite = new Database(":memory:");
    testDb = drizzle(sqlite, { schema });
    migrate(testDb, { migrationsFolder: path.resolve(__dirname, "../../../../../../migrations") });

    ownerId = createId();
    currentUserId = ownerId;

    testDb.insert(schema.users).values([
        { id: ownerId, name: "Owner", email: `${ownerId}@example.com`, createdAt: Date.now() },
    ]).run();
});

describe("POST /api/console/notes/upload", () => {
    it("creates a note in draft status with no channel and no approval event", async () => {
        const file = new File(["# Hello"], "hello.md", { type: "text/markdown" });
        const res = await POST(makeRequest(file));
        const body = await res.json();
        expect(res.status, JSON.stringify(body)).toBe(201);

        const [note] = await testDb.select().from(schema.notes).where(eq(schema.notes.id, body.id));
        expect(note.channelId).toBeNull();
        expect(note.approvalStatus).toBe("draft");

        const events = await testDb.select().from(schema.approvalEvents).where(eq(schema.approvalEvents.noteId, body.id));
        expect(events).toHaveLength(0);
    });
});

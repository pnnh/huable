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
let currentSysrole: "admin" | "normal" = "normal";

vi.mock("@/lib/auth", () => ({
    isAuthenticated: vi.fn(async () => true),
    getCurrentUser: vi.fn(async () => ({
        id: currentUserId,
        name: "Test User",
        email: "test@example.com",
        nickname: null,
        bio: null,
        sysrole: currentSysrole,
    })),
}));

// Import the route handler after the module mocks above are registered.
const { POST } = await import("./route");

function makeRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost/api/console/notes/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

let ownerId: string;
let otherUserId: string;
let channelId: string;
let noteAId: string;
let noteBId: string;
let directoryId: string;
let otherUserNoteId: string;

beforeEach(() => {
    const sqlite = new Database(":memory:");
    testDb = drizzle(sqlite, { schema });
    migrate(testDb, { migrationsFolder: path.resolve(__dirname, "../../../../../../migrations") });

    ownerId = createId();
    otherUserId = createId();
    channelId = createId();
    noteAId = createId();
    noteBId = createId();
    directoryId = createId();
    otherUserNoteId = createId();
    currentUserId = ownerId;
    currentSysrole = "normal";

    const now = Date.now();

    testDb.insert(schema.users).values([
        { id: ownerId, name: "Owner", email: `${ownerId}@example.com`, createdAt: now },
        { id: otherUserId, name: "Other", email: `${otherUserId}@example.com`, createdAt: now },
    ]).run();

    testDb.insert(schema.channels).values({
        id: channelId,
        userId: ownerId,
        name: "General",
        createdAt: now,
    }).run();

    testDb.insert(schema.notes).values([
        {
            id: directoryId,
            userId: ownerId,
            channelId: null,
            parentId: null,
            title: "Folder",
            body: "",
            mimeType: "directory",
            approvalStatus: "draft",
            createdAt: now,
            updatedAt: now,
        },
        {
            id: noteAId,
            userId: ownerId,
            channelId: null,
            parentId: null,
            title: "Note A",
            body: "a",
            mimeType: "text/markdown",
            approvalStatus: "draft",
            createdAt: now,
            updatedAt: now,
        },
        {
            id: noteBId,
            userId: ownerId,
            channelId: null,
            parentId: null,
            title: "Note B",
            body: "b",
            mimeType: "text/markdown",
            approvalStatus: "draft",
            createdAt: now,
            updatedAt: now,
        },
        {
            id: otherUserNoteId,
            userId: otherUserId,
            channelId: null,
            parentId: null,
            title: "Not Mine",
            body: "x",
            mimeType: "text/markdown",
            approvalStatus: "draft",
            createdAt: now,
            updatedAt: now,
        },
    ]).run();
});

describe("POST /api/console/notes/batch", () => {
    it("rejects an empty noteIds list", async () => {
        const res = await POST(makeRequest({ noteIds: [] }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe("note_ids_required");
    });

    it("rejects a request without a channelId", async () => {
        const res = await POST(makeRequest({ noteIds: [noteAId] }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe("channel_id_required");
    });

    it("rejects a channelId that does not belong to the current user", async () => {
        const res = await POST(makeRequest({ noteIds: [noteAId], channelId: "not-a-real-channel" }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe("channel_not_found");
    });

    it("publishes owned notes and skips a directory id and a note owned by someone else", async () => {
        const res = await POST(
            makeRequest({ noteIds: [noteAId, noteBId, directoryId, otherUserNoteId], channelId }),
        );
        expect(res.status).toBe(200);
        const body = await res.json();

        expect(body.updated.sort()).toEqual([noteAId, noteBId].sort());
        expect(body.skipped).toEqual(
            expect.arrayContaining([
                { id: directoryId, reason: "is_directory" },
                { id: otherUserNoteId, reason: "not_owned" },
            ]),
        );

        const [updatedNoteA] = await testDb.select().from(schema.notes).where(eq(schema.notes.id, noteAId));
        expect(updatedNoteA.channelId).toBe(channelId);
    });

    it("reports a missing note id as not_found", async () => {
        const res = await POST(makeRequest({ noteIds: ["does-not-exist"], channelId }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.updated).toEqual([]);
        expect(body.skipped).toEqual([{ id: "does-not-exist", reason: "not_found" }]);
    });

    it("sets approvalStatus to pending and creates an approval event for a non-admin publish", async () => {
        const res = await POST(makeRequest({ noteIds: [noteAId], channelId }));
        expect(res.status).toBe(200);

        const [note] = await testDb.select().from(schema.notes).where(eq(schema.notes.id, noteAId));
        expect(note.channelId).toBe(channelId);
        expect(note.approvalStatus).toBe("pending");

        const events = await testDb
            .select()
            .from(schema.approvalEvents)
            .where(eq(schema.approvalEvents.noteId, noteAId));
        expect(events).toHaveLength(1);
        expect(events[0].action).toBe("created");
        expect(events[0].isHandled).toBe(false);
    });

    it("sets approvalStatus to approved and creates no approval event for an admin publish", async () => {
        currentSysrole = "admin";
        const res = await POST(makeRequest({ noteIds: [noteAId], channelId }));
        expect(res.status).toBe(200);

        const [note] = await testDb.select().from(schema.notes).where(eq(schema.notes.id, noteAId));
        expect(note.approvalStatus).toBe("approved");

        const events = await testDb
            .select()
            .from(schema.approvalEvents)
            .where(eq(schema.approvalEvents.noteId, noteAId));
        expect(events).toHaveLength(0);
    });

    it("voids a still-pending event and records a new one when the same note is republished", async () => {
        await POST(makeRequest({ noteIds: [noteAId], channelId }));
        const res = await POST(makeRequest({ noteIds: [noteAId], channelId }));
        expect(res.status).toBe(200);

        const events = await testDb
            .select()
            .from(schema.approvalEvents)
            .where(eq(schema.approvalEvents.noteId, noteAId));
        expect(events).toHaveLength(2);
        expect(events.filter((e) => e.isHandled)).toHaveLength(1);
        expect(events.find((e) => e.isHandled)?.result).toBeNull();

        const pending = events.find((e) => !e.isHandled);
        expect(pending?.action).toBe("updated");
    });

    it("does not affect notes that were not selected", async () => {
        await POST(makeRequest({ noteIds: [noteAId], channelId }));

        const [untouched] = await testDb.select().from(schema.notes).where(eq(schema.notes.id, noteBId));
        expect(untouched.channelId).toBeNull();
        expect(untouched.approvalStatus).toBe("draft");
    });
});

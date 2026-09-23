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

function makeRequest(noteId: string, body: unknown): NextRequest {
    return new NextRequest(`http://localhost/api/console/notes/${noteId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

function callPublish(noteId: string, body: unknown) {
    return POST(makeRequest(noteId, body), { params: Promise.resolve({ noteId }) });
}

let ownerId: string;
let otherUserId: string;
let channelId: string;
let otherChannelId: string;
let noteId: string;

beforeEach(() => {
    const sqlite = new Database(":memory:");
    testDb = drizzle(sqlite, { schema });
    migrate(testDb, { migrationsFolder: path.resolve(__dirname, "../../../../../../../migrations") });

    ownerId = createId();
    otherUserId = createId();
    channelId = createId();
    otherChannelId = createId();
    noteId = createId();
    currentUserId = ownerId;
    currentSysrole = "normal";

    const now = Date.now();

    testDb.insert(schema.users).values([
        { id: ownerId, name: "Owner", email: `${ownerId}@example.com`, createdAt: now },
        { id: otherUserId, name: "Other", email: `${otherUserId}@example.com`, createdAt: now },
    ]).run();

    testDb.insert(schema.channels).values([
        { id: channelId, userId: ownerId, name: "General", approvalStatus: "draft", createdAt: now },
        { id: otherChannelId, userId: otherUserId, name: "Not Mine", approvalStatus: "draft", createdAt: now },
    ]).run();

    testDb.insert(schema.notes).values({
        id: noteId,
        userId: ownerId,
        channelId: null,
        parentId: null,
        title: "Note",
        body: "a",
        mimeType: "text/markdown",
        approvalStatus: "draft",
        createdAt: now,
        updatedAt: now,
    }).run();
});

describe("POST /api/console/notes/[noteId]/publish", () => {
    it("rejects a request without a channelId", async () => {
        const res = await callPublish(noteId, {});
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe("channel_id_required");
    });

    it("rejects a channelId that does not belong to the current user", async () => {
        const res = await callPublish(noteId, { channelId: otherChannelId });
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe("channel_not_found");
    });

    it("404s for a note that does not belong to the current user", async () => {
        currentUserId = otherUserId;
        const res = await callPublish(noteId, { channelId });
        expect(res.status).toBe(404);
    });

    it("sets approvalStatus to pending and creates a 'created' approval event for a non-admin's first publish", async () => {
        const res = await callPublish(noteId, { channelId });
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ id: noteId, channelId, approvalStatus: "pending" });

        const [note] = await testDb.select().from(schema.notes).where(eq(schema.notes.id, noteId));
        expect(note.channelId).toBe(channelId);
        expect(note.approvalStatus).toBe("pending");

        const events = await testDb.select().from(schema.approvalEvents).where(eq(schema.approvalEvents.noteId, noteId));
        expect(events).toHaveLength(1);
        expect(events[0].action).toBe("created");
        expect(events[0].isHandled).toBe(false);
    });

    it("sets approvalStatus to approved and creates no approval event for an admin publish", async () => {
        currentSysrole = "admin";
        const res = await callPublish(noteId, { channelId });
        expect(res.status).toBe(200);

        const [note] = await testDb.select().from(schema.notes).where(eq(schema.notes.id, noteId));
        expect(note.approvalStatus).toBe("approved");

        const events = await testDb.select().from(schema.approvalEvents).where(eq(schema.approvalEvents.noteId, noteId));
        expect(events).toHaveLength(0);
    });

    it("voids a still-pending event and records an 'updated' one when republished", async () => {
        await callPublish(noteId, { channelId });
        await callPublish(noteId, { channelId });

        const events = await testDb.select().from(schema.approvalEvents).where(eq(schema.approvalEvents.noteId, noteId));
        expect(events).toHaveLength(2);
        expect(events.filter((e) => e.isHandled)).toHaveLength(1);
        expect(events.find((e) => e.isHandled)?.result).toBeNull();
        expect(events.find((e) => !e.isHandled)?.action).toBe("updated");
    });
});

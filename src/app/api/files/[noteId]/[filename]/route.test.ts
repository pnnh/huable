import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import * as schema from "@/db/schema";
import { createId } from "@/db/schema";

let testDb: ReturnType<typeof drizzle>;

vi.mock("@/db/index", () => ({
    getDb: () => testDb,
}));

const storageData = new Map<string, Uint8Array>();

vi.mock("@/lib/storage", () => ({
    getStorage: () => ({
        read: async (noteId: string, filename: string) => storageData.get(`${noteId}/${filename}`) ?? null,
        delete: async () => undefined,
    }),
}));

let currentUserId: string | null = null;
let currentSysrole: "admin" | "normal" = "normal";

vi.mock("@/lib/auth", () => ({
    isAuthenticated: vi.fn(async () => currentUserId !== null),
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
const { GET } = await import("./route");

function makeRequest(): NextRequest {
    return new NextRequest("http://localhost/api/files/note/file.txt");
}

let ownerId: string;
let otherId: string;
let adminId: string;
let approvedChannelId: string;
let draftChannelId: string;
let approvedNoteId: string;
let draftNoteId: string;
let pendingNoteId: string;

beforeEach(() => {
    const sqlite = new Database(":memory:");
    testDb = drizzle(sqlite, { schema });
    migrate(testDb, { migrationsFolder: path.resolve(__dirname, "../../../../../../migrations") });

    storageData.clear();
    currentUserId = null;
    currentSysrole = "normal";

    ownerId = createId();
    otherId = createId();
    adminId = createId();
    approvedChannelId = createId();
    draftChannelId = createId();
    approvedNoteId = createId();
    draftNoteId = createId();
    pendingNoteId = createId();

    const now = Date.now();

    testDb.insert(schema.users).values([
        { id: ownerId, name: "Owner", email: `${ownerId}@example.com`, createdAt: now },
        { id: otherId, name: "Other", email: `${otherId}@example.com`, createdAt: now },
        { id: adminId, name: "Admin", email: `${adminId}@example.com`, sysrole: "admin", createdAt: now },
    ]).run();

    testDb.insert(schema.channels).values([
        { id: approvedChannelId, userId: ownerId, name: "Approved Channel", approvalStatus: "approved", createdAt: now },
        { id: draftChannelId, userId: ownerId, name: "Draft Channel", approvalStatus: "draft", createdAt: now },
    ]).run();

    testDb.insert(schema.notes).values([
        {
            id: approvedNoteId, userId: ownerId, channelId: approvedChannelId, parentId: null,
            title: "Approved Note", body: "b", mimeType: "text/markdown", approvalStatus: "approved",
            createdAt: now, updatedAt: now,
        },
        {
            id: draftNoteId, userId: ownerId, channelId: null, parentId: null,
            title: "Draft Note", body: "b", mimeType: "text/markdown", approvalStatus: "draft",
            createdAt: now, updatedAt: now,
        },
        {
            id: pendingNoteId, userId: ownerId, channelId: draftChannelId, parentId: null,
            title: "Pending Note", body: "b", mimeType: "text/markdown", approvalStatus: "pending",
            createdAt: now, updatedAt: now,
        },
    ]).run();

    storageData.set(`${approvedNoteId}/file.txt`, new TextEncoder().encode("approved content"));
    storageData.set(`${draftNoteId}/file.txt`, new TextEncoder().encode("draft content"));
    storageData.set(`${pendingNoteId}/file.txt`, new TextEncoder().encode("pending content"));
});

describe("GET /api/files/[noteId]/[filename]", () => {
    it("serves the file to an anonymous visitor when the note and its channel are both approved", async () => {
        const res = await GET(makeRequest(), { params: Promise.resolve({ noteId: approvedNoteId, filename: "file.txt" }) });
        expect(res.status).toBe(200);
    });

    it("404s for an anonymous visitor when the note is a draft", async () => {
        const res = await GET(makeRequest(), { params: Promise.resolve({ noteId: draftNoteId, filename: "file.txt" }) });
        expect(res.status).toBe(404);
    });

    it("404s for an anonymous visitor when the note is pending (channel not yet approved)", async () => {
        const res = await GET(makeRequest(), { params: Promise.resolve({ noteId: pendingNoteId, filename: "file.txt" }) });
        expect(res.status).toBe(404);
    });

    it("lets the owner fetch their own draft note's attachment", async () => {
        currentUserId = ownerId;
        const res = await GET(makeRequest(), { params: Promise.resolve({ noteId: draftNoteId, filename: "file.txt" }) });
        expect(res.status).toBe(200);
    });

    it("404s for a different logged-in user requesting someone else's draft note", async () => {
        currentUserId = otherId;
        const res = await GET(makeRequest(), { params: Promise.resolve({ noteId: draftNoteId, filename: "file.txt" }) });
        expect(res.status).toBe(404);
    });

    it("lets an admin fetch any note's attachment regardless of status", async () => {
        currentUserId = adminId;
        currentSysrole = "admin";
        const res = await GET(makeRequest(), { params: Promise.resolve({ noteId: pendingNoteId, filename: "file.txt" }) });
        expect(res.status).toBe(200);
    });

    it("404s when the note does not exist", async () => {
        const res = await GET(makeRequest(), { params: Promise.resolve({ noteId: "does-not-exist", filename: "file.txt" }) });
        expect(res.status).toBe(404);
    });
});

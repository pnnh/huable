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

function callPublish(channelId: string) {
    const req = new NextRequest(`http://localhost/api/console/channels/${channelId}/publish`, { method: "POST" });
    return POST(req, { params: Promise.resolve({ channelId }) });
}

let ownerId: string;
let otherUserId: string;
let channelId: string;

beforeEach(() => {
    const sqlite = new Database(":memory:");
    testDb = drizzle(sqlite, { schema });
    migrate(testDb, { migrationsFolder: path.resolve(__dirname, "../../../../../../../migrations") });

    ownerId = createId();
    otherUserId = createId();
    channelId = createId();
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
        approvalStatus: "draft",
        createdAt: now,
    }).run();
});

describe("POST /api/console/channels/[channelId]/publish", () => {
    it("404s for a channel that does not belong to the current user", async () => {
        currentUserId = otherUserId;
        const res = await callPublish(channelId);
        expect(res.status).toBe(404);
    });

    it("sets approvalStatus to pending and creates a 'created' approval event for a non-admin's first publish", async () => {
        const res = await callPublish(channelId);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ id: channelId, approvalStatus: "pending" });

        const [channel] = await testDb.select().from(schema.channels).where(eq(schema.channels.id, channelId));
        expect(channel.approvalStatus).toBe("pending");

        const events = await testDb.select().from(schema.approvalEvents).where(eq(schema.approvalEvents.channelId, channelId));
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe("channel");
        expect(events[0].action).toBe("created");
        expect(events[0].isHandled).toBe(false);
    });

    it("sets approvalStatus to approved and creates no approval event for an admin publish", async () => {
        currentSysrole = "admin";
        const res = await callPublish(channelId);
        expect(res.status).toBe(200);

        const [channel] = await testDb.select().from(schema.channels).where(eq(schema.channels.id, channelId));
        expect(channel.approvalStatus).toBe("approved");

        const events = await testDb.select().from(schema.approvalEvents).where(eq(schema.approvalEvents.channelId, channelId));
        expect(events).toHaveLength(0);
    });

    it("voids a still-pending event and records an 'updated' one when republished", async () => {
        await callPublish(channelId);
        await callPublish(channelId);

        const events = await testDb.select().from(schema.approvalEvents).where(eq(schema.approvalEvents.channelId, channelId));
        expect(events).toHaveLength(2);
        expect(events.filter((e) => e.isHandled)).toHaveLength(1);
        expect(events.find((e) => e.isHandled)?.result).toBeNull();
        expect(events.find((e) => !e.isHandled)?.action).toBe("updated");
    });
});

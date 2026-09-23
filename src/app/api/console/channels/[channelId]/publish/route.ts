import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { channels, approvalEvents } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireConsoleAuth } from "../../../_auth";

export const runtime = "nodejs";

type Props = { params: Promise<{ channelId: string }> };

export async function POST(_req: NextRequest, { params }: Props) {
    const authError = await requireConsoleAuth();
    if (authError) return authError;

    const { channelId } = await params;
    if (!channelId || !/^[a-zA-Z0-9_-]+$/.test(channelId)) {
        return NextResponse.json({ error: "invalid_channel_id" }, { status: 400 });
    }

    const user = await getCurrentUser();
    const db = getDb();

    const [channel] = await db
        .select()
        .from(channels)
        .where(and(eq(channels.id, channelId), eq(channels.userId, user.id)))
        .limit(1);

    if (!channel) {
        return NextResponse.json({ error: "channel_not_found" }, { status: 404 });
    }

    const now = Date.now();
    const isAdmin = user.sysrole === "admin";
    const approvalStatus = isAdmin ? "approved" : "pending";

    await db
        .update(channels)
        .set({ approvalStatus })
        .where(and(eq(channels.id, channelId), eq(channels.userId, user.id)));

    // Void any still-pending event this publish supersedes before recording the new one.
    await db
        .update(approvalEvents)
        .set({ isHandled: true, handledBy: null, result: null, handledAt: now })
        .where(and(eq(approvalEvents.channelId, channelId), eq(approvalEvents.isHandled, false)));

    if (!isAdmin) {
        const [priorEvent] = await db
            .select({ id: approvalEvents.id })
            .from(approvalEvents)
            .where(eq(approvalEvents.channelId, channelId))
            .limit(1);

        await db.insert(approvalEvents).values({
            type: "channel",
            channelId,
            action: priorEvent ? "updated" : "created",
            createdAt: now,
        });
    }

    return NextResponse.json({ id: channelId, approvalStatus });
}

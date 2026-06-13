import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { channels, notes } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";
import { requireConsoleAuth } from "../../_auth";

export const runtime = "nodejs";

type Props = { params: Promise<{ channelId: string }> };

export async function DELETE(_req: NextRequest, { params }: Props) {
    const authError = await requireConsoleAuth();
    if (authError) return authError;

    const { channelId } = await params;

    if (!channelId || !/^[a-zA-Z0-9_-]+$/.test(channelId)) {
        return NextResponse.json({ error: "Invalid channel ID" }, { status: 400 });
    }

    const user = await getCurrentUser();
    const db = getDb();

    // Verify ownership
    const [channel] = await db
        .select()
        .from(channels)
        .where(and(eq(channels.id, channelId), eq(channels.userId, user.id)))
        .limit(1);

    if (!channel) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Refuse if any published notes are still assigned to this channel
    const [{ cnt }] = await db
        .select({ cnt: count() })
        .from(notes)
        .where(and(eq(notes.channelId, channelId), eq(notes.isPublished, true)));

    if (cnt > 0) {
        return NextResponse.json({ error: "Channel has published notes" }, { status: 409 });
    }

    await db.delete(channels).where(and(eq(channels.id, channelId), eq(channels.userId, user.id)));

    return new NextResponse(null, { status: 204 });
}

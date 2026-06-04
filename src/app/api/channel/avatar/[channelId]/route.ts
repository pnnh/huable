import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { channels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAvatarStorage } from "@/lib/storage";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

type Props = { params: Promise<{ channelId: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
    const { channelId } = await params;

    if (!channelId || !/^[a-zA-Z0-9_-]+$/.test(channelId)) {
        return new NextResponse(null, { status: 400 });
    }

    const safe = channelId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const avatarStorage = getAvatarStorage();
    const result = await avatarStorage.read(`avatars/channel/${safe}`);

    if (!result) {
        return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(Buffer.from(result.data), {
        headers: {
            "Content-Type": result.mimeType,
            "Cache-Control": "public, max-age=60",
        },
    });
}

export async function POST(req: NextRequest, { params }: Props) {
    const { channelId } = await params;

    if (!channelId || !/^[a-zA-Z0-9_-]+$/.test(channelId)) {
        return NextResponse.json({ error: "Invalid channel ID" }, { status: 400 });
    }

    const user = await getCurrentUser();
    const db = getDb();
    const rows = await db.select().from(channels).where(eq(channels.id, channelId)).limit(1);
    if (!rows.length || rows[0].userId !== user.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!ALLOWED_MIME.has(file.type)) {
        return NextResponse.json({ error: "Unsupported image type" }, { status: 415 });
    }

    const data = new Uint8Array(await file.arrayBuffer());
    if (data.length > MAX_SIZE) {
        return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const safe = channelId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const avatarStorage = getAvatarStorage();
    await avatarStorage.save(`avatars/channel/${safe}`, data, file.type);

    return NextResponse.json({ ok: true, url: `/api/channel/avatar/${channelId}` });
}

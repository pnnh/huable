import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { channels } from "@/db/schema";
import { eq } from "drizzle-orm";
import path from "node:path";
import fs from "node:fs/promises";

export const runtime = "nodejs";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const AVATAR_ROOT = process.env.CHANNEL_AVATAR_STORAGE_PATH || "./.data/channel-avatars";
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

function avatarPath(channelId: string): string {
    const safe = channelId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return path.join(AVATAR_ROOT, safe);
}

type Props = { params: Promise<{ channelId: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
    const { channelId } = await params;

    if (!channelId || !/^[a-zA-Z0-9_-]+$/.test(channelId)) {
        return new NextResponse(null, { status: 400 });
    }

    const filePath = avatarPath(channelId);
    const mimePath = filePath + ".mime";

    try {
        const [data, mimeRaw] = await Promise.all([
            fs.readFile(filePath),
            fs.readFile(mimePath, "utf8").catch(() => "image/jpeg"),
        ]);

        const mime = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeRaw.trim())
            ? mimeRaw.trim()
            : "image/jpeg";

        return new NextResponse(data, {
            headers: {
                "Content-Type": mime,
                "Cache-Control": "public, max-age=60",
            },
        });
    } catch {
        return new NextResponse(null, { status: 404 });
    }
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

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_SIZE) {
        return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const dir = path.dirname(avatarPath(channelId));
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(avatarPath(channelId), buffer);
    await fs.writeFile(avatarPath(channelId) + ".mime", file.type, "utf8");

    return NextResponse.json({ ok: true, url: `/api/channel/avatar/${channelId}` });
}

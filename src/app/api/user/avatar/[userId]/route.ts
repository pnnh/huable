import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";

export const runtime = "nodejs";

const AVATAR_ROOT = process.env.AVATAR_STORAGE_PATH || "./.data/avatars";

function avatarPath(userId: string): string {
    const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return path.join(AVATAR_ROOT, safe);
}

type Props = { params: Promise<{ userId: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
    const { userId } = await params;

    // Validate: only alphanumeric, dash, underscore (safe path segment)
    if (!userId || !/^[a-zA-Z0-9_-]+$/.test(userId)) {
        return new NextResponse(null, { status: 400 });
    }

    const filePath = avatarPath(userId);
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

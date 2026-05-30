import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import path from "node:path";
import fs from "node:fs/promises";

export const runtime = "nodejs";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const AVATAR_ROOT = process.env.AVATAR_STORAGE_PATH || "./.data/avatars";
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

function avatarPath(userId: string): string {
    // Safe: userId comes from authenticated session, not user input
    const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return path.join(AVATAR_ROOT, safe);
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
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

    const dir = path.dirname(avatarPath(user.id));
    await fs.mkdir(dir, { recursive: true });
    // Store avatar as a flat file with mime type recorded in a sidecar
    await fs.writeFile(avatarPath(user.id), buffer);
    await fs.writeFile(avatarPath(user.id) + ".mime", file.type, "utf8");

    return NextResponse.json({ ok: true, url: `/api/user/avatar/${user.id}` });
}

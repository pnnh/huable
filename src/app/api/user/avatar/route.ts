import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAvatarStorage } from "@/lib/storage";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

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

    const data = new Uint8Array(await file.arrayBuffer());
    if (data.length > MAX_SIZE) {
        return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const avatarStorage = getAvatarStorage();
    const safe = user.id.replace(/[^a-zA-Z0-9_-]/g, "_");
    await avatarStorage.save(`avatars/user/${safe}`, data, file.type);

    return NextResponse.json({ ok: true, url: `/api/user/avatar/${user.id}` });
}

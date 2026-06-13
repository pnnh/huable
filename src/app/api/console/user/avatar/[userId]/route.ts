import { NextRequest, NextResponse } from "next/server";
import { getAvatarStorage } from "@/lib/storage";
import { requireConsoleAuth } from "../../../_auth";

type Props = { params: Promise<{ userId: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
    const authError = await requireConsoleAuth();
    if (authError) return authError;

    const { userId } = await params;

    // Validate: only alphanumeric, dash, underscore (safe path segment)
    if (!userId || !/^[a-zA-Z0-9_-]+$/.test(userId)) {
        return new NextResponse(null, { status: 400 });
    }

    const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const avatarStorage = getAvatarStorage();
    const result = await avatarStorage.read(`avatars/user/${safe}`);

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

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { users } from "@/db/schema";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
    const user = await getCurrentUser();
    const body = await req.json();

    const nickname = typeof body.nickname === "string" ? body.nickname.trim().slice(0, 50) : undefined;
    const bio = typeof body.bio === "string" ? body.bio.trim().slice(0, 300) : undefined;

    const update: Record<string, string | null> = {};
    if (nickname !== undefined) update.nickname = nickname || null;
    if (bio !== undefined) update.bio = bio || null;

    if (Object.keys(update).length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const db = getDb();
    await db.update(users).set(update).where(eq(users.id, user.id));

    return NextResponse.json({ ok: true });
}

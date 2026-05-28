import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const file = formData.get("file");
    const noteId = formData.get("noteId");

    if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (!noteId || typeof noteId !== "string") {
        return NextResponse.json({ error: "Missing noteId" }, { status: 400 });
    }

    const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = getStorage();

    await storage.save(noteId, filename, buffer);

    return NextResponse.json({ filename, noteId });
}

import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

type Params = { noteId: string; filename: string };

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const { noteId, filename } = await params;
    const storage = getStorage();
    const data = await storage.read(noteId, filename);

    if (!data) {
        return new NextResponse("Not found", { status: 404 });
    }

    // Determine content type from extension
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    const contentTypeMap: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        pdf: "application/pdf",
        txt: "text/plain",
    };
    const contentType = contentTypeMap[ext] ?? "application/octet-stream";

    return new NextResponse(new Uint8Array(data), {
        headers: { "Content-Type": contentType },
    });
}

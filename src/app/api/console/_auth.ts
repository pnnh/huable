import { isAuthenticated } from "@/lib/auth";
import { NextResponse } from "next/server";

/** Returns a 401 response if the request is not authenticated, otherwise null. */
export async function requireConsoleAuth(): Promise<NextResponse | null> {
    const authed = await isAuthenticated();
    if (!authed) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null;
}

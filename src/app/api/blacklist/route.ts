import { NextResponse } from "next/server";
import { getBlacklist, addToBlacklist, removeFromBlacklist } from "@/lib/db";

export async function GET() {
    try {
        const blacklist = await getBlacklist();
        return NextResponse.json(blacklist);
    } catch (error) {
        console.error("Failed to get blacklist:", error);
        return NextResponse.json(
            { error: "Failed to get blacklist" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { link, reason, errorCode, accountPhone, firstFailedAt, failCount } = body;

        if (!link || !reason) {
            return NextResponse.json(
                { error: "Link and reason are required" },
                { status: 400 }
            );
        }

        const entry = await addToBlacklist({
            link,
            reason,
            errorCode,
            accountPhone,
            firstFailedAt: firstFailedAt || new Date().toISOString(),
            failCount: failCount || 1,
        });

        return NextResponse.json(entry);
    } catch (error) {
        console.error("Failed to add to blacklist:", error);
        return NextResponse.json(
            { error: "Failed to add to blacklist" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        await removeFromBlacklist(parseInt(id));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to remove from blacklist:", error);
        return NextResponse.json(
            { error: "Failed to remove from blacklist" },
            { status: 500 }
        );
    }
}

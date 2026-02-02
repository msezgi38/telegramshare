import { NextRequest, NextResponse } from "next/server";
import { getBlacklist, addToBlacklist, removeFromBlacklist } from "@/lib/db";

// GET /api/accounts/[id]/blacklist - Get blacklist for an account
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const accountId = parseInt(params.id);
        const blacklist = await getBlacklist();
        const accountBlacklist = blacklist.filter(item => item.accountPhone === params.id);

        return NextResponse.json(accountBlacklist);
    } catch (error: any) {
        console.error("Error fetching blacklist:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch blacklist" },
            { status: 500 }
        );
    }
}

// POST /api/accounts/[id]/blacklist - Add to blacklist
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const data = await request.json();
        const { link, reason, errorCode, groupName, failCount = 1 } = data;

        if (!link) {
            return NextResponse.json(
                { error: "Group link is required" },
                { status: 400 }
            );
        }

        const newItem = await addToBlacklist({
            link,
            reason: reason || "Manually added",
            errorCode,
            accountPhone: params.id,
            firstFailedAt: new Date().toISOString(),
            failCount,
        });

        return NextResponse.json(newItem);
    } catch (error: any) {
        console.error("Error adding to blacklist:", error);
        return NextResponse.json(
            { error: error.message || "Failed to add to blacklist" },
            { status: 500 }
        );
    }
}

// DELETE /api/accounts/[id]/blacklist - Remove from blacklist
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const itemId = searchParams.get("itemId");

        if (!itemId) {
            return NextResponse.json(
                { error: "Item ID is required" },
                { status: 400 }
            );
        }

        await removeFromBlacklist(parseInt(itemId));
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error removing from blacklist:", error);
        return NextResponse.json(
            { error: error.message || "Failed to remove from blacklist" },
            { status: 500 }
        );
    }
}

import { NextResponse } from "next/server";
import { getAccountGroups, addAccountGroup, getAccountById } from "@/lib/db";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const accountId = parseInt(id);
        if (isNaN(accountId)) {
            return NextResponse.json({ error: "Invalid account ID" }, { status: 400 });
        }

        // Get account to fetch phone
        const account = await getAccountById(accountId);
        if (!account) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }

        try {
            // Fetch real groups from Python service
            const serviceUrl = process.env.TELEGRAM_SERVICE_URL || 'http://localhost:8000';
            const response = await fetch(`${serviceUrl}/telegram/get-joined-groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: account.phone,
                    api_id: parseInt(account.apiId),
                    api_hash: account.apiHash
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const groups = data.groups || [];

                console.log(`[Group Count Debug] Account ${account.phone}: Fetched ${groups.length} groups from Telegram`);

                // Return fresh data from Telegram
                return NextResponse.json(groups.map((g: any, index: number) => ({
                    id: index + 1, // Temporary ID for frontend
                    accountId: accountId,
                    groupLink: g.link || g.invite_link || `https://t.me/${g.username}`,
                    groupName: g.title,
                    groupUsername: g.username,
                    memberCount: g.members_count || g.participants_count || 0,
                    joinedAt: new Date().toISOString(),
                    messageCount: 0,
                    status: "active"
                })));
            } else {
                const errorText = await response.text();
                console.warn(`[Group Count Debug] Failed to fetch groups from service for ${account.phone}: ${response.status} - ${errorText}`);
            }
        } catch (serviceError: any) {
            console.warn(`[Group Count Debug] Python service unavailable for ${account.phone}:`, serviceError.message);
        }

        // Fallback: return cached groups from DB
        const groups = await getAccountGroups(accountId);
        console.log(`[Group Count Debug] Account ${account.phone}: Fallback to DB, found ${groups.length} groups`);
        return NextResponse.json(groups);
    } catch (error) {
        console.error("Failed to get account groups:", error);
        return NextResponse.json(
            { error: "Failed to get account groups" },
            { status: 500 }
        );
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const accountId = parseInt(id);
        if (isNaN(accountId)) {
            return NextResponse.json({ error: "Invalid account ID" }, { status: 400 });
        }

        const body = await request.json();
        const { groups } = body;

        if (!Array.isArray(groups)) {
            return NextResponse.json(
                { error: "Groups must be an array" },
                { status: 400 }
            );
        }

        const added = [];
        for (const group of groups) {
            const newGroup = await addAccountGroup({
                accountId,
                groupLink: group.link || group.groupLink,
                groupName: group.name || group.groupName,
                groupUsername: group.username || group.groupUsername,
                memberCount: group.memberCount || 0,
                joinedAt: group.joinedAt || new Date().toISOString(),
                messageCount: 0,
                status: "active",
            });
            added.push(newGroup);
        }

        return NextResponse.json({ success: true, count: added.length, groups: added });
    } catch (error) {
        console.error("Failed to add account groups:", error);
        return NextResponse.json(
            { error: "Failed to add account groups" },
            { status: 500 }
        );
    }
}

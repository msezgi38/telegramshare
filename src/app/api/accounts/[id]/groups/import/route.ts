import { NextResponse } from "next/server";
import { getAccountById, addAccountGroup, createLog } from "@/lib/db";

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

        const account = await getAccountById(accountId);
        if (!account) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }

        // Call Python service to get joined groups
        const serviceUrl = process.env.TELEGRAM_SERVICE_URL || "http://localhost:8000";
        const response = await fetch(`${serviceUrl}/telegram/get-joined-groups`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                phone: account.phone,
                api_id: parseInt(account.apiId),
                api_hash: account.apiHash,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to fetch groups from Telegram");
        }

        const result = await response.json();
        const groups = result.groups || [];

        // Save each group to account-groups.json
        const imported = [];
        for (const group of groups) {
            try {
                const newGroup = await addAccountGroup({
                    accountId,
                    groupLink: group.link,
                    groupName: group.title || group.name,
                    groupUsername: group.username,
                    memberCount: group.participants_count || group.memberCount || 0,
                    joinedAt: new Date().toISOString(),
                    messageCount: 0,
                    status: "active",
                });
                imported.push(newGroup);
            } catch (err) {
                console.error(`Failed to import group ${group.link}:`, err);
            }
        }

        // Log the import
        await createLog({
            message: `Imported ${imported.length} groups for account ${account.phone}`,
            type: "success",
            operation: "import",
            accountId: accountId,
        });

        return NextResponse.json({
            success: true,
            imported: imported.length,
            total: groups.length,
            groups: imported,
        });
    } catch (error: any) {
        console.error("Failed to import account groups:", error);

        // Log the error
        try {
            const { id } = await params;
            const accountId = parseInt(id);
            await createLog({
                message: `Failed to import groups: ${error.message}`,
                type: "error",
                operation: "import",
                accountId: isNaN(accountId) ? undefined : accountId,
                errorDetails: error.stack,
            });
        } catch { }

        return NextResponse.json(
            { error: error.message || "Failed to import groups" },
            { status: 500 }
        );
    }
}

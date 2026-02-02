import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/db";

const SERVICE_URL = process.env.TELEGRAM_SERVICE_URL || 'http://localhost:8000';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            accountIds,
            targetGroups,  // Array of group links
            messageText,
            mediaPath
        } = body;

        // Validate
        if (!accountIds || accountIds.length === 0) {
            return NextResponse.json({ error: "No accounts selected" }, { status: 400 });
        }

        if (!targetGroups || targetGroups.length === 0) {
            return NextResponse.json({ error: "No target groups selected" }, { status: 400 });
        }

        if (!messageText || messageText.trim() === '') {
            return NextResponse.json({ error: "No message text provided" }, { status: 400 });
        }

        // Get phone numbers from account IDs
        const accounts = await getAccounts();
        const selectedAccounts = accounts.filter((acc: any) => accountIds.includes(acc.id));
        const accountPhones = selectedAccounts.map((acc: any) => acc.phone);

        if (accountPhones.length === 0) {
            return NextResponse.json({ error: "No valid accounts found" }, { status: 400 });
        }

        // Call Python service
        const response = await fetch(`${SERVICE_URL}/telegram/jobs/start-broadcast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                account_phones: accountPhones,
                target_groups: targetGroups,
                message_text: messageText,
                media_path: mediaPath,
                delay_min: 2,
                delay_max: 5
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to start broadcast job');
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Error starting broadcast job:", error);
        return NextResponse.json(
            { error: error.message || "Failed to start broadcast job" },
            { status: 500 }
        );
    }
}

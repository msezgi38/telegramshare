import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/db";

const SERVICE_URL = process.env.TELEGRAM_SERVICE_URL || 'http://localhost:8000';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { accountIds, groupLinks, minDelay = 30, maxDelay = 60 } = body;

        if (!accountIds || accountIds.length === 0) {
            return NextResponse.json(
                { error: "No account IDs provided" },
                { status: 400 }
            );
        }

        if (!groupLinks || groupLinks.length === 0) {
            return NextResponse.json(
                { error: "No group links provided" },
                { status: 400 }
            );
        }

        // Get accounts to extract phone numbers
        const accounts = await getAccounts();
        const selectedAccounts = accounts.filter(acc => accountIds.includes(acc.id));

        if (selectedAccounts.length === 0) {
            return NextResponse.json(
                { error: "No valid accounts found" },
                { status: 400 }
            );
        }

        const accountPhones = selectedAccounts.map(acc => acc.phone);

        // Call Python service to start job
        const response = await fetch(`${SERVICE_URL}/telegram/jobs/start-join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                account_phones: accountPhones,
                group_links: groupLinks,
                min_delay: minDelay,
                max_delay: maxDelay
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to start job');
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Error starting join job:", error);
        return NextResponse.json(
            { error: error.message || "Failed to start join job" },
            { status: 500 }
        );
    }
}

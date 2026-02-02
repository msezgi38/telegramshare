import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/db";
import { createLog } from "@/lib/db";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { accountId, accountIds, groupLink, targetLinks, minDelay = 30, maxDelay = 60 } = body;

        // Support both single link and multiple links
        const links = targetLinks || (groupLink ? [groupLink] : []);

        if (!links || links.length === 0) {
            return NextResponse.json(
                { error: "No target links provided" },
                { status: 400 }
            );
        }

        const accounts = await getAccounts();

        // Support both single account and multiple accounts
        const ids = accountIds || (accountId ? [accountId] : []);
        const selectedAccounts = ids.length > 0
            ? accounts.filter(acc => ids.includes(acc.id))
            : accounts.filter(acc => acc.status === "Active");

        if (selectedAccounts.length === 0) {
            return NextResponse.json(
                { error: "No active accounts found" },
                { status: 400 }
            );
        }

        const allResults: any[] = [];
        const serviceUrl = process.env.TELEGRAM_SERVICE_URL || 'http://localhost:8000';

        // Her hesap için Python servisini çağır
        for (const account of selectedAccounts) {
            try {
                await createLog({
                    message: `📞 Account ${account.phone} starting to join ${links.length} groups...`,
                    type: "info",
                    accountId: account.id,
                });

                const response = await fetch(`${serviceUrl}/telegram/join-groups`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: account.phone,
                        group_links: links,
                        min_delay: minDelay,
                        max_delay: maxDelay,
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    await createLog({
                        message: `❌ Account ${account.phone}: ${error.detail || 'Failed to join groups'}`,
                        type: "error",
                        accountId: account.id,
                    });
                    continue;
                }

                const result = await response.json();
                allResults.push({
                    accountId: account.id,
                    phone: account.phone,
                    results: result.results,
                });

                // Log her sonucu
                if (result.results && Array.isArray(result.results)) {
                    for (const groupResult of result.results) {
                        const logType = groupResult.status === "success" ? "success" :
                            groupResult.status === "error" ? "error" : "info";

                        await createLog({
                            message: `${groupResult.message} - ${groupResult.link}`,
                            type: logType,
                            accountId: account.id,
                        });
                    }
                }

            } catch (error: any) {
                console.error(`Error for account ${account.phone}:`, error);
                await createLog({
                    message: `❌ Account ${account.phone}: ${error.message}`,
                    type: "error",
                    accountId: account.id,
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${selectedAccounts.length} accounts`,
            results: allResults,
        });

    } catch (error: any) {
        console.error("Error in join-groups:", error);
        return NextResponse.json(
            { error: error.message || "Failed to join groups" },
            { status: 500 }
        );
    }
}

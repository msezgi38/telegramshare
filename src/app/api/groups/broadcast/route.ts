import { NextResponse } from "next/server";
import { getAccounts, createLog, addToBlacklist } from "@/lib/db";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { accountIds, targetLinks, message, minDelay = 30, maxDelay = 60 } = body;

        if (!targetLinks || targetLinks.length === 0) {
            return NextResponse.json(
                { error: "No target links provided" },
                { status: 400 }
            );
        }

        if (!message || message.trim().length === 0) {
            return NextResponse.json(
                { error: "Message cannot be empty" },
                { status: 400 }
            );
        }

        const accounts = await getAccounts();
        const selectedAccounts = accountIds
            ? accounts.filter((a: any) => accountIds.includes(a.id))
            : accounts.filter((a: any) => a.status === "active");

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
                    message: `📤 Account ${account.phone} broadcasting to ${targetLinks.length} groups...`,
                    type: "info",
                    accountId: account.id,
                });

                const response = await fetch(`${serviceUrl}/telegram/broadcast`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: account.phone,
                        group_links: targetLinks,
                        message: message,
                        min_delay: minDelay,  // Pass delay settings
                        max_delay: maxDelay   // Pass delay settings
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    await createLog({
                        message: `❌ Account ${account.phone}: ${error.detail || 'Failed to broadcast'}`,
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
                            message: `${groupResult.message} - ${groupResult.group_name || groupResult.link}`,
                            type: logType,
                            accountId: account.id,
                        });

                        // Otomatik blacklist: Hata alan grupları blacklist'e ekle
                        if (groupResult.status === "error") {
                            try {
                                await addToBlacklist({
                                    link: groupResult.link,
                                    reason: groupResult.message || "Broadcast failed",
                                    errorCode: groupResult.error_code,
                                    accountPhone: account.phone,
                                    firstFailedAt: new Date().toISOString(),
                                    failCount: 1,
                                });
                            } catch (blacklistError) {
                                console.error("Failed to add to blacklist:", blacklistError);
                                // Blacklist hatası broadcast'i durdurmasın
                            }
                        }
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
            message: `Broadcast completed for ${selectedAccounts.length} accounts`,
            results: allResults,
        });

    } catch (error: any) {
        console.error("Error in broadcast:", error);
        return NextResponse.json(
            { error: error.message || "Failed to broadcast message" },
            { status: 500 }
        );
    }
}

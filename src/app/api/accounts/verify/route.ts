import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { accountId, verificationCode, password } = body;

        console.log(`🔐 Verifying account ${accountId} with code ${verificationCode}${password ? ' and 2FA password' : ''}`);

        if (!accountId || !verificationCode) {
            return NextResponse.json(
                { error: "Account ID and verification code required" },
                { status: 400 }
            );
        }

        const accounts = await getAccounts();
        const accountIndex = accounts.findIndex((acc) => acc.id === accountId);

        if (accountIndex === -1) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }

        const account = accounts[accountIndex];
        console.log(`📱 Account found: ${account.phone}`);

        try {
            // Python servisini çağır
            const serviceUrl = process.env.TELEGRAM_SERVICE_URL || 'http://localhost:8000';
            const response = await fetch(`${serviceUrl}/telegram/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: account.phone,
                    code: verificationCode,
                    password: password || null,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Verification failed');
            }

            const result = await response.json();

            // 2FA gerekiyorsa
            if (result.requires_2fa) {
                console.log(`🔐 2FA password required for ${account.phone}`);
                return NextResponse.json({
                    success: false,
                    requires_2fa: true,
                    message: "2FA password required"
                });
            }

            console.log(`✅ Verification successful via Python service!`);

            // Update account status
            accounts[accountIndex].status = "Active";
            accounts[accountIndex].groups = 0; // Will be updated later

            await fs.writeFile(
                path.join(DATA_DIR, "accounts.json"),
                JSON.stringify(accounts, null, 2)
            );

            console.log(`🎉 Account ${accountId} activated successfully!`);

            // Auto-sync groups after successful verification
            try {
                console.log(`🔄 Auto-syncing groups for ${account.phone}...`);
                const groupsResponse = await fetch(`${serviceUrl}/telegram/get-joined-groups`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: account.phone,
                        api_id: parseInt(account.apiId),
                        api_hash: account.apiHash
                    }),
                });

                if (groupsResponse.ok) {
                    const groupsData = await groupsResponse.json();
                    const groupCount = groupsData.groups?.length || 0;
                    accounts[accountIndex].groups = groupCount;

                    await fs.writeFile(
                        path.join(DATA_DIR, "accounts.json"),
                        JSON.stringify(accounts, null, 2)
                    );

                    console.log(`✅ Auto-sync complete: ${groupCount} groups found`);
                } else {
                    console.warn(`⚠️ Auto-sync failed, will retry later`);
                }
            } catch (syncError) {
                console.warn(`⚠️ Auto-sync error (non-critical):`, syncError);
            }

            return NextResponse.json({
                success: true,
                message: "Account verified and activated successfully",
                account: accounts[accountIndex],
                userInfo: result.user,
            });

        } catch (error: any) {
            console.error("❌ Verification error:", error);

            let errorMessage = "Verification failed";
            const errorStr = error.message || "";

            if (errorStr.includes("PHONE_CODE_INVALID") || errorStr.includes("Invalid code")) {
                errorMessage = "Invalid verification code. Please check and try again.";
            } else if (errorStr.includes("PHONE_CODE_EXPIRED") || errorStr.includes("expired")) {
                errorMessage = "Verification code expired. Please add the account again.";
            } else if (errorStr.includes("2FA şifresi hatalı") || errorStr.includes("password")) {
                errorMessage = "Incorrect 2FA password. Please try again.";
            } else if (errorStr.includes("PHONE_NUMBER_INVALID")) {
                errorMessage = "Invalid phone number format.";
            } else if (errorStr.includes("FLOOD")) {
                errorMessage = "Please try again in a moment.";
            }

            return NextResponse.json(
                { error: errorMessage },
                { status: 400 }
            );
        }

    } catch (error: any) {
        console.error("❌ Error verifying account:", error);
        return NextResponse.json(
            { error: error.message || "Failed to verify account" },
            { status: 500 }
        );
    }
}

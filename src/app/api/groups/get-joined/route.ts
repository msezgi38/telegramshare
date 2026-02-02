import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/db";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { phone } = body;

        if (!phone) {
            return NextResponse.json(
                { error: "Phone number required" },
                { status: 400 }
            );
        }

        // Get account from database to get API credentials
        const accounts = await getAccounts();
        const account = accounts.find((acc) => acc.phone === phone);

        if (!account) {
            return NextResponse.json(
                { error: "Account not found" },
                { status: 404 }
            );
        }

        // Call Python service to get joined groups
        const serviceUrl = process.env.TELEGRAM_SERVICE_URL || 'http://localhost:8000';
        const response = await fetch(`${serviceUrl}/telegram/get-joined-groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone,
                api_id: parseInt(account.apiId),
                api_hash: account.apiHash
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to get joined groups');
        }

        const result = await response.json();

        return NextResponse.json({
            success: true,
            groups: result.groups,
        });

    } catch (error: any) {
        console.error("Error getting joined groups:", error);
        return NextResponse.json(
            { error: error.message || "Failed to get joined groups" },
            { status: 500 }
        );
    }
}

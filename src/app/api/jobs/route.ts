import { NextResponse } from "next/server";

const SERVICE_URL = process.env.TELEGRAM_SERVICE_URL || 'http://localhost:8000';

export async function GET() {
    try {
        const response = await fetch(`${SERVICE_URL}/telegram/jobs`);

        if (!response.ok) {
            throw new Error('Failed to fetch jobs');
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Error fetching jobs:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch jobs" },
            { status: 500 }
        );
    }
}

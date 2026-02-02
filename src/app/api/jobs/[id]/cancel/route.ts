import { NextResponse } from "next/server";

const SERVICE_URL = process.env.TELEGRAM_SERVICE_URL || 'http://localhost:8000';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const response = await fetch(`${SERVICE_URL}/telegram/jobs/${id}/cancel`, {
            method: 'POST'
        });

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json({ error: "Job not found" }, { status: 404 });
            }
            throw new Error('Failed to cancel job');
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Error cancelling job:", error);
        return NextResponse.json(
            { error: error.message || "Failed to cancel job" },
            { status: 500 }
        );
    }
}

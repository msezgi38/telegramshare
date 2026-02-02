import { NextResponse } from "next/server";

const SERVICE_URL = process.env.TELEGRAM_SERVICE_URL || 'http://localhost:8000';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const response = await fetch(`${SERVICE_URL}/telegram/jobs/${id}`);

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json({ error: "Job not found" }, { status: 404 });
            }
            throw new Error('Failed to fetch job');
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Error fetching job:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch job" },
            { status: 500 }
        );
    }
}

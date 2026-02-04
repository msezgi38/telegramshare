import { NextResponse } from "next/server";

export async function GET() {
    // Fetch templates from Python backend
    try {
        const response = await fetch("http://localhost:8000/telegram/templates");
        const data = await response.json();

        return NextResponse.json(data.templates || []);
    } catch (error) {
        console.error("Failed to fetch templates:", error);
        // Return empty array if backend is down
        return NextResponse.json([]);
    }
}

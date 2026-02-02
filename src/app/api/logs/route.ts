import { NextResponse } from "next/server";
import { getLogs, createLog } from "@/lib/db";

export async function GET() {
  try {
    const logs = await getLogs();
    return NextResponse.json(logs.slice(-100)); // Last 100 logs
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, type, accountId } = body;

    const log = await createLog({
      message,
      type,
      accountId,
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Error creating log:", error);
    return NextResponse.json({ error: "Failed to create log" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getTargets, createTarget } from "@/lib/db";

export async function GET() {
  try {
    const targets = await getTargets();
    return NextResponse.json(targets);
  } catch (error) {
    console.error("Error fetching targets:", error);
    return NextResponse.json({ error: "Failed to fetch targets" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { links } = body;

    if (!links || !Array.isArray(links)) {
      return NextResponse.json(
        { error: "Links must be an array" },
        { status: 400 }
      );
    }

    const created = [];
    for (const link of links) {
      try {
        const target = await createTarget(link);
        created.push(target);
      } catch {
        // Skip duplicates
      }
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating targets:", error);
    return NextResponse.json(
      { error: "Failed to create targets" },
      { status: 500 }
    );
  }
}

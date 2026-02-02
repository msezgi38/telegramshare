import { NextResponse } from "next/server";
import {
    getAccountMessages,
    createAccountMessage,
    updateAccountMessage,
    deleteAccountMessage,
    incrementMessageUsage
} from "@/lib/db";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const accountId = parseInt(id);

        if (isNaN(accountId)) {
            return NextResponse.json({ error: "Invalid account ID" }, { status: 400 });
        }

        const messages = await getAccountMessages(accountId);
        return NextResponse.json(messages);
    } catch (error) {
        console.error("Failed to get account messages:", error);
        return NextResponse.json(
            { error: "Failed to get account messages" },
            { status: 500 }
        );
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const accountId = parseInt(id);

        if (isNaN(accountId)) {
            return NextResponse.json({ error: "Invalid account ID" }, { status: 400 });
        }

        const body = await request.json();
        const { name, content } = body;

        if (!name || !content) {
            return NextResponse.json(
                { error: "Name and content are required" },
                { status: 400 }
            );
        }

        const newMessage = await createAccountMessage({
            accountId,
            name,
            content,
        });

        return NextResponse.json(newMessage);
    } catch (error) {
        console.error("Failed to create message:", error);
        return NextResponse.json(
            { error: "Failed to create message" },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const body = await request.json();
        const { messageId, name, content, incrementUsage } = body;

        if (!messageId) {
            return NextResponse.json(
                { error: "Message ID is required" },
                { status: 400 }
            );
        }

        if (incrementUsage) {
            await incrementMessageUsage(messageId);
        } else {
            await updateAccountMessage(messageId, { name, content });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to update message:", error);
        return NextResponse.json(
            { error: "Failed to update message" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { searchParams } = new URL(request.url);
        const messageId = searchParams.get("messageId");

        if (!messageId) {
            return NextResponse.json(
                { error: "Message ID is required" },
                { status: 400 }
            );
        }

        await deleteAccountMessage(parseInt(messageId));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete message:", error);
        return NextResponse.json(
            { error: "Failed to delete message" },
            { status: 500 }
        );
    }
}

import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

// Session storage structure
interface SessionData {
  accountId: number;
  phoneCodeHash: string;
  timestamp: number;
}

async function getSessions(): Promise<SessionData[]> {
  try {
    const data = await fs.readFile(SESSIONS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveSessions(sessions: SessionData[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

async function saveSession(accountId: number, phoneCodeHash: string): Promise<void> {
  const sessions = await getSessions();
  const filtered = sessions.filter(s => s.accountId !== accountId);
  filtered.push({
    accountId,
    phoneCodeHash,
    timestamp: Date.now(),
  });
  await saveSessions(filtered);
  console.log(`✅ Session saved for account ${accountId}:`, phoneCodeHash);
}

export async function getSession(accountId: number): Promise<string | null> {
  const sessions = await getSessions();
  const session = sessions.find(s => s.accountId === accountId);

  console.log(`🔍 Looking for session ${accountId}:`, session);

  // Expire sessions older than 5 minutes
  if (session && Date.now() - session.timestamp < 5 * 60 * 1000) {
    console.log(`✅ Found valid session for ${accountId}`);
    return session.phoneCodeHash;
  }

  console.log(`❌ No valid session found for ${accountId}`);
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, apiId, apiHash } = body;

    if (!phone || !apiId || !apiHash) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log(`📞 Sending code to ${phone} via Python service...`);

    // Python servisini çağır
    const serviceUrl = process.env.TELEGRAM_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${serviceUrl}/telegram/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        api_id: parseInt(apiId),
        api_hash: apiHash,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to send code');
    }

    const result = await response.json();
    console.log(`✅ Code sent via Python service!`);

    // Get accounts to assign ID
    const accounts = await getAccounts();
    const newId = accounts.length > 0 ? Math.max(...accounts.map((a) => a.id)) + 1 : 1;

    // Save account with pending status
    const newAccount = {
      id: newId,
      phone,
      apiId,
      apiHash,
      status: "Pending Verification",
      groups: 0,
      createdAt: new Date().toISOString(),
    };

    accounts.push(newAccount);

    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      path.join(DATA_DIR, "accounts.json"),
      JSON.stringify(accounts, null, 2)
    );

    console.log(`✅ Account ${newId} created and waiting for verification`);

    return NextResponse.json({
      ...newAccount,
      message: "Verification code sent to your Telegram app",
    }, { status: 201 });

  } catch (error: any) {
    console.error("❌ Error sending code:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send verification code" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const accounts = await getAccounts();
    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Account ID required" }, { status: 400 });
    }

    const accountId = parseInt(id);

    // Remove from sessions
    const sessions = await getSessions();
    const filtered = sessions.filter(s => s.accountId !== accountId);
    await saveSessions(filtered);

    // Remove from accounts
    const accounts = await getAccounts();
    const filteredAccounts = accounts.filter((acc) => acc.id !== accountId);

    await fs.writeFile(
      path.join(DATA_DIR, "accounts.json"),
      JSON.stringify(filteredAccounts, null, 2)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}

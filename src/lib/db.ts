import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

// Simple lock mechanism to prevent concurrent writes
const locks = new Map<string, Promise<void>>();

async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Wait for any existing lock
    while (locks.has(key)) {
        await locks.get(key);
    }

    // Create new lock
    let unlock: () => void;
    const lock = new Promise<void>((resolve) => {
        unlock = resolve;
    });
    locks.set(key, lock);

    try {
        return await fn();
    } finally {
        locks.delete(key);
        unlock!();
    }
}

export interface Account {
    id: number;
    phone: string;
    apiId: string;
    apiHash: string;
    status: string;
    groups: number;
    createdAt: string;
    session?: string;
}

export interface Log {
    id: number;
    message: string;
    type: "info" | "success" | "error" | "warning";
    operation?: "join" | "broadcast" | "login" | "import" | "other";
    accountId?: number;
    groupLink?: string;
    errorCode?: string;
    errorDetails?: string;
    createdAt: string;
}

export interface Target {
    id: number;
    link: string;
    status: string;
    accountId?: number;  // Optional for backward compatibility
    joinedAt?: string;
    createdAt: string;
}

export interface AccountGroup {
    id: number;
    accountId: number;
    groupLink: string;
    groupName?: string;
    groupUsername?: string;
    memberCount?: number;
    joinedAt: string;
    lastMessageSent?: string;
    messageCount: number;
    status: "active" | "left" | "banned";
}

export interface Blacklist {
    id: number;
    link: string;
    reason: string;
    errorCode?: string;
    accountPhone?: string;
    firstFailedAt: string;
    failCount: number;
    createdAt: string;
}

async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

async function readJSON<T>(filename: string, defaultValue: T): Promise<T> {
    await ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    try {
        const data = await fs.readFile(filePath, "utf-8");
        return JSON.parse(data);
    } catch {
        return defaultValue;
    }
}

async function writeJSON<T>(filename: string, data: T): Promise<void> {
    return withLock(filename, async () => {
        await ensureDataDir();
        const filePath = path.join(DATA_DIR, filename);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    });
}

// Accounts
export async function getAccounts(): Promise<Account[]> {
    return readJSON<Account[]>("accounts.json", []);
}

export async function createAccount(account: Omit<Account, "id" | "createdAt">): Promise<Account> {
    const accounts = await getAccounts();
    const newAccount: Account = {
        ...account,
        id: accounts.length > 0 ? Math.max(...accounts.map((a) => a.id)) + 1 : 1,
        createdAt: new Date().toISOString(),
    };
    accounts.push(newAccount);
    await writeJSON("accounts.json", accounts);
    return newAccount;
}

// Logs
export async function getLogs(): Promise<Log[]> {
    return readJSON<Log[]>("logs.json", []);
}

export async function createLog(log: Omit<Log, "id" | "createdAt">): Promise<Log> {
    const logs = await getLogs();
    const newLog: Log = {
        ...log,
        id: logs.length > 0 ? Math.max(...logs.map((l) => l.id)) + 1 : 1,
        createdAt: new Date().toISOString(),
    };
    logs.push(newLog);
    await writeJSON("logs.json", logs);
    return newLog;
}

// Targets
export async function getTargets(): Promise<Target[]> {
    return readJSON<Target[]>("targets.json", []);
}

export async function createTarget(link: string): Promise<Target> {
    const targets = await getTargets();

    // Check for duplicates
    const existing = targets.find(t => t.link === link);
    if (existing) {
        return existing; // Return existing instead of creating duplicate
    }

    const newTarget: Target = {
        id: targets.length > 0 ? Math.max(...targets.map((t) => t.id)) + 1 : 1,
        link,
        status: "Pending",
        createdAt: new Date().toISOString(),
    };
    targets.push(newTarget);
    await writeJSON("targets.json", targets);
    return newTarget;
}

// Blacklist

export async function getBlacklist(): Promise<Blacklist[]> {
    return readJSON<Blacklist[]>("blacklist.json", []);
}

export async function addToBlacklist(data: Omit<Blacklist, "id" | "createdAt">): Promise<Blacklist> {
    const blacklist = await getBlacklist();

    // Check if already blacklisted
    const existing = blacklist.find(b => b.link === data.link && b.accountPhone === data.accountPhone);
    if (existing) {
        // Update fail count and reason
        existing.failCount += 1;
        existing.reason = data.reason || existing.reason;
        await writeJSON("blacklist.json", blacklist);
        return existing;
    }

    const newEntry: Blacklist = {
        ...data,
        id: blacklist.length > 0 ? Math.max(...blacklist.map((b) => b.id)) + 1 : 1,
        createdAt: new Date().toISOString(),
    };
    blacklist.push(newEntry);
    await writeJSON("blacklist.json", blacklist);
    return newEntry;
}

export async function removeFromBlacklist(id: number): Promise<void> {
    const blacklist = await getBlacklist();
    const filtered = blacklist.filter((b) => b.id !== id);
    await writeJSON("blacklist.json", filtered);
}

export async function isBlacklisted(link: string, accountPhone?: string): Promise<boolean> {
    const blacklist = await getBlacklist();
    return blacklist.some(b => b.link === link && (!accountPhone || b.accountPhone === accountPhone));
}

// Account Groups
export async function getAccountGroups(accountId?: number): Promise<AccountGroup[]> {
    const allGroups = await readJSON<AccountGroup[]>("account-groups.json", []);
    if (accountId) {
        return allGroups.filter(g => g.accountId === accountId);
    }
    return allGroups;
}

export async function addAccountGroup(data: Omit<AccountGroup, "id">): Promise<AccountGroup> {
    const groups = await readJSON<AccountGroup[]>("account-groups.json", []);

    // Check for duplicates (same account + same group)
    const existing = groups.find(g => g.accountId === data.accountId && g.groupLink === data.groupLink);
    if (existing) {
        // Update existing
        existing.groupName = data.groupName || existing.groupName;
        existing.memberCount = data.memberCount || existing.memberCount;
        existing.status = data.status;
        await writeJSON("account-groups.json", groups);
        return existing;
    }

    const newGroup: AccountGroup = {
        ...data,
        id: groups.length > 0 ? Math.max(...groups.map(g => g.id)) + 1 : 1,
    };
    groups.push(newGroup);
    await writeJSON("account-groups.json", groups);
    return newGroup;
}

export async function removeAccountGroup(id: number): Promise<void> {
    const groups = await readJSON<AccountGroup[]>("account-groups.json", []);
    const filtered = groups.filter(g => g.id !== id);
    await writeJSON("account-groups.json", filtered);
}

export async function updateAccountGroup(id: number, updates: Partial<AccountGroup>): Promise<void> {
    const groups = await readJSON<AccountGroup[]>("account-groups.json", []);
    const group = groups.find(g => g.id === id);
    if (group) {
        Object.assign(group, updates);
        await writeJSON("account-groups.json", groups);
    }
}

export async function getAccountById(id: number): Promise<Account | null> {
    const accounts = await getAccounts();
    return accounts.find(a => a.id === id) || null;
}

// Account Messages (Templates)
export interface AccountMessage {
    id: number;
    accountId: number;
    name: string;
    content: string;
    lastUsed?: string;
    usageCount: number;
    createdAt: string;
}

export async function getAccountMessages(accountId: number): Promise<AccountMessage[]> {
    const allMessages = await readJSON<AccountMessage[]>("account-messages.json", []);
    return allMessages.filter(m => m.accountId === accountId);
}

export async function createAccountMessage(data: Omit<AccountMessage, "id" | "createdAt" | "usageCount">): Promise<AccountMessage> {
    const messages = await readJSON<AccountMessage[]>("account-messages.json", []);

    const newMessage: AccountMessage = {
        ...data,
        id: messages.length > 0 ? Math.max(...messages.map(m => m.id)) + 1 : 1,
        usageCount: 0,
        createdAt: new Date().toISOString(),
    };

    messages.push(newMessage);
    await writeJSON("account-messages.json", messages);
    return newMessage;
}

export async function updateAccountMessage(id: number, updates: Partial<AccountMessage>): Promise<void> {
    const messages = await readJSON<AccountMessage[]>("account-messages.json", []);
    const message = messages.find(m => m.id === id);
    if (message) {
        Object.assign(message, updates);
        await writeJSON("account-messages.json", messages);
    }
}

export async function deleteAccountMessage(id: number): Promise<void> {
    const messages = await readJSON<AccountMessage[]>("account-messages.json", []);
    const filtered = messages.filter(m => m.id !== id);
    await writeJSON("account-messages.json", filtered);
}

export async function incrementMessageUsage(accountId: number, messageId: number): Promise<void> {
    const allMessages = await readJSON<AccountMessage[]>("account-messages.json", []);
    const message = allMessages.find(m => m.id === messageId && m.accountId === accountId);
    if (message) {
        message.usageCount++;
        message.lastUsed = new Date().toISOString();
        await writeJSON("account-messages.json", allMessages);
    }
}

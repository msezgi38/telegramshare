/**
 * API Client - Next.js'ten Python servise istek atmak için
 */


const TELEGRAM_SERVICE_URL = process.env.TELEGRAM_SERVICE_URL || 'http://localhost:8000';

export interface TelegramLoginRequest {
    phone: string;
    api_id: number;
    api_hash: string;
}

export interface TelegramVerifyRequest {
    phone: string;
    code: string;
}

export interface TelegramJoinGroupsRequest {
    phone: string;
    group_links: string[];
    min_delay?: number;
    max_delay?: number;
}

export interface TelegramBroadcastRequest {
    phone: string;
    group_links: string[];
    message: string;
}

export class TelegramServiceClient {
    private baseUrl: string;

    constructor(baseUrl: string = TELEGRAM_SERVICE_URL) {
        this.baseUrl = baseUrl;
    }

    async login(data: TelegramLoginRequest) {
        const response = await fetch(`${this.baseUrl}/telegram/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }

        return response.json();
    }

    async verify(data: TelegramVerifyRequest) {
        const response = await fetch(`${this.baseUrl}/telegram/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Verification failed');
        }

        return response.json();
    }

    async joinGroups(data: TelegramJoinGroupsRequest) {
        const response = await fetch(`${this.baseUrl}/telegram/join-groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Join groups failed');
        }

        return response.json();
    }

    async broadcast(data: TelegramBroadcastRequest) {
        const response = await fetch(`${this.baseUrl}/telegram/broadcast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Broadcast failed');
        }

        return response.json();
    }

    async getAccountInfo(phone: string) {
        const response = await fetch(`${this.baseUrl}/telegram/account-info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to get account info');
        }

        return response.json();
    }

    async disconnect(phone: string) {
        const response = await fetch(`${this.baseUrl}/telegram/disconnect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Disconnect failed');
        }

        return response.json();
    }
}

export const telegramClient = new TelegramServiceClient();

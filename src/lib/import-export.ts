/**
 * Import/Export Utilities
 * Handle CSV, JSON, TXT imports and exports for groups, logs, and statistics
 */

export interface ImportResult {
    success: number;
    failed: number;
    groups: string[];
    errors: string[];
}

export interface StatisticsReport {
    generatedAt: string;
    overview: {
        totalAccounts: number;
        totalGroups: number;
        totalJoins: number;
        totalBroadcasts: number;
        successRate: number;
        blacklistedCount: number;
    };
    errorsByType: Record<string, number>;
    accountPerformance: Array<{
        phone: string;
        success: number;
        failed: number;
        successRate: number;
    }>;
    recentActivity: Array<{
        date: string;
        success: number;
        failed: number;
    }>;
}

/**
 * Parse imported group links from various formats
 */
export async function parseImportedGroups(file: File): Promise<ImportResult> {
    const text = await file.text();
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

    const groups: string[] = [];
    const errors: string[] = [];

    for (const line of lines) {
        // Support CSV, TXT, one link per line
        const parts = line.split(',');

        for (const part of parts) {
            const trimmed = part.trim();

            // Validate Telegram link
            if (trimmed.startsWith('https://t.me/') || trimmed.startsWith('t.me/')) {
                const link = trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
                groups.push(link);
            } else if (trimmed) {
                errors.push(`Invalid link: ${trimmed}`);
            }
        }
    }

    return {
        success: groups.length,
        failed: errors.length,
        groups,
        errors
    };
}

/**
 * Export groups to CSV format
 */
export function exportGroupsToCSV(groups: Array<{ link: string; status?: string }>): Blob {
    const headers = ['Link', 'Status'];
    const rows = groups.map(g => [g.link, g.status || 'Pending']);

    const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Export logs to JSON format
 */
export function exportLogsToJSON(logs: any[]): Blob {
    const json = JSON.stringify(logs, null, 2);
    return new Blob([json], { type: 'application/json' });
}

/**
 * Export blacklist to CSV
 */
export function exportBlacklistToCSV(blacklist: Array<{
    link: string;
    reason: string;
    errorCode?: string;
    failCount: number;
}>): Blob {
    const headers = ['Link', 'Reason', 'Error Code', 'Fail Count'];
    const rows = blacklist.map(b => [
        b.link,
        b.reason,
        b.errorCode || '-',
        b.failCount.toString()
    ]);

    const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Download blob as file
 */
export function downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

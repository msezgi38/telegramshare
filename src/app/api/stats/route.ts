import { NextResponse } from "next/server";
import { getLogs, getAccounts, getTargets, getBlacklist } from "@/lib/db";

export async function GET() {
    try {
        const [logs, accounts, targets, blacklist] = await Promise.all([
            getLogs(),
            getAccounts(),
            getTargets(),
            getBlacklist(),
        ]);

        // Calculate overview statistics
        const totalJoins = logs.filter(l => l.operation === 'join').length;
        const totalBroadcasts = logs.filter(l => l.operation === 'broadcast').length;
        const successLogs = logs.filter(l => l.type === 'success');
        const totalOps = totalJoins + totalBroadcasts;
        const successRate = totalOps > 0 ? (successLogs.length / totalOps) * 100 : 0;

        // Error distribution
        const errorsByType: Record<string, number> = {};
        logs.filter(l => l.type === 'error' && l.errorCode).forEach(log => {
            const code = log.errorCode!;
            errorsByType[code] = (errorsByType[code] || 0) + 1;
        });

        // Account performance
        const accountPerformance = accounts.map(acc => {
            const accountLogs = logs.filter(l => l.accountId === acc.id);
            const success = accountLogs.filter(l => l.type === 'success').length;
            const failed = accountLogs.filter(l => l.type === 'error').length;
            const total = success + failed;

            return {
                phone: acc.phone,
                success,
                failed,
                successRate: total > 0 ? (success / total) * 100 : 0,
            };
        });

        // Recent activity (last 7 days)
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentLogs = logs.filter(l => new Date(l.createdAt) >= sevenDaysAgo);

        const activityByDay: Record<string, { success: number; failed: number }> = {};
        recentLogs.forEach(log => {
            const date = new Date(log.createdAt).toISOString().split('T')[0];
            if (!activityByDay[date]) {
                activityByDay[date] = { success: 0, failed: 0 };
            }
            if (log.type === 'success') {
                activityByDay[date].success++;
            } else if (log.type === 'error') {
                activityByDay[date].failed++;
            }
        });

        const recentActivity = Object.entries(activityByDay).map(([date, data]) => ({
            date,
            ...data,
        }));

        return NextResponse.json({
            overview: {
                totalAccounts: accounts.length,
                totalGroups: targets.length,
                totalJoins,
                totalBroadcasts,
                successRate: Math.round(successRate * 10) / 10,
                blacklistedCount: blacklist.length,
            },
            errorsByType,
            accountPerformance,
            recentActivity,
        });
    } catch (error) {
        console.error("Failed to get statistics:", error);
        return NextResponse.json(
            { error: "Failed to get statistics" },
            { status: 500 }
        );
    }
}

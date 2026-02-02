"use client";

import { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { AccountFleetSidebar } from "@/components/sender/AccountFleetSidebar";
import { GroupLinkManager, GroupLink } from "@/components/joiner/GroupLinkManager";
import { JoinSettingsPanel, JoinSettings } from "@/components/joiner/JoinSettingsPanel";
import { JoinActivityTable, JoinLog } from "@/components/joiner/JoinActivityTable";
import { JobStatusCard, Job } from "@/components/joiner/JobStatusCard";
import { JobStatsDashboard } from "@/components/shared/JobStatsDashboard";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function JoinerPage() {
    // Multi-account selection - with persistence
    const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);
    const [groupLinks, setGroupLinks] = useState<GroupLink[]>([]);
    const [isHydrated, setIsHydrated] = useState(false);

    // Load from localStorage after hydration
    useEffect(() => {
        const savedAccounts = localStorage.getItem('joiner_selected_accounts');
        const savedLinks = localStorage.getItem('joiner_group_links');

        if (savedAccounts) {
            setSelectedAccountIds(JSON.parse(savedAccounts));
        }
        if (savedLinks) {
            setGroupLinks(JSON.parse(savedLinks));
        }

        setIsHydrated(true);
    }, []);

    // Persist to localStorage
    useEffect(() => {
        if (isHydrated) {
            localStorage.setItem('joiner_selected_accounts', JSON.stringify(selectedAccountIds));
        }
    }, [selectedAccountIds, isHydrated]);

    useEffect(() => {
        if (isHydrated) {
            localStorage.setItem('joiner_group_links', JSON.stringify(groupLinks));
        }
    }, [groupLinks, isHydrated]);

    // Join settings
    const [joinSettings, setJoinSettings] = useState<JoinSettings>({
        mode: 'safe',
        minDelay: 30,
        maxDelay: 60,
        maxJoinsPerAccount: 15,
        retryFailed: true,
    });

    // Activity logs
    const [joinLogs, setJoinLogs] = useState<JoinLog[]>([]);
    const logIdCounter = useRef(0);
    const activityTableRef = useRef<HTMLDivElement>(null);

    // Job system
    const { data: jobsData, mutate: mutateJobs } = useSWR(
        "/api/jobs",
        fetcher,
        { refreshInterval: 5000 } // Poll every 5 seconds
    );
    const jobs: Job[] = jobsData?.jobs || [];
    const activeJobs = jobs.filter(j => j.status === "running" || j.status === "queued");

    // Data fetching
    const { data: accounts = [] } = useSWR("/api/accounts", fetcher);

    // Fetch group counts for all accounts
    const accountGroupCounts = useSWR(
        accounts.length > 0 ? `/api/accounts/group-counts` : null,
        async () => {
            const counts: Record<number, number> = {};
            await Promise.all(
                accounts.map(async (acc: any) => {
                    try {
                        const res = await fetch(`/api/accounts/${acc.id}/groups`);
                        if (res.ok) {
                            const groups = await res.json();
                            counts[acc.id] = Array.isArray(groups) ? groups.length : 0;
                        } else {
                            counts[acc.id] = 0;
                        }
                    } catch {
                        counts[acc.id] = 0;
                    }
                })
            );
            return counts;
        },
        { refreshInterval: 30000 }
    );

    // Transform accounts data
    const transformedAccounts = accounts.map((acc: any) => ({
        id: acc.id,
        phone: acc.phone,
        status: 'active' as const,
        groupCount: accountGroupCounts.data?.[acc.id] || 0,
        tags: [],
    }));

    // Add activity log
    const MAX_LOGS = 100; // Limit to prevent performance issues
    const clearTimestampRef = useRef<Date | null>(null); // Track when logs were cleared

    const addJoinLog = (
        account: string,
        groupLink: string,
        status: JoinLog['status'],
        message: string,
        duration?: number,
        timestamp?: Date
    ) => {
        const newLog: JoinLog = {
            id: logIdCounter.current++,
            timestamp: timestamp || new Date(),
            account,
            groupLink,
            status,
            message,
            duration,
        };
        setJoinLogs(prev => {
            const updated = [...prev, newLog];
            // Keep only last MAX_LOGS entries for performance
            return updated.length > MAX_LOGS ? updated.slice(-MAX_LOGS) : updated;
        });
    };

    // Track seen logs to avoid duplicates
    const seenLogIds = useRef<Set<string>>(new Set());

    // Integrate job logs into join activity table
    useEffect(() => {
        jobs.forEach(job => {
            if (job.type === 'join' && job.logs && Array.isArray(job.logs)) {
                job.logs.forEach((log: any) => {
                    const logId = `${job.id}-${log.timestamp}`;

                    // Skip if already seen
                    if (seenLogIds.current.has(logId)) return;

                    // Skip if log is older than last clear
                    const logTimestamp = new Date(log.timestamp);
                    if (clearTimestampRef.current && logTimestamp < clearTimestampRef.current) {
                        seenLogIds.current.add(logId); // Mark as seen to avoid checking again
                        return;
                    }

                    seenLogIds.current.add(logId);

                    // Extract account from log
                    const account = log.account || 'System';

                    // Extract group link from message
                    let groupLink = 'N/A';
                    const linkMatch = log.message.match(/https?:\/\/t\.me\/[\w]+|@[\w]+|→\s*(.+)/i);
                    if (linkMatch) {
                        groupLink = (linkMatch[1] || linkMatch[0]).trim();
                    }

                    // Map log level to status
                    let status: JoinLog['status'] = 'queued';
                    if (log.level === 'success' || log.message.toLowerCase().includes('joined') || log.message.toLowerCase().includes('success')) {
                        status = 'success';
                    } else if (log.level === 'error' || log.message.toLowerCase().includes('fail') || log.message.toLowerCase().includes('error') || log.message.toLowerCase().includes('banned')) {
                        status = 'failed';
                    } else if (log.message.toLowerCase().includes('joining')) {
                        status = 'joining';
                    }

                    addJoinLog(
                        account,
                        groupLink,
                        status,
                        log.message,
                        undefined,
                        logTimestamp
                    );
                });
            }
        });
    }, [jobs]);

    // Clear logs
    const clearLogs = () => {
        clearTimestampRef.current = new Date(); // Set timestamp to filter old logs
        setJoinLogs([]);
        logIdCounter.current = 0;
    };

    // Export CSV
    const exportToCSV = () => {
        const headers = ['Timestamp', 'Account', 'Group Link', 'Status', 'Message', 'Duration'];
        const rows = joinLogs.map(log => [
            log.timestamp.toISOString(),
            log.account,
            log.groupLink,
            log.status,
            log.message,
            log.duration ? `${log.duration}s` : '',
        ]);

        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `join-activity-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success("CSV exported successfully!");
    };

    // Scroll to activity table when logs update
    useEffect(() => {
        if (joinLogs.length > 0 && activityTableRef.current) {
            activityTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [joinLogs.length]);

    // Smart distribution of links across accounts
    const distributeLinks = (): Map<number, string[]> => {
        const distribution = new Map<number, string[]>();
        const validLinks = groupLinks.filter(l => l.isValid).map(l => l.link);

        if (selectedAccountIds.length === 0 || validLinks.length === 0) {
            return distribution;
        }

        // Calculate links per account based on settings
        const linksPerAccount = Math.min(
            joinSettings.maxJoinsPerAccount,
            Math.ceil(validLinks.length / selectedAccountIds.length)
        );

        let linkIndex = 0;
        for (const accountId of selectedAccountIds) {
            const accountLinks: string[] = [];
            for (let i = 0; i < linksPerAccount && linkIndex < validLinks.length; i++) {
                accountLinks.push(validLinks[linkIndex++]);
            }
            distribution.set(accountId, accountLinks);
        }

        return distribution;
    };

    // Handle join operation using job system
    const handleStartJoin = async () => {
        if (selectedAccountIds.length === 0) {
            toast.error("Please select at least one account");
            return;
        }

        const validLinks = groupLinks.filter(l => l.isValid).map(l => l.link);
        if (validLinks.length === 0) {
            toast.error("Please add at least one valid group link");
            return;
        }

        try {
            const response = await fetch("/api/jobs/start-join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accountIds: selectedAccountIds,
                    groupLinks: validLinks,
                    minDelay: joinSettings.minDelay,
                    maxDelay: joinSettings.maxDelay
                })
            });

            if (!response.ok) {
                throw new Error("Failed to start join job");
            }

            const data = await response.json();
            toast.success(`Join job started! Job ID: ${data.job_id}`);
            mutateJobs(); // Refresh jobs list
        } catch (error: any) {
            console.error("Failed to start join:", error);
            toast.error(error.message || "Failed to start join operation");
        }
    };

    // Cancel job
    const handleCancelJob = async (jobId: string) => {
        try {
            const response = await fetch(`/api/jobs/${jobId}/cancel`, {
                method: "POST"
            });

            if (!response.ok) {
                throw new Error("Failed to cancel job");
            }

            toast.success("Job cancelled");
            mutateJobs();
        } catch (error: any) {
            console.error("Failed to cancel job:", error);
            toast.error(error.message || "Failed to cancel job");
        }
    };

    // Poll active job logs and update activity table
    useEffect(() => {
        if (activeJobs.length === 0) return;

        const interval = setInterval(async () => {
            for (const job of activeJobs) {
                // This is simplified - in production you'd want to track which logs you've already added
                // For now, we'll just add a placeholder log if the job is running
                if (job.status === 'running' && !joinLogs.some(log => log.message.includes(`Job ${job.id} is running`))) {
                    addJoinLog('System', `Job ${job.id}`, 'joining', `Job ${job.id} is running...`);
                } else if (job.status === 'completed' && !joinLogs.some(log => log.message.includes(`Job ${job.id} completed`))) {
                    addJoinLog('System', `Job ${job.id}`, 'success', `Job ${job.id} completed.`);
                } else if (job.status === 'failed' && !joinLogs.some(log => log.message.includes(`Job ${job.id} failed`))) {
                    addJoinLog('System', `Job ${job.id}`, 'failed', `Job ${job.id} failed.`);
                } else if (job.status === 'cancelled' && !joinLogs.some(log => log.message.includes(`Job ${job.id} cancelled`))) {
                    addJoinLog('System', `Job ${job.id}`, 'failed', `Job ${job.id} cancelled by user.`);
                }
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [activeJobs, joinLogs]);

    const validLinkCount = groupLinks.filter(l => l.isValid).length;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Fleet Joiner
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Manage 1000+ accounts joining groups simultaneously
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => {
                            addJoinLog('Test Account', '@testgroup', 'success', 'Test log added!', 1.5);
                        }}
                    >
                        Test Log
                    </Button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="max-w-[1600px] mx-auto p-6 space-y-6">
                {/* Statistics Dashboard */}
                {jobs.length > 0 && (
                    <div>
                        <JobStatsDashboard jobs={jobs} />
                    </div>
                )}

                {/* Active Jobs Section */}
                {activeJobs.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Active Jobs ({activeJobs.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeJobs.map(job => (
                                <JobStatusCard
                                    key={job.id}
                                    job={job}
                                    onCancel={() => handleCancelJob(job.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Account Fleet Sidebar - Full Width */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Fleet Manager
                    </h3>
                    <GlassCard className="p-6">
                        <AccountFleetSidebar
                            accounts={transformedAccounts}
                            selectedAccountIds={selectedAccountIds}
                            onSelectionChange={setSelectedAccountIds}
                            jobs={jobs}
                        />
                    </GlassCard>
                </div>

                {/* Link Manager + Settings - Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Group Link Manager */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Group Links
                        </h3>
                        <GlassCard className="p-6">
                            <GroupLinkManager
                                links={groupLinks}
                                onLinksChange={setGroupLinks}
                            />
                        </GlassCard>
                    </div>

                    {/* Join Settings Panel */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Join Settings
                        </h3>
                        <GlassCard className="p-6">
                            <JoinSettingsPanel
                                settings={joinSettings}
                                onSettingsChange={setJoinSettings}
                                selectedAccountCount={selectedAccountIds.length}
                                totalLinkCount={validLinkCount}
                            />

                            <div className="mt-6">
                                {activeJobs.length > 0 ? (
                                    <div className="text-sm text-gray-600 dark:text-gray-400 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                                        ✅ Joiner running in background ({activeJobs.length} active jobs)
                                    </div>
                                ) : (
                                    <Button
                                        onClick={handleStartJoin}
                                        disabled={selectedAccountIds.length === 0 || validLinkCount === 0}
                                        className="w-full rounded-xl bg-green-600 hover:bg-green-700 h-12 text-base"
                                    >
                                        <Play className="mr-2 h-5 w-5" />
                                        Start Safe Join
                                    </Button>
                                )}
                            </div>
                        </GlassCard>
                    </div>
                </div>

                {/* Join Activity Table - Full Width */}
                <div ref={activityTableRef}>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Join Activity
                    </h3>
                    <JoinActivityTable
                        logs={joinLogs}
                        onClear={clearLogs}
                        onExportCSV={exportToCSV}
                    />
                </div>
            </div>
        </div >
    );
}

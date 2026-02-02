"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { AccountFleetSidebar } from "@/components/sender/AccountFleetSidebar";
import { MessageComposer } from "@/components/sender/MessageComposer";
import { UnifiedScheduler, SchedulerSettings } from "@/components/sender/UnifiedScheduler";
import { GlobalActivityTable, ActivityLog } from "@/components/sender/GlobalActivityTable";
import { GroupSelectionModal } from "@/components/sender/GroupSelectionModal";
import { JobStatusCard, Job } from "@/components/joiner/JobStatusCard";
import { JobStatsDashboard } from "@/components/shared/JobStatsDashboard";
import { BroadcastTimeline } from "@/components/sender/BroadcastTimeline";
import { TerminalModal } from "@/components/sender/TerminalModal";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Terminal } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SenderPage() {
    // Multi-account selection (new fleet management approach) - with persistence
    const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);

    // Load from localStorage after hydration
    useEffect(() => {
        const savedAccounts = localStorage.getItem('sender_selected_accounts');
        const savedMessage = localStorage.getItem('sender_message');

        if (savedAccounts) {
            setSelectedAccountIds(JSON.parse(savedAccounts));
        }
        if (savedMessage) {
            setMessage(savedMessage);
        }

        setIsHydrated(true);
    }, []);

    // Persist selections to localStorage
    useEffect(() => {
        if (isHydrated) {
            localStorage.setItem('sender_selected_accounts', JSON.stringify(selectedAccountIds));
        }
    }, [selectedAccountIds, isHydrated]);

    useEffect(() => {
        if (isHydrated) {
            localStorage.setItem('sender_message', message);
        }
    }, [message, isHydrated]);

    // Terminal modal state
    const [isTerminalOpen, setIsTerminalOpen] = useState(false);

    // Group selection modal state
    const [groupModalAccountId, setGroupModalAccountId] = useState<number | null>(null);
    const [accountGroupSelections, setAccountGroupSelections] = useState<Record<number, number[]>>({});

    // Scheduler state
    const [isSchedulerRunning, setIsSchedulerRunning] = useState(false);
    const [nextBroadcast, setNextBroadcast] = useState<Date | null>(null);
    const schedulerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Activity logs (replaces old terminal)
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const logIdCounter = useRef(0);
    const activityTableRef = useRef<HTMLDivElement>(null);
    const clearTimestampRef = useRef<Date | null>(null); // Track when logs were cleared

    // Limit log size for performance (keep last 100 logs max)
    const MAX_LOGS = 100;
    const addActivityLogSafe = (account: string, targetGroup: string, status: ActivityLog['status'], message: string, error?: string, duration?: number, timestamp?: Date) => {
        const newLog: ActivityLog = {
            id: logIdCounter.current++,
            timestamp: timestamp || new Date(),
            account,
            targetGroup,
            status,
            message,
            error,
            duration,
        };
        setActivityLogs(prev => {
            const updated = [...prev, newLog];
            // Keep only last MAX_LOGS entries for performance
            return updated.length > MAX_LOGS ? updated.slice(-MAX_LOGS) : updated;
        });
    };

    // Data fetching
    const { data: accounts = [] } = useSWR("/api/accounts", fetcher);
    const { data: messagesData, mutate: mutateMessages } = useSWR(
        selectedAccountIds.length > 0 ? `/api/accounts/${selectedAccountIds[0]}/messages` : null,
        fetcher
    );

    // Job polling for broadcast jobs
    const { data: jobsData, mutate: mutateJobs } = useSWR("/api/jobs", fetcher, {
        refreshInterval: 5000 // Poll every 5 seconds
    });
    const jobs: Job[] = jobsData?.jobs || [];
    const activeJobs = jobs.filter(j =>
        (j.status === "running" || j.status === "queued") &&
        j.type === "broadcast"
    );

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
        { refreshInterval: 30000 } // Refresh every 30 seconds
    );

    // Transform accounts data to include group counts and status
    const transformedAccounts = accounts.map((acc: any) => ({
        id: acc.id,
        phone: acc.phone,
        status: 'active' as const,
        groupCount: accountGroupCounts.data?.[acc.id] || 0,
        tags: [],
    }));

    // Get all groups for selected accounts
    const { data: allGroupsData } = useSWR(
        selectedAccountIds.length > 0
            ? `/api/accounts/${selectedAccountIds[0]}/groups`
            : null,
        fetcher,
        { refreshInterval: 10000 }
    );

    // Get groups for modal
    const { data: modalGroupsData } = useSWR(
        groupModalAccountId ? `/api/accounts/${groupModalAccountId}/groups` : null,
        fetcher
    );

    const accountGroups = Array.isArray(allGroupsData) ? allGroupsData : [];
    const modalGroups = Array.isArray(modalGroupsData) ? modalGroupsData : [];
    const savedMessages = Array.isArray(messagesData) ? messagesData : [];

    // Calculate total group count based on selected groups per account
    const totalGroupCount = selectedAccountIds.reduce((total, accountId) => {
        const selectedGroups = accountGroupSelections[accountId] || [];
        // If no specific groups selected for this account, count all groups
        return total + (selectedGroups.length > 0 ? selectedGroups.length : accountGroups.length);
    }, 0);

    // Handle group modal
    const handleViewGroups = (accountId: number) => {
        setGroupModalAccountId(accountId);
    };

    const handleCloseGroupModal = () => {
        setGroupModalAccountId(null);
    };

    const handleGroupSelectionChange = (groupIds: number[]) => {
        if (groupModalAccountId) {
            setAccountGroupSelections(prev => ({
                ...prev,
                [groupModalAccountId]: groupIds,
            }));
        }
    };

    // Get selected groups for modal account
    const modalAccountSelectedGroups = groupModalAccountId
        ? accountGroupSelections[groupModalAccountId] || []
        : [];

    // Get modal account phone
    const modalAccount = accounts.find((a: any) => a.id === groupModalAccountId);
    const modalAccountPhone = modalAccount?.phone || "";

    // Add activity log (use safe version with size limit)
    const addActivityLog = addActivityLogSafe;

    // Auto-scroll to activity table when new logs appear
    useEffect(() => {
        if (activityLogs.length > 0 && activityTableRef.current) {
            setTimeout(() => {
                activityTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 100);
        }
    }, [activityLogs.length]);

    // Track seen logs to avoid duplicates
    const seenLogIds = useRef<Set<string>>(new Set());

    // Integrate job logs into activity table
    useEffect(() => {
        jobs.forEach(job => {
            if (job.type === 'broadcast' && job.logs && Array.isArray(job.logs)) {
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

                    // Extract account from log (if available)
                    const account = log.account || 'System';

                    // Extract target group from message (e.g., "Sent to @groupname")
                    let targetGroup = 'N/A';
                    const groupMatch = log.message.match(/@[\w]+|→\s*(.+)|to\s+(.+)|in\s+(.+)/i);
                    if (groupMatch) {
                        targetGroup = (groupMatch[1] || groupMatch[2] || groupMatch[3] || groupMatch[0]).trim();
                    }

                    // Map log level to status
                    let status: ActivityLog['status'] = 'sending';
                    if (log.level === 'success' || log.message.toLowerCase().includes('sent') || log.message.toLowerCase().includes('success')) {
                        status = 'sent';
                    } else if (log.level === 'error' || log.message.toLowerCase().includes('fail') || log.message.toLowerCase().includes('error')) {
                        status = 'failed';
                    } else if (log.message.toLowerCase().includes('queued') || log.message.toLowerCase().includes('waiting')) {
                        status = 'queued';
                    }

                    addActivityLogSafe(
                        account,
                        targetGroup,
                        status,
                        log.message,
                        log.level === 'error' ? log.message : undefined,
                        undefined,
                        logTimestamp
                    );
                });
            }
        });
    }, [jobs]);

    // Clear logs
    const clearLogs = () => {
        console.log('🗑️ Clearing logs...', { currentCount: activityLogs.length });
        clearTimestampRef.current = new Date(); // Set timestamp to filter old logs
        setActivityLogs([]);
        logIdCounter.current = 0;
        console.log('✅ Logs cleared! Timestamp:', clearTimestampRef.current);
    };

    // Export CSV
    const exportToCSV = () => {
        const headers = ['Timestamp', 'Account', 'Target Group', 'Status', 'Message', 'Duration'];
        const rows = activityLogs.map(log => [
            new Date(log.timestamp).toISOString(),
            log.account,
            log.targetGroup,
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
        a.download = `broadcast-activity-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success("CSV exported successfully!");
    };

    // Variable substitution
    const substituteVariables = (text: string, context: any): string => {
        return text
            .replace(/{account_phone}/g, context.account_phone || '')
            .replace(/{account_name}/g, context.account_name || '')
            .replace(/{group_name}/g, context.group_name || '')
            .replace(/{timestamp}/g, new Date().toLocaleString());
    };

    // Send broadcast using job system
    const handleSend = async () => {
        if (!message.trim()) {
            toast.error("Please enter a message");
            return;
        }

        if (selectedAccountIds.length === 0) {
            toast.error("Please select at least one account");
            return;
        }

        if (accountGroups.length === 0) {
            toast.error("No groups available for selected accounts");
            return;
        }

        setIsSending(true);

        try {
            addActivityLog('System', 'Job System', 'sending', `Preparing broadcast job for ${selectedAccountIds.length} accounts...`);

            // Collect all target group links from selected accounts
            const targetGroups: string[] = [];

            for (const accountId of selectedAccountIds) {
                // Get selected groups for this account, or all if none selected
                const selectedGroupIds = accountGroupSelections[accountId] || [];
                const groupsToSend = selectedGroupIds.length > 0
                    ? accountGroups.filter((g: any) => selectedGroupIds.includes(g.id))
                    : accountGroups;

                targetGroups.push(...groupsToSend.map((g: any) => g.groupLink));
            }

            if (targetGroups.length === 0) {
                toast.error("No target groups found");
                return;
            }

            // Start broadcast job
            const response = await fetch('/api/jobs/start-broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountIds: selectedAccountIds,
                    targetGroups,
                    messageText: message,
                    mediaPath: null
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to start broadcast job');
            }

            const data = await response.json();

            addActivityLog('System', 'Job Started', 'sent', `Broadcast job ${data.job_id} started successfully`);
            toast.success(`Broadcast job started!`, {
                description: `Job ID: ${data.job_id}. Broadcasting to ${targetGroups.length} groups from ${selectedAccountIds.length} accounts. You can close the browser, the job will continue running.`,
                duration: 7000
            });

            // Refresh jobs to show active job immediately
            mutateJobs();

        } catch (error: any) {
            console.error("Failed to start broadcast:", error);
            addActivityLog('System', 'Job System', 'failed', error.message, error.message);
            toast.error("Failed to start broadcast job", {
                description: error.message,
                duration: 5000,
            });
        } finally {
            setIsSending(false);
        }
    };

    // Scheduler handlers
    const handleStartScheduler = async (settings: SchedulerSettings) => {
        if (!message.trim() || selectedAccountIds.length === 0) {
            toast.error("Please set message and select accounts first");
            return;
        }

        setIsSchedulerRunning(true);
        addActivityLog('System', 'Scheduler', 'sending', `Scheduler started in ${settings.mode} mode`);

        const intervalMs = settings.loopInterval * 60 * 1000;

        // Send immediately
        await handleSend();

        // Schedule next broadcast
        const next = new Date(Date.now() + intervalMs);
        setNextBroadcast(next);

        // Set up recurring broadcast
        schedulerIntervalRef.current = setInterval(async () => {
            await handleSend();
            const nextTime = new Date(Date.now() + intervalMs);
            setNextBroadcast(nextTime);
        }, intervalMs);

        toast.success("Scheduler started!", {
            description: `Next broadcast in ${settings.loopInterval} minutes`,
        });
    };

    const handleStopScheduler = () => {
        if (schedulerIntervalRef.current) {
            clearInterval(schedulerIntervalRef.current);
            schedulerIntervalRef.current = null;
        }
        setIsSchedulerRunning(false);
        setNextBroadcast(null);
        addActivityLog('System', 'Scheduler', 'queued', 'Scheduler stopped');
        toast.info("Scheduler stopped");
    };

    // Template management
    const handleSaveTemplate = async (name: string) => {
        if (!selectedAccountIds.length) {
            toast.error("Please select an account first");
            return;
        }

        try {
            await fetch(`/api/accounts/${selectedAccountIds[0]}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name,
                    content: message,
                }),
            });

            await mutateMessages();
            toast.success("Template saved successfully!");
        } catch (error: any) {
            toast.error("Failed to save template");
        }
    };

    const handleLoadTemplate = async (templateId: number, content: string) => {
        setMessage(content);

        try {
            await fetch(`/api/accounts/${selectedAccountIds[0]}/messages`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messageId: templateId,
                    incrementUsage: true,
                }),
            });
            await mutateMessages();
            toast.success("Template loaded!");
        } catch (error) {
            console.error("Failed to update template usage:", error);
        }
    };

    // Cleanup scheduler on unmount
    useEffect(() => {
        return () => {
            if (schedulerIntervalRef.current) {
                clearInterval(schedulerIntervalRef.current);
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Fleet Broadcaster
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Manage up to 50+ accounts simultaneously with intelligent scheduling
                </p>
            </div>

            {/* Scrollable Content */}
            <div className="max-w-[1600px] mx-auto p-6 space-y-6">
                {/* Statistics Dashboard */}
                {jobs.length > 0 && (
                    <div>
                        <JobStatsDashboard jobs={jobs} />
                    </div>
                )}

                {/* Broadcast Timeline */}
                <div>
                    <BroadcastTimeline jobs={jobs} />
                </div>

                {/* Active Broadcast Jobs */}
                {activeJobs.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Active Broadcast Jobs ({activeJobs.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeJobs.map(job => (
                                <JobStatusCard
                                    key={job.id}
                                    job={job}
                                    onCancel={async () => {
                                        try {
                                            await fetch(`/api/jobs/${job.id}/cancel`, { method: 'POST' });
                                            toast.success("Job cancelled");
                                            mutateJobs();
                                        } catch (error) {
                                            toast.error("Failed to cancel job");
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Fleet Management - Full Width */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Fleet Manager
                    </h3>
                    <GlassCard className="p-6">
                        <AccountFleetSidebar
                            accounts={transformedAccounts}
                            selectedAccountIds={selectedAccountIds}
                            onSelectionChange={setSelectedAccountIds}
                            onViewGroups={handleViewGroups}
                            jobs={jobs}
                        />
                    </GlassCard>
                </div>

                {/* Composer + Scheduler - Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Message Composer */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Message Composer
                        </h3>
                        <GlassCard className="p-6">
                            <MessageComposer
                                message={message}
                                onMessageChange={setMessage}
                                templates={savedMessages}
                                onSaveTemplate={handleSaveTemplate}
                                onLoadTemplate={handleLoadTemplate}
                                onSend={handleSend}
                                isSending={isSending}
                                disabled={isSchedulerRunning}
                            />
                        </GlassCard>
                    </div>

                    {/* Unified Scheduler */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Scheduler
                        </h3>
                        <GlassCard className="p-6">
                            <UnifiedScheduler
                                selectedAccountCount={selectedAccountIds.length}
                                totalGroupCount={totalGroupCount}
                                isRunning={isSchedulerRunning}
                                onStart={handleStartScheduler}
                                onStop={handleStopScheduler}
                                nextBroadcast={nextBroadcast}
                            />
                        </GlassCard>
                    </div>
                </div>

                {/* Global Activity Table - Full Width */}
                <div ref={activityTableRef}>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Activity Log
                    </h3>
                    <GlobalActivityTable
                        logs={activityLogs}
                        onClear={clearLogs}
                        onExportCSV={exportToCSV}
                    />
                </div>
            </div>

            {/* Group Selection Modal */}
            <GroupSelectionModal
                isOpen={groupModalAccountId !== null}
                onClose={handleCloseGroupModal}
                accountPhone={modalAccountPhone}
                groups={modalGroups}
                selectedGroupIds={modalAccountSelectedGroups}
                onGroupSelectionChange={handleGroupSelectionChange}
            />

            {/* Terminal Modal */}
            <TerminalModal
                isOpen={isTerminalOpen}
                onClose={() => setIsTerminalOpen(false)}
                logs={jobs.flatMap(job =>
                    (job.logs || []).map((log: any) => ({
                        timestamp: log.timestamp,
                        level: log.level || 'info',
                        message: log.message,
                        account: log.account
                    }))
                )}
            />
        </div>
    );
}

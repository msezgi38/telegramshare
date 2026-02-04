"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
    Users,
    Send,
    TrendingUp,
    AlertCircle,
    Activity,
    PlayCircle,
    Search,
    Terminal as TerminalIcon,
    FileText,
    Zap,
    RotateCcw,
    Shield,
    ChevronDown,
    Eye,
    X,
    ExternalLink
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Account {
    id: number;
    phone: string;
    status: 'active' | 'cooling' | 'banned';
    groups: string[];
    isActive?: boolean;
    progress?: { current: number; total: number };
}

interface Template {
    id: number;
    name: string;
    content: string;
}

export default function BroadcastManagerPage() {
    const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [messageText, setMessageText] = useState("");
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [safeMode, setSafeMode] = useState(true);
    const [customDelayMin, setCustomDelayMin] = useState(2);
    const [customDelayMax, setCustomDelayMax] = useState(5);
    const [loopMode, setLoopMode] = useState(false);
    const [loopInterval, setLoopInterval] = useState(60);

    // View Groups Modal
    const [showGroupsModal, setShowGroupsModal] = useState(false);
    const [selectedAccountForGroups, setSelectedAccountForGroups] = useState<Account | null>(null);

    // Terminal
    const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
    const terminalRef = useRef<HTMLDivElement>(null);

    // Fetch data
    const { data: accountsData = [] } = useSWR("/api/accounts", fetcher);

    // Fetch group counts for all accounts (like Sender page does)
    const accountGroupCounts = useSWR(
        accountsData.length > 0 ? `/api/accounts/group-counts` : null,
        async () => {
            const counts: Record<number, { count: number; groups: string[] }> = {};
            await Promise.all(
                accountsData.map(async (acc: any) => {
                    try {
                        const res = await fetch(`/api/accounts/${acc.id}/groups`);
                        if (res.ok) {
                            const groups = await res.json();
                            counts[acc.id] = {
                                count: Array.isArray(groups) ? groups.length : 0,
                                groups: Array.isArray(groups) ? groups.map((g: any) => g.groupLink || g.groupName) : []
                            };
                        } else {
                            counts[acc.id] = { count: 0, groups: [] };
                        }
                    } catch {
                        counts[acc.id] = { count: 0, groups: [] };
                    }
                })
            );
            return counts;
        },
        { refreshInterval: 30000 } // Refresh every 30 seconds
    );

    const { data: templatesData = [] } = useSWR("/api/templates", fetcher);
    const { data: jobsData, mutate: mutateJobs } = useSWR("/api/jobs", fetcher, { refreshInterval: 3000 });

    const jobs = jobsData?.jobs || [];
    const activeJobs = jobs.filter((j: any) =>
        (j.status === "running" || j.status === "queued") && j.type === "broadcast"
    );

    // Calculate metrics
    const totalOperations = jobs.filter((j: any) => j.type === "broadcast").length;
    const successfulSends = jobs.reduce((sum: number, j: any) =>
        sum + (j.progress?.completed || 0), 0
    );
    const failedSends = jobs.reduce((sum: number, j: any) =>
        sum + (j.progress?.failed || 0), 0
    );

    // Transform accounts
    const transformedAccounts: Account[] = accountsData.map((acc: any) => {
        const accountJob = activeJobs.find((j: any) =>
            j.params?.account_phones?.includes(acc.phone)
        );

        let status: 'active' | 'cooling' | 'banned' = 'active';
        if (acc.status === 'Banned') status = 'banned';
        else if (accountJob) status = 'active';

        const progress = accountJob?.progress?.per_account?.[acc.phone];

        const groupData = accountGroupCounts.data?.[acc.id] || { count: 0, groups: [] };

        return {
            id: acc.id,
            phone: acc.phone,
            status,
            groups: Array.isArray(groupData.groups) ? groupData.groups : [],
            isActive: acc.isActive !== false,
            progress: progress ? {
                current: progress.completed || 0,
                total: progress.total_groups || 0
            } : undefined
        };
    });

    const filteredAccounts = transformedAccounts.filter(acc =>
        acc.phone.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedAccountsData = transformedAccounts.filter(a => selectedAccounts.includes(a.id));
    const totalSelectedGroups = selectedAccountsData.reduce((sum, acc) => sum + acc.groups.length, 0);

    const toggleAccount = (id: number) => {
        const account = transformedAccounts.find(a => a.id === id);

        // Prevent selecting inactive accounts
        if (account && !account.isActive) {
            toast.error("This account is inactive. Please enable it first.");
            return;
        }

        setSelectedAccounts(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedAccounts.length === filteredAccounts.length) {
            setSelectedAccounts([]);
        } else {
            setSelectedAccounts(filteredAccounts.map(a => a.id));
        }
    };

    const getStatusBadge = (status: Account['status']) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">Active</Badge>;
            case 'banned':
                return <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">Banned</Badge>;
            default:
                return <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20 text-xs">Idle</Badge>;
        }
    };

    // Reset metrics
    const handleResetMetrics = async () => {
        try {
            await fetch("http://localhost:8000/telegram/jobs/clear-logs", {
                method: "POST"
            });
            mutateJobs();
            toast.success("Metrics reset successfully!");
            addLog("🔄 Metrics reset");
        } catch (error) {
            toast.error("Failed to reset metrics");
        }
    };

    // Stop all active jobs
    const handleStopAllJobs = async () => {
        try {
            const stopPromises = activeJobs.map((job: any) =>
                fetch(`http://localhost:8000/telegram/jobs/${job.id}/cancel`, {
                    method: "POST"
                })
            );

            await Promise.all(stopPromises);
            mutateJobs();
            toast.success(`Stopped ${activeJobs.length} job(s)`);
            addLog(`🛑 Stopped ${activeJobs.length} active jobs`);
        } catch (error) {
            toast.error("Failed to stop jobs");
        }
    };

    // Start broadcast
    const handleStartBroadcast = async () => {
        if (selectedAccounts.length === 0) {
            toast.error("Please select at least one account");
            return;
        }

        if (!messageText.trim()) {
            toast.error("Please enter a message");
            return;
        }

        const selectedPhones = selectedAccountsData.map(a => a.phone);

        // Create per-account group mapping
        const accountGroups: Record<string, string[]> = {};
        selectedAccountsData.forEach(acc => {
            accountGroups[acc.phone] = acc.groups;
        });

        const totalGroups = Object.values(accountGroups).reduce((sum, groups) => sum + groups.length, 0);

        if (totalGroups === 0) {
            toast.error("Selected accounts have no groups");
            return;
        }

        const delayMin = safeMode ? 30 : customDelayMin;
        const delayMax = safeMode ? 60 : customDelayMax;

        setIsBroadcasting(true);
        addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        addLog(`🚀 BROADCAST STARTED`);
        addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        addLog(`📱 Accounts: ${selectedPhones.length}`);
        addLog(`📢 Total Groups: ${totalGroups}`);
        addLog(`💬 Message Length: ${messageText.length} chars`);
        addLog(`⚡ Mode: ${safeMode ? 'Safe Mode (30-60s)' : `Custom (${delayMin}-${delayMax}s)`}`);
        addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        selectedAccountsData.forEach(acc => {
            addLog(`✓ ${acc.phone} → ${acc.groups.length} groups`);
        });

        addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        try {
            const response = await fetch("http://localhost:8000/telegram/jobs/start-broadcast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    account_phones: selectedPhones,
                    account_groups: accountGroups,  // Per-account group mapping
                    message_text: messageText,
                    media_path: null,
                    delay_min: delayMin,
                    delay_max: delayMax,
                    loop_mode: loopMode,
                    loop_interval_minutes: loopInterval
                })
            });

            if (response.ok) {
                const data = await response.json();
                toast.success("🎯 Broadcast started successfully!");
                addLog(`✅ Job Created: ${data.job_id}`);
                addLog(`⏳ Broadcasting in progress...`);
                mutateJobs();
            } else {
                throw new Error("Failed to start broadcast");
            }
        } catch (error) {
            toast.error("Failed to start broadcast");
            addLog(`❌ ERROR: ${error}`);
        } finally {
            setIsBroadcasting(false);
        }
    };

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString('tr-TR');
        setTerminalLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    };

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [terminalLogs]);

    // Monitor job progress with account names
    const lastLoggedProgress = useRef<{ [key: string]: number }>({});

    useEffect(() => {
        activeJobs.forEach((job: any) => {
            if (job.progress?.per_account) {
                Object.entries(job.progress.per_account).forEach(([phone, progress]: [string, any]) => {
                    const total = progress.total_groups || 0;
                    const completed = progress.completed || 0;
                    const failed = progress.failed || 0;
                    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

                    const key = `${phone}_${percentage}`;

                    // Log every 20% or completion
                    if ((percentage % 20 === 0 && percentage > 0) || percentage === 100) {
                        if (!lastLoggedProgress.current[key]) {
                            lastLoggedProgress.current[key] = percentage;
                            const currentGroup = progress.current_group || '';
                            const status = percentage === 100 ? '✅ COMPLETE' : '📤 Broadcasting';
                            addLog(`${status} | ${phone} → ${completed}/${total} (${percentage}%) | Failed: ${failed}`);
                            if (currentGroup && percentage < 100) {
                                addLog(`   └─ Current: ${currentGroup}`);
                            }
                        }
                    }
                });
            }
        });
    }, [activeJobs]);

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="border-b border-gray-200 bg-white px-8 py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Broadcast Manager</h1>
                        <p className="text-gray-600 mt-1">Simple. Fast. Effective.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right mr-4">
                            <div className="text-sm text-gray-600">Selected</div>
                            <div className="text-2xl font-bold text-blue-600">{selectedAccounts.length}</div>
                        </div>
                        <div className="text-right mr-4">
                            <div className="text-sm text-gray-600">Groups</div>
                            <div className="text-2xl font-bold text-green-600">{totalSelectedGroups}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* View Groups Modal */}
            {showGroupsModal && selectedAccountForGroups && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-8">
                    <div className="bg-white rounded-lg border border-gray-200 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Groups for {selectedAccountForGroups.phone}</h2>
                                <p className="text-gray-600 text-sm mt-1">{selectedAccountForGroups.groups.length} groups total</p>
                            </div>
                            <button
                                onClick={() => setShowGroupsModal(false)}
                                className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                            >
                                <X className="h-4 w-4 text-gray-600" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {selectedAccountForGroups.groups.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-500">No groups joined yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {selectedAccountForGroups.groups.map((group, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 transition-colors"
                                        >
                                            <span className="text-gray-900 text-sm truncate flex-1">{group}</span>
                                            <a
                                                href={group}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-3 text-blue-400 hover:text-blue-300 flex-shrink-0"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200">
                            <Button
                                onClick={() => setShowGroupsModal(false)}
                                className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            <div className="max-w-[1800px] mx-auto p-8 bg-gray-50 min-h-screen">
                {/* Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <GlassCard className="p-6 bg-white border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Total Broadcasts</p>
                                <h3 className="text-3xl font-bold text-gray-900 mt-1">{totalOperations}</h3>
                            </div>
                            <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Activity className="h-6 w-6 text-blue-400" />
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6 bg-white border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Successful</p>
                                <h3 className="text-3xl font-bold text-green-400 mt-1">{successfulSends}</h3>
                            </div>
                            <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                                <TrendingUp className="h-6 w-6 text-green-400" />
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6 bg-white border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Failed</p>
                                <h3 className="text-3xl font-bold text-red-400 mt-1">{failedSends}</h3>
                            </div>
                            <div className="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                                <AlertCircle className="h-6 w-6 text-red-400" />
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6 bg-white border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Active Broadcasts</p>
                                <h3 className="text-3xl font-bold text-blue-600 mt-1">{activeJobs.length}</h3>
                            </div>
                            <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Activity className="h-6 w-6 text-blue-400" />
                            </div>
                        </div>
                        {activeJobs.length > 0 && (
                            <Button
                                onClick={handleStopAllJobs}
                                variant="outline"
                                className="w-full mt-4 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Stop All Jobs
                            </Button>
                        )}
                    </GlassCard>

                    <GlassCard className="p-6 bg-white border-gray-200">
                        <Button
                            onClick={handleResetMetrics}
                            variant="outline"
                            className="w-full h-full border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        >
                            <RotateCcw className="h-5 w-5 mr-2" />
                            Reset Metrics
                        </Button>
                    </GlassCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left - Control Panel */}
                    <div className="space-y-6">
                        {/* Accounts */}
                        <GlassCard className="p-6 bg-white border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Accounts
                                </h2>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 bg-white border-gray-300 text-gray-900 w-48"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200">
                                <Checkbox
                                    checked={selectedAccounts.length === filteredAccounts.length && filteredAccounts.length > 0}
                                    onCheckedChange={toggleAll}
                                />
                                <span className="text-sm text-gray-600">
                                    {selectedAccounts.length} selected ({totalSelectedGroups} groups)
                                </span>
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {filteredAccounts.map((account) => (
                                    <div
                                        key={account.id}
                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${account.isActive === false
                                            ? 'bg-gray-100 opacity-60 cursor-not-allowed border-gray-300'
                                            : 'bg-white border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <Checkbox
                                            checked={selectedAccounts.includes(account.id)}
                                            onCheckedChange={() => toggleAccount(account.id)}
                                            disabled={account.isActive === false}
                                        />

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-gray-900 font-medium text-sm truncate">{account.phone}</p>
                                                {getStatusBadge(account.status)}
                                                {account.isActive === false && (
                                                    <Badge className="bg-gray-200 text-gray-600 border-gray-300 text-xs">
                                                        Inactive
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <p className="text-gray-600 text-xs">{account.groups.length} groups</p>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedAccountForGroups(account);
                                                        setShowGroupsModal(true);
                                                    }}
                                                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    View Groups
                                                </button>
                                            </div>

                                            {account.progress && (
                                                <div className="mt-2">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs text-gray-600">
                                                            {account.progress.current}/{account.progress.total}
                                                        </span>
                                                        <span className="text-xs text-green-400">
                                                            {Math.round((account.progress.current / account.progress.total) * 100)}%
                                                        </span>
                                                    </div>
                                                    <Progress
                                                        value={(account.progress.current / account.progress.total) * 100}
                                                        className="h-1.5 bg-gray-200"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>

                        {/* Message */}
                        <GlassCard className="p-6 bg-white border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                                <FileText className="h-5 w-5" />
                                Message
                            </h2>

                            {/* Template Selection */}
                            <div className="mb-4">
                                <Label className="text-gray-700 text-sm mb-2 block">Choose Template</Label>
                                <select
                                    onChange={(e) => {
                                        const template = templatesData.find((t: Template) => t.id === parseInt(e.target.value));
                                        if (template) {
                                            setMessageText(template.content);
                                            toast.success(`Template "${template.name}" loaded`);
                                        }
                                    }}
                                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-900 text-sm"
                                >
                                    <option value="">-- Select a template --</option>
                                    {templatesData.map((template: Template) => (
                                        <option key={template.id} value={template.id}>
                                            {template.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <Textarea
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                placeholder="Enter your broadcast message or select a template above..."
                                className="bg-white border-gray-300 text-gray-900 min-h-[120px] resize-none"
                            />
                            <div className="flex items-center justify-between mt-2">
                                <p className="text-sm text-gray-600">{messageText.length} characters</p>
                            </div>
                        </GlassCard>

                        {/* Scheduler Settings */}
                        <GlassCard className="p-6 bg-white border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Scheduler</h2>

                            {/* Loop Mode */}
                            <div className="mb-6">
                                <Label className="text-gray-700 text-sm mb-3 block">Broadcast Mode</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setLoopMode(false)}
                                        className={`p-4 rounded-lg border-2 transition-all ${!loopMode
                                            ? 'border-purple-500 bg-purple-50'
                                            : 'border-gray-300 bg-white hover:border-gray-400'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <Send className={`h-4 w-4 ${!loopMode ? 'text-purple-600' : 'text-gray-400'}`} />
                                            <h3 className={`font-bold text-sm ${!loopMode ? 'text-purple-600' : 'text-gray-900'}`}>
                                                One-time
                                            </h3>
                                        </div>
                                        <p className="text-xs text-gray-600">Single broadcast</p>
                                    </button>

                                    <button
                                        onClick={() => setLoopMode(true)}
                                        className={`p-4 rounded-lg border-2 transition-all ${loopMode
                                            ? 'border-orange-500 bg-orange-50'
                                            : 'border-gray-300 bg-white hover:border-gray-400'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <RotateCcw className={`h-4 w-4 ${loopMode ? 'text-orange-600' : 'text-gray-400'}`} />
                                            <h3 className={`font-bold text-sm ${loopMode ? 'text-orange-600' : 'text-gray-900'}`}>
                                                Loop Mode
                                            </h3>
                                        </div>
                                        <p className="text-xs text-gray-600">Continuous broadcast</p>
                                    </button>
                                </div>
                            </div>

                            {/* Loop Interval */}
                            {loopMode && (
                                <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
                                    <Label className="text-gray-700 text-sm mb-2 block">Loop Interval (minutes)</Label>
                                    <Input
                                        type="number"
                                        value={loopInterval}
                                        onChange={(e) => setLoopInterval(parseInt(e.target.value) || 60)}
                                        className="bg-white border-gray-300 text-gray-900 text-center text-lg font-bold"
                                        min={1}
                                    />
                                    <p className="text-xs text-gray-600 mt-2">
                                        Broadcast will repeat every {loopInterval} minutes until stopped
                                    </p>
                                </div>
                            )}

                            {/* Scheduler Mode */}
                            <div className="mb-6">
                                <Label className="text-gray-700 text-sm mb-3 block">Scheduler Mode</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setSafeMode(true)}
                                        className={`p-4 rounded-lg border-2 transition-all ${safeMode
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-300 bg-white hover:border-gray-400'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <Shield className={`h-4 w-4 ${safeMode ? 'text-green-600' : 'text-gray-400'}`} />
                                            <h3 className={`font-bold text-sm ${safeMode ? 'text-green-600' : 'text-gray-900'}`}>
                                                Safe Mode
                                            </h3>
                                        </div>
                                        <p className="text-xs text-gray-600">Auto-calculated delays</p>
                                    </button>

                                    <button
                                        onClick={() => setSafeMode(false)}
                                        className={`p-4 rounded-lg border-2 transition-all ${!safeMode
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-300 bg-white hover:border-gray-400'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <Zap className={`h-4 w-4 ${!safeMode ? 'text-blue-600' : 'text-gray-400'}`} />
                                            <h3 className={`font-bold text-sm ${!safeMode ? 'text-blue-600' : 'text-gray-900'}`}>
                                                Custom Mode
                                            </h3>
                                        </div>
                                        <p className="text-xs text-gray-600">Manual configuration</p>
                                    </button>
                                </div>
                            </div>

                            {safeMode && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                                    <div className="flex items-start gap-2">
                                        <Shield className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-green-700 font-medium text-sm">Safe Mode Active</p>
                                            <p className="text-gray-600 text-xs mt-1">
                                                Delays automatically calculated based on {selectedAccounts.length} accounts and {totalSelectedGroups} groups to prevent rate limits.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Message Delay Range */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <Label className="text-gray-700 text-sm">Message Delay Range</Label>
                                    {safeMode && <span className="text-xs text-green-600">Auto-calculated</span>}
                                </div>

                                {safeMode ? (
                                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="text-center">
                                                <div className="text-3xl font-bold text-gray-900 mb-1">30s</div>
                                                <div className="text-xs text-gray-600">Min</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-3xl font-bold text-gray-900 mb-1">60s</div>
                                                <div className="text-xs text-gray-600">Max</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Input
                                                type="number"
                                                value={customDelayMin}
                                                onChange={(e) => setCustomDelayMin(parseInt(e.target.value) || 1)}
                                                className="bg-white border-gray-300 text-gray-900 text-center text-lg font-bold"
                                                min={1}
                                            />
                                            <div className="text-xs text-gray-600 text-center mt-1">Min (seconds)</div>
                                        </div>
                                        <div>
                                            <Input
                                                type="number"
                                                value={customDelayMax}
                                                onChange={(e) => setCustomDelayMax(parseInt(e.target.value) || 1)}
                                                className="bg-white border-gray-300 text-gray-900 text-center text-lg font-bold"
                                                min={customDelayMin}
                                            />
                                            <div className="text-xs text-gray-600 text-center mt-1">Max (seconds)</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Broadcast Summary */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="text-gray-900 font-semibold text-sm mb-3">Broadcast Summary</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-700">Total Messages:</span>
                                        <span className="text-blue-600 font-medium">{totalSelectedGroups}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-700">Estimated Time:</span>
                                        <span className="text-blue-600 font-medium">
                                            {totalSelectedGroups > 0 ? (
                                                safeMode
                                                    ? `${Math.round((totalSelectedGroups * 45) / 60)} minutes`
                                                    : `${Math.round((totalSelectedGroups * ((customDelayMin + customDelayMax) / 2)) / 60)} minutes`
                                            ) : '0 minutes'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-700">Avg. per Account:</span>
                                        <span className="text-blue-600 font-medium">
                                            {selectedAccounts.length > 0
                                                ? `${(totalSelectedGroups / selectedAccounts.length).toFixed(1)} groups`
                                                : '0 groups'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handleStartBroadcast}
                                disabled={isBroadcasting || selectedAccounts.length === 0 || !messageText.trim()}
                                className="w-full mt-6 bg-green-600 hover:bg-green-700 disabled:opacity-50 h-12 text-base"
                            >
                                {isBroadcasting ? (
                                    <>
                                        <Activity className="h-5 w-5 mr-2 animate-spin" />
                                        Broadcasting...
                                    </>
                                ) : (
                                    <>
                                        <PlayCircle className="h-5 w-5 mr-2" />
                                        Start {safeMode ? 'Safe' : 'Custom'} Broadcast
                                    </>
                                )}
                            </Button>
                        </GlassCard>
                    </div>

                    {/* Right - Terminal */}
                    <GlassCard className="p-6 bg-white border-gray-200">
                        {/* Loop Status */}
                        {activeJobs.some((j: any) => j.progress?.loop_mode) && (
                            <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <h4 className="font-semibold text-sm text-orange-900 mb-3 flex items-center gap-2">
                                    <RotateCcw className="h-4 w-4" />
                                    Loop Status
                                </h4>
                                {activeJobs.filter((j: any) => j.progress?.loop_mode).map((job: any) => (
                                    <div key={job.id} className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-700">Iteration:</span>
                                            <span className="font-bold text-orange-600">#{job.progress.loop_iteration || 1}</span>
                                        </div>
                                        {job.progress.next_cycle_in_minutes !== null && job.progress.next_cycle_in_minutes !== undefined && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-700">Next cycle in:</span>
                                                <span className="font-bold text-blue-600">{job.progress.next_cycle_in_minutes} min</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <TerminalIcon className="h-5 w-5 text-green-600" />
                                Activity Terminal
                            </h2>
                            <Button
                                onClick={() => {
                                    setTerminalLogs([]);
                                    lastLoggedProgress.current = {};
                                }}
                                variant="outline"
                                className="border-gray-300 text-gray-700 h-8 text-xs"
                                size="sm"
                            >
                                Clear
                            </Button>
                        </div>

                        <div
                            ref={terminalRef}
                            className="bg-black rounded-lg p-4 h-[700px] overflow-y-auto font-mono text-xs border border-green-900/30"
                            style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#10b981 #1a1a1a'
                            }}
                        >
                            {terminalLogs.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-600 text-sm">$ Waiting for broadcast...</p>
                                </div>
                            ) : (
                                terminalLogs.map((log, idx) => (
                                    <div
                                        key={idx}
                                        className="text-green-400 mb-1 leading-relaxed"
                                    >
                                        {log}
                                    </div>
                                ))
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

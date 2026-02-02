"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    FileText,
    Search,
    Download,
    Filter,
    CheckCircle,
    XCircle,
    AlertCircle,
    Info,
    ChevronDown,
    ChevronRight,
    Calendar,
    User,
    Send
} from "lucide-react";
import { downloadFile, exportLogsToJSON } from "@/lib/import-export";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function LogsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<string>("all");
    const [filterOperation, setFilterOperation] = useState<string>("all");
    const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

    const { data: logs = [] } = useSWR("/api/logs", fetcher, {
        refreshInterval: 5000 // Auto-refresh every 5 seconds
    });
    const { data: accounts = [] } = useSWR("/api/accounts", fetcher);

    const filteredLogs = logs.filter((log: any) => {
        const matchesSearch = !searchQuery ||
            log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.groupLink?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesType = filterType === "all" || log.type === filterType;
        const matchesOperation = filterOperation === "all" || log.operation === filterOperation;

        return matchesSearch && matchesType && matchesOperation;
    });

    const toggleExpanded = (id: number) => {
        const newExpanded = new Set(expandedLogs);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedLogs(newExpanded);
    };

    const getAccountPhone = (accountId?: number) => {
        if (!accountId) return "System";
        const account = accounts.find((a: any) => a.id === accountId);
        return account?.phone || `Account #${accountId}`;
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "success":
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "error":
                return <XCircle className="h-4 w-4 text-red-500" />;
            case "warning":
                return <AlertCircle className="h-4 w-4 text-yellow-500" />;
            default:
                return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case "success":
                return "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800";
            case "error":
                return "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800";
            case "warning":
                return "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800";
            default:
                return "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800";
        }
    };

    const handleExportLogs = () => {
        const blob = exportLogsToJSON(filteredLogs);
        const filename = `telegram-logs-${new Date().toISOString().split('T')[0]}.json`;
        downloadFile(blob, filename);
    };

    const stats = {
        total: logs.length,
        success: logs.filter((l: any) => l.type === "success").length,
        error: logs.filter((l: any) => l.type === "error").length,
        warning: logs.filter((l: any) => l.type === "warning").length,
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Operation Logs & Reports</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Detailed history of all operations, messages sent, and error reports
                    </p>
                </div>
                <Button onClick={handleExportLogs} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Logs
                </Button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-4 gap-4">
                <GlassCard className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Operations</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                        </div>
                        <FileText className="h-8 w-8 text-blue-500 opacity-50" />
                    </div>
                </GlassCard>

                <GlassCard className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Successful</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.success}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
                    </div>
                </GlassCard>

                <GlassCard className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.error}</p>
                        </div>
                        <XCircle className="h-8 w-8 text-red-500 opacity-50" />
                    </div>
                </GlassCard>

                <GlassCard className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Warnings</p>
                            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.warning}</p>
                        </div>
                        <AlertCircle className="h-8 w-8 text-yellow-500 opacity-50" />
                    </div>
                </GlassCard>
            </div>

            {/* Filters */}
            <GlassCard className="p-4">
                <div className="flex gap-4 items-center">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search logs by message, group, or error..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <div className="flex gap-2">
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                        >
                            <option value="all">All Types</option>
                            <option value="success">Success</option>
                            <option value="error">Errors</option>
                            <option value="warning">Warnings</option>
                            <option value="info">Info</option>
                        </select>

                        <select
                            value={filterOperation}
                            onChange={(e) => setFilterOperation(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                        >
                            <option value="all">All Operations</option>
                            <option value="broadcast">Broadcast</option>
                            <option value="join">Join Group</option>
                            <option value="login">Login</option>
                            <option value="import">Import</option>
                        </select>
                    </div>
                </div>
            </GlassCard>

            {/* Logs List */}
            <GlassCard className="p-0 overflow-hidden">
                <div className="max-h-[600px] overflow-y-auto">
                    {filteredLogs.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No logs found matching your filters
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredLogs.map((log: any) => {
                                const isExpanded = expandedLogs.has(log.id);

                                return (
                                    <div
                                        key={log.id}
                                        className={`p-4 border-l-4 ${getTypeColor(log.type)} hover:bg-gray-50 dark:hover:bg-white/5 transition-colors`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1">
                                                {getTypeIcon(log.type)}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-4 mb-2">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            {log.message}
                                                        </p>
                                                        {log.groupLink && (
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Send className="h-3 w-3 text-gray-400" />
                                                                <a
                                                                    href={log.groupLink}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                                                >
                                                                    {log.groupLink}
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-xs">
                                                            {log.operation || "other"}
                                                        </Badge>
                                                        {(log.errorCode || log.errorDetails) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => toggleExpanded(log.id)}
                                                                className="h-6 w-6 p-0"
                                                            >
                                                                {isExpanded ? (
                                                                    <ChevronDown className="h-4 w-4" />
                                                                ) : (
                                                                    <ChevronRight className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(log.createdAt).toLocaleString()}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        {getAccountPhone(log.accountId)}
                                                    </div>
                                                    {log.errorCode && (
                                                        <Badge variant="destructive" className="text-xs">
                                                            {log.errorCode}
                                                        </Badge>
                                                    )}
                                                </div>

                                                {isExpanded && log.errorDetails && (
                                                    <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                                        <p className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                            {log.errorDetails}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </GlassCard>
        </div>
    );
}

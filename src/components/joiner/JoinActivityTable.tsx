"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Search,
    Download,
    Trash2,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
} from "lucide-react";

export interface JoinLog {
    id: number;
    timestamp: Date;
    account: string;
    groupLink: string;
    status: 'success' | 'failed' | 'joining' | 'queued';
    message: string;
    duration?: number;
}

interface JoinActivityTableProps {
    logs: JoinLog[];
    onClear: () => void;
    onExportCSV: () => void;
}

export function JoinActivityTable({ logs, onClear, onExportCSV }: JoinActivityTableProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'timestamp' | 'account' | 'status'>('timestamp');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Filter logs
    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.account.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.groupLink.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.message.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = !statusFilter || log.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Sort logs
    const sortedLogs = [...filteredLogs].sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
            case 'timestamp':
                comparison = a.timestamp.getTime() - b.timestamp.getTime();
                break;
            case 'account':
                comparison = a.account.localeCompare(b.account);
                break;
            case 'status':
                comparison = a.status.localeCompare(b.status);
                break;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Calculate stats
    const stats = {
        total: logs.length,
        success: logs.filter(l => l.status === 'success').length,
        failed: logs.filter(l => l.status === 'failed').length,
        joining: logs.filter(l => l.status === 'joining').length,
        queued: logs.filter(l => l.status === 'queued').length,
    };

    const getStatusIcon = (status: JoinLog['status']) => {
        switch (status) {
            case 'success':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'failed':
                return <XCircle className="h-4 w-4 text-red-500" />;
            case 'joining':
                return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
            case 'queued':
                return <Clock className="h-4 w-4 text-gray-400" />;
        }
    };

    const getStatusBadge = (status: JoinLog['status']) => {
        const variants = {
            success: 'default',
            failed: 'destructive',
            joining: 'default',
            queued: 'outline',
        } as const;

        return (
            <Badge variant={variants[status]} className="gap-1">
                {getStatusIcon(status)}
                {status}
            </Badge>
        );
    };

    const getRowColor = (status: JoinLog['status']) => {
        switch (status) {
            case 'success':
                return 'bg-green-50 dark:bg-green-950/20';
            case 'failed':
                return 'bg-red-50 dark:bg-red-950/20';
            case 'joining':
                return 'bg-blue-50 dark:bg-blue-950/20';
            default:
                return '';
        }
    };

    const handleSort = (column: typeof sortBy) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Join Activity
                </h3>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onExportCSV}
                        disabled={logs.length === 0}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onClear}
                        disabled={logs.length === 0}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-5 gap-3">
                <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stats.total}
                    </div>
                    {stats.total >= 100 && (
                        <div className="text-[10px] text-orange-600 dark:text-orange-400 mt-1">Max 100</div>
                    )}
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                    <div className="text-xs text-green-600 dark:text-green-400">Success</div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {stats.success}
                    </div>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                    <div className="text-xs text-blue-600 dark:text-blue-400">Joining</div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {stats.joining}
                    </div>
                </div>
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                    <div className="text-xs text-red-600 dark:text-red-400">Failed</div>
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                        {stats.failed}
                    </div>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Queued</div>
                    <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                        {stats.queued}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search account, group, or message..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button
                    variant={statusFilter === null ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(null)}
                >
                    All
                </Button>
                <Button
                    variant={statusFilter === 'success' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('success')}
                >
                    Success
                </Button>
                <Button
                    variant={statusFilter === 'failed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('failed')}
                >
                    Failed
                </Button>
            </div>

            {/* Table */}
            <div className="flex-1 border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                <ScrollArea className="h-full">
                    <Table>
                        <TableHeader className="sticky top-0 bg-gray-50 dark:bg-gray-900 z-10">
                            <TableRow>
                                <TableHead
                                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                                    onClick={() => handleSort('timestamp')}
                                >
                                    Timestamp {sortBy === 'timestamp' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                                    onClick={() => handleSort('account')}
                                >
                                    Account {sortBy === 'account' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </TableHead>
                                <TableHead>Group Link</TableHead>
                                <TableHead
                                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                                    onClick={() => handleSort('status')}
                                >
                                    Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </TableHead>
                                <TableHead>Message</TableHead>
                                <TableHead>Duration</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                        {logs.length === 0
                                            ? "No activity yet. Start joining groups to see logs."
                                            : "No results match your filters"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedLogs.map((log) => (
                                    <TableRow key={log.id} className={getRowColor(log.status)}>
                                        <TableCell className="font-mono text-xs">
                                            {log.timestamp.toLocaleTimeString()}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {log.account}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs max-w-xs truncate">
                                            {log.groupLink}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(log.status)}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {log.message}
                                        </TableCell>
                                        <TableCell className="text-xs text-gray-600 dark:text-gray-400">
                                            {log.duration ? `${log.duration.toFixed(1)}s` : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>

            {/* Footer Info */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {sortedLogs.length} of {logs.length} entries
            </div>
        </div>
    );
}

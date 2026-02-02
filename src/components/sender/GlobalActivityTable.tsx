"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock, Loader2, Download, Trash2, Search } from "lucide-react";

export interface ActivityLog {
    id: number;
    timestamp: Date;
    account: string;
    targetGroup: string;
    status: 'sent' | 'sending' | 'failed' | 'queued';
    message: string;
    duration?: number; // in seconds
    error?: string;
}

interface GlobalActivityTableProps {
    logs: ActivityLog[];
    onClear?: () => void;
    onExportCSV?: () => void;
}

export function GlobalActivityTable({
    logs,
    onClear,
    onExportCSV,
}: GlobalActivityTableProps) {
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortColumn, setSortColumn] = useState<string>("timestamp");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

    // Filter and sort logs
    const filteredLogs = logs
        .filter(log => {
            // Status filter
            if (filterStatus !== "all" && log.status !== filterStatus) {
                return false;
            }
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                    log.account.toLowerCase().includes(query) ||
                    log.targetGroup.toLowerCase().includes(query) ||
                    log.message.toLowerCase().includes(query)
                );
            }
            return true;
        })
        .sort((a, b) => {
            let comparison = 0;
            if (sortColumn === "timestamp") {
                comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            } else if (sortColumn === "account") {
                comparison = a.account.localeCompare(b.account);
            } else if (sortColumn === "status") {
                comparison = a.status.localeCompare(b.status);
            }
            return sortDirection === "asc" ? comparison : -comparison;
        });

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("desc");
        }
    };

    const getStatusBadge = (status: ActivityLog['status']) => {
        switch (status) {
            case 'sent':
                return (
                    <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Sent
                    </Badge>
                );
            case 'failed':
                return (
                    <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                    </Badge>
                );
            case 'sending':
                return (
                    <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Sending
                    </Badge>
                );
            case 'queued':
                return (
                    <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">
                        <Clock className="h-3 w-3 mr-1" />
                        Queued
                    </Badge>
                );
        }
    };

    const stats = {
        total: logs.length,
        sent: logs.filter(l => l.status === 'sent').length,
        failed: logs.filter(l => l.status === 'failed').length,
        sending: logs.filter(l => l.status === 'sending').length,
    };

    return (
        <div className="flex flex-col h-full border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-950">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Global Activity Monitor
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {onExportCSV && (
                            <Button variant="outline" size="sm" onClick={onExportCSV}>
                                <Download className="h-3 w-3 mr-1" />
                                Export CSV
                            </Button>
                        )}
                        {onClear && logs.length > 0 && (
                            <Button variant="outline" size="sm" onClick={onClear}>
                                <Trash2 className="h-3 w-3 mr-1" />
                                Clear
                            </Button>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 text-center">
                        <div className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                        {stats.total >= 100 && (
                            <div className="text-[10px] text-orange-600 dark:text-orange-400 mt-1">Max 100</div>
                        )}
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-2 text-center">
                        <div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.sent}</div>
                        <div className="text-xs text-green-700 dark:text-green-500">Sent</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-2 text-center">
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.sending}</div>
                        <div className="text-xs text-blue-700 dark:text-blue-500">Sending</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-2 text-center">
                        <div className="text-xl font-bold text-red-600 dark:text-red-400">{stats.failed}</div>
                        <div className="text-xs text-red-700 dark:text-red-500">Failed</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mt-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search account, group, or message..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9"
                        />
                    </div>
                    <div className="flex gap-1">
                        <Button
                            variant={filterStatus === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilterStatus("all")}
                        >
                            All
                        </Button>
                        <Button
                            variant={filterStatus === "sent" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilterStatus("sent")}
                        >
                            Sent
                        </Button>
                        <Button
                            variant={filterStatus === "failed" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilterStatus("failed")}
                        >
                            Failed
                        </Button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <ScrollArea className="flex-1">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead
                                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
                                onClick={() => handleSort("timestamp")}
                            >
                                Timestamp {sortColumn === "timestamp" && (sortDirection === "asc" ? "↑" : "↓")}
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
                                onClick={() => handleSort("account")}
                            >
                                Account {sortColumn === "account" && (sortDirection === "asc" ? "↑" : "↓")}
                            </TableHead>
                            <TableHead>Target Group</TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
                                onClick={() => handleSort("status")}
                            >
                                Status {sortColumn === "status" && (sortDirection === "asc" ? "↑" : "↓")}
                            </TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead className="text-right">Duration</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLogs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    {logs.length === 0
                                        ? "No activity yet. Start broadcasting to see logs here."
                                        : "No results found for the current filters."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredLogs.map((log) => (
                                <TableRow key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                    <TableCell className="font-mono text-xs text-gray-600 dark:text-gray-400">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </TableCell>
                                    <TableCell className="font-medium text-sm">
                                        {log.account}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                                        {log.targetGroup}
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(log.status)}
                                    </TableCell>
                                    <TableCell className="max-w-md">
                                        <div className="truncate text-sm text-gray-600 dark:text-gray-400" title={log.message}>
                                            {log.message}
                                        </div>
                                        {log.error && (
                                            <div className="text-xs text-red-500 mt-1 truncate" title={log.error}>
                                                {log.error}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right text-sm text-gray-600 dark:text-gray-400">
                                        {log.duration ? `${log.duration.toFixed(1)}s` : '-'}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>

            {/* Footer */}
            {filteredLogs.length > 0 && (
                <div className="p-3 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400 text-center">
                    Showing {filteredLogs.length} of {logs.length} activities
                </div>
            )}
        </div>
    );
}

"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X, Loader2, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface Job {
    id: string;
    type: string;
    status: "queued" | "running" | "completed" | "failed" | "cancelled";
    progress: {
        total: number;
        completed: number;
        failed: number;
        current: string;
        per_account?: Record<string, {
            completed: number;
            failed: number;
            status: string;
            current_group: string;
            total_groups?: number;
            next_action_eta?: string;
        }>;
    };
    logs?: Array<{
        timestamp: string;
        message: string;
        level: string;
        account?: string;
    }>;
    created_at: string;
    started_at?: string;
    completed_at?: string;
    error?: string;
}

interface JobStatusCardProps {
    job: Job;
    onCancel?: () => void;
}

export function JobStatusCard({ job, onCancel }: JobStatusCardProps) {
    const [expanded, setExpanded] = useState(false);

    const getStatusIcon = () => {
        switch (job.status) {
            case "running":
                return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
            case "completed":
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "failed":
                return <XCircle className="h-4 w-4 text-red-500" />;
            case "cancelled":
                return <XCircle className="h-4 w-4 text-orange-500" />;
            case "queued":
                return <Clock className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusBadgeVariant = () => {
        switch (job.status) {
            case "running":
                return "default";
            case "completed":
                return "success";
            case "failed":
                return "destructive";
            default:
                return "secondary";
        }
    };

    const getAccountStatusColor = (status: string) => {
        switch (status) {
            case "joining":
            case "broadcasting":
            case "sending":
                return "text-blue-600 dark:text-blue-400";
            case "waiting":
                return "text-yellow-600 dark:text-yellow-400";
            case "completed":
                return "text-green-600 dark:text-green-400";
            case "failed":
                return "text-red-600 dark:text-red-400";
            default:
                return "text-gray-600 dark:text-gray-400";
        }
    };

    const progressPercent = job.progress.total > 0
        ? (job.progress.completed / job.progress.total) * 100
        : 0;

    const timeAgo = job.started_at
        ? formatDistanceToNow(new Date(job.started_at), { addSuffix: true })
        : formatDistanceToNow(new Date(job.created_at), { addSuffix: true });

    const perAccountData = job.progress.per_account || {};
    const accountPhones = Object.keys(perAccountData);
    const hasPerAccountData = accountPhones.length > 0;

    return (
        <Card className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1">
                    {getStatusIcon()}
                    <div className="flex-1">
                        <div className="font-semibold text-sm text-gray-900 dark:text-white">
                            Job #{job.id.slice(-8)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {job.type === "join" ? "Group Join" : "Broadcast"} • {timeAgo}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant() as any} className="text-xs">
                        {job.status}
                    </Badge>
                    {job.status === "running" && onCancel && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onCancel}
                            className="h-7 w-7 p-0"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Overall Progress */}
            {job.status === "running" && (
                <>
                    <Progress value={progressPercent} className="mb-2" />
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                        <span>{job.progress.completed} / {job.progress.total} completed</span>
                        <span>{job.progress.failed} failed</span>
                    </div>
                    {job.progress.current && (
                        <div className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                            {job.progress.current}
                        </div>
                    )}
                </>
            )}

            {job.status === "completed" && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                    ✅ {job.progress.completed} succeeded, {job.progress.failed} failed
                </div>
            )}

            {job.status === "failed" && job.error && (
                <div className="text-xs text-red-600 dark:text-red-400">
                    Error: {job.error}
                </div>
            )}

            {/* Per-Account Details (Expandable) */}
            {hasPerAccountData && (
                <div className="mt-3 border-t border-gray-200 dark:border-gray-800 pt-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpanded(!expanded)}
                        className="w-full flex items-center justify-between text-xs"
                    >
                        <span className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            Per-Account Details ({accountPhones.length} accounts)
                        </span>
                        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>

                    {expanded && (
                        <div className="mt-2 space-y-2">
                            {accountPhones.map(phone => {
                                const accountData = perAccountData[phone];
                                const accountProgress = accountData.total_groups && accountData.total_groups > 0
                                    ? (accountData.completed / accountData.total_groups) * 100
                                    : 0;

                                return (
                                    <div key={phone} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-medium text-gray-900 dark:text-white">
                                                {phone}
                                            </span>
                                            <span className={`text-xs font-medium ${getAccountStatusColor(accountData.status)}`}>
                                                {accountData.status}
                                            </span>
                                        </div>

                                        {accountData.total_groups && accountData.total_groups > 0 && (
                                            <>
                                                <Progress value={accountProgress} className="h-1 mb-1" />
                                                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                                                    <span>{accountData.completed} / {accountData.total_groups}</span>
                                                    <span className="text-red-500">{accountData.failed} failed</span>
                                                </div>
                                            </>
                                        )}

                                        {accountData.current_group && (
                                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate">
                                                📍 {accountData.current_group}
                                            </div>
                                        )}

                                        {/* Account-specific logs */}
                                        {job.logs && job.logs.filter(log => log.account === phone).slice(-2).map((log, idx) => (
                                            <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                                                {log.message}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}

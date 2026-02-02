"use client";

import { useState } from "react";
import { MessageSquare, Users, ChevronDown, ChevronUp } from "lucide-react";
import useSWR from "swr";
import { TerminalModal } from "@/components/sender/TerminalModal";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface AccountJobModalProps {
    isOpen: boolean;
    onClose: () => void;
    accountPhone: string;
    job: any;
}

function AccountJobModal({ isOpen, onClose, accountPhone, job }: AccountJobModalProps) {
    if (!isOpen) return null;

    const accountData = job.progress?.per_account?.[accountPhone];
    const accountLogs = (job.logs || []).filter((log: any) => log.account === accountPhone);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="w-[600px] max-h-[80vh] bg-white dark:bg-gray-900 rounded-lg shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        📱 {accountPhone}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {job.type === 'broadcast' ? '📤 Broadcasting' : '👥 Joining Groups'}
                    </p>
                </div>

                {/* Progress Stats */}
                <div className="p-4 grid grid-cols-3 gap-3 bg-gray-50 dark:bg-gray-800">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {accountData?.completed || 0}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Completed</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {accountData?.failed || 0}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Failed</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {accountData?.total_groups || 0}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                    </div>
                </div>

                {/* Current Status */}
                {accountData?.current_group && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            🎯 Current: <span className="text-blue-600 dark:text-blue-400">{accountData.current_group}</span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Status: {accountData.status}
                        </div>
                    </div>
                )}

                {/* Activity Logs */}
                <div className="flex-1 overflow-y-auto p-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Recent Activity</h3>
                    {accountLogs.length === 0 ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                            No logs yet
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {accountLogs.slice(-15).reverse().map((log: any, idx: number) => (
                                <div key={idx} className="text-xs p-2 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold ${log.level === 'success' ? 'text-green-600' :
                                            log.level === 'error' ? 'text-red-600' : 'text-blue-600'
                                            }`}>
                                            {log.level === 'success' ? '✅' : log.level === 'error' ? '❌' : 'ℹ️'}
                                        </span>
                                        <span className="text-gray-700 dark:text-gray-300">{log.message}</span>
                                    </div>
                                    <div className="text-gray-400 text-[10px] mt-1">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export function FloatingJobMonitor() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
    const [selectedJob, setSelectedJob] = useState<any>(null);

    // Fetch all jobs
    const { data: jobsData } = useSWR("/api/jobs", fetcher, { refreshInterval: 2000 });
    const jobs = jobsData?.jobs || [];

    // Get active jobs
    const activeJobs = jobs.filter((job: any) => job.status === 'running');

    // Collect accounts with active jobs
    const activeAccounts = activeJobs.flatMap((job: any) => {
        const perAccount = job.progress?.per_account || {};
        return Object.keys(perAccount).map(phone => ({
            phone,
            job,
            ...perAccount[phone]
        }));
    });

    if (activeAccounts.length === 0) return null;

    const handleAccountClick = (phone: string, job: any) => {
        setSelectedAccount(phone);
        setSelectedJob(job);
    };

    return (
        <>
            {/* Main FAB */}
            <div className="relative">
                {/* Expanded List */}
                {isExpanded && (
                    <div className="absolute bottom-16 right-0 w-80 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-2">
                        <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                            <h3 className="font-bold text-sm">Active Jobs ({activeAccounts.length})</h3>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {activeAccounts.map((account: any, idx: number) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAccountClick(account.phone, account.job)}
                                    className="w-full p-3 hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors text-left"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {account.job.type === 'broadcast' ? (
                                                <MessageSquare className="h-4 w-4 text-blue-500" />
                                            ) : (
                                                <Users className="h-4 w-4 text-green-500" />
                                            )}
                                            <span className="font-medium text-sm text-gray-900 dark:text-white">
                                                {account.phone}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {account.completed}/{account.total_groups}
                                        </span>
                                    </div>
                                    <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                        <div
                                            className="bg-blue-600 h-1.5 rounded-full transition-all"
                                            style={{ width: `${(account.completed / account.total_groups * 100) || 0}%` }}
                                        />
                                    </div>
                                    {account.current_group && (
                                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 truncate">
                                            📍 {account.current_group}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Toggle Button */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="relative group"
                >
                    {/* Glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>

                    {/* Main Button */}
                    <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full px-4 py-3 shadow-2xl transition-all duration-200 group-hover:scale-110 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        <span className="font-bold text-sm">{activeAccounts.length}</span>
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </div>

                    {/* Badge */}
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg animate-pulse">
                        {activeAccounts.length}
                    </div>
                </button>
            </div>

            {/* Account Detail Modal */}
            {selectedAccount && selectedJob && (
                <AccountJobModal
                    isOpen={!!selectedAccount}
                    onClose={() => {
                        setSelectedAccount(null);
                        setSelectedJob(null);
                    }}
                    accountPhone={selectedAccount}
                    job={selectedJob}
                />
            )}
        </>
    );
}

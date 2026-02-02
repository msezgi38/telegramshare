"use client";

import { useState } from "react";
import { Search, Users, Tag, CheckCircle2, Circle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Account {
    id: number;
    phone: string;
    status: 'active' | 'banned' | 'rate-limited';
    groupCount: number;
    tags?: string[];
}

interface AccountGroup {
    name: string;
    color: string;
    accounts: Account[];
}

interface AccountFleetSidebarProps {
    accounts: Account[];
    selectedAccountIds: number[];
    onSelectionChange: (ids: number[]) => void;
    onViewGroups?: (accountId: number) => void;
    jobs?: Array<{
        id: string;
        type: string;
        status: string;
        progress: {
            per_account?: Record<string, {
                completed: number;
                failed: number;
                total_groups?: number;
                status: string;
                current_group?: string;
            }>;
        };
    }>;
}

export function AccountFleetSidebar({
    accounts,
    selectedAccountIds,
    onSelectionChange,
    onViewGroups,
    jobs = [],
}: AccountFleetSidebarProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["All Accounts"]));

    // Find active job for account
    const getAccountJob = (phone: string) => {
        const activeJob = jobs.find(job =>
            (job.status === "running" || job.status === "queued") &&
            job.progress.per_account?.[phone]
        );
        return activeJob;
    };

    // Group accounts by tags (simplified grouping for now)
    const groupedAccounts: AccountGroup[] = [
        {
            name: "All Accounts",
            color: "blue",
            accounts: accounts,
        },
    ];

    // Filter accounts based on search
    const filteredGroups = groupedAccounts.map(group => ({
        ...group,
        accounts: group.accounts.filter(acc =>
            acc.phone.toLowerCase().includes(searchQuery.toLowerCase())
        ),
    })).filter(group => group.accounts.length > 0);

    // Status indicator
    const getStatusIcon = (status: Account['status']) => {
        switch (status) {
            case 'active':
                return <div className="w-2 h-2 bg-green-500 rounded-full" />;
            case 'banned':
                return <div className="w-2 h-2 bg-red-500 rounded-full" />;
            case 'rate-limited':
                return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
        }
    };

    const toggleAccountSelection = (accountId: number) => {
        if (selectedAccountIds.includes(accountId)) {
            onSelectionChange(selectedAccountIds.filter(id => id !== accountId));
        } else {
            onSelectionChange([...selectedAccountIds, accountId]);
        }
    };

    const selectAllAccounts = () => {
        onSelectionChange(accounts.map(acc => acc.id));
    };

    const deselectAllAccounts = () => {
        onSelectionChange([]);
    };

    const toggleGroup = (groupName: string) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(groupName)) {
            newExpanded.delete(groupName);
        } else {
            newExpanded.add(groupName);
        }
        setExpandedGroups(newExpanded);
    };

    return (
        <aside className="w-80 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-3">
                    <Users className="h-5 w-5 text-blue-500" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Fleet Manager
                    </h2>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search accounts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9"
                    />
                </div>
            </div>

            {/* Quick Actions */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllAccounts}
                    className="flex-1 text-xs"
                >
                    Select All ({accounts.length})
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAllAccounts}
                    className="flex-1 text-xs"
                >
                    Clear
                </Button>
            </div>

            {/* Selection Counter */}
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-700 dark:text-blue-300 font-medium">
                        {selectedAccountIds.length} Selected
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 text-xs">
                        {selectedAccountIds.length * accounts[0]?.groupCount || 0} total groups
                    </span>
                </div>
            </div>

            {/* Account List */}
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {filteredGroups.map((group) => (
                        <div key={group.name} className="mb-2">
                            {/* Group Header */}
                            <button
                                onClick={() => toggleGroup(group.name)}
                                className="w-full flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {group.name}
                                    </span>
                                    <Badge variant="secondary" className="text-xs">
                                        {group.accounts.length}
                                    </Badge>
                                </div>
                                <div className="text-gray-400">
                                    {expandedGroups.has(group.name) ? "▼" : "▶"}
                                </div>
                            </button>

                            {/* Account Cards */}
                            {expandedGroups.has(group.name) && (
                                <div className="mt-1 space-y-1 ml-2">
                                    {group.accounts.map((account) => {
                                        const isSelected = selectedAccountIds.includes(account.id);
                                        return (
                                            <div
                                                key={account.id}
                                                onClick={() => toggleAccountSelection(account.id)}
                                                className={`w-full p-3 rounded-lg border transition-all cursor-pointer ${isSelected
                                                    ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700"
                                                    : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                                                    }`}
                                            >
                                                <div className="w-full">
                                                    <div className="flex items-start justify-between" onClick={() => toggleAccountSelection(account.id)}>
                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            {/* Selection Indicator */}
                                                            {isSelected ? (
                                                                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                                                            ) : (
                                                                <Circle className="h-4 w-4 text-gray-400 shrink-0" />
                                                            )}

                                                            {/* Account Info */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    {getStatusIcon(account.status)}
                                                                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                        {account.phone}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {account.groupCount} groups
                                                                    </Badge>
                                                                    {account.status !== 'active' && (
                                                                        <Badge
                                                                            variant={account.status === 'banned' ? 'destructive' : 'default'}
                                                                            className="text-xs"
                                                                        >
                                                                            {account.status}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Inline Job Progress */}
                                                    {(() => {
                                                        const job = getAccountJob(account.phone);
                                                        if (!job) return null;

                                                        const accountData = job.progress.per_account?.[account.phone];
                                                        if (!accountData) return null;

                                                        const progress = accountData.total_groups && accountData.total_groups > 0
                                                            ? (accountData.completed / accountData.total_groups) * 100
                                                            : 0;

                                                        return (
                                                            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                                                        {accountData.status}
                                                                    </span>
                                                                    <span className="text-xs text-blue-600 dark:text-blue-400">
                                                                        {accountData.completed}/{accountData.total_groups || 0}
                                                                    </span>
                                                                </div>
                                                                <div className="w-full bg-blue-100 dark:bg-blue-900/40 rounded-full h-1.5 mb-1">
                                                                    <div
                                                                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                                                        style={{ width: `${progress}%` }}
                                                                    />
                                                                </div>
                                                                {accountData.current_group && (
                                                                    <div className="text-xs text-blue-600 dark:text-blue-400 truncate">
                                                                        📍 {accountData.current_group}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                    {/* View Groups Button */}
                                                    {onViewGroups && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="w-full mt-2 text-xs"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onViewGroups(account.id);
                                                            }}
                                                        >
                                                            View Groups
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* Footer Stats */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-800">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-gray-600 dark:text-gray-400">Active</span>
                        </div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                            {accounts.filter(a => a.status === 'active').length}
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                            <span className="text-gray-600 dark:text-gray-400">Limited</span>
                        </div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                            {accounts.filter(a => a.status === 'rate-limited').length}
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            <span className="text-gray-600 dark:text-gray-400">Banned</span>
                        </div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                            {accounts.filter(a => a.status === 'banned').length}
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}

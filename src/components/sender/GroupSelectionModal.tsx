"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, CheckCircle2, Circle } from "lucide-react";

interface Group {
    id: number;
    groupLink: string;
    groupName?: string;
    groupUsername?: string;
    memberCount?: number;
    status?: string;
}

interface GroupSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    accountPhone: string;
    groups: Group[];
    selectedGroupIds: number[];
    onGroupSelectionChange: (groupIds: number[]) => void;
}

export function GroupSelectionModal({
    isOpen,
    onClose,
    accountPhone,
    groups,
    selectedGroupIds,
    onGroupSelectionChange,
}: GroupSelectionModalProps) {
    const [searchQuery, setSearchQuery] = useState("");

    // Filter groups based on search
    const filteredGroups = groups.filter(group => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            group.groupLink?.toLowerCase().includes(query) ||
            group.groupName?.toLowerCase().includes(query) ||
            group.groupUsername?.toLowerCase().includes(query)
        );
    });

    const toggleGroup = (groupId: number) => {
        if (selectedGroupIds.includes(groupId)) {
            onGroupSelectionChange(selectedGroupIds.filter(id => id !== groupId));
        } else {
            onGroupSelectionChange([...selectedGroupIds, groupId]);
        }
    };

    const selectAllGroups = () => {
        onGroupSelectionChange(filteredGroups.map(g => g.id));
    };

    const deselectAllGroups = () => {
        onGroupSelectionChange([]);
    };

    const selectedCount = selectedGroupIds.length;
    const totalCount = groups.length;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl h-[85vh] p-0 gap-0 flex flex-col">
                <DialogHeader className="flex-none p-6 pb-4 border-b border-gray-200 dark:border-gray-800">
                    <DialogTitle className="flex items-center justify-between">
                        <div>
                            <div className="text-lg font-semibold">Group Selection</div>
                            <div className="text-sm font-normal text-gray-600 dark:text-gray-400 mt-1">
                                {accountPhone}
                            </div>
                        </div>
                        <Badge variant="outline" className="ml-2">
                            {selectedCount} / {totalCount} selected
                        </Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden p-6 pt-4 space-y-4 flex flex-col">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search groups by name, link, or username..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={selectAllGroups}
                            className="flex-1"
                        >
                            Select All {searchQuery && `(${filteredGroups.length})`}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={deselectAllGroups}
                            className="flex-1"
                        >
                            Deselect All
                        </Button>
                    </div>

                    {/* Groups List */}
                    <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="space-y-2 pb-2 pr-4">
                                {filteredGroups.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        {groups.length === 0
                                            ? "No groups found for this account"
                                            : "No groups match your search"}
                                    </div>
                                ) : (
                                    filteredGroups.map((group) => {
                                        const isSelected = selectedGroupIds.includes(group.id);
                                        return (
                                            <div
                                                key={group.id}
                                                onClick={() => toggleGroup(group.id)}
                                                className={`w-full p-3 rounded-lg border transition-all text-left cursor-pointer ${isSelected
                                                    ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700"
                                                    : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                                                    }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    {/* Checkbox */}
                                                    <div className="shrink-0 mt-1" onClick={(e) => e.stopPropagation()}>
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={() => toggleGroup(group.id)}
                                                            className="h-5 w-5"
                                                        />
                                                    </div>

                                                    {/* Group Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-gray-900 dark:text-white truncate">
                                                            {group.groupName || group.groupLink}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
                                                            {group.groupUsername && (
                                                                <span>@{group.groupUsername}</span>
                                                            )}
                                                            {group.memberCount && (
                                                                <>
                                                                    {group.groupUsername && <span>•</span>}
                                                                    <span>{group.memberCount.toLocaleString()} members</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        {group.groupLink && group.groupName && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate">
                                                                {group.groupLink}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Status Badge */}
                                                    {group.status && (
                                                        <Badge
                                                            variant="outline"
                                                            className="shrink-0 text-xs"
                                                        >
                                                            {group.status}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Footer */}
                    <div className="flex-none flex items-center justify-between pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            {selectedCount} groups selected
                            {searchQuery && filteredGroups.length < totalCount && (
                                <span className="ml-2">
                                    ({filteredGroups.length} shown)
                                </span>
                            )}
                        </div>
                        <Button onClick={onClose}>
                            Done
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

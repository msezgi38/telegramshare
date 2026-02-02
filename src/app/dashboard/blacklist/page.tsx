"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { ShieldBan, Trash2, Plus, Ban } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function BlacklistPage() {
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [newLink, setNewLink] = useState("");
    const [newReason, setNewReason] = useState("");
    const [showAddDialog, setShowAddDialog] = useState(false);

    // Fetch accounts
    const { data: accounts = [] } = useSWR("/api/accounts", fetcher);

    // Fetch blacklist for selected account
    const { data: blacklist = [], mutate: mutateBlacklist } = useSWR(
        selectedAccountId ? `/api/accounts/${selectedAccountId}/blacklist` : null,
        fetcher
    );

    const handleAddToBlacklist = async () => {
        if (!newLink.trim() || !selectedAccountId) {
            toast.error("Please enter a group link and select an account");
            return;
        }

        try {
            await fetch(`/api/accounts/${selectedAccountId}/blacklist`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    link: newLink,
                    reason: newReason || "Manually blacklisted",
                }),
            });

            await mutateBlacklist();
            setNewLink("");
            setNewReason("");
            setShowAddDialog(false);
            toast.success("Added to blacklist!");
        } catch (error: any) {
            toast.error("Failed to add to blacklist");
        }
    };

    const handleRemoveFromBlacklist = async (itemId: number) => {
        try {
            await fetch(`/api/accounts/${selectedAccountId}/blacklist?itemId=${itemId}`, {
                method: "DELETE",
            });

            await mutateBlacklist();
            toast.success("Removed from blacklist!");
        } catch (error: any) {
            toast.error("Failed to remove from blacklist");
        }
    };

    return (
        <div className="container mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <ShieldBan className="h-8 w-8 text-red-500" />
                        Blacklist Management
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Manage blocked groups per account. Blacklisted groups will be skipped during broadcasts.
                    </p>
                </div>
                {selectedAccountId && (
                    <Button
                        onClick={() => setShowAddDialog(!showAddDialog)}
                        className="bg-red-500 hover:bg-red-600"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Blacklist
                    </Button>
                )}
            </div>

            {/* Account Selection */}
            <GlassCard className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Select Account
                </h3>
                <div className="flex gap-2 flex-wrap">
                    {accounts.length === 0 ? (
                        <p className="text-sm text-gray-500"> No accounts available</p>
                    ) : (
                        accounts.map((acc: any) => (
                            <Button
                                key={acc.id}
                                variant={selectedAccountId === acc.phone ? "default" : "outline"}
                                onClick={() => setSelectedAccountId(acc.phone)}
                                className="flex items-center gap-2"
                            >
                                {acc.phone}
                                {selectedAccountId === acc.phone && (
                                    <Badge variant="secondary" className="ml-2">
                                        {blacklist.length}
                                    </Badge>
                                )}
                            </Button>
                        ))
                    )}
                </div>
            </GlassCard>

            {/* Add Dialog */}
            {showAddDialog && selectedAccountId && (
                <GlassCard className="p-6 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Ban className="h-5 w-5 text-red-500" />
                        Add to Blacklist
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                Group Link
                            </label>
                            <Input
                                placeholder="https://t.me/groupname or @username"
                                value={newLink}
                                onChange={(e) => setNewLink(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                Reason (Optional)
                            </label>
                            <Textarea
                                placeholder="Why are you blacklisting this group?"
                                value={newReason}
                                onChange={(e) => setNewReason(e.target.value)}
                                rows={2}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleAddToBlacklist} className="flex-1 bg-red-500 hover:bg-red-600">
                                <ShieldBan className="h-4 w-4 mr-2" />
                                Blacklist
                            </Button>
                            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </GlassCard>
            )}

            {/* Blacklist Table */}
            {selectedAccountId && (
                <GlassCard className="p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                        Blacklisted Groups ({blacklist.length})
                    </h3>

                    {blacklist.length === 0 ? (
                        <div className="text-center py-12">
                            <ShieldBan className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">
                                No blacklisted groups for this account
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAddDialog(true)}
                                className="mt-4"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add First Entry
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {blacklist.map((item: any) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-800 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <Ban className="h-4 w-4 text-red-500 shrink-0" />
                                            <span className="font-mono text-sm text-gray-900 dark:text-white truncate">
                                                {item.link}
                                            </span>
                                            <Badge variant="destructive" className="text-xs shrink-0">
                                                Fails: {item.failCount}
                                            </Badge>
                                        </div>
                                        {item.reason && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 ml-7">
                                                {item.reason}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 ml-7 mt-1">
                                            Blacklisted: {new Date(item.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveFromBlacklist(item.id)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </GlassCard>
            )}

            {!selectedAccountId && (
                <div className="text-center py-12">
                    <ShieldBan className="h-20 w-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-lg text-gray-500 dark:text-gray-400">
                        Select an account to manage its blacklist
                    </p>
                </div>
            )}
        </div>
    );
}

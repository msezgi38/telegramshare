"use client";

import { useState } from "react";
import useSWR from "swr";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical, Smartphone, Users, Trash2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
    const [open, setOpen] = useState(false);
    const [verifyOpen, setVerifyOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<any>(null);
    const [formData, setFormData] = useState({ phone: "", apiId: "", apiHash: "" });
    const [verificationCode, setVerificationCode] = useState("");
    const [twoFAPassword, setTwoFAPassword] = useState("");
    const [requires2FA, setRequires2FA] = useState(false);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState("");

    const { data: accounts = [], mutate } = useSWR("/api/accounts", fetcher, {
        refreshInterval: 5000,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/accounts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setFormData({ phone: "", apiId: "", apiHash: "" });
                setOpen(false);
                setSelectedAccount(data);
                setVerifyOpen(true);
                mutate();
            } else {
                setError(data.error || "Failed to add account");
            }
        } catch (error) {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/accounts/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accountId: selectedAccount.id,
                    verificationCode,
                    password: requires2FA ? twoFAPassword : undefined,
                }),
            });

            const data = await response.json();

            if (data.requires_2fa) {
                // 2FA gerekiyor
                setRequires2FA(true);
                setError("");
            } else if (response.ok && data.success) {
                // Başarılı
                setVerificationCode("");
                setTwoFAPassword("");
                setRequires2FA(false);
                setVerifyOpen(false);
                setSelectedAccount(null);
                mutate();
            } else {
                setError(data.error || "Verification failed");
            }
        } catch (error) {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedAccount) return;

        try {
            const response = await fetch(`/api/accounts?id=${selectedAccount.id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                setDeleteOpen(false);
                setSelectedAccount(null);
                mutate();
            }
        } catch (error) {
            console.error("Failed to delete account:", error);
        }
    };

    const handleSyncAllGroups = async () => {
        setSyncing(true);
        try {
            const results = await Promise.allSettled(
                accounts.map((account: any) =>
                    fetch(`/api/accounts/${account.id}/groups`).then(res => res.json())
                )
            );

            const successCount = results.filter(r => r.status === 'fulfilled').length;
            alert(`✅ Synced ${successCount}/${accounts.length} accounts successfully!`);
            mutate(); // Refresh accounts
        } catch (error) {
            alert("❌ Failed to sync groups");
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Telegram Accounts Managed
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Monitor and manage your connected Telegram sessions.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleSyncAllGroups}
                        disabled={syncing || accounts.length === 0}
                        variant="outline"
                        className="rounded-xl"
                    >
                        <Users className="mr-2 h-4 w-4" />
                        {syncing ? "Syncing..." : "Sync All Groups"}
                    </Button>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 rounded-xl">
                                <Plus className="mr-2 h-4 w-4" /> Add New Account
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] bg-white/80 backdrop-blur-xl border-white/20 dark:bg-gray-900/80 dark:border-white/10 rounded-2xl shadow-2xl">
                            <form onSubmit={handleSubmit}>
                                <DialogHeader>
                                    <DialogTitle>Connect Telegram Account</DialogTitle>
                                    <DialogDescription>
                                        Enter your API details to connect a new session.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    {error && (
                                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
                                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                        </div>
                                    )}
                                    <div className="grid gap-2">
                                        <Label htmlFor="api-id">API ID</Label>
                                        <Input
                                            id="api-id"
                                            placeholder="12345678"
                                            value={formData.apiId}
                                            onChange={(e) => setFormData({ ...formData, apiId: e.target.value })}
                                            required
                                            className="bg-white/50 border-gray-200 dark:bg-white/5 dark:border-white/10 rounded-xl"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="api-hash">API Hash</Label>
                                        <Input
                                            id="api-hash"
                                            placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                                            value={formData.apiHash}
                                            onChange={(e) => setFormData({ ...formData, apiHash: e.target.value })}
                                            required
                                            className="bg-white/50 border-gray-200 dark:bg-white/5 dark:border-white/10 rounded-xl"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input
                                            id="phone"
                                            placeholder="+1 234 567 8900"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            required
                                            className="bg-white/50 border-gray-200 dark:bg-white/5 dark:border-white/10 rounded-xl"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full rounded-xl bg-blue-600 hover:bg-blue-700"
                                    >
                                        {loading ? "Adding..." : "Send Verification Code"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Verification Dialog */}
            <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
                <DialogContent className="sm:max-w-[425px] bg-white/80 backdrop-blur-xl border-white/20 dark:bg-gray-900/80 dark:border-white/10 rounded-2xl shadow-2xl">
                    <form onSubmit={handleVerify}>
                        <DialogHeader>
                            <DialogTitle>Enter Verification Code</DialogTitle>
                            <DialogDescription>
                                We sent a verification code to {selectedAccount?.phone}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
                                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                </div>
                            )}
                            <div className="grid gap-2">
                                <Label htmlFor="code">Verification Code</Label>
                                <Input
                                    id="code"
                                    placeholder="12345"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    maxLength={5}
                                    required
                                    className="bg-white/50 border-gray-200 dark:bg-white/5 dark:border-white/10 rounded-xl text-center text-2xl tracking-widest"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Enter the 5-digit code sent to your Telegram app
                                </p>
                            </div>

                            {/* 2FA Password Input */}
                            {requires2FA && (
                                <div className="grid gap-2">
                                    <Label htmlFor="2fa-password">2FA Password</Label>
                                    <Input
                                        id="2fa-password"
                                        type="password"
                                        placeholder="Enter your 2FA password"
                                        value={twoFAPassword}
                                        onChange={(e) => setTwoFAPassword(e.target.value)}
                                        required
                                        className="bg-white/50 border-gray-200 dark:bg-white/5 dark:border-white/10 rounded-xl"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Your account has 2FA enabled
                                    </p>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-xl bg-green-600 hover:bg-green-700"
                            >
                                {loading ? "Verifying..." : "Verify & Activate"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent className="bg-white/80 backdrop-blur-xl border-white/20 dark:bg-gray-900/80 dark:border-white/10 rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the account {selectedAccount?.phone}. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {accounts.map((account: any) => (
                    <GlassCard key={account.id} hoverEffect className="p-6 relative group">
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                        <MoreVertical className="h-5 w-5" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setSelectedAccount(account);
                                            setDeleteOpen(true);
                                        }}
                                        className="text-red-600 focus:text-red-600"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Account
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="relative">
                                <Avatar className="h-20 w-20 ring-4 ring-white/50 shadow-lg dark:ring-white/10">
                                    <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 text-xl font-bold dark:from-blue-900 dark:to-blue-800 dark:text-blue-100">
                                        {account.phone.slice(-2)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className={`absolute bottom-0 right-0 h-5 w-5 rounded-full border-[3px] border-white dark:border-gray-900 ${account.status === "Active" ? "bg-green-500" :
                                    account.status === "Pending Verification" ? "bg-yellow-500" : "bg-red-500"
                                    }`} />
                            </div>

                            <div>
                                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{account.phone}</h3>
                                <div className="flex items-center justify-center gap-2 mt-1">
                                    <Badge variant="secondary" className={`${account.status === "Active"
                                        ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                                        : account.status === "Pending Verification"
                                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400"
                                            : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                                        } px-2 py-0.5 text-xs font-medium rounded-md`}>
                                        {account.status}
                                    </Badge>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-gray-100 dark:border-white/5">
                                <div className="flex flex-col items-center p-2 rounded-xl bg-gray-50/50 dark:bg-white/5">
                                    <Users className="h-4 w-4 text-blue-500 mb-1" />
                                    <span className="text-lg font-bold text-gray-900 dark:text-white">{account.groups}</span>
                                    <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Groups</span>
                                </div>
                                <div className="flex flex-col items-center p-2 rounded-xl bg-gray-50/50 dark:bg-white/5">
                                    <Smartphone className="h-4 w-4 text-purple-500 mb-1" />
                                    <span className="text-lg font-bold text-gray-900 dark:text-white">Mobile</span>
                                    <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Device</span>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                ))}

                <button onClick={() => setOpen(true)} className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all group h-[320px] dark:border-white/10 dark:hover:bg-white/5 dark:hover:border-blue-500/50">
                    <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors dark:bg-blue-500/10 dark:group-hover:bg-blue-500/20">
                        <Plus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">Connect New Account</span>
                    <span className="text-sm text-gray-500 mt-1 dark:text-gray-400">Add another session</span>
                </button>
            </div>
        </div>
    );
}

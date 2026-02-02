"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    CreditCard,
    MessageCircle,
    Settings,
    Users,
    FileText,
    Save,
    ShieldBan,
    LogOut
} from "lucide-react";

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const navigation = [
        { name: "My Accounts", href: "/dashboard", icon: CreditCard },
        { name: "Group Joiner", href: "/dashboard/joiner", icon: Users },
        { name: "Message Sender", href: "/dashboard/sender", icon: MessageCircle },
        { name: "Templates", href: "/dashboard/templates", icon: Save },
        { name: "Blacklist", href: "/dashboard/blacklist", icon: ShieldBan },
        { name: "Logs & Reports", href: "/dashboard/logs", icon: FileText },
        { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ];

    const handleLogout = () => {
        // Clear auth cookie
        document.cookie = "telegram_auth=; path=/; max-age=0";

        // Redirect to login
        router.push("/login");
    };

    return (
        <div className="flex flex-col h-full w-64 border-r border-gray-200 bg-white/50 backdrop-blur-xl dark:border-white/10 dark:bg-black/40">
            {/* App Header */}
            <div className="flex h-16 items-center px-6 border-b border-gray-200/50 dark:border-white/5">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-md"></div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Telegram Manager</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                                    : "text-gray-600 hover:bg-gray-100/50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                            )}
                        >
                            <item.icon
                                className={cn(
                                    "mr-3 h-4 w-4 shrink-0 transition-colors",
                                    isActive
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
                                )}
                            />
                            {item.name}
                            {isActive && (
                                <div className="ml-auto w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* User Section (Bottom) */}
            <div className="border-t border-gray-200/50 p-4 dark:border-white/5 space-y-3">
                <div className="flex items-center gap-3 rounded-xl bg-white/40 p-3 shadow-sm ring-1 ring-gray-900/5 backdrop-blur-sm dark:bg-white/5 dark:ring-white/10">
                    <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">Admin User</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">Pro Plan</span>
                    </div>
                </div>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/10 transition-colors"
                >
                    <LogOut className="h-4 w-4" />
                    Logout
                </button>
            </div>
        </div>
    );
}

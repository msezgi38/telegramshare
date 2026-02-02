"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Hard-coded credentials check
        if (email === "admin@telegram.com" && password === "462524Mka*") {
            // Set auth cookie
            document.cookie = "telegram_auth=authenticated; path=/; max-age=86400"; // 24 hours
            toast.success("Login successful!");

            // Redirect to dashboard
            setTimeout(() => {
                router.push("/dashboard");
            }, 500);
        } else {
            toast.error("Invalid email or password!");
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-950/50">
            {/* Abstract Background Gradients */}
            <div className="absolute top-[-20%] left-[-10%] h-[800px] w-[800px] rounded-full bg-blue-400/30 blur-[120px] mix-blend-multiply dark:bg-blue-900/40" />
            <div className="absolute top-[-20%] right-[-10%] h-[800px] w-[800px] rounded-full bg-purple-400/30 blur-[120px] mix-blend-multiply dark:bg-purple-900/40" />
            <div className="absolute bottom-[-20%] left-[20%] h-[800px] w-[800px] rounded-full bg-orange-400/30 blur-[120px] mix-blend-multiply dark:bg-orange-900/40" />

            {/* Main Container */}
            <div className="container relative z-10 mx-auto px-4">
                <GlassCard className="mx-auto max-w-md p-8 sm:p-12">
                    {/* Logo Section */}
                    <div className="mb-8 flex flex-col items-center justify-center text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 to-purple-600 shadow-lg text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                            Sign in to Telegram Manager
                        </h1>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Enter your credentials to access the dashboard
                        </p>
                    </div>

                    {/* Form Section */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@telegram.com"
                                required
                                className="h-11 rounded-xl border-gray-200 bg-white/50 backdrop-blur-sm focus:border-blue-500 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-11 rounded-xl border-gray-200 bg-white/50 backdrop-blur-sm focus:border-blue-500 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-11 w-full rounded-xl bg-blue-600 text-base font-medium shadow-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50"
                        >
                            {loading ? "Signing in..." : "Sign In"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 text-center text-xs text-gray-400">
                        Secure access to Telegram Manager
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}

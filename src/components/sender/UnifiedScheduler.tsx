"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Shield, Zap, Clock, Info } from "lucide-react";

interface UnifiedSchedulerProps {
    selectedAccountCount: number;
    totalGroupCount: number;
    isRunning: boolean;
    onStart: (settings: SchedulerSettings) => void;
    onStop: () => void;
    nextBroadcast?: Date | null;
}

export interface SchedulerSettings {
    mode: 'safe' | 'custom';
    loopInterval: number; // minutes
    minDelay: number; // seconds
    maxDelay: number; // seconds
}

export function UnifiedScheduler({
    selectedAccountCount,
    totalGroupCount,
    isRunning,
    onStart,
    onStop,
    nextBroadcast,
}: UnifiedSchedulerProps) {
    const [mode, setMode] = useState<'safe' | 'custom'>('safe');
    const [loopInterval, setLoopInterval] = useState(60);
    const [minDelay, setMinDelay] = useState(30);
    const [maxDelay, setMaxDelay] = useState(60);
    const [countdown, setCountdown] = useState("");

    // Safe Mode Auto-Calculation
    const safeSettings = calculateSafeSettings(selectedAccountCount, totalGroupCount);

    // Use safe settings when in safe mode
    useEffect(() => {
        if (mode === 'safe') {
            setLoopInterval(safeSettings.loopInterval);
            setMinDelay(safeSettings.minDelay);
            setMaxDelay(safeSettings.maxDelay);
        }
    }, [mode, safeSettings.loopInterval, safeSettings.minDelay, safeSettings.maxDelay]);

    // Countdown timer
    useEffect(() => {
        if (!isRunning || !nextBroadcast) {
            setCountdown("");
            return;
        }

        const updateCountdown = () => {
            const now = new Date().getTime();
            const target = new Date(nextBroadcast).getTime();
            const diff = target - now;

            if (diff <= 0) {
                setCountdown("Starting...");
                return;
            }

            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);

            if (hours > 0) {
                setCountdown(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            } else {
                setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [isRunning, nextBroadcast]);

    const handleStart = () => {
        const settings: SchedulerSettings = {
            mode,
            loopInterval,
            minDelay,
            maxDelay,
        };
        onStart(settings);
    };

    const totalMessages = selectedAccountCount * totalGroupCount;
    const estimatedTime = calculateEstimatedTime(totalMessages, minDelay, maxDelay);

    return (
        <div className="space-y-4">
            {/* Mode Selector */}
            <div>
                <Label className="text-sm font-semibold mb-3 block">Scheduler Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => setMode('safe')}
                        className={`p-3 rounded-lg border-2 transition-all ${mode === 'safe'
                                ? 'bg-green-50 dark:bg-green-950/30 border-green-500 dark:border-green-600'
                                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-green-300'
                            }`}
                        disabled={isRunning}
                    >
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Shield className={`h-4 w-4 ${mode === 'safe' ? 'text-green-600' : 'text-gray-500'}`} />
                            <span className={`text-sm font-medium ${mode === 'safe' ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                Safe Mode
                            </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            Auto-calculated delays
                        </p>
                    </button>

                    <button
                        onClick={() => setMode('custom')}
                        className={`p-3 rounded-lg border-2 transition-all ${mode === 'custom'
                                ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-500 dark:border-blue-600'
                                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-blue-300'
                            }`}
                        disabled={isRunning}
                    >
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Zap className={`h-4 w-4 ${mode === 'custom' ? 'text-blue-600' : 'text-gray-500'}`} />
                            <span className={`text-sm font-medium ${mode === 'custom' ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                Custom Mode
                            </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            Manual configuration
                        </p>
                    </button>
                </div>
            </div>

            {/* Safe Mode Info */}
            {mode === 'safe' && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                        <div className="text-xs text-green-700 dark:text-green-300">
                            <p className="font-medium mb-1">Safe Mode Active</p>
                            <p>Delays automatically calculated based on {selectedAccountCount} accounts and {totalGroupCount} groups to prevent rate limits.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Loop Interval */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Loop Interval</Label>
                    <Badge variant="outline" className="font-mono">
                        {loopInterval} min
                    </Badge>
                </div>
                {mode === 'custom' ? (
                    <Slider
                        value={[loopInterval]}
                        onValueChange={(value) => setLoopInterval(value[0])}
                        min={15}
                        max={240}
                        step={15}
                        disabled={isRunning}
                        className="mb-2"
                    />
                ) : (
                    <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{loopInterval} min</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Auto-calculated</div>
                    </div>
                )}
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>15 min</span>
                    <span>4 hours</span>
                </div>
            </div>

            {/* Delay Range */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Message Delay Range</Label>
                    <Badge variant="outline" className="font-mono">
                        {minDelay}-{maxDelay}s
                    </Badge>
                </div>
                {mode === 'custom' ? (
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                                Minimum Delay (seconds)
                            </Label>
                            <Input
                                type="number"
                                value={minDelay}
                                onChange={(e) => setMinDelay(Math.max(1, parseInt(e.target.value) || 1))}
                                min={1}
                                max={maxDelay}
                                disabled={isRunning}
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                                Maximum Delay (seconds)
                            </Label>
                            <Input
                                type="number"
                                value={maxDelay}
                                onChange={(e) => setMaxDelay(Math.max(minDelay, parseInt(e.target.value) || 60))}
                                min={minDelay}
                                disabled={isRunning}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 text-center">
                            <div className="text-xl font-bold text-gray-900 dark:text-white">{minDelay}s</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Min</div>
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 text-center">
                            <div className="text-xl font-bold text-gray-900 dark:text-white">{maxDelay}s</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Max</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Estimation */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <div className="flex justify-between">
                        <span>Total Messages:</span>
                        <span className="font-semibold">{totalMessages}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Estimated Time:</span>
                        <span className="font-semibold">{estimatedTime}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Avg. per Account:</span>
                        <span className="font-semibold">
                            {selectedAccountCount > 0 ? (totalGroupCount / selectedAccountCount).toFixed(1) : 0} groups
                        </span>
                    </div>
                </div>
            </div>

            {/* Status Card (when running) */}
            {isRunning && nextBroadcast && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                            Scheduler Active
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Next broadcast in:</span>
                        <div className="text-2xl font-mono font-bold text-green-600 dark:text-green-400">
                            {countdown || "Calculating..."}
                        </div>
                    </div>
                </div>
            )}

            {/* Control Button */}
            <Button
                onClick={isRunning ? onStop : handleStart}
                disabled={!isRunning && (selectedAccountCount === 0 || totalGroupCount === 0)}
                className="w-full"
                variant={isRunning ? "destructive" : "default"}
                size="lg"
            >
                {isRunning ? (
                    <>
                        <Pause className="h-4 w-4 mr-2" />
                        Stop Scheduler
                    </>
                ) : (
                    <>
                        <Play className="h-4 w-4 mr-2" />
                        Start {mode === 'safe' ? 'Safe' : 'Custom'} Broadcast
                    </>
                )}
            </Button>
        </div>
    );
}

// Helper function to calculate safe settings
function calculateSafeSettings(accountCount: number, groupCount: number) {
    // Telegram limits: ~20 messages per minute per account
    // Safe approach: 30-60s delay between messages
    // Loop interval: ensure we don't spam the same groups too frequently

    const totalMessages = accountCount * groupCount;

    // Base delays
    let minDelay = 30;
    let maxDelay = 60;

    // Adjust based on account count
    if (accountCount > 25) {
        minDelay = 20;
        maxDelay = 40;
    } else if (accountCount > 10) {
        minDelay = 25;
        maxDelay = 50;
    }

    // Loop interval: at least 1 hour for large operations
    let loopInterval = 60; // minutes
    if (totalMessages > 500) {
        loopInterval = 120;
    } else if (totalMessages > 200) {
        loopInterval = 90;
    }

    return {
        loopInterval,
        minDelay,
        maxDelay,
    };
}

// Helper to estimate completion time
function calculateEstimatedTime(messageCount: number, minDelay: number, maxDelay: number): string {
    const avgDelay = (minDelay + maxDelay) / 2;
    const totalSeconds = messageCount * avgDelay;

    if (totalSeconds < 60) {
        return `${Math.round(totalSeconds)}s`;
    } else if (totalSeconds < 3600) {
        return `${Math.round(totalSeconds / 60)} minutes`;
    } else {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.round((totalSeconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
}

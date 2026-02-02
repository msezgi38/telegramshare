"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Shield, Zap, Clock, Users, AlertTriangle } from "lucide-react";

export interface JoinSettings {
    mode: 'safe' | 'custom';
    minDelay: number;
    maxDelay: number;
    maxJoinsPerAccount: number;
    retryFailed: boolean;
}

interface JoinSettingsPanelProps {
    settings: JoinSettings;
    onSettingsChange: (settings: JoinSettings) => void;
    selectedAccountCount: number;
    totalLinkCount: number;
}

export function JoinSettingsPanel({
    settings,
    onSettingsChange,
    selectedAccountCount,
    totalLinkCount,
}: JoinSettingsPanelProps) {

    // Calculate Safe Mode settings based on account count
    const calculateSafeSettings = (): Partial<JoinSettings> => {
        // Telegram safe limits: ~10-15 joins per account per session
        const maxJoinsPerAccount = Math.min(15, Math.ceil(totalLinkCount / Math.max(selectedAccountCount, 1)));

        // Adjust delays based on account count (more accounts = can use shorter delays)
        let minDelay = 30;
        let maxDelay = 60;

        if (selectedAccountCount > 100) {
            minDelay = 20;
            maxDelay = 40;
        } else if (selectedAccountCount > 500) {
            minDelay = 15;
            maxDelay = 30;
        }

        return { minDelay, maxDelay, maxJoinsPerAccount };
    };

    // Auto-apply Safe Mode settings when mode changes
    useEffect(() => {
        if (settings.mode === 'safe') {
            const safeSettings = calculateSafeSettings();
            onSettingsChange({
                ...settings,
                ...safeSettings,
            });
        }
    }, [settings.mode, selectedAccountCount, totalLinkCount]);

    const handleModeToggle = (checked: boolean) => {
        onSettingsChange({
            ...settings,
            mode: checked ? 'safe' : 'custom',
        });
    };

    const handleMinDelayChange = (value: number[]) => {
        onSettingsChange({
            ...settings,
            minDelay: value[0],
        });
    };

    const handleMaxDelayChange = (value: number[]) => {
        onSettingsChange({
            ...settings,
            maxDelay: value[0],
        });
    };

    const handleMaxJoinsChange = (value: number[]) => {
        onSettingsChange({
            ...settings,
            maxJoinsPerAccount: value[0],
        });
    };

    const handleRetryToggle = (checked: boolean) => {
        onSettingsChange({
            ...settings,
            retryFailed: checked,
        });
    };

    // Calculate estimated time
    const calculateEstimatedTime = () => {
        if (selectedAccountCount === 0 || totalLinkCount === 0) return "N/A";

        const linksPerAccount = Math.ceil(totalLinkCount / selectedAccountCount);
        const avgDelay = (settings.minDelay + settings.maxDelay) / 2;
        const totalSeconds = linksPerAccount * avgDelay;

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        if (hours > 0) {
            return `~${hours}h ${minutes}m`;
        }
        return `~${minutes}m`;
    };

    // Calculate distribution
    const linksPerAccount = selectedAccountCount > 0
        ? Math.ceil(totalLinkCount / selectedAccountCount)
        : 0;

    const isSafeMode = settings.mode === 'safe';

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Join Settings
                </h3>
                <Badge variant={isSafeMode ? "default" : "outline"}>
                    {isSafeMode ? (
                        <>
                            <Shield className="h-3 w-3 mr-1" />
                            Safe Mode
                        </>
                    ) : (
                        <>
                            <Zap className="h-3 w-3 mr-1" />
                            Custom
                        </>
                    )}
                </Badge>
            </div>

            {/* Safe Mode Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-blue-50 dark:bg-blue-950/20">
                <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                            Safe Mode
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Auto-calculates optimal delays to prevent bans
                        </div>
                    </div>
                </div>
                <Switch
                    checked={isSafeMode}
                    onCheckedChange={handleModeToggle}
                />
            </div>

            {/* Warning for Custom Mode */}
            {!isSafeMode && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-300 dark:border-yellow-900">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-300">
                        Custom mode may risk account bans if delays are too short
                    </div>
                </div>
            )}

            {/* Delay Settings */}
            <div className="space-y-3">
                <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Delay Between Joins (seconds)
                </Label>

                <div className="space-y-3">
                    {/* Min Delay */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Minimum</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                                {settings.minDelay}s
                            </span>
                        </div>
                        <Slider
                            value={[settings.minDelay]}
                            onValueChange={handleMinDelayChange}
                            min={5}
                            max={120}
                            step={5}
                            disabled={isSafeMode}
                            className={isSafeMode ? "opacity-50" : ""}
                        />
                    </div>

                    {/* Max Delay */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Maximum</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                                {settings.maxDelay}s
                            </span>
                        </div>
                        <Slider
                            value={[settings.maxDelay]}
                            onValueChange={handleMaxDelayChange}
                            min={10}
                            max={180}
                            step={5}
                            disabled={isSafeMode}
                            className={isSafeMode ? "opacity-50" : ""}
                        />
                    </div>
                </div>
            </div>

            {/* Max Joins Per Account */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Max Joins Per Account
                </Label>
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Limit</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                            {settings.maxJoinsPerAccount} groups
                        </span>
                    </div>
                    <Slider
                        value={[settings.maxJoinsPerAccount]}
                        onValueChange={handleMaxJoinsChange}
                        min={5}
                        max={100}
                        step={5}
                        disabled={isSafeMode}
                        className={isSafeMode ? "opacity-50" : ""}
                    />
                </div>
            </div>

            {/* Retry Failed */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                        Retry Failed Joins
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Automatically retry failed attempts
                    </div>
                </div>
                <Switch
                    checked={settings.retryFailed}
                    onCheckedChange={handleRetryToggle}
                />
            </div>

            {/* Estimated Stats */}
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 space-y-3">
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                    Estimated Distribution
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                            Links per Account
                        </div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {linksPerAccount}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                            Estimated Time
                        </div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {calculateEstimatedTime()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

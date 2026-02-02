"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight } from "lucide-react";
import { formatDistanceToNow, addSeconds } from "date-fns";

interface Job {
    id: string;
    status: string;
    progress: {
        per_account?: Record<string, {
            status: string;
            next_action_eta?: string;
            current_group?: string;
        }>;
    };
    started_at?: string;
}

interface BroadcastTimelineProps {
    jobs: Job[];
}

export function BroadcastTimeline({ jobs }: BroadcastTimelineProps) {
    // Extract upcoming broadcasts from active jobs
    const upcomingBroadcasts: Array<{
        phone: string;
        eta: string;
        status: string;
    }> = [];

    jobs.forEach(job => {
        if (job.status === "running" && job.progress.per_account) {
            Object.entries(job.progress.per_account).forEach(([phone, data]) => {
                if (data.next_action_eta) {
                    upcomingBroadcasts.push({
                        phone,
                        eta: data.next_action_eta,
                        status: data.status
                    });
                }
            });
        }
    });

    // Sort by ETA
    upcomingBroadcasts.sort((a, b) =>
        new Date(a.eta).getTime() - new Date(b.eta).getTime()
    );

    if (upcomingBroadcasts.length === 0) {
        return null;
    }

    return (
        <Card className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Upcoming Broadcasts
                </h3>
            </div>

            <div className="space-y-2">
                {upcomingBroadcasts.slice(0, 5).map((broadcast, idx) => {
                    const timeUntil = formatDistanceToNow(new Date(broadcast.eta), { addSuffix: false });
                    const isImminent = new Date(broadcast.eta).getTime() - Date.now() < 5 * 60 * 1000; // < 5 min

                    return (
                        <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className={`w-2 h-2 rounded-full ${isImminent ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                                <span className="text-xs font-mono text-gray-900 dark:text-white truncate">
                                    {broadcast.phone}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <ArrowRight className="h-3 w-3 text-gray-400" />
                                <Badge variant="outline" className="text-xs">
                                    {isImminent ? 'Now' : `in ${timeUntil}`}
                                </Badge>
                            </div>
                        </div>
                    );
                })}
            </div>

            {upcomingBroadcasts.length > 5 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    +{upcomingBroadcasts.length - 5} more
                </div>
            )}
        </Card>
    );
}

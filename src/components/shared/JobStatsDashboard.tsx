"use client";

import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, Clock, Activity } from "lucide-react";

interface Job {
    id: string;
    status: string;
    progress: {
        total: number;
        completed: number;
        failed: number;
    };
}

interface JobStatsDashboardProps {
    jobs: Job[];
}

export function JobStatsDashboard({ jobs }: JobStatsDashboardProps) {
    const activeJobs = jobs.filter(j => j.status === "running" || j.status === "queued");
    const completedJobs = jobs.filter(j => j.status === "completed");
    const failedJobs = jobs.filter(j => j.status === "failed");

    // Calculate aggregated stats
    const totalOperations = jobs.reduce((sum, job) => sum + job.progress.total, 0);
    const successfulOperations = jobs.reduce((sum, job) => sum + job.progress.completed, 0);
    const failedOperations = jobs.reduce((sum, job) => sum + job.progress.failed, 0);

    const successRate = totalOperations > 0
        ? ((successfulOperations / totalOperations) * 100).toFixed(1)
        : 0;

    return (
        <div className="grid grid-cols-4 gap-4">
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Operations</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalOperations}</p>
                    </div>
                    <Activity className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium">Successful</p>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                            {successfulOperations}
                            <span className="text-sm ml-1">({successRate}%)</span>
                        </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
                </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium">Failed</p>
                        <p className="text-2xl font-bold text-red-900 dark:text-red-100">{failedOperations}</p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-500 opacity-50" />
                </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Active Jobs</p>
                        <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{activeJobs.length}</p>
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                            {completedJobs.length} completed
                        </p>
                    </div>
                    <Clock className="h-8 w-8 text-purple-500 opacity-50" />
                </div>
            </Card>
        </div>
    );
}

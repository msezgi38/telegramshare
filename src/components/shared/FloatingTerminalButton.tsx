"use client";

import { useState } from "react";
import { Terminal } from "lucide-react";
import { TerminalModal } from "@/components/sender/TerminalModal";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function FloatingTerminalButton() {
    const [isOpen, setIsOpen] = useState(false);

    // Fetch all jobs for terminal logs
    const { data: jobsData } = useSWR("/api/jobs", fetcher, { refreshInterval: 5000 });
    const jobs = jobsData?.jobs || [];

    // Collect all logs from all jobs
    const terminalLogs = jobs.flatMap((job: any) =>
        (job.logs || []).map((log: any) => ({
            timestamp: log.timestamp,
            level: log.level || 'info',
            message: log.message,
            account: log.account
        }))
    );

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="relative group"
                aria-label="Open Terminal"
            >
                <div className="relative">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-green-500 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>

                    {/* Main button */}
                    <div className="relative bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full p-4 shadow-2xl transition-all duration-200 group-hover:scale-110">
                        <Terminal className="h-6 w-6" />
                    </div>

                    {/* Badge for log count */}
                    {terminalLogs.length > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg">
                            {terminalLogs.length > 99 ? '99+' : terminalLogs.length}
                        </div>
                    )}
                </div>

                {/* Tooltip */}
                <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Terminal Logs
                    <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
            </button>

            {/* Terminal Modal */}
            <TerminalModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                logs={terminalLogs}
            />
        </>
    );
}

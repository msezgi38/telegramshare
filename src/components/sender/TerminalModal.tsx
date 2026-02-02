"use client";

import { useEffect, useRef } from "react";
import { X, Terminal as TerminalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TerminalLog {
    timestamp: string;
    level: string;
    message: string;
    account?: string;
}

interface TerminalModalProps {
    isOpen: boolean;
    onClose: () => void;
    logs: TerminalLog[];
}

export function TerminalModal({ isOpen, onClose, logs }: TerminalModalProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs.length]);

    if (!isOpen) return null;

    const getLogColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'success':
                return 'text-green-400';
            case 'error':
                return 'text-red-400';
            case 'warning':
                return 'text-yellow-400';
            case 'info':
            default:
                return 'text-blue-400';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-[90vw] h-[80vh] max-w-6xl bg-gray-900 rounded-lg shadow-2xl flex flex-col border border-gray-700">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                        <TerminalIcon className="h-5 w-5 text-green-400" />
                        <h2 className="text-lg font-semibold text-white">Terminal - Job Logs</h2>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white hover:bg-gray-800"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Terminal Content */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-black"
                >
                    {logs.length === 0 ? (
                        <div className="text-gray-500 text-center py-8">
                            No logs yet. Start a job to see logs here.
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {logs.map((log, idx) => (
                                <div key={idx} className="flex gap-2 hover:bg-gray-900/50">
                                    <span className="text-gray-500 text-xs shrink-0">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                    <span className={`font-bold shrink-0 ${getLogColor(log.level)}`}>
                                        [{log.level.toUpperCase()}]
                                    </span>
                                    {log.account && (
                                        <span className="text-purple-400 shrink-0">
                                            [{log.account}]
                                        </span>
                                    )}
                                    <span className="text-gray-200 break-all">
                                        {log.message}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-gray-700 bg-gray-800 text-xs text-gray-400 flex items-center justify-between">
                    <span>{logs.length} log entries</span>
                    <span>Press ESC to close</span>
                </div>
            </div>
        </div>
    );
}

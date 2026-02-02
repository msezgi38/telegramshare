import Sidebar from "@/components/layout/sidebar";
import { Toaster } from "sonner";
import { FloatingJobMonitor } from "@/components/shared/FloatingJobMonitor";
import { FloatingTerminalButton } from "@/components/shared/FloatingTerminalButton";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-gray-50/50 dark:bg-gray-950">
            {/* Background gradient for dashboard too, but subtler */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20 pointer-events-none" />

            <aside className="hidden w-64 shrink-0 lg:block z-20">
                <Sidebar />
            </aside>
            <main className="flex-1 overflow-y-auto min-w-0 z-10 p-4 sm:p-6 lg:p-8">
                <div className="mx-auto max-w-6xl">
                    {children}
                </div>
            </main>

            {/* Floating Action Buttons - Available on all dashboard pages */}
            <div className="fixed bottom-6 right-6 z-40 flex flex-col-reverse gap-3">
                <FloatingTerminalButton />
                <FloatingJobMonitor />
            </div>

            <Toaster
                position="top-right"
                expand={true}
                richColors
                closeButton
            />
        </div>
    );
}

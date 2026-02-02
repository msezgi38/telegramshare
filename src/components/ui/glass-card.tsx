import { cn } from "@/lib/utils";
import React from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

export function GlassCard({
    children,
    className,
    hoverEffect = false,
    ...props
}: GlassCardProps) {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-2xl border border-white/20 bg-white/60 shadow-xl backdrop-blur-xl dark:bg-black/40 dark:border-white/10",
                hoverEffect && "transition-all duration-300 hover:bg-white/70 hover:shadow-2xl hover:scale-[1.01] dark:hover:bg-black/50",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

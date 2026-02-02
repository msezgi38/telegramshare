"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Upload,
    Plus,
    Trash2,
    FileText,
    AlertCircle,
    CheckCircle2,
    Save,
    FolderOpen
} from "lucide-react";
import { toast } from "sonner";

export interface GroupLink {
    id: number;
    link: string;
    source: 'manual' | 'file' | 'template' | 'paste';
    isValid: boolean;
}

interface GroupLinkManagerProps {
    links: GroupLink[];
    onLinksChange: (links: GroupLink[]) => void;
}

export function GroupLinkManager({ links, onLinksChange }: GroupLinkManagerProps) {
    const [bulkText, setBulkText] = useState("");
    const [singleLink, setSingleLink] = useState("");

    // Validate Telegram link
    const validateLink = (link: string): boolean => {
        return (
            link.startsWith('https://t.me/') ||
            link.startsWith('t.me/') ||
            link.startsWith('@')
        );
    };

    // Normalize link format
    const normalizeLink = (link: string): string => {
        if (link.startsWith('@')) return `https://t.me/${link.substring(1)}`;
        if (link.startsWith('t.me/')) return `https://${link}`;
        return link;
    };

    // Add links from bulk textarea
    const handleBulkAdd = () => {
        const rawLinks = bulkText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (rawLinks.length === 0) {
            toast.error("Please enter at least one link");
            return;
        }

        const newLinks: GroupLink[] = rawLinks.map((link, index) => ({
            id: Date.now() + index,
            link: normalizeLink(link),
            source: 'paste' as const,
            isValid: validateLink(link),
        }));

        const validCount = newLinks.filter(l => l.isValid).length;
        const invalidCount = newLinks.length - validCount;

        // Remove duplicates
        const existingLinks = new Set(links.map(l => l.link));
        const uniqueNewLinks = newLinks.filter(l => !existingLinks.has(l.link));

        onLinksChange([...links, ...uniqueNewLinks]);
        setBulkText("");

        if (invalidCount > 0) {
            toast.warning(`Added ${validCount} valid links. ${invalidCount} invalid links ignored.`);
        } else {
            toast.success(`Added ${uniqueNewLinks.length} links`);
        }
    };

    // Add single link
    const handleSingleAdd = () => {
        if (!singleLink.trim()) {
            toast.error("Please enter a link");
            return;
        }

        const isValid = validateLink(singleLink);
        const normalized = normalizeLink(singleLink);

        if (links.some(l => l.link === normalized)) {
            toast.error("This link is already in the list");
            return;
        }

        const newLink: GroupLink = {
            id: Date.now(),
            link: normalized,
            source: 'manual',
            isValid,
        };

        onLinksChange([...links, newLink]);
        setSingleLink("");
        toast.success("Link added");
    };

    // Handle file upload
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const rawLinks = text
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            const newLinks: GroupLink[] = rawLinks.map((link, index) => ({
                id: Date.now() + index,
                link: normalizeLink(link),
                source: 'file' as const,
                isValid: validateLink(link),
            }));

            const existingLinks = new Set(links.map(l => l.link));
            const uniqueNewLinks = newLinks.filter(l => !existingLinks.has(l.link));

            onLinksChange([...links, ...uniqueNewLinks]);
            toast.success(`Imported ${uniqueNewLinks.length} links from file`);
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    // Remove link
    const removeLink = (id: number) => {
        onLinksChange(links.filter(link => link.id !== id));
    };

    // Clear all links
    const clearAll = () => {
        onLinksChange([]);
        toast.success("All links cleared");
    };

    // Export to file
    const exportToFile = () => {
        const content = links.map(l => l.link).join('\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `group-links-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Links exported");
    };

    const validCount = links.filter(l => l.isValid).length;
    const invalidCount = links.length - validCount;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Group Links
                </h3>
                <div className="flex gap-2">
                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30">
                        {validCount} valid
                    </Badge>
                    {invalidCount > 0 && (
                        <Badge variant="destructive">
                            {invalidCount} invalid
                        </Badge>
                    )}
                </div>
            </div>

            {/* Bulk Add */}
            <div className="space-y-1.5">
                <Label className="text-sm">Bulk Add (one per line)</Label>
                <Textarea
                    placeholder="https://t.me/group1&#x0a;https://t.me/group2&#x0a;@group3"
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    className="h-16 font-mono text-xs"
                />
                <div className="flex gap-2">
                    <Button onClick={handleBulkAdd} className="flex-1" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Links
                    </Button>
                    <Button variant="outline" onClick={clearAll} disabled={links.length === 0} size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All
                    </Button>
                </div>
            </div>

            {/* File Upload */}
            <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                    <label className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Import from File
                        <input
                            type="file"
                            accept=".txt"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                    </label>
                </Button>
                <Button
                    variant="outline"
                    onClick={exportToFile}
                    disabled={links.length === 0}
                >
                    <FileText className="h-4 w-4 mr-2" />
                    Export
                </Button>
            </div>

            {/* Single Link Add */}
            <div className="space-y-2">
                <Label>Add Single Link</Label>
                <div className="flex gap-2">
                    <Input
                        placeholder="https://t.me/groupname"
                        value={singleLink}
                        onChange={(e) => setSingleLink(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSingleAdd()}
                    />
                    <Button onClick={handleSingleAdd} size="icon">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Links List */}
            <div className="space-y-1.5">
                <Label className="text-sm">Queue ({links.length})</Label>
                <ScrollArea className="h-[220px] border rounded-lg bg-gray-50 dark:bg-gray-900/50">
                    <div className="p-2 space-y-1">
                        {links.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No links added yet
                            </div>
                        ) : (
                            links.map((link) => (
                                <div
                                    key={link.id}
                                    className={`flex items-center gap-2 p-2 rounded-lg border ${link.isValid
                                        ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                                        : 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-900'
                                        }`}
                                >
                                    {link.isValid ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                    ) : (
                                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                                    )}
                                    <span className="flex-1 text-sm font-mono truncate text-gray-900 dark:text-white">
                                        {link.link}
                                    </span>
                                    <Badge variant="outline" className="text-xs shrink-0">
                                        {link.source}
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0"
                                        onClick={() => removeLink(link.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}

"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { Save, Edit, Trash2, Plus, FileText, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TemplatesPage() {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const [templateName, setTemplateName] = useState("");
    const [templateContent, setTemplateContent] = useState("");
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const { data: accounts = [] } = useSWR("/api/accounts", fetcher);
    const { data: messagesData, mutate: mutateMessages } = useSWR(
        selectedAccountId ? `/api/accounts/${selectedAccountId}/messages` : null,
        fetcher
    );

    const savedMessages = Array.isArray(messagesData) ? messagesData : [];

    const handleCreateTemplate = async () => {
        if (!templateName.trim() || !templateContent.trim() || !selectedAccountId) {
            toast.error("Please fill in all fields and select an account");
            return;
        }

        try {
            await fetch(`/api/accounts/${selectedAccountId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: templateName,
                    content: templateContent,
                }),
            });

            await mutateMessages();
            setShowCreateDialog(false);
            setTemplateName("");
            setTemplateContent("");
            toast.success("Template created successfully!");
        } catch (error: any) {
            toast.error("Failed to create template");
        }
    };

    const handleUpdateTemplate = async () => {
        if (!templateName.trim() || !templateContent.trim() || !editingTemplate) {
            toast.error("Please fill in all fields");
            return;
        }

        try {
            await fetch(`/api/accounts/${selectedAccountId}/messages`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messageId: editingTemplate.id,
                    name: templateName,
                    content: templateContent,
                }),
            });

            await mutateMessages();
            setEditingTemplate(null);
            setTemplateName("");
            setTemplateContent("");
            toast.success("Template updated successfully!");
        } catch (error: any) {
            toast.error("Failed to update template");
        }
    };

    const handleDeleteTemplate = async (templateId: number) => {
        try {
            await fetch(`/api/accounts/${selectedAccountId}/messages?messageId=${templateId}`, {
                method: "DELETE",
            });
            await mutateMessages();
            toast.success("Template deleted!");
        } catch (error) {
            toast.error("Failed to delete template");
        }
    };

    const handleCopyContent = (content: string, id: number) => {
        navigator.clipboard.writeText(content);
        setCopiedId(id);
        toast.success("Content copied to clipboard!");
        setTimeout(() => setCopiedId(null), 2000);
    };

    const startEdit = (template: any) => {
        setEditingTemplate(template);
        setTemplateName(template.name);
        setTemplateContent(template.content);
        setShowCreateDialog(true);
    };

    const cancelEdit = () => {
        setEditingTemplate(null);
        setTemplateName("");
        setTemplateContent("");
        setShowCreateDialog(false);
    };

    return (
        <div className="container mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Message Templates
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Create and manage reusable message templates for broadcasting
                    </p>
                </div>
                <Button
                    onClick={() => setShowCreateDialog(true)}
                    disabled={!selectedAccountId}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Account Selection */}
                <GlassCard className="p-4 lg:col-span-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Select Account
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                        {accounts.map((acc: any) => (
                            <Button
                                key={acc.id}
                                variant={selectedAccountId === acc.id ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedAccountId(acc.id)}
                            >
                                {acc.phone}
                            </Button>
                        ))}
                    </div>
                </GlassCard>

                {/* Create/Edit Form */}
                {showCreateDialog && (
                    <GlassCard className="p-6 lg:col-span-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            {editingTemplate ? "Edit Template" : "Create New Template"}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                    Template Name
                                </label>
                                <Input
                                    placeholder="e.g., Welcome Message, Promotion..."
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                    Message Content
                                </label>
                                <Textarea
                                    placeholder="Type your message here..."
                                    value={templateContent}
                                    onChange={(e) => setTemplateContent(e.target.value)}
                                    className="min-h-[150px]"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {editingTemplate ? "Update" : "Create"} Template
                                </Button>
                                <Button variant="outline" onClick={cancelEdit}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </GlassCard>
                )}

                {/* Templates List */}
                {selectedAccountId ? (
                    savedMessages.length === 0 ? (
                        <div className="lg:col-span-3">
                            <GlassCard className="p-12 text-center">
                                <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    No templates yet
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    Create your first message template to get started
                                </p>
                                <Button onClick={() => setShowCreateDialog(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Template
                                </Button>
                            </GlassCard>
                        </div>
                    ) : (
                        savedMessages.map((template: any) => (
                            <GlassCard key={template.id} className="p-6">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {template.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="secondary" className="text-xs">
                                                Used {template.usageCount} times
                                            </Badge>
                                            {template.lastUsed && (
                                                <span className="text-xs text-gray-500">
                                                    Last used: {new Date(template.lastUsed).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleCopyContent(template.content, template.id)}
                                        >
                                            {copiedId === template.id ? (
                                                <Check className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => startEdit(template)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteTemplate(template.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        {template.content}
                                    </p>
                                </div>
                            </GlassCard>
                        ))
                    )
                ) : (
                    <div className="lg:col-span-3">
                        <GlassCard className="p-12 text-center">
                            <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                Select an account
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Choose an account above to view and manage its templates
                            </p>
                        </GlassCard>
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Send, Save, FileText, Variable, Info } from "lucide-react";

interface MessageTemplate {
    id: number;
    name: string;
    content: string;
    usageCount: number;
}

interface MessageComposerProps {
    message: string;
    onMessageChange: (message: string) => void;
    templates: MessageTemplate[];
    onSaveTemplate: (name: string) => void;
    onLoadTemplate: (templateId: number, content: string) => void;
    onSend: () => void;
    isSending: boolean;
    disabled?: boolean;
}

export function MessageComposer({
    message,
    onMessageChange,
    templates,
    onSaveTemplate,
    onLoadTemplate,
    onSend,
    isSending,
    disabled = false,
}: MessageComposerProps) {
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [templateName, setTemplateName] = useState("");
    const [showVariableHelper, setShowVariableHelper] = useState(false);

    const variables = [
        { key: "{account_phone}", description: "Account phone number" },
        { key: "{account_name}", description: "Account name/username" },
        { key: "{group_name}", description: "Target group name" },
        { key: "{timestamp}", description: "Current timestamp" },
    ];

    const handleSaveTemplate = () => {
        if (templateName.trim() && message.trim()) {
            onSaveTemplate(templateName);
            setTemplateName("");
            setShowSaveDialog(false);
        }
    };

    const insertVariable = (variable: string) => {
        const textarea = document.querySelector('textarea');
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newMessage = message.substring(0, start) + variable + message.substring(end);
            onMessageChange(newMessage);

            // Set cursor position after the inserted variable
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + variable.length, start + variable.length);
            }, 0);
        } else {
            onMessageChange(message + variable);
        }
    };

    const characterCount = message.length;
    const hasVariables = variables.some(v => message.includes(v.key));

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Message Composer
                    </h3>
                </div>

                {/* Template Selector */}
                {templates.length > 0 && (
                    <Select
                        onValueChange={(value) => {
                            const template = templates.find(t => t.id.toString() === value);
                            if (template) {
                                onLoadTemplate(template.id, template.content);
                            }
                        }}
                        disabled={disabled}
                    >
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Load template..." />
                        </SelectTrigger>
                        <SelectContent>
                            {templates.map((template) => (
                                <SelectItem key={template.id} value={template.id.toString()}>
                                    <div className="flex items-center justify-between w-full">
                                        <span>{template.name}</span>
                                        <Badge variant="outline" className="ml-2 text-xs">
                                            {template.usageCount}×
                                        </Badge>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {/* Variable Helper */}
            <div className="flex items-center justify-between">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVariableHelper(!showVariableHelper)}
                    disabled={disabled}
                >
                    <Variable className="h-3 w-3 mr-1" />
                    Variables
                    {hasVariables && <Badge className="ml-2 h-4 w-4 rounded-full p-0 text-xs">✓</Badge>}
                </Button>
                <div className="text-xs text-gray-500">
                    {characterCount} characters
                </div>
            </div>

            {showVariableHelper && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                    <div className="flex items-start gap-2 mb-2">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                Dynamic Variables
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                Click to insert. These will be replaced with actual values when sending.
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {variables.map((variable) => (
                            <button
                                key={variable.key}
                                onClick={() => insertVariable(variable.key)}
                                className="text-left p-2 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                                disabled={disabled}
                            >
                                <div className="font-mono text-xs text-blue-600 dark:text-blue-400">
                                    {variable.key}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                    {variable.description}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Textarea */}
            <Textarea
                placeholder="Type your message here... Use variables like {account_phone} for personalization."
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                className="min-h-[180px] resize-none font-sans"
                disabled={disabled}
            />

            {/* Preview (if has variables) */}
            {hasVariables && (
                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Preview (example values):
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {message
                            .replace(/{account_phone}/g, "+14772390734")
                            .replace(/{account_name}/g, "Marketing Bot")
                            .replace(/{group_name}/g, "Star Chat")
                            .replace(/{timestamp}/g, new Date().toLocaleString())}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
                {!showSaveDialog ? (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSaveDialog(true)}
                            disabled={!message.trim() || disabled}
                        >
                            <Save className="h-3 w-3 mr-1" />
                            Save as Template
                        </Button>
                        <div className="flex-1" />
                        <Button
                            onClick={onSend}
                            disabled={isSending || !message.trim() || disabled}
                            size="lg"
                            className="px-8"
                        >
                            {isSending ? (
                                <>
                                    <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Send Now
                                </>
                            )}
                        </Button>
                    </>
                ) : (
                    <>
                        <Input
                            placeholder="Template name..."
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            className="flex-1"
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveTemplate()}
                            autoFocus
                        />
                        <Button onClick={handleSaveTemplate}>
                            <FileText className="h-4 w-4 mr-1" />
                            Save
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setShowSaveDialog(false);
                                setTemplateName("");
                            }}
                        >
                            Cancel
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}

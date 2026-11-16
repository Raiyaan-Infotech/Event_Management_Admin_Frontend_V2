'use client';

import React, { useState, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import { ImageIcon, CodeXml, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { MAX_FILE_SIZE } from "@/hooks/use-media";

// Dynamically import ReactQuill to prevent SSR issues
const ReactQuill = dynamic(() => import('react-quill-new'), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-muted animate-pulse rounded-md border" />
}) as any;

// Standard Toolbar Configurations
export const TOOLBAR_VARIANTS = {
    full: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        ['blockquote', 'code-block'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'align': [] }],
        ['link', 'image', 'video'],
        ['clean']
    ],
    compact: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        ['blockquote', 'code-block'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'align': [] }],
        ['link', 'image', 'video'],
        ['clean']
    ],
    basic: [
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link', 'clean']
    ]
};

interface RichTextEditorProps {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    variant?: 'full' | 'compact' | 'basic';
    toolbar?: any[];
    disableVisual?: boolean;
    customButtons?: React.ReactNode;
}

export interface RichTextEditorRef {
    insertTextAtCursor: (text: string) => void;
}

export const RichTextEditor = React.forwardRef<RichTextEditorRef, RichTextEditorProps>(({
    value = "",
    onChange,
    placeholder = "Type here...",
    className,
    variant = 'full',
    toolbar,
    disableVisual = false,
    customButtons,
}, ref) => {
    const [isSourceMode, setIsSourceMode] = useState(disableVisual);
    const [isUploading, setIsUploading] = useState(false);
    const quillRef = useRef<any>(null);

    // Quill modules configuration
    const modules = useMemo(() => {
        return {
            toolbar: toolbar || TOOLBAR_VARIANTS[variant]
        };
    }, [variant, toolbar]);

    const formats = [
        'header', 'font', 'size',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'indent', 'script', 'align', 'direction',
        'link', 'image', 'video', 'color', 'background', 'code-block'
    ];

    React.useImperativeHandle(ref, () => ({
        insertTextAtCursor: (text: string) => {
            if (!isSourceMode && quillRef.current) {
                const quill = quillRef.current.getEditor();
                quill.focus();
                let range = quill.getSelection();
                if (!range) {
                    range = { index: quill.getLength(), length: 0 };
                }
                // Quill's insertText works well here
                quill.insertText(range.index, text);
                quill.setSelection(range.index + text.length);
            } else {
                const textarea = document.getElementById('rich-text-source-area') as HTMLTextAreaElement;
                if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const currentValue = textarea.value;
                    const before = currentValue.substring(0, start);
                    const after = currentValue.substring(end, currentValue.length);
                    onChange(before + text + after);
                    
                    setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(start + text.length, start + text.length);
                    }, 0);
                } else {
                    onChange(value + text);
                }
            }
        }
    }));

    const toggleSource = () => {
        setIsSourceMode(!isSourceMode);
    };

    const handleAddMedia = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

            if (file.size > MAX_FILE_SIZE) {
                toast.error('File size exceeds the 10MB limit.');
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'editor');

            try {
                setIsUploading(true);
                const response = await apiClient.post('/media/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (response.data.success) {
                    const url = response.data.data?.file?.url || response.data.data?.url || response.data.url;
                    if (!url) throw new Error("Could not find image URL in response");
                    
                    if (!isSourceMode && quillRef.current) {
                        const quill = quillRef.current.getEditor();
                        quill.focus();
                        let range = quill.getSelection();
                        if (!range) {
                            range = { index: quill.getLength(), length: 0 };
                        }
                        quill.insertEmbed(range.index, 'image', url);
                        quill.setSelection(range.index + 1);
                    } else {
                        // Insert HTML at cursor in textarea
                        const textarea = document.getElementById('rich-text-source-area') as HTMLTextAreaElement;
                        const imgTag = `<img src="${url}" alt="Image" style="max-width: 100%;" />`;
                        
                        if (textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = textarea.value;
                            const before = text.substring(0, start);
                            const after = text.substring(end, text.length);
                            onChange(before + imgTag + after);
                            
                            // Set cursor after the inserted tag (needs tick)
                            setTimeout(() => {
                                textarea.focus();
                                textarea.setSelectionRange(start + imgTag.length, start + imgTag.length);
                            }, 0);
                        } else {
                            onChange(value + imgTag);
                        }
                    }
                    toast.success("Image uploaded successfully");
                } else {
                    throw new Error(response.data.message || "Invalid response from server");
                }
            } catch (error: any) {
                console.error("Upload error:", error);
                toast.error(error.response?.data?.message || "Failed to upload image");
            } finally {
                setIsUploading(false);
            }
        };
    };

    return (
        <div className={`rich-text-editor-wrapper ${className || ""}`}>
            <div className="flex gap-2 mb-2 items-center flex-wrap">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleSource}
                    className="flex items-center gap-2"
                    title={isSourceMode ? "Switch to Visual Editor" : "Switch to HTML Source"}
                >
                    <CodeXml className="w-4 h-4" />
                    {isSourceMode ? "Show Editor" : "Show/Hide Editor"}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddMedia}
                    isLoading={isUploading}
                    className="flex items-center gap-2"
                    title="Insert Image"
                >
                    {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <ImageIcon className="w-4 h-4" />
                    )}
                    Add media
                </Button>
                <span className="text-[11px] text-muted-foreground">Max 10MB</span>
                {customButtons}
            </div>

            {!isSourceMode && (
                <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={value}
                    onChange={(content: string) => onChange(content)}
                    modules={modules}
                    formats={formats}
                    placeholder={placeholder}
                />
            )}

            {isSourceMode && (
                <textarea
                    id="rich-text-source-area"
                    className="w-full min-h-[300px] p-4 border rounded-md font-mono text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                    value={value}
                    onChange={(e) => {
                        const val = e.target.value;
                        onChange(val);
                    }}
                    spellCheck={false}
                    placeholder="Enter HTML source code here..."
                />
            )}

            <style jsx global>{`
                /* Styling to match Shadcn and fix Dark Mode */
                .rich-text-editor-wrapper .ql-toolbar {
                    background-color: hsl(var(--muted) / 0.5) !important;
                    border-color: hsl(var(--input)) !important;
                    border-radius: var(--radius) var(--radius) 0 0 !important;
                }
                .rich-text-editor-wrapper .ql-container {
                    border-color: hsl(var(--input)) !important;
                    border-radius: 0 0 var(--radius) var(--radius) !important;
                    min-height: 250px;
                    font-size: 14px;
                    background-color: hsl(var(--card)) !important;
                }
                .rich-text-editor-wrapper .ql-editor {
                    min-height: 250px;
                    color: hsl(var(--foreground)) !important;
                }
                /* Readable placeholder in light and dark mode */
                .rich-text-editor-wrapper .ql-editor.ql-blank::before {
                    color: hsl(var(--muted-foreground)) !important;
                    font-style: normal !important;
                }
                .rich-text-editor-wrapper .ql-snow .ql-stroke {
                    stroke: hsl(var(--foreground)) !important;
                }
                .rich-text-editor-wrapper .ql-snow .ql-fill {
                    fill: hsl(var(--foreground)) !important;
                }
                .rich-text-editor-wrapper .ql-snow .ql-picker {
                    color: hsl(var(--foreground)) !important;
                }
                .rich-text-editor-wrapper .ql-snow .ql-picker-options {
                    background-color: hsl(var(--popover)) !important;
                    border-color: hsl(var(--border)) !important;
                    color: hsl(var(--popover-foreground)) !important;
                }
                /* Active and Hover state color */
                .rich-text-editor-wrapper .ql-snow.ql-toolbar button:hover,
                .rich-text-editor-wrapper .ql-snow.ql-toolbar button.ql-active,
                .rich-text-editor-wrapper .ql-snow.ql-toolbar .ql-picker-label:hover,
                .rich-text-editor-wrapper .ql-snow.ql-toolbar .ql-picker-label.ql-active,
                .rich-text-editor-wrapper .ql-snow.ql-toolbar .ql-picker-item:hover,
                .rich-text-editor-wrapper .ql-snow.ql-toolbar .ql-picker-item.ql-selected {
                    color: hsl(var(--primary)) !important;
                }
                .rich-text-editor-wrapper .ql-snow.ql-toolbar button:hover .ql-stroke,
                .rich-text-editor-wrapper .ql-snow.ql-toolbar button.ql-active .ql-stroke,
                .rich-text-editor-wrapper .ql-snow.ql-toolbar .ql-picker-label:hover .ql-stroke,
                .rich-text-editor-wrapper .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-stroke {
                    stroke: hsl(var(--primary)) !important;
                }
                .rich-text-editor-wrapper .ql-snow.ql-toolbar button:hover .ql-fill,
                .rich-text-editor-wrapper .ql-snow.ql-toolbar button.ql-active .ql-fill {
                    fill: hsl(var(--primary)) !important;
                }
            `}</style>
        </div>
    );
});

RichTextEditor.displayName = 'RichTextEditor';

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Attachment = {
    id: string;
    noteId: string;
    filename: string;
    mimeType: string;
    createdAt: number;
};

type Props = { noteId: string };

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export default function AttachmentPanel({ noteId }: Props) {
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [uploading, setUploading] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchAttachments = useCallback(async () => {
        const res = await fetch(`/api/attachments/${noteId}`);
        if (res.ok) setAttachments(await res.json());
    }, [noteId]);

    useEffect(() => {
        fetchAttachments();
    }, [fetchAttachments]);

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("noteId", noteId);
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            if (!res.ok) throw new Error("Upload failed");
            await fetchAttachments();
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    async function handleDelete(filename: string) {
        const res = await fetch(`/api/files/${noteId}/${encodeURIComponent(filename)}`, { method: "DELETE" });
        if (res.ok) setAttachments((prev) => prev.filter((a) => a.filename !== filename));
    }

    function markdownRef(attachment: Attachment) {
        const url = `/api/files/${attachment.noteId}/${encodeURIComponent(attachment.filename)}`;
        return IMAGE_TYPES.includes(attachment.mimeType)
            ? `![${attachment.filename}](${url})`
            : `[${attachment.filename}](${url})`;
    }

    async function copyRef(attachment: Attachment) {
        await navigator.clipboard.writeText(markdownRef(attachment));
        setCopied(attachment.id);
        setTimeout(() => setCopied(null), 1500);
    }

    return (
        <div className="border border-gray-200 rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Attachments</span>
                <label className={`cursor-pointer px-3 py-1 text-xs font-medium rounded border ${uploading ? "opacity-50 cursor-not-allowed" : "border-gray-300 hover:bg-gray-50"}`}>
                    {uploading ? "Uploading…" : "+ Upload file"}
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="sr-only"
                        disabled={uploading}
                        onChange={handleUpload}
                    />
                </label>
            </div>
            {attachments.length === 0 ? (
                <p className="text-xs text-gray-400">No attachments yet.</p>
            ) : (
                <ul className="space-y-1">
                    {attachments.map((a) => (
                        <li key={a.id} className="flex items-center gap-2 text-xs">
                            <span className="flex-1 truncate text-gray-700">{a.filename}</span>
                            <button
                                type="button"
                                onClick={() => copyRef(a)}
                                className="px-2 py-0.5 rounded border border-gray-300 hover:bg-gray-50 text-gray-600 whitespace-nowrap"
                                title="Copy markdown link"
                            >
                                {copied === a.id ? "Copied!" : "Copy link"}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDelete(a.filename)}
                                className="px-2 py-0.5 rounded border border-red-200 hover:bg-red-50 text-red-600"
                                title="Delete attachment"
                            >
                                Delete
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

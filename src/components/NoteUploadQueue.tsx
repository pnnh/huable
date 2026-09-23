"use client";

import { useEffect, useRef, useState } from "react";
import {
    MAX_CONCURRENT_UPLOADS,
    MAX_FILE_SIZE_BYTES,
    MAX_QUEUE_SIZE,
    hasAllowedExtension,
} from "@/lib/noteUploadLimits";

type QueueStatus = "pending" | "uploading" | "success" | "failed";

type UploadQueueItem = {
    id: string;
    file: File;
    name: string;
    extension: string;
    sizeBytes: number;
    lastModified: number;
    status: QueueStatus;
    errorMessage: string | null;
};

type Labels = {
    selectFiles: string;
    startUpload: string;
    queueFileName: string;
    queueExtension: string;
    queueSize: string;
    queueModified: string;
    queueActions: string;
    uploadStatusPending: string;
    uploadStatusUploading: string;
    uploadStatusSuccess: string;
    uploadStatusFailed: string;
    removeFile: string;
    queueFull: string;
    fileTooLarge: string;
    invalidFileType: string;
    nameConflict: string;
    uploadFailedGeneric: string;
};

type Props = {
    parentId: string | null;
    labels: Labels;
};

const MAX_FILE_SIZE_MB = String(MAX_FILE_SIZE_BYTES / (1024 * 1024));

function extensionOf(filename: string): string {
    const idx = filename.lastIndexOf(".");
    return idx >= 0 ? filename.slice(idx + 1) : "";
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function statusLabel(status: QueueStatus, labels: Labels): string {
    switch (status) {
        case "pending":
            return labels.uploadStatusPending;
        case "uploading":
            return labels.uploadStatusUploading;
        case "success":
            return labels.uploadStatusSuccess;
        case "failed":
            return labels.uploadStatusFailed;
    }
}

function statusClassName(status: QueueStatus): string {
    switch (status) {
        case "pending":
            return "bg-gray-100 text-gray-600";
        case "uploading":
            return "bg-blue-100 text-blue-700";
        case "success":
            return "bg-green-100 text-green-700";
        case "failed":
            return "bg-red-100 text-red-700 cursor-help";
    }
}

function mapErrorMessage(code: string | undefined, labels: Labels): string {
    switch (code) {
        case "name_conflict":
            return labels.nameConflict;
        case "file_too_large":
            return labels.fileTooLarge.replace("{max}", MAX_FILE_SIZE_MB);
        case "invalid_file":
            return labels.invalidFileType;
        default:
            return labels.uploadFailedGeneric;
    }
}

export default function NoteUploadQueue({ parentId, labels }: Props) {
    const [items, setItems] = useState<UploadQueueItem[]>([]);
    const [notice, setNotice] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const itemsRef = useRef<UploadQueueItem[]>([]);

    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        if (inputRef.current) inputRef.current.value = "";
        if (files.length === 0) return;

        const availableSlots = MAX_QUEUE_SIZE - items.length;
        let countRejected = false;
        let sizeRejected = false;
        let extRejected = false;
        const accepted: UploadQueueItem[] = [];

        for (const file of files) {
            if (accepted.length >= availableSlots) {
                countRejected = true;
                break;
            }
            if (!hasAllowedExtension(file.name)) {
                extRejected = true;
                continue;
            }
            if (file.size > MAX_FILE_SIZE_BYTES) {
                sizeRejected = true;
                continue;
            }
            accepted.push({
                id: crypto.randomUUID(),
                file,
                name: file.name,
                extension: extensionOf(file.name),
                sizeBytes: file.size,
                lastModified: file.lastModified,
                status: "pending",
                errorMessage: null,
            });
        }

        if (accepted.length > 0) {
            setItems((prev) => [...prev, ...accepted]);
        }

        if (countRejected) {
            setNotice(labels.queueFull.replace("{max}", String(MAX_QUEUE_SIZE)));
        } else if (sizeRejected) {
            setNotice(labels.fileTooLarge.replace("{max}", MAX_FILE_SIZE_MB));
        } else if (extRejected) {
            setNotice(labels.invalidFileType);
        } else {
            setNotice(null);
        }
    }

    function removeItem(id: string) {
        setItems((prev) => prev.filter((item) => !(item.id === id && item.status === "pending")));
    }

    async function uploadItem(item: UploadQueueItem) {
        const current = itemsRef.current.find((i) => i.id === item.id);
        if (!current || current.status !== "pending") return;

        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "uploading" } : i)));

        const fd = new FormData();
        fd.append("file", item.file);
        fd.append("parentId", parentId ?? "");

        try {
            const res = await fetch("/api/console/notes/upload", { method: "POST", body: fd });
            if (res.ok) {
                setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "success" } : i)));
                return;
            }
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            const message = mapErrorMessage(data.error, labels);
            setItems((prev) =>
                prev.map((i) => (i.id === item.id ? { ...i, status: "failed", errorMessage: message } : i)),
            );
        } catch {
            setItems((prev) =>
                prev.map((i) =>
                    i.id === item.id ? { ...i, status: "failed", errorMessage: labels.uploadFailedGeneric } : i,
                ),
            );
        }
    }

    async function startUpload() {
        const pending = items.filter((i) => i.status === "pending");
        if (pending.length === 0) return;

        setUploading(true);
        let cursor = 0;
        async function worker() {
            while (cursor < pending.length) {
                const item = pending[cursor];
                cursor += 1;
                await uploadItem(item);
            }
        }
        const workerCount = Math.min(MAX_CONCURRENT_UPLOADS, pending.length);
        await Promise.all(Array.from({ length: workerCount }, () => worker()));
        setUploading(false);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
                    {labels.selectFiles}
                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        accept=".md,.markdown"
                        className="sr-only"
                        onChange={handleFilesSelected}
                    />
                </label>
                <button
                    type="button"
                    onClick={startUpload}
                    disabled={uploading || items.every((i) => i.status !== "pending")}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {labels.startUpload}
                </button>
            </div>
            {notice && <p className="text-sm text-amber-600">{notice}</p>}
            {items.length > 0 && (
                <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
                    <thead className="bg-gray-50 text-left text-gray-500">
                        <tr>
                            <th className="px-3 py-2 font-medium">{labels.queueFileName}</th>
                            <th className="px-3 py-2 font-medium">{labels.queueExtension}</th>
                            <th className="px-3 py-2 font-medium">{labels.queueSize}</th>
                            <th className="px-3 py-2 font-medium">{labels.queueModified}</th>
                            <th className="px-3 py-2 font-medium">{labels.queueActions}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {items.map((item) => (
                            <tr key={item.id}>
                                <td className="px-3 py-2 text-gray-900 truncate max-w-xs">{item.name}</td>
                                <td className="px-3 py-2 text-gray-500">{item.extension}</td>
                                <td className="px-3 py-2 text-gray-500">{formatSize(item.sizeBytes)}</td>
                                <td className="px-3 py-2 text-gray-500">
                                    {new Date(item.lastModified).toLocaleString()}
                                </td>
                                <td className="px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusClassName(item.status)}`}
                                            title={item.status === "failed" ? (item.errorMessage ?? undefined) : undefined}
                                        >
                                            {statusLabel(item.status, labels)}
                                        </span>
                                        {item.status === "pending" && (
                                            <button
                                                type="button"
                                                onClick={() => removeItem(item.id)}
                                                className="px-2 py-0.5 rounded border border-gray-300 hover:bg-gray-50 text-gray-600 text-xs"
                                            >
                                                {labels.removeFile}
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

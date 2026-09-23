"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ChannelOption {
    id: string;
    name: string;
}

interface NotesBatchToolbarProps {
    selectedCount: number;
    selectedIds: string[];
    channels: ChannelOption[];
    onDone: () => void;
    labels: {
        batchPublish: string;
        noChannel: string;
        noChannelsAvailable: string;
        channelRequired: string;
        batchUpdateSuccess: string;
        batchUpdatePartial: string;
        batchUpdateFailed: string;
        save: string;
        cancel: string;
    };
}

interface BatchUpdateResult {
    updated: string[];
    skipped: { id: string; reason: string }[];
}

export default function NotesBatchToolbar({ selectedCount, selectedIds, channels, onDone, labels }: NotesBatchToolbarProps) {
    const router = useRouter();
    const disabled = selectedCount === 0;

    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [notice, setNotice] = useState<{ text: string; isError: boolean } | null>(null);

    async function submitBatchPublish(channelId: string) {
        setSubmitting(true);
        setNotice(null);
        try {
            const res = await fetch("/api/console/notes/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ noteIds: selectedIds, channelId }),
            });
            if (!res.ok) {
                setNotice({ text: labels.batchUpdateFailed, isError: true });
                return;
            }
            const result = (await res.json()) as BatchUpdateResult;
            if (result.updated.length > 0) {
                router.refresh();
                onDone();
            }
            if (result.skipped.length > 0) {
                setNotice({
                    text: labels.batchUpdatePartial
                        .replace("{updated}", String(result.updated.length))
                        .replace("{skipped}", String(result.skipped.length)),
                    isError: true,
                });
            } else {
                setNotice({
                    text: labels.batchUpdateSuccess.replace("{count}", String(result.updated.length)),
                    isError: false,
                });
            }
            setDialogOpen(false);
        } catch {
            setNotice({ text: labels.batchUpdateFailed, isError: true });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="flex items-center gap-3">
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    setNotice(null);
                    setDialogOpen(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            >
                {labels.batchPublish}
            </button>

            {notice && (
                <p className={`text-sm ${notice.isError ? "text-red-600" : "text-green-600"}`}>{notice.text}</p>
            )}

            {dialogOpen && (
                <BatchPublishDialog
                    channels={channels}
                    submitting={submitting}
                    labels={labels}
                    onCancel={() => setDialogOpen(false)}
                    onConfirm={submitBatchPublish}
                />
            )}
        </div>
    );
}

function BatchPublishDialog({
    channels,
    submitting,
    labels,
    onCancel,
    onConfirm,
}: {
    channels: ChannelOption[];
    submitting: boolean;
    labels: NotesBatchToolbarProps["labels"];
    onCancel: () => void;
    onConfirm: (channelId: string) => void;
}) {
    const [channelId, setChannelId] = useState("");
    const [error, setError] = useState<string | null>(null);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{labels.batchPublish}</h2>
                {channels.length === 0 ? (
                    <p className="text-sm text-gray-500 mb-4">{labels.noChannelsAvailable}</p>
                ) : (
                    <select
                        value={channelId}
                        onChange={(e) => setChannelId(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">{labels.noChannel}</option>
                        {channels.map((ch) => (
                            <option key={ch.id} value={ch.id}>
                                {ch.name}
                            </option>
                        ))}
                    </select>
                )}
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
                    >
                        {labels.cancel}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (!channelId) {
                                setError(labels.channelRequired);
                                return;
                            }
                            setError(null);
                            onConfirm(channelId);
                        }}
                        disabled={submitting}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {submitting ? "…" : labels.save}
                    </button>
                </div>
            </div>
        </div>
    );
}

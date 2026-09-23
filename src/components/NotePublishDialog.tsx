"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ChannelOption {
    id: string;
    name: string;
}

interface NotePublishDialogProps {
    noteId: string;
    channels: ChannelOption[];
    defaultChannelId: string;
    labels: {
        publish: string;
        publishNote: string;
        noteChannel: string;
        noChannel: string;
        noChannelsAvailable: string;
        channelRequired: string;
        publishFailed: string;
        save: string;
        cancel: string;
    };
}

export default function NotePublishDialog({ noteId, channels, defaultChannelId, labels }: NotePublishDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [channelId, setChannelId] = useState(defaultChannelId);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleConfirm() {
        if (!channelId) {
            setError(labels.channelRequired);
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch(`/api/console/notes/${noteId}/publish`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channelId }),
            });
            if (!res.ok) {
                setError(labels.publishFailed);
                return;
            }
            setOpen(false);
            router.refresh();
        } catch {
            setError(labels.publishFailed);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    setError(null);
                    setOpen(true);
                }}
                className="px-4 py-2 border border-blue-600 text-blue-600 text-sm font-medium rounded-md hover:bg-blue-50"
            >
                {labels.publish}
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{labels.publishNote}</h2>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{labels.noteChannel}</label>
                        {channels.length === 0 ? (
                            <p className="text-sm text-gray-500">{labels.noChannelsAvailable}</p>
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
                                onClick={() => setOpen(false)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
                            >
                                {labels.cancel}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={submitting || !channelId}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {submitting ? "…" : labels.save}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

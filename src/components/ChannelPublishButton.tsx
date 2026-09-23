"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ChannelPublishButtonProps {
    channelId: string;
    labels: {
        publish: string;
        publishChannel: string;
        publishChannelConfirm: string;
        publishFailed: string;
        confirm: string;
        cancel: string;
    };
}

export default function ChannelPublishButton({ channelId, labels }: ChannelPublishButtonProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleConfirm() {
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch(`/api/console/channels/${channelId}/publish`, { method: "POST" });
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
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">{labels.publishChannel}</h2>
                        <p className="text-sm text-gray-600">{labels.publishChannelConfirm}</p>
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
                                disabled={submitting}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {submitting ? "…" : labels.confirm}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

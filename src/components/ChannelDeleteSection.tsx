"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ChannelDeleteSectionProps {
    channelId: string;
    redirectTo: string;
    publishedNoteCount: number;
    labels: {
        deleteChannel: string;
        deleteChannelConfirm: string;
        deleteChannelHasNotes: string;
    };
}

export default function ChannelDeleteSection({
    channelId,
    redirectTo,
    publishedNoteCount,
    labels,
}: ChannelDeleteSectionProps) {
    const router = useRouter();
    const [deleting, setDeleting] = useState(false);
    const disabled = publishedNoteCount > 0 || deleting;

    async function handleDelete() {
        if (!window.confirm(labels.deleteChannelConfirm)) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/channels/${channelId}`, { method: "DELETE" });
            if (res.ok) {
                router.push(redirectTo);
            }
        } finally {
            setDeleting(false);
        }
    }

    return (
        <div className="mt-10 border-t border-red-100 pt-6">
            <span
                title={publishedNoteCount > 0 ? labels.deleteChannelHasNotes : undefined}
                className={publishedNoteCount > 0 ? "cursor-not-allowed inline-block" : "inline-block"}
            >
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={disabled}
                    className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors
                        ${disabled
                            ? "border-red-200 text-red-300 bg-white pointer-events-none"
                            : "border-red-400 text-red-600 bg-white hover:bg-red-50 hover:border-red-500"
                        }`}
                >
                    {deleting ? "…" : labels.deleteChannel}
                </button>
            </span>
        </div>
    );
}

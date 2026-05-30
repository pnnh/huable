"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RemoveFromChannelButtonProps {
    noteId: string;
    confirmMessage: string;
    label: string;
}

export default function RemoveFromChannelButton({ noteId, confirmMessage, label }: RemoveFromChannelButtonProps) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    async function handleClick() {
        if (!window.confirm(confirmMessage)) return;
        setBusy(true);
        try {
            await fetch(`/api/notes/${noteId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channelId: null }),
            });
            router.refresh();
        } finally {
            setBusy(false);
        }
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={busy}
            className="text-xs text-red-600 hover:underline disabled:opacity-50"
        >
            {busy ? "…" : label}
        </button>
    );
}

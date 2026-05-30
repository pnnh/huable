"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface NoteDeleteSectionProps {
    noteId: string;
    redirectTo: string;
    labels: {
        deleteNote: string;
        deleteNoteConfirm: string;
        deleteNoteHasAttachments: string;
    };
}

export default function NoteDeleteSection({ noteId, redirectTo, labels }: NoteDeleteSectionProps) {
    const router = useRouter();
    const [attachmentCount, setAttachmentCount] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Fetch initial attachment count
    useEffect(() => {
        fetch(`/api/attachments/${noteId}`)
            .then((r) => r.json())
            .then((data: unknown[]) => setAttachmentCount(data.length))
            .catch(() => setAttachmentCount(0));
    }, [noteId]);

    // Keep in sync when AttachmentPanel adds/removes attachments
    useEffect(() => {
        function onChanged(e: Event) {
            const detail = (e as CustomEvent<{ count: number }>).detail;
            setAttachmentCount(detail.count);
        }
        window.addEventListener("attachments-changed", onChanged);
        return () => window.removeEventListener("attachments-changed", onChanged);
    }, []);

    async function handleDelete() {
        if (!window.confirm(labels.deleteNoteConfirm)) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
            if (res.ok) {
                router.push(redirectTo);
            }
        } finally {
            setDeleting(false);
        }
    }

    const hasAttachments = attachmentCount !== null && attachmentCount > 0;

    return (
        <div className="mt-8 border-t border-red-100 pt-6">
            <span
                title={hasAttachments ? labels.deleteNoteHasAttachments : undefined}
                className={hasAttachments ? "cursor-not-allowed inline-block" : "inline-block"}
            >
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={hasAttachments || deleting || attachmentCount === null}
                    className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors
                        ${hasAttachments || deleting || attachmentCount === null
                            ? "border-red-200 text-red-300 bg-white pointer-events-none"
                            : "border-red-400 text-red-600 bg-white hover:bg-red-50 hover:border-red-500"
                        }`}
                >
                    {deleting ? "…" : labels.deleteNote}
                </button>
            </span>
        </div>
    );
}

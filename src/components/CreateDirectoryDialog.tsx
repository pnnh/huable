"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CreateDirectoryDialogProps {
    parentId: string | null;
    labels: {
        newDirectory: string;
        directoryName: string;
        directoryDescription: string;
        directoryNameRequired: string;
        nameConflict: string;
        save: string;
        cancel: string;
    };
}

export default function CreateDirectoryDialog({ parentId, labels }: CreateDirectoryDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    function openDialog() {
        setName("");
        setDescription("");
        setError(null);
        setOpen(true);
    }

    async function handleConfirm() {
        const title = name.trim();
        if (!title) {
            setError(labels.directoryNameRequired);
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const res = await fetch("/api/console/notes/directories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, description, parentId }),
            });
            if (res.status === 409) {
                setError(labels.nameConflict);
                return;
            }
            if (!res.ok) {
                setError(labels.directoryNameRequired);
                return;
            }
            setOpen(false);
            router.refresh();
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={openDialog}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
            >
                {labels.newDirectory}
            </button>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{labels.newDirectory}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {labels.directoryName}
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {labels.directoryDescription}
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            {error && <p className="text-sm text-red-600">{error}</p>}
                        </div>
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
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? "…" : labels.save}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

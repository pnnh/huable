"use client";

import { useActionState } from "react";
import Link from "next/link";

export interface NoteFormState {
    error: string | null;
}

interface NoteEditorFormProps {
    action: (prevState: NoteFormState, formData: FormData) => Promise<NoteFormState>;
    defaultTitle: string;
    defaultBody: string;
    backHref: string;
    toolbarExtra?: React.ReactNode;
    labels: {
        noteTitle: string;
        noteBody: string;
        save: string;
        cancel: string;
    };
}

export default function NoteEditorForm({
    action,
    defaultTitle,
    defaultBody,
    backHref,
    toolbarExtra,
    labels,
}: NoteEditorFormProps) {
    const [state, formAction, isPending] = useActionState<NoteFormState, FormData>(action, { error: null });

    return (
        <form action={formAction} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{labels.noteTitle}</label>
                <input
                    name="title"
                    type="text"
                    defaultValue={defaultTitle}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{labels.noteBody}</label>
                <textarea
                    name="body"
                    rows={16}
                    defaultValue={defaultBody}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {labels.save}
                </button>
                <Link
                    href={backHref}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
                >
                    {labels.cancel}
                </Link>
                {toolbarExtra}
            </div>
        </form>
    );
}

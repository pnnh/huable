"use client";

import { useActionState } from "react";
import Link from "next/link";

export interface NoteFormState {
    error: string | null;
}

interface ChannelOption {
    id: string;
    name: string;
}

interface NoteEditorFormProps {
    action: (prevState: NoteFormState, formData: FormData) => Promise<NoteFormState>;
    defaultTitle: string;
    defaultBody: string;
    defaultChannelId: string;
    defaultIsPublished: boolean;
    channels: ChannelOption[];
    backHref: string;
    labels: {
        noteTitle: string;
        noteBody: string;
        noteChannel: string;
        noChannel: string;
        publishToChannel: string;
        save: string;
        cancel: string;
    };
}

export default function NoteEditorForm({
    action,
    defaultTitle,
    defaultBody,
    defaultChannelId,
    defaultIsPublished,
    channels,
    backHref,
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
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{labels.noteChannel}</label>
                <select
                    name="channelId"
                    defaultValue={defaultChannelId}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">{labels.noChannel}</option>
                    {channels.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                            {ch.name}
                        </option>
                    ))}
                </select>
            </div>
            <div className="flex items-center gap-3">
                <input
                    type="checkbox"
                    id="isPublished"
                    name="isPublished"
                    value="true"
                    defaultChecked={defaultIsPublished}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <label htmlFor="isPublished" className="text-sm font-medium text-gray-700">
                    {labels.publishToChannel}
                </label>
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
            </div>
        </form>
    );
}

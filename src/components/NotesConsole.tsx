"use client";

import { useMemo, useState, type ReactNode } from "react";
import NotesTreeTable, { type NoteTreeItem } from "@/components/NotesTreeTable";
import NotesBatchToolbar from "@/components/NotesBatchToolbar";
import type { LangKey } from "@/lib/language";

interface ChannelOption {
    id: string;
    name: string;
}

interface NotesConsoleProps {
    lang: LangKey;
    title: ReactNode;
    items: NoteTreeItem[];
    channels: ChannelOption[];
    children?: ReactNode;
    labels: {
        noteTitle: string;
        noteChannel: string;
        noteStatus: string;
        updated: string;
        statusDraft: string;
        statusPending: string;
        statusApproved: string;
        statusRejected: string;
        noContentInDirectory: string;
        selectAllNotes: string;
        selectNote: string;
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
    noNotesYet: string;
}

export default function NotesConsole({ lang, title, items, channels, children, labels, noNotesYet }: NotesConsoleProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const rootNoteIds = useMemo(
        () => items.filter((item) => item.mimeType !== "directory").map((item) => item.id),
        [items],
    );

    function toggleRow(id: string) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    function toggleAll() {
        setSelectedIds((prev) => {
            const allSelected = rootNoteIds.length > 0 && rootNoteIds.every((id) => prev.has(id));
            const next = new Set(prev);
            if (allSelected) {
                rootNoteIds.forEach((id) => next.delete(id));
            } else {
                rootNoteIds.forEach((id) => next.add(id));
            }
            return next;
        });
    }

    function clearIds(ids: string[]) {
        if (ids.length === 0) return;
        setSelectedIds((prev) => {
            let changed = false;
            const next = new Set(prev);
            for (const id of ids) {
                if (next.delete(id)) changed = true;
            }
            return changed ? next : prev;
        });
    }

    function clearSelection() {
        setSelectedIds(new Set());
    }

    const selectedRootCount = rootNoteIds.filter((id) => selectedIds.has(id)).length;
    const headerState: "all" | "partial" | "none" =
        rootNoteIds.length === 0 || selectedRootCount === 0
            ? "none"
            : selectedRootCount === rootNoteIds.length
              ? "all"
              : "partial";

    return (
        <>
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                <div className="flex items-center gap-3">
                    {children}
                    <NotesBatchToolbar
                        selectedCount={selectedIds.size}
                        selectedIds={Array.from(selectedIds)}
                        channels={channels}
                        onDone={clearSelection}
                        labels={labels}
                    />
                </div>
            </div>
            {items.length === 0 ? (
                <p className="text-gray-500">{noNotesYet}</p>
            ) : (
                <NotesTreeTable
                    lang={lang}
                    items={items}
                    labels={labels}
                    selectedIds={selectedIds}
                    onToggleRow={toggleRow}
                    onToggleAll={toggleAll}
                    onClearIds={clearIds}
                    headerState={headerState}
                />
            )}
        </>
    );
}

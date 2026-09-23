"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FaCaretRight, FaCaretDown, FaRegFolder, FaRegFileAlt } from "react-icons/fa";
import type { LangKey } from "@/lib/language";
import ApprovalStatusBadge from "@/components/ApprovalStatusBadge";

export interface NoteTreeItem {
    id: string;
    title: string;
    mimeType: "directory" | "text/markdown";
    hasChildren: boolean;
    updatedAt: number;
    channelName?: string | null;
    approvalStatus?: "draft" | "pending" | "approved" | "rejected";
}

interface Labels {
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
}

interface NotesTreeTableProps {
    lang: LangKey;
    items: NoteTreeItem[];
    labels: Labels;
    selectedIds: Set<string>;
    onToggleRow: (id: string) => void;
    onToggleAll: () => void;
    onClearIds: (ids: string[]) => void;
    headerState: "all" | "partial" | "none";
}

const INDENT_STEP = 20;

// Explicit BCP-47 tags so date formatting is identical between SSR (Node) and
// client hydration, regardless of each environment's default locale settings.
const DATE_LOCALE: Record<LangKey, string> = {
    en: "en-US",
    es: "es-ES",
    fr: "fr-FR",
    zh: "zh-CN",
};

function formatUpdatedAt(updatedAt: number, lang: LangKey): string {
    return new Date(updatedAt).toLocaleDateString(DATE_LOCALE[lang]);
}

export default function NotesTreeTable({
    lang,
    items,
    labels,
    selectedIds,
    onToggleRow,
    onToggleAll,
    onClearIds,
    headerState,
}: NotesTreeTableProps) {
    const headerCheckboxRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (headerCheckboxRef.current) {
            headerCheckboxRef.current.indeterminate = headerState === "partial";
        }
    }, [headerState]);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase border-b border-gray-200">
                    <tr>
                        <th className="py-3 pr-2 w-8">
                            <input
                                ref={headerCheckboxRef}
                                type="checkbox"
                                checked={headerState === "all"}
                                onChange={onToggleAll}
                                aria-label={labels.selectAllNotes}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600"
                            />
                        </th>
                        <th className="py-3 pr-4">{labels.noteTitle}</th>
                        <th className="py-3 pr-4">{labels.noteChannel}</th>
                        <th className="py-3 pr-4">{labels.noteStatus}</th>
                        <th className="py-3">{labels.updated}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {items.map((item) => (
                        <TreeRow
                            key={item.id}
                            lang={lang}
                            item={item}
                            depth={0}
                            labels={labels}
                            selectedIds={selectedIds}
                            onToggleRow={onToggleRow}
                            onClearIds={onClearIds}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function TreeRow({
    lang,
    item,
    depth,
    labels,
    selectedIds,
    onToggleRow,
    onClearIds,
}: {
    lang: LangKey;
    item: NoteTreeItem;
    depth: number;
    labels: Labels;
    selectedIds: Set<string>;
    onToggleRow: (id: string) => void;
    onClearIds: (ids: string[]) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [children, setChildren] = useState<NoteTreeItem[] | null>(null);
    const [loading, setLoading] = useState(false);
    const isDirectory = item.mimeType === "directory";

    // When this row's loaded children go out of view (parent directory
    // collapses/unmounts), drop their ids from the selection so batch
    // actions never target notes the user can no longer see.
    useEffect(() => {
        return () => {
            if (children) {
                const ids = children.filter((c) => c.mimeType !== "directory").map((c) => c.id);
                if (ids.length) onClearIds(ids);
            }
        };
    }, [children, onClearIds]);

    async function toggleExpand() {
        const next = !expanded;
        setExpanded(next);
        if (next && children === null) {
            setLoading(true);
            try {
                const res = await fetch(`/api/console/notes/children?parentId=${item.id}`);
                const data = (await res.json()) as NoteTreeItem[];
                setChildren(data);
            } finally {
                setLoading(false);
            }
        }
    }

    const href = isDirectory
        ? `/${lang}/console/notes?parentId=${item.id}`
        : `/${lang}/console/notes/${item.id}`;

    return (
        <>
            <tr>
                <td className="py-3 pr-2 w-8">
                    {!isDirectory && (
                        <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => onToggleRow(item.id)}
                            aria-label={`${labels.selectNote}: ${item.title}`}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                    )}
                </td>
                <td className="py-3 pr-4">
                    <div className="flex items-center gap-2" style={{ paddingLeft: depth * INDENT_STEP }}>
                        {isDirectory && item.hasChildren ? (
                            <button
                                type="button"
                                onClick={toggleExpand}
                                aria-label="toggle"
                                className="flex-none text-gray-400 hover:text-gray-600"
                            >
                                {expanded ? <FaCaretDown size={12} /> : <FaCaretRight size={12} />}
                            </button>
                        ) : (
                            <span className="inline-block w-3 flex-none" />
                        )}
                        {isDirectory ? (
                            <FaRegFolder className="flex-none text-gray-400" size={14} />
                        ) : (
                            <FaRegFileAlt className="flex-none text-gray-400" size={14} />
                        )}
                        <Link href={href} className="text-blue-600 hover:underline font-medium">
                            {item.title}
                        </Link>
                    </div>
                </td>
                <td className="py-3 pr-4 text-gray-500">{isDirectory ? "—" : (item.channelName ?? "—")}</td>
                <td className="py-3 pr-4">
                    {isDirectory ? (
                        "—"
                    ) : (
                        <ApprovalStatusBadge status={item.approvalStatus ?? "draft"} labels={labels} />
                    )}
                </td>
                <td className="py-3 text-gray-500">{formatUpdatedAt(item.updatedAt, lang)}</td>
            </tr>
            {expanded &&
                (loading ? (
                    <tr>
                        <td
                            colSpan={5}
                            className="py-2 text-gray-400 text-xs"
                            style={{ paddingLeft: (depth + 1) * INDENT_STEP + 24 }}
                        >
                            …
                        </td>
                    </tr>
                ) : children && children.length === 0 ? (
                    <tr>
                        <td
                            colSpan={5}
                            className="py-2 text-gray-400 text-xs"
                            style={{ paddingLeft: (depth + 1) * INDENT_STEP + 24 }}
                        >
                            {labels.noContentInDirectory}
                        </td>
                    </tr>
                ) : (
                    children?.map((child) => (
                        <TreeRow
                            key={child.id}
                            lang={lang}
                            item={child}
                            depth={depth + 1}
                            labels={labels}
                            selectedIds={selectedIds}
                            onToggleRow={onToggleRow}
                            onClearIds={onClearIds}
                        />
                    ))
                ))}
        </>
    );
}

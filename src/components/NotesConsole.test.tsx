import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { LangKey } from "@/lib/language";
import type { NoteTreeItem } from "@/components/NotesTreeTable";

vi.mock("next/link", () => ({
    default: ({ children, href, className, ...rest }: any) => (
        <a href={href} className={className} {...rest}>
            {children}
        </a>
    ),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ refresh: vi.fn() }),
}));

import NotesConsole from "./NotesConsole";

const lang: LangKey = "en";

const labels = {
    noteTitle: "Title",
    noteChannel: "Channel",
    noteStatus: "Status",
    updated: "Updated",
    statusDraft: "Draft",
    statusPending: "Pending review",
    statusApproved: "Approved",
    statusRejected: "Rejected",
    noContentInDirectory: "No content in this directory",
    selectAllNotes: "Select all notes",
    selectNote: "Select note",
    batchPublish: "Batch Publish",
    noChannel: "— No channel —",
    noChannelsAvailable: "You don't have any channels yet. Create a channel first.",
    channelRequired: "Please select a channel.",
    batchUpdateSuccess: "Updated {count} note(s).",
    batchUpdatePartial: "{updated} note(s) updated, {skipped} skipped.",
    batchUpdateFailed: "Failed to update notes. Please try again.",
    save: "Save",
    cancel: "Cancel",
};

const items: NoteTreeItem[] = [
    { id: "dir-1", title: "My Directory", mimeType: "directory", hasChildren: false, updatedAt: Date.now() },
    { id: "note-1", title: "Note One", mimeType: "text/markdown", hasChildren: false, updatedAt: Date.now(), channelName: null, approvalStatus: "draft" },
    { id: "note-2", title: "Note Two", mimeType: "text/markdown", hasChildren: false, updatedAt: Date.now(), channelName: "General", approvalStatus: "approved" },
];

function renderConsole() {
    return render(
        <NotesConsole lang={lang} title="Notes" items={items} channels={[{ id: "ch-1", name: "General" }]} labels={labels} noNotesYet="No notes yet.">
            <button type="button">Extra Action</button>
        </NotesConsole>,
    );
}

describe("NotesConsole selection", () => {
    it("renders a checkbox only for note rows, not directory rows", () => {
        renderConsole();

        expect(screen.getByLabelText("Select note: Note One")).toBeInTheDocument();
        expect(screen.getByLabelText("Select note: Note Two")).toBeInTheDocument();
        expect(screen.queryByLabelText("Select note: My Directory")).not.toBeInTheDocument();
    });

    it("disables the batch publish button when nothing is selected", () => {
        renderConsole();

        expect(screen.getByText("Batch Publish")).toBeDisabled();
    });

    it("enables the batch publish button once a note is selected", () => {
        renderConsole();

        screen.getByLabelText("Select note: Note One").click();

        expect(screen.getByText("Batch Publish")).toBeEnabled();
    });

    it("selects all notes (not directories) via the header checkbox, and toggling again clears them", () => {
        renderConsole();

        const headerCheckbox = screen.getByLabelText("Select all notes") as HTMLInputElement;
        headerCheckbox.click();

        expect(screen.getByLabelText("Select note: Note One")).toBeChecked();
        expect(screen.getByLabelText("Select note: Note Two")).toBeChecked();
        expect(headerCheckbox.checked).toBe(true);

        headerCheckbox.click();

        expect(screen.getByLabelText("Select note: Note One")).not.toBeChecked();
        expect(screen.getByLabelText("Select note: Note Two")).not.toBeChecked();
        expect(headerCheckbox.checked).toBe(false);
    });

    it("renders the extra toolbar children passed from the server page", () => {
        renderConsole();
        expect(screen.getByText("Extra Action")).toBeInTheDocument();
    });

    it("renders an approval status badge per note row based on approvalStatus", () => {
        renderConsole();

        const rowOne = screen.getByLabelText("Select note: Note One").closest("tr");
        const rowTwo = screen.getByLabelText("Select note: Note Two").closest("tr");

        expect(rowOne).not.toBeNull();
        expect(rowTwo).not.toBeNull();
        expect(rowOne?.textContent).toContain("Draft");
        expect(rowTwo?.textContent).toContain("Approved");
    });
});

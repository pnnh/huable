import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { t } from "@/lib/i18n";
import NoteUploadQueue from "@/components/NoteUploadQueue";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ lang: string }>;
    searchParams: Promise<{ parentId?: string }>;
};

export default async function NoteUploadPage({ params, searchParams }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;
    const { parentId: rawParentId } = await searchParams;
    const parentId = rawParentId || null;

    const backHref = parentId ? `/${l}/console/notes?parentId=${parentId}` : `/${l}/console/notes`;

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">{t(l, "uploadNotes")}</h1>
                    <Link href={backHref} className="text-sm text-gray-600 hover:text-gray-900">
                        {t(l, "cancel")}
                    </Link>
                </div>
                <NoteUploadQueue
                    parentId={parentId}
                    labels={{
                        selectFiles: t(l, "selectFiles"),
                        startUpload: t(l, "startUpload"),
                        queueFileName: t(l, "queueFileName"),
                        queueExtension: t(l, "queueExtension"),
                        queueSize: t(l, "queueSize"),
                        queueModified: t(l, "queueModified"),
                        queueActions: t(l, "queueActions"),
                        uploadStatusPending: t(l, "uploadStatusPending"),
                        uploadStatusUploading: t(l, "uploadStatusUploading"),
                        uploadStatusSuccess: t(l, "uploadStatusSuccess"),
                        uploadStatusFailed: t(l, "uploadStatusFailed"),
                        removeFile: t(l, "removeFile"),
                        queueFull: t(l, "queueFull"),
                        fileTooLarge: t(l, "fileTooLarge"),
                        invalidFileType: t(l, "invalidFileType"),
                        nameConflict: t(l, "nameConflict"),
                        uploadFailedGeneric: t(l, "uploadFailedGeneric"),
                    }}
                />
            </main>
            <SiteFooter lang={l} />
        </>
    );
}

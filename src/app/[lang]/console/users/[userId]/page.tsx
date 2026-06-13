import { notFound, redirect } from "next/navigation";
import { eq, count } from "drizzle-orm";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { users } from "@/db/schema";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Link from "next/link";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ lang: string; userId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function UserDetailPage({ params, searchParams }: Props) {
    const { lang, userId } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const viewer = await getCurrentUser();
    const db = getDb();

    const targetRows = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
    const target = targetRows[0];
    if (!target) notFound();

    const sp = await searchParams;
    const errorKey = sp?.error;
    const isSaved = sp?.saved === "1";

    let errorMsg = "";
    if (errorKey === "admin_min") {
        errorMsg = t(l, "adminMinError");
    } else if (errorKey === "unauthorized" || errorKey === "invalid") {
        errorMsg = t(l, "accessDenied") || "Action not allowed.";
    }

    async function handleSaveRole(formData: FormData) {
        "use server";
        const db2 = getDb();
        const viewer2 = await getCurrentUser();
        const targetId = userId;

        if (viewer2.sysrole !== "admin" || viewer2.id === targetId) {
            redirect(`/${lang}/console/users/${targetId}?error=unauthorized`);
        }

        const newRoleRaw = (formData.get("sysrole") as string | null) ?? "";
        const newRole = newRoleRaw.trim() as "admin" | "normal";
        if (newRole !== "admin" && newRole !== "normal") {
            redirect(`/${lang}/console/users/${targetId}?error=invalid`);
        }

        const targetRows2 = await db2
            .select()
            .from(users)
            .where(eq(users.id, targetId))
            .limit(1);
        const target2 = targetRows2[0];
        if (!target2) {
            redirect(`/${lang}/console/users`);
        }

        if (target2.sysrole === "admin" && newRole === "normal") {
            const adminCountRows = await db2
                .select({ cnt: count() })
                .from(users)
                .where(eq(users.sysrole, "admin"));
            const currentAdminCount = adminCountRows[0]?.cnt ?? 0;
            if (currentAdminCount <= 2) {
                redirect(`/${lang}/console/users/${targetId}?error=admin_min`);
            }
        }

        await db2
            .update(users)
            .set({ sysrole: newRole })
            .where(eq(users.id, targetId));

        redirect(`/${lang}/console/users/${targetId}?saved=1`);
    }

    const canManageRole = viewer.sysrole === "admin" && viewer.id !== target.id;

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-6">
                    <Link href={`/${l}/console/users`} className="text-sm text-blue-600 hover:underline">
                        ← {t(l, "users")}
                    </Link>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-8">{t(l, "userDetails")}</h1>

                <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-gray-500">{t(l, "username")}</div>
                        <div className="mt-0.5 text-base text-gray-900">{target.name}</div>
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-wide text-gray-500">{t(l, "email")}</div>
                        <div className="mt-0.5 text-base text-gray-900 font-medium">{target.email}</div>
                    </div>
                    {target.nickname && (
                        <div>
                            <div className="text-xs uppercase tracking-wide text-gray-500">{t(l, "nickname")}</div>
                            <div className="mt-0.5 text-base text-gray-900">{target.nickname}</div>
                        </div>
                    )}
                    {target.bio && (
                        <div>
                            <div className="text-xs uppercase tracking-wide text-gray-500">{t(l, "bio")}</div>
                            <div className="mt-0.5 text-sm text-gray-700 whitespace-pre-wrap">{target.bio}</div>
                        </div>
                    )}
                    <div>
                        <div className="text-xs uppercase tracking-wide text-gray-500">{t(l, "created")}</div>
                        <div className="mt-0.5 text-sm text-gray-500">
                            {new Date(target.createdAt).toLocaleString()}
                        </div>
                    </div>
                </div>

                {canManageRole && (
                    <div className="mt-10 border-t pt-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-3">{t(l, "systemRole")}</h2>
                        <form action={handleSaveRole} className="space-y-3">
                            <div className="flex items-center gap-6">
                                <label className="inline-flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        name="sysrole"
                                        value="admin"
                                        defaultChecked={target.sysrole === "admin"}
                                        className="h-4 w-4 accent-blue-600"
                                    />
                                    admin
                                </label>
                                <label className="inline-flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        name="sysrole"
                                        value="normal"
                                        defaultChecked={target.sysrole === "normal"}
                                        className="h-4 w-4 accent-blue-600"
                                    />
                                    normal
                                </label>
                            </div>
                            <button
                                type="submit"
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                            >
                                {t(l, "save")}
                            </button>
                        </form>
                        {errorMsg && (
                            <p className="mt-3 text-sm text-red-600">{errorMsg}</p>
                        )}
                        {isSaved && !errorMsg && (
                            <p className="mt-3 text-sm text-green-600">{t(l, "roleSaved")}</p>
                        )}
                    </div>
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}

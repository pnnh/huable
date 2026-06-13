import { notFound, redirect } from "next/navigation";
import { desc } from "drizzle-orm";
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

const PAGE_SIZE = 20;

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function UsersListPage({ params, searchParams }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const user = await getCurrentUser();
    if (user.sysrole !== "admin") {
        redirect(`/${l}/console`);
    }

    const sp = await searchParams;
    const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const db = getDb();

    const total = await db.$count(users);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageOffset = (currentPage - 1) * PAGE_SIZE;

    const pageUsers = await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(PAGE_SIZE)
        .offset(pageOffset);

    const buildUrl = (p: number) => {
        const params2 = new URLSearchParams();
        if (p > 1) params2.set("page", String(p));
        const qs = params2.toString();
        return `/${l}/console/users${qs ? `?${qs}` : ""}`;
    };

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">{t(l, "users")}</h1>
                </div>
                {pageUsers.length === 0 ? (
                    <p className="text-gray-500">No users yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase border-b border-gray-200">
                                <tr>
                                    <th className="py-3 pr-4">{t(l, "username")}</th>
                                    <th className="py-3 pr-4">{t(l, "email")}</th>
                                    <th className="py-3 pr-4">{t(l, "systemRole")}</th>
                                    <th className="py-3 pr-4">{t(l, "created")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {pageUsers.map((u) => (
                                    <tr key={u.id}>
                                        <td className="py-3 pr-4 text-gray-900">{u.name}</td>
                                        <td className="py-3 pr-4">
                                            <Link
                                                href={`/${l}/console/users/${u.id}`}
                                                className="text-blue-600 hover:underline font-medium"
                                            >
                                                {u.email}
                                            </Link>
                                        </td>
                                        <td className="py-3 pr-4">
                                            <span
                                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                                    u.sysrole === "admin"
                                                        ? "bg-purple-100 text-purple-700"
                                                        : "bg-gray-100 text-gray-600"
                                                }`}
                                            >
                                                {u.sysrole}
                                            </span>
                                        </td>
                                        <td className="py-3 pr-4 text-gray-500">
                                            {new Date(u.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="mt-10 flex items-center justify-between text-sm text-gray-500">
                        {currentPage > 1 ? (
                            <Link
                                href={buildUrl(currentPage - 1)}
                                className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                            >
                                ← Prev
                            </Link>
                        ) : (
                            <span />
                        )}
                        <span>
                            {currentPage} / {totalPages}
                        </span>
                        {currentPage < totalPages ? (
                            <Link
                                href={buildUrl(currentPage + 1)}
                                className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                            >
                                Next →
                            </Link>
                        ) : (
                            <span />
                        )}
                    </div>
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}

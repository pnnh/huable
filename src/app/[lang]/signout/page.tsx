import { notFound, redirect } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { isAuthenticated } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { cookies } from "next/headers";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }> };

export default async function SignOutPage({ params }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const authed = await isAuthenticated();
    const isDev = process.env.NODE_ENV === "development";

    if (!isDev) {
        // Non-dev: show empty no-access prompt
        return (
            <>
                <SiteHeader lang={l} />
                <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="text-center text-gray-500 py-16">
                        <p className="text-xl font-medium mb-2">{t(l, "accessDenied")}</p>
                        <p className="text-sm">{t(l, "devOnly")}</p>
                    </div>
                </main>
                <SiteFooter lang={l} />
            </>
        );
    }

    async function handleSignOut() {
        "use server";
        const cookieStore = await cookies();
        cookieStore.delete("user_id");
        cookieStore.delete("dev_user_email");
        cookieStore.delete("dev_user_name");
        // After logout, go to site home (root auto-detects best lang)
        redirect("/");
    }

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{t(l, "signOut")}</h1>
                <p className="text-gray-500 mb-8">{t(l, "signOutConfirm")}</p>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <form action={handleSignOut} className="flex flex-col gap-4">
                        <button
                            type="submit"
                            className="w-full inline-flex justify-center items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            {t(l, "signOut")}
                        </button>
                        <Link
                            href={`/${lang}/console`}
                            className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            {t(l, "cancel")}
                        </Link>
                    </form>
                </div>

                {!authed && (
                    <p className="mt-4 text-xs text-gray-400 text-center">
                        You are not currently signed in via dev cookie.
                    </p>
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}

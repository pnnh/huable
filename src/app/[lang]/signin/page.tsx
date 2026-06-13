import { notFound, redirect } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { isAuthenticated } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { cookies } from "next/headers";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }> };

export default async function SignInPage({ params }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const authed = await isAuthenticated();
    if (authed) {
        redirect(`/${lang}/console`);
    }

    const isDev = process.env.NODE_ENV === "development";
    if (!isDev) {
        // Non-dev: show empty no-access prompt (no sign-in allowed)
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

    async function handleSignIn(formData: FormData) {
        "use server";
        const emailRaw = (formData.get("email") as string | null) ?? "";
        const email = emailRaw.trim();
        if (!email) {
            // Invalid; re-render page (simple behavior, browser also enforces required)
            return;
        }
        let name = ((formData.get("name") as string | null) ?? "").trim();
        if (!name) {
            // If no username provided, take the local part of email as name ("邮箱名称")
            name = email.split("@")[0] || email;
        }

        const cookieStore = await cookies();
        // Clear any previous dev identity (support switch user / "之前用户退出")
        cookieStore.delete("user_id");
        cookieStore.delete("dev_user_email");
        cookieStore.delete("dev_user_name");

        // Set new dev identity cookies. Use email as stable id (consistent with JWT prod path).
        const maxAge = 60 * 60 * 24 * 30; // 30 days
        cookieStore.set("dev_user_email", email, { path: "/", maxAge, sameSite: "lax" });
        cookieStore.set("dev_user_name", name, { path: "/", maxAge, sameSite: "lax" });

        redirect(`/${lang}/console`);
    }

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{t(l, "signInTitle")}</h1>
                <p className="text-gray-500 mb-8 text-sm">{t(l, "signInHint")}</p>

                <form action={handleSignIn} className="space-y-6 bg-white border border-gray-200 rounded-lg p-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            {t(l, "email")}
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            autoComplete="email"
                            placeholder="dev@example.com"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            {t(l, "username")} <span className="text-gray-400">(optional)</span>
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            autoComplete="name"
                            placeholder={t(l, "username")}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="mt-1 text-xs text-gray-500">If left blank, the part before @ in email will be used.</p>
                    </div>
                    <button
                        type="submit"
                        className="w-full inline-flex justify-center items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {t(l, "signIn")}
                    </button>
                </form>

                <p className="mt-6 text-xs text-gray-400 text-center">
                    Development only. Sets a cookie to simulate authenticated user for /console routes.
                </p>
            </main>
            <SiteFooter lang={l} />
        </>
    );
}

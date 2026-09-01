import { notFound, redirect } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { isAuthenticated } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { cookies } from "next/headers";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ lang: string }>;
    searchParams: Promise<{ error?: string }>;
};

// Maps the `?error=` query values set by the Calieo callback route to translation keys.
const CALIEO_ERROR_KEYS = {
    calieo_unavailable: "calieoErrorUnavailable",
    access_denied: "calieoErrorAccessDenied",
    invalid_state: "calieoErrorInvalidState",
    token_exchange_failed: "calieoErrorTokenExchangeFailed",
    invalid_id_token: "calieoErrorInvalidIdToken",
    missing_email: "calieoErrorMissingEmail",
} as const;

export default async function SignInPage({ params, searchParams }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const authed = await isAuthenticated();
    if (authed) {
        redirect(`/${lang}/console`);
    }

    const { error } = await searchParams;
    const errorKey = error && error in CALIEO_ERROR_KEYS ? CALIEO_ERROR_KEYS[error as keyof typeof CALIEO_ERROR_KEYS] : undefined;
    const errorBanner = errorKey ? (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {t(l, errorKey)}
        </div>
    ) : null;

    const calieoButton = (
        <a
            href={`/api/auth/calieo/login?lang=${lang}`}
            className="w-full inline-flex justify-center items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
            {t(l, "signInWithCalieo")}
        </a>
    );

    const isDev = process.env.NODE_ENV === "development";
    if (!isDev) {
        // Production: Calieo is the only sign-in method (FR-008).
        return (
            <>
                <SiteHeader lang={l} />
                <main className="flex-1 w-full max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h1 className="text-2xl font-bold text-gray-900 mb-8">{t(l, "signIn")}</h1>
                    {errorBanner}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        {calieoButton}
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
                {errorBanner}

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

                <div className="my-6 flex items-center gap-3 text-xs text-gray-400" aria-hidden="true">
                    <div className="h-px flex-1 bg-gray-200" />
                    {t(l, "orDivider")}
                    <div className="h-px flex-1 bg-gray-200" />
                </div>

                {calieoButton}

                <p className="mt-6 text-xs text-gray-400 text-center">
                    Development only. The form above sets a cookie to simulate an authenticated user for /console routes.
                </p>
            </main>
            <SiteFooter lang={l} />
        </>
    );
}


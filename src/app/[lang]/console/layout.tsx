import { notFound, redirect } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { isAuthenticated } from "@/lib/auth";
import { t } from "@/lib/i18n";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

type Props = {
  params: Promise<{ lang: string }>;
  children: React.ReactNode;
};

export default async function ConsoleLayout({ params, children }: Props) {
  const { lang } = await params;
  if (!isValidLang(lang)) notFound();
  const l = lang as LangKey;

  const authed = await isAuthenticated();
  const isDev = process.env.NODE_ENV === 'development';

  if (!authed) {
    if (isDev) {
      redirect(`/${lang}/signin`);
    }
    // Non-development environment and no valid auth (e.g. no CF JWT header): show minimal no-access page.
    return (
      <>
        <SiteHeader lang={l} />
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-gray-500 py-16">
            <p className="text-xl font-medium mb-2">{t(l, "accessDenied") || "Access denied"}</p>
            <p className="text-sm">{t(l, "devOnly") || "This page is only available in the development environment."}</p>
          </div>
        </main>
        <SiteFooter lang={l} />
      </>
    );
  }

  return <>{children}</>;
}

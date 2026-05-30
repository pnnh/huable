import Link from "next/link";
import type { LangKey } from "@/lib/language";
import { t } from "@/lib/i18n";
import LanguageSelector from "@/components/LanguageSelector";

type Props = { lang: LangKey; pathSuffix?: string };

export default function SiteHeader({ lang, pathSuffix = "" }: Props) {
    return (
        <header className="w-full border-b border-gray-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
                <Link href={`/${lang}/`} className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors">
                    {t(lang, "siteName")}
                </Link>
                <nav className="flex items-center gap-4 flex-1 ml-6">
                    <Link href={`/${lang}/`} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                        {t(lang, "home")}
                    </Link>
                    <Link href={`/${lang}/channels`} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                        {t(lang, "channels")}
                    </Link>
                    <Link href={`/${lang}/tools`} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                        {t(lang, "allTools")}
                    </Link>
                    <Link href={`/${lang}/console`} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                        {t(lang, "console")}
                    </Link>
                </nav>
                <LanguageSelector currentLang={lang} pathSuffix={pathSuffix} />
            </div>
        </header>
    );
}

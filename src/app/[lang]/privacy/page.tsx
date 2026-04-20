import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidLang, supportedLanguages } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { t } from "@/lib/i18n";
import { privacyContent } from "@/data/privacy";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

type Props = { params: Promise<{ lang: string }> };

export function generateStaticParams() {
    return supportedLanguages.map((l) => ({ lang: l.key }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isValidLang(lang)) return {};
    const l = lang as LangKey;
    const content = privacyContent[l];
    return {
        title: `${content.title} — ${t(l, "siteName")}`,
        description: content.intro.slice(0, 160),
    };
}

export default async function PrivacyPage({ params }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;
    const content = privacyContent[l];

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Back link */}
                <Link
                    href={`/${l}/`}
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-500 transition-colors mb-8"
                >
                    ← {t(l, "backToHome")}
                </Link>

                {/* Title */}
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
                    {content.title}
                </h1>
                <p className="text-sm text-gray-400 mb-8">{content.lastUpdated}</p>

                {/* Intro */}
                <p className="text-base text-gray-700 leading-relaxed mb-10">
                    {content.intro}
                </p>

                {/* Sections */}
                <div className="space-y-8">
                    {content.sections.map((section) => (
                        <section key={section.heading}>
                            <h2 className="text-lg font-semibold text-gray-900 mb-2">
                                {section.heading}
                            </h2>
                            <p className="text-base text-gray-600 leading-relaxed">
                                {section.body}
                            </p>
                        </section>
                    ))}
                </div>
            </main>
            <SiteFooter lang={l} />
        </>
    );
}

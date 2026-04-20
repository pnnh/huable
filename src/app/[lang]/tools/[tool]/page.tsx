import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { isValidLang, supportedLanguages } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { tools } from "@/data/tools";
import { t } from "@/lib/i18n";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

type Props = { params: Promise<{ lang: string; tool: string }> };

export async function generateStaticParams() {
    const pairs: { lang: string; tool: string }[] = [];
    for (const l of supportedLanguages) {
        for (const tool of tools) {
            pairs.push({ lang: l.key, tool: tool.id });
        }
    }
    return pairs;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang, tool: toolId } = await params;
    if (!isValidLang(lang)) return {};
    const l = lang as LangKey;
    const tool = tools.find((t) => t.id === toolId);
    if (!tool) return {};
    const title = t(l, "toolDetailTitle").replace("{name}", tool.name[l]);
    const description = tool.description[l];
    return {
        title,
        description,
        openGraph: { title, description, type: "website" },
    };
}

export default async function ToolDetailPage({ params }: Props) {
    const { lang, tool: toolId } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;
    const tool = tools.find((t) => t.id === toolId);
    if (!tool) notFound();

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full">
                {/* Breadcrumb */}
                <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                    <nav className="flex items-center gap-2 text-sm text-gray-500">
                        <Link href={`/${l}/`} className="hover:text-gray-900 transition-colors">
                            {t(l, "allTools")}
                        </Link>
                        <span>/</span>
                        <span className="text-gray-900 font-medium">{tool.name[l]}</span>
                    </nav>
                </div>

                {/* Hero */}
                <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <div className="relative w-20 h-20 flex-shrink-0">
                            <Image
                                src={tool.logo}
                                alt={tool.name[l]}
                                fill
                                className="object-contain rounded-2xl"
                                priority
                            />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{tool.name[l]}</h1>
                            <p className="text-lg text-gray-600 mb-4">{tool.description[l]}</p>
                            <a
                                href={tool.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
                            >
                                {t(l, "launchTool")}
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clipRule="evenodd" />
                                    <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clipRule="evenodd" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Tags */}
                    {tool.tags.length > 0 && (
                        <div className="mt-6 flex flex-wrap gap-2">
                            {tool.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </section>

                <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-10">
                    {/* Features */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t(l, "features")}</h2>
                        <ul className="space-y-2">
                            {tool.features[l].map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5">
                                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-gray-700">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* About */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t(l, "about")}</h2>
                        <p className="text-gray-700 leading-relaxed">{tool.detail[l]}</p>
                    </section>

                    {/* Bottom CTA */}
                    <section className="border-t pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <p className="text-gray-600">{tool.description[l]}</p>
                        <a
                            href={tool.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors flex-shrink-0"
                        >
                            {t(l, "launchTool")}
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clipRule="evenodd" />
                                <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clipRule="evenodd" />
                            </svg>
                        </a>
                    </section>
                </div>
            </main>
            <SiteFooter lang={l} />
        </>
    );
}

import Link from "next/link";
import Image from "next/image";
import type { LangKey } from "@/lib/language";
import type { ToolData } from "@/data/tools";
import { t } from "@/lib/i18n";

type Props = {
    tool: ToolData;
    lang: LangKey;
};

export default function ToolCard({ tool, lang }: Props) {
    const detailUrl = `/${lang}/tools/${tool.id}/`;

    return (
        <div className="group relative flex flex-col bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 hover:shadow-md hover:ring-blue-200 transition-all duration-200 overflow-hidden">
            {/* Card body — links to detail page */}
            <Link href={detailUrl} className="flex flex-col flex-1 p-6 gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl">
                <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12 flex-shrink-0">
                        <Image
                            src={tool.logo}
                            alt={tool.name[lang]}
                            fill
                            className="object-contain rounded-xl"
                        />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {tool.name[lang]}
                    </h2>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
                    {tool.description[lang]}
                </p>
                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-auto">
                    {tool.tags.slice(0, 3).map((tag) => (
                        <span
                            key={tag}
                            className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </Link>

            {/* Footer — Launch button */}
            <div className="px-6 pb-5 pt-0 flex items-center justify-between">
                <Link
                    href={detailUrl}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                    {t(lang, "learnMore")} →
                </Link>
                <a
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-sm"
                >
                    {t(lang, "launchTool")}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clipRule="evenodd" />
                    </svg>
                </a>
            </div>
        </div>
    );
}

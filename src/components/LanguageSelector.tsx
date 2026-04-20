import Link from "next/link";
import { supportedLanguages } from "@/lib/language";
import type { LangKey } from "@/lib/language";

type Props = {
    currentLang: LangKey;
    /** Path segment after the lang prefix. E.g. "" for home, "tools/basex/" for detail page */
    pathSuffix?: string;
};

export default function LanguageSelector({ currentLang, pathSuffix = "" }: Props) {
    return (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
            {supportedLanguages.map((l) => (
                <Link
                    key={l.key}
                    href={`/${l.key}/${pathSuffix}`}
                    className={`text-sm transition-colors ${l.key === currentLang
                            ? "text-blue-600 font-semibold"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                >
                    {l.name}
                </Link>
            ))}
        </div>
    );
}

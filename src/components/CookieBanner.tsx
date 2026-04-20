"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { LangKey } from "@/lib/language";
import { t } from "@/lib/i18n";

const CONSENT_KEY = "cookie-consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Read consent from either localStorage or the cross-domain cookie. */
function getConsentCookie(): string | null {
    try {
        const match = document.cookie
            .split("; ")
            .find((row) => row.startsWith(`${CONSENT_KEY}=`));
        return match ? match.split("=")[1] : null;
    } catch {
        return null;
    }
}

/** Write consent as a cross-domain cookie readable by all *.huable.xyz subdomains. */
function setConsentCookie(value: string) {
    try {
        const hostname = window.location.hostname;
        const domain = hostname.endsWith("huable.xyz") ? "; Domain=.huable.xyz" : "";
        const secure = hostname !== "localhost" ? "; Secure" : "";
        document.cookie = `${CONSENT_KEY}=${value}; Max-Age=${CONSENT_MAX_AGE}; Path=/${domain}; SameSite=Lax${secure}`;
    } catch { /* ignore */ }
}

type Props = { lang: LangKey };

export default function CookieBanner({ lang }: Props) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(CONSENT_KEY) ?? getConsentCookie();
            if (!stored) setVisible(true);
        } catch {
            if (!getConsentCookie()) setVisible(true);
        }
    }, []);

    if (!visible) return null;

    const accept = () => {
        try { localStorage.setItem(CONSENT_KEY, "accepted"); } catch { /* ignore */ }
        setConsentCookie("accepted");
        setVisible(false);
    };

    const decline = () => {
        try { localStorage.setItem(CONSENT_KEY, "declined"); } catch { /* ignore */ }
        setConsentCookie("declined");
        setVisible(false);
    };

    return (
        <div
            role="dialog"
            aria-live="polite"
            aria-label={t(lang, "privacyPolicy")}
            className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6"
        >
            <div className="mx-auto max-w-4xl bg-white rounded-2xl shadow-xl ring-1 ring-gray-200 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <p className="flex-1 text-sm text-gray-600 leading-relaxed">
                    {t(lang, "cookieMessage")}{" "}
                    <Link
                        href={`/${lang}/privacy/`}
                        className="underline text-blue-600 hover:text-blue-500 transition-colors whitespace-nowrap"
                    >
                        {t(lang, "privacyPolicy")}
                    </Link>
                </p>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                        onClick={decline}
                        className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
                    >
                        {t(lang, "cookieDecline")}
                    </button>
                    <button
                        onClick={accept}
                        className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors shadow-sm"
                    >
                        {t(lang, "cookieAccept")}
                    </button>
                </div>
            </div>
        </div>
    );
}

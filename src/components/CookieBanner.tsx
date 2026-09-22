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
 
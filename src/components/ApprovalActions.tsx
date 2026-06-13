"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
    eventId: string;
    lang: string;
    labels: {
        approve: string;
        reject: string;
        approving: string;
        rejecting: string;
        backToApprovals: string;
    };
};

export default function ApprovalActions({ eventId, lang, labels }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleAction(action: "approve" | "reject") {
        setLoading(action);
        setError(null);
        try {
            const res = await fetch(`/api/console/approvals/${eventId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError((data as { error?: string }).error ?? "Unknown error");
                setLoading(null);
                return;
            }
            router.push(`/${lang}/console/approvals`);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Unknown error");
            setLoading(null);
        }
    }

    return (
        <div>
            <div className="flex gap-3">
                <button
                    type="button"
                    disabled={loading !== null}
                    onClick={() => handleAction("approve")}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                    {loading === "approve" ? labels.approving : labels.approve}
                </button>
                <button
                    type="button"
                    disabled={loading !== null}
                    onClick={() => handleAction("reject")}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                    {loading === "reject" ? labels.rejecting : labels.reject}
                </button>
            </div>
            {error && (
                <p className="mt-3 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}

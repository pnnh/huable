"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface ChannelSearchProps {
    placeholder: string;
    defaultValue?: string;
}

export default function ChannelSearch({ placeholder, defaultValue = "" }: ChannelSearchProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const params = new URLSearchParams(searchParams.toString());
            const q = e.target.value.trim();
            if (q) {
                params.set("q", q);
            } else {
                params.delete("q");
            }
            params.delete("page");
            router.replace(`${pathname}?${params.toString()}`);
        },
        [router, pathname, searchParams],
    );

    return (
        <input
            type="search"
            defaultValue={defaultValue}
            onChange={handleChange}
            placeholder={placeholder}
            className="w-full sm:w-80 px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
    );
}

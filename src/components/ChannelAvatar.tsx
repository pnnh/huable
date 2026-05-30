"use client";

import { useState, useEffect } from "react";

interface ChannelAvatarProps {
    channelId: string;
    channelName: string;
    size?: number; // px, default 48
    className?: string;
}

export default function ChannelAvatar({ channelId, channelName, size = 48, className = "" }: ChannelAvatarProps) {
    const [src, setSrc] = useState(`/api/channel/avatar/${channelId}`);
    const [error, setError] = useState(false);

    useEffect(() => {
        setSrc(`/api/channel/avatar/${channelId}?t=${Date.now()}`);
        setError(false);
    }, [channelId]);

    const initials = channelName.charAt(0).toUpperCase();

    if (error) {
        return (
            <div
                className={`rounded-full bg-blue-600 flex items-center justify-center text-white font-bold select-none shrink-0 ${className}`}
                style={{ width: size, height: size, fontSize: size * 0.4 }}
            >
                {initials}
            </div>
        );
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt={channelName}
            className={`rounded-full object-cover shrink-0 ${className}`}
            style={{ width: size, height: size }}
            onError={() => setError(true)}
        />
    );
}

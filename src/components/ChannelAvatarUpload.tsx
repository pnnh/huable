"use client";

import { useState, useRef, useEffect } from "react";

interface ChannelAvatarUploadProps {
    channelId: string;
    channelName: string;
    labels: {
        avatar: string;
        uploadAvatar: string;
        avatarHint: string;
    };
}

export default function ChannelAvatarUpload({ channelId, channelName, labels }: ChannelAvatarUploadProps) {
    const [avatarUrl, setAvatarUrl] = useState(`/api/channel/avatar/${channelId}`);
    const [avatarError, setAvatarError] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setAvatarUrl(`/api/channel/avatar/${channelId}?t=${Date.now()}`);
    }, [channelId]);

    const initials = channelName.charAt(0).toUpperCase();

    async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadError(null);
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/channel/avatar/${channelId}`, { method: "POST", body: formData });
        if (res.ok) {
            setAvatarUrl(`/api/channel/avatar/${channelId}?t=${Date.now()}`);
            setAvatarError(false);
        } else {
            const data = await res.json().catch(() => ({}));
            setUploadError((data as { error?: string }).error ?? "Upload failed");
        }
    }

    return (
        <div className="flex items-center gap-6 mb-8">
            <div className="relative">
                {avatarError ? (
                    <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold select-none">
                        {initials}
                    </div>
                ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={avatarUrl}
                        alt={channelName}
                        className="w-20 h-20 rounded-full object-cover"
                        onError={() => setAvatarError(true)}
                    />
                )}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-700 mb-1">{labels.avatar}</p>
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700"
                >
                    {labels.uploadAvatar}
                </button>
                <p className="text-xs text-gray-400 mt-1">{labels.avatarHint}</p>
                {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                />
            </div>
        </div>
    );
}

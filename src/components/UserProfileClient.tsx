"use client";

import { useState, useRef, useEffect } from "react";

interface UserProfileClientProps {
    userId: string;
    name: string;
    email: string;
    nickname: string | null;
    bio: string | null;
    labels: {
        avatar: string;
        uploadAvatar: string;
        nickname: string;
        username: string;
        email: string;
        bio: string;
        saveProfile: string;
        profileSaved: string;
        avatarHint: string;
    };
}

export default function UserProfileClient({ userId, name, email, nickname, bio, labels }: UserProfileClientProps) {
    const [nicknameVal, setNicknameVal] = useState(nickname ?? "");
    const [bioVal, setBioVal] = useState(bio ?? "");
    const [avatarUrl, setAvatarUrl] = useState(`/api/user/avatar/${userId}`);
    const [avatarError, setAvatarError] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setAvatarUrl(`/api/user/avatar/${userId}?t=${Date.now()}`);
    }, [userId]);
    const [saved, setSaved] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const displayName = nicknameVal.trim() || name;
    const initials = displayName.charAt(0).toUpperCase();

    async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadError(null);
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/user/avatar", { method: "POST", body: formData });
        if (res.ok) {
            setAvatarUrl(`/api/user/avatar/${userId}?t=${Date.now()}`);
            setAvatarError(false);
        } else {
            const data = await res.json().catch(() => ({}));
            setUploadError((data as { error?: string }).error ?? "Upload failed");
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setSaved(false);
        await fetch("/api/user/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nickname: nicknameVal, bio: bioVal }),
        });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    }

    return (
        <form onSubmit={handleSave} className="space-y-8">
            {/* Avatar */}
            <div className="flex items-center gap-6">
                <div className="relative">
                    {avatarError ? (
                        <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold select-none">
                            {initials}
                        </div>
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={avatarUrl}
                            alt={displayName}
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

            {/* Username (read-only) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{labels.username}</label>
                <p className="px-3 py-2 rounded-md border border-gray-200 bg-gray-50 text-gray-600 text-sm">{name}</p>
            </div>

            {/* Email (read-only) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{labels.email}</label>
                <p className="px-3 py-2 rounded-md border border-gray-200 bg-gray-50 text-gray-600 text-sm">{email}</p>
            </div>

            {/* Nickname */}
            <div>
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">{labels.nickname}</label>
                <input
                    id="nickname"
                    type="text"
                    maxLength={50}
                    value={nicknameVal}
                    onChange={e => setNicknameVal(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Bio */}
            <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">{labels.bio}</label>
                <textarea
                    id="bio"
                    rows={4}
                    maxLength={300}
                    value={bioVal}
                    onChange={e => setBioVal(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
            </div>

            <div className="flex items-center gap-4">
                <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-60"
                >
                    {saving ? "…" : labels.saveProfile}
                </button>
                {saved && <span className="text-sm text-green-600">{labels.profileSaved}</span>}
            </div>
        </form>
    );
}

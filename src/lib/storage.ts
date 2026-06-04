import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface StorageAdapter {
  save(noteId: string, filename: string, data: Uint8Array): Promise<void>;
  read(noteId: string, filename: string): Promise<Uint8Array | null>;
  delete(noteId: string, filename: string): Promise<void>;
}

export interface AvatarStorage {
  save(key: string, data: Uint8Array, mimeType: string): Promise<void>;
  read(key: string): Promise<{ data: Uint8Array; mimeType: string } | null>;
  delete(key: string): Promise<void>;
}

function assertSafeSegment(value: string, field: string): void {
  if (
    !value ||
    value === "." ||
    value === ".." ||
    value.includes("/") ||
    value.includes("\\")
  ) {
    throw new Error(`Invalid ${field}`);
  }
}

async function resolveStoragePath(storageRoot: string, noteId: string, filename: string) {
  assertSafeSegment(noteId, "noteId");
  assertSafeSegment(filename, "filename");

  const path = await import("node:path");
  return path.join(storageRoot, noteId, filename);
}

// ── Local (dev) storage ──────────────────────────────────────────────────────

export class LocalStorageAdapter implements StorageAdapter {
  constructor(
    private readonly storageRoot = process.env.NOTE_STORAGE_PATH || "./.data/uploads"
  ) {}

  async save(noteId: string, filename: string, data: Uint8Array): Promise<void> {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = await resolveStoragePath(this.storageRoot, noteId, filename);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
  }

  async read(noteId: string, filename: string): Promise<Uint8Array | null> {
    const fs = await import("node:fs/promises");
    const filePath = await resolveStoragePath(this.storageRoot, noteId, filename);

    try {
      return await fs.readFile(filePath);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async delete(noteId: string, filename: string): Promise<void> {
    const fs = await import("node:fs/promises");
    const filePath = await resolveStoragePath(this.storageRoot, noteId, filename);

    try {
      await fs.rm(filePath);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        return;
      }
      throw error;
    }
  }
}

export class LocalAvatarStorage implements AvatarStorage {
  constructor(
    private readonly storageRoot = process.env.AVATAR_STORAGE_PATH || "./.data/avatars"
  ) {}

  async save(key: string, data: Uint8Array, mimeType: string): Promise<void> {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.join(this.storageRoot, key.replace(/\//g, "_"));
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
    await fs.writeFile(filePath + ".mime", mimeType, "utf8");
  }

  async read(key: string): Promise<{ data: Uint8Array; mimeType: string } | null> {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.join(this.storageRoot, key.replace(/\//g, "_"));

    try {
      const [data, mimeRaw] = await Promise.all([
        fs.readFile(filePath),
        fs.readFile(filePath + ".mime", "utf8").catch(() => "image/jpeg"),
      ]);
      const mimeType = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeRaw.trim())
        ? mimeRaw.trim()
        : "image/jpeg";
      return { data, mimeType };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.join(this.storageRoot, key.replace(/\//g, "_"));
    await fs.rm(filePath).catch(() => undefined);
    await fs.rm(filePath + ".mime").catch(() => undefined);
  }
}

// ── R2 storage ───────────────────────────────────────────────────────────────

export class R2StorageAdapter implements StorageAdapter {
  constructor(private readonly bucket: R2Bucket) {}

  async save(noteId: string, filename: string, data: Uint8Array): Promise<void> {
    assertSafeSegment(noteId, "noteId");
    assertSafeSegment(filename, "filename");
    await this.bucket.put(`notes/${noteId}/${filename}`, data);
  }

  async read(noteId: string, filename: string): Promise<Uint8Array | null> {
    assertSafeSegment(noteId, "noteId");
    assertSafeSegment(filename, "filename");
    const obj = await this.bucket.get(`notes/${noteId}/${filename}`);
    if (!obj) return null;
    return new Uint8Array(await obj.arrayBuffer());
  }

  async delete(noteId: string, filename: string): Promise<void> {
    assertSafeSegment(noteId, "noteId");
    assertSafeSegment(filename, "filename");
    await this.bucket.delete(`notes/${noteId}/${filename}`);
  }
}

export class R2AvatarStorage implements AvatarStorage {
  constructor(private readonly bucket: R2Bucket) {}

  async save(key: string, data: Uint8Array, mimeType: string): Promise<void> {
    await Promise.all([
      this.bucket.put(key, data, { httpMetadata: { contentType: mimeType } }),
      this.bucket.put(key + ".mime", mimeType),
    ]);
  }

  async read(key: string): Promise<{ data: Uint8Array; mimeType: string } | null> {
    const obj = await this.bucket.get(key);
    if (!obj) return null;
    const mimeRaw = obj.httpMetadata?.contentType ?? "image/jpeg";
    const mimeType = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeRaw)
      ? mimeRaw
      : "image/jpeg";
    return { data: new Uint8Array(await obj.arrayBuffer()), mimeType };
  }

  async delete(key: string): Promise<void> {
    await Promise.all([
      this.bucket.delete(key),
      this.bucket.delete(key + ".mime"),
    ]);
  }
}

// ── Factory functions ────────────────────────────────────────────────────────

export function getStorage(): StorageAdapter {
  if (process.env.NODE_ENV === "development") {
    return new LocalStorageAdapter();
  }
  try {
    const { env } = getCloudflareContext();
    if (env.HUABLE_NOTES) {
      return new R2StorageAdapter(env.HUABLE_NOTES);
    }
  } catch {
    // Not in Worker context (e.g. build time), fall through
  }
  return new LocalStorageAdapter();
}

export function getAvatarStorage(): AvatarStorage {
  if (process.env.NODE_ENV === "development") {
    return new LocalAvatarStorage();
  }
  try {
    const { env } = getCloudflareContext();
    if (env.HUABLE_NOTES) {
      return new R2AvatarStorage(env.HUABLE_NOTES);
    }
  } catch {
    // Not in Worker context (e.g. build time), fall through
  }
  return new LocalAvatarStorage();
}

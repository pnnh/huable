export interface R2Bucket {}

export interface StorageAdapter {
  save(noteId: string, filename: string, data: Buffer): Promise<void>;
  read(noteId: string, filename: string): Promise<Buffer | null>;
  delete(noteId: string, filename: string): Promise<void>;
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

export class LocalStorageAdapter implements StorageAdapter {
  constructor(
    private readonly storageRoot = process.env.NOTE_STORAGE_PATH || "./.data/uploads"
  ) {}

  async save(noteId: string, filename: string, data: Buffer): Promise<void> {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = await resolveStoragePath(this.storageRoot, noteId, filename);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
  }

  async read(noteId: string, filename: string): Promise<Buffer | null> {
    const fs = await import("node:fs/promises");
    const filePath = await resolveStoragePath(this.storageRoot, noteId, filename);

    try {
      return await fs.readFile(filePath);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
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
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return;
      }

      throw error;
    }
  }
}

export class R2StorageAdapter implements StorageAdapter {
  constructor(private readonly r2Binding?: R2Bucket) {}

  async save(_noteId: string, _filename: string, _data: Buffer): Promise<void> {
    void this.r2Binding;
    throw new Error("R2 binding required");
  }

  async read(_noteId: string, _filename: string): Promise<Buffer | null> {
    void this.r2Binding;
    throw new Error("R2 binding required");
  }

  async delete(_noteId: string, _filename: string): Promise<void> {
    void this.r2Binding;
    throw new Error("R2 binding required");
  }
}

export function getStorage(r2Binding?: R2Bucket): StorageAdapter {
  if (process.env.NODE_ENV === "development" || !r2Binding) {
    return new LocalStorageAdapter();
  }

  return new R2StorageAdapter(r2Binding);
}

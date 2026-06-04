// Minimal Cloudflare Worker binding type declarations for this app.
// We do NOT reference @cloudflare/workers-types globally to avoid conflicting
// with the DOM lib types already in tsconfig (e.g. Body.json() return type).

interface R2HTTPMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
}

interface R2ObjectBody {
  readonly httpMetadata: R2HTTPMetadata | undefined;
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

interface R2Bucket {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob | null,
    options?: R2PutOptions,
  ): Promise<R2ObjectBody>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string | string[]): Promise<void>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run(): Promise<{ success: boolean; meta: Record<string, unknown> }>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean; meta: Record<string, unknown> }>;
  raw<T = unknown[]>(): Promise<T[]>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<{ count: number; duration: number }>;
  batch<T = Record<string, unknown>>(
    statements: D1PreparedStatement[],
  ): Promise<{ results: T[]; success: boolean; meta: Record<string, unknown> }[]>;
}

// Augment the global CloudflareEnv interface (declared by @opennextjs/cloudflare)
// with this app's Cloudflare bindings.
interface CloudflareEnv {
  DB: D1Database;
  HUABLE_NOTES: R2Bucket;
}

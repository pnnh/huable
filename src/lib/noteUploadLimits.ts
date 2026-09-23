// Shared limits for batch Markdown note upload, used by both the client
// queue component and the upload API route so the two never drift apart.
export const MAX_QUEUE_SIZE = 30;
export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
export const MAX_CONCURRENT_UPLOADS = 3;
export const ALLOWED_EXTENSIONS = [".md", ".markdown"];

export function hasAllowedExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function titleFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  const ext = ALLOWED_EXTENSIONS.find((e) => lower.endsWith(e));
  return ext ? filename.slice(0, filename.length - ext.length) : filename;
}

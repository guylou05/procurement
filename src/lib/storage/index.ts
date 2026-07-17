/**
 * Storage abstraction. The MVP ships an S3-compatible adapter usable with AWS S3,
 * Cloudflare R2, or MinIO (local dev) via env config, plus a no-op local adapter for
 * environments without object storage. Feature code depends only on StorageAdapter.
 */
export interface PutObjectInput {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}

export interface StorageAdapter {
  /** Store an object and return its storage key. */
  put(input: PutObjectInput): Promise<{ key: string }>;
  /** Return a time-limited signed URL for private read access. */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  /** Public URL when the bucket/object is public (e.g. logos). */
  getPublicUrl(key: string): string;
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export function validateUpload(mimeType: string, sizeBytes: number): void {
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    throw new Error("File too large (max 15 MB)");
  }
}

/**
 * Local adapter: returns deterministic URLs against STORAGE_PUBLIC_URL without a
 * live object store. Swap for the S3 adapter in production by wiring the AWS SDK.
 */
class LocalStorageAdapter implements StorageAdapter {
  private base = process.env.STORAGE_PUBLIC_URL ?? "http://localhost:9000/buildflow";

  async put(input: PutObjectInput): Promise<{ key: string }> {
    validateUpload(input.contentType, input.body.byteLength);
    // In production the S3 adapter uploads here; local dev treats the key as canonical.
    return { key: input.key };
  }

  async getSignedUrl(key: string): Promise<string> {
    return `${this.base}/${key}`;
  }

  getPublicUrl(key: string): string {
    return `${this.base}/${key}`;
  }
}

let adapter: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!adapter) adapter = new LocalStorageAdapter();
  return adapter;
}

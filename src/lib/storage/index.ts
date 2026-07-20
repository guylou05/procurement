/**
 * Storage abstraction. Ships two drivers behind one interface:
 *
 *  - "s3": S3-compatible object storage — works with AWS S3, Cloudflare R2, or MinIO
 *    via env config. Selected automatically when STORAGE_BUCKET + credentials are set.
 *  - "local": persists to disk under STORAGE_DIR (default <cwd>/.storage) and is served
 *    back through the authenticated /api/files/[id] route. Used for local dev and any
 *    environment without object storage configured.
 *
 * Feature code depends only on StorageAdapter; the file-serving route branches on
 * `driver` to either redirect to a signed URL (s3) or stream bytes from disk (local).
 */
import { promises as fs } from "fs";
import path from "path";

export interface PutObjectInput {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}

export interface StorageAdapter {
  readonly driver: "s3" | "local";
  /** Store an object and return its storage key. */
  put(input: PutObjectInput): Promise<{ key: string }>;
  /** Time-limited signed URL for private read access (s3). */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  /** Public URL when the bucket/object is public. */
  getPublicUrl(key: string): string;
  /** Read raw bytes — implemented by the local driver so the route can stream them. */
  read?(key: string): Promise<Buffer>;
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export function validateUpload(mimeType: string, sizeBytes: number): void {
  if (!ALLOWED_MIME.has(mimeType)) throw new Error(`Unsupported file type: ${mimeType}`);
  if (sizeBytes > MAX_UPLOAD_BYTES) throw new Error("File too large (max 15 MB)");
}

/** Builds a namespaced, collision-resistant object key for an org's upload. */
export function buildObjectKey(organizationId: string, fileName: string): string {
  const safe = fileName.replace(/[^\w.\-]+/g, "_").slice(-80);
  const rand = Math.random().toString(36).slice(2, 10);
  return `org/${organizationId}/${Date.now().toString(36)}-${rand}-${safe}`;
}

/** Persists uploads to disk; serving is handled by the /api/files route. */
class LocalDiskAdapter implements StorageAdapter {
  readonly driver = "local" as const;
  private dir = process.env.STORAGE_DIR ?? path.join(process.cwd(), ".storage");

  private full(key: string): string {
    // Prevent path traversal: resolve and ensure the result stays inside the base dir.
    const resolved = path.resolve(this.dir, key);
    if (!resolved.startsWith(path.resolve(this.dir))) throw new Error("Invalid key");
    return resolved;
  }

  async put(input: PutObjectInput): Promise<{ key: string }> {
    validateUpload(input.contentType, input.body.byteLength);
    const dest = this.full(input.key);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, input.body);
    return { key: input.key };
  }

  async getSignedUrl(key: string): Promise<string> {
    return `/api/files/${encodeURIComponent(key)}`;
  }

  getPublicUrl(key: string): string {
    return `/api/files/${encodeURIComponent(key)}`;
  }

  async read(key: string): Promise<Buffer> {
    return fs.readFile(this.full(key));
  }
}

/** S3-compatible driver (S3 / R2 / MinIO). Lazily imports the AWS SDK. */
class S3Adapter implements StorageAdapter {
  readonly driver = "s3" as const;
  private bucket = process.env.STORAGE_BUCKET!;

  private clientPromise: Promise<import("@aws-sdk/client-s3").S3Client> | null = null;
  private client() {
    if (!this.clientPromise) {
      this.clientPromise = import("@aws-sdk/client-s3").then(
        ({ S3Client }) =>
          new S3Client({
            region: process.env.STORAGE_REGION ?? "auto",
            endpoint: process.env.STORAGE_ENDPOINT || undefined,
            forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "true",
            credentials: {
              accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
              secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
            },
          }),
      );
    }
    return this.clientPromise;
  }

  async put(input: PutObjectInput): Promise<{ key: string }> {
    validateUpload(input.contentType, input.body.byteLength);
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.client();
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: Buffer.from(input.body),
        ContentType: input.contentType,
      }),
    );
    return { key: input.key };
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const client = await this.client();
    return getSignedUrl(client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  }

  getPublicUrl(key: string): string {
    const base = process.env.STORAGE_PUBLIC_URL;
    return base ? `${base.replace(/\/$/, "")}/${key}` : key;
  }
}

let adapter: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (adapter) return adapter;
  const s3Configured =
    !!process.env.STORAGE_BUCKET &&
    !!process.env.STORAGE_ACCESS_KEY_ID &&
    !!process.env.STORAGE_SECRET_ACCESS_KEY;
  adapter = s3Configured ? new S3Adapter() : new LocalDiskAdapter();
  return adapter;
}

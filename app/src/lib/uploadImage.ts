import { supabase, isSupabaseConfigured } from "./supabase";

// ─── Image Upload to Supabase Storage ───────────────────────────────────────
// Bucket: "poll-images" (create in Supabase Dashboard → Storage → New Bucket)
// Make it PUBLIC so images can be served without auth.

const BUCKET = "poll-images";
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageUploadError";
  }
}

/** Validate file before upload */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Invalid file type. Only JPG, PNG, and WEBP are allowed.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `File too large. Maximum size is ${MAX_SIZE_MB}MB.`;
  }
  return null; // valid
}

/** Upload image to Supabase Storage and return public URL */
export async function uploadPollImage(file: File): Promise<string> {
  // Client-side validation
  const validationError = validateImageFile(file);
  if (validationError) throw new ImageUploadError(validationError);

  if (!isSupabaseConfigured) {
    // Fallback: convert to data URL for local/demo mode
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new ImageUploadError("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  // Generate unique filename
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = `polls/${fileName}`;

  // Upload to Supabase Storage
  const { error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    console.error("Upload error:", error);
    throw new ImageUploadError("Failed to upload image. Please try again.");
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return urlData.publicUrl;
}

/** Sanitize image URL — only allow https and data URIs */
export function sanitizeImageUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.startsWith("https://")) return trimmed;
  return ""; // reject anything else
}

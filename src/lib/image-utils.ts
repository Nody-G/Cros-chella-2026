/**
 * Image compression utility — client-side canvas compression
 * Targets ~200KB max for profile photos, ~500KB for chat/gallery images
 */

export interface CompressOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number; // 0-1
  format: "image/jpeg" | "image/webp";
}

const PROFILE_OPTIONS: CompressOptions = {
  maxWidth: 400,
  maxHeight: 400,
  quality: 0.75,
  format: "image/jpeg",
};

const CHAT_OPTIONS: CompressOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.7,
  format: "image/jpeg",
};

const GALLERY_OPTIONS: CompressOptions = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.75,
  format: "image/jpeg",
};

export type ImagePurpose = "profile" | "chat" | "gallery";

function getOptions(purpose: ImagePurpose): CompressOptions {
  switch (purpose) {
    case "profile":
      return PROFILE_OPTIONS;
    case "chat":
      return CHAT_OPTIONS;
    case "gallery":
      return GALLERY_OPTIONS;
  }
}

/**
 * Compress an image file using canvas.
 * Returns a new File object with compressed data.
 */
export async function compressImage(
  file: File,
  purpose: ImagePurpose = "profile"
): Promise<File> {
  const opts = getOptions(purpose);

  // If the file is already small enough (< 100KB for profile, < 300KB for others), skip compression
  const threshold = purpose === "profile" ? 100 * 1024 : 300 * 1024;
  if (file.size < threshold) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down proportionally
      if (width > opts.maxWidth || height > opts.maxHeight) {
        const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Compression failed"));
            return;
          }
          const ext = opts.format === "image/webp" ? "webp" : "jpg";
          const compressedFile = new File([blob], `photo.${ext}`, {
            type: opts.format,
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        opts.format,
        opts.quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Generate a preview data URL from a file (for showing before upload)
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

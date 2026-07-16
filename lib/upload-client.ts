/**
 * Subida de imágenes desde el navegador a /api/upload.
 * Las fotos de celular pesan 5-12 MB y Vercel corta los requests de más de
 * ~4,5 MB con un 413 sin body, así que antes de subir se comprimen acá:
 * se redimensionan a 2000px máximo y se recodifican como JPEG.
 */

export const MAX_IMAGE_MB = 4.5;

const MAX_DIMENSION = 2000;
const TARGET_BYTES = 3.5 * 1024 * 1024; // margen bajo el límite de Vercel
const SKIP_BELOW_BYTES = 1024 * 1024; // ya es liviana, no vale la pena recodificar

/** Decodifica la imagen respetando la orientación EXIF (fotos de celu giradas). */
async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement | null> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Fallback para navegadores sin createImageBitmap(file) o formatos que no
    // soporta (p. ej. HEIC fuera de Safari): probamos con un <img>.
    try {
      const url = URL.createObjectURL(file);
      try {
        const img = new Image();
        img.src = url;
        await img.decode();
        return img;
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch {
      return null;
    }
  }
}

/**
 * Comprime la imagen para que entre en el límite de subida.
 * Si no se puede decodificar (formato raro), devuelve el archivo original
 * y el chequeo de tamaño decide.
 */
async function compressImage(file: File): Promise<File> {
  // Los GIF no se recodifican para no perder la animación
  if (file.type === "image/gif" || file.size <= SKIP_BELOW_BYTES) return file;

  const image = await decodeImage(file);
  if (!image) return file;

  const width = "naturalWidth" in image ? image.naturalWidth : image.width;
  const height = "naturalHeight" in image ? image.naturalHeight : image.height;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  if ("close" in image) image.close();

  let best: Blob | null = null;
  for (const quality of [0.85, 0.75, 0.6]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob) break;
    best = blob;
    if (blob.size <= TARGET_BYTES) break;
  }
  if (!best) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([best], name, { type: "image/jpeg" });
}

export async function uploadImage(original: File): Promise<string> {
  const file = await compressImage(original);

  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new Error(
      `La imagen pesa ${mb} MB incluso comprimida y el máximo es 4,5 MB. Probá con otra foto.`
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json().catch(() => null);

  if (!res.ok || typeof data?.url !== "string") {
    throw new Error(
      data?.error ??
        (res.status === 413
          ? "La imagen es demasiado pesada para subirla."
          : "No se pudo subir la imagen. Probá de nuevo.")
    );
  }
  return data.url;
}

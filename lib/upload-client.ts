/**
 * Subida de imágenes desde el navegador a /api/upload.
 * Valida el tamaño antes de mandar (Vercel corta los requests de más de
 * ~4,5 MB con un 413 sin body) y tolera respuestas sin JSON.
 */

export const MAX_IMAGE_MB = 4.5;

export async function uploadImage(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new Error(`La imagen pesa ${mb} MB y el máximo es 4,5 MB. Probá con una más liviana.`);
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

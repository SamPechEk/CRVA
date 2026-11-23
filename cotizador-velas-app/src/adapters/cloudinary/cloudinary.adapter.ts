import type { IMediaStorage } from "../../ports/mediaStorage.port";
import { env } from "../../config/env";
export const cloudinary: IMediaStorage = {
  async uploadImage(file) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      throw Error("Usa una imagen JPG, PNG o WebP");
    if (file.size > 5 * 1024 * 1024)
      throw Error("La imagen debe pesar como máximo 5 MB");
    if (!env.VITE_CLOUDINARY_CLOUD_NAME || !env.VITE_CLOUDINARY_UPLOAD_PRESET)
      throw Error("Configura Cloudinary en las variables de entorno");
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", env.VITE_CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(
      "https://api.cloudinary.com/v1_1/" +
        env.VITE_CLOUDINARY_CLOUD_NAME +
        "/image/upload",
      { method: "POST", body: form },
    );
    if (!res.ok) throw Error("No se pudo subir la imagen");
    const data = await res.json();
    if (
      typeof data.secure_url !== "string" ||
      typeof data.public_id !== "string"
    )
      throw Error("Respuesta de imagen inválida");
    return { imageUrl: data.secure_url, imagePublicId: data.public_id };
  },
  getOptimizedUrl(url, mode = "web") {
    return url.includes("res.cloudinary.com/")
      ? url.replace(
          "/upload/",
          mode === "web"
            ? "/upload/f_auto,q_auto,w_800,c_limit/"
            : "/upload/f_jpg,q_85,w_400,c_limit/",
        )
      : url;
  },
};

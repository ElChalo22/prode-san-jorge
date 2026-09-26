import { decode } from "base64-arraybuffer";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "./supabase";

export async function uploadImage(bucket: string, userId: string): Promise<string | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, base64: true });
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  if (!asset?.base64) throw new Error("No pudimos leer la imagen.");
  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) throw new Error("Elegí una imagen de hasta 5 MB.");
  const mime = asset.mimeType === "image/png" ? "image/png" : asset.mimeType === "image/webp" ? "image/webp" : "image/jpeg";
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, decode(asset.base64), { contentType: mime });
  if (error) throw error;
  return path;
}

export async function uploadClaimDocuments(userId: string, remaining: number): Promise<string[] | null> {
  const picked = await DocumentPicker.getDocumentAsync({ type: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    copyToCacheDirectory: true, multiple: true });
  if (picked.canceled) return null;
  if (picked.assets.length > remaining) throw new Error("Podés adjuntar hasta 3 archivos.");
  const paths: string[] = [];
  for (const asset of picked.assets) {
    if (!asset.size || asset.size > 5 * 1024 * 1024) throw new Error("Cada archivo debe pesar hasta 5 MB.");
    const mime = asset.mimeType;
    if (!mime || !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(mime))
      throw new Error("Adjuntá imágenes o PDF.");
    const ext = mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const content = await new File(asset.uri).base64();
    const { error } = await supabase.storage.from("user-claims").upload(path, decode(content), { contentType: mime });
    if (error) throw error;
    paths.push(path);
  }
  return paths;
}

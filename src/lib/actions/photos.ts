"use server";

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { line, looksLikeBot } from "@/lib/validate";

/**
 * Photo wall — unggahan tamu, wajib lewat moderasi.
 *
 * Alurnya tiga langkah dan sengaja tidak pernah memberi anon hak tulis ke
 * storage:
 *
 *   1. `requestUpload()`  — server (service role) menerbitkan signed upload URL
 *                           untuk path yang IA sendiri tentukan.
 *   2. peramban mengunggah langsung ke bucket memakai token itu.
 *   3. `recordPhoto()`    — server memeriksa objeknya benar ada, ukuran & tipe
 *                           masuk akal, lalu menulis baris `photos`.
 *
 * Karena itu bucket "wall" tetap private dan tidak butuh policy storage untuk
 * anon sama sekali. Kalau langkah 3 menolak, objek yang terlanjur naik
 * dihapus — biar tidak menumpuk jadi sampah yang tak pernah dirujuk.
 *
 * Bacanya juga lewat sini: bucket private, jadi URL tampilnya harus
 * ditandatangani server (`signedPhotos`).
 */

const BUCKET = "wall";

/** Tipe yang benar-benar bisa dirender <img> di semua peramban tamu. */
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_CAPTION = 200;
const MAX_UPLOADER = 60;

/** Jeda antar unggahan dari satu peramban. */
const COOLDOWN_MS = 30_000;
const COOKIE = "photo_at";

/** Umur URL tampil. Cukup lama untuk sekali kunjungan, tidak untuk disebar. */
const SIGNED_TTL = 60 * 60;

/** Path yang kita terbitkan sendiri: `2026/<uuid>.<ext>`. */
const PATH_RE = /^\d{4}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

export type UploadTicket =
  | { status: "ok"; path: string; token: string }
  | { status: "error"; message: string };

export type PhotoResult =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; message: string };

/** Satu foto yang siap dirender — path storage tidak ikut keluar. */
export type SignedPhoto = {
  id: string;
  url: string;
  caption: string | null;
  uploader: string | null;
  created_at: string;
};

/** Langkah 1: terbitkan izin unggah untuk satu berkas. */
export async function requestUpload(type: string, size: number): Promise<UploadTicket> {
  const ext = TYPES[type];
  if (!ext) return { status: "error", message: "Format foto harus JPG, PNG, atau WebP." };
  if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) {
    return { status: "error", message: "Ukuran foto maksimal 8 MB." };
  }

  const wait = await cooldownLeft();
  if (wait) return { status: "error", message: `Tunggu ${wait} detik sebelum mengunggah lagi.` };

  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(path);

  if (error || !data) return { status: "error", message: "Gagal menyiapkan unggahan. Coba lagi ya." };
  return { status: "ok", path, token: data.token };
}

/** Langkah 3: catat foto yang sudah naik. Baris lahir `approved: false`. */
export async function recordPhoto(
  slug: string | null,
  path: string,
  fd: FormData,
): Promise<PhotoResult> {
  if (!PATH_RE.test(path)) return { status: "error", message: "Unggahan tidak dikenali." };

  const admin = supabaseAdmin();
  const caption = line(fd, "caption").slice(0, MAX_CAPTION);
  const uploader = line(fd, "uploader").slice(0, MAX_UPLOADER);

  if (looksLikeBot(fd)) {
    await admin.storage.from(BUCKET).remove([path]);
    return { status: "ok" }; // Dibuat menyerupai sukses, tapi tidak ada yang ditulis.
  }

  const wait = await cooldownLeft();
  if (wait) {
    await admin.storage.from(BUCKET).remove([path]);
    return { status: "error", message: `Tunggu ${wait} detik sebelum mengunggah lagi.` };
  }

  // Klien bisa berbohong soal tipe & ukuran saat meminta tiket, jadi yang
  // menentukan adalah metadata objek yang benar-benar ada di bucket.
  const slash = path.indexOf("/");
  const { data: found } = await admin.storage
    .from(BUCKET)
    .list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 1 });

  const meta = found?.[0]?.metadata as { size?: number; mimetype?: string } | undefined;
  if (!meta) return { status: "error", message: "Fotonya tidak sampai. Coba unggah ulang." };

  if (!meta.mimetype || !TYPES[meta.mimetype] || (meta.size ?? 0) > MAX_BYTES) {
    await admin.storage.from(BUCKET).remove([path]);
    return { status: "error", message: "Foto ditolak: format atau ukurannya tidak sesuai." };
  }

  // guest_id diturunkan dari slug di server, tidak pernah dari klien.
  let guestId: string | null = null;
  if (slug) {
    const { data: guest } = await admin.from("guests").select("id").eq("slug", slug).maybeSingle();
    guestId = (guest?.id as string | undefined) ?? null;
  }

  const { error } = await admin.from("photos").insert({
    guest_id: guestId,
    storage_path: path,
    caption: caption || null,
    uploader: uploader || null,
  });

  if (error) {
    await admin.storage.from(BUCKET).remove([path]);
    return { status: "error", message: "Gagal menyimpan. Coba lagi ya." };
  }

  await markUploaded();
  return { status: "ok" };
}

/**
 * Foto yang sudah lolos moderasi, lengkap dengan URL bertanda tangan.
 *
 * Sengaja tidak menerima daftar path dari klien: yang boleh tampil ditentukan
 * kolom `approved` di server, bukan oleh apa yang diminta peramban.
 */
export async function signedPhotos(limit = 24): Promise<SignedPhoto[]> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("photos")
    .select("id, storage_path, caption, uploader, created_at")
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(Math.min(60, Math.max(1, limit)));

  if (!data?.length) return [];

  const rows = data as {
    id: string;
    storage_path: string;
    caption: string | null;
    uploader: string | null;
    created_at: string;
  }[];

  const { data: signed } = await admin.storage
    .from(BUCKET)
    .createSignedUrls(rows.map((r) => r.storage_path), SIGNED_TTL);

  // createSignedUrls menjaga urutan masukan, tapi satu path yang gagal
  // menghasilkan entri tanpa signedUrl — foto itu dilewati, bukan bikin gagal
  // seluruh dinding.
  return rows
    .map((r, i) => ({
      id: r.id,
      url: signed?.[i]?.signedUrl ?? "",
      caption: r.caption,
      uploader: r.uploader,
      created_at: r.created_at,
    }))
    .filter((p) => p.url);
}

async function cooldownLeft(): Promise<number> {
  const jar = await cookies();
  const last = Number.parseInt(jar.get(COOKIE)?.value ?? "", 10);
  if (!Number.isFinite(last)) return 0;
  const left = COOLDOWN_MS - (Date.now() - last);
  return left > 0 ? Math.ceil(left / 1000) : 0;
}

async function markUploaded() {
  const jar = await cookies();
  jar.set(COOKIE, String(Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { isStaff } from "@/lib/scan-session";
import { integer, line, UUID } from "@/lib/validate";
import type { Attendance } from "@/lib/supabase/types";

/**
 * Ruang kerja panitia: moderasi foto, request lagu, kelola daftar tamu.
 *
 * Seperti `checkin.ts`, **setiap** action di sini memeriksa `isStaff()` sendiri.
 * Halaman /admin memang tidak merender apa pun sebelum login, tapi itu cuma
 * tampilan — action adalah endpoint POST yang bisa dipanggil langsung dengan
 * curl tanpa pernah menyentuh UI.
 *
 * Menolak foto berarti menghapus **objek di bucket juga**, bukan cuma barisnya.
 * Baris yatim tidak kelihatan di mana pun, jadi kalau objeknya ditinggal ia jadi
 * sampah yang tidak akan pernah ada yang menemukan lagi untuk dibersihkan.
 */

const BUCKET = "wall";
const SIGNED_TTL = 60 * 60;

export type AdminResult =
  | { status: "idle" }
  | { status: "ok"; message?: string }
  | { status: "denied" }
  | { status: "error"; message: string };

export type PendingPhoto = {
  id: string;
  url: string;
  caption: string | null;
  uploader: string | null;
  created_at: string;
};

export type AdminSong = {
  id: string;
  title: string;
  artist: string | null;
  requester: string | null;
  played: boolean;
  created_at: string;
};

export type AdminGuest = {
  id: string;
  slug: string;
  name: string;
  tableNo: string | null;
  seats: number;
  groupName: string | null;
  rsvp: { attending: Attendance; headcount: number } | null;
  checkedIn: boolean;
};

// ── Moderasi foto ───────────────────────────────────────────────────────────

/** Foto yang menunggu keputusan, dengan URL bertanda tangan untuk dilihat. */
export async function pendingPhotos(): Promise<PendingPhoto[]> {
  if (!(await isStaff())) return [];

  const admin = supabaseAdmin();
  const { data } = await admin
    .from("photos")
    .select("id, storage_path, caption, uploader, created_at")
    .eq("approved", false)
    .order("created_at", { ascending: true })
    .limit(60);

  if (!data?.length) return [];

  const rows = data as { id: string; storage_path: string; caption: string | null; uploader: string | null; created_at: string }[];
  const { data: signed } = await admin.storage
    .from(BUCKET)
    .createSignedUrls(rows.map((r) => r.storage_path), SIGNED_TTL);

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

/** Setujui (tampil di dinding) atau tolak (baris + objeknya dihapus). */
export async function decidePhoto(id: string, approve: boolean): Promise<AdminResult> {
  if (!(await isStaff())) return { status: "denied" };
  if (!UUID.test(id)) return { status: "error", message: "Foto tidak dikenali." };

  const admin = supabaseAdmin();

  if (approve) {
    const { error } = await admin.from("photos").update({ approved: true }).eq("id", id);
    return error
      ? { status: "error", message: "Gagal menyetujui." }
      : { status: "ok", message: "Foto tayang di dinding." };
  }

  // Path dibaca dulu — sesudah barisnya hilang tidak ada lagi yang tahu objek
  // mana yang harus ikut dihapus.
  const { data } = await admin.from("photos").select("storage_path").eq("id", id).maybeSingle();
  const path = (data?.storage_path as string | undefined) ?? null;

  const { error } = await admin.from("photos").delete().eq("id", id);
  if (error) return { status: "error", message: "Gagal menolak." };

  if (path) await admin.storage.from(BUCKET).remove([path]);
  return { status: "ok", message: "Foto ditolak dan dihapus." };
}

// ── Request lagu ────────────────────────────────────────────────────────────

/**
 * Request lagu dari tamu. HANYA di sini daftarnya bisa dilihat — tabel `songs`
 * tidak punya policy anon, jadi undangan sendiri tidak pernah membacanya.
 *
 * Yang belum diputar didahulukan, lalu yang paling lama menunggu, supaya
 * pemain musik bisa mengerjakan daftarnya dari atas.
 */
export async function listSongs(): Promise<AdminSong[]> {
  if (!(await isStaff())) return [];

  const admin = supabaseAdmin();
  const { data } = await admin
    .from("songs")
    .select("id, title, artist, requester, played, created_at")
    .order("played", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(300);

  return (data ?? []) as AdminSong[];
}

/** Tandai sudah/belum diputar. Bisa dibalik — salah tekan bukan hal fatal. */
export async function setSongPlayed(id: string, played: boolean): Promise<AdminResult> {
  if (!(await isStaff())) return { status: "denied" };
  if (!UUID.test(id)) return { status: "error", message: "Lagu tidak dikenali." };

  const admin = supabaseAdmin();
  const { error } = await admin.from("songs").update({ played }).eq("id", id);

  return error
    ? { status: "error", message: "Gagal memperbarui lagu." }
    : { status: "ok" };
}

// ── Daftar tamu ─────────────────────────────────────────────────────────────

/** Daftar tamu lengkap dengan status RSVP & kedatangan. */
export async function listGuests(): Promise<AdminGuest[]> {
  if (!(await isStaff())) return [];

  const admin = supabaseAdmin();
  const { data } = await admin
    .from("guests")
    .select("id, slug, name, table_no, seats, group_name")
    .order("created_at", { ascending: true })
    .limit(500);

  if (!data?.length) return [];
  const rows = data as { id: string; slug: string; name: string; table_no: string | null; seats: number; group_name: string | null }[];

  // Dua query menyapu tabel terkait sekaligus, bukan satu query per tamu —
  // 300 tamu berarti 300 bolak-balik jaringan kalau dilakukan per baris.
  const ids = rows.map((r) => r.id);
  const [{ data: rsvps }, { data: checkins }] = await Promise.all([
    admin.from("rsvps").select("guest_id, attending, headcount").in("guest_id", ids),
    admin.from("checkins").select("guest_id").in("guest_id", ids),
  ]);

  const rsvpBy = new Map(
    ((rsvps ?? []) as { guest_id: string; attending: Attendance; headcount: number }[]).map((r) => [
      r.guest_id,
      { attending: r.attending, headcount: r.headcount },
    ]),
  );
  const arrived = new Set(((checkins ?? []) as { guest_id: string }[]).map((c) => c.guest_id));

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    tableNo: r.table_no,
    seats: r.seats,
    groupName: r.group_name,
    rsvp: rsvpBy.get(r.id) ?? null,
    checkedIn: arrived.has(r.id),
  }));
}

/** Tambah satu tamu. Slug dibuat dari namanya, dan dijamin unik. */
export async function addGuest(_prev: AdminResult, fd: FormData): Promise<AdminResult> {
  if (!(await isStaff())) return { status: "denied" };

  const name = line(fd, "name").slice(0, 80);
  if (!name) return { status: "error", message: "Nama tamu masih kosong." };

  const tableNo = line(fd, "table_no").slice(0, 12) || null;
  const groupName = line(fd, "group_name").slice(0, 40) || null;
  const greeting = line(fd, "greeting").slice(0, 120) || null;
  const seats = integer(fd, "seats", 1, 20, 2);

  const admin = supabaseAdmin();
  const base = slugify(name) || "tamu";

  // Slug dicoba beberapa kali, bukan sekali. Dua "Budi Santoso" itu wajar di
  // daftar undangan, dan kolomnya unik — jadi tabrakan harus punya jalan keluar.
  for (let attempt = 0; attempt < 6; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${suffix()}`;
    const { data, error } = await admin
      .from("guests")
      .insert({ slug, name, greeting, table_no: tableNo, seats, group_name: groupName })
      .select("slug")
      .single();

    if (!error && data) return { status: "ok", message: `Tamu ditambahkan: /to/${data.slug}` };

    // 23505 = unique_violation. Selain itu, mengulang tidak akan menolong.
    if (error?.code !== "23505") {
      return { status: "error", message: "Gagal menambahkan tamu." };
    }
  }

  return { status: "error", message: "Slug bentrok terus. Coba beri nama yang sedikit berbeda." };
}

/** Nama → slug ASCII. Aksen dibuang lewat NFD supaya "José" jadi "jose". */
function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function suffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

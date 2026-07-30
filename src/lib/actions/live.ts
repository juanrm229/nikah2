"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { isStaff } from "@/lib/scan-session";

/**
 * Layar venue — satu action, satu bundel data, dipanggil berulang.
 *
 * Sengaja **tidak** memakai Realtime seperti buku tamu & dinding foto, padahal
 * dua tabelnya sudah masuk publikasi. Alasannya:
 *
 *   1. `checkins` belum masuk publikasi realtime, jadi kedatangan tamu — isi
 *      terpenting layar ini — tetap harus ditarik berkala.
 *   2. URL foto bertanda tangan hanya hidup 1 jam, sedangkan layar venue menyala
 *      sepanjang resepsi. Menarik ulang berkala membuat URL-nya ikut
 *      ditandatangani ulang, jadi masalah kedaluwarsa hilang dengan sendirinya
 *      alih-alih perlu penjadwal terpisah.
 *
 * Digabung jadi satu action supaya satu putaran = satu bolak-balik jaringan.
 */

const BUCKET = "wall";

/** Umur URL foto. Lebih panjang dari jeda tarik, jadi tidak pernah ada jeda kosong. */
const SIGNED_TTL = 60 * 60;

export type Arrival = {
  id: string;
  name: string;
  tableNo: string | null;
  headcount: number;
  at: string;
};

export type LivePhoto = { id: string; url: string; caption: string | null; uploader: string | null };

export type LiveWish = { id: string; name: string; message: string };

export type LiveFeed = {
  arrivals: Arrival[];
  photos: LivePhoto[];
  wishes: LiveWish[];
  /** Total orang yang sudah masuk — dijumlah dari `headcount`, bukan jumlah baris. */
  headcount: number;
};

/**
 * Bukan `export const` — berkas `"use server"` HANYA boleh mengekspor fungsi
 * async. Konstanta yang ikut diekspor membuat seluruh rute gagal saat dijalankan
 * ("A 'use server' file can only export async functions"), dan `tsc` maupun
 * eslint tidak menangkapnya.
 */
const EMPTY: LiveFeed = { arrivals: [], photos: [], wishes: [], headcount: 0 };

export async function liveFeed(): Promise<LiveFeed> {
  if (!(await isStaff())) return EMPTY;

  const admin = supabaseAdmin();

  const [checkins, photos, wishes] = await Promise.all([
    admin
      .from("checkins")
      .select("id, guest_id, headcount, created_at")
      // Semuanya diambil, bukan cuma yang tampil: penghitung "sudah hadir" harus
      // menjumlah SELURUH kedatangan, bukan sepuluh baris terakhir. Layar cuma
      // merender potongan awalnya.
      .order("created_at", { ascending: false })
      .limit(500),
    admin
      .from("photos")
      .select("id, storage_path, caption, uploader")
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(12),
    admin
      .from("wishes")
      .select("id, name, message")
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const rows = (checkins.data ?? []) as {
    id: string;
    guest_id: string;
    headcount: number;
    created_at: string;
  }[];

  // Nama tamu diambil sekali untuk semua baris. Join lewat PostgREST sebenarnya
  // bisa, tapi bentuk hasilnya berbeda-beda antara relasi satu & banyak —
  // dua query lugas lebih sulit salah baca.
  let names = new Map<string, { name: string; tableNo: string | null }>();
  if (rows.length) {
    const { data } = await admin
      .from("guests")
      .select("id, name, table_no")
      .in("id", rows.map((r) => r.guest_id));

    names = new Map(
      ((data ?? []) as { id: string; name: string; table_no: string | null }[]).map((g) => [
        g.id,
        { name: g.name, tableNo: g.table_no },
      ]),
    );
  }

  const arrivals: Arrival[] = rows.map((r) => ({
    id: r.id,
    name: names.get(r.guest_id)?.name ?? "Tamu",
    tableNo: names.get(r.guest_id)?.tableNo ?? null,
    headcount: r.headcount,
    at: r.created_at,
  }));

  const photoRows = (photos.data ?? []) as {
    id: string;
    storage_path: string;
    caption: string | null;
    uploader: string | null;
  }[];

  let signedPhotos: LivePhoto[] = [];
  if (photoRows.length) {
    const { data: signed } = await admin.storage
      .from(BUCKET)
      .createSignedUrls(photoRows.map((p) => p.storage_path), SIGNED_TTL);

    signedPhotos = photoRows
      .map((p, i) => ({
        id: p.id,
        url: signed?.[i]?.signedUrl ?? "",
        caption: p.caption,
        uploader: p.uploader,
      }))
      .filter((p) => p.url);
  }

  return {
    arrivals,
    photos: signedPhotos,
    wishes: (wishes.data ?? []) as LiveWish[],
    headcount: arrivals.reduce((sum, a) => sum + a.headcount, 0),
  };
}

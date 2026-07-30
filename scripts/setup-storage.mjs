#!/usr/bin/env node
/**
 * Menyiapkan kedua bucket Supabase, lengkap dengan batasnya.
 *
 *   npm run setup:storage
 *
 * Kenapa skrip, bukan langkah di dashboard: batas ukuran & daftar MIME adalah
 * satu-satunya rem sebelum berkas selesai naik — signed upload URL tidak
 * membawa batas sendiri. Langkah manual yang mudah terlupa itu justru yang
 * paling tidak boleh terlupa, jadi ia ditulis sebagai kode yang bisa dijalankan
 * ulang kapan saja (idempoten: bucket yang sudah ada diperbarui, bukan error).
 *
 * Dijalankan dengan service role, jadi HANYA dari mesin sendiri — jangan
 * pernah dari peramban.
 */

import { readFileSync } from "node:fs";

/**
 * Storage REST API ditembak langsung dengan `fetch`, bukan lewat supabase-js.
 * Bukan karena ingin berbeda: `createClient` selalu menyalakan klien Realtime,
 * dan klien itu menolak jalan di Node 20 karena belum ada WebSocket bawaan
 * ("Node.js 20 detected without native WebSocket support"). Skrip ini tidak
 * butuh realtime sama sekali, jadi jalan pintasnya justru yang paling lurus.
 */

const BUCKETS = [
  {
    id: "wall",
    // Private: foto tamu dibaca lewat signed URL, dan bucket ini sama sekali
    // tidak boleh bisa ditelusuri orang luar.
    public: false,
    file_size_limit: 8 * 1024 * 1024,
    allowed_mime_types: ["image/jpeg", "image/png", "image/webp"],
  },
  {
    id: "music",
    // Public: isinya satu lagu yang memang diputar ke semua tamu. URL
    // bertanda tangan malah merugikan — beda untuk tiap tamu (CDN tidak bisa
    // memakai ulang cache) dan kedaluwarsa di tengah kunjungan panjang.
    public: true,
    file_size_limit: 20 * 1024 * 1024,
    allowed_mime_types: [
      "audio/mpeg",
      "audio/mp4",
      "audio/x-m4a",
      "audio/aac",
      "audio/ogg",
      "audio/wav",
      "audio/x-wav",
      "audio/webm",
    ],
  },
];

/** Baca .env.local sendiri — skrip ini jalan di luar Next, jadi tanpa dotenv. */
function loadEnv(file = ".env.local") {
  let raw;
  try {
    raw = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  } catch {
    return;
  }

  for (const lineText of raw.split("\n")) {
    const m = lineText.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum terisi.");
  process.exit(1);
}

const base = url.replace(/\/+$/, "");

async function api(method, path, body) {
  const res = await fetch(`${base}/storage/v1${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { message: text };
  }
  return { ok: res.ok, status: res.status, body: parsed };
}

let failed = false;

for (const bucket of BUCKETS) {
  const { id, ...limits } = bucket;

  const created = await api("POST", "/bucket", { id, name: id, ...limits });

  // Bucket sudah ada bukan kegagalan — batasnya tetap dipasang lewat PUT,
  // supaya menjalankan ulang skrip ini selalu mengembalikan keadaan yang benar.
  const exists =
    !created.ok &&
    (created.status === 409 || /already exists|duplicate/i.test(created.body?.message ?? ""));

  if (!created.ok && !exists) {
    console.error(`✗ ${id}: ${created.body?.message ?? created.status}`);
    failed = true;
    continue;
  }

  const updated = await api("PUT", `/bucket/${id}`, limits);
  if (!updated.ok) {
    console.error(`✗ ${id}: ${updated.body?.message ?? updated.status}`);
    failed = true;
    continue;
  }

  const mb = Math.round(limits.file_size_limit / (1024 * 1024));
  console.log(
    `✓ ${id} — ${limits.public ? "public" : "private"}, ${mb} MB, ` +
      `${limits.allowed_mime_types.length} tipe diizinkan ${exists ? "(diperbarui)" : "(dibuat)"}`,
  );
}

process.exit(failed ? 1 : 0);

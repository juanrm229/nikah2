"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { endSession, isStaff, passwordMatches, startSession } from "@/lib/scan-session";
import { line } from "@/lib/validate";
import type { Attendance } from "@/lib/supabase/types";

/**
 * Check-in di pintu.
 *
 * Setiap action di sini memeriksa sesi petugasnya SENDIRI. Halaman /scan memang
 * sudah tidak merender pemindai sebelum login, tapi itu bukan batas keamanan —
 * action adalah endpoint POST yang bisa dipanggil langsung tanpa lewat UI.
 */

export type LoginResult = { status: "idle" } | { status: "error"; message: string };

export type CheckinResult =
  | { status: "idle" }
  | { status: "unauthorized" }
  | { status: "unknown"; code: string }
  | { status: "ok"; guest: ScannedGuest }
  | { status: "duplicate"; guest: ScannedGuest; at: string }
  | { status: "error"; message: string };

/** Hanya yang perlu dilihat petugas. `checkin_code` & `slug` tidak ikut. */
export type ScannedGuest = {
  name: string;
  tableNo: string | null;
  seats: number;
  groupName: string | null;
  rsvp: { attending: Attendance; headcount: number } | null;
};

export async function login(_prev: LoginResult, fd: FormData): Promise<LoginResult> {
  const pwd = typeof fd.get("password") === "string" ? (fd.get("password") as string) : "";
  if (!pwd) return { status: "error", message: "Kata sandi masih kosong." };

  if (!passwordMatches(pwd)) {
    return { status: "error", message: "Kata sandi salah." };
  }

  await startSession();
  return { status: "idle" };
}

export async function logout() {
  await endSession();
}

export async function checkIn(_prev: CheckinResult, fd: FormData): Promise<CheckinResult> {
  if (!(await isStaff())) return { status: "unauthorized" };

  // `checkin_code` selalu 24 karakter hex — encode(gen_random_bytes(12), 'hex').
  // Menyaringnya di sini menahan tebakan berpola aneh sebelum menyentuh DB.
  const code = line(fd, "code").toLowerCase().replace(/[^0-9a-f]/g, "");
  if (code.length !== 24) {
    return { status: "unknown", code: line(fd, "code").slice(0, 40) };
  }

  const admin = supabaseAdmin();

  const { data: guest, error } = await admin
    .from("guests")
    .select("id, name, table_no, seats, group_name")
    .eq("checkin_code", code)
    .maybeSingle();

  if (error) return { status: "error", message: "Gagal membaca data tamu." };
  if (!guest) return { status: "unknown", code };

  const guestId = guest.id as string;

  const { data: rsvpRow } = await admin
    .from("rsvps")
    .select("attending, headcount")
    .eq("guest_id", guestId)
    .maybeSingle();

  const scanned: ScannedGuest = {
    name: guest.name as string,
    tableNo: (guest.table_no as string | null) ?? null,
    seats: (guest.seats as number) ?? 0,
    groupName: (guest.group_name as string | null) ?? null,
    rsvp: rsvpRow
      ? {
          attending: rsvpRow.attending as Attendance,
          headcount: rsvpRow.headcount as number,
        }
      : null,
  };

  // Sudah pernah masuk? Jangan tambah baris — petugas butuh tahu, bukan
  // menghitung dua kali. Ini juga yang menahan tamu memuat ulang URL QR-nya.
  const { data: prior } = await admin
    .from("checkins")
    .select("created_at")
    .eq("guest_id", guestId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (prior) {
    return { status: "duplicate", guest: scanned, at: prior.created_at as string };
  }

  const headcount = scanned.rsvp?.headcount ?? scanned.seats;
  const { error: insertError } = await admin
    .from("checkins")
    .insert({ guest_id: guestId, headcount });

  if (insertError) return { status: "error", message: "Gagal menyimpan check-in." };

  return { status: "ok", guest: scanned };
}

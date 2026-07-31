import { notFound } from "next/navigation";
import { Invitation } from "@/components/invitation";
import { BoardingPass } from "@/components/sections/boarding-pass";
import { adminConfigured, supabaseAdmin } from "@/lib/supabase/admin";
import { toPublicGuest, type Guest } from "@/lib/supabase/types";
import { checkinQrSvg } from "@/lib/qr";
import { activeTrack } from "@/lib/music";
import { guestMrz, guestSerial } from "@/lib/wedding-mrz";

/**
 * Undangan personal.
 *
 * WAJIB dirender di server. Tabel `guests` tidak punya satu pun policy untuk
 * anon, jadi hanya service role yang bisa membacanya — dan itu memang tujuannya:
 * kalau daftar tamu sampai terbuka ke peramban, satu tamu bisa memanen nama dan
 * nomor meja seluruh tamu lain dari link yang beredar di grup WhatsApp.
 *
 * `checkin_code` berhenti di file ini. Yang diteruskan ke komponen hanyalah SVG
 * QR yang sudah selesai dirender.
 */

// Data tamu tidak boleh di-cache: nomor meja bisa berubah sampai hari-H, dan
// halaman ini bersifat pribadi per tamu.
export const dynamic = "force-dynamic";

export default async function PersonalInvitation({ params }: PageProps<"/to/[slug]">) {
  const { slug } = await params;

  // Tanpa env service role, tidak ada cara membaca daftar tamu. Menampilkan
  // undangan umum di URL personal hanya akan membingungkan — lebih baik 404.
  if (!adminConfigured) notFound();

  const { data, error } = await supabaseAdmin()
    .from("guests")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) notFound();

  const guest = data as Guest;
  const [qrSvg, track] = await Promise.all([checkinQrSvg(guest.checkin_code), activeTrack()]);

  // Nomor paspor tamu. Dihitung dari slug, bukan dari `checkin_code` — kode itu
  // adalah pengaman check-in dan tidak boleh punya jejak apa pun di layar.
  const serial = guestSerial(guest.slug);

  return (
    <Invitation
      guest={toPublicGuest(guest)}
      track={track}
      boardingPass={
        <BoardingPass
          name={guest.name}
          greeting={guest.greeting}
          tableNo={guest.table_no}
          seats={guest.seats}
          qrSvg={qrSvg}
          serial={serial}
          mrz={guestMrz(guest.name, serial)}
        />
      }
    />
  );
}

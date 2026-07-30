"use client";

import { useState, type ReactNode } from "react";
import { Cover } from "@/components/sections/cover";
import { Bismillah } from "@/components/sections/bismillah";
import { Couple } from "@/components/sections/couple";
import { Journey } from "@/components/sections/journey";
import { CountdownSection } from "@/components/sections/countdown";
import { Rundown } from "@/components/sections/rundown";
import { Venue } from "@/components/sections/venue";
import { Gallery } from "@/components/sections/gallery";
import { Rsvp } from "@/components/sections/rsvp";
import { Songs } from "@/components/sections/songs";
import { Guestbook } from "@/components/sections/guestbook";
import { PhotoWall } from "@/components/sections/photo-wall";
import { Closing } from "@/components/sections/closing";
import { MusicPlayer } from "@/components/music/player";
import { ScrollProvider } from "@/components/motion/scroll-provider";
import { Dust } from "@/components/motion/dust";
import { ScrollThread } from "@/components/motion/thread";
import { IkatField } from "@/components/tenun/ikat";
import { wedding } from "@/config/wedding";
import type { ActiveTrack } from "@/lib/music";
import type { PublicGuest } from "@/lib/supabase/types";

/**
 * Rangka undangan.
 *
 * Isi undangan tetap dirender di balik sampul sejak awal — bukan dipasang
 * setelah tombol ditekan — supaya gambar sudah selesai diunduh ketika tamu
 * membuka sampul, dan tidak ada kedipan halaman kosong.
 */
export function Invitation({
  guest,
  boardingPass,
  track = null,
}: {
  guest?: PublicGuest | null;
  /**
   * Boarding pass personal, dirender di server oleh /to/[slug] lalu diselipkan
   * sebagai children. Dibuat sebagai slot, bukan dirakit di sini, karena
   * pembuatannya butuh `checkin_code` — dan kode itu tidak boleh menyeberang
   * ke bundel klien.
   */
  boardingPass?: ReactNode;
  /**
   * Lagu latar yang sedang aktif, dibaca di server dari tabel `tracks`.
   * `null` berarti panitia belum mengunggah lagu apa pun — pemutarnya tidak
   * muncul sama sekali, bukan muncul dalam keadaan mati.
   */
  track?: ActiveTrack | null;
}) {
  const [opened, setOpened] = useState(false);

  return (
    <>
      <ScrollProvider enabled={opened} />

      {!opened && <Cover guestName={guest?.name} onOpen={() => setOpened(true)} />}

      {/* Baru dipasang setelah sampul dibuka — `play()` butuh gerakan pengguna,
          dan tekanan tombol sampul itulah gerakannya. */}
      {opened && wedding.music.enabled && track && <MusicPlayer track={track} />}

      {/* Selama sampul tertutup, isi undangan disembunyikan dari pembaca layar
          dan dari fokus keyboard agar tidak bisa "ditembus" dengan Tab. */}
      <main aria-hidden={!opened} inert={!opened} className="relative">
        {/* Latar tetap: motif tenun samar, lalu debu emas di atasnya. Debunya
            duduk DI BELAKANG isi undangan, jadi ia hanya terlihat di sela-sela
            gelap antar halaman — persis seperti udara di antara lembar kertas,
            bukan bintik yang menempel di layar. */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <IkatField color="var(--color-paper)" opacity={0.028} scale={1.8} className="h-full w-full" />
          <Dust count={26} seed={19} />
        </div>

        <ScrollThread />

        <Bismillah />
        <Couple />
        <Journey />
        <CountdownSection />
        <Rundown />
        <Venue />
        {boardingPass}
        <Gallery />
        <Rsvp slug={guest?.slug ?? null} guestName={guest?.name} seats={guest?.seats} />
        <Songs slug={guest?.slug ?? null} guestName={guest?.name} />
        <Guestbook slug={guest?.slug ?? null} guestName={guest?.name} />
        <PhotoWall slug={guest?.slug ?? null} guestName={guest?.name} />

        <Closing />

        {/* Footer tinggal keterangan motif — ucapan penutupnya sudah pindah ke
            <Closing>, dan dua "sampai berjumpa" berturut-turut jadi antiklimaks. */}
        <footer className="px-6 pb-12 text-center">
          <p className="mx-auto max-w-[34ch] text-[0.72rem] leading-relaxed font-light text-paper-dim/55">
            {wedding.tenun.note}
          </p>
        </footer>
      </main>
    </>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
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
import { Gift } from "@/components/sections/gift";
import { Closing } from "@/components/sections/closing";
import { MusicPlayer } from "@/components/music/player";
import { ScrollProvider } from "@/components/motion/scroll-provider";
import { UvLamp } from "@/components/uv/lamp";
import { SfxToggle } from "@/components/sfx/toggle";
import { SerialProvider } from "@/components/passport/serial";
import { Dust } from "@/components/motion/dust";
import { ScrollThread } from "@/components/motion/thread";
import { IkatField } from "@/components/tenun/ikat";
import { wedding } from "@/config/wedding";
import { guestSerial } from "@/lib/wedding-mrz";
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

  /**
   * Nomor paspor tamu ini.
   *
   * Diturunkan dari slug, bukan dibawa dari server: slug-nya sudah ada di
   * alamat yang dibuka tamu, jadi menghitungnya di peramban tidak
   * menyeberangkan satu pun data tamu lain. Undangan umum tidak punya nomor
   * pribadi — di sana yang berlaku nomor dokumen pernikahannya sendiri.
   */
  const serial = guest?.slug ? guestSerial(guest.slug) : undefined;

  /**
   * Segel gulir selama sampul masih tertutup.
   *
   * Sampul adalah lapisan `fixed`, jadi ia sendiri tidak pernah bergerak — tapi
   * `<main>` di belakangnya tetap dokumen setinggi sebelas ribu piksel. Tamu
   * yang menggeser layar sambil menunggu ritual pembuka diam-diam menggulir
   * undangan di baliknya, dan begitu sampulnya dibuka yang muncul bukan
   * halaman pertama melainkan bagian tengah yang kebetulan sedang di layar.
   *
   * Pembersihannya (saat `opened` menjadi true) sekaligus MEMULANGKAN posisi
   * gulir ke nol. Segelnya hanya menahan; yang benar-benar menjamin undangan
   * dimulai dari halaman pertama adalah baris itu.
   */
  useEffect(() => {
    if (opened) return;
    const root = document.documentElement;
    window.scrollTo(0, 0);
    root.classList.add("sealed");
    return () => {
      root.classList.remove("sealed");
      window.scrollTo(0, 0);
    };
  }, [opened]);

  return (
    <SerialProvider value={serial}>
      <ScrollProvider enabled={opened} />

      {!opened && (
        <Cover guestName={guest?.name} serial={serial} onOpen={() => setOpened(true)} />
      )}

      {/* Baru dipasang setelah sampul dibuka — `play()` butuh gerakan pengguna,
          dan tekanan tombol sampul itulah gerakannya. */}
      {opened && wedding.music.enabled && track && <MusicPlayer track={track} />}

      {/* Lampu UV baru dipasang setelah sampul dibuka, dan ia mendengarkan
          SELURUH jendela — kalau dipasang lebih awal, menahan jari di sampul
          yang masih tertutup akan memadamkan layar yang belum boleh dibaca.
          Ditaruh di luar <main> karena sorotnya `fixed`. */}
      {opened && <UvLamp />}

      {/* Saklar suara. Baru muncul setelah sampul dibuka — sebelum itu belum
          ada satu bunyi pun yang bisa dibisukan, dan tombol yang tidak
          mengerjakan apa-apa hanya merusak layar pertama. */}
      {opened && <SfxToggle />}

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

        {/* Vignette tipis DI ATAS segalanya.
            Section gelap sebelumnya rata betul: motif tenun tersebar merata
            sampai ke tepi layar, jadi tidak ada tempat yang lebih terang dari
            tempat lain dan mata tidak punya alasan untuk memusat. Sudut yang
            digelapkan sedikit membuat seluruh undangan terbaca seolah DIPOTRET
            di bawah satu lampu — halaman kertasnya ikut, bukan cuma latarnya.
            Kekuatannya sengaja nyaris tak terukur; begitu ia terlihat sebagai
            "efek", ia sudah salah. */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-20"
          style={{
            background:
              "radial-gradient(125% 85% at 50% 42%, transparent 42%, rgba(6,5,4,0.30) 78%, rgba(6,5,4,0.55) 100%)",
          }}
        />

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

        {/* Saklarnya ada di konfigurasi, dan pengujiannya ada DI SINI supaya
            seluruh isi <Gift> tidak pernah ikut dirakit selama nomor rekening
            yang sah belum masuk. Repo ini publik dan situsnya sudah live;
            memajang rekening karangan ke tamu yang mungkin benar-benar
            mentransfer adalah satu-satunya kesalahan di undangan ini yang tidak
            bisa diperbaiki dengan deploy ulang. */}
        {wedding.gift.enabled && <Gift />}

        <Closing />

        {/* Footer tinggal keterangan motif — ucapan penutupnya sudah pindah ke
            <Closing>, dan dua "sampai berjumpa" berturut-turut jadi antiklimaks. */}
        <footer className="px-6 pb-12 text-center">
          <p className="mx-auto max-w-[34ch] text-[0.72rem] leading-relaxed font-light text-paper-dim/55">
            {wedding.tenun.note}
          </p>
        </footer>
      </main>
    </SerialProvider>
  );
}

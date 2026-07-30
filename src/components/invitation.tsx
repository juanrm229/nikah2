"use client";

import { useState } from "react";
import { Cover } from "@/components/sections/cover";
import { Bismillah } from "@/components/sections/bismillah";
import { Couple } from "@/components/sections/couple";
import { Journey } from "@/components/sections/journey";
import { CountdownSection } from "@/components/sections/countdown";
import { Rundown } from "@/components/sections/rundown";
import { Venue } from "@/components/sections/venue";
import { Gallery } from "@/components/sections/gallery";
import { ScrollProvider } from "@/components/motion/scroll-provider";
import { IkatField } from "@/components/tenun/ikat";
import type { PublicGuest } from "@/lib/supabase/types";

/**
 * Rangka undangan.
 *
 * Isi undangan tetap dirender di balik sampul sejak awal — bukan dipasang
 * setelah tombol ditekan — supaya gambar sudah selesai diunduh ketika tamu
 * membuka sampul, dan tidak ada kedipan halaman kosong.
 */
export function Invitation({ guest }: { guest?: PublicGuest | null }) {
  const [opened, setOpened] = useState(false);

  return (
    <>
      <ScrollProvider enabled={opened} />

      {!opened && <Cover guestName={guest?.name} onOpen={() => setOpened(true)} />}

      {/* Selama sampul tertutup, isi undangan disembunyikan dari pembaca layar
          dan dari fokus keyboard agar tidak bisa "ditembus" dengan Tab. */}
      <main aria-hidden={!opened} inert={!opened} className="relative">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <IkatField color="var(--color-paper)" opacity={0.028} scale={1.8} className="h-full w-full" />
        </div>

        <Bismillah />
        <Couple />
        <Journey />
        <CountdownSection />
        <Rundown />
        <Venue />
        <Gallery />

        <footer className="px-6 py-16 text-center">
          <p className="field-label text-paper-dim/60">Sampai berjumpa</p>
        </footer>
      </main>
    </>
  );
}

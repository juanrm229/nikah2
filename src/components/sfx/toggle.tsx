"use client";

import { useSyncExternalStore } from "react";
import { isMuted, setMuted, subscribeMuted } from "@/lib/sfx";

/**
 * Saklar suara undangan.
 *
 * Duduk di sudut kiri bawah, berhadapan dengan tombol musik di kanan — dua
 * kendali suara di dua sudut yang berbeda, jadi tidak ada yang perlu ditebak:
 * kanan mengurus lagu, kiri mengurus bunyi bendanya.
 *
 * Sengaja kecil dan tidak berlabel sampai disentuh. Yang membutuhkannya sedang
 * mencarinya; yang tidak membutuhkannya tidak perlu diingatkan tiap kali
 * menggulir bahwa undangan ini mengeluarkan suara.
 */
export function SfxToggle() {
  // Preferensi ini hidup di luar React (modul sfx yang memegangnya, dan
  // localStorage yang mengingatnya). Membacanya lewat useSyncExternalStore
  // adalah cara yang benar untuk itu — bukan menyalinnya ke state lalu berharap
  // dua salinannya tetap sepakat.
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);

  return (
    <div className="animate-rise-in fixed bottom-4 left-4 z-40 pb-[env(safe-area-inset-bottom)]">
      <button
        type="button"
        onClick={() => setMuted(!muted)}
        aria-pressed={!muted}
        aria-label={muted ? "Nyalakan suara undangan" : "Bisukan suara undangan"}
        title={muted ? "Nyalakan suara" : "Bisukan suara"}
        className="grid h-9 w-9 place-items-center rounded-full border border-gold/35 bg-ink-2/85 text-paper shadow-[0_6px_24px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-colors hover:border-gold/70 active:scale-[0.94]"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          {/* Corong pengeras suara — satu bentuk, dipakai untuk kedua keadaan. */}
          <path
            d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"
            fill="var(--color-gold-2)"
            stroke="var(--color-gold-2)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {muted ? (
            // Bisu: silang. Bukan gelombang yang dipudarkan — keadaan mati
            // harus punya BENTUK sendiri, supaya terbaca dalam sekali lihat
            // tanpa perlu membandingkannya dengan keadaan hidup.
            <path
              d="M16 9.5l4.5 5M20.5 9.5l-4.5 5"
              stroke="var(--color-paper-dim)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M15.5 9.2a4 4 0 010 5.6M18.2 7.2a7.5 7.5 0 010 9.6"
              stroke="var(--color-gold)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>
    </div>
  );
}

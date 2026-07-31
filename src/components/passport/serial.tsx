"use client";

import { createContext, useContext, type ReactNode } from "react";
import { documentSerial } from "@/lib/wedding-mrz";

/**
 * Nomor dokumen yang berlaku di seluruh undangan yang sedang dibuka.
 *
 * Ada sebagai context, bukan sebagai prop yang dioper dari section ke section,
 * karena yang membutuhkannya tersebar di tempat-tempat yang tidak saling
 * berhubungan: zona MRZ di sampul, MRZ di halaman penutup, dan cetakan mikro
 * yang hanya muncul di bawah lampu UV pada SETIAP halaman kertas. Menuruni
 * tujuh section hanya untuk membawa satu string adalah harga yang tidak perlu
 * dibayar — dan setiap section yang lupa meneruskannya akan diam-diam mencetak
 * nomor yang berbeda dari tetangganya.
 *
 * Dan itulah taruhannya. Paspor yang bagian depannya bernomor lain dari bagian
 * belakangnya berhenti masuk akal bagi siapa pun yang iseng mencocokkan
 * keduanya — persis jenis detail yang tidak diperhatikan orang saat benar, dan
 * selalu diperhatikan saat salah.
 */
const SerialContext = createContext<string | null>(null);

export function SerialProvider({
  value,
  children,
}: {
  /** Nomor paspor tamu, atau kosong pada undangan umum. */
  value?: string;
  children: ReactNode;
}) {
  return <SerialContext.Provider value={value ?? null}>{children}</SerialContext.Provider>;
}

/**
 * Nomor yang harus dicetak di sini.
 *
 * Tanpa penyedia — undangan umum yang tidak ditujukan kepada siapa pun —
 * yang berlaku adalah nomor dokumen pernikahannya sendiri.
 */
export function useSerial() {
  return useContext(SerialContext) ?? documentSerial();
}

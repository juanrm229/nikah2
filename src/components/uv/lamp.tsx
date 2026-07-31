"use client";

import { useEffect, useRef, useState } from "react";
import { setScrollLocked } from "@/components/motion/scroll-provider";
import { sfxUvOff, sfxUvOn } from "@/lib/sfx";

/**
 * Lama jari harus diam di layar sebelum lampu menyala.
 *
 * 400 ms adalah celah yang sempit tapi nyata: cukup lama untuk tidak pernah
 * menyala saat tamu mulai menggulir, cukup singkat untuk masih terasa sebagai
 * jawaban atas tekanan jari — bukan sebagai penantian.
 */
const HOLD_MS = 400;

/** Geser sejauh ini sebelum lampu menyala = tamu sedang menggulir. Batal. */
const SLOP = 12;

/**
 * Lampu UV.
 *
 * Paspor sungguhan menyimpan lapisan yang hanya terbaca di bawah sinar
 * ultraviolet, dan undangan ini menyimpannya juga. Tekan & tahan layar: ruangan
 * padam, dan satu lingkaran cahaya ungu mengikuti jari — serat pengaman kertas,
 * motif tenun yang menyala, segel, dan nomor dokumen yang tercetak mikro di
 * tepi halaman.
 *
 * Tidak ada tombolnya, dan tidak ada petunjuknya. Rahasia yang diberi petunjuk
 * berhenti jadi rahasia — ia berubah jadi fitur, dan fitur tidak pernah
 * diceritakan orang kepada orang lain. Yang menemukannya sendiri akan
 * menyodorkan ponselnya ke orang di sebelahnya; itu penyebarannya.
 */
export function UvLamp() {
  const beamRef = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const beam = beamRef.current;
    if (!beam) return;

    const root = document.documentElement;

    // Radius dihitung sekali per gerakan, bukan per frame: ia hanya berubah
    // saat layar berubah ukuran, dan sorot selebar sepertiga sisi terpendek
    // adalah satu-satunya angka yang terasa seperti senter di kedua ukuran
    // layar — lebih lebar dari itu, ruangannya tidak terasa gelap lagi.
    const radius = () => Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.32);

    let armed = false;
    let lit = false;
    let timer = 0;
    let startX = 0;
    let startY = 0;

    const place = (x: number, y: number) => {
      beam.style.setProperty("--uv-x", `${x}px`);
      beam.style.setProperty("--uv-y", `${y}px`);
    };

    const ignite = () => {
      lit = true;
      root.classList.add("uv");
      setScrollLocked(true);
      setOn(true);
      // Getaran sependek denting — bukan alarm. Hanya Android; iOS mengabaikan.
      navigator.vibrate?.(12);
      sfxUvOn();
    };

    const extinguish = () => {
      window.clearTimeout(timer);
      armed = false;
      root.classList.remove("uv-arming");
      if (!lit) return;
      lit = false;
      root.classList.remove("uv");
      setScrollLocked(false);
      setOn(false);
      sfxUvOff();
    };

    /**
     * Yang TIDAK boleh menyalakan lampu.
     *
     * Menahan jari di atas tombol, kolom isian, atau foto yang diperbesar
     * adalah gerakan yang sudah punya arti sendiri. Menyalakan lampu di sana
     * berarti merampas gerakan itu — dan tamu yang sedang mengisi RSVP tidak
     * sedang mencari easter egg.
     */
    const forbidden = (target: EventTarget | null) =>
      target instanceof Element &&
      target.closest(
        'button, a, input, textarea, select, label, [role="dialog"], [contenteditable], [data-no-uv]',
      ) !== null;

    // Selagi lampu menyala, jari yang bergeser MENGGESER LAMPU — bukan
    // halaman. Pendengarnya sengaja non-passive; itu satu-satunya cara
    // preventDefault masih didengar. Dipasang hanya selama satu sentuhan,
    // supaya gulir di sisa waktu tetap berjalan di jalur cepat peramban.
    const blockTouch = (e: TouchEvent) => {
      if (lit) e.preventDefault();
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (forbidden(e.target)) return;

      // Jari kedua yang mendarat sebelum jari pertama diangkat meninggalkan
      // hitungannya sendiri yang masih berjalan. Tanpa baris ini, cubit untuk
      // memperbesar berakhir dengan lampu yang menyala setelah kedua jari
      // sudah lepas — dan tidak ada pointerup lagi yang akan mematikannya.
      window.clearTimeout(timer);

      startX = e.clientX;
      startY = e.clientY;
      armed = true;
      beam.style.setProperty("--uv-r", `${radius()}px`);
      place(e.clientX, e.clientY);
      root.classList.add("uv-arming");
      window.addEventListener("touchmove", blockTouch, { passive: false });
      timer = window.setTimeout(ignite, HOLD_MS);
    };

    const onMove = (e: PointerEvent) => {
      if (lit) {
        place(e.clientX, e.clientY);
        return;
      }
      if (!armed) return;
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > SLOP) {
        window.clearTimeout(timer);
        armed = false;
        root.classList.remove("uv-arming");
      }
    };

    const onUp = () => {
      window.removeEventListener("touchmove", blockTouch);
      extinguish();
    };

    // Jari yang masih menempel saat tab berpindah tidak akan pernah
    // mengirimkan pointerup-nya. Tanpa jaring ini, tamu kembali ke undangan
    // yang gelap gulita dan tidak bisa digulir.
    const onHide = () => {
      if (document.visibilityState === "hidden") onUp();
    };

    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("blur", onUp);
    document.addEventListener("visibilitychange", onHide);

    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", onUp);
      window.removeEventListener("touchmove", blockTouch);
      document.removeEventListener("visibilitychange", onHide);
      onUp();
    };
  }, []);

  return (
    <div ref={beamRef} aria-hidden className={`uv-beam ${on ? "is-on" : ""}`}>
      <div className="uv-beam-dark" />
      <div className="uv-beam-cast" />
      <div className="uv-beam-ring" />
    </div>
  );
}

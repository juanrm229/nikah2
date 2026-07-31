"use client";

import { useState } from "react";
import Image from "next/image";
import { wedding } from "@/config/wedding";
import { PassportPage, Heading } from "@/components/passport/page";
import { Stamp } from "@/components/passport/stamp";
import { Reveal } from "@/components/motion/reveal";
import { sfxStamp } from "@/lib/sfx";

/**
 * Amplop digital, dibentuk sebagai formulir bea cukai.
 *
 * Bandara sungguhan memberi penumpang dua jalur, dan itulah seluruh gagasannya:
 * JALUR HIJAU untuk yang tidak membawa apa-apa, JALUR MERAH untuk yang punya
 * sesuatu untuk dideklarasikan. Daftar rekening tidak dipajang begitu saja —
 * ia berada di balik jalur merah, dan tamu yang memilih jalur hijau mendapat
 * kalimat yang menyatakan bahwa ia sudah membawa yang paling diminta.
 *
 * Bawaannya jalur hijau. Ini bukan sekadar keadaan awal yang kebetulan: bagian
 * "amplop digital" pada undangan online hampir selalu terbaca sebagai
 * permintaan, dan satu-satunya cara menghapus rasa itu adalah membuat "tidak
 * memberi apa-apa" jadi jawaban yang sudah tercentang lebih dulu — bukan
 * pilihan yang harus dicari tamu sendiri.
 */
export function Gift() {
  const [lane, setLane] = useState<"green" | "red">("green");
  const gift = wedding.gift;

  return (
    <PassportPage
      id="bea-cukai"
      label="Formulir Bea Cukai"
      page="Hal. 08"
      uvSeed={59}
      stampPosition="top-right"
      stamp={
        <Stamp
          top="BEA CUKAI"
          bottom="CUSTOMS"
          center="OK"
          rotate={9}
          size={92}
          color="var(--color-lane)"
        />
      }
    >
      <Heading label="Deklarasi" title="Bea Cukai" />

      <p className="mt-6 text-center text-[0.88rem] leading-relaxed font-light text-ink-soft">
        Setiap penumpang dipersilakan memilih satu jalur.
      </p>

      <div className="mt-7 grid grid-cols-2 gap-2.5">
        <Lane
          tone="green"
          active={lane === "green"}
          onSelect={() => setLane("green")}
          title="Tidak ada yang dideklarasikan"
          sub="Nothing to declare"
        />
        <Lane
          tone="red"
          active={lane === "red"}
          onSelect={() => setLane("red")}
          title="Ada yang dideklarasikan"
          sub="Goods to declare"
        />
      </div>

      {lane === "green" ? (
        <div className="mt-8 flex flex-col items-center text-center">
          <p className="max-w-[30ch] text-[0.9rem] leading-relaxed font-light text-ink">
            {gift.note}
          </p>
          {/* `active` dipaksa true: stempel ini lahir dari pilihan tamu, bukan
              dari gulir — dan menunggu ambang keterlihatan pada elemen yang
              baru saja muncul di tengah layar berarti ia tidak akan pernah
              jatuh sama sekali. */}
          <Stamp
            className="mt-5"
            active
            top="TERIMA KASIH"
            bottom="JALUR HIJAU"
            center="✓"
            rotate={-7}
            size={112}
            color="var(--color-lane)"
          />
        </div>
      ) : (
        <div className="mt-8">
          <p className="field-label text-ink-soft/80">Saluran deklarasi</p>

          <div className="mt-3 border-t border-ink/15">
            {gift.banks.map((bank) => (
              <Row
                key={bank.bank + bank.number}
                label={bank.bank}
                value={bank.number}
                sub={`a.n. ${bank.holder}`}
              />
            ))}
          </div>

          {/* QRIS baru muncul kalau gambarnya benar-benar ada. Bingkai kosong
              berlabel "QRIS" hanya memberi tahu tamu bahwa ada sesuatu yang
              belum selesai dikerjakan. */}
          {gift.qris && (
            <Reveal delay={80} className="mt-7 flex flex-col items-center">
              <p className="field-label text-ink-soft/80">Materai bea</p>
              <div className="mt-3 rounded-[2px] border border-dashed border-ink/30 bg-paper-2/60 p-3">
                <div className="relative aspect-square w-40">
                  {/* `unoptimized` bukan jalan pintas. Pengoptimal gambar
                      menyandi ulang dan menyekalakan apa pun yang lewat, dan
                      kode QR adalah satu-satunya gambar di undangan ini yang
                      bisa BERHENTI BEKERJA karenanya — modul yang tepinya
                      melembut atau bergeser setengah piksel tidak lagi terbaca
                      pemindai. Lebih baik mengirim berkas aslinya apa adanya. */}
                  <Image
                    src={gift.qris}
                    alt="Kode QRIS"
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </div>
              </div>
              <p className="mt-2 text-[0.72rem] font-light text-ink-soft/80">
                Pindai dengan aplikasi pembayaran apa pun
              </p>
            </Reveal>
          )}

          {gift.address.value && (
            <div className="mt-7 border-t border-ink/15">
              <Row
                label={gift.address.label}
                value={gift.address.value}
                sub={`Kepada ${gift.address.recipient}`}
                wrap
              />
            </div>
          )}

          <p className="mt-6 text-center text-[0.76rem] leading-relaxed font-light text-ink-soft/75">
            Doa restu tetap yang paling kami harapkan.
          </p>
        </div>
      )}
    </PassportPage>
  );
}

/**
 * Papan jalur, meniru rambu gantung di atas pintu keluar bandara.
 *
 * Warnanya penuh saat dipilih dan tinggal garis tepi saat tidak — bukan
 * dibedakan lewat kepekatan, karena jalur yang "agak hijau" tidak mengatakan
 * apa pun tentang mana yang sedang berlaku.
 */
function Lane({
  tone,
  active,
  onSelect,
  title,
  sub,
}: {
  tone: "green" | "red";
  active: boolean;
  onSelect: () => void;
  title: string;
  sub: string;
}) {
  const color = tone === "green" ? "var(--color-lane)" : "var(--color-stamp-red)";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className="flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-[2px] border px-3 py-3 text-center transition-colors duration-300 active:scale-[0.98]"
      style={{
        borderColor: color,
        backgroundColor: active ? color : "transparent",
        color: active ? "var(--color-paper)" : color,
      }}
    >
      {/* Panah ke bawah — di bandara, rambu jalur selalu menunjuk pintunya. */}
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
        <path
          d="M12 4v14m0 0l-5-5m5 5l5-5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[0.72rem] leading-tight font-medium">{title}</span>
      <span className="field-label text-[0.45rem] opacity-80" style={{ color: "inherit" }}>
        {sub}
      </span>
    </button>
  );
}

/** Satu baris deklarasi, dengan tombol salin. */
function Row({
  label,
  value,
  sub,
  wrap = false,
}: {
  label: string;
  value: string;
  sub?: string;
  wrap?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Peramban lama, atau halaman yang tidak dianggap aman konteksnya.
      // Nomornya tetap terpampang dan tetap bisa disalin dengan tangan, jadi
      // tidak ada yang perlu dikabarkan — kabar galat di sini hanya membuat
      // tamu mengira nomornya yang bermasalah.
      return;
    }
    setCopied(true);
    // Debum stempel: menyalin nomor rekening di formulir bea cukai adalah
    // tindakan yang dicap, bukan yang berkedip.
    sfxStamp();
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-ink/20 py-3">
      <div className="min-w-0 flex-1">
        <p className="field-label text-ink-soft/80">{label}</p>
        <p
          className={`mrz-text mt-1 text-[0.92rem] text-ink ${
            wrap ? "leading-snug" : "tracking-[0.16em]"
          }`}
        >
          {value}
        </p>
        {sub && <p className="mt-1 text-[0.72rem] font-light text-ink-soft/85">{sub}</p>}
      </div>

      <button
        type="button"
        onClick={copy}
        aria-label={`Salin ${label}`}
        className="shrink-0 rounded-full border px-3.5 py-2 transition-colors duration-300"
        style={{
          borderColor: copied ? "var(--color-lane)" : "rgba(74,69,62,0.35)",
          color: copied ? "var(--color-lane)" : "var(--color-ink-soft)",
        }}
      >
        <span className="field-label" style={{ color: "inherit" }}>
          {copied ? "Tersalin" : "Salin"}
        </span>
      </button>
    </div>
  );
}

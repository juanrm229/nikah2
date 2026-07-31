import Image from "next/image";
import { wedding } from "@/config/wedding";
import { PassportPage, Heading } from "@/components/passport/page";
import { Stamp } from "@/components/passport/stamp";
import { Reveal } from "@/components/motion/reveal";
import { IkatField } from "@/components/tenun/ikat";
import { personMrz } from "@/lib/wedding-mrz";
import { withSoftBreaks } from "@/lib/text";

type Person = typeof wedding.couple.groom | typeof wedding.couple.bride;

/**
 * Halaman data diri — dua halaman paspor, satu untuk tiap mempelai.
 *
 * Ini menggantikan bagian "profil mempelai" yang biasa: alih-alih foto bulat
 * dengan nama di bawahnya, datanya dicetak sebagai kolom paspor lengkap
 * dengan foto hantu dan baris MRZ.
 */
export function Couple() {
  return (
    <PassportPage
      id="mempelai"
      label="Halaman Data Diri"
      page="Hal. 02 — 03"
      stampPosition="bottom-right"
      stamp={
        <Stamp
          top="DIPERIKSA & DISAHKAN"
          bottom="KELUARGA"
          center="03"
          rotate={11}
          size={104}
          color="var(--color-stamp-red)"
        />
      }
      uvSeed={5}
      uv={
        <p className="uv-glow absolute inset-x-6 bottom-[9%] text-center text-[0.8rem] tracking-[0.14em] text-[var(--color-uv-glow-2)]">
          {wedding.uv.motto}
        </p>
      }
    >
      <Heading label="Assalamualaikum Wr. Wb." title="Kami yang berbahagia" />

      <p className="mt-6 text-center text-[0.9rem] leading-relaxed font-light text-ink-soft">
        Dengan memohon rahmat dan ridha Allah SWT, kami bermaksud
        menyelenggarakan pernikahan putra-putri kami:
      </p>

      <div className="mt-10 space-y-8">
        <DataPage person={wedding.couple.groom} role="Mempelai Pria" sex="M" />
        <div className="flex items-center gap-4" aria-hidden>
          <div className="h-px flex-1 bg-ink/15" />
          <span className="display text-2xl text-gold-3">&amp;</span>
          <div className="h-px flex-1 bg-ink/15" />
        </div>
        <DataPage person={wedding.couple.bride} role="Mempelai Wanita" sex="F" />
      </div>
    </PassportPage>
  );
}

function DataPage({
  person,
  role,
  sex,
}: {
  person: Person;
  role: string;
  /** Dipakai pada field jenis kelamin di baris kedua MRZ. */
  sex: "M" | "F";
}) {
  return (
    <Reveal className="relative overflow-hidden border border-ink/15 bg-paper-2/60" y={20}>
      <div className="pointer-events-none absolute inset-0">
        <IkatField color="var(--color-ink)" opacity={0.045} scale={0.7} className="h-full w-full" />
      </div>

      <div className="relative flex gap-4 p-4">
        {/* Foto utama. Lebarnya ikut lebar layar: pada 320 px foto tetap 100 px
            berarti kolom data tinggal ~170 px, dan setiap nama di sebelahnya
            terpaksa patah tiga baris.

            Tingginya sengaja MENGIKUTI kolom data (`self-stretch`), bukan angka
            tetap. Begitu nama turun ke baris kedua di layar sempit, kolom kanan
            memanjang — dan pas foto 132 px di sebelahnya akan terlihat seperti
            perangko yang tertinggal di sudut. Fotonya `object-cover`, jadi
            kotak setinggi apa pun tetap terisi rapi. */}
        <div className="relative w-[clamp(92px,29vw,116px)] shrink-0 self-stretch overflow-hidden border border-ink/25 bg-ink/5">
          <Image
            src={person.photo}
            alt={`Foto ${person.fullName}`}
            fill
            sizes="116px"
            style={{ objectPosition: person.photoFocus }}
            className="object-cover"
          />
        </div>

        <dl className="min-w-0 flex-1 space-y-2.5">
          <Field label="Nama / Name" value={person.fullName} big />
          <Field label="Kedudukan / Role" value={role} />
          <Field label={`${person.order} / Child of`} value={person.father} />
          <Field label="Dan / And" value={person.mother} />
          {person.instagram && <Field label="Instagram" value={`@${person.instagram}`} />}
        </dl>
      </div>

      {/* Foto hantu — cetakan kedua yang lebih pucat, persis paspor asli.
          Yang satu ini SENGAJA tetap tak berwarna, dan bukan karena terlewat:
          ia bukan foto yang dipajang, melainkan cetakan pengaman di balik
          data — pada paspor sungguhan pun ia selalu satu nada. Difoto berwarna
          dengan `mix-blend-multiply`, ia akan menyemburkan warna ke kertas
          gading di belakang kolom nama. */}
      <div className="pointer-events-none absolute top-4 right-4 h-[92px] w-[70px] opacity-[0.13] mix-blend-multiply">
        <Image
          src={person.photo}
          alt=""
          aria-hidden
          fill
          sizes="70px"
          style={{ objectPosition: person.photoFocus }}
          className="object-cover grayscale"
        />
      </div>

      <div className="mrz-zone relative border-t border-ink/15 bg-ink/[0.04] px-4 py-1.5">
        {personMrz(person.fullName, sex).map((line, i) => (
          <p
            key={i}
            className="mrz mrz-fit leading-[1.8] whitespace-pre text-ink-soft/65"
          >
            {line}
          </p>
        ))}
      </div>
    </Reveal>
  );
}

function Field({
  label,
  value,
  big = false,
}: {
  label: string;
  value: string;
  big?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="field-label text-ink-soft/75">{withSoftBreaks(label)}</dt>
      {/* Dulu `truncate`. Di layar 320 px kolom ini hanya ~170 px, dan yang
          terbaca di halaman data diri adalah "Rahmad J…" dan "Bapak H. Arma…" —
          nama mempelai dan nama orang tuanya dipotong dengan elipsis. Nama orang
          adalah hal terakhir yang boleh dipangkas; biarkan turun ke baris kedua.
          Titik putus setelah garis miring diberikan lebih dulu lewat
          `withSoftBreaks`, dan `[overflow-wrap:anywhere]` menjaga nama sepanjang
          apa pun tetap di dalam kolomnya. */}
      <dd
        className={`break-words [overflow-wrap:anywhere] ${
          big
            ? "display text-[1.15rem] leading-snug text-ink"
            : "text-[0.8rem] leading-snug font-light text-ink-2"
        }`}
      >
        {withSoftBreaks(value)}
      </dd>
    </div>
  );
}

import Image from "next/image";
import { wedding } from "@/config/wedding";
import { PassportPage, Heading } from "@/components/passport/page";
import { Stamp } from "@/components/passport/stamp";
import { Reveal } from "@/components/motion/reveal";
import { IkatField } from "@/components/tenun/ikat";
import { personMrz } from "@/lib/wedding-mrz";

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
        {/* Foto utama */}
        <div className="relative h-[132px] w-[100px] shrink-0 overflow-hidden border border-ink/25 bg-ink/5">
          <Image
            src={person.photo}
            alt={`Foto ${person.fullName}`}
            fill
            sizes="100px"
            style={{ objectPosition: person.photoFocus }}
            className="object-cover grayscale contrast-[1.05]"
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

      {/* Foto hantu — cetakan kedua yang lebih pucat, persis paspor asli */}
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

      <div className="relative border-t border-ink/15 bg-ink/[0.04] px-4 py-1.5">
        {personMrz(person.fullName, sex).map((line, i) => (
          <p
            key={i}
            className="mrz text-[0.42rem] leading-[1.8] whitespace-pre text-ink-soft/65"
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
      <dt className="field-label text-ink-soft/75">{label}</dt>
      <dd
        className={
          big
            ? "display truncate text-[1.15rem] text-ink"
            : "truncate text-[0.8rem] font-light text-ink-2"
        }
      >
        {value}
      </dd>
    </div>
  );
}

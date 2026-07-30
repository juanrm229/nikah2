/**
 * MRZ — Machine Readable Zone, dua baris di kaki halaman data paspor.
 *
 * Ditulis mengikuti standar ICAO 9303 format TD3: dua baris, masing-masing
 * tepat 44 karakter, dengan digit pemeriksa yang benar-benar dihitung.
 *
 * Kenapa repot-repot? Karena MRZ palsu yang panjangnya asal akan terasa
 * janggal bagi siapa pun yang pernah memegang paspor, walau mereka tidak
 * bisa menunjuk apa yang salah. Detail yang benar tidak diperhatikan orang;
 * detail yang salah selalu.
 */

const LINE_LENGTH = 44;

/** Nilai karakter untuk perhitungan: digit apa adanya, A=10…Z=35, '<'=0. */
function charValue(c: string): number {
  if (c >= "0" && c <= "9") return c.charCodeAt(0) - 48;
  if (c >= "A" && c <= "Z") return c.charCodeAt(0) - 55;
  return 0; // '<' dan karakter lain
}

/**
 * Digit pemeriksa ICAO: tiap karakter dikalikan bobot berulang 7-3-1,
 * dijumlahkan, lalu diambil sisa bagi 10.
 */
export function mrzCheckDigit(input: string): string {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    sum += charValue(input[i]) * weights[i % 3];
  }
  return String(sum % 10);
}

/**
 * Buang tanda baca & aksen, jadikan huruf besar, spasi jadi '<'.
 *
 * `allowDigits` wajib untuk field seperti nomor dokumen yang memang berisi
 * angka. Tanpa itu nomor dokumen berbasis tanggal akan terhapus habis dan
 * baris kedua MRZ jadi rentetan '<' belaka.
 */
function sanitize(text: string, allowDigits = false): string {
  const keep = allowDigits ? /[^A-Z0-9\s]/g : /[^A-Z\s]/g;
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // buang tanda diakritik hasil NFD
    .toUpperCase()
    .replace(keep, "")
    .trim()
    .replace(/\s+/g, "<");
}

function pad(text: string): string {
  return text.slice(0, LINE_LENGTH).padEnd(LINE_LENGTH, "<");
}

/** Tanggal ISO menjadi YYMMDD seperti yang dipakai di MRZ. */
export function toMrzDate(iso: string): string {
  const d = new Date(iso);
  const yy = String(d.getUTCFullYear() % 100).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export type MrzInput = {
  /** Nama keluarga / nama utama pemegang. */
  surname: string;
  /** Nama depan & tengah. */
  givenNames: string;
  /** Nomor dokumen, maksimal 9 karakter. */
  docNumber: string;
  /** Kode negara 3 huruf. */
  nationality?: string;
  /** Tanggal "lahir" dokumen — di sini dipakai tanggal akad. */
  dateOfBirth: string;
  /** Masa berlaku. */
  dateOfExpiry: string;
  /** 'M', 'F', atau '<' bila tidak dinyatakan. */
  sex?: string;
  /** Nomor pribadi opsional, maksimal 14 karakter. */
  personalNumber?: string;
};

/** Menghasilkan dua baris MRZ, masing-masing tepat 44 karakter. */
export function buildMrz(input: MrzInput): [string, string] {
  const {
    surname,
    givenNames,
    docNumber,
    nationality = "IDN",
    dateOfBirth,
    dateOfExpiry,
    sex = "<",
    personalNumber = "",
  } = input;

  // Baris 1: jenis dokumen, negara penerbit, lalu nama.
  // Nama keluarga dan nama depan dipisah dua '<'.
  const name = `${sanitize(surname)}<<${sanitize(givenNames)}`;
  const line1 = pad(`P<${nationality}${name}`);

  // Baris 2: rangkaian field berukuran tetap, tiap kelompok punya pemeriksa.
  const doc = pad(sanitize(docNumber, true)).slice(0, 9);
  const docCheck = mrzCheckDigit(doc);
  const dobCheck = mrzCheckDigit(dateOfBirth);
  const expCheck = mrzCheckDigit(dateOfExpiry);
  const personal = pad(sanitize(personalNumber, true)).slice(0, 14);
  const personalCheck = mrzCheckDigit(personal);

  const body =
    `${doc}${docCheck}${nationality}${dateOfBirth}${dobCheck}` +
    `${sex}${dateOfExpiry}${expCheck}${personal}${personalCheck}`;

  // Pemeriksa gabungan menghitung ulang seluruh field bernomor di baris 2.
  const composite = mrzCheckDigit(
    `${doc}${docCheck}${dateOfBirth}${dobCheck}${dateOfExpiry}${expCheck}${personal}${personalCheck}`,
  );

  return [line1, pad(`${body}${composite}`)];
}

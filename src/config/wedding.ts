/**
 * Satu-satunya sumber kebenaran untuk seluruh isi undangan.
 * Semua yang ditandai TODO wajib diganti sebelum undangan disebar.
 */

export const wedding = {
  // ── Identitas ────────────────────────────────────────────────────────────
  couple: {
    // TODO: ganti dengan nama asli
    bride: {
      name: "Aminah",
      fullName: "Siti Aminah", // TODO
      nickname: "Aminah",
      order: "Putri pertama dari", // TODO: "Putri kedua dari", dst.
      father: "Bapak Fulan", // TODO
      mother: "Ibu Fulanah", // TODO
      instagram: "", // TODO, kosongkan kalau tidak ada
      photo: "/photos/foto-4.jpg",
      // Titik yang dipertahankan saat foto dipangkas jadi pas foto.
      // Turunkan angka kedua kalau wajah terpotong di atas.
      photoFocus: "50% 22%",
    },
    groom: {
      name: "Arsa",
      fullName: "Arsa Pratama", // TODO
      nickname: "Arsa",
      order: "Putra pertama dari", // TODO
      father: "Bapak Fulan", // TODO
      mother: "Ibu Fulanah", // TODO
      instagram: "", // TODO
      photo: "/photos/foto-2.jpg",
      photoFocus: "50% 14%",
    },
  },

  // Urutan nama di judul & sampul
  get title() {
    return `${this.couple.groom.name} & ${this.couple.bride.name}`;
  },

  // ── Acara ────────────────────────────────────────────────────────────────
  // WAJIB format ISO dengan offset waktu Indonesia. WIB=+07:00, WITA=+08:00, WIT=+09:00
  events: [
    {
      id: "akad",
      name: "Akad Nikah",
      // TODO: tanggal & jam asli
      start: "2026-12-20T08:00:00+07:00",
      end: "2026-12-20T10:00:00+07:00",
      venue: "Masjid Agung", // TODO
      address: "Jl. Contoh No. 1, Kota, Provinsi", // TODO
      mapsUrl: "https://maps.google.com/?q=-6.2088,106.8456", // TODO
      coords: { lat: -6.2088, lng: 106.8456 }, // TODO — dipakai menghitung jarak tamu
    },
    {
      id: "resepsi",
      name: "Resepsi",
      start: "2026-12-20T11:00:00+07:00",
      end: "2026-12-20T15:00:00+07:00",
      venue: "Gedung Serbaguna", // TODO
      address: "Jl. Contoh No. 1, Kota, Provinsi", // TODO
      mapsUrl: "https://maps.google.com/?q=-6.2088,106.8456", // TODO
      coords: { lat: -6.2088, lng: 106.8456 }, // TODO
    },
  ],

  // Rundown untuk papan split-flap. Waktu lokal 24 jam, "HH:MM".
  rundown: [
    { time: "07:30", label: "Tamu memasuki area", sub: "GATE OPEN" },
    { time: "08:00", label: "Akad nikah", sub: "CEREMONY" },
    { time: "10:00", label: "Sesi foto keluarga", sub: "PHOTO" },
    { time: "11:00", label: "Resepsi & santap siang", sub: "RECEPTION" },
    { time: "13:00", label: "Hiburan", sub: "LIVE MUSIC" },
    { time: "15:00", label: "Penutupan", sub: "CLOSING" },
  ],

  // ── Perjalanan cinta ─────────────────────────────────────────────────────
  // Ditampilkan sebagai rute penerbangan: tiap babak jadi satu persinggahan,
  // lengkap dengan kode tiga huruf ala bandara. Ganti kodenya dengan singkatan
  // yang berarti buat kalian — nama kota, nama tempat, apa saja.
  story: [
    {
      code: "TMU", // TODO
      date: "2019", // TODO
      title: "Pertama Bertemu",
      text: "Tanpa tahu bahwa hari itu adalah awal dari segalanya.",
    },
    {
      code: "DKT",
      date: "2021",
      title: "Mulai Dekat",
      text: "Obrolan yang makin panjang, dan pulang yang makin enggan.",
    },
    {
      code: "LMR",
      date: "2025",
      title: "Lamaran",
      text: "Dua keluarga bertemu, dan niat baik itu diucapkan.",
    },
    {
      code: "AKD",
      date: "2026",
      title: "Akad Nikah",
      text: "Perjalanan ini akhirnya sampai di tujuannya.",
    },
  ],

  // ── Nuansa ───────────────────────────────────────────────────────────────
  // Dari mana motif tenunnya. TODO: sesuaikan biar tidak salah klaim daerah.
  tenun: {
    origin: "Tenun Ikat", // TODO cth: "Tenun Ikat Sikka", "Tenun Sasak"
    note: "Motif pada undangan ini diambil dari kain yang kami kenakan.",
  },

  dressCode: {
    note: "Kami akan sangat senang bila Anda hadir dengan nuansa warna berikut",
    palette: ["#12100E", "#3A3733", "#8A8578", "#C9C1B2", "#F2EDE4"],
  },

  quran: {
    arabic:
      "وَمِنْ اٰيٰتِهٖٓ اَنْ خَلَقَ لَكُمْ مِّنْ اَنْفُسِكُمْ اَزْوَاجًا لِّتَسْكُنُوْٓا اِلَيْهَا وَجَعَلَ بَيْنَكُمْ مَّوَدَّةً وَّرَحْمَةً ۗاِنَّ فِيْ ذٰلِكَ لَاٰيٰتٍ لِّقَوْمٍ يَّتَفَكَّرُوْنَ",
    translation:
      "Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan hidup dari jenismu sendiri, supaya kamu merasa tenteram di sampingnya, dan dijadikan-Nya di antaramu rasa kasih dan sayang. Sesungguhnya pada yang demikian itu benar-benar terdapat tanda-tanda bagi kaum yang berpikir.",
    source: "QS. Ar-Rum: 21",
  },

  // ── Amplop digital ───────────────────────────────────────────────────────
  gift: {
    enabled: true,
    banks: [
      // TODO: isi rekening asli
      { bank: "BCA", number: "1234567890", holder: "Nama Pemilik Rekening" },
      { bank: "Mandiri", number: "0987654321", holder: "Nama Pemilik Rekening" },
    ],
    qris: "", // TODO: path gambar QRIS di /public, cth "/qris.png"
    address: {
      // Kirim kado fisik
      label: "Kirim hadiah",
      value: "Jl. Contoh No. 1, Kota, Provinsi, 12345", // TODO
      recipient: "Nama Penerima", // TODO
    },
  },

  // ── Galeri ───────────────────────────────────────────────────────────────
  // `focus` menentukan bagian foto yang dipertahankan saat dipangkas.
  // Foto seluruh badan biasanya perlu nilai kecil (mis. "50% 20%") agar
  // kepala tidak terpotong; foto setengah badan cukup "50% 50%".
  gallery: [
    { src: "/photos/foto-1.jpg", focus: "50% 25%" },
    { src: "/photos/foto-3.jpg", focus: "50% 30%" },
    { src: "/photos/foto-5.jpg", focus: "50% 30%" },
    { src: "/photos/foto-6.jpg", focus: "50% 30%" },
    { src: "/photos/foto-7.jpg", focus: "50% 30%" },
    { src: "/photos/foto-8.jpg", focus: "50% 30%" },
  ],
  cover: "/photos/foto-1.jpg",

  // ── Musik latar ──────────────────────────────────────────────────────────
  music: {
    enabled: true,
    src: "/music/backsound.mp3", // TODO: taruh file di public/music/
    title: "", // TODO
  },

  // ── Teknis ───────────────────────────────────────────────────────────────
  site: {
    // TODO: domain final, dipakai untuk QR check-in & metadata share
    url: "https://undangan.example.com",
    defaultGuest: "Bapak/Ibu/Saudara/i",
  },
} as const;

export type Wedding = typeof wedding;
export type WeddingEvent = (typeof wedding.events)[number];

/** Tanggal utama acara — dipakai countdown & mode hari-H. */
export const MAIN_DATE = wedding.events[0].start;

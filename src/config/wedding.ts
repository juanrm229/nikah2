/**
 * Satu-satunya sumber kebenaran untuk seluruh isi undangan.
 * Semua yang ditandai TODO wajib diganti sebelum undangan disebar.
 *
 * Data mempelai, tanggal, venue, koordinat, dan perjalanan cinta diambil dari
 * undangan mer.id/arsa-aminah (30 Juli 2026). Yang masih TODO di bawah adalah
 * hal yang TIDAK tercantum di sumber itu — jangan diisi dengan karangan.
 */

export const wedding = {
  // ── Identitas ────────────────────────────────────────────────────────────
  couple: {
    bride: {
      name: "Aminah",
      fullName: "Siti Aminah",
      nickname: "Aminah",
      // Sumber hanya menulis "Putri dari", tanpa urutan anak.
      order: "Putri dari",
      father: "Bapak Ardani",
      mother: "Ibu Rahmah",
      instagram: "stminaminah",
      photo: "/photos/foto-4.jpg",
      // Titik yang dipertahankan saat foto dipangkas jadi pas foto.
      // Turunkan angka kedua kalau wajah terpotong di atas.
      photoFocus: "50% 22%",
    },
    groom: {
      name: "Arsa",
      fullName: "Rahmad Januarsa",
      nickname: "Arsa",
      order: "Putra dari",
      father: "Bapak H. Armansyah",
      mother: "Ibu Hj. Salasiah",
      instagram: "rahmadjnrs",
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
  // Balikpapan masuk WITA, jadi seluruh acara di bawah memakai +08:00.
  events: [
    {
      id: "akad",
      name: "Akad Nikah",
      // Tanggalnya sudah benar (hari yang sama dengan resepsi), tapi JAM dan
      // VENUE-nya masih tebakan — tidak tercantum di undangan sumber.
      // TODO: ganti jam & tempat akad yang sebenarnya.
      // Catatan: MAIN_DATE di bawah memakai acara ini, jadi countdown ikut
      // memakai jam 08:00 sampai TODO ini diisi.
      start: "2026-11-15T08:00:00+08:00",
      end: "2026-11-15T10:00:00+08:00",
      venue: "Aula Kecamatan Balikpapan Selatan", // TODO: pastikan akad di tempat yang sama
      address:
        "Jl. Ruhui Rahayu 1 No. 1, Kelurahan Sepinggan, Kecamatan Balikpapan Selatan, Kota Balikpapan, Kalimantan Timur",
      mapsUrl: "https://www.google.com/maps?q=-1.2436480177945766,116.89795911312105",
      coords: { lat: -1.2436480177945766, lng: 116.89795911312105 },
    },
    {
      id: "resepsi",
      name: "Resepsi Pernikahan",
      start: "2026-11-15T10:00:00+08:00",
      end: "2026-11-15T15:00:00+08:00",
      venue: "Aula Kecamatan Balikpapan Selatan",
      address:
        "Jl. Ruhui Rahayu 1 No. 1, Kelurahan Sepinggan, Kecamatan Balikpapan Selatan, Kota Balikpapan, Kalimantan Timur",
      mapsUrl: "https://www.google.com/maps?q=-1.2436480177945766,116.89795911312105",
      coords: { lat: -1.2436480177945766, lng: 116.89795911312105 },
    },
  ],

  // Rundown untuk papan split-flap. Waktu lokal 24 jam, "HH:MM".
  // TODO: susunan acara di dalam rentang 10.00–15.00 ini belum dikonfirmasi;
  // hanya jam buka dan tutup resepsi yang berasal dari sumber.
  rundown: [
    { time: "09:30", label: "Tamu memasuki area", sub: "GATE OPEN" },
    { time: "10:00", label: "Resepsi dibuka", sub: "RECEPTION" },
    { time: "11:00", label: "Santap siang", sub: "LUNCH" },
    { time: "13:00", label: "Sesi foto bersama", sub: "PHOTO" },
    { time: "15:00", label: "Penutupan", sub: "CLOSING" },
  ],

  // ── Perjalanan cinta ─────────────────────────────────────────────────────
  // Ditampilkan sebagai rute penerbangan: tiap babak jadi satu persinggahan,
  // lengkap dengan kode tiga huruf ala bandara.
  // BPN memang kode bandara Sepinggan Balikpapan — persinggahan terakhirnya nyata.
  story: [
    {
      code: "RPL",
      date: "22 Maret 2026",
      title: "Berawal dari Reply Story",
      text: "Satu balasan story berubah jadi percakapan panjang, lalu berujung pertemuan.",
    },
    {
      code: "SRS",
      date: "10 Juli 2026",
      title: "Memutuskan Serius",
      text: "Dari perkenalan yang singkat dan pertemuan yang terbatas, kami memilih melangkah lebih serius.",
    },
    {
      code: "BPN",
      date: "15 November 2026",
      title: "Hari Bahagia",
      text: "Dengan doa keluarga dan restu orang-orang tercinta, perjalanan ini bermuara pada satu tujuan.",
    },
  ],

  // ── Nuansa ───────────────────────────────────────────────────────────────
  // Sengaja tanpa nama daerah: motifnya diturunkan dari kain yang dipakai
  // mempelai wanita di foto prewedding, dan asal kainnya belum dipastikan.
  // Jangan mengklaim daerah tertentu tanpa konfirmasi.
  tenun: {
    origin: "Tenun Ikat",
    note: "Motif pada undangan ini digambar ulang dari kain yang dikenakan mempelai wanita.",
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
  // Dimatikan sampai data rekening yang SEBENARNYA tersedia. Nomor contoh
  // sengaja tidak ditinggalkan di sini supaya tidak ada rekening karangan yang
  // ikut ter-commit dan tidak ada tamu yang salah transfer.
  // TODO: isi bank, nomor, dan nama pemilik rekening, lalu set enabled: true.
  gift: {
    enabled: false,
    banks: [] as { bank: string; number: string; holder: string }[],
    qris: "", // TODO: path gambar QRIS di /public, cth "/qris.png"
    address: {
      // Kirim kado fisik
      label: "Kirim hadiah",
      value: "", // TODO
      recipient: "", // TODO
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

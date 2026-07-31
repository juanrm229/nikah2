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

  // ── Tinta tersembunyi ────────────────────────────────────────────────────
  // Hanya terbaca di bawah "lampu UV" — tekan & tahan layar di halaman mana pun.
  //
  // Isinya sengaja BUKAN informasi yang dibutuhkan tamu. Tamu yang tidak pernah
  // menemukan lampunya tidak kehilangan apa pun; yang menemukannya mendapat
  // sesuatu yang tidak dibagikan ke semua orang. Begitu di sini ditaruh jam
  // acara atau alamat, easter egg-nya berubah jadi jebakan.
  uv: {
    seal: "Republik Cinta",
    motto: "Sakinah · Mawaddah · Warahmah",
    blessing: "Semoga Allah memberkahi keduanya, dan menghimpun mereka dalam kebaikan.",
  },

  // ── Penutup ──────────────────────────────────────────────────────────────
  // Kalimat penutup undangan. Bukan data dari sumber, murni redaksi — boleh
  // diganti sesuka hati tanpa memeriksa apa pun.
  closing: {
    note: "Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir untuk memberikan doa restu kepada kedua mempelai.",
    thanks: "Atas kehadiran dan doa restunya, kami mengucapkan terima kasih.",
    sign: "Kami yang berbahagia",
  },

  // ── Amplop digital ───────────────────────────────────────────────────────
  // Isinya MOCKUP, bukan rekening sebenarnya. Angkanya sengaja dibuat nol
  // semua supaya mustahil dikira nomor asli, tapi panjangnya dipertahankan
  // (BRI 15 digit, BCA 10 digit) agar tata letak dan pemenggalan teks bisa
  // diuji dengan bentuk yang realistis.
  //
  // ⚠ SEDANG MENYALA DENGAN DATA CONTOH — atas permintaan pemilik, supaya
  // rancangannya bisa dilihat selagi undangan BELUM disebar ke siapa pun.
  //
  // Yang menjaga keadaan ini tetap aman bukan saklarnya, melainkan bentuk
  // datanya: nomornya nol semua, nama pemiliknya berbunyi "CONTOH — BELUM
  // DIISI", dan gambar QRIS-nya bertuliskan CONTOH melintang di tengah serta
  // sengaja tidak bisa dipindai. Tidak ada satu pun dari ketiganya yang bisa
  // menerima uang, bahkan kalau ada yang mencoba.
  //
  // TODO — WAJIB, SEBELUM SATU LINK PUN DIBAGIKAN: ganti seluruh isi banks,
  // qris, dan address dengan data sah. Kalau nomor asli belum siap saat
  // undangan mau disebar, kembalikan `enabled: false` — memajang rekening
  // karangan ke tamu yang mungkin benar-benar mentransfer adalah satu-satunya
  // kesalahan di undangan ini yang tidak bisa diperbaiki dengan deploy ulang.
  gift: {
    enabled: true,
    // Kalimat di jalur hijau. Ia yang menentukan nada seluruh bagian ini:
    // jalur hijau adalah jawaban BAWAAN, dan tamu yang memilihnya tidak sedang
    // menolak apa pun — ia sedang memberi hal yang memang paling diminta.
    note: "Kehadiran dan doa restu Bapak/Ibu/Saudara/i sudah lebih dari cukup bagi kami.",
    banks: [
      { bank: "BRI", number: "000000000000000", holder: "CONTOH — BELUM DIISI" },
      { bank: "BCA", number: "0000000000", holder: "CONTOH — BELUM DIISI" },
    ] as { bank: string; number: string; holder: string }[],
    // Placeholder yang sengaja TIDAK bisa dipindai, bertuliskan CONTOH
    // melintang di tengah. TODO: ganti dengan gambar QRIS yang sah.
    qris: "/qris-contoh.svg",
    address: {
      // Kirim kado fisik
      label: "Kirim hadiah",
      value: "CONTOH — BELUM DIISI", // TODO
      recipient: "CONTOH — BELUM DIISI", // TODO
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
  //
  // Berkas & judulnya TIDAK ditulis di sini. Panitia mengunggahnya lewat
  // /admin, dan yang aktif disimpan di tabel `tracks` — jadi mengganti lagu
  // tidak perlu commit + deploy ulang, dan berkas audio beberapa MB tidak ikut
  // membengkakkan repo.
  //
  // `enabled` di sini tinggal saklar induk: dimatikan berarti pemutarnya tidak
  // pernah dirender walaupun ada lagu aktif di database. Untuk mematikan musik
  // sesaat sebelum acara, pakai tombol "Matikan musik" di /admin — itu tidak
  // butuh deploy.
  music: {
    enabled: true,
  },

  // ── Teknis ───────────────────────────────────────────────────────────────
  site: {
    // Domain produksi Vercel, sudah live dan terverifikasi. Dipakai membentuk
    // isi QR check-in, jadi harus domain yang benar-benar dibuka tamu.
    // Ganti kalau nanti dipasang domain kustom.
    url: "https://nikah2.vercel.app",
    defaultGuest: "Bapak/Ibu/Saudara/i",
  },
} as const;

export type Wedding = typeof wedding;
export type WeddingEvent = (typeof wedding.events)[number];

/** Tanggal utama acara — dipakai countdown & mode hari-H. */
export const MAIN_DATE = wedding.events[0].start;

/**
 * Kartu boarding pass sebagai gambar, digambar sendiri di atas canvas.
 *
 * BUKAN tangkapan layar DOM. Menjepret elemen halaman butuh pustaka pihak
 * ketiga beberapa ratus kilobyte, dan hasilnya selalu berupa apa yang kebetulan
 * terlihat di layar tamu — terpotong, seukuran ponselnya, dengan bayangan yang
 * ikut terbawa separuh. Yang dibuat di sini adalah benda yang berbeda:
 * satu kartu 1080×1350 yang memang dirancang untuk dibagikan, tajam di layar
 * mana pun, dan sama persis bagi semua tamu.
 *
 * QR CHECK-IN SENGAJA TIDAK IKUT. Kartu ini dibuat untuk diunggah ke media
 * sosial, dan QR di boarding pass tamu berisi `checkin_code` — kode yang
 * sengaja dibuat acak dan terpisah dari slug supaya check-in orang lain tidak
 * bisa ditebak. Satu tamu yang mengunggah kartunya lengkap dengan QR akan
 * menyerahkan kode itu kepada siapa pun yang bisa memperbesar gambarnya. QR
 * tinggal di halaman undangan, tempatnya memang di sana.
 */

const W = 1080;
const H = 1350;

/** Warna diambil dari token yang sama dengan undangannya. */
const C = {
  cover: "#0e1526",
  cover2: "#16203a",
  paper: "#f2ede4",
  paperDim: "#a89f8e",
  gold: "#b08d4f",
  gold2: "#d8b878",
  gold3: "#8a6c39",
  ink: "#12100e",
};

export type BoardingCardData = {
  name: string;
  serial: string;
  flight: string;
  tableNo: string;
  seats: number;
  dateLong: string;
  timeText: string;
  venue: string;
  couple: string;
  mrz: readonly string[];
  siteUrl: string;
  /**
   * Lambang tenun, sudah berupa markup SVG. Diambil dari SVG yang BENAR-BENAR
   * sedang dirender di halaman, bukan digambar ulang dengan jalur canvas —
   * motif yang disalin dengan tangan akan pelan-pelan menyimpang dari aslinya
   * setiap kali salah satunya disunting.
   */
  emblemSvg: string | null;
  fonts: { display: string; mono: string; body: string };
};

/** Muat markup SVG jadi gambar yang bisa digambar ke canvas. */
function svgImage(markup: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    // `encodeURIComponent`, bukan base64: markup-nya mengandung karakter di
    // luar Latin-1 dan `btoa` melempar galat pada karakter pertama yang
    // ditemuinya.
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  });
}

/** Setel font sekaligus jarak hurufnya, kalau peramban mendukung. */
function setFont(
  ctx: CanvasRenderingContext2D,
  font: string,
  spacing = "0px",
) {
  ctx.font = font;
  // `letterSpacing` baru ada sejak Chrome 99 dan Safari 16.4. Peramban yang
  // belum punya akan mengabaikan penugasan ini diam-diam, dan kartunya tetap
  // terbentuk — hanya labelnya lebih rapat.
  if ("letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = spacing;
  }
}

/**
 * Susutkan ukuran huruf sampai teksnya muat.
 *
 * Nama tamu adalah satu-satunya isi kartu ini yang panjangnya tidak diketahui
 * di muka — "Andi" dan "Bapak Muhammad Syarifuddin Hidayatullah sekeluarga"
 * sama-sama sah. Memotongnya dengan elipsis bukan pilihan: nama tamu adalah hal
 * terakhir yang boleh dipangkas dari undangan.
 */
function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  maxWidth: number,
  start: number,
  min: number,
) {
  let size = start;
  while (size > min) {
    ctx.font = `300 ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

/** Pecah teks jadi beberapa baris yang masing-masing muat. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function paintBoardingCard(d: BoardingCardData): Promise<Blob | null> {
  // Tunggu fontnya benar-benar siap. Canvas tidak menunggu apa pun: menggambar
  // sebelum font display selesai diunduh menghasilkan kartu bernama tamu dalam
  // huruf bawaan sistem — dan tidak ada cara memperbaikinya setelah gambarnya
  // jadi.
  if (document.fonts?.ready) await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const { display, mono } = d.fonts;

  // ── Latar: kulit sampul paspor ───────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bg.addColorStop(0, C.cover2);
  bg.addColorStop(0.55, C.cover);
  bg.addColorStop(1, "#080d18");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Satu sumber cahaya di kiri atas, sama seperti sampulnya.
  const glow = ctx.createRadialGradient(W * 0.26, H * 0.14, 0, W * 0.26, H * 0.14, W * 0.9);
  glow.addColorStop(0, "rgba(176,141,79,0.18)");
  glow.addColorStop(0.45, "rgba(176,141,79,0.05)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ── Bingkai ganda ala paspor ─────────────────────────────────────────────
  ctx.strokeStyle = "rgba(176,141,79,0.55)";
  ctx.lineWidth = 3;
  ctx.strokeRect(54, 54, W - 108, H - 108);
  ctx.strokeStyle = "rgba(176,141,79,0.22)";
  ctx.lineWidth = 2;
  ctx.strokeRect(72, 72, W - 144, H - 144);

  const L = 128; // tepi kiri isi
  const R = W - 128; // tepi kanan isi
  let y = 190;

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  // ── Kepala ───────────────────────────────────────────────────────────────
  setFont(ctx, `500 22px ${mono}`, "7px");
  ctx.fillStyle = "rgba(176,141,79,0.85)";
  ctx.fillText("KARTU NAIK PESAWAT", L, y);

  ctx.textAlign = "right";
  ctx.fillStyle = C.gold2;
  setFont(ctx, `600 30px ${mono}`, "5px");
  ctx.fillText(d.flight, R, y);
  ctx.textAlign = "left";

  y += 26;
  ctx.strokeStyle = "rgba(176,141,79,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(L, y);
  ctx.lineTo(R, y);
  ctx.stroke();

  // ── Penumpang ────────────────────────────────────────────────────────────
  y += 62;
  setFont(ctx, `500 20px ${mono}`, "6px");
  ctx.fillStyle = C.paperDim;
  ctx.fillText("PENUMPANG / PASSENGER", L, y);

  y += 74;
  setFont(ctx, `300 78px ${display}`, "0px");
  const size = fitFontSize(ctx, d.name, display, R - L, 78, 40);
  ctx.font = `300 ${size}px ${display}`;
  ctx.fillStyle = C.paper;
  for (const line of wrap(ctx, d.name, R - L)) {
    ctx.fillText(line, L, y);
    y += size * 1.12;
  }

  y += 6;
  setFont(ctx, `500 24px ${mono}`, "5px");
  ctx.fillStyle = "rgba(216,184,120,0.8)";
  ctx.fillText(`NO. PASPOR · ${d.serial}`, L, y);

  // ── Kolom data ───────────────────────────────────────────────────────────
  y += 78;
  const cells: Array<[string, string]> = [
    ["MEJA", d.tableNo],
    ["KURSI", String(d.seats)],
    ["GERBANG", "BPN"],
  ];
  const colW = (R - L) / 3;

  ctx.strokeStyle = "rgba(242,237,228,0.16)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(L, y - 44);
  ctx.lineTo(R, y - 44);
  ctx.stroke();

  cells.forEach(([label, value], i) => {
    const x = L + colW * i;
    setFont(ctx, `500 19px ${mono}`, "5px");
    ctx.fillStyle = C.paperDim;
    ctx.fillText(label, x, y);
    setFont(ctx, `400 42px ${mono}`, "2px");
    ctx.fillStyle = C.paper;
    ctx.fillText(value, x, y + 52);
  });

  y += 130;
  const wide: Array<[string, string]> = [
    ["TANGGAL", d.dateLong],
    ["PUKUL", d.timeText],
  ];
  const wideW = (R - L) / 2;
  wide.forEach(([label, value], i) => {
    const x = L + wideW * i;
    setFont(ctx, `500 19px ${mono}`, "5px");
    ctx.fillStyle = C.paperDim;
    ctx.fillText(label, x, y);
    setFont(ctx, `400 30px ${mono}`, "1px");
    ctx.fillStyle = C.paper;
    ctx.fillText(value, x, y + 44);
  });

  // ── Tujuan ───────────────────────────────────────────────────────────────
  y += 118;
  setFont(ctx, `500 19px ${mono}`, "5px");
  ctx.fillStyle = C.paperDim;
  ctx.fillText("TUJUAN", L, y);

  y += 46;
  setFont(ctx, `300 40px ${display}`, "0px");
  ctx.fillStyle = C.paper;
  const venueSize = fitFontSize(ctx, d.venue, display, R - L, 40, 26);
  ctx.font = `300 ${venueSize}px ${display}`;
  for (const line of wrap(ctx, d.venue, R - L)) {
    ctx.fillText(line, L, y);
    y += venueSize * 1.2;
  }

  // ── Lambang tenun ────────────────────────────────────────────────────────
  if (d.emblemSvg) {
    const img = await svgImage(d.emblemSvg);
    if (img) {
      const s = 148;
      ctx.globalAlpha = 0.85;
      ctx.drawImage(img, (W - s) / 2, H - 430, s, s);
      ctx.globalAlpha = 1;
    }
  }

  // ── Nama mempelai ────────────────────────────────────────────────────────
  setFont(ctx, `300 54px ${display}`, "2px");
  ctx.textAlign = "center";
  ctx.fillStyle = C.gold2;
  ctx.fillText(d.couple, W / 2, H - 246);

  setFont(ctx, `500 20px ${mono}`, "6px");
  ctx.fillStyle = "rgba(242,237,228,0.55)";
  ctx.fillText(d.siteUrl.replace(/^https?:\/\//, ""), W / 2, H - 198);
  ctx.textAlign = "left";

  // ── Zona MRZ ─────────────────────────────────────────────────────────────
  const mrzTop = H - 160;
  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.fillRect(72, mrzTop, W - 144, 88);
  ctx.strokeStyle = "rgba(176,141,79,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(72, mrzTop);
  ctx.lineTo(W - 72, mrzTop);
  ctx.stroke();

  // Baris MRZ TD3 selalu 44 karakter dan tidak boleh turun baris. Ukurannya
  // dicari dari lebar yang tersedia, bukan ditulis sebagai angka tetap — sama
  // seperti `mrz-fit` di CSS.
  let mrzSize = 26;
  ctx.fillStyle = "rgba(176,141,79,0.62)";
  while (mrzSize > 10) {
    setFont(ctx, `400 ${mrzSize}px ${mono}`, "2px");
    if (ctx.measureText(d.mrz[0] ?? "").width <= W - 196) break;
    mrzSize -= 1;
  }
  d.mrz.forEach((line, i) => {
    ctx.fillText(line, 98, mrzTop + 36 + i * (mrzSize + 12));
  });

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

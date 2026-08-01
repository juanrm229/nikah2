import { C, fitFontSize, setFont, svgImage } from "@/lib/card-paint";

/**
 * Halaman visa tamu sebagai gambar.
 *
 * Capnya DIGAMBAR ULANG di canvas, tidak disalin dari SVG yang sedang dirender
 * di halaman — dan itu kebalikan dari cara lambang tenun diperlakukan di
 * boarding pass. Alasannya: lambang cuma satu bentuk tetap, sedangkan cap punya
 * teks melengkung yang panjangnya berbeda-beda, warna yang datang dari custom
 * property, dan animasi yang menaruh keadaan akhirnya di CSS — bukan di
 * atribut. SVG cap yang dilepas dari halaman kehilangan ketiganya sekaligus,
 * dan yang tergambar adalah cincin kosong berwarna hitam.
 *
 * Slot yang masih kosong ikut digambar. Kartu yang cuma memuat cap yang sudah
 * didapat akan terbaca sebagai piala; yang memuat kolom kosongnya juga terbaca
 * sebagai dokumen yang belum selesai — dan dokumen yang belum selesai itulah
 * yang membuat orang lain bertanya bagaimana cara mengisinya.
 */

const W = 1080;
const H = 1350;

export type VisaCardStamp = {
  top: string;
  bottom: string;
  center: string;
  hint: string;
  earned: boolean;
  rotate: number;
};

export type VisaCardData = {
  name: string;
  serial: string;
  couple: string;
  siteUrl: string;
  stamps: readonly VisaCardStamp[];
  emblemSvg: string | null;
  fonts: { display: string; mono: string; body: string };
};

/**
 * Teks yang melengkung mengikuti busur.
 *
 * Tiap huruf diputar sendiri-sendiri sejauh lebarnya sendiri dibagi jari-jari,
 * bukan dibagi rata sejumlah huruf. Pembagian rata terlihat benar sampai ada
 * kata berisi "I" dan "M" berdampingan — dan setelah itu tidak bisa tidak
 * terlihat.
 */
function arcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  radius: number,
  size: number,
  family: string,
  /** Busur bawah, bukan atas. */
  bottom: boolean,
) {
  setFont(ctx, `600 ${size}px ${family}`, "0px");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const spread = widths.reduce((a, b) => a + b, 0) / radius;

  // Busur bawah TIDAK perlu tiap hurufnya diputar 180°, meski terdengar masuk
  // akal. Setelah `rotate(angle)` lalu `translate(0, radius)`, arah "atas"
  // huruf sudah menunjuk ke PUSAT lingkaran — persis orientasi yang dipakai cap
  // sungguhan pada busur bawahnya. Ditambah putaran 180°, hurufnya justru
  // berdiri di atas kepala.
  // Arah jalannya BERLAWANAN di busur bawah. `rotate(θ)` memindahkan titik
  // (0, +r) ke kiri untuk θ positif — kebalikan dari titik (0, −r) di atas —
  // jadi sudut yang membesar berarti berjalan ke kiri, dan kalimatnya keluar
  // terbalik: NAASKIREMEP.
  const dir = bottom ? -1 : 1;

  let angle = (-dir * spread) / 2;
  for (let i = 0; i < chars.length; i++) {
    const step = widths[i] / radius;
    angle += (dir * step) / 2;
    ctx.save();
    ctx.rotate(angle);
    ctx.translate(0, bottom ? radius : -radius);
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
    angle += (dir * step) / 2;
  }
}

/** Satu cap imigrasi, digambar penuh. */
function drawStamp(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  s: VisaCardStamp,
  mono: string,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((s.rotate * Math.PI) / 180);

  // Tinta cap tidak pernah pekat betul. 0,82 itu selisih antara "dicap" dan
  // "dicetak" — dan cap yang terbaca sebagai cetakan berhenti jadi bukti bahwa
  // ada yang membubuhkannya.
  ctx.globalAlpha = 0.82;
  ctx.strokeStyle = C.stamp;
  ctx.fillStyle = C.stamp;

  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r - 14, 0, Math.PI * 2);
  ctx.stroke();

  arcText(ctx, s.top, r - 38, 26, mono, false);
  arcText(ctx, s.bottom, r - 36, 24, mono, true);

  setFont(ctx, `700 44px ${mono}`, "4px");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(s.center, 0, -2);

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.42, 30);
  ctx.lineTo(r * 0.42, 30);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Bekas cap yang belum ada: lingkaran putus-putus dengan kodenya saja. */
function drawBlank(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  s: VisaCardStamp,
  mono: string,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = "rgba(107,98,85,0.42)";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 12]);
  ctx.beginPath();
  ctx.arc(0, 0, r - 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  setFont(ctx, `500 30px ${mono}`, "6px");
  ctx.fillStyle = "rgba(107,98,85,0.5)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(s.center, 0, 0);
  ctx.restore();
}

export async function paintVisaCard(d: VisaCardData): Promise<Blob | null> {
  // Tanpa ini kartunya jadi dengan huruf bawaan sistem, dan tidak ada cara
  // memperbaikinya setelah gambarnya terbentuk.
  if (document.fonts?.ready) await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const { display, mono } = d.fonts;

  // ── Kertas ───────────────────────────────────────────────────────────────
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);

  // Satu sumber cahaya, sama seperti seluruh undangannya: kiri atas.
  const glow = ctx.createRadialGradient(W * 0.28, H * 0.16, 0, W * 0.28, H * 0.16, W);
  glow.addColorStop(0, "rgba(255,255,255,0.6)");
  glow.addColorStop(0.6, "rgba(232,225,212,0.25)");
  glow.addColorStop(1, "rgba(180,170,152,0.35)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(18,16,14,0.28)";
  ctx.lineWidth = 3;
  ctx.strokeRect(54, 54, W - 108, H - 108);
  ctx.strokeStyle = "rgba(18,16,14,0.12)";
  ctx.lineWidth = 2;
  ctx.strokeRect(72, 72, W - 144, H - 144);

  const L = 128;
  const R = W - 128;

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  // ── Kepala ───────────────────────────────────────────────────────────────
  let y = 186;
  setFont(ctx, `500 22px ${mono}`, "7px");
  ctx.fillStyle = C.gold3;
  ctx.fillText("HALAMAN VISA", L, y);

  ctx.textAlign = "right";
  ctx.fillStyle = C.inkSoft;
  setFont(ctx, `500 22px ${mono}`, "3px");
  ctx.fillText(`NO. DOKUMEN ${d.serial}`, R, y);
  ctx.textAlign = "left";

  y += 24;
  ctx.strokeStyle = "rgba(18,16,14,0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(L, y);
  ctx.lineTo(R, y);
  ctx.stroke();

  // ── Pemegang ─────────────────────────────────────────────────────────────
  y += 58;
  setFont(ctx, `500 20px ${mono}`, "6px");
  ctx.fillStyle = C.inkSoft;
  ctx.fillText("PEMEGANG / BEARER", L, y);

  y += 72;
  const nameSize = fitFontSize(ctx, d.name, display, R - L, 76, 40);
  ctx.font = `300 ${nameSize}px ${display}`;
  ctx.fillStyle = C.ink;
  ctx.fillText(d.name, L, y);

  // ── Empat kolom cap ──────────────────────────────────────────────────────
  const r = 132;
  const colX = [W * 0.3, W * 0.7];
  // 350 px antar baris, bukan 300. Keterangan slot kosong digantung 38 px di
  // bawah lingkarannya, dan pada jarak 300 px kalimat "TITIPKAN SATU UCAPAN"
  // jatuh tepat di atas lingkaran baris kedua.
  const rowY = [y + 210, y + 560];

  d.stamps.forEach((s, i) => {
    const cx = colX[i % 2];
    const cy = rowY[Math.floor(i / 2)];
    if (s.earned) {
      drawStamp(ctx, cx, cy, r, s, mono);
    } else {
      drawBlank(ctx, cx, cy, r, s, mono);
      setFont(ctx, `400 24px ${mono}`, "1px");
      ctx.fillStyle = "rgba(107,98,85,0.75)";
      ctx.textAlign = "center";
      ctx.fillText(s.hint.toUpperCase(), cx, cy + r + 38);
      ctx.textAlign = "left";
    }
  });

  // ── Kaki ─────────────────────────────────────────────────────────────────
  const earned = d.stamps.filter((s) => s.earned).length;
  const footTop = H - 244;

  ctx.strokeStyle = "rgba(18,16,14,0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(L, footTop);
  ctx.lineTo(R, footTop);
  ctx.stroke();

  setFont(ctx, `500 24px ${mono}`, "5px");
  ctx.fillStyle = C.ink2;
  ctx.fillText(`${earned} DARI ${d.stamps.length} CAP`, L, footTop + 46);

  ctx.textAlign = "right";
  ctx.fillStyle = earned === d.stamps.length ? C.gold3 : C.inkSoft;
  ctx.fillText(earned === d.stamps.length ? "LENGKAP" : "BERLAKU", R, footTop + 46);
  ctx.textAlign = "left";

  if (d.emblemSvg) {
    const img = await svgImage(d.emblemSvg);
    if (img) {
      const s = 76;
      ctx.globalAlpha = 0.7;
      ctx.drawImage(img, (W - s) / 2, footTop + 68, s, s);
      ctx.globalAlpha = 1;
    }
  }

  setFont(ctx, `300 44px ${display}`, "2px");
  ctx.textAlign = "center";
  ctx.fillStyle = C.gold3;
  ctx.fillText(d.couple, W / 2, H - 84);

  setFont(ctx, `500 20px ${mono}`, "6px");
  ctx.fillStyle = "rgba(107,98,85,0.7)";
  ctx.fillText(d.siteUrl.replace(/^https?:\/\//, ""), W / 2, H - 48);
  ctx.textAlign = "left";

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

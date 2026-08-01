/**
 * Perkakas bersama untuk kartu yang digambar sendiri di atas canvas.
 *
 * Dipakai boarding pass dan halaman visa. Keduanya menggambar benda yang sangat
 * berbeda, tapi keduanya menghadapi persoalan yang sama: font yang namanya
 * di-hash saat build, nama tamu yang panjangnya tidak diketahui di muka, dan
 * markup SVG yang harus jadi piksel.
 */

/** Warna diambil dari token yang sama dengan undangannya. */
export const C = {
  cover: "#0e1526",
  cover2: "#16203a",
  paper: "#f2ede4",
  paper2: "#e8e1d4",
  paperDim: "#a89f8e",
  gold: "#b08d4f",
  gold2: "#d8b878",
  gold3: "#8a6c39",
  ink: "#12100e",
  ink2: "#2c2822",
  inkSoft: "#6b6255",
  stamp: "#5a6b86",
};

/** Muat markup SVG jadi gambar yang bisa digambar ke canvas. */
export function svgImage(markup: string): Promise<HTMLImageElement | null> {
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
export function setFont(
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
export function fitFontSize(
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
export function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
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

import "server-only";
import QRCode from "qrcode";
import { wedding } from "@/config/wedding";

/**
 * QR check-in, dibuat DI SERVER.
 *
 * Sengaja tidak dibuat di peramban: `checkin_code` tidak boleh pernah menjadi
 * data JavaScript di sisi klien. Yang dikirim ke peramban hanya hasil akhirnya
 * berupa string SVG — kodenya memang terbaca oleh kamera yang memotret QR itu
 * (itu justru gunanya), tapi tidak ada state, props, atau payload RSC yang
 * bisa dikorek untuk memanen kode tamu lain.
 */

/** Alamat yang dituju petugas saat memindai QR tamu. */
export function checkinUrl(checkinCode: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || wedding.site.url).replace(/\/+$/, "");
  return `${base}/scan?c=${encodeURIComponent(checkinCode)}`;
}

/** Render QR jadi markup SVG. Aman disisipkan: isinya kita sendiri yang bentuk. */
export async function checkinQrSvg(checkinCode: string): Promise<string> {
  return QRCode.toString(checkinUrl(checkinCode), {
    type: "svg",
    // Margin kecil saja — kartunya sudah punya padding sendiri.
    margin: 1,
    // Level M menahan sedikit lecet/pantulan layar tanpa membuat modul terlalu
    // rapat untuk kamera ponsel murah.
    errorCorrectionLevel: "M",
    color: { dark: "#12100e", light: "#0000" },
  });
}

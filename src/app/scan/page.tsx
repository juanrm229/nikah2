import { Gate } from "@/components/scan/gate";
import { Scanner } from "@/components/scan/scanner";
import { adminPasswordSet, isStaff } from "@/lib/scan-session";

/**
 * Halaman petugas penerima tamu.
 *
 * Dibaca dari cookie sesi, jadi wajib dinamis — tidak boleh ada versi cache
 * yang menampilkan pemindai kepada orang yang belum masuk.
 *
 * Gerbang di sini hanya soal tampilan. Penjaga sebenarnya ada di dalam
 * `checkIn()`, yang memeriksa sesinya sendiri setiap kali dipanggil.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Check-in Tamu",
  robots: { index: false, follow: false },
};

export default async function ScanPage({ searchParams }: PageProps<"/scan">) {
  const staff = await isStaff();
  if (!staff) return <Gate passwordSet={adminPasswordSet} />;

  // QR mengarah ke /scan?c=KODE. Kodenya hanya diisikan ke kolom, tidak
  // langsung dieksekusi — petugas yang menekan Check-in.
  const { c } = await searchParams;
  const initial = typeof c === "string" ? c : "";

  return <Scanner initialCode={initial} />;
}

import { Gate } from "@/components/scan/gate";
import { LiveScreen } from "@/components/live/screen";
import { liveFeed } from "@/lib/actions/live";
import { adminPasswordSet, isStaff } from "@/lib/scan-session";

/**
 * Layar venue.
 *
 * Dijaga sandi yang sama dengan /scan & /admin. Isinya nama tamu dan siapa saja
 * yang sudah datang — itu daftar tamu, bukan halaman publik, dan tautan yang
 * bocor tidak boleh membukanya. Petugas cukup masuk sekali di perangkat yang
 * dipasang ke TV; sesinya bertahan 12 jam, lebih lama dari resepsi.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Layar Venue",
  robots: { index: false, follow: false },
};

export default async function LivePage() {
  if (!(await isStaff())) {
    return (
      <Gate
        passwordSet={adminPasswordSet}
        title="Layar Venue"
        lead="Halaman ini untuk ditampilkan di layar besar selama resepsi."
      />
    );
  }

  return <LiveScreen initial={await liveFeed()} />;
}

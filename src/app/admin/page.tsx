import { AdminConsole } from "@/components/admin/console";
import { Gate } from "@/components/scan/gate";
import { listGuests, listSongs, pendingPhotos } from "@/lib/actions/admin";
import { listTracks } from "@/lib/actions/music";
import { adminPasswordSet, isStaff } from "@/lib/scan-session";

/**
 * Ruang panitia: moderasi foto, request lagu, daftar tamu.
 *
 * Sesi & gerbangnya sama persis dengan /scan — satu ADMIN_PASSWORD, satu
 * cookie. Petugas yang sudah masuk di meja penerima tidak perlu masuk lagi
 * di sini, dan mengganti passwordnya mematikan kedua halaman sekaligus.
 *
 * Gerbang ini cuma soal tampilan; penjaga sebenarnya ada di dalam tiap action
 * `lib/actions/admin.ts`.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ruang Panitia",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (!(await isStaff())) {
    return (
      <Gate
        passwordSet={adminPasswordSet}
        title="Ruang Panitia"
        lead="Halaman ini untuk memoderasi foto, melihat request lagu, dan mengelola daftar tamu."
      />
    );
  }

  const [photos, songs, guests, tracks] = await Promise.all([
    pendingPhotos(),
    listSongs(),
    listGuests(),
    listTracks(),
  ]);
  return (
    <AdminConsole
      initialPhotos={photos}
      initialSongs={songs}
      initialGuests={guests}
      initialTracks={tracks}
    />
  );
}

import { Invitation } from "@/components/invitation";
import { activeTrack } from "@/lib/music";

/**
 * Undangan umum, tanpa nama tamu. Versi personal ada di /to/[slug].
 *
 * `force-dynamic` karena lagu latar dibaca dari database saat render: panitia
 * bisa mengganti lagu satu jam sebelum acara lewat /admin, dan halaman yang
 * dibekukan saat build tidak akan pernah tahu.
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  return <Invitation track={await activeTrack()} />;
}

"use client";

import { useActionState } from "react";
import { login, type LoginResult } from "@/lib/actions/checkin";

const INITIAL: LoginResult = { status: "idle" };

/**
 * Gerbang kata sandi petugas.
 *
 * Tidak perlu mengalihkan halaman setelah berhasil: `login` menulis cookie, dan
 * Next.js otomatis merender ulang rute saat ini ketika sebuah action mengubah
 * cookie — jadi /scan langsung berganti sendiri jadi pemindai.
 */
export function Gate({
  passwordSet,
  title = "Meja Penerima",
  lead = "Halaman ini untuk memindai QR tamu di pintu masuk.",
}: {
  passwordSet: boolean;
  title?: string;
  lead?: string;
}) {
  const [result, formAction, pending] = useActionState(login, INITIAL);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6">
      <p className="field-label">Khusus Petugas</p>
      <h1 className="display mt-3 text-[1.7rem] text-paper">{title}</h1>
      <p className="mt-2 text-[0.82rem] font-light text-paper-dim">{lead}</p>

      {!passwordSet ? (
        <p className="mt-8 border border-[#d98b8b]/40 bg-[#d98b8b]/10 p-4 text-[0.8rem] leading-relaxed font-light text-[#e8a8a8]">
          <code>ADMIN_PASSWORD</code> belum diisi di <code>.env.local</code>, jadi
          tidak ada kata sandi yang bisa cocok. Isi dulu, lalu jalankan ulang dev
          server.
        </p>
      ) : (
        <form action={formAction} className="mt-8">
          <label htmlFor="scan-pwd" className="field-label">
            Kata sandi
          </label>
          <input
            id="scan-pwd"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            autoFocus
            className="mt-2 w-full border-b border-paper/25 bg-transparent pb-2 font-mono text-paper outline-none focus:border-gold"
          />

          <button
            type="submit"
            disabled={pending}
            className="mt-6 w-full rounded-full border border-paper/30 py-3 transition-colors hover:bg-paper hover:text-ink disabled:opacity-50"
          >
            <span className="field-label text-inherit">{pending ? "Memeriksa…" : "Masuk"}</span>
          </button>

          <p aria-live="polite" className="mt-3 min-h-[1.25rem] text-[0.78rem] font-light">
            {result.status === "error" && (
              <span className="text-[#d98b8b]">{result.message}</span>
            )}
          </p>
        </form>
      )}
    </main>
  );
}

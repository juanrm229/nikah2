/**
 * Suara undangan.
 *
 * Tidak ada satu pun berkas audio di sini. Setiap bunyi DISINTESIS saat itu
 * juga lewat Web Audio — derit sampul, gemerisik kertas, debum stempel, klak
 * papan split-flap, dengung lampu UV. Alasannya sama persis dengan alasan
 * motif tenun digambar sebagai geometri SVG alih-alih difoto: benda yang
 * dibangun dari aturan bisa diubah takarannya sedikit tiap kali dibunyikan,
 * dan telinga langsung tahu bedanya. Dua puluh klak papan jadwal yang berasal
 * dari satu berkas mp3 terdengar sebagai satu berkas yang diulang; dua puluh
 * klak yang tiap kali digeser nada dan kerasnya terdengar sebagai papan.
 *
 * Harganya nol byte unduhan, dan tidak ada yang perlu dimuat lebih dulu — bunyi
 * pertama sudah siap pada milidetik tombol sampul ditekan.
 *
 * ATURAN AUTOPLAY. AudioContext tidak boleh lahir sebelum ada gerakan pengguna;
 * kalau dilanggar, ia lahir dalam keadaan `suspended` dan bunyi pertama hilang
 * tanpa pesan galat apa pun. Karena itu `armSfx()` HANYA boleh dipanggil dari
 * dalam penangan tekanan tombol "Buka Undangan".
 */

const PREF_KEY = "sfx";

/** Volume induk. Suara di sini melengkapi undangan, bukan menyelenggarakannya. */
const MASTER = 0.45;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

/** Dengung lampu UV yang sedang menyala, kalau ada. */
let hum: { osc: OscillatorNode; gain: GainNode } | null = null;

let muted: boolean | null = null;
const listeners = new Set<() => void>();

// ── Preferensi ─────────────────────────────────────────────────────────────

/**
 * Bawaannya BERBUNYI.
 *
 * Tamu sampai di sini karena menekan "Buka Undangan" — sebuah gerakan yang
 * menyatakan "saya sedang menonton ini", bukan "saya sedang membuka tab di
 * sela rapat". Undangan ini juga sudah memutar musik latar sejak halaman
 * pertama, jadi bisu-secara-bawaan justru tidak konsisten. Yang wajib ada
 * adalah jalan keluarnya, dan itu satu tekanan di tombol kiri bawah.
 */
export function isMuted() {
  if (muted === null) {
    try {
      muted = localStorage.getItem(PREF_KEY) === "off";
    } catch {
      muted = false;
    }
  }
  return muted;
}

export function setMuted(next: boolean) {
  muted = next;
  try {
    localStorage.setItem(PREF_KEY, next ? "off" : "on");
  } catch {
    // Mode penyamaran menolak menyimpan. Pilihannya tetap berlaku sampai tab
    // ditutup — jauh lebih baik daripada tombol yang menolak ditekan.
  }
  if (next) stopHum(0.05);
  listeners.forEach((fn) => fn());
}

export function subscribeMuted(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ── Mesin ──────────────────────────────────────────────────────────────────

/** Siapkan mesin suara. Wajib dipanggil dari dalam gerakan pengguna. */
export function armSfx() {
  if (ctx) {
    void ctx.resume();
    return;
  }

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return;

  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = MASTER;
  master.connect(ctx.destination);

  // Satu detik derau putih, dipakai ulang oleh semua bunyi yang berbahan
  // gesekan: kertas, kulit, kayu, klak. Membuatnya sekali di muka jauh lebih
  // murah daripada mengisi buffer baru tiap kali stempel jatuh.
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

/** Mesin siap DAN tamu tidak sedang membisukan. */
function live() {
  return ctx !== null && master !== null && noiseBuf !== null && !isMuted();
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Satu semburan derau yang disaring — bahan dasar semua bunyi gesekan.
 *
 * Amplopnya naik dalam 4 ms lalu turun secara eksponensial. Naik yang lebih
 * lambat terdengar sebagai "wusss"; yang lebih cepat terdengar sebagai klik
 * digital. Empat milidetik adalah tempat di antaranya.
 */
function burst({
  at = 0,
  dur,
  freq,
  q = 1,
  gain,
  type = "bandpass",
  rate = 1,
}: {
  at?: number;
  dur: number;
  freq: number;
  q?: number;
  gain: number;
  type?: BiquadFilterType;
  rate?: number;
}) {
  if (!ctx || !master || !noiseBuf) return;
  const t = ctx.currentTime + at;

  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.playbackRate.value = rate;
  // Mulai dari titik acak di dalam buffer, kalau tidak dua puluh klak
  // berturut-turut memakai potongan derau yang sama persis — dan telinga
  // menangkap pengulangan itu sebagai bunyi mesin, bukan bunyi benda.
  const offset = Math.random() * 0.9;

  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  src.connect(filter).connect(g).connect(master);
  src.start(t, offset, dur + 0.05);
  src.stop(t + dur + 0.05);
}

/** Satu nada, boleh meluncur turun. Bahan dasar semua bunyi benturan. */
function tone({
  at = 0,
  dur,
  freq,
  to,
  gain,
  type = "sine",
}: {
  at?: number;
  dur: number;
  freq: number;
  /** Frekuensi akhir, kalau nadanya meluncur. */
  to?: number;
  gain: number;
  type?: OscillatorType;
}) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + at;

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  // Meluncur eksponensial, bukan linear: itu yang dilakukan benda tumpul
  // sungguhan saat energinya habis, dan luncuran linear terdengar seperti
  // efek suara kartun.
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

// ── Suara ──────────────────────────────────────────────────────────────────

/**
 * Sampul paspor dibuka.
 *
 * Tiga lapis yang tidak jatuh bersamaan, karena membuka buku juga bukan satu
 * kejadian: punggung buku yang terbuka (debum rendah), kulit yang meregang
 * (derit), lalu tiga lembar halaman yang menyusul.
 */
export function sfxCover() {
  if (!live()) return;
  tone({ dur: 0.26, freq: 128, to: 52, gain: 0.5 });
  burst({ at: 0.02, dur: 0.22, freq: 660, q: 5.5, gain: 0.1 });
  burst({ at: 0.11, dur: 0.18, freq: 840, q: 6.5, gain: 0.07 });
  for (let i = 0; i < 3; i++) {
    burst({
      at: 0.34 + i * 0.13,
      dur: 0.1,
      freq: rnd(2400, 3400),
      q: 0.9,
      gain: 0.07,
      rate: rnd(0.9, 1.2),
    });
  }
}

/** Satu lembar halaman masuk ke layar. Sengaja nyaris tak terdengar. */
export function sfxPage() {
  if (!live()) return;
  burst({ dur: 0.13, freq: rnd(2600, 3600), q: 0.8, gain: 0.055, rate: rnd(0.85, 1.15) });
  burst({ at: 0.05, dur: 0.09, freq: rnd(1600, 2200), q: 1.4, gain: 0.03 });
}

/**
 * Stempel imigrasi dibubuhkan.
 *
 * Bunyi yang paling ingin diulang orang, jadi ia yang paling dirakit: klik
 * karet menyentuh kertas, debum gagang kayu, lalu dengung meja yang ikut
 * bergetar. Ketiganya berjarak beberapa milidetik — itulah yang membedakan
 * "dicap" dari "diketuk".
 */
export function sfxStamp() {
  if (!live()) return;
  burst({ dur: 0.035, freq: 2600, q: 0.7, gain: 0.3, type: "highpass" });
  tone({ at: 0.004, dur: 0.16, freq: 104, to: 44, gain: 0.55 });
  tone({ at: 0.01, dur: 0.09, freq: 190, to: 120, gain: 0.14, type: "triangle" });
  navigator.vibrate?.(14);
}

/**
 * Satu daun papan split-flap terlipat.
 *
 * Dibatasi lajunya di sini, bukan di komponennya: satu papan jadwal berisi
 * puluhan sel yang berputar serempak, dan memanggil ini sekali per sel akan
 * menumpuk ratusan node audio per detik sampai ponsel kelas bawah tersendat.
 * Dengan pembatas 26 ms, yang terdengar tetap gemeretak — hanya saja gemeretak
 * yang bisa dibayar.
 */
let lastFlap = 0;
export function sfxFlap() {
  if (!live()) return;
  const now = performance.now();
  if (now - lastFlap < 26) return;
  lastFlap = now;
  burst({ dur: 0.028, freq: rnd(2200, 3000), q: 7, gain: rnd(0.05, 0.085), rate: rnd(0.9, 1.15) });
  burst({ at: 0.008, dur: 0.02, freq: rnd(700, 950), q: 4, gain: 0.03 });
}

/**
 * Lampu UV menyala.
 *
 * Tabung neon tidak pernah menyala mulus: starter-nya berdecak beberapa kali,
 * baru dengung 120 Hz mengambil alih. Kedipan gambarnya di `uv-ignite` dan
 * decak di sini sengaja sama panjangnya — kalau telinga dan mata tidak sepakat
 * soal kapan lampunya menyala, dua-duanya jadi tidak dipercaya.
 */
export function sfxUvOn() {
  if (!live() || !ctx || !master) return;

  for (let i = 0; i < 4; i++) {
    burst({ at: rnd(0, 0.3), dur: 0.02, freq: rnd(1800, 4200), q: 3, gain: rnd(0.05, 0.12) });
  }

  stopHum(0.02);

  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = 120;

  // Gigi gergaji 120 Hz mentah terdengar seperti serangga. Yang ingin ditiru
  // adalah dengung ballast yang teredam dari dalam kotak lampu, jadi seluruh
  // warna di atas 300 Hz dibuang.
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 300;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.035, t + 0.42);

  osc.connect(lp).connect(g).connect(master);
  osc.start(t);
  hum = { osc, gain: g };
}

/** Lampu UV dipadamkan: dengungnya surut, saklarnya berdecak. */
export function sfxUvOff() {
  if (!ctx) return;
  stopHum(0.14);
  if (!live()) return;
  burst({ dur: 0.02, freq: 1500, q: 2, gain: 0.07 });
}

function stopHum(fade: number) {
  if (!hum || !ctx) return;
  const { osc, gain } = hum;
  hum = null;
  const t = ctx.currentTime;
  gain.gain.cancelScheduledValues(t);
  // setValueAtTime lebih dulu: tanpa itu, ramp dihitung dari nilai terjadwal
  // terakhir, bukan dari nilai yang sedang terdengar — dan dengungnya melompat
  // keras sesaat sebelum hilang.
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + fade);
  osc.stop(t + fade + 0.05);
}


## 15. Sesi kedelapan (1 Agustus 2026)

Permintaan pengguna cuma satu kalimat: *"lanjutkan dengan hemat dan efektif
token."* Jadi urutannya diambil dari roadmap §14.2 tanpa bertanya lagi.

### 15.1 Sudah selesai & SUDAH DI-PUSH

| Commit | Isi |
|---|---|
| `64cbd6f` | Sisa working tree §14.3 (slip lagu sobek) diverifikasi lalu dikirim |
| `d744365` | Kejutan Bismillah — lambang berputar, delapan tumpalnya mekar |
| `26a21ad` | Kejutan data diri — pas foto diangkat, tanda tangan di baliknya |

### 15.2 Cara membuktikan kejutan tanpa menonton

Pane masih tersembunyi (§14.4). Dua tambahan yang dipakai sesi ini:

**D. Klik lewat DOM, bukan lewat kursor.** `btn.click()` memicu handler React
seperti sentuhan sungguhan, dan tidak perlu koordinat maupun screenshot
sebelumnya. Berguna kalau elemennya jauh di bawah lipatan.

**E. Bekukan timer turun-otomatis selama satu klik.** Kejutan yang pulih
sendiri (pas foto: 2,6 detik) sudah kembali ke posisi semula sebelum panggilan
screenshot berikutnya sampai. Ganti `window.setTimeout` jadi fungsi kosong
tepat sebelum `click()`, kembalikan sesudahnya — handler React jalan sinkron,
jadi jendela penggantiannya persis selebar handler itu:

```js
const orig = window.setTimeout; window.setTimeout = () => 0;
btn.click();
window.setTimeout = orig;
```

**Awas:** state komponen bertahan melintasi HMR. Kalau sesudah menyunting
fotonya masih terangkat dari percobaan sebelumnya, klik berikutnya justru
MENURUNKANNYA — dan hasilnya terbaca seperti fitur yang rusak. Potret dulu
sebelum mengklik.

### 15.3 Angka yang gampang disetel (tambahan §14.6)

| Apa | Di mana | Sekarang | Artinya |
|---|---|---|---|
| Putaran lambang | `globals.css`, `animate-emblem-turn` | `1400ms` + `cubic-bezier(0.12,0.66,0.2,1)` | 206° di 200 md pertama, sisanya mendarat pelan. Kurva yang berangkat pelan terbaca "sedang memuat" |
| Jarak mekar tumpal | `globals.css`, `emblem-bloom` | `-7px` | satuan viewBox (±6% lebar lambang). Lebih dari itu, medalinya terbaca patah |
| Jeda antar tumpal | `globals.css`, `.emblem-spoke` | `var(--spoke) * 30ms` | mekarnya menjalar melingkar. Nol → meletus serentak |
| Sudut angkat pas foto | `photo-peel.tsx` | `rotate3d(0.34,1,0,-64deg)` | di bawah ±55° tanda tangannya masih tertutup |
| Lama foto bertahan naik | `photo-peel.tsx`, `HOLD_MS` | `2600` | |

### 15.4 Sisa yang belum dikerjakan

Dari §14.2, berurutan:

1. **Kejutan kecil sisanya** — Rute (sentuh kode bandara → detail persinggahan),
   Papan jadwal (sentuh baris → daunnya membalik ulang), Galeri (tahan foto →
   "dicuci" seperti polaroid).
2. **Benang pengaman di kertas** (roadmap #5).
3. **Halaman visa berisi semua stempel yang dikumpulkan tamu** + simpan jadi
   gambar lewat `share-card.tsx`. Ini mesin "efek iri"-nya, dan masih yang
   paling besar dampaknya dari semua yang tersisa.
4. **Boarding pass disobek jari** — masih terhalang: butuh baris tamu di
   database (§14.5).

### 15.5 Yang BELUM terbukti

- **Rasanya, sekali lagi.** Bentuk kedua kejutan terbukti lewat timeline dan
  potret; apakah putaran 1400 md terasa anggun atau kelamaan, dan apakah 2,6
  detik cukup untuk membaca tanda tangan, cuma jari pengguna yang tahu.
- **Huruf `Mrs Saint Delafield` di jaringan lambat.** `preload: false` berarti
  ia diambil belakangan; kalau tamu mengangkat foto pada detik pertama, tanda
  tangannya mungkin sempat tampil dengan huruf pengganti.

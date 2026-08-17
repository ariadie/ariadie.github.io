# ariadie.github.io

Situs statis pembelajaran dan dokumentasi publik Ariadie Chandra Nugraha. Situs mencakup optimasi multiobjektif, algoritma evolusioner, statistika, Artificial Intelligence, Signals & Systems, sistem kendali, Convex Optimization, Pymoo, dan MOO-MRPP.

## Struktur

- Halaman root: materi optimasi, algoritma, statistika, dan ACN101.
- `aima/`: panduan interaktif Artificial Intelligence.
- `signal/`: materi Signals & Systems.
- `control/`: materi sistem kendali.
- `conv/`: catatan Convex Optimization.
- `pymoo/`: panduan Pymoo.
- `moo-mrpp/`: dokumentasi publik MOO-MRPP.
- `assets/`: aset bersama untuk navigasi dan tampilan situs.
- `tools/maintain-site.mjs`: pemeliharaan metadata, hardening tautan, breadcrumb, dan sitemap.
- `tools/audit-site.mjs`: audit metadata, canonical, tautan, breadcrumb, dan sitemap.

Konten privat tidak boleh ditempatkan di repository ini. Simpan draf, naskah terbatas, data internal, atau materi berbayar pada lokasi yang memiliki kontrol akses sesuai kebutuhan.

## Preview lokal

Jalankan server HTTP statis dari root repository, misalnya:

```powershell
python -m http.server 8000
```

Kemudian buka `http://localhost:8000/`.

## Pemeliharaan

Setelah menambah atau memindahkan halaman, jalankan:

```powershell
node tools/maintain-site.mjs
node tools/audit-site.mjs
```

Script tersebut bersifat idempoten dan akan:

- melengkapi metadata yang dikelola situs;
- memastikan tautan tab baru memakai `noopener noreferrer`;
- memasang breadcrumb bersama pada microsite;
- membangun ulang `sitemap.xml`.

Sebelum commit, jalankan auditor, periksa `git diff --check`, dan tinjau tampilan halaman representatif.

## Continuous Integration

Workflow [`.github/workflows/site-quality.yml`](.github/workflows/site-quality.yml) menjalankan CI dasar pada setiap push ke `master`, pull request, dan pemanggilan manual. Pemeriksaan mencakup sintaks JavaScript, audit situs, serta verifikasi bahwa metadata dan `sitemap.xml` sudah dibangkitkan ulang.

Workflow memakai izin repository read-only dan tidak melakukan commit, push, atau deployment. Jika tahap `Verify generated files are current` gagal, jalankan kembali perintah pemeliharaan lokal, tinjau perubahan, lalu commit hasilnya.

Lapisan QA tambahan berjalan dalam mode report-only agar temuan lama tidak memblokir publikasi:

- HTML Validate memeriksa struktur seluruh halaman publik;
- Playwright membuka homepage, halaman 404, dan halaman representatif setiap microsite;
- axe memindai masalah WCAG A/AA yang dapat dideteksi otomatis;
- Lighthouse mencatat baseline performa, aksesibilitas, best practices, dan SEO;
- pemeriksa URL eksternal berjalan setiap Senin dan saat workflow dipanggil manual.

Laporan HTML, browser/axe, Lighthouse, dan tautan eksternal disimpan sebagai artifact GitHub Actions. Jalankan pemeriksaan yang sama secara lokal dengan:

Gunakan Node.js 24.8 atau lebih baru untuk tool QA.

```powershell
npm ci
npm run qa:html
npx playwright install chromium
npm run qa:browser
npm run qa:lighthouse
npm run qa:external
```

## Publikasi

GitHub Pages dipublikasikan dari branch `master`. Perubahan pada branch tersebut akan memicu deployment baru.

## Hak cipta

Kode dan konten milik Ariadie Chandra Nugraha dilindungi dengan ketentuan All Rights Reserved pada [LICENSE.md](LICENSE.md). Materi pihak ketiga tetap tunduk pada lisensi dan hak pemilik masing-masing.

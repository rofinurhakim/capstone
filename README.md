# Portal Akademik BEC

Aplikasi portal akademik Bethesda English Course (BEC) berbasis web. Sistem terdiri atas API Laravel dan frontend Next.js. Antarmuka aplikasi menggunakan bahasa Inggris.

## Fitur

- **Akses berbasis peran:** Admin, Admin Akademik, Guru, dan Orang Tua/Wali mendapatkan akses sesuai perannya. Akun guru dapat diberi satu peran tambahan: Admin atau Admin Akademik.
- **Pengelolaan murid:** Admin dan Admin Akademik mendaftarkan murid. Pendaftaran baru dimulai dengan level Matthew A dan status Pending; data sekolah mencakup nama sekolah dan kelas sekolah.
- **Kelas dan guru:** Maksimal tiga guru dapat mengajar satu kelas dan seorang guru hanya dapat ditugaskan ke satu kelas per tahun ajaran. Tema pembelajaran berlaku untuk satu tahun ajaran.
- **Presensi:** Guru mencatat presensi berdasarkan tanggal dan tahun ajaran. Sistem menyediakan rekap presensi dan ekspor CSV.
- **Nilai dan komentar:** Guru dapat membuat jumlah kuis yang fleksibel per kelas dan tahun ajaran; e-report menampilkan rata-rata kuis pada baris Assignment beserta bobotnya. Nilai partisipasi dihitung dari jumlah hadir dibagi seluruh pertemuan, sehingga sakit, izin, dan absen tidak menambah nilai hadir.
- **Periode akademik:** Admin dan Admin Akademik dapat menambahkan periode berikutnya dengan memilih tanggal mulai dan selesai. Dropdown menampilkan rentang lengkap, misalnya 1 Agustus 2026–31 Mei 2027.
- **Bobot penilaian:** Admin dan Admin Akademik dapat mengatur bobot penilaian untuk setiap tahun ajaran. Total bobot harus 100%.
- **Placement test:** Tidak ada halaman atau input nilai placement test. Admin atau Admin Akademik menjadwalkannya sebagai acara kalender; Akademi memilih level dan mengonfirmasi enrollment setelah tes selesai.
- **Rapor:** Guru menyetujui rapor dengan nilai lengkap; Admin atau Admin Akademik mengatur tanggal publikasi dan menyetujui penerbitan. Tenggat nilai mengikuti tanggal publikasi. Guru dapat meminta revisi rapor terbit, yang kembali menjadi draft untuk disetujui guru dan Akademi sebelum diterbitkan ulang.
- **Enrollment dan kenaikan level:** Enrollment baru berstatus Pending sampai dikonfirmasi atau ditolak Akademi. Enrollment tahun ajaran berikutnya ditentukan berdasarkan nilai berbobot dan presensi. Nilai akhir minimal 65 menaikkan level; nilai di bawah 65 mengulang level. Murid ECSC yang memenuhi syarat dinyatakan lulus. Nilai yang belum lengkap menahan murid dari proses otomatis.
- **Kalender akademik:** Pengguna dapat melihat acara akademik. Admin dan Admin Akademik dapat menambah, mengubah, dan menghapus acara.
- **Akses orang tua:** Orang tua dapat memperbarui data anak, memilih untuk tidak melanjutkan enrollment, melihat dan mengunduh e-report card sebagai PDF, melihat kalender, serta menghubungi guru yang ditugaskan. Orang tua tidak dapat menambahkan data murid atau mengunduh CSV rapor.
- **Keamanan akun:** Pengguna dapat mengubah kata sandi atau meminta tautan pengaturan ulang kata sandi dari halaman login.
- **Notifikasi dan ekspor:** Aksi yang berhasil dan kesalahan ditampilkan melalui toast berbahasa Inggris. Staf dapat mengekspor data akademik dan presensi sebagai CSV.

## Persyaratan

- PHP 8.3 atau lebih baru dan Composer
- Node.js dan npm
- SQLite (database lokal bawaan)

## Menjalankan secara lokal

Jalankan API dan frontend di dua terminal terpisah.

### 1. Menyiapkan API Laravel

```sh
cd backend/api
composer install
test -f .env || cp .env.example .env
php artisan key:generate
touch database/database.sqlite
```

Jalankan `php artisan key:generate` hanya saat menyiapkan lingkungan lokal baru dengan `APP_KEY` yang masih kosong.

Pastikan konfigurasi `.env` menggunakan SQLite:

```dotenv
DB_CONNECTION=sqlite
```

Untuk **database lokal baru dan kosong**, jalankan migrasi sekaligus seeder akun dan data contoh:

```sh
php artisan migrate --seed
```

Untuk **database yang sudah berisi data**, jangan jalankan seeder lagi. Cukup terapkan migrasi yang belum dijalankan:

```sh
php artisan migrate
```

Jalankan API pada port `8001`:

```sh
php artisan serve --host=127.0.0.1 --port=8001
```

Alamat dasar API adalah `http://127.0.0.1:8001/api`.

### 2. Mengatur dan menjalankan frontend Next.js

Buka terminal lain:

```sh
cd frontend
npm install
```

Buat file `frontend/.env.local` dengan alamat API yang sama seperti di atas:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8001/api
```

Kemudian jalankan aplikasi web:

```sh
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Buka [http://127.0.0.1:3000](http://127.0.0.1:3000). Jika isi `.env.local` diubah, mulai ulang server frontend agar konfigurasi baru digunakan.

Jika port `8001` sudah digunakan, pilih port API lain yang masih tersedia. Sesuaikan opsi `artisan serve --port` dan `NEXT_PUBLIC_API_URL` dengan port tersebut. Jangan arahkan frontend ke aplikasi Laravel lain yang berjalan di komputer yang sama.

## Akun uji lokal

Seeder membuat akun berikut dengan kata sandi `password`:

Data contoh empat murid dilengkapi nilai, presensi, komentar guru, dan tema rapor pada tahun ajaran aktif. Data enrollment untuk tahun ajaran berikutnya dibuat dengan status **Pending**.

| Peran | Email |
|---|---|
| Admin | `admin@kursus.test` |
| Admin Akademik | `academic@kursus.test` |
| Guru | `guru@kursus.test` |
| Orang Tua/Wali | `ortu@kursus.test` |

Akun ini hanya untuk pengujian lokal. Jangan gunakan di lingkungan produksi.

## Peran pengguna

| Peran | Tanggung jawab utama |
|---|---|
| **Admin** | Mengelola operasional akademik, pengguna, kelas, murid, tahun ajaran, dan pengaturan rapor. |
| **Admin Akademik** | Mengelola kelas, guru, data murid, tema, bobot penilaian, jadwal dan publikasi rapor, serta daftar ulang. |
| **Guru** | Melihat kelas yang ditugaskan, mencatat presensi, mengelola kuis dan nilai, menyetujui rapor, serta meminta revisi rapor terbit. |
| **Orang Tua/Wali** | Memperbarui data anak, memilih untuk tidak melanjutkan enrollment, serta melihat kalender, guru yang ditugaskan, dan e-report card PDF yang telah dipublikasikan. |

## Alur akademik

1. **Menyiapkan tahun ajaran:** Admin atau Admin Akademik menambahkan periode akademik berikutnya bila diperlukan, membuat kelas dan akun guru, menetapkan satu sampai tiga guru per kelas, mendaftarkan murid, dan menambahkan tema tahunan.
2. **Menjadwalkan placement test (bila diperlukan):** Admin atau Admin Akademik membuat acara Placement test di kalender. Setelah tes eksternal selesai, Akademi memilih level dan mengonfirmasi enrollment.
3. **Mencatat presensi:** Guru memilih tahun ajaran dan tanggal, mengisi presensi murid di kelas yang ditugaskan, lalu menyimpannya. Hanya status hadir yang menambah nilai partisipasi.
4. **Mengatur bobot dan publikasi:** Admin atau Admin Akademik mengatur bobot penilaian tahun ajaran (total 100%) dan tanggal publikasi rapor.
5. **Mengisi dan menyetujui nilai:** Guru membuat kuis sesuai kebutuhan kelas/tahun ajaran, mengisi nilai kuis, ujian tengah, ujian akhir, dan komentar rapor. Guru menyetujui rapor setelah seluruh nilai lengkap.
6. **Menerbitkan rapor:** Pada atau setelah tanggal publikasi, Admin atau Admin Akademik menyetujui dan menerbitkan rapor yang sudah disetujui guru.
7. **Melihat rapor:** Orang tua masuk ke portal untuk melihat atau mengunduh PDF rapor anak yang telah dipublikasikan dan menghubungi guru yang ditugaskan.
8. **Memproses tahun ajaran berikutnya:** Admin atau Admin Akademik mengajukan enrollment tahun berikutnya. Sistem menentukan kenaikan level, pengulangan, atau kelulusan; nilai yang belum lengkap menahan proses. Akademi mengonfirmasi atau menolak enrollment.
9. **Merevisi rapor yang sudah terbit bila perlu:** Setelah tanggal publikasi, guru meminta revisi. Rapor menjadi draft; setelah perubahan, guru menyetujuinya dan Akademi mengonfirmasi penerbitan ulang.

Periode akademik disimpan dengan tahun dari tanggal mulainya sebagai kunci internal, tetapi antarmuka menampilkan tanggal mulai dan selesai yang dipilih (misalnya `1 Agustus 2026 - 31 Mei 2027`). Tidak ada pembagian semester seperti `2026-1` atau `2026-2`.

## Pengujian dan pemeriksaan

Jalankan pengujian backend:

```sh
cd backend/api
php artisan test
```

Jalankan lint, pemeriksaan tipe, dan build produksi frontend:

```sh
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

## Deployment

Lihat [DEPLOY.md](./DEPLOY.md) untuk panduan deployment. Atur kredensial produksi, database, layanan email, `APP_KEY`, `APP_DEBUG=false`, serta URL frontend sesuai lingkungan deployment. Jangan gunakan akun contoh atau database SQLite lokal di produksi.

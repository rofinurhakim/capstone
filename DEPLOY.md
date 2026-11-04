# Daftar periksa sebelum dipakai sungguhan

Backend (.env produksi)
- APP_ENV=production, APP_DEBUG=false, APP_URL=https://api.domainmu.id
- Ganti kata sandi dilakukan setelah pengguna masuk dari menu Account dengan memasukkan kata sandi saat ini; semua sesi API dicabut dan pengguna harus login kembali setelah perubahan.
- `FRONTEND_URL` dipakai untuk membatasi origin CORS ke frontend yang digunakan.
- Batasi CORS: php artisan config:publish cors, lalu isi allowed_origins dengan alamat frontend saja
- Kedaluwarsa token: di config/sanctum.php isi 'expiration' => 60 * 24 * 7
- Hapus akun contoh dari seeder dan jangan jalankan --seed di produksi
- Pakai HTTPS, jalankan php artisan config:cache route:cache, dan jadwalkan backup database

Frontend
- .env.production: NEXT_PUBLIC_API_URL=https://api.domainmu.id/api
- npm run build lalu npm start (atau deploy ke Vercel/hosting Node)
- Token login disimpan di localStorage. Cukup untuk proyek ini; untuk keamanan lebih tinggi pertimbangkan cookie HttpOnly

Data murid adalah data anak-anak: minta izin tertulis lembaga, batasi akses admin, dan jangan memakai data asli untuk demo/video.

Pengujian: php artisan test

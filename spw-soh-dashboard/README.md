# SPW & SOH Online Dashboard

Dashboard online untuk workbook **SPW & SOH Jakarta 1-2.xlsx** dengan dua tab:

- **Penjualan** — membaca Sheet `SPW` + `Target`
- **Stock** — membaca Sheet `SOH`

Arsitektur:

```text
Google Drive (Excel)
        │
        ▼
Google Drive API + Service Account (Google Cloud)
        │
        ▼
Vercel Serverless API (/api/dashboard)
        │
        ▼
Web Dashboard di Vercel
```

Dashboard mengecek `modifiedTime` file Google Drive setiap 60 detik. Jika file Excel berubah, server mengambil file terbaru dan halaman aktif diperbarui. **Perubahan data Excel tidak membutuhkan git push atau deploy ulang.**

## Fitur Penjualan

- Tabel seluruh store: sales, target, achievement Total / Apple-Device / Accy / VAS.
- Filter store.
- Target diambil dari Sheet `Target`.
- SPV di Sheet `Target` otomatis dikeluarkan dari tabel staff.
- Filter staff.
- Filter LOB: iPhone, iPad, Apple Watch, Mac.
- Setelah memilih LOB, filter **Tipe Produk** otomatis berisi tipe yang memang ada di data.
- Tabel staff: Amount, iPhone, iPad, Apple Watch, Mac, Amount Device, Accy, VAS, UPT, ATV.
- Tabel harian dengan tanggal ke samping dan 10 metrik per staff.
- Detail transaksi untuk audit angka.

### Definisi perhitungan

- **Amount** = nilai net pada kolom nilai penjualan SPW (kolom ke-3 di setiap blok toko), konsisten dengan baris `Total For ...` pada workbook.
- **Device / Target Apple** = iPhone + iPad + Apple Watch + Mac.
- **Accy** = produk non-device dan non-VAS.
- **VAS**:
  - Telkomsel: kode `TSL...`
  - XL: kode `XXL...`
  - Indosat: kode `IDT...`
  - Qoala: kode `KLA...`, tetapi item yang mengandung `MUKLAY` tidak dianggap Qoala.
- **UPT** = jumlah item bernilai > 0 (VAS dikeluarkan) / jumlah transaksi unik.
- **ATV** = total Amount / jumlah transaksi unik.

## Fitur Stock

- Filter store.
- Filter LOB.
- Tabel Artikel, Description, LOB, Qty.
- Stock dibaca dari blok masing-masing toko pada Sheet `SOH`.
- Dashboard memberi warning bila nama toko di isi report SOH tidak sesuai header blok atau stock kosong.

## Temuan pada file contoh yang Anda kirim

Parser sudah divalidasi pada workbook sumber dengan 9 store: M117, M118, M124, M127, M217, M227, M238, M255, M264.

Ada dua temuan pada Sheet SOH file sumber:

1. **M255 Digimap Antasari Place**: blok header M255 berisi report yang tertulis `Digimap AAR Pondok Indah Mall 2` dan datanya sama seperti blok M238.
2. **M264 Digimap Plaza Semanggi**: blok SOH kosong.

Dashboard tidak mengubah data tersebut; warning ditampilkan agar sumber dapat diperbaiki.

---

# SETUP LENGKAP

## A. Siapkan file di Google Drive

1. Upload workbook Excel Anda ke Google Drive.
2. Gunakan **satu file yang sama** untuk update berikutnya. Anda boleh mengubah isi file dan save kembali, tetapi jangan membuat file baru setiap hari jika ingin `GOOGLE_DRIVE_FILE_ID` tetap sama.
3. Buka file di Google Drive.
4. Salin File ID dari URL.

Contoh URL:

```text
https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view
```

File ID-nya:

```text
1AbCdEfGhIjKlMnOpQrStUvWxYz
```

Simpan ID ini untuk Vercel.

## B. Buat Google Cloud Project

1. Buka Google Cloud Console.
2. Buat project baru, contoh nama: `spw-soh-dashboard`.
3. Pastikan project tersebut aktif.
4. Masuk ke **APIs & Services → Library**.
5. Cari **Google Drive API**.
6. Klik **Enable**.

Google juga mendokumentasikan bahwa Drive API harus diaktifkan pada Cloud Project sebelum digunakan.

Dokumentasi resmi:
https://developers.google.com/workspace/guides/enable-apis

## C. Buat Service Account

1. Di Google Cloud Console buka **IAM & Admin → Service Accounts**.
2. Klik **Create Service Account**.
3. Nama contoh: `dashboard-reader`.
4. Role Google Cloud tidak perlu akses luas ke project; file akan diberikan langsung melalui Google Drive sharing.
5. Selesaikan pembuatan Service Account.
6. Buka Service Account yang baru dibuat.
7. Masuk ke tab **Keys**.
8. Klik **Add Key → Create new key → JSON**.
9. Download file JSON.

Di file JSON, Anda membutuhkan dua nilai:

```json
{
  "client_email": "dashboard-reader@project-id.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

Jangan upload file JSON tersebut ke GitHub.

## D. Share Excel ke Service Account

Ini langkah yang paling sering terlewat.

1. Kembali ke Google Drive.
2. Klik kanan workbook → **Share**.
3. Masukkan alamat `client_email` Service Account.
4. Berikan akses **Viewer**.
5. Klik Share.

Dengan demikian dashboard hanya membutuhkan akses baca.

Google Drive API mengunduh blob Excel menggunakan `files.get` dengan `alt=media`.

Dokumentasi resmi:
https://developers.google.com/workspace/drive/api/guides/manage-downloads

## E. Buat repository GitHub

1. Login ke GitHub.
2. Klik **New repository**.
3. Nama contoh: `spw-soh-dashboard`.
4. Pilih Private jika data perusahaan tidak ingin project terlihat publik.
5. Jangan upload credential Google ke repository.
6. Ekstrak ZIP project ini di Mac Anda.
7. Buka Terminal pada folder project.

Jalankan:

```bash
git init
git add .
git commit -m "Initial SPW SOH dashboard"
git branch -M main
git remote add origin https://github.com/dharmawangga29/spw-soh-dashboard.git
git push -u origin main
```

Ganti `USERNAME` dengan username GitHub Anda.

## F. Import GitHub ke Vercel

1. Login ke Vercel menggunakan GitHub.
2. Klik **Add New → Project**.
3. Pilih repository `spw-soh-dashboard`.
4. Root Directory: `./`.
5. Framework Preset boleh dibiarkan **Other**.
6. Jangan deploy dulu sebelum memasukkan environment variables, atau deploy pertama akan memakai sample lokal.

Vercel mendukung import repository GitHub dan environment variables dari Project Settings.

Dokumentasi:
https://vercel.com/docs

## G. Tambahkan Environment Variables di Vercel

Di project Vercel buka **Settings → Environment Variables**.

Tambahkan:

### 1. GOOGLE_DRIVE_FILE_ID

```text
GOOGLE_DRIVE_FILE_ID
```

Value:

```text
1AbCdEfGhIjKlMnOpQrStUvWxYz
```

### 2. GOOGLE_SERVICE_ACCOUNT_EMAIL

```text
GOOGLE_SERVICE_ACCOUNT_EMAIL
```

Value dari `client_email` file JSON Google Cloud.

Contoh:

```text
dashboard-reader@spw-soh-dashboard.iam.gserviceaccount.com
```

### 3. GOOGLE_PRIVATE_KEY

Key:

```text
GOOGLE_PRIVATE_KEY
```

Value: seluruh nilai `private_key` dari JSON, termasuk:

```text
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
```

Anda dapat paste multiline langsung di Vercel. Kode juga menerima versi yang mengandung karakter `\n`.

### 4. USE_LOCAL_SAMPLE

Untuk production:

```text
USE_LOCAL_SAMPLE=false
```

Set variable pada **Production**, dan sebaiknya Preview juga.

## H. Deploy

Setelah environment variables selesai:

1. Klik **Deploy**.
2. Setelah selesai, Vercel memberi URL seperti:

```text
https://spw-soh-dashboard.vercel.app
```

3. Buka link.
4. Di header dashboard harus tertulis **Google Drive**, bukan **Sample lokal**.
5. Pilih salah satu store untuk memastikan data detail dan stock muncul.

## I. Test auto update

1. Buka workbook yang sama di Google Drive.
2. Ubah salah satu data SPW, Target, atau SOH.
3. Save file.
4. Kembali ke dashboard.
5. Klik **Refresh Data**, atau biarkan halaman melakukan pengecekan otomatis setiap 60 detik.
6. Bila `modifiedTime` berubah, API mengunduh versi Excel terbaru.

**Tidak perlu:**

```text
git push
Vercel redeploy
upload ZIP baru
```

Selama Anda mengubah **file Drive yang ID-nya sama**, angka dashboard akan mengikuti data terbaru.

## J. Jika Anda mengganti file dengan file Google Drive baru

Jika Anda membuat file baru dan ID berubah:

1. Share file baru ke Service Account.
2. Copy File ID baru.
3. Vercel → Settings → Environment Variables.
4. Ubah `GOOGLE_DRIVE_FILE_ID`.
5. Karena environment variable berubah, lakukan redeploy satu kali.

Setelah itu perubahan isi pada file baru kembali otomatis tanpa deploy.

---

# Menjalankan lokal di Mac

Project menyertakan workbook sample di `sample/sample-data.xlsx`.

Persyaratan:

- Node.js 20+
- npm

Jalankan:

```bash
npm install
npx vercel dev
```

Jika `GOOGLE_DRIVE_FILE_ID` belum diisi, project menggunakan sample lokal.

Buka URL yang ditampilkan Vercel CLI, biasanya:

```text
http://localhost:3000
```

Untuk mengetes Google Drive secara lokal, buat `.env.local` dari `.env.example` dan isi credential Anda.

Jangan commit `.env.local`.

---

# Struktur project

```text
spw-soh-dashboard/
├── api/
│   └── dashboard.js        # API untuk summary, store sales, stock
├── lib/
│   ├── google-drive.js     # Service Account OAuth + Drive download
│   └── parser.js           # Parser SPW / SOH / Target
├── public/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── sample/
│   └── sample-data.xlsx    # Workbook yang Anda kirim, untuk local testing
├── scripts/
│   └── test-parser.js
├── .env.example
├── .gitignore
├── package.json
├── vercel.json
└── README.md
```

# Endpoint API

```text
/api/dashboard?view=summary
/api/dashboard?view=store&store=M117
/api/dashboard?view=stock&store=M117
```

API memeriksa metadata file terlebih dahulu. File Excel hanya didownload dan diparse ulang jika versi (`modifiedTime` + size) berubah pada instance server yang masih aktif.

# Keamanan

- Jangan memasukkan private key ke source code.
- Jangan commit `.env` / `.env.local`.
- Repository boleh private.
- Excel cukup di-share sebagai Viewer ke Service Account.
- Browser tidak menerima private key Google. Semua akses Drive terjadi di serverless API Vercel.

# Catatan saat format Excel berubah

Parser saat ini mengikuti struktur workbook yang Anda kirim:

- SPW: tiap store = blok **4 kolom**.
- SOH: tiap store = blok **10 kolom**.
- Target: header berisi `Site`, `Store`, `Target`, `Target Apple`, `Target Accy`, `Target VAS`, `SPV`.

Anda boleh mengubah nilai, menambah transaksi, atau memperpanjang baris. Jangan mengubah struktur kolom/header utama tanpa menyesuaikan `lib/parser.js`.

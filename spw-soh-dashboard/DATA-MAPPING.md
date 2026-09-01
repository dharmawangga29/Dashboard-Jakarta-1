# Data Mapping

## Sheet Target

Kolom yang digunakan:

- Site
- Store
- Target
- Target Apple
- Target Accy
- Target VAS
- SPV

SPV dibandingkan dengan nama staff di SPW secara case-insensitive dan spasi dinormalisasi. Staff yang sama dengan nama SPV tidak dimasukkan ke tabel staff.

## Sheet SPW

Setiap toko menggunakan 4 kolom:

```text
Kolom 1: tanggal / staff / description / amount
Kolom 2: article / transaction number
Kolom 3: net amount
Kolom 4: separator
```

Parser mendeteksi:

- tanggal `dd-mm-yyyy` atau Excel serial date
- staff `ID / Nama`
- item sebagai pasangan `description + article`, diikuti row amount
- baris `Total For ...` tidak dihitung sebagai item

## LOB

Device:

- iPhone: description mengandung `IPHONE`
- iPad: description mengandung `IPAD`
- Apple Watch: description mengandung `APPLE WATCH` / pola watch device
- Mac: MacBook, iMac, Mac mini, Mac Studio, Mac Pro, MBA, MBP

VAS:

- `TSL...` → Telkomsel
- `XXL...` → XL
- `IDT...` → Indosat
- `KLA...` → Qoala
- item yang mengandung `MUKLAY` tidak dikategorikan Qoala

Sisa produk → Accy.

## Sheet SOH

Setiap toko menggunakan 10 kolom. Kolom yang dipakai:

- Description: posisi ke-5 pada blok
- Article: posisi ke-6
- Qty: posisi ke-8

LOB stock menggunakan classifier yang sama seperti Penjualan.

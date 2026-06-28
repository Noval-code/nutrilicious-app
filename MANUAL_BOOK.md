# BUKU PANDUAN PENGGUNA (USER MANUAL BOOK)
## APLIKASI NUTRILICIOUS: PLATFORM CATERING SEHAT & PREDIKSI KEBUTUHAN BAHAN BAKU

Buku panduan ini disusun sebagai acuan operasional penggunaan aplikasi **Nutrilicious** baik dari sisi **Pelanggan (Customer/User)** maupun **Administrator (Admin)**.

---

## DAFTAR ISI
1. [PENDAHULUAN](#1-pendahuluan)
   - [Tentang Nutrilicious](#tentang-nutrilicious)
   - [Teknologi Sistem](#teknologi-sistem)
2. [PANDUAN PENGGUNA (PELANGGAN)](#2-panduan-pengguna-pelanggan)
   - [2.1 Pendaftaran Akun (Sign Up) & Verifikasi Email](#21-pendaftaran-akun-sign-up--verifikasi-email)
   - [2.2 Masuk ke Akun (Sign In) & Lupa Kata Sandi](#22-masuk-ke-akun-sign-in--lupa-kata-sandi)
   - [2.3 Menjelajahi Menu & Paket Katering Sehat](#23-menjelajahi-menu--paket-katering-sehat)
   - [2.4 Konsultasi Gizi Menggunakan NutriBot (AI Chatbot RAG)](#24-konsultasi-gizi-menggunakan-nutribot-ai-chatbot-rag)
   - [2.5 Keranjang Belanja & Alur Pemesanan (Checkout)](#25-keranjang-belanja--alur-pemesanan-checkout)
   - [2.6 Riwayat Pesanan & Unggah Bukti Pembayaran](#26-riwayat-pesanan--unggah-bukti-pembayaran)
   - [2.7 Pengaturan Profil & Alamat](#27-pengaturan-profil--alamat)
3. [PANDUAN ADMINISTRATOR (ADMIN)](#3-panduan-administrator-admin)
   - [3.1 Mengakses Dashboard Admin](#31-mengakses-dashboard-admin)
   - [3.2 Manajemen Persediaan Bahan Baku (Materials)](#32-manajemen-persediaan-bahan-baku-materials)
   - [3.3 Manajemen Katalog Menu Makanan (Menus)](#33-manajemen-katalog-menu-makanan-menus)
   - [3.4 Manajemen Paket Katering (Packages)](#34-manajemen-paket-katering-packages)
   - [3.5 Penjadwalan Menu Mingguan (Schedules)](#35-penjadwalan-menu-mingguan-schedules)
   - [3.6 Verifikasi Transaksi & Konfirmasi Transaksi](#36-verifikasi-transaksi--konfirmasi-transaksi)
   - [3.7 Sistem Prediksi Penjualan & Bahan Baku (Machine Learning)](#37-sistem-prediksi-penjualan--bahan-baku-machine-learning)
     - [3.7.1 Proses Melatih Model (Training Model)](#371-proses-melatih-model-training-model)
     - [3.7.2 Analisis Akurasi & Feature Importance](#372-analisis-akurasi--feature-importance)
     - [3.7.3 Membaca Prediksi Estimasi Pesanan (Forecast)](#373-membaca-prediksi-estimasi-pesanan-forecast)
     - [3.7.4 Membaca Prediksi Kebutuhan Bahan Baku (Material Forecast)](#374-membaca-prediksi-kebutuhan-bahan-baku-material-forecast)
4. [PANDUAN PEMELIHARAAN SISTEM (MAINTENANCE)](#4-panduan-pemeliharaan-sistem-maintenance)
   - [4.1 Re-indexing Knowledge Base NutriBot](#41-re-indexing-knowledge-base-nutribot)
   - [4.2 Pengisian Data Awal (Seeding Data)](#42-pengisian-data-awal-seeding-data)

---

## 1. PENDAHULUAN

### Tentang Nutrilicious
**Nutrilicious** adalah aplikasi pemesanan catering sehat digital yang dirancang khusus untuk mempermudah masyarakat dalam mengadopsi pola hidup sehat. Aplikasi ini menawarkan menu makanan dengan informasi kandungan gizi yang transparan dan paket berlangganan mingguan maupun bulanan.

Selain fitur transaksi, Nutrilicious dilengkapi dengan dua modul unggulan berbasis kecerdasan buatan:
1. **NutriBot**: Chatbot asisten gizi pribadi berbasis teknologi **RAG (Retrieval-Augmented Generation)** yang dapat menjawab pertanyaan seputar kesehatan, rekomendasi gizi, dan detail menu katering menggunakan basis pengetahuan dokumen ilmiah gizi.
2. **Predictive Analytics (Sales & Material Forecast)**: Modul untuk pihak manajemen/administrator yang memprediksi jumlah penjualan paket katering seminggu ke depan menggunakan algoritma **Random Forest** (Machine Learning), serta secara otomatis memperkirakan berat total kebutuhan bahan baku yang harus dibeli berdasarkan menu yang telah dijadwalkan.

### Teknologi Sistem
Aplikasi ini dikembangkan menggunakan tumpukan teknologi modern:
- **Frontend**: Next.js (React Framework) dengan Tailwind CSS untuk antarmuka yang responsif.
- **Backend API**: Flask (Python) sebagai penyedia layanan API dan mesin komputasi Machine Learning.
- **Database**: MongoDB untuk penyimpanan data transaksi, menu, jadwal, bahan baku, dan data pengguna.
- **AI RAG Stack**: ChromaDB sebagai basis data vektor, Gemini API SDK untuk model pembuat embedding (*gemini-embedding-001*) serta generator teks jawaban.
- **Machine Learning Stack**: Scikit-Learn (Random Forest Regressor), Pandas, NumPy, dan Joblib untuk pengolahan fitur runtun waktu (*time series feature engineering*).

---

## 2. PANDUAN PENGGUNA (PELANGGAN)

Bagian ini menjelaskan langkah-langkah penggunaan aplikasi Nutrilicious dari sisi pelanggan.

### 2.1 Pendaftaran Akun (Sign Up) & Verifikasi Email
Sebelum melakukan transaksi pemesanan katering, pengguna wajib mendaftarkan akun.
1. Buka halaman utama aplikasi Nutrilicious dan klik tombol **Sign Up** atau daftar di pojok kanan atas.
2. Masukkan informasi data diri yang diminta:
   - **Nama Lengkap**
   - **Alamat Email Aktif**
   - **Kata Sandi (Password)** (minimal 8 karakter dengan kombinasi angka dan huruf).
3. Klik tombol **Daftar / Register**.
4. Sistem akan mengirimkan email konfirmasi. Pengguna diminta untuk membuka kotak masuk email yang didaftarkan, lalu klik tautan verifikasi yang dikirimkan untuk mengaktifkan akun.

### 2.2 Masuk ke Akun (Sign In) & Lupa Kata Sandi
1. Kunjungi halaman login di menu **Sign In**.
2. Masukkan **Alamat Email** dan **Kata Sandi** yang telah terdaftar dan terverifikasi.
3. Klik tombol **Sign In**.
4. Jika berhasil, pengguna akan diarahkan kembali ke halaman utama dalam kondisi sudah masuk sistem.
5. **Lupa Kata Sandi**: Jika Anda melupakan kata sandi, klik tautan *Forgot Password?* di bawah form input login. Masukkan email Anda, klik *Kirim Link Reset*, lalu buka email Anda untuk mengikuti langkah pengaturan kata sandi baru.

### 2.3 Menjelajahi Menu & Paket Katering Sehat
1. **Katalog Menu (Menu Catalog)**:
   - Pada Halaman Utama, gulir layar ke bagian **Katalog Menu Sehat**.
   - Pengguna dapat melihat daftar menu harian yang tersedia beserta informasi detail nilai nutrisinya:
     - **Kalori (kcal)**
     - **Protein (gram)**
     - **Karbohidrat (gram)**
     - **Lemak (gram)**
   - Klik kartu menu untuk membaca deskripsi lengkap hidangan dan bahan-bahan utama penyusunnya.
2. **Katalog Paket Katering (Pricing/Packages)**:
   - Gulir ke bagian **Pilihan Paket Langganan**.
   - Tersedia 3 jenis paket utama:
     - **Low Carbs**: Dirancang untuk menurunkan berat badan dengan karbohidrat minimal.
     - **Healthy Food**: Dirancang untuk menjaga metabolisme tubuh tetap prima seimbang.
     - **Muscle Gain**: Dirancang dengan porsi protein tinggi untuk mendukung pembentukan otot.
   - Setiap paket dapat dipilih dalam variasi waktu langganan (misalnya 1 Minggu / 4 Minggu) dan jenis layanan (*Lunch*, *Dinner*, atau *Lunch & Dinner*).

### 2.4 Konsultasi Gizi Menggunakan NutriBot (AI Chatbot RAG)
Pelanggan dapat memanfaatkan asisten kecerdasan buatan untuk berdiskusi mengenai diet dan menu yang tepat.
1. Temukan ikon gelembung percakapan (**NutriBot**) di pojok kanan bawah layar.
2. Klik ikon tersebut untuk membuka jendela percakapan.
3. Ketik pertanyaan Anda pada kolom input pesan yang tersedia. Contoh pertanyaan yang dapat Anda ajukan:
   - *"Apakah paket Low Carbs aman untuk penderita asam lambung?"*
   - *"Menu apa saja yang memiliki protein lebih dari 30 gram di paket Muscle Gain?"*
   - *"Tolong berikan saya tips diet sehat untuk pekerja kantoran."*
4. Tekan tombol **Kirim** atau tekan tombol Enter.
5. NutriBot akan menganalisis pertanyaan Anda, melakukan pencarian ke dokumen jurnal gizi (knowledge base) dan data menu katering, lalu menyajikan jawaban akurat beserta referensi dokumen sumber pencariannya di bagian bawah respons chat.

### 2.5 Keranjang Belanja & Alur Pemesanan (Checkout)
1. Di halaman paket katering, pilih variasi paket sehat yang Anda inginkan (contoh: *Healthy Food*, durasi 1 Minggu, jenis layanan *Lunch & Dinner*).
2. Klik tombol **Add to Cart (Tambah ke Keranjang)**.
3. Ikon keranjang di bagian kanan atas layar akan memperbarui jumlah item. Klik ikon keranjang tersebut untuk melihat ringkasan item belanjaan Anda.
4. Jika pesanan sudah sesuai, klik tombol **Checkout**.
5. Di halaman Checkout:
   - Isi **Alamat Pengiriman Lengkap** (Jalan, Nomor Rumah, RT/RW, Kelurahan, Kecamatan, Kota, Kode Pos).
   - Masukkan **Nomor Handphone/WhatsApp** aktif untuk memudahkan kurir mengantarkan makanan.
   - Periksa kembali ringkasan biaya, termasuk biaya pengiriman dan diskon jika ada.
6. Klik **Place Order (Buat Pesanan)** untuk menyelesaikan proses transaksi.

### 2.6 Riwayat Pesanan & Unggah Bukti Pembayaran
1. Setelah membuat pesanan, Anda akan diarahkan ke halaman detail transaksi atau Anda dapat mengaksesnya lewat menu **Profil > Riwayat Pesanan (Orders)**.
2. Status pesanan awal akan bernilai **Pending**.
3. Lakukan pembayaran dengan mentransfer total nominal tagihan ke rekening bank resmi Nutrilicious yang tertera di halaman instruksi pembayaran.
4. Setelah mentransfer, ambil foto atau tangkapan layar (*screenshot*) bukti pembayaran Anda.
5. Pada halaman riwayat pesanan, klik tombol **Upload Bukti Pembayaran**.
6. Pilih file gambar bukti transfer Anda, kemudian klik **Kirim**.
7. Status pesanan Anda akan berubah menjadi **Paid** (Sudah Dibayar). Anda hanya perlu menunggu pihak admin melakukan verifikasi pembayaran.
8. Status pelacakan pesanan akan diperbarui secara berkala oleh sistem:
   - **Confirmed**: Pembayaran diverifikasi oleh admin, pesanan disiapkan.
   - **Shipped**: Katering sedang dikirim oleh kurir menuju alamat Anda.
   - **Completed**: Katering telah berhasil diterima.

### 2.7 Pengaturan Profil & Alamat
1. Klik menu **Profil** di pojok kanan atas, lalu klik **Pengaturan Akun (Settings)**.
2. Di halaman ini, Anda dapat memperbarui:
   - **Nama Lengkap**
   - **Nomor Telepon**
   - **Alamat Pengiriman Utama/Default** (akan terisi otomatis saat Anda melakukan checkout di masa mendatang).
3. Klik **Simpan Perubahan** untuk memperbarui data ke sistem database.

---

## 3. PANDUAN ADMINISTRATOR (ADMIN)

Bagian ini ditujukan bagi pengelola atau pemilik bisnis katering Nutrilicious untuk memantau bisnis dan memproses data.

### 3.1 Mengakses Dashboard Admin
1. Masuk (*Sign In*) menggunakan akun dengan hak akses **Administrator**.
2. Klik menu **Admin Dashboard** yang muncul pada navigasi atas, atau akses URL secara langsung di `/admin`.
3. Halaman utama Dashboard Admin akan menyajikan:
   - Ringkasan total pendapatan katering bulanan.
   - Jumlah total pesanan yang masuk dan pengguna terdaftar.
   - Grafik perkembangan penjualan mingguan.
   - Daftar transaksi terbaru yang membutuhkan verifikasi pembayaran segera.

### 3.2 Manajemen Persediaan Bahan Baku (Materials)
Menu **Materials** digunakan untuk mencatat dan memantau ketersediaan bahan baku mentah yang digunakan di dapur.
1. Klik menu **Materials** pada sidebar admin.
2. **Tambah Bahan Baku Baru**:
   - Klik tombol **Tambah Bahan Baku** di pojok kanan atas.
   - Isi formulir: **Nama Bahan Baku** (contoh: *Dada Ayam*, *Beras Merah*), **Harga per Gram** (atau per unit), dan **Stok Awal** (dalam gram/unit).
   - Klik **Simpan**.
3. **Ubah Bahan Baku**: Klik ikon edit pada bahan baku yang dipilih, sesuaikan stok atau harga terbaru, lalu klik *Update*.
4. **Hapus Bahan Baku**: Klik ikon hapus (tempat sampah) untuk menghapus bahan baku yang tidak lagi digunakan dari database.

### 3.3 Manajemen Katalog Menu Makanan (Menus)
Menu **Menus** digunakan untuk mengelola resep hidangan sehat yang akan ditawarkan ke pelanggan.
1. Klik menu **Menus** pada sidebar admin.
2. **Tambah Menu Baru**:
   - Klik tombol **Tambah Menu**.
   - Isi formulir dasar: **Judul Menu**, **Deskripsi Singkat**, **Kategori**, dan **Nilai Nutrisi** (Kalori, Protein, Karbohidrat, Lemak).
   - **Pemetaan Resep/Bahan Baku (Ingredients Mapping)**:
     - Di bagian resep, pilih bahan baku (dari data *Materials*) dan masukkan **Jumlah Takaran (Quantity)** per porsi (dalam satuan gram/unit). Contoh: Dada Ayam = 150 gram, Beras Merah = 100 gram.
     - *Catatan*: Pemetaan resep ini sangat penting agar sistem Machine Learning dapat menghitung kebutuhan bahan baku dapur secara otomatis.
   - Unggah foto makanan menggunakan form upload gambar yang terintegrasi dengan Cloudinary.
   - Klik **Simpan Menu**.
3. **Ubah/Hapus Menu**: Serupa dengan manajemen bahan baku, Anda dapat menekan tombol edit untuk menyesuaikan takaran resep, atau tombol hapus jika menu tersebut ditiadakan.

### 3.4 Manajemen Paket Katering (Packages)
Menu **Packages** digunakan untuk mengelola konfigurasi paket berlangganan.
1. Klik menu **Packages** pada sidebar admin.
2. Di sini, admin dapat mengelola 3 paket dasar (*Low Carbs*, *Healthy Food*, *Muscle Gain*).
3. Admin dapat menyesuaikan deskripsi paket, status ketersediaan, serta menyesuaikan skema harga berlangganan berdasarkan durasi (mingguan/bulanan) dan waktu pelayanan (lunch, dinner, lunch & dinner).

### 3.5 Penjadwalan Menu Mingguan (Schedules)
Menu **Menu Schedules** digunakan untuk mengatur menu apa saja yang disajikan ke pelanggan setiap harinya dari hari Senin sampai Sabtu.
1. Klik menu **Menu Schedules** pada sidebar admin.
2. Pilih paket yang ingin diatur jadwalnya (contoh: *Low Carbs*).
3. Anda akan melihat tabel jadwal harian (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu).
4. Untuk setiap hari:
   - Pilih menu makanan sehat untuk porsi Makan Siang (**Lunch Menu**).
   - Pilih menu makanan sehat untuk porsi Makan Malam (**Dinner Menu**).
5. Klik **Simpan Jadwal**. Jadwal ini akan otomatis tampil di katalog pelanggan dan dijadikan basis perhitungan kebutuhan bahan baku dapur.

### 3.6 Verifikasi Transaksi & Konfirmasi Transaksi
Menu **Transactions** digunakan oleh admin untuk memproses pesanan dan memverifikasi pembayaran pelanggan.
1. Klik menu **Transactions** pada sidebar admin.
2. Anda akan melihat daftar semua transaksi pelanggan yang masuk diurutkan dari yang terbaru.
3. Cari transaksi yang berstatus **Paid** (transaksi di mana pelanggan telah mentransfer uang dan mengunggah bukti pembayaran).
4. Klik transaksi tersebut untuk membuka modal detail transaksi:
   - Periksa foto bukti transfer yang diunggah oleh pelanggan.
   - Cocokkan jumlah nominal yang ditransfer dengan total tagihan transaksi.
5. **Verifikasi Pembayaran**:
   - Jika bukti transfer valid, klik tombol **Confirm Payment** (Konfirmasi Pembayaran). Status pesanan akan otomatis berubah dari *Paid* menjadi **Confirmed**, menandakan pesanan siap diproduksi oleh bagian dapur.
   - Jika bukti transfer palsu atau tidak sesuai nominalnya, klik tombol **Reject Payment** (Tolak Pembayaran), beri catatan alasan penolakan, dan status akan kembali ke *Pending*.
6. Setelah pengiriman katering siap dijalankan, admin dapat mengubah status menjadi **Shipped** (Sedang Dikirim) dan kemudian **Completed** (Selesai) setelah kurir selesai mengirimkan.

### 3.7 Sistem Prediksi Penjualan & Bahan Baku (Machine Learning)
Menu **Prediction** adalah modul utama yang menggunakan algoritma kecerdasan buatan untuk meramalkan bisnis.

#### 3.7.1 Proses Melatih Model (Training Model)
Model regresi Random Forest memerlukan latihan menggunakan data transaksi historis agar perkiraan ramalannya akurat.
1. Klik menu **Prediction** di sidebar admin.
2. Temukan bagian **Model Training** atau tombol **Train Model**.
3. Klik tombol **Train Model** tersebut.
4. Backend Flask akan mengambil seluruh data pesanan sukses dari MongoDB, mengekstrak fitur waktu (lag features, rolling mean, seasonality, trend), melatih model dengan GridSearchCV untuk mencari hyperparameter terbaik, dan mengevaluasi hasilnya.
5. Setelah beberapa detik, halaman akan memuat pesan keberhasilan beserta metrik performa model yang baru dilatih.

#### 3.7.2 Analisis Akurasi & Feature Importance
Setelah proses pelatihan selesai, admin dapat menganalisis keandalan model ML di halaman yang sama:
1. **Metrik Evaluasi**:
   - **R² (R-Squared)**: Mengukur seberapa baik model menjelaskan variasi data penjualan (nilai mendekati 1.0 menunjukkan performa yang sangat baik).
   - **MAE (Mean Absolute Error)**: Selisih rata-rata absolut antara jumlah pesanan aktual dan hasil prediksi model (contoh: MAE = 1.2 berarti rata-rata eror prediksi adalah sekitar ±1 porsi paket).
   - **RMSE (Root Mean Squared Error)**: Metrik eror kuadrat untuk mengidentifikasi kesalahan prediksi yang bernilai ekstrem.
2. **Feature Importance (Pentingnya Fitur)**:
   - Sistem akan menyajikan diagram batang atau daftar fitur yang paling berpengaruh dalam menentukan tren penjualan, seperti:
     - *Pesanan 1 Minggu Lalu (lag_1)*
     - *Rata-rata Penjualan 4 Minggu Terakhir (rolling_mean_4)*
     - *Pola Musiman Bulan/Minggu (seasonality)*
     - *Tren Pertumbuhan (trend)*

#### 3.7.3 Membaca Prediksi Estimasi Pesanan (Forecast)
Di bawah bagian evaluasi model, admin dapat melihat tabel **Sales Forecast untuk 1 Minggu ke Depan**:
- Sistem menampilkan perkiraan jumlah porsi paket katering yang akan dipesan pelanggan pada minggu berikutnya.
- Contoh tampilan:
  - *Low Carbs*: Diprediksi laku **45 paket** minggu depan.
  - *Healthy Food*: Diprediksi laku **60 paket** minggu depan.
  - *Muscle Gain*: Diprediksi laku **30 paket** minggu depan.
- Angka prediksi ini digunakan sebagai acuan dasar bagi operasional dapur agar tidak memproduksi berlebihan (mencegah *waste* makanan) atau kekurangan porsi.

#### 3.7.4 Membaca Prediksi Kebutuhan Bahan Baku (Material Forecast)
Berdasarkan hasil prediksi jumlah pesanan paket katering di atas, sistem akan mengurai kebutuhan belanja bahan baku dapur secara otomatis melalui formula matematika yang dikaitkan dengan menu terjadwal:
$$\text{Kebutuhan Bahan Baku Hari } H = \text{Takaran Bahan per Porsi} \times \left( \frac{\text{Prediksi Pesanan Mingguan}}{6 \text{ Hari}} \right)$$

1. Gulir halaman prediksi ke bagian **Material Forecast**.
2. Anda akan disajikan tabel ringkasan **Total Belanja Bahan Baku Mingguan**. Contoh:
   - *Dada Ayam*: Diperkirakan butuh total **20.250 gram (20,25 kg)**.
   - *Beras Merah*: Diperkirakan butuh total **13.500 gram (13,5 kg)**.
   - *Bayam*: Diperkirakan butuh total **4.500 gram (4,5 kg)**.
3. Admin juga dapat melihat tab **Daily Breakdown (Rincian Harian)** untuk mengetahui detail menu yang dimasak pada hari tersebut (Makan Siang & Makan Malam) beserta kebutuhan bahan baku hariannya dari Senin sampai Sabtu.
4. Gunakan tabel belanja ini sebagai daftar belanja (*shopping list*) bahan baku dapur ke penyuplai (*supplier*) setiap akhir pekan untuk kebutuhan operasional minggu depan.

---

## 4. PANDUAN PEMELIHARAAN SISTEM (MAINTENANCE)

Bagian ini menjelaskan prosedur teknis berkala untuk memastikan kelancaran sistem aplikasi.

### 4.1 Re-indexing Knowledge Base NutriBot
RAG AI Chatbot (NutriBot) mencari jawaban dari dokumen PDF yang diunggah di folder server. Jika admin menambahkan file PDF materi nutrisi baru di folder `backend/knowledge_pdfs/`, proses indeks ulang wajib dilakukan:
1. Hubungkan komputer Anda ke terminal/command prompt.
2. Masuk ke direktori backend aplikasi:
   ```bash
   cd backend
   ```
3. Jalankan perintah indexing:
   ```bash
   python index_knowledge.py
   ```
4. Tunggu hingga proses ekstraksi teks dan pembuatan embedding selesai.
5. Setelah berhasil, jumlah chunk baru dalam vector store ChromaDB akan diperbarui dan siap digunakan oleh NutriBot.

### 4.2 Pengisian Data Awal (Seeding Data)
Jika database MongoDB dalam kondisi kosong (instalasi baru) atau ingin mereset data transaksi ke kondisi awal untuk simulasi pengujian skripsi:
1. Buka terminal dan masuk ke folder `backend`.
2. Jalankan perintah seeding data master (menu, bahan baku, paket, jadwal default):
   ```bash
   python seed.py
   ```
3. Jalankan perintah seeding data transaksi historis (untuk melatih model prediksi):
   ```bash
   python seed_transactions.py
   ```
4. Pastikan data berhasil masuk ke MongoDB sebelum Anda menjalankan aplikasi frontend Next.js maupun training model prediksi di admin dashboard.

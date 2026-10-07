# markdown-catalog-editor

<!-- languages -->
<h3 align="center">
<a href="../../README.md">🇬🇧 English</a> ·
<a href="README.zh.md">🇨🇳 中文</a> ·
<a href="README.hi.md">🇮🇳 हिन्दी</a> ·
<a href="README.es.md">🇪🇸 Español</a> ·
<a href="README.fr.md">🇫🇷 Français</a> ·
<a href="README.ar.md">🇸🇦 العربية</a> ·
<a href="README.bn.md">🇧🇩 বাংলা</a> ·
<a href="README.pt.md">🇧🇷 Português</a> ·
<a href="README.ru.md">🇷🇺 Русский</a> ·
<a href="README.ur.md">🇵🇰 اردو</a> ·
<b>🇮🇩 Bahasa Indonesia</b> ·
<a href="README.de.md">🇩🇪 Deutsch</a> ·
<a href="README.ja.md">🇯🇵 日本語</a> ·
<a href="README.tr.md">🇹🇷 Türkçe</a> ·
<a href="README.ko.md">🇰🇷 한국어</a> ·
<a href="README.it.md">🇮🇹 Italiano</a> ·
<a href="README.uk.md">🇺🇦 Українська</a>
</h3>
<!-- /languages -->

Editor Markdown untuk folder catatan lokal — dalam semangat Obsidian, tetapi sepenuhnya
terkandung dalam satu file HTML mandiri. Tidak ada jaringan yang digunakan: file dibaca dari
dan disimpan ke disk secara langsung.

**[Demo online](https://markdown.marketkernel.com/)** — editor yang sama sebagai
PWA (Progressive Web App): dapat dipasang ke sistem dan kemudian berjalan sebagai aplikasi
terpisah, dengan jendela dan ikonnya sendiri, serta bekerja secara offline. Di komputer, di
Chrome, Edge, dan Arc, gunakan tombol pasang di bilah alamat; di Android, menu ⋮ Chrome →
Instal aplikasi; di iOS, Bagikan → Tambahkan ke Layar Utama, di Safari atau di Chrome. Catatan
Anda tetap berada di disk Anda di sana juga, dan aplikasi yang terpasang diperbarui ketika
Anda mengizinkannya — lihat "[GitHub Pages](#github-pages)".

Editor yang sama juga merupakan **Send to Markdown**, sebuah [ekstensi Chrome](#send-to-markdown-ekstensi-chrome):
klik pada tombolnya, atau klik kanan pada sebuah halaman, mengirim halaman — atau pilihan,
tautan, gambar — ke sebuah catatan di folder Anda, dan editor terbuka di samping halaman
tersebut di panel samping Chrome.

![Editor dengan folder catatan yang terbuka: pohon file dan tag di sebelah kiri, sebuah catatan dalam mode edit di sebelah kanan](../macaed.jpg)

```
┌──────────────────────────────────────────────┐
│ Toolbar                                      │
├────────────┬─────────────────────────────────┤
│ File and   │ #tags +                         │
│ folder     │ Document                        │
│ tree       │ (read / edit)                   │
├╌╌╌╌╌╌╌╌╌╌╌╌┤                                 │
│ Tags       │                                 │
└────────────┴─────────────────────────────────┘
```

## Cara menggunakan

1. Build `build/macaed.html` (lihat "[Build](#build)") lalu buka di peramban.
2. "Buka folder" → pilih folder berisi file `.md`. Anda juga bisa langsung menyeret folder
   itu ke jendela.
3. Saklar **Baca / Edit** di bagian atas, atau `⌘E`.

Di Chrome, Edge, dan Arc, folder dibuka melalui File System Access API: catatan dibaca dan
ditulis langsung di tempatnya, dan membuat, mengganti nama, serta menghapus file dan folder
semuanya berfungsi. Di Safari dan Firefox folder dibuka hanya-baca, dan `⌘S` menawarkan untuk
mengunduh file yang telah diubah — begitu juga di ponsel: Chrome di Android tidak memiliki
File System Access, dan setiap peramban di iOS, termasuk Chrome, berjalan di atas mesin
Safari.

Editor mengingat enam folder terakhir yang dibuka di sana (sebuah halaman tidak pernah
mengetahui jalur sebuah folder, sehingga ia menyimpan handle folder itu di IndexedDB
peramban), beserta catatan yang terakhir dibuka di masing-masing. Pada saat berikutnya
dimulai, folder terakhir terbuka dengan sendirinya jika peramban masih mengizinkannya —
dalam aplikasi yang terpasang, atau setelah Anda memilih "Izinkan di setiap kunjungan". Jika
tidak, layar awal menampilkan daftar folder terbaru: satu klik, dan peramban meminta akses
lagi. Untuk kembali ke daftar itu — untuk berpindah folder atau membuka folder baru — klik
nama folder di bagian atas panel file, atau "Tutup folder" di pengaturan; × menghapus sebuah
folder dari daftar.

Jika Anda meletakkan `macaed.html` di sebelah catatan Anda dan menyajikannya lewat HTTP,
halaman tersebut akan mengambil folder itu dengan sendirinya — asalkan ada `index.json` di
sampingnya, dengan bentuk `{ "name": "Notes", "files": ["Note.md", "Folder/Other.md"] }`.

## Send to Markdown: ekstensi Chrome

`npm run build` juga menulis `build/extension/`: editor sebagai ekstensi Chrome, dan
`build/macaed-extension-<version>.zip` miliknya untuk Chrome Web Store; sebuah rilis juga
menyertakan zip tersebut. Untuk memasangnya: `chrome://extensions` → Mode pengembang → Load
unpacked → `build/extension` (atau zip yang telah diekstrak).

Editor itu sendiri berada di panel samping Chrome, di sebelah halaman, dalam tata letak
ponsel, karena panel ini sempit; editor tetap di sana lintas tab. Sebuah folder dibuka di
dalamnya seperti pada file, dan folder terbaru diingat — milik ekstensi sendiri, terpisah
dari milik file atau PWA. Yang ditambahkan oleh ekstensi adalah mengirim hal-hal dari web ke
catatan Anda:

- **Tombol bilah alat** (atau `Alt+Shift+M`) mengirim halaman: teks utamanya — artikelnya,
  tanpa menu, bilah sisi, footer, tombol berbagi, formulir, dan bagian tersembunyi milik
  situs — atau, ketika ada yang dipilih di dalamnya, hanya bagian yang dipilih itu.
- **Menu konteks** pada sebuah halaman memiliki **Kirim halaman ke Markdown**; pada teks
  yang dipilih, **Kirim pilihan ke Markdown**; pada tautan, **Kirim tautan ke Markdown**;
  pada gambar, **Kirim gambar ke Markdown**.

Keduanya membuka panel samping, dan sebuah dialog di sana menampilkan apa yang datang —
halaman, pilihan, tautan, atau gambar, dan dari situs mana — sebagai Markdown yang masih
dapat Anda ubah, serta menanyakan ke mana tujuannya:

- **Catatan baru**, pilihan bawaan untuk sebuah halaman: di folder kliping (`Clippings` di
  root kecuali Anda mengubahnya; folder ini diingat, kosong berarti root), dinamai sesuai
  judul halaman, dengan apa yang tidak bisa ditampung nama file dihilangkan. Nama yang sudah
  dipakai mendapat angka, `Title 2.md`. Catatan dimulai dengan front matter — judul halaman,
  alamatnya, dan harinya — lalu teksnya; catatan terbuka begitu tersimpan.

  ```markdown
  ---
  title: "The page's title"
  source: "https://example.com/post"
  clipped: 2026-10-07
  ---

  # The page's title

  The text…
  ```

- **Akhir catatan yang terbuka**, pilihan bawaan untuk pilihan teks, tautan, atau gambar:
  setelah baris kosong, diikuti baris `— [The page's title](https://…)` yang menautkan ke
  asalnya. Sebuah tautan tidak memerlukan itu: ia adalah sumbernya sendiri.

Jika dikirim sebelum folder dibuka, ia menunggu: panel meminta sebuah folder, dan dialog
muncul begitu satu folder terbuka. Halaman yang tidak dapat dibaca oleh ekstensi — halaman
Chrome sendiri, Web Store, sebuah PDF — datang sebagai tautan ke halaman itu.

**Inilah isi Markdown-nya.** Judul, paragraf, **tebal**, *miring*, ~~coret~~, ==sorot==,
`kode`, tautan dan gambar dengan alamat lengkapnya, daftar — bersarang, bernomor, tugas —
kutipan, blok kode dengan bahasanya (dari `language-…`, `highlight-source-…` milik GitHub,
dan sejenisnya), tabel (jeda baris dalam sel sebagai `<br>`, seperti cara editor menulisnya),
pembatas. Teks terbaca apa adanya: sebuah `*`, `#` di awal baris, atau `<b>` yang diketik di
halaman akan di-escape, sehingga tidak pernah berubah menjadi format, dan tidak ada HTML dari
halaman yang masuk ke catatan. Gambar tetap berada di web, ditautkan lewat alamatnya; alamat
asli dari gambar lazy diambil, bukan placeholder-nya, dan tracking pixel dihilangkan.

**Izin.** `activeTab`: klik pada tombol, di menu, atau pada pintasan memberi ekstensi akses
ke satu tab itu saja, dan baru setelah itu ekstensi membacanya — dengan `scripting`, sebuah
fungsi dijalankan di halaman yang menyalin teksnya lalu mengembalikannya. Tidak ada content
script yang berjalan di mana pun, dan tidak ada akses ke situs mana pun selain itu: tidak ada
`host_permissions`, yang ditolak oleh proses build. `contextMenus`, `sidePanel`, dan
`storage` — worker menyerahkan apa yang diambilnya ke panel pada jendelanya lewat
`chrome.storage.session`, yang hilang saat peramban ditutup, dan bahasa panel diteruskan ke
worker, untuk menu, lewat `chrome.storage.local`. Halaman-halaman ekstensi memiliki
`connect-src 'none'`: editor tidak menjangkau apa pun di jaringan; proses build memeriksa hal
ini, dan memastikan tidak ada halaman yang memiliki skrip inline atau alamat luar.

**Cara pembuatannya.** Panel adalah halaman itu sendiri: `panel.html` dengan skripnya di
`panel.js`, sebagaimana diinginkan Manifest V3 — `src/main.ts` yang sama, dengan
`src/extension/extension.ts` menggantikan `src/platform.ts`, yang hook-nya tidak melakukan
apa pun pada file dan PWA. Worker, `background.js`, memiliki tombol, pintasan, dan menu.
Chrome hanya membuka panel samping di dalam handler klik itu sendiri, sebelum apa pun
di-await, sehingga worker membuka panel terlebih dahulu lalu membaca tab setelahnya
(`src/extension/grab.ts`); panel mengubah HTML itu menjadi Markdown
(`src/extension/to-markdown.ts`) dan editor menanyakan ke mana tujuannya (`src/clip-ui.ts`,
`src/clip.ts`).

## Pratinjau langsung

Dalam mode edit, dokumen tetap terformat, dan hanya blok tempat kursor berada yang berubah
menjadi Markdown mentah. Sebuah blok adalah sebuah paragraf, judul, seluruh daftar, blok
kode, atau kutipan: sebuah daftar tidak terurai baris demi baris. Tabel diedit dengan cara
berbeda — lihat "[Tabel](#tabel)".

Baris sumber mempertahankan ukuran huruf, ketebalan, dan tinggi baris dari versi
terformatnya, sehingga teks tidak melompat: `# Heading` ditampilkan pada ukuran judul. Hal
ini diperiksa secara otomatis — ketika sebuah blok dialihkan, tepi atasnya bergeser kurang
dari satu piksel pada tingkat zoom berapa pun dari 50 hingga 200 %.

Ada satu tempat di mana tinggi memang berubah, dan itu tidak dapat dihindari untuk mode ini:
sebuah blok kode mendapat dua baris pagar `` ``` ``. Blok-blok di sekitarnya tidak bergeser
dalam proses ini — hanya yang ada di bawahnya yang berpindah.

Enter di luar sebuah daftar memulai blok baru. Jika ditekan di akhir sebuah blok, atau pada
baris kosong, ia membuka sebuah baris kosong di bawahnya dan menaruh kursor di sana; ditekan
lagi, ia menambahkan satu lagi. Dalam Markdown, satu baris kosong hanya memisahkan dua blok,
sehingga baris kosong yang bisa Anda ketiki adalah baris yang diapit baris kosong di kedua
sisinya — editor menambahkan baris pemisah itu sendiri, dan teks yang diketik tidak pernah
menempel ke blok tetangganya. Baris semacam ini dan definisi referensi tautan
(`[id]: https://…`) hanya ditampilkan dalam mode edit; tampilan baca merender Markdown apa
adanya.

## Tabel

Sebuah tabel tidak pernah berubah menjadi `| pipa |`. Sebuah klik hanya membuka sel di bawah
penunjuk, dan sel itu menampilkan teksnya sendiri — `**bold**` alih-alih tebal — sehingga
pemformatan inline dan tanda, tautan, serta warna dari bilah alat tetap berfungsi di
dalamnya. Mengetik hanya menulis ulang sel itu di dalam file; sisa tabel tetap mempertahankan
padding dan perataannya.

- **Berpindah**: Tab dan Shift+Tab pergi ke sel berikutnya dan sebelumnya, Enter ke sel di
  bawahnya, tanda panah ke sel tetangga di tepi teks — dan melewati tepi tabel menuju blok di
  sebelahnya. Enter pada baris terakhir memulai blok baru di bawah tabel.
- **Jeda baris**: Ctrl+Enter (juga ⌘Enter atau Shift+Enter) memulai baris baru di dalam sel.
  Satu baris tabel adalah satu baris Markdown, sehingga jeda ditulis sebagai `<br>`; sel yang
  sedang diedit menampilkannya sebagai jeda baris sungguhan, dan teks yang ditempel
  mempertahankan barisnya dengan cara yang sama. Di dalam sel dengan beberapa baris, panah
  atas dan bawah berpindah di antara barisnya terlebih dahulu. Teks sel diratakan ke atas.
- **Menambah**: dalam mode edit, mengarahkan kursor ke sebuah tabel menampilkan sebuah bilah
  dengan **+** di bawahnya, yang menambahkan baris, dan satu di sebelah kanannya, yang
  menambahkan kolom. Tab pada sel terakhir juga menambahkan baris.
- **Menghapus**: hanya baris dan kolom kosong yang dihapus, sehingga tidak ada teks yang
  hilang karena salah klik. Mengarahkan kursor ke baris kosong menampilkan **×** di sebelah
  kirinya, ke kolom kosong **×** di atasnya. Backspace pada sel kosong melakukan hal yang
  sama dari keyboard: ia menghapus baris jika seluruh baris kosong, atau kolom jika seluruh
  kolom kosong (termasuk header); sebuah tabel yang tidak ada lagi teks di dalamnya dihapus
  secara keseluruhan. Baris header tetap ada — sebuah tabel membutuhkannya.

Menambah atau menghapus menulis ulang tabel dalam bentuk `| a | b |` biasa.

## Tag

Tag mengelompokkan catatan lintas folder. Tag tidak ditulis ke dalam catatan: Markdown-nya
tetap persis seperti semula, dan semua tag dari folder tersebut hidup dalam satu file di
samping catatan-catatan itu.

- **Pada sebuah catatan**: tag-tag berada di bawah judul sebagai chip `#tag`, diikuti sebuah
  **+**. **+** berubah menjadi sebuah kolom isian; Enter menambahkan tag, dan **+** muncul
  kembali setelahnya. Tag yang sudah digunakan di folder tersebut disarankan saat Anda
  mengetik. Esc membatalkan; meninggalkan kolom dengan teks di dalamnya juga menambahkan
  tag. **×** pada sebuah chip menghapus tag, dan klik pada chip membuka halaman tag tersebut.
  Tag dapat diubah baik dalam mode baca maupun edit.
- **Ejaan**: `#` di depan dihilangkan dan spasi di dalam tag berubah menjadi tanda hubung,
  sehingga `#to do` disimpan sebagai `to-do`. Sebuah tag yang hanya berbeda huruf besar/kecil
  dari tag yang sudah ada akan mengikuti ejaan yang sudah ada — `Idea` dan `idea` tidak
  pernah menjadi dua tag. Sebuah catatan tidak bisa memiliki tag yang sama dua kali.
- **Bersarang**: `/` membuat tag bersarang. `work/alpha` dan `work/beta` berada di bawah
  `work` dalam pohon tag, dan sebuah catatan yang ditandai `work/alpha` juga dihitung di
  bawah `work`.
- **Pohon tag**: bagian di bawah panel file, terpisah dari pohon file. Setiap tag
  menampilkan berapa banyak catatan yang memilikinya atau memiliki tag yang bersarang di
  bawahnya; panah pada tag induk melipat anak-anaknya, dan judulnya melipat seluruh bagian
  itu. Filter nama di atas pohon file juga memfilter tag. Bagian ini mengambil hingga 42 %
  dari panel dan menggulir di dalamnya; menyeret garis di atasnya membuatnya lebih rendah
  (tidak pernah lebih tinggi), klik ganda pada garis itu mengembalikan ruangnya, dan dengan
  garis itu difokuskan, ↑ dan ↓ melakukan hal yang sama. Tingginya diingat.
- **Halaman sebuah tag**: mengklik sebuah tag di pohon, atau sebuah chip, menampilkan
  catatan-catatan yang memilikinya — sebuah tag induk juga mendaftar catatan dari setiap tag
  di bawahnya. Setiap baris memberikan nama catatan, foldernya, dan semua tagnya; klik pada
  nama membuka catatan, klik pada sebuah tag membuka tag tersebut. Halaman ini hanya-baca:
  tidak ada yang bisa diedit di sana, dan bilah alat pemformatan dimatikan. Untuk tag yang
  bersarang, induk-induk dalam judulnya tertaut ke halaman mereka sendiri.
- **Mengganti nama dan menghapus**: tag mengikuti sebuah catatan, atau setiap catatan dalam
  sebuah folder, ketika diganti nama atau dihapus dari panel file. Sebuah catatan yang
  dipindahkan atau dihapus di luar editor tetap menyimpan entrinya di dalam file, tetapi
  entri itu tidak ditampilkan atau dihitung selama catatan tersebut hilang.
- **Folder hanya-baca** (Safari, Firefox): tag-tag ditampilkan, tetapi **+** dan **×** tidak.

### `.meta.json`

File ini berada di root folder yang terbuka dan dibuat bersama tag pertama. File ini tidak
pernah ditampilkan di pohon file.

```json
{
  "notes": {
    "Ideas.md": { "tags": ["idea", "work/alpha"] },
    "Projects/Roadmap.md": { "tags": ["work/alpha", "planning"] }
  }
}
```

Kunci-kuncinya adalah jalur catatan relatif terhadap root, seperti yang ditampilkan pohon
file; tag-tag mempertahankan urutan saat ditambahkan. File ini ditulis dengan catatan-catatan
diurutkan berdasarkan jalur dan indentasi dua spasi, sehingga terbaca baik dalam sebuah diff,
dan catatan yang tidak lagi memiliki tag dihapus darinya. Field yang tidak dikenal editor —
di bagian atas atau di dalam entri sebuah catatan — dipertahankan saat file ditulis kembali,
sehingga alat lain dapat menyimpan datanya sendiri di dalamnya. Jika file ini bukan objek
JSON yang valid, editor akan memberitahukannya, tidak menampilkan tag, dan tidak akan pernah
menimpanya; tag tidak dapat diubah sampai file diperbaiki dan folder dibuka kembali.

Ketika folder disajikan lewat HTTP dengan sebuah `index.json` (lihat
"[Cara menggunakan](#cara-menggunakan)"), cantumkan `.meta.json` di antara file-filenya agar
tag ditampilkan.

## Ekspor ke HTML

Tombol ekspor pada bilah alat (di sebelah Simpan) mengubah seluruh folder menjadi situs
statis; **Ekspor ke HTML…** pada menu konteks sebuah folder melakukan hal yang sama hanya
untuk folder itu, dan pada ruang kosong di bawah pohon untuk seluruh folder. Situs ditulis ke
`output/<folder>/` di root folder catatan; folder ini dinamai sesuai saat ekspor dilakukan,
`2025-12-31_23-33-33`, dan dapat diganti namanya dalam dialog. `output` tidak pernah
ditampilkan di pohon. Hanya folder yang dibuka untuk penulisan yang dapat diekspor.

Selama ekspor berjalan, dialog menampilkan tahap yang sedang dikerjakan — membaca catatan,
menulis halaman, menyalin gambar — dengan sebuah bilah kemajuan, dan tidak dapat ditutup;
**Hentikan** mengakhirinya setelah file-file yang sudah berjalan selesai, meninggalkan apa
yang sudah tertulis sejauh itu. Tombol ekspor dan item menu dimatikan sampai prosesnya
selesai. File dibaca dan ditulis beberapa sekaligus, setiap folder di sepanjang jalan dibuat
sekali. Di akhir, ekspor membaca kembali folder dari disk: jika ada file yang hilang, dialog
menyebutkan berapa banyak dan menamai salah satunya, alih-alih melaporkan keberhasilan atas
folder yang kosong.

**Buat situs statis** — aktif secara bawaan — membuat satu halaman per catatan, seperti
dijelaskan di bawah. Jika dimatikan, ekspor menjadi satu halaman tunggal, `index.html`,
berisi semua catatan di dalamnya: panel kiri adalah daftar isi, setiap catatan adalah sebuah
bagian dengan namanya di atasnya, judul-judulnya satu tingkat lebih rendah dan id-nya diberi
awalan nama catatan tersebut, sehingga tautan antarcatatan dan ke judul-judulnya menjadi
anchor pada halaman. Halaman menampilkan satu catatan pada satu waktu — yaitu yang ditunjuk
atau dituju oleh `#anchor` pada alamat, dan pada awalnya root `index` atau `README`, jika
tidak ada maka catatan pertama di root. Daftar isi, tautan, hasil pencarian, dan tautan
**sebelumnya** / **berikutnya** di akhir setiap catatan beralih di antara mereka. Ini
dilakukan dengan CSS (`:target`), sehingga tetap berfungsi tanpa skrip juga; skrip hanya
menandai catatan yang sedang tampil pada daftar isi. Mencetak menampilkan semua catatan.
Pencarian bawaan peramban (`⌘F`) hanya melihat catatan yang sedang tampil — kolom pencarian
menelusuri semuanya. Dengan tag, pohon tag pada panel dan chip pada catatan mengarah ke
bagian tag di akhir, sebuah judul per tag beserta catatan-catatannya. Halaman ini satu file:
stylesheet dan skripnya ditulis ke dalamnya. Hanya gambar yang berada di sampingnya,
dikumpulkan dalam sebuah folder `assets` yang mempertahankan folder asalnya tetapi tanpa
langkah `assets` milik masing-masing catatan: `docs/assets/Guide/a.png` menjadi
`assets/docs/Guide/a.png`. Halaman tunggal ini memiliki pencarian, tombol tema, tombol
**perluas semua** / **ciutkan semua**, dan panel yang bisa diubah ukurannya, sama seperti
sebuah situs; pencarian membaca catatan langsung dari halaman, dan sebuah hasil melompat ke
catatannya.

Lebar teks dan nama catatan di atasnya mengikuti pengaturan editor pada saat ekspor
dilakukan: **Lebar teks** yang diatur ke panel penuh menghasilkan halaman lebar penuh, dan
dengan **Tampilkan nama catatan sebagai judul** dimatikan, tidak ada nama yang ditambahkan di
atas catatan.

Halaman-halaman membawa semua teksnya dan tautan relatif biasa, tanpa ada yang dimuat
belakangan: situs terbuka dari URL `file://`, dari server web mana pun, dan untuk mesin
pencari — setiap halaman memiliki `<title>`, sebuah `<meta name="description">` yang diambil
dari paragraf pertamanya, sebuah `lang`, dan satu `<h1>`. Folder-folder pada navigasi dilipat
dengan `<details>`; tema mengikuti sistem.

Satu skrip kecil, `site.js`, menambahkan apa yang tidak bisa dilakukan HTML saja:

- **Pencarian**: sebuah kolom di bagian atas panel kiri. Kolom ini mencari setiap kata yang
  diketik dalam nama, folder, dan teks catatan; hasilnya menggantikan posisi pohon — nama
  yang cocok tampil lebih dulu, masing-masing dengan cuplikan di sekitar kata yang ditemukan,
  ditandai — dan pohon kembali ketika kolom dikosongkan (Esc). Enter membuka hasil pertama,
  ↓ dan ↑ menelusuri daftar. Teksnya berasal dari `search.js`, yang dimuat oleh skrip saat
  kolom pertama kali digunakan, sehingga halaman itu sendiri tetap seringan semula.
- **Perluas semua** dan **ciutkan semua** di sebelah "Catatan" di atas navigasi.
- Sebuah tombol **tema** di sebelah nama situs: bulan beralih ke tema gelap, matahari kembali
  ke tema terang, apa pun yang disukai sistem. Sampai ditekan, tema mengikuti sistem.
- Sebuah gagang pada tepi kanan panel yang membuatnya lebih lebar atau lebih sempit
  (160–560 px; klik ganda mengembalikan nilai bawaan, ← → menggerakkannya saat gagang itu
  difokuskan).

Tema, lebar kolom, dan keadaan folder diingat dari halaman ke halaman, per situs; folder dari
halaman yang sedang ditampilkan selalu terbuka. Tanpa skrip — diblokir, atau dihilangkan dari
templat — kolom pencarian, tombol-tombol, dan gagang tersebut sederhananya tidak ada, tema
mengikuti sistem, dan situs tetap terbaca dan bertaut dengan cara yang sama.

- **Halaman**: `dir/Note.md` menjadi `dir/Note.html`. Catatan yang dimulai dengan judul yang
  sama dengan namanya memiliki judul itu sebagai judul halamannya, dengan tag-tagnya di
  bawahnya. Catatan root bernama `index` atau `README` menjadi halaman depan, `index.html`;
  jika tidak ada, halaman depan mendaftar catatan dan tag. `[teks](other.md)` dan
  `[[wiki link]]` menunjuk ke halaman-halaman, `[[Note#Heading]]` ke judulnya — setiap judul
  memiliki id — dan tautan ke catatan yang tidak ada dalam ekspor tetap berupa teks biasa.
  Kotak centang tugas ditampilkan, tidak dapat diklik. Front matter dihilangkan.
- **Gambar**: setiap gambar dan PDF dalam folder disalin pada jalur yang sama, sehingga baik
  `![[image.png]]` maupun `![alt](path.png)` tetap berfungsi; sebuah sisipan ditemukan di
  tempat yang sama seperti editor menemukannya.
- **Tag**: dengan kotak **Ekspor tag** aktif, setiap halaman menampilkan tagnya, pohon tag
  berada di bawah navigasi, dan satu halaman per tag mendaftar catatan-catatannya — sebuah
  tag induk mendaftar catatan dari setiap tag di bawahnya — ditambah sebuah indeks tag di
  `tags/index.html`. Hanya catatan dalam ekspor yang dihitung.
- **Templat**: dialog menampilkan templat halaman; edit di sana atau **Kembalikan ke
  bawaan**, dan ini diingat. Templat berupa HTML dengan `{{placeholder}}`:

  | Placeholder | Artinya |
  | --- | --- |
  | `{{navigation}}` | pohon folder sebagai `<nav>`, halaman saat ini ditandai — wajib |
  | `{{heading}}` | `<h1>` halaman, kosong jika catatan dibuka dengan miliknya sendiri — wajib |
  | `{{content}}` | catatan sebagai HTML — wajib |
  | `{{tags}}` | pohon tag sebagai `<nav>`; wajib jika tag diekspor, kosong jika tidak |
  | `{{pagetags}}` | tag catatan sebagai chip `#` yang tertaut ke halamannya |
  | `{{title}}` | nama halaman sebagai teks biasa, untuk `<title>` |
  | `{{site}}` | nama folder yang diekspor |
  | `{{description}}` | paragraf pertama, teks biasa, untuk `<meta name="description">` |
  | `{{width}}` | `full` atau `column`, dari pengaturan lebar teks |
  | `{{root}}` | `../` per folder tempat halaman berada, sehingga `{{root}}style.css` mencapai root |
  | `{{styles}}` | stylesheet: sebuah `<link>` ke `style.css`, atau seluruh `<style>` pada halaman tunggal |
  | `{{script}}` | skrip: sebuah `<script src>` untuk `site.js`, atau seluruh `<script>` pada halaman tunggal |
  | `{{theme}}` | tombol terang/gelap |
  | `{{path}}` | jalur catatan, `docs/Note.md` |
  | `{{lang}}` | bahasa antarmuka, untuk `<html lang>` |

  Sebuah situs mendapat `style.css`, `site.js`, dan `search.js` di rootnya, baik templatnya
  memakainya atau tidak; halaman tunggal membawa stylesheet dan skripnya di dalam, dan
  mendapat sebuah `style.css` di sampingnya hanya jika templatnya, dari sebelum ada
  `{{styles}}`, masih menautkan satu. Stylesheet bawaan menata catatan seperti tampilan baca
  milik editor dan membaca lebar dari `<html data-width="{{width}}">`. Sebuah placeholder
  yang tidak dikenal oleh ekspor dibiarkan apa adanya. Sebuah templat yang disimpan sebelum
  placeholder baru muncul tidak memakainya: **Kembalikan ke bawaan** akan membawanya masuk.

## Privasi dan keamanan

- **Halaman tidak menjangkau apa pun.** Sebuah Content-Security-Policy dalam file ini membuat
  kodenya tidak bisa mengambil apa pun selain file di sampingnya pada server yang sama
  (`connect-src 'self'`, untuk folder yang disajikan dengan sebuah `index.json`), dan tidak
  mengirim formulir apa pun ke mana pun. Proses build gagal jika kebijakan ini hilang atau
  ada referensi eksternal yang menyelip masuk. Salinan milik PWA mengizinkan manifestnya dan
  service worker-nya, keduanya dari origin-nya sendiri.
- **Skrip dalam catatan tidak pernah berjalan.** Catatan boleh memuat HTML — begitulah cara
  warna teks bekerja — sehingga kebijakan ini hanya mengizinkan tepat satu skrip, milik
  editor sendiri, lewat hash-nya: sebuah `onerror` pada `<img>` atau sebuah `<script>` dalam
  catatan tidak melakukan apa-apa.
- **Apa pun yang ditautkan sebuah catatan di web dimuat dari sana**: sebuah gambar, video,
  atau frame tersemat dengan alamat `https://`, seperti pada penampil Markdown mana pun — itu
  adalah pilihan catatan, bukan pilihan editor. Permintaan semacam itu tidak membawa
  `Referer`.
- **File tetap berada di disk Anda.** Catatan dibaca dan ditulis langsung di tempatnya lewat
  File System Access API; folder yang diingat adalah handle dalam IndexedDB peramban, bukan
  jalur atau isinya.
- Izin milik ekstensi: lihat "[Send to Markdown](#send-to-markdown-ekstensi-chrome)".

## Fitur

- **Pohon file**: folder yang dapat dilipat, filter berdasarkan nama, membuat, mengganti
  nama, dan menghapus lewat menu konteks, panel yang dapat diubah ukurannya, panel yang dapat
  disembunyikan (`⌘\`).
- **Memformat pilihan**: judul H1–H3, tebal, miring, coret, monospace, sorot `==…==`, warna
  teks dan latar belakang, tautan, `[[wiki link]]`, daftar, tugas, kutipan, blok kode, tabel,
  pembatas.
- **Markup**: CommonMark ditambah tabel, tugas dengan kotak centang yang dapat diklik,
  `==highlight==`, `[[wiki link]]`, front matter, penyorotan sintaks untuk 19 bahasa, gambar
  dari folder.
- **Gambar**: `![alt](assets/Note/image-1.png)` menampilkan sebuah gambar lewat jalurnya dari
  folder catatan. `![[assets/Note/image-1.png]]` ala Obsidian juga berfungsi, jalur dari
  folder catatan atau jika tidak dari root (`![[…|300]]` mengatur lebarnya). Sebuah sisipan
  lama dengan nama polos, `![[image-1.png]]`, dicari di folder gambar pada pengaturan, dengan
  dan tanpa subfolder catatan, di `assets/<nama catatan>/`, di samping catatan, lalu di mana
  pun dalam folder berdasarkan namanya, seperti yang dilakukan Obsidian. Folder gambar mulai
  dalam keadaan terlipat di pohon. Mengganti nama sebuah catatan juga mengganti nama folder
  gambarnya dan mengubah tautan catatan ke gambar-gambarnya, dalam kedua bentuk, ke jalur
  yang baru. Sebuah gambar yang diklik di pohon terbuka sebagai gambar, bukan sebagai teks.
- **Menambahkan gambar**: tombol gambar pada bilah alat memilih file gambar; sebuah gambar
  yang ditempel dengan `⌘V` — sebuah tangkapan layar, gambar yang disalin di peramban, file
  yang disalin di pengelola file — masuk dengan cara yang sama. Keduanya disimpan ke folder
  gambar di samping catatan, `assets/<nama catatan>/` secara bawaan, dan dimasukkan sebagai
  Markdown biasa dengan jalurnya, `![image-1](assets/<nama catatan>/image-1.png)`, yang
  ditampilkan oleh editor mana pun (spasi dalam jalur ditulis `%20`): pada posisi kursor,
  atau di akhir catatan jika tidak ada blok yang terbuka. Gambar yang diseret ke catatan
  masuk di tempat dijatuhkannya: pada titik itu dalam sebuah blok atau sel tabel, dan di
  samping teks atau di antara dua blok, di akhir blok di atasnya; menjatuhkan dalam mode baca
  beralih ke mode edit, dan menjatuhkan di luar catatan menambahkan gambar di akhir.
  Menjatuhkan sesuatu yang berisi folder tetap membuka foldernya. Sebuah tangkapan layar yang
  ditempel dinamai `image-1.png`, `image-2.png`, dan seterusnya; file yang dipilih
  mempertahankan namanya sendiri, dengan angka ditambahkan jika nama itu sudah dipakai. Sel
  yang disalin dari spreadsheet ditempel sebagai teks, bukan sebagai gambar yang
  menyertainya. Hanya folder yang dibuka untuk penulisan yang menerima gambar baru.
- **Tag**: tag bersarang pada catatan, sebuah pohon tag dan satu halaman per tag, disimpan
  terpisah dari catatan dalam `.meta.json` — lihat "[Tag](#tag)".
- **Ekspor ke HTML**: folder, atau salah satu subfoldernya, sebagai situs statis dengan
  pencarian, atau sebagai satu halaman — lihat "[Ekspor ke HTML](#ekspor-ke-html)".
- **Send to Markdown**: sebuah halaman, pilihan, tautan, atau gambar dari Chrome ke sebuah
  catatan, sebagai Markdown — lihat "[Send to Markdown](#send-to-markdown-ekstensi-chrome)".
- **Pengaturan** (ikon roda gigi di kanan atas, di sebelah pencarian): bahasa antarmuka,
  tema (sistem, terang, gelap), zoom 50–200 %, lebar teks (kolom di tengah atau panel penuh),
  apakah nama catatan ditampilkan sebagai judul, dan ke mana gambar yang ditambahkan
  disimpan: folder gambar di samping catatan (`assets` secara bawaan) dan apakah setiap
  catatan mendapat subfoldernya sendiri di dalamnya; tanpa itu, semua gambar langsung masuk
  ke folder tersebut. Di bagian bawah, versinya — dan pada aplikasi yang terpasang,
  pemeriksaan pembaruan dan apakah akan memasangnya secara otomatis.
- **Bahasa**: Inggris dan 16 lainnya — 中文, हिन्दी, Español, Français, العربية, বাংলা,
  Português, Русский, اردو, Bahasa Indonesia, Deutsch, 日本語, Türkçe, 한국어, Italiano,
  Українська. Secara bawaan, antarmuka mengikuti bahasa peramban. Dalam bahasa Arab dan Urdu,
  bingkai antarmuka dicerminkan dari kanan ke kiri; catatan itu sendiri mempertahankan
  arahnya sendiri.
- **Ponsel**: pada layar yang lebih sempit dari 720 px, panel file menggeser masuk di atas
  catatan — ☰ membukanya, memilih sebuah catatan atau mengetuk di sampingnya menutupnya —
  dan bilah alat muat dalam satu baris; pemformatan mendapat baris kedua hanya dalam mode
  edit. Ekspor tidak disertakan di sana. Pada layar sentuh, kolom-kolom berukuran setidaknya
  16 px, sehingga iOS tidak memperbesar ke dalamnya, dan baris-baris pada pohon lebih tinggi.
  Tata letak desktop dan lebar panel yang diingatnya tidak terpengaruh.
- Penyimpanan otomatis satu detik setelah sebuah pengeditan, urungkan dan ulangi, pencarian
  dalam catatan.
- Bahasa, tema, zoom, lebar teks, lebar panel, tinggi panel tag, dan catatan terakhir yang
  dibuka diingat.

## Pintasan keyboard

| Aksi | Tombol |
| --- | --- |
| Mode baca / edit | `⌘E` |
| Simpan | `⌘S` |
| Cari dalam catatan | `⌘F` |
| Panel file | `⌘\` |
| Zoom | `⌘+` · `⌘−` · `⌘0` |
| Tebal · miring · tautan | `⌘B` · `⌘I` · `⌘K` |
| Monospace · sorot · wiki link | `⌘⇧C` · `⌘⇧H` · `⌘⇧K` |
| Judul 1–6 · teks biasa | `⌘⌥1`…`⌘⌥6` · `⌘⌥0` |
| Urungkan · ulangi | `⌘Z` · `⌘⇧Z` |
| Indentasi daftar | `Tab` · `⇧Tab` |
| Keluar dari blok | `Esc` |

## Terjemahan

Teks bahasa Inggris tetap ada dalam kode: `t('tree', 'Delete')`, `tn('status', '{count} word',
'{count} words', n)`, dan `data-i18n="context"` / `data-i18n-attr="context"` dalam templat.
Argumen pertama adalah konteks — bagian antarmuka tempat sebuah string berada, sehingga kata
bahasa Inggris yang sama dapat diterjemahkan berbeda di dua tempat. Sebuah kamus,
`src/locales/<code>.json`, memetakan konteks → teks bahasa Inggris → terjemahan:

```json
{
  "tree": { "Delete": "Удалить" },
  "status": { "{count} words": { "one": "{count} слово", "few": "{count} слова", "many": "{count} слов", "other": "{count} слова" } }
}
```

Sebuah string yang tidak ada dalam kamus ditampilkan dalam bahasa Inggris. Teks dengan angka
memiliki satu bentuk per kategori jamak bahasa tersebut (`Intl.PluralRules`), dengan kunci
berupa bentuk jamak bahasa Inggrisnya. `npm run i18n` mendaftar, per bahasa, string yang
belum diterjemahkan dan yang sudah tidak lagi digunakan; `npm test` memeriksa bahwa setiap
terjemahan mempertahankan placeholder bahasa Inggris dan memiliki semua bentuk jamaknya.

Apa yang ditampilkan Chrome tentang ekstensi itu sendiri — namanya dan deskripsinya, judul
tombol bilah alat — mengikuti bahasa peramban, bukan bahasa panel, lewat `chrome.i18n`.
Teks-teks itu adalah teks bahasa Inggris dalam `src/extension/manifest.json`, diterjemahkan
dalam kamus yang sama di bawah konteks `manifest`; proses build menulisnya ke
`_locales/<code>/messages.json` dan menaruh `__MSG_appName__` serta sejenisnya ke dalam
manifest. Chrome memiliki kodenya sendiri dan mengabaikan sisanya: `pt` menjadi `pt_BR` dan
`pt_PT`, `zh` menjadi `zh_CN`, dan Urdu tidak memilikinya, sehingga di sana Chrome
mendeskripsikan ekstensi dalam bahasa Inggris. Proses build berhenti pada nama lebih dari 75
karakter atau deskripsi lebih dari 132 karakter. Menu konteks berbicara dalam bahasa panel
begitu panel telah dibuka, dan bahasa peramban sebelum itu.

README ini juga diterjemahkan: `docs/readme/README.<code>.md`, satu per bahasa, dengan
daftar bahasa di bagian atas masing-masing. Sebuah perubahan di sini juga berlaku untuk
terjemahan-terjemahannya.

## Build

```sh
./build.sh         # installs the dependencies if needed, then builds
npm install
npm run build      # -> build/macaed.html, build/pages/, build/extension/ and its zip
npm run watch      # rebuild on changes in src/ and assets/
npm run typecheck  # tsc --noEmit
npm test           # the block model, formatting, Markdown syntax, tags, the export, clippings and the dictionaries
npm run test:browser  # in headless Chrome: the editor, HTML → Markdown, the PWA, the extension
npm run i18n       # strings each dictionary lacks or no longer needs
npm run check      # typecheck, test, build and test:browser in a row: green means done
```

`build.mjs` menggabungkan `src/main.ts` dengan esbuild menjadi sebuah IIFE dan
menyisipkannya, bersama gaya (styles) dan ikon (sebuah data URI), ke dalam
`src/template.html`; templat dan stylesheet ekspor digabungkan sebagai string.
Content-Security-Policy pada templat mendapat hash dari satu skrip itu. Hasilnya adalah
`build/macaed.html`, sekitar 620 KB. Proses build gagal jika bahkan satu referensi eksternal
tertinggal di dalamnya.

Proses yang sama menulis `build/pages/`: halaman itu sebagai PWA yang dapat dipasang —
`index.html` dengan tautan manifest dan sebuah `<meta name="service-worker">` yang memberi
tahu halaman untuk mendaftarkan worker-nya, `manifest.webmanifest`, ikon-ikon, dan `sw.js`,
yang menyimpan cache halaman agar dapat dibuka secara offline. `build/macaed.html` sendiri
tetap menjadi satu file tunggal tanpa referensi eksternal.

Dan `build/extension/`: `panel.html` — templatnya, skripnya di `panel.js` — `background.js`,
ikon-ikon, `_locales/`, dan `manifest.json`, yang versinya mengikuti milik `package.json`.
`build/macaed-extension-<version>.zip` menyimpan file-file yang sama dengan tanggal yang
tetap: sumber yang sama menghasilkan byte yang sama.

Pengujian peramban memulai Chrome lokal (`CHROME=/path/to/chrome` untuk memilih salah satu)
dan berbicara dengan protokol DevTools ke sana, tanpa dependensi; tanpa Chrome, pengujian ini
dilewati. `tools/test-extension.mjs` memuat ekstensi lewat protokol itu
(`Extensions.loadUnpacked` lewat sebuah pipe; `--load-extension` sudah tidak ada lagi di
Chrome sejak versi 137), membuka sebuah folder di panel samping, dan mengirimkan halaman,
pilihan, tautan, dan gambar dari situs uji pada server lokal kepadanya. Baik tombol bilah
alat maupun menu konteks tidak dapat diklik dari DevTools, sehingga pengujian memicu
`onClicked` milik worker secara langsung; tanpa klik sungguhan, Chrome tidak memberikan
`activeTab`, sehingga salinan yang diuji mungkin menjangkau situs uji, `*.test`, sebagai host
permission.

## Versi dan rilis

Versi ditulis di satu tempat, `package.json`. Proses build memasukkannya ke dalam halaman
(baris di bawah layar awal, bagian bawah pengaturan), ke dalam `manifest.json` milik
ekstensi, dan ke dalam nama cache PWA. Sebuah build dari commit yang ditandai `v<version>`
menampilkannya apa adanya; selain itu menambahkan commit-nya, `0.11.0+1a2b3c4`, sehingga
sebuah halaman dari `main` di GitHub Pages tidak dikira sebagai rilis. `version` milik Chrome
hanya berisi angka, sehingga di sana commit-nya masuk ke `version_name`.

```sh
npm version minor           # 0.11.0 -> 0.12.0: package.json, package-lock.json, a commit and the tag v0.12.0
git push --follow-tags      # the tag starts .github/workflows/release.yml
```

Alur kerja rilis berhenti jika tag dan `package.json` tidak sesuai, menjalankan pengujian,
lalu melampirkan `macaed-<tag>.html`, `macaed-extension-<tag>.zip`, dan `SHA256SUMS.txt`.

## GitHub Pages

`.github/workflows/pages.yml` membangun dan menguji setiap push ke `main` dan men-deploy
`build/pages/` ke GitHub Pages (Settings → Pages → Source: GitHub Actions), di
<https://marketkernel.github.io/markdown-catalog-editor/>. Di Chrome, Edge, dan Arc, tombol
pasang di bilah alamat mengubahnya menjadi jendela aplikasi terpisah; di iOS yaitu Bagikan →
Tambahkan ke Layar Utama. Folder terbuka dengan cara yang sama seperti pada file tunggal.

**Offline.** Setelah dibuka, editor bekerja tanpa koneksi: service worker menyimpan halaman,
manifest, dan ikonnya dalam sebuah cache yang dinamai sesuai versinya, dan menyajikan halaman
dari sana. Catatan tidak pernah melewatinya — catatan berada di disk Anda.

**Pembaruan.** Setiap deploy mengubah `sw.js`, sehingga peramban menemukan worker baru dengan
sendirinya — saat diluncurkan dengan koneksi, setiap beberapa jam selama aplikasi tetap
terbuka, ketika koneksi kembali, atau ketika Pengaturan → Periksa pembaruan diminta. Worker
baru mengunduh versinya ke dalam cache miliknya sendiri lalu menunggu; worker yang sedang
berjalan tetap menyajikan halaman lama, offline juga, sehingga tidak ada yang berubah di
tengah pekerjaan Anda. Pengaturan, dengan sebuah titik pada tombolnya, dan layar awal
kemudian mengatakan "Versi … sudah siap. Perbarui": Perbarui menyimpan catatan yang terbuka
(atau bertanya, jika tidak dapat disimpan), membiarkan worker baru masuk dan memuat ulang
halaman, yang sekali mengatakan bahwa halaman telah diperbarui; cache lama dihapus. Tanpa
tombol itu, versi baru dimulai begitu setiap jendela aplikasi telah ditutup — atau, dengan
"Pasang pembaruan secara otomatis saat semua tersimpan dan aplikasi berada di latar belakang"
dicentang pada pengaturan, segera setelah tidak ada yang belum tersimpan dan jendelanya tidak
terlihat.

Itu juga menjadi kompromisnya: sebuah PWA yang terpasang menjalankan apa pun yang ditaruh
oleh deploy terakhir, sementara sebuah file yang diunduh tetap pada versinya. Untuk sebuah
versi yang tetap di disk, ambil `macaed-<tag>.html` dari sebuah rilis dan bandingkan dengan
`SHA256SUMS.txt`.

Aplikasi yang terpasang meminta peramban untuk menjaga penyimpanannya
(`navigator.storage.persist()`): disk yang hampir penuh jika tidak bisa mengambil salinan
offline dan folder yang diingat bersamanya.

`npm run test:browser` juga membuka `build/pages/` (`tools/test-pwa.mjs`): service worker
mengambil alih halaman, Chrome mendapati manifestnya dapat dipasang, dan dengan server mati
halaman tetap dimuat; lalu sebuah pemeriksaan tidak menemukan apa pun, lalu tidak ada
koneksi, lalu sebuah deploy baru, yang menunggu sampai Perbarui membiarkannya masuk.

## Tata letak

```
src/template.html   markup with the __STYLES__/__APP__/__ICON__ placeholders and the CSP
src/styles.css      palette, light and dark themes, block paired with its source
src/main.ts         opening a folder, saving, toolbar, search, settings
src/vault.ts        File System Access API, drag-and-drop, webkitdirectory; file CRUD
src/editor.ts       live preview: active block, caret, Enter, joining, undo
src/blocks.ts       splitting the document into blocks by markdown-it tokens
src/format.ts       toolbar actions as pure text transforms
src/markdown.ts     markdown-it: ==highlight==, [[wiki links]], ![[embeds]], tasks, code highlighting
src/tree.ts         folder and file tree
src/meta.ts         .meta.json: tags per note, the tag tree, renames and deletes
src/tags.ts         the tag tree, the tags under a note's title, a tag's page
src/export.ts       the static site: pages, navigation, tag pages, links between them
src/export-ui.ts    the export dialog and its progress
src/export-script.ts   site.js: search, expand/collapse all and the resizable column on the exported site
src/export-template.html, src/export.css   the default page template and its stylesheet
src/settings.ts     localStorage: language, theme, zoom, panel width, last note
src/i18n.ts         t()/tn(), the language list and flags, translating the page's markup
src/locales/        one dictionary per language
src/ui.ts           dialogs, context menu, popover, notifications
src/update.ts       the installed app's updates: the waiting worker, its version, Update
src/platform.ts     what the page does beyond itself: nothing, except in the extension
src/clip.ts         what the extension sends, as a note: file name, front matter, the end of a note
src/clip-ui.ts      the dialog that asks where it goes
src/pwa/sw.js       the service worker of the Pages build: offline, and a new version waits
src/extension/      "Send to Markdown": manifest.json; background.ts (button, shortcut, menu);
                    grab.ts (run in the page: its text or the selection); to-markdown.ts
                    (HTML → Markdown); extension.ts (in the place of platform.ts); messages.ts
tools/              build helpers (load.mjs, i18n.mjs, chrome.mjs) and the tests: block model,
                    formatting, tags, the export, clippings, dictionaries; in headless Chrome
                    the editor, HTML → Markdown, the PWA and the extension
assets/             icon.svg; pwa/ its PNG sizes for the PWA; extension/ the extension's icons
docs/               the README screenshot and its translations, docs/readme/
build/macaed.html   the build output
build/pages/        the PWA for GitHub Pages
build/extension/    the Chrome extension, and build/macaed-extension-<version>.zip of it
```

## Keterbatasan

- Pengeditan kolaboratif, plugin, sinkronisasi, dan grafik tautan tidak didukung.
- Pada ponsel, tata letak dibuat untuk membaca: menu konteks pada pohon file membutuhkan
  tekan lama yang tidak dipicu oleh iOS, dan tabel diperluas dengan bilah yang muncul saat
  diarahkan kursor (hover).
- Hanya peramban berbasis Chromium yang dapat menulis file.
- Ekstensi ini untuk Chrome (dan peramban yang dibangun di atasnya dengan panel samping,
  seperti Edge); belum tersedia di Chrome Web Store. Ekstensi ini membiarkan gambar tetap di
  web alih-alih mengunduhnya ke dalam folder: itu akan membutuhkan akses ke setiap situs.

## Lisensi

MIT — lihat [LICENSE](../../LICENSE).

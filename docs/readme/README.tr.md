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
<a href="README.id.md">🇮🇩 Bahasa Indonesia</a> ·
<a href="README.de.md">🇩🇪 Deutsch</a> ·
<a href="README.ja.md">🇯🇵 日本語</a> ·
<b>🇹🇷 Türkçe</b> ·
<a href="README.ko.md">🇰🇷 한국어</a> ·
<a href="README.it.md">🇮🇹 Italiano</a> ·
<a href="README.uk.md">🇺🇦 Українська</a>
</h3>
<!-- /languages -->

Yerel bir not klasörü için bir Markdown düzenleyicisi — Obsidian'ın ruhuyla, ama tamamen
tek bir bağımsız HTML dosyasının içinde. Hiçbir ağ kullanılmaz: dosyalar doğrudan diskten
okunur ve diske kaydedilir.

**[Çevrimiçi demo](https://markdown.marketkernel.com/)** — aynı düzenleyici bir PWA
(Progressive Web App) olarak: sisteme kurulabilir ve ardından kendi penceresi ve simgesiyle
ayrı bir uygulama olarak çalışır, çevrimdışı da işler. Bilgisayarda, Chrome, Edge ve
Arc'ta, adres çubuğundaki kurulum düğmesini kullanın; Android'de Chrome'un ⋮ menüsü →
Uygulamayı yükle; iOS'ta Paylaş → Ana Ekrana Ekle, Safari'de veya Chrome'da. Notlarınız
orada da diskinizde kalır, ve kurulu uygulama siz söylediğinizde güncellenir — bkz.
„[GitHub Pages](#github-pages)“.

Aynı düzenleyici aynı zamanda **Send to Markdown**'dur, bir
[Chrome uzantısı](#send-to-markdown-chrome-uzantısı): düğmesine bir tıklama veya bir
sayfaya sağ tıklama, sayfayı — ya da seçimi, bir bağlantıyı, bir görseli — klasörünüzdeki
bir nota gönderir, ve düzenleyici Chrome'un yan panelinde sayfanın yanında açılır.

![Bir not klasörü açıkken düzenleyici: solda dosya ağacı ve etiketler, sağda düzenleme modunda bir not](../macaed.jpg)

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

## Nasıl kullanılır

1. `build/macaed.html` dosyasını oluşturun (bkz. „[Build](#build)“) ve bir tarayıcıda açın.
2. „Klasör aç“ → `.md` dosyaları içeren bir klasör seçin. Klasörü doğrudan pencereye de
   sürükleyebilirsiniz.
3. Üstteki **Okuma / Düzenleme** anahtarı, veya `⌘E`.

Chrome, Edge ve Arc'ta klasör, File System Access API üzerinden açılır: notlar doğrudan
yerinde okunur ve yazılır, ve dosya ile klasör oluşturma, yeniden adlandırma ve silme
işlemlerinin hepsi çalışır. Safari ve Firefox'ta klasör salt okunur olarak açılır, ve `⌘S`
değiştirilen dosyayı indirmeyi önerir — telefonlarda da böyledir: Android'de Chrome'da File
System Access yoktur, ve iOS'taki her tarayıcı, Chrome dahil, Safari'nin motoru üzerinde
çalışır.

Düzenleyici orada açılan son altı klasörü hatırlar (bir sayfa bir klasörün yolunu asla
öğrenmez, bu yüzden klasörün tanıtıcısını tarayıcının IndexedDB'sinde saklar), ve her
birinde en son açık olan notu. Sonraki başlangıçta, tarayıcı hâlâ izin veriyorsa son
klasör kendiliğinden açılır — kurulu bir uygulamada, veya „Her ziyarette izin ver“i
seçtiğinizde. Aksi takdirde başlangıç ekranı son kullanılan klasörleri listeler: bir
tıklama, ve tarayıcı yeniden erişim ister. O listeye geri dönmek için — klasörleri
değiştirmek veya yenisini açmak için — dosya panelinin üstündeki klasör adına veya
ayarlardaki „Klasörü kapat“a tıklayın; × bir klasörü listeden kaldırır.

`macaed.html` dosyasını notlarınızın yanına koyup HTTP üzerinden sunarsanız, sayfa klasörü
kendiliğinden fark eder — yanında `{ "name": "Notes", "files": ["Note.md",
"Folder/Other.md"] }` biçiminde bir `index.json` bulunması koşuluyla.

## Send to Markdown: Chrome uzantısı

`npm run build`, `build/extension/`'ı da yazar: düzenleyiciyi bir Chrome uzantısı olarak,
ve Chrome Web Mağazası için `build/macaed-extension-<version>.zip`'ini; bir sürüm (release)
zip'i de içerir. Yüklemek için: `chrome://extensions` → Geliştirici modu → Paketlenmemiş
öğe yükle → `build/extension` (veya paketi açılmış zip).

Düzenleyicinin kendisi Chrome'un yan panelinde yaşar, sayfanın yanında, telefon
düzeninde de, çünkü panel dardır; sekmeler arasında orada kalır. Bir klasör içinde dosyada
olduğu gibi açılır, ve son kullanılan klasörler hatırlanır — uzantının kendi klasörleri,
dosyanın veya PWA'nın klasörlerinden ayrı. Uzantının eklediği şey, web'den notlarınıza bir
şeyler göndermektir:

- **Araç çubuğu düğmesi** (veya `Alt+Shift+M`) sayfayı gönderir: ana metnini — sitenin
  menüleri, kenar çubukları, alt bilgisi, paylaşım düğmeleri, formları ve gizli bölümleri
  olmadan makaleyi — veya, üzerinde bir şey seçiliyse, yalnızca seçimi.
- Bir sayfanın **bağlam menüsünde** **Sayfayı Markdown'a gönder** vardır; seçili metinde
  **Seçimi Markdown'a gönder**; bir bağlantıda **Bağlantıyı Markdown'a gönder**; bir
  görselde **Görseli Markdown'a gönder**.

İkisi de yan paneli açar, ve oradaki bir iletişim kutusu neyin geldiğini gösterir — sayfa,
seçim, bağlantı veya görsel, ve hangi siteden — hâlâ değiştirebileceğiniz Markdown olarak,
ve nereye gideceğini sorar:

- **Yeni bir not**, bir sayfa için varsayılan: kırpma klasöründe (siz değiştirmediğiniz
  sürece kökte `Clippings`; klasör hatırlanır, boş olması kök anlamına gelir), sayfanın
  başlığından adlandırılmış, bir dosya adının tutamayacağı şeyler çıkarılmış olarak. Zaten
  alınmış bir ad bir numara alır, `Title 2.md`. Not, ön bilgiyle (front matter) başlar —
  sayfanın başlığı, adresi ve gün — ve ardından metinle; kaydedildikten sonra açılır.

  ```markdown
  ---
  title: "The page's title"
  source: "https://example.com/post"
  clipped: 2026-10-07
  ---

  # The page's title

  The text…
  ```

- **Açık notun sonu**, bir seçim, bağlantı veya görsel için varsayılan: boş bir satırdan
  sonra, nereden geldiğine bağlantı veren bir `— [Sayfanın başlığı](https://…)` satırı
  izler. Bir bağlantının buna ihtiyacı yoktur: o kendi kaynağıdır.

Bir klasör açılmadan önce bir şey gönderilirse bekler: panel bir klasör ister, ve iletişim
kutusu biri açıldığında gelir. Uzantının okuyamayabileceği bir sayfa — Chrome'un kendi
sayfaları, Web Mağazası, bir PDF — ona bir bağlantı olarak gelir.

**Markdown'ın ne olduğu.** Başlıklar, paragraflar, **kalın**, *italik*, ~~üstü çizili~~,
==vurgulu==, `kod`, tam adresleriyle bağlantılar ve görseller, listeler — iç içe,
numaralı, görevler — alıntılar, dilleriyle kod blokları (`language-…`'dan, GitHub'ın
`highlight-source-…`'ından ve benzerlerinden), tablolar (bir hücredeki satır sonu, editörün
yazdığı gibi `<br>` olarak), ayırıcılar. Metin kendisi olarak okunur: satır başındaki bir
`*`, bir `#` veya sayfaya yazılmış bir `<b>` kaçışlanır, böylece hiçbir zaman biçimlendirmeye
dönüşmez, ve sayfanın hiçbir HTML'i nota girmez. Görseller web'de kalır, adresleriyle
bağlantılı; tembel (lazy) bir görselin yer tutucusu yerine gerçek adresi alınır, izleme
pikselleri dışarıda bırakılır.

**İzinler.** `activeTab`: düğmeye, menüde veya kısayola bir tıklama uzantıya yalnızca o
sekmeyi verir, ve ancak o zaman onu okur — `scripting` ile, sayfada çalışan ve metnini
kopyalayıp döndüren bir işlev. Hiçbir yerde bir içerik betiği (content script) çalışmaz, ve
başka türlü hiçbir siteye erişim yoktur: `host_permissions` yok, ki build bunu zaten
reddeder. `contextMenus`, `sidePanel` ve `storage` — işçi (worker), aldığını
`chrome.storage.session` üzerinden kendi penceresinin paneline verir, tarayıcı kapandığında
kaybolur, ve panelin dili, menü için `chrome.storage.local`'de işçiye gider. Uzantının
sayfalarında `connect-src 'none'` vardır: düzenleyici ağda hiçbir şeye ulaşmaz; build bunu
ve hiçbir sayfada satır içi bir betik veya dış bir adres olmadığını denetler.

**Nasıl yapıldığı.** Panel sayfanın kendisidir: `panel.html`, betiği `panel.js`'de, Manifest
V3'ün istediği gibi — aynı `src/main.ts`, `src/platform.ts`
yerine `src/extension/extension.ts` ile, ki onun kancaları dosyada ve PWA'da hiçbir şey
yapmaz. İşçi, `background.js`, düğmeyi, kısayolu ve menüyü içerir. Chrome bir yan paneli
yalnızca tıklamanın kendi işleyicisi içinde, herhangi bir şey beklenmeden (await) önce açar,
bu yüzden işçi önce paneli açar, sonra sekmeyi okur (`src/extension/grab.ts`); panel o
HTML'i Markdown'a dönüştürür (`src/extension/to-markdown.ts`) ve düzenleyici nereye
gideceğini sorar (`src/clip-ui.ts`, `src/clip.ts`).

## Canlı önizleme

Düzenleme modunda belge biçimlendirilmiş kalır, ve yalnızca imlecin bulunduğu blok ham
Markdown'a dönüşür. Bir blok; bir paragraf, bir başlık, bütün bir liste, bir kod bloğu veya
bir alıntıdır: bir liste satır satır dağılmaz. Tablolar farklı düzenlenir — bkz.
„[Tablolar](#tablolar)“.

Kaynak satırı, biçimlendirilmiş olanın yazı tipi boyutunu, kalınlığını ve satır yüksekliğini
korur, böylece metin sıçramaz: `# Başlık` başlık boyutunda gösterilir. Bu otomatik olarak
denetlenir — bir blok değiştirildiğinde, üst kenarı 50 ile 200 % arasındaki her yakınlaştırma
düzeyinde bir pikselden daha az hareket eder.

Yüksekliğin gerçekten değiştiği bir yer vardır, ve bu mod için kaçınılmazdır: bir kod bloğu
`` ``` ``'dan iki sınır satırı kazanır. Komşu bloklar bu süreçte sarsılmaz — yalnızca altta
kalan kayar.

Bir listenin dışında Enter yeni bir blok başlatır. Bir bloğun sonunda veya boş bir satırda
basıldığında, altında boş bir satır açar ve imleci üzerine koyar; tekrar basıldığında bir
tane daha ekler. Markdown'da tek bir boş satır yalnızca iki bloğu ayırır, bu yüzden
yazabileceğiniz boş bir satır her iki tarafında da boş satırlar olan bir satırdır —
düzenleyici ayırıcı satırı kendisi ekler, ve yazılan metin komşu bloğa asla yapışmaz. Bu
tür satırlar ve bağlantı referans tanımları (`[id]: https://…`) yalnızca düzenleme modunda
gösterilir; okuma görünümü Markdown'ı olduğu gibi işler.

## Tablolar

Bir tablo asla `| pipes |`'a dönüşmez. Bir tıklama yalnızca işaretçinin altındaki hücreyi
açar, ve hücre kendi metnini gösterir — kalın yazı yerine kaynağı `**kalın**` olarak —
böylece satır içi biçimlendirme ve araç çubuğunun işaretleri, bağlantıları ve
renkleri içinde yine de çalışır. Yazmak dosyada yalnızca o hücreyi yeniden yazar; tablonun
geri kalanı dolgusunu ve hizalamasını korur.

- **Taşıma**: Tab ve Shift+Tab sonraki ve önceki hücreye gider, Enter alttaki hücreye, ok
  tuşları metnin kenarındaki komşu hücreye — ve tablonun kenarının ötesinde yanındaki bloğa
  geçer. Son satırda Enter, tablonun altında yeni bir blok başlatır.
- **Satır sonları**: Ctrl+Enter (ayrıca ⌘Enter veya Shift+Enter) hücre içinde yeni bir
  satır başlatır. Bir tablo satırı bir Markdown satırıdır, bu yüzden satır sonu `<br>`
  olarak yazılır; düzenlenmekte olan hücre bunu gerçek bir satır sonu olarak gösterir, ve
  yapıştırılan metin satırlarını aynı şekilde korur. Birkaç satırlı bir hücre içinde, yukarı
  ve aşağı ok tuşları önce onun satırları arasında hareket eder. Hücre metni üste
  hizalanmıştır.
- **Ekleme**: düzenleme modunda, bir tablonun üzerine gelmek, altında bir satır ekleyen
  **+** ve sağında bir sütun ekleyen bir **+** ile bir çubuk gösterir. Son hücrede Tab da
  bir satır ekler.
- **Silme**: yalnızca boş satırlar ve sütunlar silinir, böylece bir kaymayla metin
  kaybedilmez. Boş bir satırın üzerine gelmek solunda bir **×**, boş bir sütunun üzerine
  gelmek üstünde bir **×** gösterir. Boş bir hücrede Backspace klavyeden aynısını yapar:
  bütün satır boşsa satırı siler, değilse bütün sütun boşsa (başlık dahil) sütunu siler;
  içinde hiç metin kalmamış bir tablo tamamen silinir. Başlık satırı kalır — bir tablonun
  buna ihtiyacı vardır.

Ekleme veya silme, tabloyu düz `| a | b |` biçiminde yeniden yazar.

## Etiketler

Etiketler, notları klasörler arasında gruplar. Notların içine yazılmazlar: Markdown tam
olarak olduğu gibi kalır, ve klasörün tüm etiketleri notların yanındaki tek bir dosyada
yaşar.

- **Bir not üzerinde**: etiketler başlığın altında `#etiket` çipleri olarak durur, ardından
  bir **+** gelir. **+**, bir alana dönüşür; Enter etiketi ekler, ve ardından **+** yeniden
  görünür. Klasörde zaten kullanılan etiketler yazdıkça önerilir. Esc iptal eder; içinde
  metin varken alandan çıkmak da etiketi ekler. Bir çip üzerindeki **×** etiketi kaldırır,
  ve çipe bir tıklama etiketin sayfasını açar. Etiketler hem okuma hem düzenleme modunda
  değiştirilebilir.
- **Yazım**: baştaki bir `#` düşer, ve bir etiket içindeki boşluklar tireye dönüşür, bu
  yüzden `#to do`, `to-do` olarak saklanır. Mevcut bir etiketten yalnızca büyük/küçük harf
  bakımından farklı bir etiket, onun yazımını alır — `Idea` ve `idea` asla iki etiket
  olmaz. Bir not aynı etiketi iki kez taşıyamaz.
- **İç içe geçme**: `/` etiketleri iç içe yerleştirir. `work/alpha` ve `work/beta`, etiket
  ağacında `work`'ün altında durur, ve `work/alpha` ile etiketlenmiş bir not `work` altında
  da sayılır.
- **Etiket ağacı**: dosya panelinin altındaki bölüm, dosya ağacından ayrı tutulur. Her
  etiket, onu veya altında iç içe bir etiketi kaç notun taşıdığını gösterir; bir üst
  etiketin oku çocuklarını katlar, ve başlık bütün bölümü katlar. Dosya ağacının üzerindeki
  ad filtresi etiketleri de filtreler. Bölüm panelin %42'sine kadar yer kaplar ve içinde
  kaydırılır; üzerindeki çizgiyi sürüklemek onu alçaltır (asla yükseltmez), çizgiye çift
  tıklama alanı geri verir, ve çizgi odaklanmışken ↑ ve ↓ aynısını yapar. Yükseklik
  hatırlanır.
- **Bir etiketin sayfası**: ağaçta bir etikete veya bir çipe tıklamak, onu taşıyan notları
  gösterir — bir üst etiket, altındaki her etiketin notlarını da listeler. Her satır notun
  adını, klasörünü ve tüm etiketlerini verir; ada tıklamak notu açar, bir etikete tıklamak
  o etiketi açar. Sayfa salt okunurdur: üzerinde düzenlenecek hiçbir şey yoktur, ve
  biçimlendirme araç çubuğu kapalıdır. İç içe bir etiket için, başlığındaki üstler kendi
  sayfalarına bağlantı verir.
- **Yeniden adlandırma ve silme**: etiketler, dosya panelinden yeniden adlandırıldığında
  veya silindiğinde bir notu, ya da bir klasördeki her notu izler. Düzenleyicinin dışında
  taşınan veya silinen bir not, dosyadaki girdisini korur, ama girdi, not kayıpken
  gösterilmez veya sayılmaz.
- **Salt okunur klasörler** (Safari, Firefox): etiketler gösterilir, ama **+** ve **×**
  gösterilmez.

### `.meta.json`

Dosya, açık klasörün kökünde durur ve ilk etiketle oluşturulur. Dosya ağacında asla
gösterilmez.

```json
{
  "notes": {
    "Ideas.md": { "tags": ["idea", "work/alpha"] },
    "Projects/Roadmap.md": { "tags": ["work/alpha", "planning"] }
  }
}
```

Anahtarlar, ağacın gösterdiği gibi köke göre not yollarıdır; etiketler eklendikleri sırayı
korur. Dosya, yola göre sıralanmış notlarla ve iki boşluklu girintiyle yazılır, bu yüzden
bir diff'te iyi okunur, ve hiç etiketi kalmayan notlar dosyadan düşürülür. Düzenleyicinin
bilmediği alanlar — üstte veya bir notun girdisi içinde — dosyayı geri yazarken korunur, bu
yüzden diğer araçlar kendi verilerini içinde saklayabilir. Dosya geçerli bir JSON nesnesi
değilse, düzenleyici bunu belirtir, hiçbir etiket göstermez ve onun üzerine asla yazmaz;
dosya düzeltilip klasör yeniden açılana kadar etiketler değiştirilemez.

Klasör bir `index.json` ile HTTP üzerinden sunulduğunda (bkz. „[Nasıl
kullanılır](#nasıl-kullanılır)“), etiketlerin görünmesi için `.meta.json`'ı dosyaları
arasında listeleyin.

## HTML'ye dışa aktarma

Araç çubuğundaki dışa aktarma düğmesi (Kaydet'in yanında) tüm klasörü statik bir siteye
dönüştürür; bir klasörün bağlam menüsündeki **HTML'ye dışa aktar…** yalnızca o klasör için
aynısını yapar, ve ağacın altındaki boş alanda tüm klasör için. Site, not klasörünün
kökünde `output/<klasör>/`'e yazılır; klasör, dışa aktarma anına göre adlandırılır,
`2025-12-31_23-33-33`, ve iletişim kutusunda yeniden adlandırılabilir. `output` ağaçta asla
gösterilmez. Yalnızca yazma için açılmış bir klasör dışa aktarılabilir.

Dışa aktarma çalışırken, iletişim kutusu bulunduğu adımı gösterir — notlar okunuyor,
sayfalar yazılıyor, görseller kopyalanıyor — bir ilerleme çubuğuyla, ve kapatılamaz;
**Durdur**, zaten başlamış dosyalardan sonra onu bitirir, o ana kadar yazılanı bırakarak.
Dışa aktarma düğmesi ve menü öğesi bitene kadar kapalıdır. Dosyalar aynı anda birkaçı
okunur ve yazılır, yol üzerindeki her klasör bir kez oluşturulur. Sonunda dışa aktarma,
klasörü diskten geri okur: herhangi bir dosya eksikse, iletişim kutusu boş bir klasörde
başarı bildirmek yerine kaçının eksik olduğunu söyler ve birini adlandırır.

**Statik site oluştur** — varsayılan olarak açık — aşağıda açıklandığı gibi not başına bir
sayfa oluşturur. Kapalıyken, dışa aktarma tek bir sayfadır, `index.html`, içinde her not
ile: sol panel bir içindekiler tablosudur, her not adı üstünde olan bir bölümdür,
başlıkları bir seviye alçaktır ve id'leri notunkiyle öne eklenmiştir, böylece notlar
arasındaki ve başlıklarına olan bağlantılar sayfada çapalara (anchor) dönüşür. Sayfa aynı
anda bir not gösterir — adresin `#anchor`'ının işaret ettiği veya içine işaret ettiği, ve
başlangıçta kök `index` veya `README`, yoksa kökteki ilk not. İçindekiler tablosu,
bağlantılar, arama sonuçları ve her notun sonundaki **önceki** / **sonraki** bağlantıları
aralarında geçiş yapar. Bu CSS'te yapılır (`:target`), bu yüzden betik olmadan da çalışır;
betik yalnızca gösterilen notu içindekiler tablosunda işaretler. Yazdırma her notu
gösterir. Tarayıcının kendi bulma işlevi (`⌘F`) yalnızca gösterilen notu görür — arama
alanı hepsini tarar. Etiketlerle, paneldeki etiket ağacı ve notlardaki çipler, sonunda bir
etiketler bölümüne götürür, her etiket için notlarıyla bir başlık. Sayfa tek bir dosyadır:
stil sayfası ve betik içine yazılır. Yalnızca görseller yanında durur, geldikleri
klasörleri koruyan ama her notun kendi `assets` adımını korumayan bir `assets` klasöründe
toplanmış: `docs/assets/Guide/a.png`, `assets/docs/Guide/a.png` olur. Tek sayfa, bir site
ile aynı aramaya, tema düğmesine, **tümünü genişlet** / **tümünü daralt** düğmelerine ve
yeniden boyutlandırılabilir panele sahiptir; arama notları doğrudan sayfadan okur, ve bir
sonuç kendi notuna atlar.

Metin genişliği ve üstündeki not adı, dışa aktarma anındaki düzenleyici ayarlarını izler:
**Metin genişliği**, panelin tamamına ayarlanmışsa tam genişlikte sayfalar verir, ve
**Not adını başlık olarak göster** kapalıyken notların üstüne hiçbir ad eklenmez.

Sayfalar tüm metinlerini ve düz göreli bağlantılarını taşır, sonradan hiçbir şey
yüklenmeden: site bir `file://` URL'sinden, herhangi bir web sunucusundan ve bir arama
motoru için açılır — her sayfanın bir `<title>`'ı, ilk paragrafından alınmış bir
`<meta name="description">`'ı, bir `lang`'ı ve bir `<h1>`'i vardır. Gezinmedeki klasörler
`<details>` ile katlanır; tema sistemi izler.

Küçük bir betik, `site.js`, yalnızca HTML'in yapamayacağı şeyleri ekler:

- **Arama**: sol panelin üstünde bir alan. Notların adlarında, klasörlerinde ve
  metinlerinde yazılan her kelimeyi arar; sonuçlar ağacın yerini alır — önce eşleşen
  adlar, her biri bulunan kelimelerin etrafında işaretlenmiş bir kesitle — ve alan
  temizlendiğinde (Esc) ağaç geri gelir. Enter ilk sonucu açar, ↓ ve ↑ listede gezinir.
  Metin, alanın ilk kullanımında betiğin yüklediği `search.js`'den gelir, böylece
  sayfaların kendisi oldukları kadar hafif kalır.
- Gezinmenin üstünde „Notes“in yanında **tümünü genişlet** ve **tümünü daralt**.
- Sitenin adının yanında bir **tema** düğmesi: bir ay, koyu temaya geçer, bir güneş
  açık olana geri döner, sistem hangisini tercih ediyorsa. Basılana kadar tema sistemi
  izler.
- Panelin sağ kenarında, onu daha geniş veya daha dar yapan bir tutamaç (160–560 px; çift
  tıklama varsayılanı geri verir, tutamaç odaklanmışken ← → onu hareket ettirir).

Tema, sütunun genişliği ve klasörlerin durumu sayfadan sayfaya, site başına hatırlanır;
gösterilmekte olan sayfanın klasörleri her zaman açıktır. Betik olmadan — engellenmiş,
veya şablondan çıkarılmış — arama alanı, düğmeler ve tutamaç basitçe orada değildir, tema
sistemi izler, ve site aynı şekilde okunur ve bağlantı verir.

- **Sayfalar**: `dir/Note.md`, `dir/Note.html` olur. Adına eşit bir başlıkla açılan bir not,
  o başlığı sayfanın başlığı olarak alır, altında etiketleriyle. `index` veya `README`
  adlı bir kök not ön sayfa olur, `index.html`; böyle biri yoksa ön sayfa notları ve
  etiketleri listeler. `[metin](other.md)` ve `[[wiki bağlantıları]]` sayfalara işaret
  eder, `[[Note#Heading]]` başlığa — her başlık bir id taşır — ve dışa aktarmada olmayan
  bir nota verilen bağlantı düz metin olarak kalır. Görev onay kutuları gösterilir, ama
  tıklanabilir değildir. Ön bilgi (front matter) dışarıda bırakılır.
- **Görseller**: klasördeki her resim ve PDF aynı yolda kopyalanır, böylece hem
  `![[image.png]]` hem de `![alt](path.png)` çalışmaya devam eder; bir gömme, düzenleyicinin
  bulduğu yerde bulunur.
- **Etiketler**: **Etiketleri dışa aktar** kutusu açıkken, her sayfa etiketlerini gösterir,
  etiket ağacı gezinmenin altında durur, ve etiket başına bir sayfa onun notlarını listeler
  — bir üst etiket, altındaki her etiketin notlarını — ayrıca `tags/index.html`'de bir
  etiket dizini. Yalnızca dışa aktarmadaki notlar sayılır.
- **Şablon**: iletişim kutusu sayfa şablonunu gösterir; orada düzenleyin veya **Varsayılana
  dön**, ve hatırlanır. Şablon `{{yer tutucular}}`ı olan HTML'dir:

  | Yer tutucu | Neyin yerini tutar |
  | --- | --- |
  | `{{navigation}}` | bir `<nav>` olarak klasör ağacı, geçerli sayfa işaretli — zorunlu |
  | `{{heading}}` | sayfanın `<h1>`'i, not kendi başlığıyla açılıyorsa boş — zorunlu |
  | `{{content}}` | not HTML olarak — zorunlu |
  | `{{tags}}` | bir `<nav>` olarak etiket ağacı; etiketler dışa aktarıldığında zorunlu, aksi halde boş |
  | `{{pagetags}}` | notun etiketleri, sayfalarına bağlantı veren `#çipler` olarak |
  | `{{title}}` | `<title>` için sayfanın adı, düz metin olarak |
  | `{{site}}` | dışa aktarılan klasörün adı |
  | `{{description}}` | `<meta name="description">` için ilk paragraf, düz metin |
  | `{{width}}` | metin genişliği ayarından, `full` veya `column` |
  | `{{root}}` | sayfanın bulunduğu klasör başına `../`, böylece `{{root}}style.css` köke ulaşır |
  | `{{styles}}` | stil sayfası: `style.css`'e bir `<link>`, veya tek bir sayfada tüm `<style>` |
  | `{{script}}` | betik: `site.js` için bir `<script src>`, veya tek bir sayfada tüm `<script>` |
  | `{{theme}}` | açık/koyu düğmesi |
  | `{{path}}` | notun yolu, `docs/Note.md` |
  | `{{lang}}` | `<html lang>` için arayüz dili |

  Bir site, şablon onları kullansın veya kullanmasın, kökünde `style.css`, `site.js` ve
  `search.js` alır; tek bir sayfa stil sayfasını ve betiğini içinde taşır, ve yanında bir
  `style.css` yalnızca şablonu, `{{styles}}`'tan öncesinden kalmaysa ve hâlâ birine bağlantı
  veriyorsa alır. Varsayılan stil sayfası, notu düzenleyicinin okuma görünümü gibi
  biçimlendirir ve genişliği `<html data-width="{{width}}">`'den okur. Dışa aktarmanın
  bilmediği bir yer tutucu olduğu gibi bırakılır. Yeni bir yer tutucu ortaya çıkmadan önce
  kaydedilmiş bir şablon onu kullanmaz: **Varsayılana dön** onu içine getirir.

## Gizlilik ve güvenlik

- **Sayfa hiçbir şeye ulaşmaz.** Dosyadaki bir İçerik Güvenliği Politikası (Content-Security-
  Policy), kodunun aynı sunucudaki yanındaki dosyalardan başka hiçbir şey getirmesine izin
  vermez (`index.json` ile sunulan bir klasör için `connect-src 'self'`), ve hiçbir yere
  hiçbir form göndermez. Politika kayıpsa veya dışarıdan bir referans sızmışsa build
  başarısız olur. PWA'nın kopyası, kendi kaynağından olmak üzere, manifestosuna ve hizmet
  işçisine (service worker) izin verir.
- **Notlardaki betikler asla çalışmaz.** Notlar HTML içerebilir — metin renkleri böyle
  çalışır — bu yüzden politika tam olarak bir betiğe, düzenleyicinin kendi betiğine, karması
  (hash) üzerinden izin verir: bir notta bir `<img>` üzerindeki `onerror` veya bir
  `<script>` hiçbir şey yapmaz.
- **Bir notun web'de bağlantı verdiği şey oradan yüklenir**: bir görsel, bir video veya
  `https://` adresli gömülü bir çerçeve, herhangi bir Markdown görüntüleyicisinde olduğu
  gibi — bu notun seçimidir, düzenleyicinin değil. Bu tür istekler hiçbir `Referer`
  taşımaz.
- **Dosyalar diskinizde kalır.** Notlar, File System Access API üzerinden doğrudan yerinde
  okunur ve yazılır; hatırlanan klasörler tarayıcının IndexedDB'sinde tanıtıcılardır, asla
  yollar veya içerikler değildir.
- Uzantının izinleri: bkz. „[Send to Markdown](#send-to-markdown-chrome-uzantısı)“.

## Özellikler

- **Dosya ağacı**: katlanabilir klasörler, ada göre filtreleme, bağlam menüsü üzerinden
  oluşturma, yeniden adlandırma ve silme, yeniden boyutlandırılabilir panel, gizlenebilir
  panel (`⌘\`).
- **Seçimi biçimlendirme**: H1–H3 başlıkları, kalın, italik, üstü çizili, eş aralıklı,
  `==…==` vurgu, metin ve arka plan rengi, bağlantı, `[[wiki bağlantısı]]`, listeler,
  görevler, alıntı, kod bloğu, tablo, ayırıcı.
- **Biçimlendirme (markup)**: tablolar, tıklanabilir onay kutularıyla görevler,
  `==highlight==`, `[[wiki links]]`, ön bilgi, 19 dil için sözdizimi vurgusuyla birlikte
  CommonMark, klasörden görseller.
- **Görseller**: `![alt](assets/Note/image-1.png)`, notun klasöründen yoluyla bir görsel
  gösterir. Obsidian'ın `![[assets/Note/image-1.png]]`'si de çalışır, notun klasöründen
  veya yoksa kökten yol (`![[…|300]]` genişliği ayarlar). Çıplak adlı daha eski bir gömme,
  `![[image-1.png]]`, ayarların görsel klasöründe, notun alt klasörüyle ve onsuz, notun
  yanındaki `assets/<not adı>/`'de, ve ardından Obsidian'ın yaptığı gibi klasörde herhangi
  bir yerde adına göre aranır. Görsel klasörleri ağaçta katlı başlar. Bir notu yeniden
  adlandırmak onun görsel klasörünü de yeniden adlandırır ve notun görsellerine olan
  bağlantılarını, her iki biçimde de, yeni yola değiştirir. Ağaçta tıklanan bir resim, metin
  olarak değil resim olarak açılır.
- **Görsel ekleme**: araç çubuğundaki resim düğmesi görsel dosyaları seçer; `⌘V` ile
  yapıştırılan bir görsel — bir ekran görüntüsü, tarayıcıda kopyalanan bir resim, dosya
  yöneticisinde kopyalanan bir dosya — aynı şekilde girer. Her ikisi de notun yanındaki
  görsel klasörüne kaydedilir, varsayılan olarak `assets/<not adı>/`, ve her editörün
  gösterdiği yoluyla düz Markdown olarak eklenir, `![image-1](assets/<not adı>/image-1.png)`
  (yoldaki bir boşluk `%20` olarak yazılır): imleçte, veya hiçbir blok açık değilse notun
  sonunda. Nota sürüklenen görseller bırakıldıkları yere girer: bir blok veya bir tablo
  hücresinde o noktaya, ve metnin yanına veya iki blok arasında, üstteki bloğun sonuna; okuma
  modunda bir bırakma düzenlemeye geçer, ve notun dışında bir bırakma görselleri sona ekler.
  İçinde bir klasör olan bir bırakma yine de klasörü açar. Yapıştırılan bir ekran görüntüsü
  `image-1.png`, `image-2.png` ve böyle devam eden şekilde adlandırılır; seçilen bir dosya
  kendi adını korur, alınmışsa bir numara eklenir. Bir elektronik tablodan kopyalanan
  hücreler, onlarla birlikte gelen resim olarak değil, metin olarak yapıştırılır. Yalnızca
  yazma için açılmış bir klasör yeni görseller alır.
- **Etiketler**: notlar üzerinde iç içe etiketler, bir etiket ağacı ve etiket başına bir
  sayfa, notlardan ayrı olarak `.meta.json`'da tutulur — bkz. „[Etiketler](#etiketler)“.
- **HTML'ye dışa aktarma**: klasör, veya alt klasörlerinden biri, aramalı statik bir site
  olarak, veya tek bir sayfa olarak — bkz. „[HTML'ye dışa
  aktarma](#htmlye-dışa-aktarma)“.
- **Send to Markdown**: Chrome'dan bir nota, Markdown olarak bir sayfa, bir seçim, bir
  bağlantı veya bir görsel — bkz. „[Send to Markdown](#send-to-markdown-chrome-uzantısı)“.
- **Ayarlar** (sağ üstteki dişli, aramanın yanında): arayüz dili, tema (sistem, açık,
  koyu), %50–200 yakınlaştırma, metin genişliği (ortalanmış bir sütun veya panelin tamamı),
  not adının başlık olarak gösterilip gösterilmediği, ve eklenen görsellerin nereye
  gideceği: notun yanındaki görsel klasörü (varsayılan olarak `assets`) ve her notun
  içinde kendi alt klasörünü alıp almayacağı; böyle biri yoksa, tüm görseller doğrudan
  klasöre gider. En altta sürüm — ve kurulu uygulamada, güncellemelerin denetlenmesi ve
  kendiliğinden yüklenip yüklenmeyeceği.
- **Diller**: İngilizce ve 16 tane daha — 中文, हिन्दी, Español, Français, العربية, বাংলা,
  Português, Русский, اردو, Bahasa Indonesia, Deutsch, 日本語, Türkçe, 한국어, Italiano,
  Українська. Varsayılan olarak arayüz, tarayıcının dilini izler. Arapça ve Urduda arayüz
  sağdan sola aynalanır; notun kendisi kendi yönünü korur.
- **Telefonlar**: 720 px'den dar bir ekranda dosya paneli notun üzerine kayar — ☰ onu açar,
  bir not seçmek veya yanına bir dokunuş onu kapatır — ve araç çubuğu tek satıra sığar;
  biçimlendirme yalnızca düzenleme modunda ikinci bir satır alır. Dışa aktarma orada
  bırakılmıştır. Dokunmatik bir ekranda alanlar en az 16 px'dir, böylece iOS onlara
  yakınlaşmaz, ve ağacın satırları daha yüksektir. Masaüstü düzeni ve hatırlanan panel
  genişliği dokunulmamış kalır.
- Bir düzenlemeden bir saniye sonra otomatik kayıt, geri al ve yinele, not içinde arama.
- Dil, tema, yakınlaştırma, metin genişliği, panel genişliği, etiket panelinin yüksekliği
  ve son açılan not hatırlanır.

## Klavye kısayolları

| Eylem | Tuşlar |
| --- | --- |
| Okuma / düzenleme modu | `⌘E` |
| Kaydet | `⌘S` |
| Not içinde arama | `⌘F` |
| Dosya paneli | `⌘\` |
| Yakınlaştırma | `⌘+` · `⌘−` · `⌘0` |
| Kalın · italik · bağlantı | `⌘B` · `⌘I` · `⌘K` |
| Eş aralıklı · vurgula · wiki bağlantısı | `⌘⇧C` · `⌘⇧H` · `⌘⇧K` |
| Başlık 1–6 · düz metin | `⌘⌥1`…`⌘⌥6` · `⌘⌥0` |
| Geri al · yinele | `⌘Z` · `⌘⇧Z` |
| Liste girintisi | `Tab` · `⇧Tab` |
| Bloktan çık | `Esc` |

## Çeviriler

İngilizce metin kodda kalır: `t('tree', 'Delete')`, `tn('status', '{count} word',
'{count} words', n)`, ve şablonda `data-i18n="context"` / `data-i18n-attr="context"`. İlk
argüman bağlamdır — bir dizenin arayüzün hangi parçasına ait olduğu, böylece aynı İngilizce
kelime iki yerde farklı çevrilebilir. `src/locales/<code>.json` bir sözlük, bağlamı →
İngilizce metni → çeviriye eşler:

```json
{
  "tree": { "Delete": "Удалить" },
  "status": { "{count} words": { "one": "{count} слово", "few": "{count} слова", "many": "{count} слов", "other": "{count} слова" } }
}
```

Sözlükte eksik olan bir dize İngilizce gösterilir. Sayı içeren bir metin, dilin her çoğul
kategorisi için bir biçime sahiptir (`Intl.PluralRules`), İngilizce çoğul biçimine göre
anahtarlanmış. `npm run i18n`, dil başına henüz çevrilmemiş ve artık kullanılmayan dizeleri
listeler; `npm test`, her çevirinin İngilizce yer tutucuları koruduğunu ve tüm çoğul
biçimlere sahip olduğunu denetler.

Chrome'un uzantının kendisinden gösterdiği şey — adı ve açıklaması, araç çubuğu düğmesinin
başlığı — panelinkinden değil, `chrome.i18n` aracılığıyla tarayıcının dilini izler. Bu
metinler, `src/extension/manifest.json`'daki İngilizce olanlardır, `manifest` bağlamı
altında aynı sözlüklerde çevrilir; build bunları `_locales/<code>/messages.json`'a yazar ve
`__MSG_appName__` ve benzerlerini manifestoya koyar. Chrome'un kendi kodları vardır ve
geri kalanını yok sayar: `pt`, `pt_BR` ve `pt_PT` olur, `zh`, `zh_CN` olur, ve Urduca için
hiçbiri yoktur, bu yüzden Chrome orada uzantıyı İngilizce açıklar. Build, 75 karakterden
uzun bir ad veya 132 karakterden uzun bir açıklamada durur. Bağlam menüsü, panel
açıldıktan sonra panelin dilini konuşur, öncesinde tarayıcının dilini.

Bu README de çevrilir: `docs/readme/README.<code>.md`, dil başına bir tane, her birinin
üstünde dillerin listesiyle. Buradaki bir değişiklik çevirilere de aittir.

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

`build.mjs`, `src/main.ts`'i esbuild ile bir IIFE'ye paketler ve onu, stillerle ve simgeyle
(bir veri URI'si) birlikte, `src/template.html`'in içine yerleştirir; dışa aktarmanın
şablonu ve stil sayfası dizeler olarak paketlenir. Şablonun İçerik Güvenliği Politikası, o
tek betiğin karmasını (hash) alır. Sonuç `build/macaed.html`'dir, yaklaşık 620 KB. İçinde
bir tane bile dış referans kalırsa build başarısız olur.

Aynı çalıştırma `build/pages/`'i yazar: o sayfayı kurulabilir bir PWA olarak — bir
manifesto bağlantısı ve sayfaya kendi işçisini kaydetmesini söyleyen bir
`<meta name="service-worker">` ile `index.html`, `manifest.webmanifest`, simgeler ve
sayfayı önbelleğe alıp çevrimdışı açılmasını sağlayan `sw.js`. `build/macaed.html`'in
kendisi hiçbir dış referansı olmayan tek bir dosya olarak kalır.

Ve `build/extension/`: `panel.html` — şablon, betiği `panel.js`'de — `background.js`,
simgeler, `_locales/` ve sürümü `package.json`'ınki olan `manifest.json`.
`build/macaed-extension-<version>.zip`, aynı dosyaları sabit tarihlerle tutar: aynı
kaynaklar aynı bayt'ları verir.

Tarayıcı testleri yerel Chrome'u başlatır (bir tane seçmek için `CHROME=/yol/to/chrome`) ve
hiçbir bağımlılık olmadan onunla DevTools protokolünü konuşur; Chrome olmadan atlanırlar.
`tools/test-extension.mjs`, uzantıyı o protokol üzerinden yükler (bir boru üzerinden
`Extensions.loadUnpacked`; `--load-extension`, sürüm 137'den beri Chrome'dan kaldırıldı),
yan panelde bir klasör açar ve ona yerel bir sunucudaki test sitelerinden sayfalar,
seçimler, bağlantılar ve görseller gönderir. Ne araç çubuğu düğmesi ne de bir bağlam menüsü
DevTools'tan tıklanabilir, bu yüzden test işçinin `onClicked`'ını kendisi tetikler; gerçek
bir tıklama olmadan Chrome hiçbir `activeTab` vermez, bu yüzden test edilen kopya, test
sitelerine, `*.test`, konak izinleri (host permissions) olarak ulaşabilir.

## Sürümler ve yayınlar

Sürüm tek bir yerde yazılır, `package.json`. Build onu sayfaya (başlangıç ekranının
altındaki satır, ayarların altı), uzantının `manifest.json`'ına ve PWA'nın önbellek adına
koyar. `v<version>` ile etiketlenmiş commit'in bir build'i onu olduğu gibi gösterir; diğer
her biri kendi commit'ini ekler, `0.11.0+1a2b3c4`, böylece GitHub Pages'teki `main`'den bir
sayfa yayın (release) olarak alınmaz. Chrome'un `version`'ı yalnızca sayı içerir, bu yüzden
orada commit `version_name`'e gider.

```sh
npm version minor           # 0.11.0 -> 0.12.0: package.json, package-lock.json, a commit and the tag v0.12.0
git push --follow-tags      # the tag starts .github/workflows/release.yml
```

Yayın (release) iş akışı, etiket ve `package.json` uyuşmazsa durur, testleri çalıştırır,
sonra `macaed-<tag>.html`, `macaed-extension-<tag>.zip` ve `SHA256SUMS.txt`'yi ekler.

## GitHub Pages

`.github/workflows/pages.yml`, `main`'e her push'ı derler ve test eder ve `build/pages/`'i
GitHub Pages'e dağıtır (Settings → Pages → Source: GitHub Actions),
<https://marketkernel.github.io/markdown-catalog-editor/> adresinde. Chrome, Edge ve
Arc'ta adres çubuğundaki kurulum düğmesi onu ayrı bir uygulama penceresine dönüştürür;
iOS'ta bu Paylaş → Ana Ekrana Ekle'dir. Klasörler tek dosyadakiyle aynı şekilde açılır.

**Çevrimdışı.** Bir kez açıldıktan sonra, düzenleyici bağlantı olmadan çalışır: hizmet
işçisi, sayfayı, manifestosunu ve simgelerini sürüme göre adlandırılmış bir önbellekte
tutar, ve sayfayı oradan sunar. Notlar ondan asla geçmez — onlar diskinizdedir.

**Güncellemeler.** Her dağıtım `sw.js`'yi değiştirir, bu yüzden tarayıcı yeni işçiyi
kendiliğinden bulur — bağlantılı bir başlatmada, uygulama açık kaldığı sürece birkaç saatte
bir, bağlantı geri geldiğinde, veya Ayarlar → Güncellemeleri kontrol et sorduğunda. Yeni
işçi sürümünü kendi önbelleğine indirir ve bekler; çalışan olan eski sayfayı sunmaya devam
eder, çevrimdışı da, böylece elinizin altında hiçbir şey değişmez. Ayarlar, düğmelerinde
bir noktayla, ve başlangıç ekranı o zaman „Sürüm … hazır. Güncelle“ der: Güncelle, açık
notu kaydeder (veya kaydedilemiyorsa sorar), yeni işçiyi içeri alır ve sayfayı yeniden
yükler, ki bu güncellendiğini bir kez söyler; eski önbellek silinir. Düğme olmadan yeni
sürüm, uygulamanın her penceresi kapandığında başlar — veya, ayarlarda „Her şey kaydedildiğinde ve uygulama arka planda çalışırken güncellemeleri kendiliğinden yükle“ işaretliyse,
hiçbir şey kaydedilmemiş değilken ve pencere görünmez olur olmaz.

Bu aynı zamanda ödünleşimdir: kurulu bir PWA, son dağıtımın oraya koyduğu her neyse onunla
çalışır, indirilen bir dosya ise olduğu sürüm olarak kalır. Diskte sabitlenmiş bir sürüm
için, bir yayından `macaed-<tag>.html`'i alın ve onu `SHA256SUMS.txt` ile karşılaştırın.

Kurulu uygulama, tarayıcıdan deposunu tutmasını ister (`navigator.storage.persist()`): azalan
bir disk, aksi takdirde çevrimdışı kopyayı ve hatırlanan klasörleri de alıp götürebilir.

`npm run test:browser`, `build/pages/`'i de açar (`tools/test-pwa.mjs`): hizmet işçisi
sayfayı devralır, Chrome manifestoyu kurulabilir bulur, ve sunucu gittiğinde sayfa hâlâ
yüklenir; sonra bir denetim hiçbir şey bulmaz, sonra bağlantı yok, sonra Güncelle onu
içeri alana kadar bekleyen yeni bir dağıtım.

## Yapı

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

## Sınırlamalar

- Ortak düzenleme, eklentiler, eşitleme (sync) ve bir bağlantı grafiği desteklenmez.
- Telefonda düzen okuma için yapılmıştır: ağacın bağlam menüsü, iOS'un böylesine
  dönüştürmediği uzun bir basış gerektirir, ve tablolar üzerine gelindiğinde beliren
  çubuklarla genişletilir.
- Yalnızca Chromium tabanlı tarayıcılar dosya yazabilir.
- Uzantı Chrome içindir (ve onun üzerine kurulu, yan paneli olan Edge gibi tarayıcılar
  için); henüz Chrome Web Mağazası'nda değildir. Görselleri klasöre indirmek yerine web'de
  tutar: bu, her siteye erişim gerektirirdi.

## Lisans

MIT — bkz. [LICENSE](../../LICENSE).

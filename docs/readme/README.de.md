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
<b>🇩🇪 Deutsch</b> ·
<a href="README.ja.md">🇯🇵 日本語</a> ·
<a href="README.tr.md">🇹🇷 Türkçe</a> ·
<a href="README.ko.md">🇰🇷 한국어</a> ·
<a href="README.it.md">🇮🇹 Italiano</a> ·
<a href="README.uk.md">🇺🇦 Українська</a>
</h3>
<!-- /languages -->

Ein Markdown-Editor für einen lokalen Ordner mit Notizen — im Geiste von Obsidian, aber
vollständig in einer einzigen eigenständigen HTML-Datei enthalten. Es wird kein Netzwerk
verwendet: Dateien werden direkt von der Festplatte gelesen und darauf gespeichert.

**[Online-Demo](https://markdown.marketkernel.com/)** — derselbe Editor
als PWA (Progressive Web App): Sie kann im System installiert werden und läuft dann als
eigenständige App mit eigenem Fenster und Symbol und funktioniert auch offline. Auf dem
Computer, in Chrome, Edge und Arc, verwenden Sie die Installationsschaltfläche in der
Adressleiste; auf Android über Chromes ⋮-Menü → App installieren; auf iOS über Teilen → Zum
Home-Bildschirm, in Safari oder in Chrome. Auch dort bleiben Ihre Notizen auf Ihrer
Festplatte, die installierte App öffnet eine `.md`-Datei direkt aus dem Finder oder
Explorer, und sie aktualisiert sich, wenn Sie es sagen — siehe
„[GitHub Pages](#github-pages)“. Wo ein Browser nicht auf eine Festplatte schreiben kann —
Safari, Firefox, ein iPad oder ein Telefon —, werden die Notizen im Browser aufbewahrt und
gehen als ZIP-Archiv hinein und hinaus: siehe
„[Im Browser aufbewahrte Notizen](#im-browser-aufbewahrte-notizen)“.

Derselbe Editor ist auch **Markdown Knowledge Base**, eine
[Chrome-Erweiterung](#markdown-knowledge-base-die-chrome-erweiterung): Markieren Sie Text auf
einer Webseite, drücken Sie ihre Schaltfläche, und **Send to Markdown** fügt ihn der
Standardnotiz Ihrer Wissensdatenbank hinzu — oder einer beliebigen Notiz, die Sie wählen. Der
Editor selbst öffnet sich neben der Seite in Chromes Seitenleiste.

![Der Editor mit einem geöffneten Ordner voller Notizen: der Datei- und Tag-Baum links, eine Notiz im Bearbeitungsmodus rechts](../macaed.jpg)

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

## Verwendung

1. `build/macaed.html` erstellen (siehe „[Build](#build)“) und in einem Browser öffnen.
2. „Ordner öffnen“ → einen Ordner mit `.md`-Dateien auswählen. Sie können den Ordner auch
   einfach in das Fenster ziehen.
3. Der Schalter **Lesen / Bearbeiten** oben, oder `⌘E`.

In Chrome, Edge und Arc wird der Ordner über die File System Access API geöffnet: Notizen
werden direkt an Ort und Stelle gelesen und geschrieben, und das Erstellen, Umbenennen und
Löschen von Dateien und Ordnern funktioniert vollständig. Safari und Firefox können nicht auf
einen Ordner auf der Festplatte schreiben, ebenso wenig Telefone und iPads: Chrome auf Android
hat kein File System Access, und jeder Browser auf iOS und iPadOS, Chrome eingeschlossen, läuft
auf Safaris Engine. Dort werden die Notizen im Browser aufbewahrt — siehe „[Im Browser
aufbewahrte Notizen](#im-browser-aufbewahrte-notizen)“.

Der Editor merkt sich die letzten sechs dort geöffneten Ordner (eine Seite erfährt nie den
Pfad eines Ordners, daher speichert sie das Handle des Ordners in der IndexedDB des
Browsers) sowie die zuletzt geöffnete Notiz in jedem. Beim nächsten Start öffnet sich der
letzte Ordner von selbst, wenn der Browser das noch erlaubt — in einer installierten App,
oder sobald Sie „Bei jedem Besuch erlauben“ gewählt haben. Andernfalls listet der
Startbildschirm die zuletzt verwendeten Ordner auf: ein Klick, und der Browser fragt erneut
nach Zugriff. Um zu dieser Liste zurückzukehren — um die Ordner zu wechseln oder einen neuen
zu öffnen — klicken Sie auf den Ordnernamen oben in der Dateileiste oder auf „Ordner
schließen“ in den Einstellungen; × entfernt einen Ordner aus der Liste.

Wenn Sie `macaed.html` neben Ihre Notizen legen und über HTTP bereitstellen, erkennt die
Seite den Ordner von selbst — vorausgesetzt, eine `index.json` liegt daneben, in der Form
`{ "name": "Notes", "files": ["Note.md", "Folder/Other.md"] }`.

### Im Browser aufbewahrte Notizen

Wo der Browser nicht auf einen Ordner auf der Festplatte schreiben kann — Safari, Firefox, jeder
Browser auf einem Telefon oder einem iPad —, sagt der Startbildschirm das und bietet zwei Wege
hinein: **Ordner öffnen** und **ZIP-Archiv öffnen** (oder eines von beiden auf das Fenster
ziehen). Was Sie öffnen, wird in die IndexedDB des Browsers kopiert, und von da an liest und
schreibt der Editor diese Kopie: automatisches Speichern, neue Notizen und Ordner, Umbenennen,
Löschen, Bilder, Tags — alles funktioniert wie auf einer Festplatte. Nichts verlässt das Gerät.

- **Der Weg zurück hinaus** ist ein ZIP-Archiv: Einstellungen → **ZIP herunterladen** packt den
  gesamten Ordner — Notizen, Bilder, `.meta.json` — in einen Ordner mit seinem Namen, so wie ein
  im Finder oder Explorer komprimierter Ordner es wäre. Wieder als Archiv geöffnet, kommt er
  zurück, wie er war. Die Schaltfläche steht auch bei einem Ordner auf der Festplatte zur
  Verfügung, als schnelle Kopie davon.
- **Ein Archiv**, das vom Finder, Explorer oder `zip` erstellt wurde, öffnet sich als der eine
  darin enthaltene Ordner (oder, wenn Dateien oben liegen, unter dem Namen des Archivs). Nur was
  der Editor zeigt, wird kopiert — Notizen, Bilder und Anhänge, `.meta.json`; Punktordner,
  `node_modules`, `output/` und der `__MACOSX` des Mac bleiben außen vor. Es braucht überhaupt
  keine Ordnerauswahl, was genau das ist, was ein älteres iPad braucht, dessen Safari keinen
  Ordner auswählen kann.
- **Der Startbildschirm listet die Ordner auf**, die in diesem Browser aufbewahrt werden, neueste
  zuerst, und der letzte öffnet sich beim nächsten Start von selbst. Wird derselbe Ordner oder
  dasselbe Archiv erneut geöffnet, kommt eine zweite Kopie neben die erste hinzu („Notes 2“),
  statt die Änderungen in der ersten zu überschreiben. × löscht eine Kopie aus dem Browser, nach
  Rückfrage — sie könnte die einzige sein.
- **Als HTML exportieren** lädt die Website als ZIP-Archiv herunter, statt sie nach `output/` zu
  schreiben.
- **Wie lange sie bleiben**: Der Browser wird gebeten, die Daten der Website dauerhaft zu
  behalten (`navigator.storage.persist()`) — Firefox fragt Sie, Chrome und Safari entscheiden
  selbst, williger für eine installierte App. Ein Browser, der Nein sagt, kann die Notizen
  löschen, wenn die Festplatte knapp wird, und Safari löscht die Daten einer Website, die sieben
  Tage der Safari-Nutzung lang nicht besucht wurde, sofern sie nicht zum Home-Bildschirm
  hinzugefügt ist. Das Löschen der Website-Daten oder des Browser-Verlaufs löscht sie in jedem
  Browser. Laden Sie also hin und wieder ein ZIP-Archiv herunter — es ist die einzige Kopie
  außerhalb des Browsers.

Wo IndexedDB aus ist (in manchen privaten Fenstern), öffnet sich ein Ordner schreibgeschützt, wie
zuvor, und `⌘S` bietet an, die geänderte Notiz herunterzuladen.

### Eine einzelne Notiz

Eine `.md`-Datei lässt sich auch für sich allein öffnen, ohne ihren Ordner:

- **Aus dem Finder oder Explorer**, in der installierten App (Chrome oder Edge auf dem
  Computer): Öffnen mit → die App, oder legen Sie sie als Standard-App für `.md` fest. Die
  Notiz gelangt in das Fenster der App, wenn eines geöffnet ist — zwei Fenster auf derselben
  Datei würden sich beim Speichern gegenseitig überschreiben — und nimmt dort den Platz des
  angezeigten Ordners ein; wird dieselbe Notiz erneut geöffnet, bleibt sie, wie sie ist.
- **Auf das Fenster gezogen**, in jedem Browser.

Die Notiz wird an Ort und Stelle gelesen und geschrieben, wie in einem Ordner — in Safari und
Firefox schreibgeschützt, wobei `⌘S` einen Download anbietet (eine Notiz wird nicht in den
Browser kopiert; ihr Ordner kann es werden). Ohne einen Ordner darum herum
gibt es nichts daneben zu erstellen, umzubenennen oder zu löschen, und keine Bilder aus ihrem
Ordner, Tags oder Export: Das kommt mit dem Öffnen des Ordners. Eine so geöffnete Notiz wird
nicht zu den zuletzt verwendeten Ordnern hinzugefügt.

## Markdown Knowledge Base: die Chrome-Erweiterung

`npm run build` schreibt auch `build/extension/`: den Editor als Chrome-Erweiterung, sowie
`build/macaed-extension-<version>.zip` davon für den Chrome Web Store; ein Release enthält
das Zip ebenfalls. Zum Installieren: `chrome://extensions` → Entwicklermodus → Entpackte
Erweiterung laden → `build/extension` (oder das entpackte Zip).

**Die Wissensdatenbank** ist der Ordner mit Notizen, der zuletzt in der Erweiterung geöffnet
wurde. Der Editor selbst — der **Vollmodus** — lebt in Chromes Seitenleiste, neben der Seite,
im Telefon-Layout, da eine Seitenleiste schmal ist; er bleibt dort über Tabs hinweg erhalten.
Ein Ordner öffnet sich darin wie in der Datei, und die zuletzt verwendeten Ordner werden
gespeichert — eigene der Erweiterung, getrennt von denen der Datei oder der PWA.

**Die Symbolleisten-Schaltfläche** (oder `Alt+Shift+M`) öffnet ein kleines Fenster über der
Seite:

- Oben, was auf der Seite ausgewählt ist, als Markdown — oder, wenn nichts ausgewählt ist,
  der Haupttext der Seite: der Artikel, ohne die Menüs, Seitenleisten, Fußzeile,
  Teilen-Schaltflächen, Formulare und verborgenen Teile der Website.
- **Send to Markdown** fügt es an das Ende der **Standardnotiz** an — zu Beginn `Inbox.md`
  im Wurzelverzeichnis der Wissensdatenbank, angelegt, sobald sie das erste Mal gebraucht
  wird. Nach einer Leerzeile kommt der Text, dann eine Zeile `— [Der Titel der
  Seite](https://…)`, die dorthin verlinkt, woher es kam. Das Fenster schließt sich, sobald
  geschrieben ist.
- **Zu einer anderen Notiz hinzufügen**: die Notizen der Wissensdatenbank, mit einem Feld,
  um eine nach Namen zu finden; ein Klick auf eine Notiz fügt es stattdessen dort hinzu. Der
  Stern neben einer Notiz macht sie zur Standardnotiz; die Standardnotiz steht an erster
  Stelle.
- Ist nichts ausgewählt, verwandelt **Als neue Notiz** die Seite in eine eigene Notiz
  (unten).
- **Vollmodus** öffnet die Seitenleiste.

**Wenn die Wissensdatenbank geschlossen ist** — Chrome nimmt den Zugriff auf einen Ordner
zurück, sobald die letzte Seitenleiste schließt, und nach einem Neustart, sofern Sie nicht
„Bei jedem Besuch zulassen“ gewählt haben —, kann eine Seite erst in den Ordner gelangen,
nachdem Sie geklickt haben. Das Fenster sagt das dann und listet weiterhin die Notizen auf,
so wie die Seitenleiste sie zuletzt gesehen hat: **Send to Markdown**, oder ein Klick auf
eine Notiz, legt das Ausgewählte beiseite, im eigenen Speicher der Erweiterung, und es geht
an das Ende dieser Notiz, sobald eine Seitenleiste den Ordner wieder öffnet. **Öffnen** fragt
Chrome direkt im Fenster nach dem Ordner; ein Klick auf den Ordner in der Seitenleiste tut
dasselbe. Wenn Chrome fragt, wählen Sie „Bei jedem Besuch zulassen“: Dann bleibt der Ordner
geöffnet, wenn die Seitenleiste schließt, und nach einem Neustart.

Hat die Seitenleiste die Wissensdatenbank geöffnet, ist es die Seitenleiste, die zur Notiz
hinzufügt — sie kann diese Notiz mit noch nicht gespeicherten Änderungen geöffnet haben, die
ein Schreiben in ihrem Rücken verlieren würde. Ist keine Seitenleiste geöffnet und der Ordner
weiterhin erlaubt — bei jedem Besuch, oder über **Öffnen** — schreibt das Fenster die Notiz
selbst.

**Das Kontextmenü** einer Seite enthält **Seite an Markdown senden**; bei ausgewähltem Text
**Auswahl an Markdown senden**; bei einem Link **Link an Markdown senden**; bei einem Bild
**Bild an Markdown senden**. Keines davon öffnet die Seitenleiste: Eine sich öffnende
Seitenleiste drängt die Seite zur Seite. Ist im Fenster keine Seitenleiste geöffnet, geht
das Gewählte an das Ende der Standardnotiz, wie bei **Send to Markdown** — oder, bei
geschlossener Wissensdatenbank, wartet wie oben beschrieben darauf. Die
Symbolleisten-Schaltfläche zeigt, was geschehen ist: kurz ein Häkchen, oder `!` mit dem Grund
im Titel, und wie viele Sendungen warten, bis eine Seitenleiste den Ordner öffnet. Ist die
Seitenleiste des Fensters geöffnet, geht es stattdessen dorthin, wo ein Dialog zeigt, was
angekommen ist — und von welcher Website — als Markdown, das Sie noch ändern können, und
fragt, wohin es gehen soll:

- **Eine neue Notiz**, die Voreinstellung für eine Seite: im Ausschnitte-Ordner
  (`Clippings` im Wurzelverzeichnis, sofern Sie es nicht ändern; der Ordner wird
  gespeichert, leer bedeutet das Wurzelverzeichnis), benannt nach dem Titel der Seite, wobei
  alles weggelassen wird, was ein Dateiname nicht enthalten kann. Ein bereits vergebener
  Name erhält eine Nummer, `Titel 2.md`. Die Notiz beginnt mit Front Matter — dem Titel der
  Seite, ihrer Adresse und dem Tag — und dann dem Text; sie öffnet sich, sobald sie
  gespeichert ist.

  ```markdown
  ---
  title: "The page's title"
  source: "https://example.com/post"
  clipped: 2026-10-07
  ---

  # The page's title

  The text…
  ```

- **Das Ende der geöffneten Notiz**, die Voreinstellung für eine Auswahl, einen Link oder
  ein Bild, auf dieselbe Weise wie Send to Markdown. Ein Link braucht keine Quellenzeile: Er
  ist seine eigene Quelle.

Wird etwas gesendet, bevor je ein Ordner geöffnet wurde, wartet es: Die Seitenleiste fragt nach
einem Ordner, und der Dialog erscheint, sobald einer geöffnet ist. Eine Seite, die die
Erweiterung nicht lesen darf — Chromes eigene Seiten, der Web Store, ein PDF — kommt als
Link zu ihr an.

**Was das Markdown ist.** Überschriften, Absätze, **fett**, *kursiv*, ~~durchgestrichen~~,
==hervorgehoben==, `Code`, Links und Bilder mit ihren vollständigen Adressen, Listen —
verschachtelt, nummeriert, Aufgaben —, Zitate, Codeblöcke mit ihrer Sprache (aus
`language-…`, GitHubs `highlight-source-…` und Ähnlichem), Tabellen (ein Zeilenumbruch in
einer Zelle als `<br>`, so wie der Editor ihn schreibt), Trennlinien. Text wird als er
selbst gelesen: Ein `*`, ein `#` am Zeilenanfang oder ein auf der Seite getipptes `<b>` wird
maskiert, sodass es nie zu Formatierung wird, und kein HTML der Seite gelangt in die Notiz.
Bilder bleiben im Web, verlinkt über ihre Adresse; bei einem Lazy-Bild wird die echte
Adresse statt des Platzhalters verwendet, Tracking-Pixel werden weggelassen.

**Berechtigungen.** `activeTab`: Ein Klick auf die Schaltfläche, im Menü oder der
Tastenkombination gibt der Erweiterung genau diesen einen Tab, und erst dann liest sie ihn
aus — mit `scripting`, einer in der Seite ausgeführten Funktion, die ihren Text kopiert und
zurückgibt. Nirgendwo läuft ein Content-Script, und es gibt sonst keinen Zugriff auf
irgendeine Website: keine `host_permissions`, die der Build auch ablehnt. `offscreen`: Der
Worker hat kein DOM, daher wird, wenn keine Seitenleiste geöffnet ist, das HTML einer Seite
oder einer Auswahl in einem Offscreen-Dokument der Erweiterung zu Markdown, das sich
schließt, sobald es fertig ist. `contextMenus`, `sidePanel` und `storage` — was an die
Seitenleiste gesendet wird, geht über
`chrome.storage.session` an die Seitenleiste des jeweiligen Fensters, was beim Schließen des
Browsers verschwindet; in `chrome.storage.local` steht, was das Fenster der Schaltfläche
beiseitegelegt hat, während die Wissensdatenbank geschlossen war, die Liste ihrer Notizen,
und die Sprache der Seitenleiste sowie die Standardnotiz, für den Worker. Das Fenster der
Schaltfläche und der Worker bitten eine Seitenleiste, die die Wissensdatenbank geöffnet hat,
per `chrome.runtime`-Nachricht, etwas zu einer Notiz hinzuzufügen; sie nimmt
das nur von den eigenen Seiten der Erweiterung entgegen. Die Seiten der Erweiterung haben
`connect-src 'none'`: Der Editor erreicht nichts im Netzwerk; der Build prüft das sowie, dass
keine Seite ein Inline-Script oder eine externe Adresse enthält.

**Wie es gemacht ist.** Die Seitenleiste ist die Seite selbst: `panel.html` mit ihrem
Script in `panel.js`, wie Manifest V3 es verlangt — dasselbe `src/main.ts`, wobei
`src/extension/extension.ts` an die Stelle von `src/platform.ts` tritt, dessen Hooks in der
Datei und der PWA nichts tun. Das Fenster der Schaltfläche ist `popup.html` und `popup.js`
(`src/extension/popup.ts`), mit den Stilen der Seite: Es liest das Handle der
Wissensdatenbank aus derselben IndexedDB wie die Seitenleiste und schreibt darüber, solange
der Browser es noch erlaubt; andernfalls legt es das Gesendete in `chrome.storage.local`
beiseite, wo die Seitenleiste, die den Ordner öffnet, es findet (`src/extension/messages.ts`).
Der Worker, `background.js`, enthält das Menü: Er liest den Tab (`src/extension/take.ts`,
`grab.ts`) und schickt, was er genommen hat, an die Seitenleiste des Fensters, oder fügt es,
wie das Fenster der Schaltfläche, der Standardnotiz hinzu (`src/extension/knowledge.ts`),
über `offscreen.html` für das Markdown (`src/extension/offscreen.ts`). HTML wird in
`src/extension/to-markdown.ts` zu Markdown, und der Editor fügt es hinzu oder fragt, wohin es
gehen soll (`src/clip.ts`, `src/clip-ui.ts`).

## Live-Vorschau

Im Bearbeitungsmodus bleibt das Dokument formatiert, und nur der Block, in dem sich der
Cursor befindet, wird zu rohem Markdown. Ein Block ist ein Absatz, eine Überschrift, eine
ganze Liste, ein Codeblock oder ein Zitat: Eine Liste fällt nicht zeilenweise auseinander.
Tabellen werden anders bearbeitet — siehe „[Tabellen](#tabellen)“.

Die Quellzeile behält Schriftgröße, -stärke und Zeilenhöhe der formatierten Zeile bei,
sodass der Text nicht springt: `# Überschrift` wird in Überschriftengröße angezeigt. Dies
wird automatisch geprüft — beim Umschalten eines Blocks bewegt sich seine Oberkante bei
jeder Zoomstufe von 50 bis 200 % um weniger als einen Pixel.

Es gibt eine Stelle, an der sich die Höhe doch ändert, und das ist für diesen Modus
unvermeidlich: Ein Codeblock erhält zwei Begrenzungszeilen aus `` ``` ``. Benachbarte
Blöcke zucken dabei nicht — nur das, was darunter liegt, verschiebt sich.

Enter außerhalb einer Liste beginnt einen neuen Block. Am Ende eines Blocks oder auf einer
leeren Zeile gedrückt, öffnet es eine leere Zeile darunter und setzt den Cursor darauf;
erneut gedrückt, fügt es eine weitere hinzu. In Markdown trennt eine einzelne Leerzeile nur
zwei Blöcke, daher ist eine Leerzeile, in die man tippen kann, eine mit Leerzeilen auf
beiden Seiten — der Editor fügt die trennende Zeile selbst hinzu, und getippter Text
verklebt nie mit dem benachbarten Block. Solche Zeilen und Link-Referenzdefinitionen
(`[id]: https://…`) werden nur im Bearbeitungsmodus angezeigt; die Leseansicht rendert das
Markdown, wie es ist.

## Tabellen

Eine Tabelle wird nie zu `| Pipes |`. Ein Klick öffnet nur die Zelle unter dem Zeiger, und
die Zelle zeigt ihren eigenen Text — `**fett**` statt fett —, sodass Inline-Formatierung
sowie die Markierungen, Links und Farben der Symbolleiste darin weiterhin funktionieren.
Tippen schreibt nur diese Zelle in der Datei neu; der Rest der Tabelle behält seine
Abstände und Ausrichtung.

- **Bewegen**: Tab und Umschalt+Tab springen zur nächsten bzw. vorherigen Zelle, Enter zur
  Zelle darunter, die Pfeiltasten zur benachbarten Zelle am Rand des Textes — und über den
  Rand der Tabelle hinaus zum nächsten Block. Enter in der letzten Zeile beginnt einen neuen
  Block unterhalb der Tabelle.
- **Zeilenumbrüche**: Strg+Enter (auch ⌘Enter oder Umschalt+Enter) beginnt eine neue Zeile
  innerhalb der Zelle. Eine Tabellenzeile ist eine Markdown-Zeile, daher wird der Umbruch
  als `<br>` geschrieben; die bearbeitete Zelle zeigt ihn als echten Zeilenumbruch, und
  eingefügter Text behält seine Zeilen auf dieselbe Weise. Innerhalb einer mehrzeiligen
  Zelle bewegen die Pfeiltasten nach oben und unten zunächst zwischen ihren Zeilen.
  Zellentext ist oben ausgerichtet.
- **Hinzufügen**: Im Bearbeitungsmodus zeigt das Überfahren einer Tabelle eine Leiste mit
  einem **+** darunter, das eine Zeile hinzufügt, und eines rechts daneben, das eine Spalte
  hinzufügt. Tab in der letzten Zelle fügt ebenfalls eine Zeile hinzu.
- **Löschen**: Nur leere Zeilen und Spalten werden gelöscht, sodass durch einen Ausrutscher
  kein Text verloren geht. Das Überfahren einer leeren Zeile zeigt links ein **×**, über
  einer leeren Spalte ein **×** darüber. Rückschritt in einer leeren Zelle macht dasselbe
  von der Tastatur aus: Es löscht die Zeile, wenn die ganze Zeile leer ist, sonst die
  Spalte, wenn die ganze Spalte leer ist (Kopfzeile eingeschlossen); eine Tabelle, in der
  kein Text mehr übrig ist, wird als Ganzes gelöscht. Die Kopfzeile bleibt — eine Tabelle
  braucht eine.

Hinzufügen oder Löschen schreibt die Tabelle in der einfachen Form `| a | b |` neu.

## Tags

Tags gruppieren Notizen über Ordner hinweg. Sie werden nicht in die Notizen geschrieben:
Das Markdown bleibt genau, wie es war, und alle Tags des Ordners leben in einer Datei neben
den Notizen.

- **Auf einer Notiz**: Die Tags stehen unter dem Titel als `#tag`-Chips, gefolgt von einem
  **+**. Das **+** verwandelt sich in ein Feld; Enter fügt den Tag hinzu, und danach
  erscheint das **+** wieder. Bereits im Ordner verwendete Tags werden beim Tippen
  vorgeschlagen. Esc bricht ab; das Verlassen des Feldes mit Text darin fügt den Tag
  ebenfalls hinzu. **×** auf einem Chip entfernt den Tag, und ein Klick auf den Chip öffnet
  die Seite des Tags. Tags können sowohl im Lese- als auch im Bearbeitungsmodus geändert
  werden.
- **Schreibweise**: Ein führendes `#` wird entfernt, und Leerzeichen innerhalb eines Tags
  werden zu Bindestrichen, sodass `#to do` als `to-do` gespeichert wird. Ein Tag, der sich
  von einem bestehenden nur in der Groß-/Kleinschreibung unterscheidet, übernimmt dessen
  Schreibweise — `Idea` und `idea` werden nie zu zwei Tags. Eine Notiz kann denselben Tag
  nicht zweimal tragen.
- **Verschachtelung**: `/` verschachtelt Tags. `work/alpha` und `work/beta` stehen im
  Tag-Baum unter `work`, und eine mit `work/alpha` getaggte Notiz wird auch unter `work`
  gezählt.
- **Der Tag-Baum**: der Abschnitt unten in der Dateileiste, getrennt vom Dateibaum. Jeder
  Tag zeigt, wie viele Notizen ihn oder einen darunter verschachtelten Tag tragen; der
  Pfeil eines übergeordneten Tags klappt seine Kinder ein, und die Überschrift klappt den
  ganzen Abschnitt ein. Der Namensfilter über dem Dateibaum filtert auch die Tags. Der
  Abschnitt nimmt bis zu 42 % der Leiste ein und scrollt innerhalb; das Ziehen der Linie
  darüber macht ihn niedriger (nie höher), ein Doppelklick auf die Linie gibt den Platz
  zurück, und bei fokussierter Linie tun ↑ und ↓ dasselbe. Die Höhe wird gespeichert.
- **Die Seite eines Tags**: Ein Klick auf einen Tag im Baum oder auf einen Chip zeigt die
  Notizen, die ihn tragen — ein übergeordneter Tag listet auch die Notizen jedes
  darunterliegenden Tags auf. Jede Zeile zeigt den Namen der Notiz, ihren Ordner und alle
  ihre Tags; ein Klick auf den Namen öffnet die Notiz, ein Klick auf einen Tag öffnet
  diesen Tag. Die Seite ist schreibgeschützt: Es gibt nichts darauf zu bearbeiten, und die
  Formatierungsleiste ist ausgeschaltet. Bei einem verschachtelten Tag verlinken die
  übergeordneten Teile im Titel zu ihren eigenen Seiten.
- **Umbenennen und Löschen**: Tags folgen einer Notiz oder jeder Notiz in einem Ordner,
  wenn diese über die Dateileiste umbenannt oder gelöscht wird. Eine außerhalb des Editors
  verschobene oder gelöschte Notiz behält ihren Eintrag in der Datei, aber der Eintrag wird
  nicht angezeigt oder gezählt, solange die Notiz fehlt.
- **Schreibgeschützte Ordner** (Safari, Firefox): Die Tags werden angezeigt, das **+** und
  das **×** jedoch nicht.

### `.meta.json`

Die Datei liegt im Wurzelverzeichnis des geöffneten Ordners und wird mit dem ersten Tag
erstellt. Sie wird im Dateibaum nie angezeigt.

```json
{
  "notes": {
    "Ideas.md": { "tags": ["idea", "work/alpha"] },
    "Projects/Roadmap.md": { "tags": ["work/alpha", "planning"] }
  }
}
```

Die Schlüssel sind Notizpfade relativ zum Wurzelverzeichnis, so wie der Baum sie zeigt; die
Tags behalten die Reihenfolge, in der sie hinzugefügt wurden. Die Datei wird mit nach Pfad
sortierten Notizen und zwei Leerzeichen Einrückung geschrieben, sodass sie sich in einem
Diff gut liest, und Notizen ohne verbleibende Tags werden daraus entfernt. Felder, die der
Editor nicht kennt — oben oder innerhalb des Eintrags einer Notiz — werden beim
Zurückschreiben der Datei beibehalten, sodass andere Werkzeuge ihre eigenen Daten darin
speichern können. Ist die Datei kein gültiges JSON-Objekt, sagt der Editor das, zeigt keine
Tags an und überschreibt sie nie; Tags können erst geändert werden, wenn die Datei repariert
und der Ordner erneut geöffnet wurde.

Wird der Ordner über HTTP mit einer `index.json` bereitgestellt (siehe
„[Verwendung](#verwendung)“), `.meta.json` unter ihren Dateien auflisten, damit die Tags
angezeigt werden.

## Export nach HTML

Die Export-Schaltfläche in der Symbolleiste (neben Speichern) verwandelt den gesamten
Ordner in eine statische Website; **Als HTML exportieren…** im Kontextmenü eines Ordners
macht dasselbe nur für diesen Ordner, und auf dem leeren Bereich unter dem Baum für den
gesamten Ordner. Die Website wird nach `output/<Ordner>/` im Wurzelverzeichnis des
Notizordners geschrieben; der Ordner wird nach dem Zeitpunkt des Exports benannt,
`2025-12-31_23-33-33`, und kann im Dialog umbenannt werden. `output` wird im Baum nie
angezeigt. Nur ein zum Schreiben geöffneter Ordner kann exportiert werden.

Während der Export läuft, zeigt der Dialog den aktuellen Schritt — Notizen werden gelesen,
Seiten werden geschrieben, Bilder werden kopiert — mit einem Fortschrittsbalken, und kann
nicht geschlossen werden; **Anhalten** beendet ihn nach den bereits begonnenen Dateien und
belässt, was bis dahin geschrieben wurde. Die Export-Schaltfläche und der Menüeintrag sind
deaktiviert, bis er fertig ist. Dateien werden mehrere gleichzeitig gelesen und geschrieben,
jeder Ordner auf dem Weg einmal erstellt. Am Ende liest der Export den Ordner von der
Festplatte zurück: Sollte eine Datei fehlen, nennt der Dialog, wie viele, und benennt eine
davon, statt Erfolg über einem leeren Ordner zu melden.

**Statische Website erstellen** — standardmäßig aktiviert — erzeugt eine Seite pro Notiz,
wie unten beschrieben. Deaktiviert, ist der Export eine einzige Seite, `index.html`, mit
jeder Notiz darin: Das linke Panel ist ein Inhaltsverzeichnis, jede Notiz ist ein Abschnitt
mit ihrem Namen darüber, ihren Überschriften eine Ebene tiefer und ihren IDs, denen die der
Notiz vorangestellt ist, sodass Links zwischen Notizen und zu ihren Überschriften zu Ankern
auf der Seite werden. Die Seite zeigt jeweils eine Notiz — diejenige, auf die der `#anchor`
der Adresse zeigt oder in die er hineinzeigt, und zu Beginn die Wurzelnotiz `index` oder
`README`, sonst die erste Notiz im Wurzelverzeichnis. Das Inhaltsverzeichnis, Links,
Suchergebnisse und die **vorherige** / **nächste**-Links am Ende jeder Notiz wechseln
zwischen ihnen. Das geschieht per CSS (`:target`), sodass es auch ohne das Script
funktioniert; das Script markiert nur die gerade gezeigte Notiz im Inhaltsverzeichnis. Beim
Drucken werden alle Notizen angezeigt. Die browsereigene Suche (`⌘F`) sieht nur die gerade
gezeigte Notiz — das Suchfeld durchsucht alle. Mit Tags führen der Tag-Baum im Panel und
die Chips auf den Notizen zu einem Tag-Abschnitt am Ende, einer Überschrift pro Tag mit
ihren Notizen. Die Seite ist eine einzige Datei: Das Stylesheet und das Script sind
hineingeschrieben. Nur die Bilder liegen daneben, gesammelt in einem `assets`-Ordner, der
die Ordner behält, aus denen sie stammen, jedoch nicht den eigenen `assets`-Schritt jeder
Notiz: `docs/assets/Guide/a.png` wird zu `assets/docs/Guide/a.png`. Die einzelne Seite hat
dieselbe Suche, Design-Schaltfläche, **Alles aufklappen** / **Alles zuklappen**-Schaltflächen
und größenveränderbares Panel wie eine Website; die Suche liest die Notizen direkt aus der
Seite, und ein Ergebnis springt zu seiner Notiz.

Die Textbreite und der Name der Notiz darüber folgen den Editor-Einstellungen zum Zeitpunkt
des Exports: **Textbreite** auf die volle Breite gesetzt ergibt Seiten in voller Breite, und
bei deaktiviertem **Notiznamen als Titel anzeigen** wird kein Name über den Notizen
hinzugefügt.

Die Seiten tragen all ihren Text und einfache relative Links, ohne dass später etwas
nachgeladen wird: Die Website öffnet sich von einer `file://`-URL, von jedem Webserver und
für eine Suchmaschine — jede Seite hat ein `<title>`, ein `<meta name="description">`, das
ihrem ersten Absatz entnommen ist, ein `lang` und ein `<h1>`. Ordner in der Navigation
klappen sich mit `<details>` ein; das Design folgt dem System.

Ein kleines Script, `site.js`, fügt hinzu, was HTML allein nicht kann:

- **Suche**: ein Feld oben im linken Panel. Es sucht nach jedem eingegebenen Wort in den
  Namen, Ordnern und Texten der Notizen; die Ergebnisse nehmen den Platz des Baums ein —
  zuerst passende Namen, jeweils mit einem Ausschnitt rund um die gefundenen Wörter,
  markiert — und der Baum kehrt zurück, wenn das Feld geleert wird (Esc). Enter öffnet das
  erste Ergebnis, ↓ und ↑ gehen die Liste durch. Der Text stammt aus `search.js`, das das
  Script beim ersten Gebrauch des Feldes lädt, sodass die Seiten selbst so leicht bleiben,
  wie sie waren.
- **Alles aufklappen** und **Alles zuklappen** neben „Notizen“ über der Navigation.
- Eine **Design**-Schaltfläche neben dem Namen der Website: ein Mond wechselt zum dunklen
  Design, eine Sonne zurück zum hellen, je nachdem, was das System bevorzugt. Bis sie
  gedrückt wird, folgt das Design dem System.
- Ein Griff am rechten Rand des Panels, der es breiter oder schmaler macht (160–560 px; ein
  Doppelklick stellt die Voreinstellung wieder her, ← → bewegen ihn bei fokussiertem Griff).

Das Design, die Breite der Spalte und der Zustand der Ordner werden von Seite zu Seite
gespeichert, pro Website; die
Ordner der gerade gezeigten Seite sind immer geöffnet. Ohne das Script — blockiert oder aus
der Vorlage entfernt — sind das Suchfeld, die Schaltflächen und der Griff einfach nicht da,
das Design folgt dem System, und die Website liest und verlinkt genauso.

- **Seiten**: `dir/Note.md` wird zu `dir/Note.html`. Eine Notiz, die mit einer Überschrift
  beginnt, die ihrem Namen entspricht, hat diese Überschrift als Titel der Seite, mit
  ihren Tags darunter. Eine Wurzelnotiz namens `index` oder `README` wird zur Startseite,
  `index.html`; ohne eine solche listet die Startseite die Notizen und die Tags auf.
  `[Text](other.md)` und `[[wiki links]]` verweisen auf die Seiten, `[[Note#Heading]]` auf
  die Überschrift — jede Überschrift trägt eine ID —, und ein Link zu einer Notiz, die nicht
  im Export enthalten ist, bleibt reiner Text. Aufgaben-Kontrollkästchen werden angezeigt,
  sind aber nicht klickbar. Front Matter wird weggelassen.
- **Bilder**: jedes Bild und PDF im Ordner wird unter demselben Pfad kopiert, sodass sowohl
  `![[image.png]]` als auch `![alt](path.png)` weiterhin funktionieren; eine Einbettung
  wird dort gefunden, wo der Editor sie findet.
- **Tags**: Ist das Kontrollkästchen **Tags exportieren** aktiviert, zeigt jede Seite ihre
  Tags, der Tag-Baum befindet sich unter der Navigation, und eine Seite pro Tag listet
  dessen Notizen auf — ein übergeordneter Tag die Notizen jedes darunterliegenden Tags —,
  dazu ein Tag-Verzeichnis unter `tags/index.html`. Nur Notizen im Export zählen.
- **Vorlage**: der Dialog zeigt die Seitenvorlage; dort bearbeiten oder **Standard
  wiederherstellen**, und sie wird gespeichert. Die Vorlage ist HTML mit `{{Platzhaltern}}`:

  | Platzhalter | Steht für |
  | --- | --- |
  | `{{navigation}}` | der Ordnerbaum als `<nav>`, die aktuelle Seite markiert — erforderlich |
  | `{{heading}}` | das `<h1>` der Seite, leer, wenn die Notiz mit einer eigenen beginnt — erforderlich |
  | `{{content}}` | die Notiz als HTML — erforderlich |
  | `{{tags}}` | der Tag-Baum als `<nav>`; erforderlich, wenn Tags exportiert werden, sonst leer |
  | `{{pagetags}}` | die Tags der Notiz als `#chips`, die zu ihren Seiten verlinken |
  | `{{title}}` | der Name der Seite als reiner Text, für `<title>` |
  | `{{site}}` | der Name des exportierten Ordners |
  | `{{description}}` | der erste Absatz, reiner Text, für `<meta name="description">` |
  | `{{width}}` | `full` oder `column`, aus der Einstellung der Textbreite |
  | `{{root}}` | `../` pro Ordner, in dem die Seite liegt, sodass `{{root}}style.css` das Wurzelverzeichnis erreicht |
  | `{{styles}}` | das Stylesheet: ein `<link>` zu `style.css`, oder das ganze `<style>` auf einer einzelnen Seite |
  | `{{script}}` | das Script: ein `<script src>` für `site.js`, oder das ganze `<script>` auf einer einzelnen Seite |
  | `{{theme}}` | die Hell/Dunkel-Schaltfläche |
  | `{{path}}` | der Pfad der Notiz, `docs/Note.md` |
  | `{{lang}}` | die Sprache der Oberfläche, für `<html lang>` |

  Eine Website erhält `style.css`, `site.js` und `search.js` in ihrem Wurzelverzeichnis,
  egal ob die Vorlage sie verwendet oder nicht; eine einzelne Seite trägt ihr Stylesheet und
  Script in sich, und erhält ein `style.css` daneben nur, wenn ihre Vorlage, von vor
  `{{styles}}`, noch eines verlinkt. Das Standard-Stylesheet gestaltet die Notiz wie die
  Leseansicht des Editors und liest die Breite aus `<html data-width="{{width}}">`. Ein
  Platzhalter, den der Export nicht kennt, bleibt, wie er ist. Eine vor dem Erscheinen eines
  neuen Platzhalters gespeicherte Vorlage verwendet ihn nicht: **Standard wiederherstellen**
  bringt ihn hinein.

## Datenschutz und Sicherheit

- **Die Seite erreicht nichts.** Eine Content-Security-Policy in der Datei lässt ihren Code
  nichts abrufen außer Dateien neben ihr auf demselben Server (`connect-src 'self'`, für
  einen mit `index.json` bereitgestellten Ordner), und kein Formular irgendwohin senden.
  Der Build schlägt fehl, wenn die Richtlinie fehlt oder sich eine externe Referenz
  einschleicht. Die Kopie der PWA lässt ihr Manifest und ihren Service Worker zu, beide vom
  eigenen Ursprung.
- **Scripts in Notizen laufen nie.** Notizen dürfen HTML enthalten — so funktionieren
  Textfarben —, daher erlaubt die Richtlinie genau ein Script, das eigene des Editors, per
  Hash: Ein `onerror` auf einem `<img>` oder ein `<script>` in einer Notiz bewirkt nichts.
- **Was eine Notiz im Web verlinkt, lädt von dort**: ein Bild, ein Video oder ein
  eingebetteter Frame mit einer `https://`-Adresse, wie in jedem Markdown-Betrachter — das
  ist die Entscheidung der Notiz, nicht die des Editors. Solche Anfragen tragen keinen
  `Referer`.
- **Dateien bleiben auf Ihrer Festplatte.** Notizen werden direkt an Ort und Stelle über die
  File System Access API gelesen und geschrieben; die gespeicherten Ordner sind Handles in
  der IndexedDB des Browsers, nie Pfade oder Inhalte. Wo ein Browser nicht auf eine Festplatte
  schreiben kann, werden die geöffneten Ordner in seine IndexedDB kopiert, nur auf diesem Gerät,
  und verlassen sie nur als ZIP-Archiv, das Sie herunterladen — siehe
  „[Im Browser aufbewahrte Notizen](#im-browser-aufbewahrte-notizen)“.
- Die Berechtigungen der Erweiterung: siehe „[Markdown Knowledge Base](#markdown-knowledge-base-die-chrome-erweiterung)“.

## Funktionen

- **Dateibaum**: einklappbare Ordner, Filtern nach Namen, Erstellen, Umbenennen und
  Löschen über das Kontextmenü, größenveränderbare Leiste, ausblendbare Leiste (`⌘\`).
- **Formatieren der Auswahl**: Überschriften H1–H3, fett, kursiv, durchgestrichen,
  Festbreitenschrift, `==…==`-Hervorhebung, Text- und Hintergrundfarbe, Link,
  `[[wiki link]]`, Listen, Aufgaben, Zitat, Codeblock, Tabelle, Trennlinie.
- **Markup**: CommonMark plus Tabellen, Aufgaben mit klickbaren Kontrollkästchen,
  `==highlight==`, `[[wiki links]]`, Front Matter, Syntaxhervorhebung für 19 Sprachen,
  Bilder aus dem Ordner.
- **Bilder**: `![alt](assets/Note/image-1.png)` zeigt ein Bild über seinen Pfad vom Ordner
  der Notiz aus. Obsidians `![[assets/Note/image-1.png]]` funktioniert ebenfalls, der Pfad
  vom Ordner der Notiz aus oder sonst vom Wurzelverzeichnis aus (`![[…|300]]` legt die
  Breite fest). Eine ältere Einbettung mit bloßem Namen, `![[image-1.png]]`, wird im
  Bilderordner der Einstellungen gesucht, mit und ohne den Unterordner der Notiz, in
  `assets/<Notizname>/`, neben der Notiz, und dann überall im Ordner anhand ihres Namens,
  wie Obsidian es tut. Bilderordner beginnen im Baum eingeklappt. Das Umbenennen einer
  Notiz benennt auch ihren Bilderordner um und ändert die Links der Notiz zu ihren Bildern,
  in beiden Formen, auf den neuen Pfad. Ein im Baum angeklicktes Bild öffnet sich als Bild,
  nicht als Text.
- **Bilder hinzufügen**: Die Bild-Schaltfläche in der Symbolleiste wählt Bilddateien aus;
  ein mit `⌘V` eingefügtes Bild — ein Screenshot, ein im Browser kopiertes Bild, eine im
  Dateimanager kopierte Datei — geht auf dieselbe Weise ein. Beides wird im Bilderordner
  neben der Notiz gespeichert, standardmäßig `assets/<Notizname>/`, und als reines Markdown
  mit seinem Pfad eingefügt, `![image-1](assets/<Notizname>/image-1.png)`, das jeder Editor
  anzeigt (ein Leerzeichen im Pfad wird als `%20` geschrieben): am Cursor, oder am Ende der
  Notiz, wenn kein Block geöffnet ist. Auf die Notiz gezogene Bilder gehen dort ein, wo sie
  fallen gelassen werden: an dieser Stelle in einem Block oder einer Tabellenzelle, und
  neben dem Text oder zwischen zwei Blöcken, am Ende des darüberliegenden Blocks; ein
  Ablegen im Lesemodus wechselt zur Bearbeitung, und eines außerhalb der Notiz fügt die
  Bilder am Ende hinzu. Ein Ablegen mit einem darin enthaltenen Ordner öffnet trotzdem den
  Ordner. Ein eingefügter Screenshot wird `image-1.png`, `image-2.png` und so weiter
  genannt; eine ausgewählte Datei behält ihren eigenen Namen, mit einer hinzugefügten
  Nummer, wenn er bereits vergeben ist. Aus einer Tabellenkalkulation kopierte Zellen
  werden als Text eingefügt, nicht als das Bild, das mit ihnen kommt. Nur ein zum Schreiben
  geöffneter Ordner nimmt neue Bilder auf.
- **Tags**: verschachtelte Tags auf Notizen, ein Tag-Baum und eine Seite pro Tag, getrennt
  von den Notizen in `.meta.json` gehalten — siehe „[Tags](#tags)“.
- **Export nach HTML**: der Ordner, oder einer seiner Unterordner, als statische Website
  mit Suche, oder als eine einzelne Seite — siehe „[Export nach HTML](#export-nach-html)“.
- **Eine einzelne Notiz**, geöffnet aus dem Finder oder Explorer in der installierten App,
  oder auf das Fenster gezogen — siehe „[Eine einzelne Notiz](#eine-einzelne-notiz)“.
- **Im Browser aufbewahrte Notizen**, wo er nicht auf eine Festplatte schreiben kann — Safari,
  Firefox, Telefone, iPads —, hinein und heraus als ZIP-Archiv; jeder Ordner lädt sich aus den
  Einstellungen als eines herunter — siehe
  „[Im Browser aufbewahrte Notizen](#im-browser-aufbewahrte-notizen)“.
- **Markdown Knowledge Base**: was in Chrome ausgewählt ist, an die Standardnotiz oder an
  eine, die Sie wählen, mit Send to Markdown; eine Seite, ein Link oder ein Bild an eine
  Notiz — siehe
  „[Markdown Knowledge Base](#markdown-knowledge-base-die-chrome-erweiterung)“.
- **Einstellungen** (das Zahnrad oben rechts, neben der Suche): Sprache der Oberfläche,
  Design (System, Hell, Dunkel), Zoom 50–200 %, Textbreite (eine zentrierte Spalte oder die
  volle Breite), ob der Notizname als Titel angezeigt wird, und wohin hinzugefügte Bilder
  gehen: der Bilderordner neben der Notiz (standardmäßig `assets`) und ob jede Notiz darin
  einen eigenen Unterordner erhält; ohne einen solchen gehen alle Bilder direkt in den
  Ordner. Dann der geöffnete Ordner: Ordner schließen und ZIP herunterladen, um ihn ganz als
  Archiv zu laden. Unten die Version — und in der installierten App eine Suche nach Updates
  sowie, ob sie von selbst installiert werden sollen.
- **Sprachen**: Englisch und 16 weitere — 中文, हिन्दी, Español, Français, العربية, বাংলা,
  Português, Русский, اردو, Bahasa Indonesia, Deutsch, 日本語, Türkçe, 한국어, Italiano,
  Українська. Standardmäßig folgt die Oberfläche der Sprache des Browsers. Im Arabischen
  und Urdu ist die Oberfläche von rechts nach links gespiegelt; die Notiz selbst behält
  ihre eigene Richtung.
- **Telefone**: Auf einem Bildschirm schmaler als 720 px schiebt sich die Dateileiste über
  die Notiz — ☰ öffnet sie, das Auswählen einer Notiz oder ein Tipp daneben schließt sie —
  und die Symbolleiste passt in eine Zeile; die Formatierung erhält nur im
  Bearbeitungsmodus eine zweite Zeile. Export ist dort ausgelassen. Auf einem Touchscreen
  sind die Felder mindestens 16 px groß, sodass iOS nicht hineinzoomt, und die Zeilen des
  Baums sind höher. Das Desktop-Layout und seine gespeicherte Leistenbreite bleiben
  unberührt.
- Automatisches Speichern eine Sekunde nach einer Bearbeitung, Rückgängig und Wiederholen,
  Suche innerhalb der Notiz.
- Sprache, Design, Zoom, Textbreite, Leistenbreite, Höhe des Tag-Bereichs und die zuletzt
  geöffnete Notiz werden gespeichert.

## Tastenkombinationen

| Aktion | Tasten |
| --- | --- |
| Lese-/Bearbeitungsmodus | `⌘E` |
| Speichern | `⌘S` |
| Suche innerhalb der Notiz | `⌘F` |
| Dateileiste | `⌘\` |
| Zoom | `⌘+` · `⌘−` · `⌘0` |
| Fett · kursiv · Link | `⌘B` · `⌘I` · `⌘K` |
| Festbreitenschrift · Hervorheben · Wiki-Link | `⌘⇧C` · `⌘⇧H` · `⌘⇧K` |
| Überschrift 1–6 · Normaler Text | `⌘⌥1`…`⌘⌥6` · `⌘⌥0` |
| Rückgängig · Wiederholen | `⌘Z` · `⌘⇧Z` |
| Listeneinzug | `Tab` · `⇧Tab` |
| Block verlassen | `Esc` |

## Übersetzungen

Der englische Text bleibt im Code: `t('tree', 'Delete')`, `tn('status', '{count} word',
'{count} words', n)`, und `data-i18n="context"` / `data-i18n-attr="context"` in der
Vorlage. Das erste Argument ist der Kontext — der Teil der Oberfläche, zu dem eine
Zeichenkette gehört, sodass dasselbe englische Wort an zwei Stellen unterschiedlich
übersetzt werden kann. Ein Wörterbuch, `src/locales/<code>.json`, bildet Kontext →
englischer Text → Übersetzung ab:

```json
{
  "tree": { "Delete": "Удалить" },
  "status": { "{count} words": { "one": "{count} слово", "few": "{count} слова", "many": "{count} слов", "other": "{count} слова" } }
}
```

Eine Zeichenkette, die dem Wörterbuch fehlt, wird auf Englisch angezeigt. Ein Text mit
einer Zahl hat eine Form pro Pluralkategorie der Sprache (`Intl.PluralRules`), verschlüsselt
nach der englischen Pluralform. `npm run i18n` listet pro Sprache die noch nicht
übersetzten und die nicht mehr verwendeten Zeichenketten auf; `npm test` prüft, dass jede
Übersetzung die englischen Platzhalter behält und alle Pluralformen besitzt.

Was Chrome von der Erweiterung selbst zeigt — ihr Name und ihre Beschreibung, der Titel der
Symbolleisten-Schaltfläche — folgt der Sprache des Browsers statt der der Seitenleiste,
über `chrome.i18n`. Diese Texte sind die englischen aus `src/extension/manifest.json`,
übersetzt in denselben Wörterbüchern unter dem Kontext `manifest`; der Build schreibt sie
nach `_locales/<code>/messages.json` und setzt `__MSG_appName__` und Ähnliches in das
Manifest ein. Chrome hat eigene Codes und ignoriert den Rest: `pt` wird zu `pt_BR` und
`pt_PT`, `zh` wird zu `zh_CN`, und für Urdu gibt es keinen, sodass Chrome die Erweiterung
dort auf Englisch beschreibt. Der Build bricht bei einem Namen über 75 Zeichen oder einer
Beschreibung über 132 Zeichen ab. Das Kontextmenü spricht die Sprache der Seitenleiste,
sobald diese geöffnet wurde, davor die des Browsers.

Diese README wird ebenfalls übersetzt: `docs/readme/README.<code>.md`, eine pro Sprache,
mit der Sprachliste oben in jeder. Eine Änderung hier gehört auch in die Übersetzungen.

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

`build.mjs` bündelt `src/main.ts` mit esbuild zu einer IIFE und setzt sie, zusammen mit den
Styles und dem Symbol (einem Data-URI), in `src/template.html` ein; die Vorlage und das
Stylesheet des Exports werden als Zeichenketten gebündelt. Die Content-Security-Policy der
Vorlage erhält den Hash dieses einen Scripts. Das Ergebnis ist `build/macaed.html`, etwa
640 KB. Der Build schlägt fehl, wenn auch nur eine externe Referenz darin verbleibt.

Derselbe Durchlauf schreibt `build/pages/`: diese Seite als installierbare PWA —
`index.html` mit einem Manifest-Link und einem `<meta name="service-worker">`, das der
Seite sagt, ihren Worker zu registrieren, `manifest.webmanifest`, die Symbole und `sw.js`,
das die Seite zwischenspeichert, sodass sie offline öffnet. `build/macaed.html` selbst
bleibt eine einzelne Datei ohne externe Referenzen.

Und `build/extension/`: `panel.html` — die Vorlage, ihr Script in `panel.js` —
`popup.html` (mit den Stilen der Seite und `popup.css`) und `popup.js`, `background.js`,
`offscreen.html` und `offscreen.js`, die
Symbole, `_locales/` und `manifest.json`, deren Version die von `package.json` ist.
`build/macaed-extension-<version>.zip` enthält dieselben Dateien mit festen Daten: dieselben
Quellen ergeben dieselben Bytes.

Die Browsertests starten das lokale Chrome (`CHROME=/pfad/zu/chrome`, um eines
auszuwählen) und sprechen ohne Abhängigkeiten das DevTools-Protokoll mit ihm; ohne ein
Chrome werden sie übersprungen. `tools/test-extension.mjs` lädt die Erweiterung über
dieses Protokoll (`Extensions.loadUnpacked` über eine Pipe; `--load-extension` gibt es seit
Chrome-Version 137 nicht mehr), öffnet einen Ordner in der Seitenleiste und sendet ihr
Seiten, Auswahlen, Links und Bilder von Testseiten auf einem lokalen Server; danach fügt das
Fenster der Schaltfläche Auswahlen zur Standardnotiz und zu einer gewählten hinzu, über die
Seitenleiste und für sich allein, und legt sie bei geschlossener Wissensdatenbank für die
Seitenleiste beiseite oder öffnet sie selbst; ist keine Seitenleiste geöffnet, fügt das Menü
es der Standardnotiz hinzu oder legt es beiseite. Ein Kontextmenü lässt sich nicht aus DevTools anklicken, daher löst der
Test das `onClicked` des Workers selbst aus und öffnet das Fenster der Schaltfläche als
eigene Seite, der gesagt wird, welcher Tab daneben liegt; ohne echten Klick gewährt Chrome
kein `activeTab`, daher darf die getestete Kopie die Testseiten, `*.test`, als
Host-Berechtigungen erreichen.

## Versionen und Releases

Die Version wird an einer Stelle geschrieben, `package.json`. Der Build setzt sie in die
Seite ein (die Zeile unter dem Startbildschirm, das untere Ende der Einstellungen), in das
`manifest.json` der Erweiterung und in den Cache-Namen der PWA. Ein Build des mit
`v<version>` getaggten Commits zeigt sie, wie sie ist; jeder andere fügt seinen Commit
hinzu, `0.11.0+1a2b3c4`, damit eine Seite von `main` auf GitHub Pages nicht für das Release
gehalten wird. Chromes `version` enthält nur Zahlen, daher geht der Commit dort in
`version_name`.

```sh
npm version minor           # 0.11.0 -> 0.12.0: package.json, package-lock.json, a commit and the tag v0.12.0
git push --follow-tags      # the tag starts .github/workflows/release.yml
```

Der Release-Workflow bricht ab, wenn der Tag und `package.json` nicht übereinstimmen, führt
die Tests aus und hängt dann `macaed-<tag>.html`, `macaed-extension-<tag>.zip` und
`SHA256SUMS.txt` an.

## GitHub Pages

`.github/workflows/pages.yml` baut und testet jeden Push nach `main` und stellt
`build/pages/` auf GitHub Pages bereit (Settings → Pages → Source: GitHub Actions), unter
<https://marketkernel.github.io/markdown-catalog-editor/>. In Chrome, Edge und Arc
verwandelt die Installationsschaltfläche in der Adressleiste sie in ein eigenständiges
App-Fenster; auf iOS ist es Teilen → Zum Home-Bildschirm. Ordner öffnen sich auf dieselbe
Weise wie in der einzelnen Datei.

**Offline.** Einmal geöffnet, funktioniert der Editor ohne Verbindung: Der Service Worker
hält die Seite, ihr Manifest und die Symbole in einem nach der Version benannten Cache und
liefert die Seite von dort. Notizen gehen nie durch ihn hindurch — sie sind auf Ihrer
Festplatte.

**Updates.** Jedes Deployment ändert `sw.js`, sodass der Browser den neuen Worker von
selbst findet — beim Start mit einer Verbindung, alle paar Stunden, während die App
geöffnet bleibt, wenn die Verbindung zurückkehrt, oder wenn Einstellungen → Nach Updates
suchen danach fragt. Der neue Worker lädt seine Version in einen eigenen Cache herunter und
wartet; der laufende liefert weiter die alte Seite, auch offline, sodass sich nichts unter
Ihren Händen ändert. Die Einstellungen, mit einem Punkt auf ihrer Schaltfläche, und der
Startbildschirm sagen dann „Version … ist bereit. Aktualisieren“: Aktualisieren speichert
die geöffnete Notiz (oder fragt, wenn sie nicht gespeichert werden kann), lässt den neuen
Worker herein und lädt die Seite neu, die einmal sagt, dass sie aktualisiert wurde; der alte
Cache wird gelöscht. Ohne die Schaltfläche beginnt die neue Version, sobald jedes Fenster
der App geschlossen wurde — oder, wenn „Updates von selbst installieren, wenn alles gespeichert ist und die App im Hintergrund läuft“ in den Einstellungen aktiviert ist, sobald
nichts ungespeichert ist und das Fenster außer Sicht ist.

Das ist auch der Kompromiss: Eine installierte PWA läuft mit dem, was das letzte Deployment
dorthin gebracht hat, während eine heruntergeladene Datei die Version bleibt, die sie ist.
Für eine auf der Festplatte festgelegte Version nehmen Sie `macaed-<tag>.html` aus einem
Release und vergleichen es mit `SHA256SUMS.txt`.

**Eine `.md` öffnen.** Das Manifest nennt Markdown-Dateien als Dateien, die die App öffnet
(`file_handlers`), und hält sie auf ein Fenster beschränkt (`launch_handler`,
`focus-existing`): siehe „[Eine einzelne Notiz](#eine-einzelne-notiz)“. Die Seite nimmt sie
über `launchQueue` entgegen, sobald ihr Start — das erneute Öffnen des letzten Ordners —
abgeschlossen ist, sodass der Ordner die Notiz nie ersetzt; eine Notiz, die während eines
Exports oder bei geöffnetem Dialog ankommt, wartet, bis Sie sie erneut öffnen.

Die installierte App bittet den Browser, ihren Speicher zu behalten
(`navigator.storage.persist()`): Eine knapp werdende Festplatte könnte sonst die
Offline-Kopie und die gespeicherten Ordner mit sich reißen.

`npm run test:browser` öffnet auch `build/pages/` (`tools/test-pwa.mjs`): Der Service
Worker übernimmt die Seite, Chrome findet das Manifest installierbar, und mit
abgeschaltetem Server lädt die Seite trotzdem noch; dann findet eine Prüfung nichts, dann
keine Verbindung, dann ein neues Deployment, das wartet, bis Aktualisieren es hereinlässt.
Chrome im Headless-Modus übergibt einer App keine Datei, daher gibt eine
Ersatz-`launchQueue` der Seite ein echtes Datei-Handle: Die Notiz öffnet sich von selbst, und
eine Bearbeitung wird darin gespeichert.

## Layout

```
src/template.html   markup with the __STYLES__/__APP__/__ICON__ placeholders and the CSP
src/styles.css      palette, light and dark themes, block paired with its source
src/main.ts         opening a folder, saving, toolbar, search, settings
src/vault.ts        File System Access API, drag-and-drop, webkitdirectory; file CRUD; a note on its own
src/stored.ts       folders kept in the browser's IndexedDB where it cannot write to a disk; a folder ⇄ ZIP
src/zip.ts          ZIP archives: writing, reading, and an inflater for browsers without DecompressionStream
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
src/extension/      "Markdown Knowledge Base": manifest.json; popup.ts, popup.html, popup.css
                    (the button's window: Send to Markdown); background.ts (the menu); take.ts
                    and grab.ts (run in the page: its text or the selection); to-markdown.ts
                    (HTML → Markdown); extension.ts (in the place of platform.ts); messages.ts;
                    knowledge.ts (adding to a note from the popup and the worker); offscreen.ts,
                    offscreen.html (HTML → Markdown for the worker)
tools/              build helpers (load.mjs, i18n.mjs, chrome.mjs) and the tests: block model,
                    formatting, tags, the export, clippings, ZIP archives, dictionaries; in headless Chrome
                    the editor, HTML → Markdown, the PWA and the extension
assets/             icon.svg; pwa/ its PNG sizes for the PWA; extension/ the extension's icons
docs/               the README screenshot and its translations, docs/readme/
build/macaed.html   the build output
build/pages/        the PWA for GitHub Pages
build/extension/    the Chrome extension, and build/macaed-extension-<version>.zip of it
```

## Einschränkungen

- Gemeinsames Bearbeiten, Plugins, Synchronisierung und ein Link-Graph werden nicht
  unterstützt.
- Auf dem Telefon ist das Layout zum Lesen gedacht: Das Kontextmenü des Baums benötigt
  einen langen Druck, den iOS nicht in einen solchen umwandelt, und Tabellen werden mit
  Leisten erweitert, die bei Hover erscheinen.
- Nur Chromium-basierte Browser auf einem Computer können Dateien in einen Ordner auf der
  Festplatte schreiben; anderswo werden die Notizen im Browser aufbewahrt und als ZIP-Archiv
  herausgeholt.
- Die Erweiterung ist für Chrome (und darauf aufbauende Browser mit Seitenleiste, wie
  Edge); sie ist noch nicht im Chrome Web Store. Sie behält Bilder im Web, statt sie in den
  Ordner herunterzuladen: Das würde Zugriff auf jede Website erfordern.

## Lizenz

MIT — siehe [LICENSE](../../LICENSE).

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
<a href="README.tr.md">🇹🇷 Türkçe</a> ·
<a href="README.ko.md">🇰🇷 한국어</a> ·
<b>🇮🇹 Italiano</b> ·
<a href="README.uk.md">🇺🇦 Українська</a>
</h3>
<!-- /languages -->

Un editor Markdown per una cartella locale di note — nello spirito di Obsidian, ma interamente
contenuto in un unico file HTML autonomo. Non viene usata alcuna rete: i file sono letti e
salvati direttamente su disco.

**[Demo online](https://markdown.marketkernel.com/)** — lo stesso editor
come PWA (Progressive Web App): può essere installato nel sistema e allora viene eseguito come
un'applicazione separata, con una propria finestra e icona, e funziona offline. Su un computer, in
Chrome, Edge e Arc, usa il pulsante di installazione nella barra degli indirizzi; su Android, il
menu ⋮ di Chrome → Installa app; su iOS, Condividi → Aggiungi alla schermata Home, in Safari o in
Chrome. Anche lì le tue note restano sul tuo disco, l'app installata apre un `.md` direttamente
dal Finder o da Esplora risorse, e si aggiorna quando lo decidi tu — vedi
«[GitHub Pages](#github-pages)».

Lo stesso editor è anche **Markdown Knowledge Base**, un'[estensione
Chrome](#markdown-knowledge-base-lestensione-chrome): seleziona del testo su una pagina web,
premi il suo pulsante, e **Send to Markdown** lo aggiunge alla nota predefinita della tua base di
conoscenza — o a qualsiasi nota tu scelga. L'editor stesso si apre accanto alla pagina nel
pannello laterale di Chrome.

![L'editor con una cartella di note aperta: l'albero dei file e i tag a sinistra, una nota in modalità modifica a destra](../macaed.jpg)

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

## Come usarlo

1. Compila `build/macaed.html` (vedi «[Compilazione](#compilazione)») e aprilo in un browser.
2. «Apri cartella» → scegli una cartella con file `.md`. Puoi anche semplicemente trascinare la
   cartella nella finestra.
3. L'interruttore **Lettura / Modifica** in alto, oppure `⌘E`.

In Chrome, Edge e Arc la cartella si apre tramite la File System Access API: le note vengono
lette e scritte sul posto, e creare, rinominare ed eliminare file e cartelle funzionano tutti. In
Safari e Firefox la cartella si apre in sola lettura, e `⌘S` propone di scaricare il file
modificato — e così fa anche sui telefoni: Chrome su Android non ha File System Access, e ogni
browser su iOS, Chrome incluso, gira sul motore di Safari.

L'editor ricorda le ultime sei cartelle aperte lì (una pagina non viene mai a conoscenza del
percorso di una cartella, quindi conserva il riferimento (handle) della cartella nell'IndexedDB
del browser), e l'ultima nota aperta in ciascuna. All'avvio successivo l'ultima cartella si apre
da sola se il browser lo permette ancora — in un'app installata, o una volta scelto «Consenti a
ogni visita». Altrimenti la schermata iniziale elenca le cartelle recenti: un clic, e il browser
richiede di nuovo l'accesso. Per tornare a quella lista — per cambiare cartella o aprirne una
nuova — fai clic sul nome della cartella in alto nel pannello dei file, oppure su «Chiudi
cartella» nelle impostazioni; × rimuove una cartella dalla lista.

Se metti `macaed.html` accanto alle tue note e lo servi via HTTP, la pagina individua la cartella
da sola — a condizione che un `index.json` si trovi accanto, nella forma
`{ "name": "Notes", "files": ["Note.md", "Folder/Other.md"] }`.

### Una singola nota

Un file `.md` può essere aperto da solo, senza la sua cartella:

- **Dal Finder o da Esplora risorse**, nell'app installata (Chrome o Edge su un computer): Apri
  con → l'app, oppure rendila l'app predefinita per i file `.md`. La nota arriva nella finestra
  dell'app quando una è aperta — due finestre sullo stesso file sovrascriverebbero i salvataggi
  l'una dell'altra — e prende il posto della cartella lì mostrata; aprire di nuovo la stessa
  nota la lascia com'è.
- **Trascinata sulla finestra**, in qualsiasi browser.

La nota viene letta e scritta sul posto, come in una cartella — in Safari e Firefox in sola
lettura, con `⌘S` che propone uno scaricamento. Senza una cartella attorno non c'è nulla da
creare, rinominare o eliminare accanto ad essa, né immagini dalla sua cartella, tag o
esportazione: quelli vengono con l'apertura della cartella. Una nota aperta così non viene
aggiunta alle cartelle recenti.

## Markdown Knowledge Base: l'estensione Chrome

`npm run build` scrive anche `build/extension/`: l'editor come estensione Chrome, e
`build/macaed-extension-<version>.zip` per il Chrome Web Store; una release porta anche lo zip.
Per installarla: `chrome://extensions` → Modalità sviluppatore → Carica estensione non
pacchettizzata → `build/extension` (oppure lo zip estratto).

**La base di conoscenza** è la cartella di note aperta per ultima nell'estensione. L'editor
stesso — la **modalità completa** — vive nel pannello laterale di Chrome, accanto alla pagina,
nella disposizione per telefono, perché un pannello è stretto; vi resta tra una scheda e
l'altra. Una cartella vi si apre come nel file, e le cartelle recenti vengono ricordate —
quelle proprie dell'estensione, distinte da quelle del file o della PWA.

**Il pulsante della barra degli strumenti** (o `Alt+Shift+M`) apre una piccola finestra sopra
la pagina:

- In alto, ciò che è selezionato sulla pagina, come Markdown — oppure, se non è selezionato
  nulla, il testo principale della pagina: l'articolo, senza i menu del sito, le barre
  laterali, il piè di pagina, i pulsanti di condivisione, i moduli e le parti nascoste.
- **Send to Markdown** lo aggiunge alla fine della **nota predefinita** — `Inbox.md` alla
  radice della base di conoscenza all'inizio, creata la prima volta che serve. Dopo una riga
  vuota viene il testo, poi una riga «— [Il titolo della pagina](https://…)» che rimanda alla
  sua origine. La finestra si chiude una volta scritta.
- **Aggiungi a un’altra nota**: le note della base di conoscenza, con un campo per trovarne una
  per nome; un clic su una nota la aggiunge lì invece. La stella accanto a una nota la rende
  predefinita; la predefinita è elencata per prima.
- Se non è selezionato nulla, **Come nuova nota** trasforma la pagina in una nota a sé stante
  (sotto).
- **Modalità completa** apre il pannello laterale.

**Quando la base di conoscenza è chiusa** — Chrome riprende l'accesso a una cartella non appena
si chiude l'ultimo pannello laterale, e dopo un riavvio, a meno che tu non abbia scelto «Consenti
a ogni visita» — una pagina non può entrare nella cartella finché non clicchi. La finestra allora
lo dice e elenca comunque le note, come le ha viste l'ultima volta il pannello: **Send to
Markdown**, oppure un clic su una nota, mette da parte ciò che hai selezionato, nello storage
proprio dell'estensione, e questo va alla fine di quella nota non appena un pannello laterale
riapre la cartella. **Apri** chiede la cartella a Chrome direttamente nella finestra; un clic
sulla cartella nel pannello laterale fa lo stesso. Quando Chrome lo chiede, scegli **Consenti a
ogni visita**: la cartella resta quindi aperta alla chiusura del pannello, e dopo un riavvio.

Quando il pannello laterale ha la base di conoscenza aperta, è lui ad aggiungere alla nota —
potrebbe avere quella nota aperta con modifiche non ancora salvate, che una scrittura alle sue
spalle farebbe perdere. Senza alcun pannello aperto e con la cartella ancora consentita — a ogni
visita, o tramite **Apri** — è la finestra a scrivere la nota stessa.

**Il menu contestuale** di una pagina ha **Invia la pagina a Markdown**; su un testo
selezionato, **Invia la selezione a Markdown**; su un link, **Invia il link a Markdown**; su
un'immagine, **Invia l’immagine a Markdown**. Nessuno di questi apre il pannello laterale:
aprire un pannello restringe la pagina. Senza alcun pannello aperto nella finestra, ciò che hai
scelto va alla fine della nota predefinita, come con **Send to Markdown** — oppure, con la base
di conoscenza chiusa, aspetta che si apra, come sopra. Il pulsante della barra degli strumenti
dice cosa è successo: un segno di spunta per un momento, `!` con il motivo nel suo titolo, e
quanti invii aspettano, finché un pannello non apre la cartella. Se il pannello della finestra
è aperto, va lì invece, dove una finestra di dialogo mostra cos'è arrivato — e da quale sito —
come Markdown che puoi ancora modificare, e chiede dove deve andare:

- **Una nuova nota**, l'opzione predefinita per una pagina: nella cartella dei ritagli
  (`Clippings` alla radice, salvo che tu la cambi; la cartella viene ricordata, vuota significa la
  radice), con il nome basato sul titolo della pagina, con ciò che un nome di file non può
  contenere lasciato fuori. Un nome già usato riceve un numero, `Title 2.md`. La nota inizia con
  un front matter — il titolo della pagina, il suo indirizzo e il giorno — e poi il testo; si apre
  una volta salvata.

  ```markdown
  ---
  title: "The page's title"
  source: "https://example.com/post"
  clipped: 2026-10-07
  ---

  # The page's title

  The text…
  ```

- **La fine della nota aperta**, l'opzione predefinita per una selezione, un link o
  un'immagine, allo stesso modo di Send to Markdown. Un link non ha bisogno di una riga di
  origine: è la propria fonte.

Inviato prima che una cartella sia mai stata aperta, resta in attesa: il pannello chiede una
cartella, e la finestra di dialogo arriva una volta che una cartella è aperta. Una pagina che l'estensione non
può leggere — le pagine interne di Chrome, il Web Store, un PDF — arriva come link ad essa.

**Cos'è il Markdown.** Titoli, paragrafi, **grassetto**, *corsivo*, ~~barrato~~,
==evidenziato==, `code`, link e immagini con il loro indirizzo completo, elenchi — annidati,
numerati, di attività — citazioni, blocchi di codice con il loro linguaggio (da `language-…`, il
`highlight-source-…` di GitHub e simili), tabelle (un'interruzione di riga in una cella diventa
`<br>`, come la scrive l'editor), separatori. Il testo si legge come tale: un `*`, un `#`
all'inizio di una riga o un `<b>` digitato sulla pagina viene escluso (escaped), così non si
trasforma mai in formattazione, e nessun HTML della pagina entra nella nota. Le immagini restano
sul web, collegate tramite il loro indirizzo; viene preso l'indirizzo reale di un'immagine lazy
anziché il suo segnaposto, e i pixel di tracciamento vengono lasciati fuori.

**Permessi.** `activeTab`: un clic sul pulsante, nel menu o la scorciatoia dà all'estensione
quella singola scheda, e solo allora la legge — con `scripting`, una funzione eseguita nella
pagina ne copia il testo e lo restituisce. Nessuno script di contenuto viene eseguito da nessuna
parte, e non c'è altrimenti alcun accesso a nessun sito: nessun `host_permissions`, che la build
rifiuta. `offscreen`: il worker non ha un DOM, quindi senza alcun pannello aperto l'HTML di
una pagina o di una selezione diventa Markdown in un documento offscreen dell'estensione, che
si chiude una volta terminato. `contextMenus`, `sidePanel` e `storage` — ciò che viene inviato
al pannello laterale arriva al pannello della sua finestra tramite `chrome.storage.session`,
cancellato alla chiusura del browser; in `chrome.storage.local`, ciò che la finestra del
pulsante ha messo da parte mentre la base di conoscenza era chiusa, l'elenco delle sue note, e
la lingua del pannello e la nota predefinita, per il worker. La finestra del pulsante e il
worker chiedono a un pannello che ha la base di conoscenza aperta di aggiungere a una nota con
un
messaggio `chrome.runtime`, che il pannello accetta solo dalle pagine dell'estensione stessa. Le
pagine dell'estensione hanno `connect-src 'none'`: l'editor non raggiunge nulla sulla rete; la build lo
verifica, così come il fatto che nessuna pagina abbia uno script inline o un indirizzo esterno.

**Com'è fatta.** Il pannello è la pagina stessa: `panel.html` con il suo script in `panel.js`,
come richiede il Manifest V3 — lo stesso `src/main.ts`, con `src/extension/extension.ts` al posto
di `src/platform.ts`, i cui hook non fanno nulla nel file e nella PWA. La finestra del pulsante è
`popup.html` e `popup.js` (`src/extension/popup.ts`), con gli stili della pagina: legge il
riferimento della base di conoscenza dallo stesso IndexedDB del pannello, e scrive tramite esso
finché il browser lo consente ancora; altrimenti mette da parte ciò che viene inviato in
`chrome.storage.local`, dove lo trova il pannello che apre la cartella
(`src/extension/messages.ts`). Il worker, `background.js`, contiene il menu: legge la scheda
(`src/extension/take.ts`, `grab.ts`), e invia ciò che ha preso al pannello della finestra,
oppure lo aggiunge alla nota predefinita come fa la finestra del pulsante
(`src/extension/knowledge.ts`), tramite `offscreen.html` per il Markdown
(`src/extension/offscreen.ts`). L'HTML diventa Markdown in `src/extension/to-markdown.ts`, e
l'editor lo aggiunge o chiede dove deve andare (`src/clip.ts`, `src/clip-ui.ts`).

## Anteprima dal vivo

In modalità modifica il documento resta formattato, e solo il blocco in cui si trova il cursore
si trasforma in Markdown grezzo. Un blocco è un paragrafo, un titolo, un intero elenco, un blocco
di codice o una citazione: un elenco non si disgrega riga per riga. Le tabelle vengono modificate
in modo diverso — vedi «[Tabelle](#tabelle)».

La riga sorgente mantiene la dimensione del carattere, il peso e l'altezza di riga di quella
formattata, così il testo non salta: `# Heading` viene mostrato alla dimensione di un titolo.
Questo viene verificato automaticamente — quando un blocco cambia modalità, il suo bordo
superiore si sposta di meno di un pixel, a qualsiasi livello di zoom tra 50 e 200%.

C'è un punto in cui l'altezza cambia, ed è inevitabile in questa modalità: un blocco di codice
guadagna due righe di recinzione (fence) di `` ``` ``. I blocchi vicini non sussultano per
questo — si sposta solo ciò che sta sotto.

Invio al di fuori di un elenco inizia un nuovo blocco. Premuto alla fine di un blocco, o su una
riga vuota, apre una riga vuota sotto e vi mette il cursore; premuto di nuovo, ne aggiunge
un'altra. In Markdown una singola riga vuota separa solo due blocchi, quindi una riga vuota in
cui si può digitare è una riga circondata da righe vuote su entrambi i lati — l'editor aggiunge
da solo la riga di separazione, e il testo digitato non si incolla mai al blocco vicino. Tali
righe, e le definizioni di riferimento dei link (`[id]: https://…`), vengono mostrate solo in
modalità modifica; la vista di lettura rende il Markdown così com'è.

## Tabelle

Una tabella non si trasforma mai in `| pipes |`. Un clic apre solo la cella sotto il puntatore, e
la cella mostra il proprio testo — `**bold**` anziché in grassetto — così la formattazione in
linea e i segni, i link e i colori della barra degli strumenti funzionano ancora al suo interno.
Digitare riscrive solo quella cella nel file; il resto della tabella mantiene la sua spaziatura e
il suo allineamento.

- **Spostarsi**: Tab e Shift+Tab vanno alla cella successiva e precedente, Invio alla cella sotto,
  le frecce alla cella vicina al margine del testo — e oltre il margine della tabella, al blocco
  successivo. Invio sull'ultima riga avvia un nuovo blocco sotto la tabella.
- **Interruzioni di riga**: Ctrl+Invio (anche ⌘Invio o Shift+Invio) avvia una nuova riga dentro
  la cella. Una riga di tabella è una sola riga di Markdown, quindi l'interruzione viene scritta
  come `<br>`; la cella in modifica la mostra come una vera interruzione di riga, e il testo
  incollato mantiene le sue righe allo stesso modo. All'interno di una cella con più righe, le
  frecce su e giù si spostano prima tra le sue righe. Il testo delle celle è allineato in alto.
- **Aggiungere**: in modalità modifica, passare sopra una tabella mostra una barra con un **+**
  sotto di essa, che aggiunge una riga, e uno alla sua destra, che aggiunge una colonna. Tab
  nell'ultima cella aggiunge anch'esso una riga.
- **Eliminare**: solo righe e colonne vuote vengono eliminate, così nessun testo viene perso per
  errore. Passare sopra una riga vuota mostra una **×** alla sua sinistra, sopra una colonna
  vuota una **×** sopra di essa. Backspace in una cella vuota fa lo stesso da tastiera: elimina
  la riga se l'intera riga è vuota, altrimenti la colonna se l'intera colonna lo è (intestazione
  compresa); una tabella senza più testo viene eliminata interamente. La riga di intestazione
  resta — una tabella ne ha bisogno.

Aggiungere o eliminare riscrive la tabella nella forma semplice `| a | b |`.

## Tag

I tag raggruppano le note tra cartelle. Non vengono scritti nelle note: il Markdown resta
esattamente com'era, e tutti i tag della cartella vivono in un unico file accanto alle note.

- **Su una nota**: i tag si trovano sotto il titolo come riquadri `#tag`, seguiti da un **+**. Il
  **+** si trasforma in un campo; Invio aggiunge il tag, e il **+** riappare dopo. I tag già
  usati nella cartella vengono suggeriti mentre scrivi. Esc annulla; lasciare il campo con del
  testo dentro aggiunge comunque il tag. **×** su un riquadro rimuove il tag, e un clic sul
  riquadro apre la pagina del tag. I tag possono essere modificati sia in lettura sia in
  modifica.
- **Ortografia**: un `#` iniziale viene rimosso e gli spazi dentro un tag diventano trattini,
  così `#da fare` viene memorizzato come `da-fare`. Un tag che differisce da uno esistente solo
  per maiuscole/minuscole assume l'ortografia esistente — `Idea` e `idea` non diventano mai due
  tag. Una nota non può portare lo stesso tag due volte.
- **Annidamento**: `/` annida i tag. `lavoro/alpha` e `lavoro/beta` si trovano sotto `lavoro`
  nell'albero dei tag, e una nota taggata `lavoro/alpha` viene contata anche sotto `lavoro`.
- **L'albero dei tag**: la sezione in fondo al pannello dei file, separata dall'albero dei file.
  Ogni tag mostra quante note lo portano, esso o un tag annidato sotto di esso; la freccia di un
  tag genitore ripiega i suoi figli, e il titolo ripiega l'intera sezione. Il filtro per nome
  sopra l'albero dei file filtra anche i tag. La sezione occupa fino al 42% del pannello e
  scorre al suo interno; trascinare la linea sopra di essa la rende più bassa (mai più alta), un
  doppio clic sulla linea restituisce lo spazio, e con la linea a fuoco ↑ e ↓ fanno lo stesso.
  L'altezza viene ricordata.
- **La pagina di un tag**: cliccare su un tag nell'albero, o su un riquadro, mostra le note che
  lo portano — un tag genitore elenca anche le note di ogni tag sotto di esso. Ogni riga dà il
  nome della nota, la sua cartella e tutti i suoi tag; un clic sul nome apre la nota, un clic su
  un tag apre quel tag. La pagina è di sola lettura: non c'è nulla da modificare su di essa, e la
  barra degli strumenti di formattazione è disattivata. Per un tag annidato, i genitori nel suo
  titolo rimandano alle proprie pagine.
- **Rinomina ed eliminazione**: i tag seguono una nota, o ogni nota di una cartella, quando viene
  rinominata o eliminata dal pannello dei file. Una nota spostata o eliminata al di fuori
  dell'editor mantiene la sua voce nel file, ma la voce non viene mostrata né contata finché la
  nota è mancante.
- **Cartelle di sola lettura** (Safari, Firefox): i tag vengono mostrati, ma non il **+** e la
  **×**.

### `.meta.json`

Il file si trova alla radice della cartella aperta e viene creato con il primo tag. Non viene mai
mostrato nell'albero dei file.

```json
{
  "notes": {
    "Ideas.md": { "tags": ["idea", "work/alpha"] },
    "Projects/Roadmap.md": { "tags": ["work/alpha", "planning"] }
  }
}
```

Le chiavi sono i percorsi delle note relativi alla radice, come li mostra l'albero; i tag
mantengono l'ordine in cui sono stati aggiunti. Il file viene scritto con le note ordinate per
percorso e un'indentazione di due spazi, così si legge bene in un diff, e le note senza più tag
vengono eliminate da esso. I campi che l'editor non conosce — in cima o dentro la voce di una
nota — vengono mantenuti quando riscrive il file, così altri strumenti possono memorizzarvi i
propri dati. Se il file non è un oggetto JSON valido, l'editor lo segnala, non mostra alcun tag e
non lo sovrascrive mai; i tag non possono essere modificati finché il file non viene corretto e
la cartella riaperta.

Quando la cartella viene servita via HTTP con un `index.json` (vedi
«[Come usarlo](#come-usarlo)»), elenca `.meta.json` tra i suoi file per far comparire i tag.

## Esporta in HTML

Il pulsante di esportazione nella barra degli strumenti (accanto a Salva) trasforma l'intera
cartella in un sito statico; **Esporta in HTML…** nel menu contestuale di una cartella fa lo
stesso per quella sola cartella, e sullo spazio vuoto sotto l'albero per l'intera cartella. Il
sito viene scritto in `output/<cartella>/` alla radice della cartella delle note; la cartella
prende il nome dal momento dell'esportazione, `2025-12-31_23-33-33`, e può essere rinominata
nella finestra di dialogo. `output` non compare mai nell'albero. Solo una cartella aperta in
scrittura può essere esportata.

Mentre l'esportazione è in corso, la finestra di dialogo mostra il passaggio in corso — lettura
delle note, scrittura delle pagine, copia delle immagini — con una barra di avanzamento, e non
può essere chiusa; **Interrompi** la termina dopo i file già in corso, lasciando ciò che è già
stato scritto. Il pulsante di esportazione e la voce di menu sono disattivati finché non è
terminata. I file vengono letti e scritti più alla volta, ogni cartella sul percorso creata una
sola volta. Alla fine l'esportazione rilegge la cartella dal disco: se dovesse mancare un file, la
finestra di dialogo dice quanti e ne nomina uno, invece di segnalare un successo su una cartella
vuota.

**Crea un sito statico** — attivo per impostazione predefinita — crea una pagina per nota, come
descritto sotto. Disattivato, l'esportazione è una singola pagina, `index.html`, con tutte le
note al suo interno: il pannello di sinistra è un indice, ogni nota è una sezione con il suo nome
sopra, i suoi titoli di un livello più in basso e i loro id prefissati con quello della nota, così
i link tra note e verso i loro titoli diventano ancore nella pagina. La pagina mostra una nota
alla volta — quella verso cui punta il `#ancora` dell'indirizzo, o in cui punta, e all'inizio la
radice `index` o `README`, altrimenti la prima nota alla radice. L'indice, i link, i risultati di
ricerca e i link **precedente** / **successivo** alla fine di ogni nota passano dall'una
all'altra. È fatto in CSS (`:target`), quindi funziona anche senza lo script; lo script si limita
a segnare la nota in mostra nell'indice. La stampa mostra tutte le note. La ricerca del browser
(`⌘F`) vede solo la nota in mostra — il campo di ricerca scorre tutte le note. Con i tag, l'albero
dei tag nel pannello e i riquadri sulle note portano a una sezione dei tag alla fine, un titolo
per tag con le sue note. La pagina è un solo file: il foglio di stile e lo script vi sono scritti
dentro. Solo le immagini stanno a parte, raccolte in una cartella `assets` che mantiene le
cartelle da cui provengono ma non il passaggio `assets` proprio di ogni nota:
`docs/assets/Guide/a.png` diventa `assets/docs/Guide/a.png`. La pagina singola ha la stessa
ricerca, lo stesso pulsante del tema, gli stessi pulsanti **espandi tutto** / **comprimi tutto** e
lo stesso pannello ridimensionabile di un sito; la ricerca legge le note direttamente dalla
pagina, e un risultato salta alla sua nota.

La larghezza del testo e il nome della nota sopra di essa seguono le impostazioni dell'editor al
momento dell'esportazione: **Larghezza del testo** impostata sul pannello pieno dà pagine a
larghezza piena, e con **Mostra il nome della nota come titolo** disattivato non viene aggiunto
alcun nome sopra le note.

Le pagine portano tutto il loro testo e semplici link relativi, senza nulla caricato in seguito:
il sito si apre da un URL `file://`, da qualsiasi server web e per un motore di ricerca — ogni
pagina ha un `<title>`, un `<meta name="description">` tratto dal suo primo paragrafo, un `lang`
e un solo `<h1>`. Le cartelle nella navigazione si ripiegano con `<details>`; il tema segue il
sistema.

Un piccolo script, `site.js`, aggiunge ciò che l'HTML da solo non può:

- **Ricerca**: un campo in cima al pannello di sinistra. Cerca ogni parola digitata nei nomi,
  nelle cartelle e nel testo delle note; i risultati prendono il posto dell'albero — i nomi che
  corrispondono per primi, ciascuno con un estratto attorno alle parole trovate, evidenziato — e
  l'albero torna quando il campo viene svuotato (Esc). Invio apre il primo risultato, ↓ e ↑
  scorrono la lista. Il testo viene da `search.js`, che lo script carica la prima volta che il
  campo viene usato, così le pagine stesse restano leggere come prima.
- **Espandi tutto** e **comprimi tutto** accanto a «Note» sopra la navigazione.
- Un pulsante del **tema** accanto al nome del sito: una luna passa al tema scuro, un sole torna
  a quello chiaro, qualunque cosa preferisca il sistema. Finché non viene premuto, il tema segue
  il sistema.
- Una maniglia sul bordo destro del pannello che lo rende più largo o più stretto (160–560 px;
  un doppio clic restituisce il valore predefinito, ← → lo spostano con la maniglia a fuoco).

Il tema, la larghezza della colonna e lo stato delle cartelle vengono ricordati di pagina in
pagina, per sito; le cartelle della pagina mostrata si aprono sempre. Senza lo script — bloccato,
o tolto dal modello — il campo di ricerca, i pulsanti e la maniglia semplicemente non ci sono, il
tema segue il sistema, e il sito si legge e si collega allo stesso modo.

- **Pagine**: `dir/Note.md` diventa `dir/Note.html`. Una nota che inizia con un titolo uguale al
  suo nome ha quel titolo come titolo della pagina, con i suoi tag sotto. Una nota radice
  chiamata `index` o `README` diventa la pagina iniziale, `index.html`; senza di essa, la pagina
  iniziale elenca le note e i tag. `[testo](altro.md)` e `[[link wiki]]` puntano alle pagine,
  `[[Nota#Titolo]]` al titolo — ogni titolo porta un id — e un link a una nota non presente
  nell'esportazione resta testo semplice. Le caselle di spunta delle attività sono mostrate, non
  cliccabili. Il front matter viene lasciato fuori.
- **Immagini**: ogni immagine e PDF nella cartella viene copiato allo stesso percorso, così sia
  `![[image.png]]` sia `![alt](path.png)` continuano a funzionare; un'incorporazione viene
  trovata dove la trova l'editor.
- **Tag**: con la casella **Esporta i tag** attiva, ogni pagina mostra i suoi tag, l'albero dei
  tag si trova sotto la navigazione, e una pagina per tag elenca le sue note — un tag genitore,
  le note di ogni tag sotto di esso — più un indice dei tag in `tags/index.html`. Contano solo
  le note nell'esportazione.
- **Modello**: la finestra di dialogo mostra il modello di pagina; modificalo lì, oppure
  **Ripristina il predefinito**, e viene ricordato. Il modello è HTML con dei
  `{{segnaposto}}`:

  | Segnaposto | Rappresenta |
  | --- | --- |
  | `{{navigation}}` | l'albero delle cartelle come `<nav>`, con la pagina attuale segnata — obbligatorio |
  | `{{heading}}` | l'`<h1>` della pagina, vuoto quando la nota inizia con il proprio — obbligatorio |
  | `{{content}}` | la nota come HTML — obbligatorio |
  | `{{tags}}` | l'albero dei tag come `<nav>`; obbligatorio quando i tag vengono esportati, altrimenti vuoto |
  | `{{pagetags}}` | i tag della nota come `#riquadri` che rimandano alle loro pagine |
  | `{{title}}` | il nome della pagina come testo semplice, per `<title>` |
  | `{{site}}` | il nome della cartella esportata |
  | `{{description}}` | il primo paragrafo, testo semplice, per `<meta name="description">` |
  | `{{width}}` | `full` o `column`, dall'impostazione della larghezza del testo |
  | `{{root}}` | `../` per ogni cartella in cui si trova la pagina, così `{{root}}style.css` raggiunge la radice |
  | `{{styles}}` | il foglio di stile: un `<link>` a `style.css`, oppure l'intero `<style>` su una pagina singola |
  | `{{script}}` | lo script: uno `<script src>` per `site.js`, oppure l'intero `<script>` su una pagina singola |
  | `{{theme}}` | il pulsante chiaro/scuro |
  | `{{path}}` | il percorso della nota, `docs/Note.md` |
  | `{{lang}}` | la lingua dell'interfaccia, per `<html lang>` |

  Un sito riceve `style.css`, `site.js` e `search.js` alla sua radice, che il modello li usi o
  no; una pagina singola porta al suo interno il foglio di stile e lo script, e riceve uno
  `style.css` accanto solo se il suo modello, precedente a `{{styles}}`, ne collega ancora uno.
  Il foglio di stile predefinito formatta la nota come la vista di lettura dell'editor e legge
  la larghezza da `<html data-width="{{width}}">`. Un segnaposto che l'esportazione non conosce
  viene lasciato così com'è. Un modello salvato prima che comparisse un nuovo segnaposto non lo
  usa: **Ripristina il predefinito** lo introduce.

## Privacy e sicurezza

- **La pagina non raggiunge nulla.** Una Content-Security-Policy nel file lascia al suo codice
  recuperare solo file accanto ad esso sullo stesso server (`connect-src 'self'`, per una
  cartella servita con un `index.json`), e inviare nessun modulo da nessuna parte. La build
  fallisce se la policy dovesse mancare o se vi si infilasse un riferimento esterno. La copia
  della PWA lascia entrare il suo manifest e il suo service worker, entrambi dalla propria
  origine.
- **Gli script nelle note non vengono mai eseguiti.** Le note possono contenere HTML — è così
  che funzionano i colori del testo — quindi la policy consente esattamente uno script, quello
  dell'editor, tramite il suo hash: un `onerror` su un `<img>` o uno `<script>` in una nota non
  fa nulla.
- **Ciò a cui una nota rimanda sul web si carica da lì**: un'immagine, un video o un frame
  incorporato con un indirizzo `https://`, come in qualsiasi visualizzatore Markdown — è la
  scelta della nota, non dell'editor. Tali richieste non portano alcun `Referer`.
- **I file restano sul tuo disco.** Le note vengono lette e scritte sul posto tramite la File
  System Access API; le cartelle ricordate sono riferimenti (handle) nell'IndexedDB del
  browser, mai percorsi o contenuti.
- I permessi dell'estensione: vedi
  «[Markdown Knowledge Base](#markdown-knowledge-base-lestensione-chrome)».

## Funzionalità

- **Albero dei file**: cartelle comprimibili, filtro per nome, creazione, rinomina ed
  eliminazione tramite il menu contestuale, pannello ridimensionabile, pannello nascondibile
  (`⌘\`).
- **Formattazione della selezione**: titoli H1–H3, grassetto, corsivo, barrato, monospaziato,
  evidenziazione `==…==`, colore del testo e dello sfondo, link, `[[wiki link]]`, elenchi,
  attività, citazione, blocco di codice, tabella, separatore.
- **Markup**: CommonMark più tabelle, attività con caselle di spunta cliccabili,
  `==highlight==`, `[[wiki links]]`, front matter, evidenziazione della sintassi per 19
  linguaggi, immagini dalla cartella.
- **Immagini**: `![alt](assets/Note/image-1.png)` mostra un'immagine dal suo percorso a partire
  dalla cartella della nota. Funziona anche `![[assets/Note/image-1.png]]` di Obsidian, il
  percorso dalla cartella della nota o altrimenti dalla radice (`![[…|300]]` imposta la
  larghezza). Un'incorporazione più vecchia con un nome nudo, `![[image-1.png]]`, viene cercata
  nella cartella delle immagini delle impostazioni, con e senza la sottocartella della nota, in
  `assets/<nome nota>/`, accanto alla nota, e poi ovunque nella cartella per nome, come fa
  Obsidian. Le cartelle delle immagini partono compresse nell'albero. Rinominare una nota
  rinomina anche la sua cartella delle immagini e cambia i link della nota alle sue immagini, in
  entrambe le forme, al nuovo percorso. Un'immagine cliccata nell'albero si apre come
  un'immagine, non come testo.
- **Aggiungere immagini**: il pulsante immagine nella barra degli strumenti sceglie file
  immagine; un'immagine incollata con `⌘V` — uno screenshot, un'immagine copiata nel browser, un
  file copiato nel gestore file — viene aggiunta allo stesso modo. Entrambe vengono salvate
  nella cartella delle immagini accanto alla nota, `assets/<nome nota>/` per impostazione
  predefinita, e inserite come Markdown semplice con il suo percorso,
  `![image-1](assets/<nome nota>/image-1.png)`, che ogni editor mostra (uno spazio nel percorso
  si scrive `%20`): al cursore, o alla fine della nota quando nessun blocco è aperto. Le
  immagini trascinate sulla nota vanno dove vengono rilasciate: in quel punto in un blocco o in
  una cella di tabella, e accanto al testo o tra due blocchi, alla fine del blocco sopra; un
  rilascio in modalità lettura passa alla modifica, e uno fuori dalla nota aggiunge le immagini
  alla fine. Un rilascio che contiene una cartella apre comunque la cartella. Uno screenshot
  incollato viene chiamato `image-1.png`, `image-2.png` e così via; un file scelto mantiene il
  proprio nome, con un numero aggiunto quando è già preso. Le celle copiate da un foglio di
  calcolo si incollano come testo, non come l'immagine che le accompagna. Solo una cartella
  aperta in scrittura accetta nuove immagini.
- **Tag**: tag annidati sulle note, un albero dei tag e una pagina per tag, tenuti separati
  dalle note in `.meta.json` — vedi «[Tag](#tag)».
- **Esporta in HTML**: la cartella, o una delle sue sottocartelle, come sito statico con
  ricerca, o come pagina singola — vedi «[Esporta in HTML](#esporta-in-html)».
- **Una singola nota** aperta dal Finder o da Esplora risorse nell'app installata, oppure
  trascinata sulla finestra — vedi «[Una singola nota](#una-singola-nota)».
- **Markdown Knowledge Base**: ciò che è selezionato in Chrome verso la nota predefinita, o
  verso quella che scegli, con Send to Markdown; una pagina, un link o un'immagine verso una
  nota — vedi «[Markdown Knowledge Base](#markdown-knowledge-base-lestensione-chrome)».
- **Impostazioni** (l'ingranaggio in alto a destra, accanto alla ricerca): lingua
  dell'interfaccia, tema (sistema, chiaro, scuro), zoom 50–200%, larghezza del testo (una
  colonna centrata o il pannello pieno), se il nome della nota viene mostrato come titolo, e
  dove vanno le immagini aggiunte: la cartella delle immagini accanto alla nota (`assets` per
  impostazione predefinita) e se ogni nota riceve una propria sottocartella al suo interno;
  senza di essa, tutte le immagini vanno direttamente nella cartella. In fondo, la versione — e
  nell'app installata, una ricerca di aggiornamenti e se installarli da sola.
- **Lingue**: inglese e altre 16 — 中文, हिन्दी, Español, Français, العربية, বাংলা, Português,
  Русский, اردو, Bahasa Indonesia, Deutsch, 日本語, Türkçe, 한국어, Italiano, Українська. Per
  impostazione predefinita l'interfaccia segue la lingua del browser. In arabo e urdu
  l'impaginazione è specchiata da destra a sinistra; la nota stessa mantiene la propria
  direzione.
- **Telefoni**: su uno schermo più stretto di 720 px il pannello dei file scorre sopra la nota —
  ☰ lo apre, scegliere una nota o toccare accanto lo chiude — e la barra degli strumenti sta su
  una sola riga; la formattazione ottiene una seconda riga solo in modalità modifica.
  L'esportazione è esclusa lì. Su uno schermo touch i campi sono di almeno 16 px, così iOS non
  ci zooma sopra, e le righe dell'albero sono più alte. La disposizione da desktop e la
  larghezza ricordata del suo pannello restano intatte.
- Salvataggio automatico un secondo dopo una modifica, annulla e ripeti, ricerca nella nota.
- La lingua, il tema, lo zoom, la larghezza del testo, la larghezza del pannello, l'altezza del
  pannello dei tag e l'ultima nota aperta vengono ricordati.

## Scorciatoie da tastiera

| Azione | Tasti |
| --- | --- |
| Modalità lettura / modifica | `⌘E` |
| Salva | `⌘S` |
| Cerca nella nota | `⌘F` |
| Pannello dei file | `⌘\` |
| Zoom | `⌘+` · `⌘−` · `⌘0` |
| Grassetto · corsivo · link | `⌘B` · `⌘I` · `⌘K` |
| Monospaziato · evidenzia · link wiki | `⌘⇧C` · `⌘⇧H` · `⌘⇧K` |
| Titolo 1–6 · testo normale | `⌘⌥1`…`⌘⌥6` · `⌘⌥0` |
| Annulla · ripeti | `⌘Z` · `⌘⇧Z` |
| Indentazione elenco | `Tab` · `⇧Tab` |
| Esci dal blocco | `Esc` |

## Traduzioni

Il testo inglese resta nel codice: `t('tree', 'Delete')`, `tn('status', '{count} word',
'{count} words', n)`, e `data-i18n="context"` / `data-i18n-attr="context"` nel modello. Il primo
argomento è il contesto — la parte dell'interfaccia a cui appartiene una stringa, così la stessa
parola inglese può essere tradotta diversamente in due punti. Un dizionario,
`src/locales/<code>.json`, mappa contesto → testo inglese → traduzione:

```json
{
  "tree": { "Delete": "Удалить" },
  "status": { "{count} words": { "one": "{count} слово", "few": "{count} слова", "many": "{count} слов", "other": "{count} слова" } }
}
```

Una stringa che manca nel dizionario viene mostrata in inglese. Un testo con un numero ha una
forma per ogni categoria plurale della lingua (`Intl.PluralRules`), indicizzata dalla forma
plurale inglese. `npm run i18n` elenca, per lingua, le stringhe non ancora tradotte e quelle non
più usate; `npm test` verifica che ogni traduzione mantenga i segnaposto inglesi e abbia tutte le
forme plurali.

Ciò che Chrome mostra dell'estensione stessa — il suo nome e la sua descrizione, il titolo del
pulsante della barra degli strumenti — segue la lingua del browser anziché quella del pannello,
tramite `chrome.i18n`. Quei testi sono quelli inglesi in `src/extension/manifest.json`, tradotti
negli stessi dizionari sotto il contesto `manifest`; la build li scrive in
`_locales/<code>/messages.json` e mette `__MSG_appName__` e simili nel manifest. Chrome ha codici
propri e ignora il resto: `pt` diventa `pt_BR` e `pt_PT`, `zh` diventa `zh_CN`, e l'urdu non ne ha
uno, quindi lì Chrome descrive l'estensione in inglese. La build si ferma a un nome di oltre 75
caratteri o una descrizione di oltre 132. Il menu contestuale parla la lingua del pannello una
volta che il pannello è stato aperto, quella del browser prima di allora.

Anche questo README è tradotto: `docs/readme/README.<code>.md`, uno per lingua, con l'elenco
delle lingue in cima a ciascuno. Una modifica qui ha il suo posto anche nelle traduzioni.

## Compilazione

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

`build.mjs` raggruppa `src/main.ts` con esbuild in una IIFE e la sostituisce, insieme agli stili
e all'icona (un data URI), in `src/template.html`; il modello e il foglio di stile
dell'esportazione sono raggruppati come stringhe. La Content-Security-Policy del modello riceve
l'hash di quell'unico script. Il risultato è `build/macaed.html`, circa 640 KB. La build fallisce
se anche un solo riferimento esterno vi resta dentro.

La stessa esecuzione scrive `build/pages/`: quella pagina come PWA installabile — `index.html`
con un link al manifest e un `<meta name="service-worker">` che dice alla pagina di registrare il
suo worker, `manifest.webmanifest`, le icone e `sw.js`, che mette la pagina in cache così si apre
offline. `build/macaed.html` stesso resta un file singolo senza riferimenti esterni.

E `build/extension/`: `panel.html` — il modello, il suo script in `panel.js` — `popup.html`
(con gli stili della pagina e `popup.css`) e `popup.js`, `background.js`, `offscreen.html` e
`offscreen.js`, le icone,
`_locales/` e `manifest.json`, la cui versione è quella di `package.json`.
`build/macaed-extension-<version>.zip` contiene gli stessi file con date fisse: le stesse fonti
danno gli stessi byte.

I test del browser avviano il Chrome locale (`CHROME=/path/to/chrome` per sceglierne uno) e
parlano con esso tramite il protocollo DevTools, senza dipendenze; senza un Chrome vengono
saltati. `tools/test-extension.mjs` carica l'estensione tramite quel protocollo
(`Extensions.loadUnpacked` su una pipe; `--load-extension` è sparito da Chrome dalla versione
137), apre una cartella nel pannello laterale e le invia pagine, selezioni, link e immagini da
siti di test su un server locale; poi la finestra del pulsante aggiunge selezioni alla nota
predefinita e a una scelta, attraverso il pannello e da sola, e, con la base di conoscenza
chiusa, le mette da parte per il pannello, oppure lo apre lei stessa; senza alcun pannello
aperto, il menu aggiunge alla nota predefinita, oppure la mette da parte. Un menu contestuale non
può essere cliccato da
DevTools, quindi il test attiva da sé l'`onClicked` del worker, e apre la finestra del pulsante
come una pagina a sé, informata su quale scheda le sta accanto; senza un clic reale, Chrome non
concede `activeTab`, quindi la copia sotto test può raggiungere i siti di test, `*.test`, come
permessi di host.

## Versioni e release

La versione è scritta in un solo punto, `package.json`. La build la inserisce nella pagina (la
riga sotto la schermata iniziale, in fondo alle impostazioni), nel `manifest.json`
dell'estensione e nel nome della cache della PWA. Una build del commit taggato `v<version>` la
mostra così com'è; qualsiasi altra aggiunge il proprio commit, `0.11.0+1a2b3c4`, così una pagina
da `main` su GitHub Pages non viene scambiata per la release. Il `version` di Chrome contiene
solo numeri, quindi lì il commit va in `version_name`.

```sh
npm version minor           # 0.11.0 -> 0.12.0: package.json, package-lock.json, un commit e il tag v0.12.0
git push --follow-tags      # il tag avvia .github/workflows/release.yml
```

Il workflow di release si ferma se il tag e `package.json` non concordano, esegue i test, poi
allega `macaed-<tag>.html`, `macaed-extension-<tag>.zip` e `SHA256SUMS.txt`.

## GitHub Pages

`.github/workflows/pages.yml` compila e testa ogni push su `main` e distribuisce `build/pages/`
su GitHub Pages (Settings → Pages → Source: GitHub Actions), su
<https://marketkernel.github.io/markdown-catalog-editor/>. In Chrome, Edge e Arc il pulsante di
installazione nella barra degli indirizzi lo trasforma in una finestra di app separata; su iOS è
Condividi → Aggiungi alla schermata Home. Le cartelle si aprono allo stesso modo del file
singolo.

**Offline.** Una volta aperto, l'editor funziona senza connessione: il service worker conserva la
pagina, il suo manifest e le sue icone in una cache chiamata come la versione, e serve la pagina
da lì. Le note non ci passano mai attraverso — sono sul tuo disco.

**Aggiornamenti.** Ogni distribuzione cambia `sw.js`, così il browser trova da solo il nuovo
worker — a un avvio con connessione, ogni poche ore finché l'app resta aperta, quando la
connessione torna, o quando «Impostazioni → Cerca aggiornamenti» lo richiede. Il nuovo worker
scarica la sua versione in una cache propria e aspetta; quello in esecuzione continua a servire
la vecchia pagina, offline anche quella, così nulla cambia sotto le tue mani. Le impostazioni,
con un punto sul loro pulsante, e la schermata iniziale dicono allora «La versione … è pronta.
Aggiorna»: Aggiorna salva la nota aperta (o lo chiede, quando non può essere salvata), fa entrare
il nuovo worker e ricarica la pagina, che annuncia una volta di essere stata aggiornata; la
vecchia cache viene eliminata. Senza il pulsante, la nuova versione parte una volta che ogni
finestra dell'app è stata chiusa — oppure, con «Installa gli aggiornamenti da sola quando tutto è salvato e l’app è in background» selezionata nelle impostazioni, non appena nulla resta da
salvare e la finestra è fuori vista.

Questo è anche il compromesso: una PWA installata esegue ciò che l'ultima distribuzione vi ha
messo, mentre un file scaricato resta alla versione che è. Per una versione fissata su disco,
prendi `macaed-<tag>.html` da una release e confrontalo con `SHA256SUMS.txt`.

**Apertura di un `.md`.** Il manifest dichiara i file Markdown come file che l'app apre
(`file_handlers`) e li tiene in un'unica finestra (`launch_handler`, `focus-existing`): vedi
«[Una singola nota](#una-singola-nota)». La pagina li prende tramite `launchQueue`, una volta
terminato il suo avvio — la riapertura dell'ultima cartella — così la cartella non sostituisce
mai la nota; una che arriva durante un'esportazione o con una finestra di dialogo aperta aspetta
che tu la apra di nuovo.

L'app installata chiede al browser di conservare il suo spazio di archiviazione
(`navigator.storage.persist()`): un disco quasi pieno potrebbe altrimenti portarsi via la copia
offline e le cartelle ricordate.

`npm run test:browser` apre anche `build/pages/` (`tools/test-pwa.mjs`): il service worker prende
il controllo della pagina, Chrome trova il manifest installabile, e con il server sparito la
pagina si carica comunque; poi una verifica non trova nulla, poi nessuna connessione, poi una
nuova distribuzione, che aspetta finché Aggiorna non la fa entrare. Chrome headless non consegna
alcun file a un'app, quindi un `launchQueue` fittizio dà alla pagina un vero riferimento al
file: la nota si apre da sola e una modifica vi viene salvata.

## Struttura

```
src/template.html   markup with the __STYLES__/__APP__/__ICON__ placeholders and the CSP
src/styles.css      palette, light and dark themes, block paired with its source
src/main.ts         opening a folder, saving, toolbar, search, settings
src/vault.ts        File System Access API, drag-and-drop, webkitdirectory; file CRUD; a note on its own
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
                    formatting, tags, the export, clippings, dictionaries; in headless Chrome
                    the editor, HTML → Markdown, the PWA and the extension
assets/             icon.svg; pwa/ its PNG sizes for the PWA; extension/ the extension's icons
docs/               the README screenshot and its translations, docs/readme/
build/macaed.html   the build output
build/pages/        the PWA for GitHub Pages
build/extension/    the Chrome extension, and build/macaed-extension-<version>.zip of it
```

## Limitazioni

- Modifica collaborativa, plugin, sincronizzazione e un grafo dei link non sono supportati.
- Su un telefono la disposizione è pensata per la lettura: il menu contestuale dell'albero
  richiede una pressione prolungata che iOS non trasforma in una, e le tabelle sono estese con
  barre che appaiono al passaggio del mouse.
- Solo i browser basati su Chromium possono scrivere file.
- L'estensione è per Chrome (e i browser costruiti su di esso con un pannello laterale, come
  Edge); non è ancora nel Chrome Web Store. Mantiene le immagini sul web anziché scaricarle nella
  cartella: ciò richiederebbe l'accesso a ogni sito.

## Licenza

MIT — vedi [LICENSE](../../LICENSE).

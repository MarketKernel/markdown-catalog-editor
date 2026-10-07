# markdown-catalog-editor

<!-- languages -->
<h3 align="center">
<a href="../../README.md">🇬🇧 English</a> ·
<a href="README.zh.md">🇨🇳 中文</a> ·
<a href="README.hi.md">🇮🇳 हिन्दी</a> ·
<a href="README.es.md">🇪🇸 Español</a> ·
<b>🇫🇷 Français</b> ·
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
<a href="README.it.md">🇮🇹 Italiano</a> ·
<a href="README.uk.md">🇺🇦 Українська</a>
</h3>
<!-- /languages -->

Un éditeur Markdown pour un dossier local de notes — dans l'esprit d'Obsidian, mais entièrement
contenu dans un seul fichier HTML autonome. Aucun réseau n'est utilisé : les fichiers sont lus
depuis le disque et y sont enregistrés directement.

**[Démo en ligne](https://markdown.marketkernel.com/)** — le même éditeur
sous forme de PWA (Progressive Web App) : il peut être installé dans le système puis s'exécute
comme une application séparée, avec sa propre fenêtre et son icône, et fonctionne hors connexion.
Sur un ordinateur, dans Chrome, Edge et Arc, utilisez le bouton d'installation dans la barre
d'adresse ; sur Android, le menu ⋮ de Chrome → Installer l'application ; sur iOS, Partager → Sur
l'écran d'accueil, dans Safari ou dans Chrome. Vos notes restent là aussi sur votre disque, et
l'application installée se met à jour quand vous le décidez — voir
« [GitHub Pages](#github-pages) ».

Le même éditeur est aussi **Send to Markdown**, une [extension Chrome](#send-to-markdown-lextension-chrome) :
un clic sur son bouton, ou un clic droit sur une page, envoie la page — ou la sélection, un lien,
une image — vers une note de votre dossier, et l'éditeur s'ouvre à côté de la page dans le
panneau latéral de Chrome.

![L'éditeur avec un dossier de notes ouvert : l'arborescence des fichiers et les étiquettes à gauche, une note en mode édition à droite](../macaed.jpg)

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

## Comment l'utiliser

1. Générez `build/macaed.html` (voir « [Compilation](#compilation) ») et ouvrez-le dans un
   navigateur.
2. « Ouvrir un dossier » → choisissez un dossier contenant des fichiers `.md`. Vous pouvez aussi
   simplement glisser le dossier dans la fenêtre.
3. Le commutateur **Lecture / Édition** en haut, ou `⌘E`.

Dans Chrome, Edge et Arc le dossier s'ouvre via la File System Access API : les notes sont lues et
écrites sur place, et créer, renommer et supprimer des fichiers et des dossiers fonctionnent tous.
Dans Safari et Firefox le dossier s'ouvre en lecture seule, et `⌘S` propose de télécharger le
fichier modifié — tout comme sur téléphone : Chrome sur Android n'a pas de File System Access, et
tout navigateur sur iOS, Chrome compris, tourne sur le moteur de Safari.

L'éditeur se souvient des six derniers dossiers ouverts (une page n'apprend jamais le chemin d'un
dossier, elle conserve donc le descripteur du dossier dans l'IndexedDB du navigateur), et de la
dernière note ouverte dans chacun. Au démarrage suivant, le dernier dossier s'ouvre de lui-même si
le navigateur le permet encore — dans une application installée, ou une fois que vous avez choisi
« Autoriser à chaque visite ». Sinon, l'écran de démarrage liste les dossiers récents : un clic, et
le navigateur redemande l'accès. Pour revenir à cette liste — pour changer de dossier ou en ouvrir
un nouveau — cliquez sur le nom du dossier en haut du panneau des fichiers, ou sur « Fermer le
dossier » dans les paramètres ; × retire un dossier de la liste.

Si vous placez `macaed.html` à côté de vos notes et le servez en HTTP, la page récupère le dossier
d'elle-même — à condition qu'un `index.json` se trouve à côté, de la forme
`{ "name": "Notes", "files": ["Note.md", "Folder/Other.md"] }`.

## Send to Markdown: l'extension Chrome

`npm run build` écrit aussi `build/extension/` : l'éditeur sous forme d'extension Chrome, et
`build/macaed-extension-<version>.zip` pour le Chrome Web Store ; une publication (release)
contient aussi le zip. Pour l'installer : `chrome://extensions` → Mode développeur → Charger
l'extension non empaquetée → `build/extension` (ou le zip décompressé).

L'éditeur lui-même vit dans le panneau latéral de Chrome, à côté de la page, dans la mise en page
téléphone, car un panneau est étroit ; il y reste d'un onglet à l'autre. Un dossier s'y ouvre comme
dans le fichier, et les dossiers récents sont mémorisés — ceux de l'extension elle-même, distincts
de ceux du fichier ou de la PWA. Ce que l'extension ajoute, c'est l'envoi de contenu depuis le web
vers vos notes :

- **Le bouton de la barre d'outils** (ou `Alt+Shift+M`) envoie la page : son texte principal —
  l'article, sans les menus du site, les barres latérales, le pied de page, les boutons de
  partage, les formulaires et les parties cachées — ou, quand quelque chose est sélectionné
  dessus, juste la sélection.
- **Le menu contextuel** d'une page propose **Envoyer la page vers Markdown** ; sur un texte
  sélectionné, **Envoyer la sélection vers Markdown** ; sur un lien, **Envoyer le lien vers
  Markdown** ; sur une image, **Envoyer l’image vers Markdown**.

L'un ou l'autre ouvre le panneau latéral, et une boîte de dialogue y affiche ce qui est arrivé —
la page, la sélection, le lien ou l'image, et depuis quel site — sous forme de Markdown que vous
pouvez encore modifier, et demande où cela doit aller :

- **Une nouvelle note**, le choix par défaut pour une page : dans le dossier des coupures
  (`Clippings` à la racine sauf si vous le changez ; le dossier est mémorisé, vide signifiant la
  racine), nommée d'après le titre de la page, avec ce qu'un nom de fichier ne peut pas contenir
  laissé de côté. Un nom déjà pris reçoit un numéro, `Title 2.md`. La note commence par un en-tête
  (front matter) — le titre de la page, son adresse et le jour — puis le texte ; elle s'ouvre une
  fois enregistrée.

  ```markdown
  ---
  title: "The page's title"
  source: "https://example.com/post"
  clipped: 2026-10-07
  ---

  # The page's title

  The text…
  ```

- **La fin de la note ouverte**, le choix par défaut pour une sélection, un lien ou une image :
  après une ligne vide, suivie d'une ligne « — [Le titre de la page](https://…) » qui renvoie à
  son origine. Un lien n'en a pas besoin : il est sa propre source.

Envoyé avant qu'un dossier soit ouvert, cela attend : le panneau demande un dossier, et la boîte
de dialogue arrive une fois qu'un dossier est ouvert. Une page que l'extension ne peut pas lire —
les pages internes de Chrome, le Web Store, un PDF — arrive sous forme de lien vers elle.

**Ce qu'est le Markdown.** Titres, paragraphes, **gras**, *italique*, ~~barré~~,
==surligné==, `code`, liens et images avec leur adresse complète, listes — imbriquées, numérotées,
tâches — citations, blocs de code avec leur langage (depuis `language-…`, le `highlight-source-…`
de GitHub et autres), tableaux (un saut de ligne dans une cellule devient `<br>`, comme l'éditeur
l'écrit), séparateurs. Le texte se lit tel quel : un `*`, un `#` en début de ligne ou un `<b>`
tapé sur la page est échappé, pour qu'il ne se transforme jamais en mise en forme, et aucun HTML
de la page n'entre dans la note. Les images restent sur le web, liées par leur adresse ; l'adresse
réelle d'une image paresseuse (lazy) est prise plutôt que son substitut, et les pixels de pistage
sont laissés de côté.

**Permissions.** `activeTab` : un clic sur le bouton, dans le menu ou le raccourci donne à
l'extension cet onglet-là, et c'est seulement alors qu'elle le lit — avec `scripting`, une
fonction exécutée dans la page copie son texte et le renvoie. Aucun script de contenu ne
s'exécute où que ce soit, et il n'y a par ailleurs aucun accès à aucun site : pas de
`host_permissions`, que la build refuse. `contextMenus`, `sidePanel` et `storage` — le worker
transmet ce qu'il a récupéré au panneau de sa fenêtre via `chrome.storage.session`, effacé à la
fermeture du navigateur, et la langue du panneau remonte vers le worker, pour le menu, dans
`chrome.storage.local`. Les pages de l'extension ont `connect-src 'none'` : l'éditeur ne contacte
rien sur le réseau ; la build le vérifie, tout comme l'absence de script en ligne ou d'adresse
externe sur n'importe quelle page.

**Comment c'est fait.** Le panneau est la page elle-même : `panel.html` avec son script dans
`panel.js`, comme le veut le Manifest V3 — le même `src/main.ts`, avec `src/extension/extension.ts`
à la place de `src/platform.ts`, dont les points d'ancrage (hooks) ne font rien dans le fichier et
la PWA. Le worker, `background.js`, porte le bouton, le raccourci et le menu. Chrome n'ouvre un
panneau latéral que dans le gestionnaire du clic lui-même, avant tout `await`, si bien que le
worker ouvre d'abord le panneau puis lit l'onglet ensuite (`src/extension/grab.ts`) ; le panneau
transforme ce HTML en Markdown (`src/extension/to-markdown.ts`) et l'éditeur demande où cela va
(`src/clip-ui.ts`, `src/clip.ts`).

## Aperçu en direct

En mode édition, le document reste mis en forme, et seul le bloc où se trouve le curseur se
transforme en Markdown brut. Un bloc est un paragraphe, un titre, une liste entière, un bloc de
code ou une citation : une liste ne se désagrège pas ligne par ligne. Les tableaux sont édités
différemment — voir « [Tableaux](#tableaux) ».

La ligne source garde la taille de police, la graisse et la hauteur de ligne de la version mise en
forme, pour que le texte ne saute pas : `# Heading` s'affiche à la taille d'un titre. Cela est
vérifié automatiquement — quand un bloc change de mode, son bord supérieur se déplace de moins
d'un pixel, à n'importe quel niveau de zoom entre 50 et 200 %.

Il y a un endroit où la hauteur change, et c'est inévitable dans ce mode : un bloc de code gagne
deux lignes de balisage `` ``` ``. Les blocs voisins ne tressaillent pas pour autant — seul ce qui
est en dessous se déplace.

Entrée en dehors d'une liste commence un nouveau bloc. Pressée à la fin d'un bloc, ou sur une
ligne vide, elle ouvre une ligne vide en dessous et y place le curseur ; pressée à nouveau, elle en
ajoute une autre. En Markdown, une seule ligne vide ne fait que séparer deux blocs, donc une ligne
vide dans laquelle on peut taper est une ligne entourée de lignes vides des deux côtés — l'éditeur
ajoute lui-même la ligne de séparation, et le texte tapé ne se colle jamais au bloc voisin. De
telles lignes, ainsi que les définitions de référence de lien (`[id]: https://…`), ne s'affichent
qu'en mode édition ; la vue de lecture rend le Markdown tel qu'il est.

## Tableaux

Un tableau ne se transforme jamais en `| pipes |`. Un clic n'ouvre que la cellule sous le
pointeur, et la cellule montre son propre texte — `**bold**` plutôt que du gras — si bien que la
mise en forme en ligne et les marques, liens et couleurs de la barre d'outils fonctionnent encore
à l'intérieur. Taper ne réécrit que cette cellule dans le fichier ; le reste du tableau garde son
alignement et son espacement.

- **Se déplacer** : Tab et Shift+Tab vont à la cellule suivante et précédente, Entrée à la cellule
  du dessous, les flèches à la cellule voisine au bord du texte — et au-delà du bord du tableau,
  jusqu'au bloc suivant. Entrée sur la dernière ligne démarre un nouveau bloc sous le tableau.
- **Sauts de ligne** : Ctrl+Entrée (aussi ⌘Entrée ou Shift+Entrée) démarre une nouvelle ligne dans
  la cellule. Une ligne de tableau est une seule ligne de Markdown, le saut s'écrit donc `<br>` ;
  la cellule en cours d'édition l'affiche comme un vrai saut de ligne, et le texte collé garde ses
  lignes de la même façon. Dans une cellule de plusieurs lignes, les flèches haut et bas se
  déplacent d'abord entre ses lignes. Le texte des cellules est aligné en haut.
- **Ajouter** : en mode édition, survoler un tableau affiche une barre avec un **+** en dessous,
  qui ajoute une ligne, et un à sa droite, qui ajoute une colonne. Tab dans la dernière cellule
  ajoute aussi une ligne.
- **Supprimer** : seules les lignes et colonnes vides sont supprimées, pour qu'aucun texte ne soit
  perdu par erreur. Survoler une ligne vide affiche un **×** à sa gauche, une colonne vide un
  **×** au-dessus. Retour arrière dans une cellule vide fait de même au clavier : il supprime la
  ligne si la ligne entière est vide, sinon la colonne si la colonne entière l'est (en-tête
  compris) ; un tableau sans texte restant est supprimé en entier. La ligne d'en-tête reste — un
  tableau en a besoin.

Ajouter ou supprimer réécrit le tableau sous la forme `| a | b |` classique.

## Étiquettes

Les étiquettes regroupent des notes à travers les dossiers. Elles ne sont pas écrites dans les
notes : le Markdown reste exactement tel qu'il était, et toutes les étiquettes du dossier vivent
dans un seul fichier à côté des notes.

- **Sur une note** : les étiquettes se trouvent sous le titre sous forme de puces `#étiquette`,
  suivies d'un **+**. Le **+** se transforme en champ ; Entrée ajoute l'étiquette, et le **+**
  réapparaît ensuite. Les étiquettes déjà utilisées dans le dossier sont suggérées pendant la
  frappe. Échap annule ; quitter le champ avec du texte dedans ajoute aussi l'étiquette. **×**
  sur une puce retire l'étiquette, et un clic sur la puce ouvre la page de l'étiquette. Les
  étiquettes peuvent être changées aussi bien en lecture qu'en édition.
- **Orthographe** : un `#` en tête est supprimé et les espaces dans une étiquette deviennent des
  tirets, si bien que `#à faire` est stocké comme `à-faire`. Une étiquette qui ne diffère d'une
  étiquette existante que par la casse reprend l'orthographe existante — `Idée` et `idée` ne
  deviennent jamais deux étiquettes. Une note ne peut pas porter deux fois la même étiquette.
- **Imbrication** : `/` imbrique les étiquettes. `travail/alpha` et `travail/beta` se trouvent
  sous `travail` dans l'arborescence des étiquettes, et une note étiquetée `travail/alpha` est
  aussi comptée sous `travail`.
- **L'arborescence des étiquettes** : la section en bas du panneau des fichiers, distincte de
  l'arborescence des fichiers. Chaque étiquette indique combien de notes la portent, elle ou une
  étiquette imbriquée sous elle ; la flèche d'une étiquette parente replie ses enfants, et le
  titre replie toute la section. Le filtre de nom au-dessus de l'arborescence des fichiers filtre
  aussi les étiquettes. La section occupe jusqu'à 42 % du panneau et défile à l'intérieur ; faire
  glisser la ligne au-dessus la rend plus basse (jamais plus haute), un double clic sur la ligne
  rend l'espace, et avec la ligne ayant le focus, ↑ et ↓ font de même. La hauteur est mémorisée.
- **La page d'une étiquette** : cliquer sur une étiquette dans l'arborescence, ou sur une puce,
  affiche les notes qui la portent — une étiquette parente liste aussi les notes de chaque
  étiquette qu'elle contient. Chaque ligne donne le nom de la note, son dossier et toutes ses
  étiquettes ; un clic sur le nom ouvre la note, un clic sur une étiquette ouvre cette étiquette.
  La page est en lecture seule : il n'y a rien à y modifier, et la barre d'outils de mise en forme
  est désactivée. Pour une étiquette imbriquée, les parents de son titre renvoient à leurs propres
  pages.
- **Renommage et suppression** : les étiquettes suivent une note, ou toutes les notes d'un
  dossier, quand elle est renommée ou supprimée depuis le panneau des fichiers. Une note déplacée
  ou supprimée en dehors de l'éditeur garde son entrée dans le fichier, mais l'entrée n'est ni
  affichée ni comptée tant que la note est introuvable.
- **Dossiers en lecture seule** (Safari, Firefox) : les étiquettes sont affichées, mais pas le
  **+** ni le **×**.

### `.meta.json`

Le fichier se trouve à la racine du dossier ouvert et est créé avec la première étiquette. Il
n'apparaît jamais dans l'arborescence des fichiers.

```json
{
  "notes": {
    "Ideas.md": { "tags": ["idea", "work/alpha"] },
    "Projects/Roadmap.md": { "tags": ["work/alpha", "planning"] }
  }
}
```

Les clés sont les chemins des notes relatifs à la racine, tels que l'arborescence les affiche ;
les étiquettes gardent l'ordre dans lequel elles ont été ajoutées. Le fichier est écrit avec les
notes triées par chemin et une indentation de deux espaces, pour qu'il se lise bien dans un diff,
et les notes qui n'ont plus d'étiquettes en sont retirées. Les champs que l'éditeur ne connaît
pas — en haut ou à l'intérieur de l'entrée d'une note — sont conservés quand il réécrit le
fichier, pour que d'autres outils puissent y stocker leurs propres données. Si le fichier n'est
pas un objet JSON valide, l'éditeur le signale, n'affiche aucune étiquette et n'écrase jamais le
fichier ; les étiquettes ne peuvent pas être changées tant que le fichier n'est pas corrigé et le
dossier rouvert.

Quand le dossier est servi en HTTP avec un `index.json` (voir
« [Comment l'utiliser](#comment-lutiliser) »), listez `.meta.json` parmi ses fichiers pour que
les étiquettes s'affichent.

## Exporter en HTML

Le bouton d'export de la barre d'outils (à côté d'Enregistrer) transforme tout le dossier en site
statique ; **Exporter en HTML…** dans le menu contextuel d'un dossier fait la même chose pour ce
seul dossier, et sur l'espace vide sous l'arborescence pour le dossier entier. Le site est écrit
dans `output/<dossier>/` à la racine du dossier de notes ; le dossier est nommé d'après le moment
de l'export, `2025-12-31_23-33-33`, et peut être renommé dans la boîte de dialogue. `output`
n'apparaît jamais dans l'arborescence. Seul un dossier ouvert en écriture peut être exporté.

Pendant que l'export s'exécute, la boîte de dialogue montre l'étape en cours — lecture des notes,
écriture des pages, copie des images — avec une barre de progression, et ne peut pas être fermée ;
**Arrêter** y met fin après les fichiers déjà en cours, en laissant ce qui a déjà été écrit. Le
bouton d'export et l'élément de menu sont désactivés tant que ce n'est pas terminé. Les fichiers
sont lus et écrits plusieurs à la fois, chaque dossier en chemin créé une seule fois. À la fin,
l'export relit le dossier depuis le disque : si un fichier venait à manquer, la boîte de dialogue
indique combien et en nomme un, plutôt que d'annoncer un succès sur un dossier vide.

**Créer un site statique** — activé par défaut — fait une page par note, comme décrit ci-dessous.
Désactivé, l'export est une page unique, `index.html`, avec toutes les notes dedans : le panneau
de gauche est une table des matières, chaque note est une section avec son nom au-dessus, ses
titres un niveau plus bas et leurs identifiants préfixés par celui de la note, si bien que les
liens entre notes et vers leurs titres deviennent des ancres sur la page. La page montre une note
à la fois — celle que pointe le `#ancre` de l'adresse, ou vers laquelle il pointe, et au départ la
racine `index` ou `README`, sinon la première note à la racine. La table des matières, les liens,
les résultats de recherche et les liens **précédent** / **suivant** à la fin de chaque note
basculent entre elles. C'est fait en CSS (`:target`), donc ça fonctionne aussi sans script ; le
script se contente de marquer la note affichée dans la table des matières. L'impression montre
toutes les notes. La recherche du navigateur (`⌘F`) ne voit que la note affichée — le champ de
recherche parcourt toutes les notes. Avec les étiquettes, l'arborescence des étiquettes dans le
panneau et les puces sur les notes mènent à une section des étiquettes à la fin, un titre par
étiquette avec ses notes. La page est un seul fichier : la feuille de style et le script y sont
écrits. Seules les images sont à côté, rassemblées dans un dossier `assets` qui garde les dossiers
d'où elles viennent mais pas l'étape `assets` propre à chaque note : `docs/assets/Guide/a.png`
devient `assets/docs/Guide/a.png`. La page unique a la même recherche, le même bouton de thème,
les mêmes boutons **tout déplier** / **tout replier** et le même panneau redimensionnable qu'un
site ; la recherche lit les notes directement depuis la page, et un résultat saute à sa note.

Le texte et le nom de la note au-dessus suivent les paramètres de l'éditeur au moment de
l'export : **Largeur du texte** réglée sur le panneau plein donne des pages pleine largeur, et
avec **Afficher le nom de la note comme titre** désactivé, aucun nom n'est ajouté au-dessus des
notes.

Les pages portent tout leur texte et de simples liens relatifs, sans rien de chargé plus tard : le
site s'ouvre depuis une URL `file://`, depuis n'importe quel serveur web et pour un moteur de
recherche — chaque page a un `<title>`, un `<meta name="description">` tiré de son premier
paragraphe, un `lang` et un seul `<h1>`. Les dossiers de la navigation se replient avec
`<details>` ; le thème suit le système.

Un petit script, `site.js`, ajoute ce que le HTML seul ne peut pas :

- **Recherche** : un champ en haut du panneau de gauche. Il cherche chaque mot tapé dans les
  noms, les dossiers et le texte des notes ; les résultats prennent la place de l'arborescence —
  les noms qui correspondent d'abord, chacun avec un extrait autour des mots trouvés, mis en
  évidence — et l'arborescence revient quand le champ est vidé (Échap). Entrée ouvre le premier
  résultat, ↓ et ↑ parcourent la liste. Le texte vient de `search.js`, que le script charge la
  première fois que le champ est utilisé, pour que les pages elles-mêmes restent aussi légères
  qu'avant.
- **Tout déplier** et **tout replier** à côté de « Notes » au-dessus de la navigation.
- Un bouton de **thème** à côté du nom du site : une lune bascule vers le thème sombre, un
  soleil revient au thème clair, quel que soit ce que préfère le système. Tant qu'il n'est pas
  pressé, le thème suit le système.
- Une poignée sur le bord droit du panneau qui le rend plus large ou plus étroit (160–560 px ;
  un double clic rend la valeur par défaut, ← → le déplacent avec la poignée ayant le focus).

Le thème, la largeur de la colonne et l'état des dossiers sont mémorisés de page en page, par
site ; les dossiers de la page affichée s'ouvrent toujours. Sans le script — bloqué, ou retiré du
modèle — le champ de recherche, les boutons et la poignée sont simplement absents, le thème suit
le système, et le site se lit et se lie de la même façon.

- **Pages** : `dir/Note.md` devient `dir/Note.html`. Une note qui commence par un titre égal à
  son nom a ce titre comme titre de la page, avec ses étiquettes en dessous. Une note racine
  appelée `index` ou `README` devient la page d'accueil, `index.html` ; sans cela, la page
  d'accueil liste les notes et les étiquettes. `[texte](autre.md)` et `[[liens wiki]]` pointent
  vers les pages, `[[Note#Titre]]` vers le titre — chaque titre porte un identifiant — et un lien
  vers une note absente de l'export reste du texte brut. Les cases à cocher des tâches sont
  affichées, mais pas cliquables. Le front matter est laissé de côté.
- **Images** : chaque image et PDF du dossier est copié au même chemin, si bien que
  `![[image.png]]` et `![alt](path.png)` fonctionnent toujours ; une image intégrée est trouvée
  là où l'éditeur la trouve.
- **Étiquettes** : avec la case **Exporter les étiquettes** activée, chaque page montre ses
  étiquettes, l'arborescence des étiquettes se trouve sous la navigation, et une page par
  étiquette liste ses notes — une étiquette parente, les notes de chaque étiquette qu'elle
  contient — plus un index des étiquettes dans `tags/index.html`. Seules les notes de l'export
  comptent.
- **Modèle** : la boîte de dialogue montre le modèle de page ; modifiez-le là, ou **Rétablir le
  modèle par défaut**, et c'est mémorisé. Le modèle est du HTML avec des `{{emplacements}}` :

  | Emplacement | Représente |
  | --- | --- |
  | `{{navigation}}` | l'arborescence des dossiers sous forme de `<nav>`, la page actuelle marquée — requis |
  | `{{heading}}` | le `<h1>` de la page, vide quand la note commence par le sien — requis |
  | `{{content}}` | la note en HTML — requis |
  | `{{tags}}` | l'arborescence des étiquettes sous forme de `<nav>` ; requis quand les étiquettes sont exportées, vide sinon |
  | `{{pagetags}}` | les étiquettes de la note sous forme de `#puces` renvoyant à leurs pages |
  | `{{title}}` | le nom de la page en texte brut, pour `<title>` |
  | `{{site}}` | le nom du dossier exporté |
  | `{{description}}` | le premier paragraphe, en texte brut, pour `<meta name="description">` |
  | `{{width}}` | `full` ou `column`, selon le réglage de largeur du texte |
  | `{{root}}` | `../` par dossier où se trouve la page, pour que `{{root}}style.css` atteigne la racine |
  | `{{styles}}` | la feuille de style : un `<link>` vers `style.css`, ou tout le `<style>` sur une page unique |
  | `{{script}}` | le script : un `<script src>` pour `site.js`, ou tout le `<script>` sur une page unique |
  | `{{theme}}` | le bouton clair/sombre |
  | `{{path}}` | le chemin de la note, `docs/Note.md` |
  | `{{lang}}` | la langue de l'interface, pour `<html lang>` |

  Un site reçoit `style.css`, `site.js` et `search.js` à sa racine, que le modèle les utilise ou
  non ; une page unique porte sa feuille de style et son script à l'intérieur, et ne reçoit un
  `style.css` à côté que si son modèle, antérieur à `{{styles}}`, en lie encore un. La feuille de
  style par défaut met en forme la note comme la vue de lecture de l'éditeur et lit la largeur
  depuis `<html data-width="{{width}}">`. Un emplacement que l'export ne connaît pas est laissé
  tel quel. Un modèle enregistré avant l'apparition d'un nouvel emplacement ne l'utilise pas :
  **Rétablir le modèle par défaut** l'introduit.

## Confidentialité et sécurité

- **La page ne contacte rien.** Une Content-Security-Policy dans le fichier ne permet à son code
  de récupérer que des fichiers situés à côté de lui sur le même serveur (`connect-src 'self'`,
  pour un dossier servi avec un `index.json`), et d'envoyer aucun formulaire nulle part. La build
  échoue si la politique venait à manquer ou qu'une référence externe s'y glissait. La copie de
  la PWA laisse passer son manifeste et son service worker, tous deux depuis sa propre origine.
- **Les scripts dans les notes ne s'exécutent jamais.** Les notes peuvent contenir du HTML — c'est
  ainsi que fonctionnent les couleurs de texte — donc la politique autorise exactement un script,
  celui de l'éditeur, par son empreinte (hash) : un `onerror` sur une `<img>` ou un `<script>`
  dans une note ne fait rien.
- **Ce vers quoi une note renvoie sur le web se charge depuis là-bas** : une image, une vidéo ou
  un cadre intégré avec une adresse `https://`, comme dans n'importe quelle visionneuse Markdown
  — c'est le choix de la note, pas celui de l'éditeur. De telles requêtes ne portent aucun
  `Referer`.
- **Les fichiers restent sur votre disque.** Les notes sont lues et écrites sur place via la File
  System Access API ; les dossiers mémorisés sont des descripteurs dans l'IndexedDB du
  navigateur, jamais des chemins ou des contenus.
- Les permissions de l'extension : voir « [Send to Markdown](#send-to-markdown-lextension-chrome) ».

## Fonctionnalités

- **Arborescence des fichiers** : dossiers repliables, filtrage par nom, création, renommage et
  suppression via le menu contextuel, panneau redimensionnable, panneau masquable (`⌘\`).
- **Mise en forme de la sélection** : titres H1–H3, gras, italique, barré, chasse fixe,
  surlignage `==…==`, couleur de texte et d'arrière-plan, lien, `[[wiki link]]`, listes, tâches,
  citation, bloc de code, tableau, séparateur.
- **Balisage** : CommonMark plus tableaux, tâches avec cases à cocher cliquables, `==highlight==`,
  `[[wiki links]]`, front matter, coloration syntaxique pour 19 langages, images depuis le
  dossier.
- **Images** : `![alt](assets/Note/image-1.png)` affiche une image par son chemin depuis le
  dossier de la note. `![[assets/Note/image-1.png]]` d'Obsidian fonctionne aussi, le chemin
  depuis le dossier de la note ou sinon depuis la racine (`![[…|300]]` fixe la largeur). Une
  ancienne intégration avec un nom nu, `![[image-1.png]]`, est recherchée dans le dossier
  d'images des paramètres, avec et sans le sous-dossier de la note, dans `assets/<nom de la
  note>/`, à côté de la note, puis n'importe où dans le dossier par son nom, comme le fait
  Obsidian. Les dossiers d'images commencent repliés dans l'arborescence. Renommer une note
  renomme aussi son dossier d'images et change les liens de la note vers ses images, sous l'une
  ou l'autre forme, vers le nouveau chemin. Une image cliquée dans l'arborescence s'ouvre comme
  une image, pas comme du texte.
- **Ajouter des images** : le bouton image de la barre d'outils choisit des fichiers image ; une
  image collée avec `⌘V` — une capture d'écran, une image copiée dans le navigateur, un fichier
  copié dans le gestionnaire de fichiers — s'ajoute de la même façon. L'une comme l'autre est
  enregistrée dans le dossier d'images à côté de la note, `assets/<nom de la note>/` par défaut,
  et insérée en Markdown simple avec son chemin, `![image-1](assets/<nom de la note>/image-1.png)`,
  que tout éditeur affiche (une espace dans le chemin s'écrit `%20`) : au curseur, ou à la fin de
  la note quand aucun bloc n'est ouvert. Les images glissées sur la note s'ajoutent là où elles
  sont déposées : à cet endroit dans un bloc ou une cellule de tableau, et à côté du texte ou
  entre deux blocs, à la fin du bloc au-dessus ; un dépôt en mode lecture bascule en édition, et
  un dépôt en dehors de la note ajoute les images à la fin. Un dépôt contenant un dossier ouvre
  quand même le dossier. Une capture d'écran collée est nommée `image-1.png`, `image-2.png` et
  ainsi de suite ; un fichier choisi garde son propre nom, avec un numéro ajouté quand il est déjà
  pris. Les cellules copiées depuis un tableur se collent comme du texte, pas comme l'image qui
  les accompagne. Seul un dossier ouvert en écriture accepte de nouvelles images.
- **Étiquettes** : étiquettes imbriquées sur les notes, une arborescence d'étiquettes et une page
  par étiquette, tenues à l'écart des notes dans `.meta.json` — voir « [Étiquettes](#étiquettes) ».
- **Exporter en HTML** : le dossier, ou l'un de ses sous-dossiers, en site statique avec
  recherche, ou en une seule page — voir « [Exporter en HTML](#exporter-en-html) ».
- **Send to Markdown** : une page, une sélection, un lien ou une image depuis Chrome vers une
  note, en Markdown — voir « [Send to Markdown](#send-to-markdown-lextension-chrome) ».
- **Paramètres** (l'icône d'engrenage en haut à droite, à côté de la recherche) : langue de
  l'interface, thème (système, clair, sombre), zoom 50–200 %, largeur du texte (une colonne
  centrée ou le panneau plein), si le nom de la note est affiché comme titre, et où vont les
  images ajoutées : le dossier d'images à côté de la note (`assets` par défaut) et si chaque note
  reçoit son propre sous-dossier à l'intérieur ; sans cela, toutes les images vont directement
  dans le dossier. En bas, la version — et dans l'application installée, une recherche de mises à
  jour et le choix de les installer d'elles-mêmes.
- **Langues** : l'anglais et 16 autres — 中文, हिन्दी, Español, Français, العربية, বাংলা,
  Português, Русский, اردو, Bahasa Indonesia, Deutsch, 日本語, Türkçe, 한국어, Italiano,
  Українська. Par défaut, l'interface suit la langue du navigateur. En arabe et en ourdou,
  l'habillage est inversé de droite à gauche ; la note elle-même garde sa propre direction.
- **Téléphones** : sur un écran plus étroit que 720 px, le panneau des fichiers glisse par-dessus
  la note — ☰ l'ouvre, choisir une note ou toucher à côté le ferme — et la barre d'outils tient
  sur une seule ligne ; la mise en forme obtient une seconde ligne, en mode édition seulement.
  L'export est absent là. Sur un écran tactile, les champs font au moins 16 px, pour qu'iOS n'y
  zoome pas, et les lignes de l'arborescence sont plus hautes. La mise en page de bureau et la
  largeur mémorisée de son panneau restent inchangées.
- Enregistrement automatique une seconde après une modification, annuler et rétablir, recherche
  dans la note.
- La langue, le thème, le zoom, la largeur du texte, la largeur du panneau, la hauteur du panneau
  des étiquettes et la dernière note ouverte sont mémorisés.

## Raccourcis clavier

| Action | Touches |
| --- | --- |
| Mode lecture / édition | `⌘E` |
| Enregistrer | `⌘S` |
| Rechercher dans la note | `⌘F` |
| Panneau des fichiers | `⌘\` |
| Zoom | `⌘+` · `⌘−` · `⌘0` |
| Gras · italique · lien | `⌘B` · `⌘I` · `⌘K` |
| Chasse fixe · surlignage · lien wiki | `⌘⇧C` · `⌘⇧H` · `⌘⇧K` |
| Titre 1–6 · texte normal | `⌘⌥1`…`⌘⌥6` · `⌘⌥0` |
| Annuler · rétablir | `⌘Z` · `⌘⇧Z` |
| Indentation de liste | `Tab` · `⇧Tab` |
| Quitter le bloc | `Esc` |

## Traductions

Le texte anglais reste dans le code : `t('tree', 'Delete')`, `tn('status', '{count} word',
'{count} words', n)`, et `data-i18n="context"` / `data-i18n-attr="context"` dans le modèle. Le
premier argument est le contexte — la partie de l'interface à laquelle appartient une chaîne,
pour que le même mot anglais puisse être traduit différemment à deux endroits. Un dictionnaire,
`src/locales/<code>.json`, fait correspondre contexte → texte anglais → traduction :

```json
{
  "tree": { "Delete": "Удалить" },
  "status": { "{count} words": { "one": "{count} слово", "few": "{count} слова", "many": "{count} слов", "other": "{count} слова" } }
}
```

Une chaîne absente du dictionnaire s'affiche en anglais. Un texte avec un nombre a une forme par
catégorie plurielle de la langue (`Intl.PluralRules`), classée par forme plurielle anglaise.
`npm run i18n` liste, par langue, les chaînes pas encore traduites et celles qui ne sont plus
utilisées ; `npm test` vérifie que chaque traduction garde les paramètres anglais et possède
toutes les formes plurielles.

Ce que Chrome montre de l'extension elle-même — son nom et sa description, le titre du bouton de
la barre d'outils — suit la langue du navigateur plutôt que celle du panneau, via `chrome.i18n`.
Ces textes sont les textes anglais dans `src/extension/manifest.json`, traduits dans les mêmes
dictionnaires sous le contexte `manifest` ; la build les écrit dans `_locales/<code>/messages.json`
et met `__MSG_appName__` et autres dans le manifeste. Chrome a ses propres codes et ignore le
reste : `pt` devient `pt_BR` et `pt_PT`, `zh` devient `zh_CN`, et l'ourdou n'en a pas, donc là
Chrome décrit l'extension en anglais. La build s'arrête sur un nom de plus de 75 caractères ou une
description de plus de 132. Le menu contextuel parle la langue du panneau une fois que celui-ci a
été ouvert, celle du navigateur avant cela.

Ce README est également traduit : `docs/readme/README.<code>.md`, un par langue, avec la liste des
langues en haut de chacun. Un changement ici a aussi sa place dans les traductions.

## Compilation

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

`build.mjs` regroupe `src/main.ts` avec esbuild en une IIFE et la substitue, avec les styles et
l'icône (une URI de données), dans `src/template.html` ; le modèle et la feuille de style de
l'export sont regroupés sous forme de chaînes. La Content-Security-Policy du modèle reçoit
l'empreinte (hash) de cet unique script. Le résultat est `build/macaed.html`, environ 620 Ko. La
build échoue s'il reste ne serait-ce qu'une seule référence externe dedans.

La même exécution écrit `build/pages/` : cette page sous forme de PWA installable —
`index.html` avec un lien vers le manifeste et un `<meta name="service-worker">` qui indique à la
page d'enregistrer son worker, `manifest.webmanifest`, les icônes et `sw.js`, qui met la page en
cache pour qu'elle s'ouvre hors connexion. `build/macaed.html` lui-même reste un seul fichier sans
référence externe.

Et `build/extension/` : `panel.html` — le modèle, son script dans `panel.js` — `background.js`,
les icônes, `_locales/` et `manifest.json`, dont la version est celle de `package.json`.
`build/macaed-extension-<version>.zip` contient les mêmes fichiers avec des dates fixes : les
mêmes sources donnent les mêmes octets.

Les tests de navigateur démarrent le Chrome local (`CHROME=/path/to/chrome` pour en choisir un) et
lui parlent via le protocole DevTools, sans dépendances ; sans Chrome, ils sont ignorés.
`tools/test-extension.mjs` charge l'extension via ce protocole (`Extensions.loadUnpacked` sur un
pipe ; `--load-extension` a disparu de Chrome depuis la version 137), ouvre un dossier dans le
panneau latéral et lui envoie des pages, des sélections, des liens et des images depuis des sites
de test sur un serveur local. Ni le bouton de la barre d'outils ni un menu contextuel ne peuvent
être cliqués depuis DevTools, donc le test déclenche lui-même le `onClicked` du worker ; sans
clic réel, Chrome n'accorde pas `activeTab`, si bien que la copie testée peut atteindre les sites
de test, `*.test`, en tant que permissions d'hôte.

## Versions et publications

La version est écrite à un seul endroit, `package.json`. La build l'insère dans la page (la
ligne sous l'écran de démarrage, le bas des paramètres), dans le `manifest.json` de l'extension
et dans le nom de cache de la PWA. Une build du commit étiqueté `v<version>` la montre telle
quelle ; toute autre ajoute son commit, `0.11.0+1a2b3c4`, pour qu'une page venant de `main` sur
GitHub Pages ne soit pas prise pour la publication. Le `version` de Chrome ne contient que des
nombres, donc là le commit va dans `version_name`.

```sh
npm version minor           # 0.11.0 -> 0.12.0: package.json, package-lock.json, un commit et le tag v0.12.0
git push --follow-tags      # le tag déclenche .github/workflows/release.yml
```

Le workflow de publication s'arrête si le tag et `package.json` ne concordent pas, lance les
tests, puis joint `macaed-<tag>.html`, `macaed-extension-<tag>.zip` et `SHA256SUMS.txt`.

## GitHub Pages

`.github/workflows/pages.yml` compile et teste chaque push vers `main` et déploie
`build/pages/` sur GitHub Pages (Settings → Pages → Source : GitHub Actions), à
<https://marketkernel.github.io/markdown-catalog-editor/>. Dans Chrome, Edge et Arc, le bouton
d'installation dans la barre d'adresse en fait une fenêtre d'application séparée ; sur iOS,
c'est Partager → Sur l'écran d'accueil. Les dossiers s'ouvrent de la même façon que dans le
fichier unique.

**Hors connexion.** Une fois ouvert, l'éditeur fonctionne sans connexion : le service worker
garde la page, son manifeste et ses icônes dans un cache nommé d'après la version, et sert la
page depuis là. Les notes ne passent jamais par lui — elles sont sur votre disque.

**Mises à jour.** Chaque déploiement change `sw.js`, si bien que le navigateur trouve le nouveau
worker de lui-même — au lancement avec une connexion, toutes les quelques heures tant que
l'application reste ouverte, quand la connexion revient, ou quand « Paramètres → Rechercher des
mises à jour » le demande. Le nouveau worker télécharge sa version dans un cache qui lui est
propre et attend ; celui en cours continue de servir l'ancienne page, hors connexion aussi, pour
que rien ne change sous vos mains. Les paramètres, avec un point sur leur bouton, et l'écran de
démarrage disent alors « La version … est prête. Mettre à jour » : Mettre à jour enregistre la
note ouverte (ou le demande, quand elle ne peut pas être enregistrée), laisse entrer le nouveau
worker et recharge la page, qui annonce une fois qu'elle a été mise à jour ; l'ancien cache est
supprimé. Sans le bouton, la nouvelle version démarre une fois que chaque fenêtre de
l'application a été fermée — ou, avec « Installer les mises à jour automatiquement quand tout est enregistré et que l’app est en arrière-plan » coché dans les paramètres, dès que rien n'est
non enregistré et que la fenêtre est hors de vue.

C'est aussi le compromis : une PWA installée exécute ce que le dernier déploiement y a mis,
tandis qu'un fichier téléchargé reste à la version qu'il est. Pour une version figée sur le
disque, prenez `macaed-<tag>.html` depuis une publication et comparez-le avec `SHA256SUMS.txt`.

L'application installée demande au navigateur de conserver son stockage
(`navigator.storage.persist()`) : un disque presque plein pourrait sinon emporter avec lui la
copie hors connexion et les dossiers mémorisés.

`npm run test:browser` ouvre aussi `build/pages/` (`tools/test-pwa.mjs`) : le service worker
prend la page en charge, Chrome trouve le manifeste installable, et une fois le serveur
disparu, la page se charge quand même ; puis une vérification ne trouve rien, puis pas de
connexion, puis un nouveau déploiement, qui attend que Mettre à jour le laisse entrer.

## Organisation

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

## Limites

- L'édition collaborative, les extensions (plugins), la synchronisation et un graphe de liens ne
  sont pas pris en charge.
- Sur un téléphone, la mise en page est conçue pour la lecture : le menu contextuel de
  l'arborescence nécessite un appui long qu'iOS ne transforme pas en un, et les tableaux sont
  étendus avec des barres qui apparaissent au survol.
- Seuls les navigateurs basés sur Chromium peuvent écrire des fichiers.
- L'extension est pour Chrome (et les navigateurs construits dessus avec un panneau latéral,
  comme Edge) ; elle n'est pas encore dans le Chrome Web Store. Elle garde les images sur le web
  plutôt que de les télécharger dans le dossier : cela nécessiterait un accès à tous les sites.

## Licence

MIT — voir [LICENSE](../../LICENSE).

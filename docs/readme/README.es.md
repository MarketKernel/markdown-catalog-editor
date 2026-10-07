# markdown-catalog-editor

<!-- languages -->
<h3 align="center">
<a href="../../README.md">🇬🇧 English</a> ·
<a href="README.zh.md">🇨🇳 中文</a> ·
<a href="README.hi.md">🇮🇳 हिन्दी</a> ·
<b>🇪🇸 Español</b> ·
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
<a href="README.it.md">🇮🇹 Italiano</a> ·
<a href="README.uk.md">🇺🇦 Українська</a>
</h3>
<!-- /languages -->

Un editor de Markdown para una carpeta local de notas — al estilo de Obsidian, pero
contenido por completo en un único archivo HTML independiente. No se usa ninguna red: los
archivos se leen y se guardan directamente en el disco.

**[Demo en línea](https://markdown.marketkernel.com/)** — el mismo editor
como PWA (Progressive Web App, aplicación web progresiva): se puede instalar en el sistema
y entonces se ejecuta como una app aparte, con su propia ventana e icono, y funciona sin
conexión. En un ordenador, en Chrome, Edge y Arc, usa el botón de instalación de la barra de
direcciones; en Android, el menú ⋮ de Chrome → Instalar app; en iOS, Compartir → Añadir a
pantalla de inicio, en Safari o en Chrome. Ahí también tus notas se quedan en tu disco, la
app instalada abre un `.md` directamente desde el Finder o el Explorador, y se actualiza
cuando tú lo decides — ver "[GitHub Pages](#github-pages)".

El mismo editor es también **Markdown Knowledge Base**, una
[extensión de Chrome](#markdown-knowledge-base-la-extensión-de-chrome): selecciona texto en
una página web, pulsa su botón, y **Send to Markdown** lo añade a la nota predeterminada de
tu base de conocimiento — o a cualquier nota que elijas. El editor en sí se abre junto a la
página en el panel lateral de Chrome.

![El editor con una carpeta de notas abierta: el árbol de archivos y las etiquetas a la izquierda, una nota en modo edición a la derecha](../macaed.jpg)

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

## Cómo usarlo

1. Compila `build/macaed.html` (ver "[Compilación](#compilación)") y ábrelo en un
   navegador.
2. "Abrir carpeta" → elige una carpeta con archivos `.md`. También puedes simplemente
   arrastrar la carpeta a la ventana.
3. El interruptor **Lectura / Edición** en la parte superior, o `⌘E`.

En Chrome, Edge y Arc la carpeta se abre mediante la File System Access API: las notas se
leen y se escriben en su sitio, y crear, renombrar y eliminar archivos y carpetas, todo
funciona. En Safari y Firefox la carpeta se abre en modo de solo lectura, y `⌘S` ofrece
descargar el archivo modificado — y lo mismo pasa en los teléfonos: Chrome en Android no
tiene File System Access, y todos los navegadores en iOS, Chrome incluido, funcionan sobre
el motor de Safari.

El editor recuerda las últimas seis carpetas abiertas ahí (una página nunca llega a conocer
la ruta de una carpeta, así que guarda el identificador de la carpeta en el IndexedDB del
navegador), y la última nota abierta en cada una. En el siguiente inicio, la última carpeta
se abre por sí sola si el navegador todavía lo permite — en una app instalada, o una vez
que elegiste "Permitir en cada visita". Si no, la pantalla de inicio muestra las carpetas
recientes: un clic, y el navegador vuelve a pedir acceso. Para volver a esa lista — para
cambiar de carpeta o abrir una nueva — haz clic en el nombre de la carpeta en la parte
superior del panel de archivos, o en "Cerrar carpeta" en los ajustes; × quita una carpeta
de la lista.

Si colocas `macaed.html` junto a tus notas y lo sirves por HTTP, la página recoge la
carpeta por sí sola — siempre que haya un `index.json` junto a él, con la forma
`{ "name": "Notes", "files": ["Note.md", "Folder/Other.md"] }`.

### Una sola nota

Un archivo `.md` se puede abrir por sí solo, sin su carpeta:

- **Desde el Finder o el Explorador**, en la app instalada (Chrome o Edge en un ordenador):
  Abrir con → la app, o conviértela en la app predeterminada para `.md`. La nota llega a la
  ventana de la app cuando hay una abierta — dos ventanas sobre un mismo archivo se
  sobrescribirían sus guardados entre sí — y ocupa el lugar de la carpeta mostrada ahí; abrir
  la misma nota otra vez la deja tal como está.
- **Arrastrada a la ventana**, en cualquier navegador.

La nota se lee y se escribe en su sitio, como en una carpeta — en Safari y Firefox de solo
lectura, con `⌘S` ofreciendo una descarga. Sin una carpeta alrededor no hay nada que crear,
renombrar o eliminar junto a ella, ni imágenes de su carpeta, etiquetas o exportación: eso
viene con abrir la carpeta. Una nota abierta así no se añade a las carpetas recientes.

## Markdown Knowledge Base: la extensión de Chrome

`npm run build` también escribe `build/extension/`: el editor como extensión de Chrome, y
`build/macaed-extension-<version>.zip` del mismo para la Chrome Web Store; un lanzamiento
incluye también el zip. Para instalarla: `chrome://extensions` → Modo de desarrollador →
Cargar extensión sin empaquetar → `build/extension` (o el zip descomprimido).

**La base de conocimiento** es la carpeta de notas abierta por última vez en la extensión. El
editor en sí — el **modo completo** — vive en el panel lateral de Chrome, junto a la página,
en la disposición de teléfono, ya que un panel es estrecho; permanece ahí entre pestañas. Una
carpeta se abre en él igual que en el archivo, y las carpetas recientes se recuerdan — las
propias de la extensión, aparte de las del archivo o de la PWA.

**El botón de la barra de herramientas** (o `Alt+Shift+M`) abre una pequeña ventana sobre la
página:

- Arriba, lo que está seleccionado en la página, como Markdown — o, cuando no hay nada
  seleccionado, el texto principal de la página: el artículo, sin los menús del sitio, las
  barras laterales, el pie de página, los botones para compartir, los formularios y las
  partes ocultas.
- **Send to Markdown** lo añade al final de la **nota predeterminada** — `Inbox.md` en la
  raíz de la base de conocimiento al principio, creada la primera vez que hace falta.
  Después de una línea en blanco viene el texto, y luego una línea
  `— [The page's title](https://…)` que enlaza de dónde vino. La ventana se cierra en cuanto
  se escribe.
- **Añadir a otra nota**: las notas de la base de conocimiento, con un campo para buscar una
  por nombre; un clic en una nota la añade ahí en su lugar. La estrella junto a una nota la
  convierte en la predeterminada; la predeterminada aparece primero en la lista.
- Cuando no hay nada seleccionado, **Como una nota nueva** convierte la página en una nota
  propia (más abajo).
- **Modo completo** abre el panel lateral.

**Cuando la base de conocimiento está cerrada** — Chrome retira el acceso a una carpeta en
cuanto se cierra el último panel lateral, y tras reiniciar, a menos que hayas elegido
"Permitir en cada visita" — una página no puede entrar en la carpeta hasta que haces clic.
La ventana lo indica entonces y sigue listando las notas, tal como las vio el panel por
última vez: **Send to Markdown**, o un clic en una nota, deja aparte lo que seleccionaste, en
el almacenamiento propio de la extensión, y pasa al final de esa nota en cuanto un panel
lateral vuelve a abrir la carpeta. **Abrir** le pide la carpeta a Chrome directamente en la
ventana; un clic en la carpeta en el panel lateral hace lo mismo. Cuando Chrome lo pregunte,
elige "Permitir en cada visita": la carpeta se mantendrá entonces abierta cuando se cierre
el panel, y tras reiniciar.

Cuando el panel lateral tiene abierta la base de conocimiento, es el panel el que añade a la
nota — puede tener esa nota abierta con cambios aún sin guardar, que una escritura a sus
espaldas perdería. Sin ningún panel abierto y con la carpeta aún permitida — en cada visita,
o mediante **Abrir** — la ventana escribe la nota ella misma.

**El menú contextual** de una página tiene **Enviar la página a Markdown**; en un texto
seleccionado, **Enviar la selección a Markdown**; en un enlace, **Enviar el enlace a
Markdown**; en una imagen, **Enviar la imagen a Markdown**. Ninguno de ellos abre el panel
lateral: al abrirse, un panel desplaza la página a un lado. Si no hay ningún panel abierto
en la ventana, lo que elegiste va al final de la nota predeterminada, igual que con **Send to
Markdown** — o, con la base de conocimiento cerrada, espera a que se abra, como antes. El
botón de la barra de herramientas indica lo que pasó: una marca de verificación por un
momento, o `!` con el motivo en su título, y cuántos envíos esperan, hasta que un panel abre
la carpeta. Si el panel de la ventana está abierto, va allí en su lugar, donde un diálogo
muestra lo que llegó — y de qué sitio — como Markdown que todavía
puedes cambiar, y pregunta adónde va:

- **Una nota nueva**, la opción predeterminada para una página: en la carpeta de recortes
  (`Clippings` en la raíz a menos que la cambies; la carpeta se recuerda, vacío significa la
  raíz), con el nombre del título de la página, dejando fuera lo que un nombre de archivo no
  puede contener. Un nombre ya existente recibe un número, `Title 2.md`. La nota empieza con
  front matter — el título de la página, su dirección y el día — y después el texto; se abre
  en cuanto se guarda.

  ```markdown
  ---
  title: "The page's title"
  source: "https://example.com/post"
  clipped: 2026-10-07
  ---

  # The page's title

  The text…
  ```

- **El final de la nota abierta**, la opción predeterminada para una selección, un enlace o
  una imagen, de la misma manera que Send to Markdown. Un enlace no necesita línea de fuente:
  es su propia fuente.

Enviado antes de que se abriera alguna vez una carpeta, espera: el panel pide una carpeta, y el
diálogo aparece en cuanto hay una abierta. Una página que la extensión no puede leer — las
propias páginas de Chrome, la Web Store, un PDF — llega como un enlace a ella.

**Qué es el Markdown.** Encabezados, párrafos, **negrita**, *cursiva*, ~~tachado~~,
==resaltado==, `code`, enlaces e imágenes con sus direcciones completas, listas — anidadas,
numeradas, de tareas — citas, bloques de código con su lenguaje (a partir de `language-…`,
`highlight-source-…` de GitHub y similares), tablas (un salto de línea en una celda como
`<br>`, tal como lo escribe el editor), separadores. El texto se lee tal cual: un `*`, una
`#` al principio de una línea o una `<b>` escrita en la página se escapan, así que nunca se
convierten en formato, y ningún HTML de la página entra en la nota. Las imágenes se quedan
en la web, enlazadas por su dirección; se toma la dirección real de una imagen perezosa en
lugar de su marcador de posición, y los píxeles de seguimiento se dejan fuera.

**Permisos.** `activeTab`: un clic en el botón, en el menú o el atajo le da a la extensión
esa única pestaña, y solo entonces la lee — con `scripting`, una función ejecutada en la
página que copia su texto y lo devuelve. Ningún content script se ejecuta en ningún sitio, y
no hay acceso a ningún sitio por lo demás: no hay `host_permissions`, cosa que la
compilación rechaza. `offscreen`: el worker no tiene DOM, así que, sin ningún panel abierto,
el HTML de una página o una selección se convierte en Markdown en un documento offscreen de
la extensión, que se cierra en cuanto termina. `contextMenus`, `sidePanel` y `storage` — lo
que se envía al panel
lateral llega al panel de su ventana mediante `chrome.storage.session`, que desaparece
cuando el navegador se cierra; en `chrome.storage.local` está lo que la ventana del botón
dejó aparte mientras la base de conocimiento estaba cerrada, la lista de sus notas, y el
idioma del panel y la nota predeterminada, para el worker. La ventana del botón y el worker
le piden a un panel que tiene abierta la base de conocimiento que añada algo a
una nota con un mensaje de `chrome.runtime`, que el panel solo acepta de las propias páginas
de la extensión. Las páginas de la extensión tienen `connect-src 'none'`: el editor no
accede a nada por la red; la compilación lo comprueba, así como que ninguna página tenga un
script en línea o una dirección externa.

**Cómo está hecho.** El panel es la propia página: `panel.html` con su script en
`panel.js`, como exige Manifest V3 — el mismo `src/main.ts`, con `src/extension/extension.ts`
en el lugar de `src/platform.ts`, cuyos enganches no hacen nada en el archivo y en la PWA. La
ventana del botón es `popup.html` y `popup.js` (`src/extension/popup.ts`), con los estilos
de la página: lee el identificador de la base de conocimiento del mismo IndexedDB que el
panel, y escribe a través de él mientras el navegador todavía lo permite; si no, deja aparte
lo enviado en `chrome.storage.local`, donde el panel que abre la carpeta lo encuentra
(`src/extension/messages.ts`). El worker,
`background.js`, tiene el menú: lee la pestaña (`src/extension/take.ts`, `grab.ts`), y envía
lo que tomó al panel de la ventana, o lo añade a la nota predeterminada igual que hace la
ventana del botón (`src/extension/knowledge.ts`), a través de `offscreen.html` para el
Markdown (`src/extension/offscreen.ts`). El HTML se convierte en Markdown en
`src/extension/to-markdown.ts`, y el editor lo añade o pregunta adónde va (`src/clip.ts`,
`src/clip-ui.ts`).

## Vista previa en vivo

En el modo de edición el documento permanece formateado, y solo el bloque en el que está el
cursor se convierte en Markdown en bruto. Un bloque es un párrafo, un encabezado, una lista
entera, un bloque de código o una cita: una lista no se descompone línea a línea. Las
tablas se editan de otra manera — ver "[Tablas](#tablas)".

La línea de origen mantiene el tamaño de letra, el grosor y la altura de línea de la
formateada, así que el texto no salta: `# Heading` se muestra al tamaño de un encabezado.
Esto se comprueba automáticamente — cuando se cambia un bloque, su borde superior se mueve
menos de un píxel a cualquier nivel de zoom entre 50 y 200 %.

Hay un lugar donde la altura sí cambia, y eso es inevitable en este modo: un bloque de
código gana dos líneas de valla de `` ``` ``. Los bloques vecinos no se sacuden en el
proceso — solo se desplaza lo que está debajo.

Enter fuera de una lista inicia un bloque nuevo. Pulsado al final de un bloque, o en una
línea vacía, abre una línea vacía debajo y pone el cursor en ella; pulsado de nuevo, añade
otra. En Markdown una sola línea en blanco solo separa dos bloques, así que una línea vacía
en la que se puede escribir es una que tiene líneas en blanco a ambos lados — el propio
editor añade la línea separadora, y el texto escrito nunca se pega al bloque vecino. Esas
líneas y las definiciones de referencia de enlace (`[id]: https://…`) solo se muestran en
el modo de edición; la vista de lectura renderiza el Markdown tal como es.

## Tablas

Una tabla nunca se convierte en `| pipes |`. Un clic abre solo la celda bajo el puntero, y
la celda muestra su propio texto — `**bold**` en lugar de negrita — de modo que el formato
en línea y las marcas, enlaces y colores de la barra de herramientas siguen funcionando
dentro de ella. Escribir reescribe solo esa celda en el archivo; el resto de la tabla
conserva su espaciado y alineación.

- **Moverse**: Tab y Shift+Tab van a la celda siguiente y anterior, Enter a la celda de
  abajo, las flechas a la celda vecina en el borde del texto — y más allá del borde de la
  tabla, al bloque siguiente. Enter en la última fila inicia un bloque nuevo debajo de la
  tabla.
- **Saltos de línea**: Ctrl+Enter (también ⌘Enter o Shift+Enter) inicia una línea nueva
  dentro de la celda. Una fila de tabla es una sola línea de Markdown, así que el salto se
  escribe como `<br>`; la celda que se está editando lo muestra como un salto de línea
  real, y el texto pegado conserva sus líneas de la misma manera. Dentro de una celda de
  varias líneas, las flechas arriba y abajo se mueven primero entre sus líneas. El texto de
  la celda se alinea arriba.
- **Añadir**: en el modo de edición, pasar el cursor sobre una tabla muestra una barra con
  **+** debajo, que añade una fila, y una a su derecha, que añade una columna. Tab en la
  última celda también añade una fila.
- **Eliminar**: solo se eliminan las filas y columnas vacías, así que ningún texto se
  pierde por un descuido. Pasar el cursor sobre una fila vacía muestra una **×** a su
  izquierda, sobre una columna vacía una **×** encima de ella. Retroceso en una celda
  vacía hace lo mismo desde el teclado: elimina la fila si toda la fila está vacía, si no
  la columna si toda la columna lo está (encabezado incluido); una tabla sin texto que le
  quede se elimina entera. La fila de encabezado se queda — una tabla necesita una.

Añadir o eliminar reescribe la tabla en la forma simple `| a | b |`.

## Etiquetas

Las etiquetas agrupan notas entre carpetas. No se escriben en las notas: el Markdown se
queda exactamente como estaba, y todas las etiquetas de la carpeta viven en un solo
archivo junto a las notas.

- **En una nota**: las etiquetas se sitúan bajo el título como chips `#tag`, seguidos de
  un **+**. El **+** se convierte en un campo; Enter añade la etiqueta, y el **+** reaparece
  después de ella. Las etiquetas ya usadas en la carpeta se sugieren mientras escribes. Esc
  cancela; salir del campo con texto en él también añade la etiqueta. **×** en un chip
  elimina la etiqueta, y un clic en el chip abre la página de la etiqueta. Las etiquetas se
  pueden cambiar tanto en modo lectura como en modo edición.
- **Ortografía**: una `#` inicial se descarta y los espacios dentro de una etiqueta se
  convierten en guiones, así que `#to do` se guarda como `to-do`. Una etiqueta que difiere
  de una ya existente solo en mayúsculas/minúsculas toma la ortografía existente — `Idea` e
  `idea` nunca se convierten en dos etiquetas. Una nota no puede llevar la misma etiqueta
  dos veces.
- **Anidación**: `/` anida etiquetas. `work/alpha` y `work/beta` se sitúan bajo `work` en
  el árbol de etiquetas, y una nota etiquetada `work/alpha` también se cuenta bajo `work`.
- **El árbol de etiquetas**: la sección en la parte inferior del panel de archivos,
  separada del árbol de archivos. Cada etiqueta muestra cuántas notas la llevan a ella o a
  una etiqueta anidada bajo ella; la flecha de una etiqueta padre pliega sus hijas, y el
  encabezado pliega la sección entera. El filtro de nombre sobre el árbol de archivos
  también filtra las etiquetas. La sección ocupa hasta el 42 % del panel y se desplaza por
  dentro; arrastrar la línea que está sobre ella la hace más baja (nunca más alta), un
  doble clic en la línea devuelve el espacio, y con la línea enfocada ↑ y ↓ hacen lo mismo.
  La altura se recuerda.
- **La página de una etiqueta**: hacer clic en una etiqueta del árbol, o en un chip,
  muestra las notas que la llevan — una etiqueta padre lista también las notas de cada
  etiqueta bajo ella. Cada fila da el nombre de la nota, su carpeta y todas sus etiquetas;
  un clic en el nombre abre la nota, un clic en una etiqueta abre esa etiqueta. La página
  es de solo lectura: no hay nada que editar en ella, y la barra de herramientas de
  formato está desactivada. Para una etiqueta anidada, los padres en su título enlazan a
  sus propias páginas.
- **Renombrar y eliminar**: las etiquetas siguen a una nota, o a todas las notas de una
  carpeta, cuando se renombra o se elimina desde el panel de archivos. Una nota movida o
  eliminada fuera del editor conserva su entrada en el archivo, pero la entrada no se
  muestra ni se cuenta mientras la nota falta.
- **Carpetas de solo lectura** (Safari, Firefox): las etiquetas se muestran, pero el **+**
  y la **×** no.

### `.meta.json`

El archivo se sitúa en la raíz de la carpeta abierta y se crea con la primera etiqueta.
Nunca se muestra en el árbol de archivos.

```json
{
  "notes": {
    "Ideas.md": { "tags": ["idea", "work/alpha"] },
    "Projects/Roadmap.md": { "tags": ["work/alpha", "planning"] }
  }
}
```

Las claves son rutas de notas relativas a la raíz, tal como las muestra el árbol; las
etiquetas conservan el orden en que se añadieron. El archivo se escribe con las notas
ordenadas por ruta y una sangría de dos espacios, así que se lee bien en un diff, y las
notas sin etiquetas que les queden se eliminan de él. Los campos que el editor no conoce —
en la parte superior o dentro de la entrada de una nota — se conservan cuando vuelve a
escribir el archivo, así otras herramientas pueden guardar sus propios datos en él. Si el
archivo no es un objeto JSON válido, el editor lo indica, no muestra etiquetas y nunca lo
sobrescribe; las etiquetas no se pueden cambiar hasta que el archivo se arregle y la
carpeta se vuelva a abrir.

Cuando la carpeta se sirve por HTTP con un `index.json` (ver "[Cómo usarlo](#cómo-usarlo)"),
incluye `.meta.json` entre sus archivos para que se muestren las etiquetas.

## Exportar a HTML

El botón de exportar en la barra de herramientas (junto a Guardar) convierte toda la
carpeta en un sitio estático; **Exportar a HTML…** en el menú contextual de una carpeta
hace lo mismo solo para esa carpeta, y en el espacio vacío bajo el árbol lo hace para toda
la carpeta. El sitio se escribe en `output/<folder>/` en la raíz de la carpeta de notas; la
carpeta recibe el nombre del momento de la exportación, `2025-12-31_23-33-33`, y se puede
renombrar en el diálogo. `output` nunca se muestra en el árbol. Solo una carpeta abierta
para escritura se puede exportar.

Mientras la exportación se ejecuta, el diálogo muestra el paso en el que está — leyendo las
notas, escribiendo las páginas, copiando las imágenes — con una barra de progreso, y no se
puede cerrar; **Detener** la termina después de los archivos ya en curso, dejando lo que se
escribió hasta entonces. El botón de exportar y la opción del menú quedan desactivados
hasta que termina. Los archivos se leen y se escriben de varios en varios, y cada carpeta en
el camino se crea una sola vez. Al final la exportación vuelve a leer la carpeta desde el
disco: si falta algún archivo, el diálogo dice cuántos y nombra uno, en lugar de informar
de un éxito sobre una carpeta vacía.

**Crear un sitio estático** — activado por defecto — hace una página por nota, como se
describe más abajo. Desactivado, la exportación es una sola página, `index.html`, con todas
las notas dentro: el panel izquierdo es un índice, cada nota es una sección con su nombre
encima, sus encabezados un nivel más bajo y sus ids con el prefijo de la nota, así que los
enlaces entre notas y a sus encabezados se convierten en anclas en la página. La página
muestra una nota a la vez — la que señala o hacia la que apunta el `#ancla` de la
dirección, y al principio la `index` o `README` de la raíz, si no, la primera nota de la
raíz. El índice, los enlaces, los resultados de búsqueda y los enlaces **anterior** /
**siguiente** al final de cada nota cambian entre ellas. Se hace en CSS (`:target`), así
que funciona también sin el script; el script solo marca la nota que se muestra en el
índice. Imprimir muestra todas las notas. El buscador propio del navegador (`⌘F`) solo ve
la nota que se muestra — el campo de búsqueda las recorre todas. Con etiquetas, el árbol de
etiquetas del panel y los chips de las notas llevan a una sección de etiquetas al final, un
encabezado por etiqueta con sus notas. La página es un solo archivo: la hoja de estilos y
el script se escriben dentro de ella. Solo las imágenes se sitúan a su lado, reunidas en una
carpeta `assets` que conserva las carpetas de donde vinieron, pero no el paso `assets`
propio de cada nota: `docs/assets/Guide/a.png` se convierte en `assets/docs/Guide/a.png`.
La página única tiene la misma búsqueda, botón de tema, botones **expandir todo** /
**contraer todo** y panel redimensionable que un sitio; la búsqueda lee las notas
directamente de la página, y un resultado salta a su nota.

El ancho del texto y el nombre de la nota encima de ella siguen los ajustes del editor en
el momento de la exportación: **Ancho del texto** fijado al panel completo da páginas a
todo lo ancho, y con **Mostrar el nombre de la nota como título** desactivado no se añade
ningún nombre encima de las notas.

Las páginas llevan todo su texto y enlaces relativos simples, sin nada que se cargue
después: el sitio se abre desde una URL `file://`, desde cualquier servidor web y para un
buscador — cada página tiene un `<title>`, un `<meta name="description">` tomado de su
primer párrafo, un `lang` y un solo `<h1>`. Las carpetas en la navegación se pliegan con
`<details>`; el tema sigue al sistema.

Un pequeño script, `site.js`, añade lo que el HTML solo no puede:

- **Búsqueda**: un campo en la parte superior del panel izquierdo. Busca cada palabra
  escrita en los nombres de las notas, sus carpetas y su texto; los resultados ocupan el
  lugar del árbol — los nombres que coinciden primero, cada uno con un fragmento alrededor
  de las palabras encontradas, marcadas — y el árbol vuelve cuando se borra el campo (Esc).
  Enter abre el primer resultado, ↓ y ↑ recorren la lista. El texto proviene de
  `search.js`, que el script carga la primera vez que se usa el campo, así que las páginas
  en sí se mantienen tan ligeras como eran.
- **Expandir todo** y **contraer todo** junto a "Notas" sobre la navegación.
- Un botón de **tema** junto al nombre del sitio: una luna cambia al tema oscuro, un sol
  vuelve al claro, sea cual sea la preferencia del sistema. Hasta que se pulsa, el tema
  sigue al sistema.
- Un asa en el borde derecho del panel que lo hace más ancho o más estrecho (160–560 px;
  un doble clic devuelve el valor por defecto, ← → lo mueven con el asa enfocada).

El tema, el ancho de la columna y el estado de las carpetas se recuerdan de página en
página, por sitio; las carpetas de la página que se muestra siempre están abiertas. Sin el
script — bloqueado, o quitado de la plantilla — el campo de búsqueda, los botones y el asa
simplemente no están, el tema sigue al sistema, y el sitio se lee y enlaza igual.

- **Páginas**: `dir/Note.md` se convierte en `dir/Note.html`. Una nota que empieza con un
  encabezado igual a su nombre tiene ese encabezado como título de la página, con sus
  etiquetas debajo. Una nota raíz llamada `index` o `README` se convierte en la página de
  portada, `index.html`; sin una, la portada lista las notas y las etiquetas.
  `[text](other.md)` y `[[wiki links]]` apuntan a las páginas, `[[Note#Heading]]` al
  encabezado — cada encabezado lleva un id — y un enlace a una nota que no está en la
  exportación se queda como texto plano. Las casillas de tareas se muestran, pero no se
  pueden pulsar. El front matter se deja fuera.
- **Imágenes**: cada imagen y PDF de la carpeta se copia en la misma ruta, así que tanto
  `![[image.png]]` como `![alt](path.png)` siguen funcionando; una incrustación se
  encuentra donde la encuentra el editor.
- **Etiquetas**: con la casilla **Exportar etiquetas** activada, cada página muestra sus
  etiquetas, el árbol de etiquetas se sitúa bajo la navegación, y una página por etiqueta
  lista sus notas — una etiqueta padre, las notas de cada etiqueta bajo ella — además de un
  índice de etiquetas en `tags/index.html`. Solo cuentan las notas de la exportación.
- **Plantilla**: el diálogo muestra la plantilla de página; edítala ahí o pulsa
  **Restablecer la predeterminada**, y se recuerda. La plantilla es HTML con
  `{{placeholders}}`:

  | Marcador | Representa |
  | --- | --- |
  | `{{navigation}}` | el árbol de carpetas como un `<nav>`, con la página actual marcada — obligatorio |
  | `{{heading}}` | el `<h1>` de la página, vacío cuando la nota empieza con el suyo propio — obligatorio |
  | `{{content}}` | la nota como HTML — obligatorio |
  | `{{tags}}` | el árbol de etiquetas como un `<nav>`; obligatorio cuando se exportan etiquetas, vacío si no |
  | `{{pagetags}}` | las etiquetas de la nota como `#chips` que enlazan a sus páginas |
  | `{{title}}` | el nombre de la página como texto plano, para `<title>` |
  | `{{site}}` | el nombre de la carpeta exportada |
  | `{{description}}` | el primer párrafo, en texto plano, para `<meta name="description">` |
  | `{{width}}` | `full` o `column`, según el ajuste de ancho de texto |
  | `{{root}}` | `../` por cada carpeta en la que está la página, así `{{root}}style.css` llega a la raíz |
  | `{{styles}}` | la hoja de estilos: un `<link>` a `style.css`, o todo el `<style>` en una página única |
  | `{{script}}` | el script: un `<script src>` para `site.js`, o todo el `<script>` en una página única |
  | `{{theme}}` | el botón de claro/oscuro |
  | `{{path}}` | la ruta de la nota, `docs/Note.md` |
  | `{{lang}}` | el idioma de la interfaz, para `<html lang>` |

  Un sitio recibe `style.css`, `site.js` y `search.js` en su raíz, use la plantilla o no;
  una página única lleva su hoja de estilos y su script dentro, y recibe un `style.css`
  junto a ella solo cuando su plantilla, de antes de `{{styles}}`, todavía enlaza una. La
  hoja de estilos por defecto da estilo a la nota como la vista de lectura del editor y lee
  el ancho de `<html data-width="{{width}}">`. Un marcador que la exportación no conoce se
  deja tal cual. Una plantilla guardada antes de que apareciera un marcador nuevo no lo
  usa: **Restablecer la predeterminada** lo incorpora.

## Privacidad y seguridad

- **La página no accede a nada.** Una Content-Security-Policy en el archivo deja que su
  código solicite solo archivos junto a él en el mismo servidor (`connect-src 'self'`,
  para una carpeta servida con un `index.json`), y que no envíe ningún formulario a ningún
  sitio. La compilación falla si falta la política o se cuela una referencia externa. La
  copia de la PWA permite su manifiesto y su service worker, ambos de su propio origen.
- **Los scripts en las notas nunca se ejecutan.** Las notas pueden contener HTML — así es
  como funcionan los colores de texto — así que la política permite exactamente un
  script, el propio del editor, por su hash: un `onerror` en una `<img>` o un `<script>`
  en una nota no hace nada.
- **Lo que una nota enlaza en la web se carga desde ahí**: una imagen, un vídeo o un marco
  incrustado con una dirección `https://`, como en cualquier visor de Markdown — esa es
  elección de la nota, no del editor. Esas solicitudes no llevan ningún `Referer`.
- **Los archivos se quedan en tu disco.** Las notas se leen y se escriben en su sitio
  mediante la File System Access API; las carpetas recordadas son identificadores en el
  IndexedDB del navegador, nunca rutas ni contenidos.
- Los permisos de la extensión: ver
  "[Markdown Knowledge Base](#markdown-knowledge-base-la-extensión-de-chrome)".

## Características

- **Árbol de archivos**: carpetas plegables, filtrado por nombre, creación, renombrado y
  eliminación mediante el menú contextual, panel redimensionable, panel ocultable (`⌘\`).
- **Formatear la selección**: encabezados H1–H3, negrita, cursiva, tachado, monoespaciado,
  resaltado `==…==`, color de texto y de fondo, enlace, `[[wiki link]]`, listas, tareas,
  cita, bloque de código, tabla, separador.
- **Markup**: CommonMark más tablas, tareas con casillas pulsables, `==highlight==`,
  `[[wiki links]]`, front matter, resaltado de sintaxis para 19 lenguajes, imágenes de la
  carpeta.
- **Imágenes**: `![alt](assets/Note/image-1.png)` muestra una imagen por su ruta desde la
  carpeta de la nota. `![[assets/Note/image-1.png]]` de Obsidian también funciona, la ruta
  desde la carpeta de la nota o si no desde la raíz (`![[…|300]]` fija el ancho). Una
  incrustación más antigua con un nombre a secas, `![[image-1.png]]`, se busca en la
  carpeta de imágenes de los ajustes, con y sin la subcarpeta de la nota, en
  `assets/<note name>/`, junto a la nota, y luego en cualquier lugar de la carpeta por su
  nombre, como hace Obsidian. Las carpetas de imágenes empiezan plegadas en el árbol.
  Renombrar una nota también renombra su carpeta de imágenes y cambia los enlaces de la
  nota a sus imágenes, en cualquiera de las dos formas, a la nueva ruta. Una imagen pulsada
  en el árbol se abre como imagen, no como texto.
- **Añadir imágenes**: el botón de imagen en la barra de herramientas elige archivos de
  imagen; una imagen pegada con `⌘V` — una captura de pantalla, una imagen copiada en el
  navegador, un archivo copiado en el gestor de archivos — se añade de la misma manera.
  Cualquiera de las dos se guarda en la carpeta de imágenes junto a la nota,
  `assets/<note name>/` por defecto, y se inserta como Markdown simple con su ruta,
  `![image-1](assets/<note name>/image-1.png)`, que cualquier editor muestra (un espacio en
  la ruta se escribe `%20`): en el cursor, o al final de la nota cuando no hay ningún
  bloque abierto. Las imágenes arrastradas sobre la nota se colocan donde se sueltan: en
  ese punto de un bloque o de una celda de tabla, y junto al texto o entre dos bloques, al
  final del bloque de arriba; una suelta en modo lectura cambia a edición, y una fuera de
  la nota añade las imágenes al final. Una suelta con una carpeta dentro aún así abre la
  carpeta. Una captura de pantalla pegada se llama `image-1.png`, `image-2.png` y así
  sucesivamente; un archivo elegido conserva su propio nombre, con un número añadido
  cuando ya está tomado. Las celdas copiadas de una hoja de cálculo se pegan como texto,
  no como la imagen que las acompaña. Solo una carpeta abierta para escritura admite
  imágenes nuevas.
- **Etiquetas**: etiquetas anidadas en las notas, un árbol de etiquetas y una página por
  etiqueta, mantenidas aparte de las notas en `.meta.json` — ver
  "[Etiquetas](#etiquetas)".
- **Exportar a HTML**: la carpeta, o una de sus subcarpetas, como un sitio estático con
  búsqueda, o como una sola página — ver "[Exportar a HTML](#exportar-a-html)".
- **Una sola nota** abierta desde el Finder o el Explorador en la app instalada, o soltada
  sobre la ventana — ver "[Una sola nota](#una-sola-nota)".
- **Markdown Knowledge Base**: lo que se selecciona en Chrome a la nota predeterminada, o a
  la que elijas, con Send to Markdown; una página, un enlace o una imagen a una nota — ver
  "[Markdown Knowledge Base](#markdown-knowledge-base-la-extensión-de-chrome)".
- **Ajustes** (el engranaje arriba a la derecha, junto a la búsqueda): idioma de la
  interfaz, tema (sistema, claro, oscuro), zoom 50–200 %, ancho del texto (una columna
  centrada o el panel completo), si el nombre de la nota se muestra como título, y adónde
  van las imágenes añadidas: la carpeta de imágenes junto a la nota (`assets` por defecto)
  y si cada nota recibe su propia subcarpeta en ella; sin una, todas las imágenes van
  directamente a la carpeta. Al final, la versión — y en la app instalada, buscar
  actualizaciones y si instalarlas por sí solas.
- **Idiomas**: inglés y 16 más — 中文, हिन्दी, Español, Français, العربية, বাংলা,
  Português, Русский, اردو, Bahasa Indonesia, Deutsch, 日本語, Türkçe, 한국어, Italiano,
  Українська. Por defecto la interfaz sigue el idioma del navegador. En árabe y urdu el
  chrome se refleja de derecha a izquierda; la nota en sí conserva su propia dirección.
- **Teléfonos**: en una pantalla más estrecha de 720 px el panel de archivos se desliza
  sobre la nota — ☰ lo abre, elegir una nota o tocar a su lado lo cierra — y la barra de
  herramientas cabe en una fila; el formato recibe una segunda fila solo en modo edición.
  La exportación se deja fuera ahí. En una pantalla táctil los campos tienen al menos
  16 px, así iOS no hace zoom en ellos, y las filas del árbol son más altas. La
  disposición de escritorio y su ancho de panel recordado permanecen intactos.
- Autoguardado un segundo después de una edición, deshacer y rehacer, búsqueda dentro de
  la nota.
- Se recuerdan el idioma, el tema, el zoom, el ancho del texto, el ancho del panel, la
  altura del panel de etiquetas y la última nota abierta.

## Atajos de teclado

| Acción | Teclas |
| --- | --- |
| Modo lectura / edición | `⌘E` |
| Guardar | `⌘S` |
| Buscar dentro de la nota | `⌘F` |
| Panel de archivos | `⌘\` |
| Zoom | `⌘+` · `⌘−` · `⌘0` |
| Negrita · cursiva · enlace | `⌘B` · `⌘I` · `⌘K` |
| Monoespaciado · resaltado · enlace wiki | `⌘⇧C` · `⌘⇧H` · `⌘⇧K` |
| Encabezado 1–6 · texto normal | `⌘⌥1`…`⌘⌥6` · `⌘⌥0` |
| Deshacer · rehacer | `⌘Z` · `⌘⇧Z` |
| Sangría de lista | `Tab` · `⇧Tab` |
| Salir del bloque | `Esc` |

## Traducciones

El texto en inglés se queda en el código: `t('tree', 'Delete')`, `tn('status', '{count}
word', '{count} words', n)`, y `data-i18n="context"` / `data-i18n-attr="context"` en la
plantilla. El primer argumento es el contexto — la parte de la interfaz a la que
pertenece una cadena, así la misma palabra en inglés puede traducirse de forma diferente
en dos sitios. Un diccionario, `src/locales/<code>.json`, asigna contexto → texto en
inglés → traducción:

```json
{
  "tree": { "Delete": "Удалить" },
  "status": { "{count} words": { "one": "{count} слово", "few": "{count} слова", "many": "{count} слов", "other": "{count} слова" } }
}
```

Una cadena que falta en el diccionario se muestra en inglés. Un texto con un número tiene
una forma por cada categoría plural del idioma (`Intl.PluralRules`), con clave según la
forma plural inglesa. `npm run i18n` enumera, por idioma, las cadenas que aún no están
traducidas y las que ya no se usan; `npm test` comprueba que cada traducción conserve los
marcadores de posición en inglés y tenga todas las formas plurales.

Lo que Chrome muestra de la extensión en sí — su nombre y descripción, el título del botón
de la barra de herramientas — sigue el idioma del navegador en lugar del panel, mediante
`chrome.i18n`. Esos textos son los ingleses de `src/extension/manifest.json`, traducidos
en los mismos diccionarios bajo el contexto `manifest`; la compilación los escribe en
`_locales/<code>/messages.json` y pone `__MSG_appName__` y similares en el manifiesto.
Chrome tiene sus propios códigos e ignora el resto: `pt` se convierte en `pt_BR` y
`pt_PT`, `zh` se convierte en `zh_CN`, y el urdu no tiene ninguno, así que ahí Chrome
describe la extensión en inglés. La compilación se detiene si un nombre supera los 75
caracteres o una descripción los 132. El menú contextual habla el idioma del panel una
vez que este se ha abierto, el del navegador antes de eso.

Este README también está traducido: `docs/readme/README.<code>.md`, uno por idioma, con
la lista de idiomas en la parte superior de cada uno. Un cambio aquí también pertenece a
las traducciones.

## Compilación

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

`build.mjs` empaqueta `src/main.ts` con esbuild en un IIFE y lo sustituye, junto con los
estilos y el icono (un URI de datos), en `src/template.html`; la plantilla y la hoja de
estilos de la exportación se empaquetan como cadenas de texto. La Content-Security-Policy
de la plantilla recibe el hash de ese único script. El resultado es `build/macaed.html`, de
unos 640 KB. La compilación falla si queda siquiera una referencia externa en él.

La misma ejecución escribe `build/pages/`: esa página como una PWA instalable —
`index.html` con un enlace al manifiesto y un `<meta name="service-worker">` que le dice a
la página que registre su worker, `manifest.webmanifest`, los iconos y `sw.js`, que guarda
en caché la página para que se abra sin conexión. `build/macaed.html` en sí se mantiene
como un único archivo sin referencias externas.

Y `build/extension/`: `panel.html` — la plantilla, con su script en `panel.js` —
`popup.html` (con los estilos de la página y `popup.css`) y `popup.js`, `background.js`,
`offscreen.html` y `offscreen.js`, los
iconos, `_locales/` y `manifest.json`, cuya versión es la de `package.json`.
`build/macaed-extension-<version>.zip` contiene los mismos archivos con fechas fijas: los
mismos orígenes dan los mismos bytes.

Las pruebas de navegador arrancan el Chrome local (`CHROME=/path/to/chrome` para elegir
uno) y le hablan en el protocolo DevTools, sin dependencias; sin un Chrome se omiten.
`tools/test-extension.mjs` carga la extensión mediante ese protocolo
(`Extensions.loadUnpacked` por una tubería; `--load-extension` desapareció de Chrome desde
la versión 137), abre una carpeta en el panel lateral y le envía páginas, selecciones,
enlaces e imágenes desde sitios de prueba en un servidor local; luego la ventana del botón
añade selecciones a la nota predeterminada y a una elegida, a través del panel y por sí
sola, y, con la base de conocimiento cerrada, las deja aparte para el panel, o lo abre ella
misma; sin ningún panel abierto, el menú añade a la nota predeterminada, o la deja aparte. Un menú
contextual no se puede pulsar desde DevTools, así que la prueba dispara ella misma el
`onClicked` del worker, y abre la ventana del botón como una página propia, indicándole qué
pestaña tiene al lado; sin un clic real Chrome no concede `activeTab`, así que la copia bajo
prueba puede acceder a los sitios de prueba, `*.test`, como permisos de host.

## Versiones y lanzamientos

La versión se escribe en un solo lugar, `package.json`. La compilación la incorpora en la
página (la línea bajo la pantalla de inicio, la parte inferior de los ajustes), en el
`manifest.json` de la extensión y en el nombre de caché de la PWA. Una compilación del
commit etiquetado `v<version>` la muestra tal cual; cualquier otra añade su commit,
`0.11.0+1a2b3c4`, para que una página de `main` en GitHub Pages no se confunda con la
versión publicada. El `version` de Chrome solo admite números, así que ahí el commit va en
`version_name`.

```sh
npm version minor           # 0.11.0 -> 0.12.0: package.json, package-lock.json, a commit and the tag v0.12.0
git push --follow-tags      # the tag starts .github/workflows/release.yml
```

El flujo de lanzamiento se detiene si la etiqueta y `package.json` no coinciden, ejecuta
las pruebas, y luego adjunta `macaed-<tag>.html`, `macaed-extension-<tag>.zip` y
`SHA256SUMS.txt`.

## GitHub Pages

`.github/workflows/pages.yml` compila y prueba cada push a `main` y despliega
`build/pages/` en GitHub Pages (Configuración → Pages → Origen: GitHub Actions), en
<https://marketkernel.github.io/markdown-catalog-editor/>. En Chrome, Edge y Arc el botón
de instalación de la barra de direcciones lo convierte en una ventana de app aparte; en
iOS es Compartir → Añadir a pantalla de inicio. Las carpetas se abren de la misma manera
que en el archivo único.

**Sin conexión.** Una vez abierto, el editor funciona sin conexión: el service worker
guarda la página, su manifiesto y sus iconos en una caché con el nombre de la versión, y
sirve la página desde ahí. Las notas nunca pasan por él — están en tu disco.

**Actualizaciones.** Cada despliegue cambia `sw.js`, así que el navegador encuentra el
nuevo worker por sí solo — al iniciar con conexión, cada pocas horas mientras la app
permanece abierta, cuando vuelve la conexión, o cuando Ajustes → Buscar actualizaciones lo
solicita. El nuevo worker descarga su versión en una caché propia y espera; el que está en
marcha sigue sirviendo la página antigua, también sin conexión, así que nada cambia bajo
tus manos. Los ajustes, con un punto en su botón, y la pantalla de inicio dicen entonces
"La versión … está lista. Actualizar": Actualizar guarda la nota abierta (o pregunta,
cuando no se puede guardar), deja entrar al nuevo worker y recarga la página, que avisa una
vez de que se ha actualizado; la caché antigua se elimina. Sin el botón, la versión nueva
arranca en cuanto se han cerrado todas las ventanas de la app — o, con "Instalar las
actualizaciones por sí solas cuando todo esté guardado y la app esté en segundo plano"
marcada en los ajustes, en cuanto no queda nada sin guardar y la ventana está fuera de la
vista.

Ese es también el compromiso: una PWA instalada ejecuta lo que puso el último despliegue,
mientras que un archivo descargado se queda con la versión que es. Para una versión fija
en el disco, toma `macaed-<tag>.html` de un lanzamiento y compáralo con `SHA256SUMS.txt`.

**Abrir un `.md`.** El manifiesto nombra los archivos Markdown como archivos que la app abre
(`file_handlers`) y los mantiene en una sola ventana (`launch_handler`, `focus-existing`):
ver "[Una sola nota](#una-sola-nota)". La página los recoge mediante `launchQueue`, una vez
que termina su inicio — reabrir la última carpeta —, así que la carpeta nunca reemplaza a la
nota; una que llega durante una exportación o con un diálogo abierto espera hasta que la
abras de nuevo.

La app instalada le pide al navegador que conserve su almacenamiento
(`navigator.storage.persist()`): un disco con poco espacio podría, si no, llevarse la copia
sin conexión y las carpetas recordadas.

`npm run test:browser` también abre `build/pages/` (`tools/test-pwa.mjs`): el service
worker toma el control de la página, Chrome encuentra el manifiesto instalable, y con el
servidor caído la página sigue cargando; luego una comprobación no encuentra nada, luego
sin conexión, luego un nuevo despliegue, que espera hasta que Actualizar lo deja entrar.
Chrome sin interfaz no le entrega ningún archivo a una app, así que un `launchQueue` de
prueba le da a la página un identificador de archivo real: la nota se abre por sí sola y una
edición se guarda en ella.

## Estructura

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

## Limitaciones

- La edición colaborativa, los plugins, la sincronización y un grafo de enlaces no son
  compatibles.
- En un teléfono, la disposición está pensada para leer: el menú contextual del árbol
  necesita una pulsación larga que iOS no convierte en tal, y las tablas se amplían con
  barras que aparecen al pasar el cursor.
- Solo los navegadores basados en Chromium pueden escribir archivos.
- La extensión es para Chrome (y navegadores construidos sobre él con panel lateral, como
  Edge); todavía no está en la Chrome Web Store. Mantiene las imágenes en la web en lugar
  de descargarlas a la carpeta: eso necesitaría acceso a cualquier sitio.

## Licencia

MIT — ver [LICENSE](../../LICENSE).

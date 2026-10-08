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
<b>🇧🇷 Português</b> ·
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

Um editor de Markdown para uma pasta local de notas — no espírito do Obsidian, mas
inteiramente contido em um único arquivo HTML independente. Nenhuma rede é usada: os
arquivos são lidos e salvos diretamente no disco.

**[Demonstração online](https://markdown.marketkernel.com/)** — o mesmo editor
como PWA (Progressive Web App, aplicativo web progressivo): pode ser instalado no sistema
e então é executado como um app separado, com sua própria janela e ícone, e funciona
offline. Em um computador, no Chrome, Edge e Arc, use o botão de instalação na barra de
endereços; no Android, o menu ⋮ do Chrome → Instalar app; no iOS, Compartilhar →
Adicionar à Tela de Início, no Safari ou no Chrome. Suas notas também ficam no seu disco
ali, o app instalado abre um `.md` direto do Finder ou do Explorador, e ele se atualiza
quando você decidir — ver "[GitHub Pages](#github-pages)". Onde um navegador não consegue
gravar em um disco — Safari, Firefox, um iPad ou um celular — as notas são mantidas dentro
do navegador e entram e saem como um arquivo ZIP: ver "[Notas mantidas no
navegador](#notas-mantidas-no-navegador)".

O mesmo editor também é o **Markdown Knowledge Base**, uma
[extensão do Chrome](#markdown-knowledge-base-a-extensão-do-chrome): selecione um texto numa
página da web, aperte o botão dele, e **Send to Markdown** o acrescenta à nota padrão da sua
base de conhecimento — ou a qualquer nota que você escolher. O editor em si se abre ao lado
da página no painel lateral do Chrome.

![O editor com uma pasta de notas aberta: a árvore de arquivos e as etiquetas à esquerda, uma nota em modo de edição à direita](../macaed.jpg)

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

## Como usar

1. Compile `build/macaed.html` (ver "[Compilação](#compilação)") e abra-o em um navegador.
2. "Abrir pasta" → escolha uma pasta com arquivos `.md`. Você também pode simplesmente
   arrastar a pasta para a janela.
3. O interruptor **Leitura / Edição** no topo, ou `⌘E`.

No Chrome, Edge e Arc a pasta é aberta por meio da File System Access API: as notas são
lidas e gravadas no local, e criar, renomear e excluir arquivos e pastas, tudo funciona. O
Safari e o Firefox não conseguem gravar em uma pasta no disco, nem conseguem os celulares e
os iPads: o Chrome no Android não tem File System Access, e todo navegador no iOS e no
iPadOS, Chrome incluso, roda sobre o motor do Safari. Ali as notas são mantidas dentro do
navegador — ver "[Notas mantidas no navegador](#notas-mantidas-no-navegador)".

O editor lembra as últimas seis pastas abertas nele (uma página nunca chega a saber o
caminho de uma pasta, então guarda o identificador da pasta no IndexedDB do navegador), e a
nota aberta por último em cada uma. Na próxima vez que iniciar, a última pasta se abre
sozinha se o navegador ainda permitir — em um app instalado, ou depois que você escolheu
"Permitir em cada visita". Caso contrário, a tela inicial lista as pastas recentes: um
clique, e o navegador pede acesso de novo. Para voltar a essa lista — para trocar de pasta
ou abrir uma nova — clique no nome da pasta no topo do painel de arquivos, ou em "Fechar
pasta" nas configurações; × remove uma pasta da lista.

Se você colocar `macaed.html` junto com suas notas e servi-lo por HTTP, a página pega a
pasta sozinha — desde que um `index.json` esteja ao lado dele, no formato
`{ "name": "Notes", "files": ["Note.md", "Folder/Other.md"] }`.

### Notas mantidas no navegador

Onde o navegador não consegue gravar em uma pasta no disco — Safari, Firefox, qualquer
navegador em um celular ou em um iPad — a tela inicial avisa isso e oferece três formas de
entrar: **Nova pasta** começa com uma pasta vazia, direto em uma primeira nota para escrever;
**Abrir pasta** e **Abrir arquivo ZIP** (ou arraste um dos dois para a janela) copiam o que
você abrir para o IndexedDB do navegador. A partir daí o editor lê e grava essa cópia:
salvamento automático, notas e pastas novas, renomear, excluir, imagens, etiquetas — tudo
funciona como em um disco. Nada sai do dispositivo. Em um iPad sem nada ainda para trazer, Nova
pasta é o caminho de entrada: o Safari dele não consegue escolher uma pasta, e um arquivo chega
depois, a partir de Baixar ZIP.

- **O caminho de volta** é um arquivo ZIP: nas configurações → **Baixar ZIP** empacota a
  pasta inteira — notas, imagens, `.meta.json` — dentro de uma única pasta com o nome dela,
  como uma pasta compactada pelo Finder ou pelo Explorador seria. Aberto de novo como
  arquivo, ele volta como estava. O botão também está ali com uma pasta no disco, como uma
  cópia rápida dela.
- **Um arquivo** criado pelo Finder, pelo Explorador ou pelo `zip` abre como a única pasta
  dentro dele (ou, com arquivos soltos no topo, sob o nome do arquivo). Só é copiado o que
  o editor mostra — notas, imagens e anexos, `.meta.json`; pastas ocultas, `node_modules`,
  `output/` e o `__MACOSX` do Mac ficam de fora. Não precisa de nenhum seletor de pasta, que
  é exatamente o que um iPad mais antigo, cujo Safari não consegue escolher uma pasta,
  precisa.
- **A tela inicial lista as pastas** mantidas neste navegador, as mais recentes primeiro, e
  a última se abre sozinha na próxima vez. Abrir a mesma pasta ou arquivo de novo acrescenta
  uma segunda cópia ao lado da primeira ("Notes 2") em vez de sobrescrever as edições da
  primeira. × exclui uma cópia do navegador, depois de perguntar — ela pode ser a única.
- **Exportar para HTML** baixa o site como um arquivo ZIP em vez de gravá-lo em `output/`.
- **Por quanto tempo elas ficam**: pede-se ao navegador que mantenha os dados do site para
  sempre (`navigator.storage.persist()`) — o Firefox pergunta a você, o Chrome e o Safari
  decidem por conta própria, mais facilmente para um app instalado. Um navegador que diz não
  pode apagar as notas quando o espaço em disco está acabando, e o Safari apaga os dados de
  um site não visitado em sete dias de uso do Safari, a menos que esteja adicionado à Tela
  de Início. Limpar os dados do site ou o histórico do navegador as exclui em qualquer
  navegador. Por isso baixe um arquivo ZIP de vez em quando — é a única cópia fora do
  navegador.

Onde o IndexedDB está desligado (algumas janelas privadas), uma pasta abre somente para
leitura, como antes, e `⌘S` oferece baixar a nota modificada.

### Uma nota avulsa

Um arquivo `.md` pode ser aberto sozinho, sem sua pasta:

- **Pelo Finder ou Explorador**, no app instalado (Chrome ou Edge em um computador): Abrir
  com → o app, ou torne-o o app padrão para `.md`. A nota chega à janela do app quando há
  uma aberta — duas janelas em um mesmo arquivo sobrescreveriam os salvamentos uma da
  outra — e ocupa o lugar da pasta mostrada ali; abrir a mesma nota de novo a deixa como
  está.
- **Arrastada para a janela**, em qualquer navegador.

A nota é lida e gravada no local, como em uma pasta — no Safari e no Firefox somente para
leitura, com `⌘S` oferecendo um download (uma nota não é copiada para o navegador; sua
pasta pode ser). Sem uma pasta ao redor não há nada para criar,
renomear ou excluir perto dela, nem imagens da sua pasta, etiquetas ou exportação: isso vem
com abrir a pasta. Uma nota aberta assim não é adicionada às pastas recentes.

## Markdown Knowledge Base: a extensão do Chrome

`npm run build` também grava `build/extension/`: o editor como extensão do Chrome, e
`build/macaed-extension-<version>.zip` dele para a Chrome Web Store; um lançamento também
traz o zip. Para instalá-la: `chrome://extensions` → Modo do desenvolvedor → Carregar sem
compactação → `build/extension` (ou o zip descompactado).

**A base de conhecimento** é a pasta de notas aberta por último na extensão. O editor em si
— o **modo completo** — vive no painel lateral do Chrome, ao lado da página, no layout de
celular, já que um painel é estreito; ele permanece ali entre as abas. Uma pasta se abre
nele como no arquivo, e as pastas recentes são lembradas — as próprias da extensão, à parte
das do arquivo ou da PWA.

**O botão da barra de ferramentas** (ou `Alt+Shift+M`) abre uma pequena janela sobre a
página:

- No topo, o que está selecionado na página, como Markdown — ou, quando nada está
  selecionado, o texto principal da página: o artigo, sem os menus do site, as barras
  laterais, o rodapé, os botões de compartilhar, os formulários e as partes ocultas.
- **Send to Markdown** o acrescenta ao final da **nota padrão** — `Inbox.md` na raiz da base
  de conhecimento a princípio, criada na primeira vez que é necessária. Depois de uma linha
  em branco vem o texto, e então uma linha `— [The page's title](https://…)` que remete a de
  onde veio. A janela se fecha assim que ele é gravado.
- **Adicionar a outra nota**: as notas da base de conhecimento, com um campo para encontrar
  uma pelo nome; um clique em uma nota a acrescenta ali em vez disso. A estrela ao lado de
  uma nota a torna a padrão; a padrão aparece primeiro na lista.
- Quando nada está selecionado, **Como uma nova nota** transforma a página em uma nota
  própria (abaixo).
- **Modo completo** abre o painel lateral.

**Quando a base de conhecimento está fechada** — o Chrome retoma o acesso a uma pasta assim
que o último painel lateral se fecha, e também depois de reiniciar, a menos que você tenha
escolhido "Permitir em todas as visitas" — uma página não consegue entrar na pasta até você
clicar. A janela então avisa e continua listando as notas, como o painel as viu pela última
vez: **Send to Markdown**, ou um clique em uma nota, deixa o que você selecionou de lado, no
próprio armazenamento da extensão, e vai para o final dessa nota assim que um painel lateral
abrir a pasta de novo. **Abrir** pede a pasta ao Chrome ali mesmo na janela; um clique na
pasta no painel lateral faz o mesmo. Quando o Chrome perguntar, escolha **Permitir em todas
as visitas**: a pasta então permanece aberta quando o painel se fecha, e depois de reiniciar.

Quando o painel lateral tem a base de conhecimento aberta, é o painel que acrescenta à nota
— ele pode ter essa nota aberta com alterações ainda não salvas, que uma gravação pelas
costas dele perderia. Sem nenhum painel aberto e com a pasta ainda permitida — em todas as
visitas, ou pelo **Abrir** — a própria janela grava a nota.

**O menu de contexto** de uma página tem **Enviar a página para Markdown**; em um texto
selecionado, **Enviar a seleção para Markdown**; em um link, **Enviar o link para
Markdown**; em uma imagem, **Enviar a imagem para Markdown**. Nenhum deles abre o painel
lateral: abrir um painel espreme a página para o lado. Sem nenhum painel aberto na janela, o
que você escolheu vai para o final da nota padrão, como com o **Send to Markdown** — ou, com
a base de conhecimento fechada, espera por ela, como acima. O botão da barra de ferramentas
diz o que aconteceu: uma marca de visto por um momento, `!` com o motivo em seu título, e
quantos envios esperam, até um painel abrir a pasta. Com o painel da janela aberto, ele vai
para lá em vez disso, onde um diálogo mostra o que chegou — e de qual site — como Markdown
que você ainda pode alterar, e pergunta para onde vai:

- **Uma nova nota**, o padrão para uma página: na pasta de recortes (`Clippings` na raiz a
  menos que você a mude; a pasta é lembrada, vazio significa a raiz), com o nome do título
  da página, deixando de fora o que um nome de arquivo não pode conter. Um nome já usado
  recebe um número, `Title 2.md`. A nota começa com front matter — o título da página, seu
  endereço e o dia — e depois o texto; ela se abre assim que é salva.

  ```markdown
  ---
  title: "The page's title"
  source: "https://example.com/post"
  clipped: 2026-10-07
  ---

  # The page's title

  The text…
  ```

- **O final da nota aberta**, o padrão para uma seleção, um link ou uma imagem, do mesmo
  jeito que o Send to Markdown. Um link não precisa de linha de fonte: ele é sua própria
  fonte.

Enviado antes que qualquer pasta tenha sido aberta, ele espera: o painel pede uma pasta, e o diálogo
aparece assim que uma é aberta. Uma página que a extensão não pode ler — as próprias
páginas do Chrome, a Web Store, um PDF — chega como um link para ela.

**O que é o Markdown.** Títulos, parágrafos, **negrito**, *itálico*, ~~tachado~~,
==realce==, `code`, links e imagens com seus endereços completos, listas — aninhadas,
numeradas, de tarefas — citações, blocos de código com sua linguagem (a partir de
`language-…`, `highlight-source-…` do GitHub e afins), tabelas (uma quebra de linha em uma
célula como `<br>`, do jeito que o editor escreve), divisores. O texto é lido como é: um
`*`, um `#` no início de uma linha ou uma `<b>` digitada na página é escapado, então nunca
vira formatação, e nenhum HTML da página entra na nota. As imagens ficam na web, vinculadas
pelo seu endereço; o endereço real de uma imagem lazy é usado em vez do seu placeholder, e
os pixels de rastreamento são deixados de fora.

**Permissões.** `activeTab`: um clique no botão, no menu ou no atalho dá à extensão
aquela única aba, e só então ela a lê — com `scripting`, uma função executada na página que
copia seu texto e o retorna. Nenhum content script roda em lugar nenhum, e não há acesso a
nenhum site de outra forma: não há `host_permissions`, o que a compilação recusa.
`offscreen`: o worker não tem DOM, então, sem nenhum painel aberto, o HTML de uma página ou
de uma seleção vira Markdown em um documento offscreen da extensão, que se fecha assim que
termina. `contextMenus`, `sidePanel` e `storage` — o que é enviado ao painel lateral vai ao
painel de sua janela por meio de `chrome.storage.session`, que some quando o navegador fecha;
em `chrome.storage.local` fica o que a janela do botão deixou de lado enquanto a base de
conhecimento estava fechada, a lista de suas notas, o idioma do painel e a nota padrão, para
o worker. A janela do botão e o worker pedem a um painel que tenha a base de conhecimento
aberta que acrescente algo a uma nota com uma mensagem de `chrome.runtime`, que o painel só
aceita das próprias páginas da extensão. As páginas da
extensão têm `connect-src 'none'`: o editor não acessa nada pela rede; a compilação verifica
isso, e também que nenhuma página tenha um script inline ou um endereço externo.

**Como é feito.** O painel é a própria página: `panel.html` com seu script em `panel.js`,
como exige o Manifest V3 — o mesmo `src/main.ts`, com `src/extension/extension.ts` no
lugar de `src/platform.ts`, cujos hooks não fazem nada no arquivo e na PWA. A janela do
botão é `popup.html` e `popup.js` (`src/extension/popup.ts`), com os estilos da página: ela
lê o identificador da base de conhecimento do mesmo IndexedDB que o painel, e grava por meio
dele enquanto o navegador ainda permite; senão, deixa o que foi enviado de lado em
`chrome.storage.local`, onde o painel que abre a pasta o encontra
(`src/extension/messages.ts`). O worker, `background.js`, tem o menu: ele lê a aba
(`src/extension/take.ts`, `grab.ts`), e envia o que pegou para o painel da janela, ou o
acrescenta à nota padrão como a janela do botão faz (`src/extension/knowledge.ts`), por meio
de `offscreen.html` para o Markdown (`src/extension/offscreen.ts`). O HTML vira Markdown em
`src/extension/to-markdown.ts`, e o editor a acrescenta ou pergunta para onde vai
(`src/clip.ts`, `src/clip-ui.ts`).

## Visualização ao vivo

No modo de edição o documento permanece formatado, e só o bloco onde está o cursor vira
Markdown bruto. Um bloco é um parágrafo, um título, uma lista inteira, um bloco de código
ou uma citação: uma lista não se desfaz linha por linha. As tabelas são editadas de outra
forma — ver "[Tabelas](#tabelas)".

A linha de origem mantém o tamanho da fonte, o peso e a altura de linha da formatada, para
que o texto não pule: `# Heading` é mostrado no tamanho de um título. Isso é verificado
automaticamente — quando um bloco é trocado, sua borda superior se move menos de um pixel
em qualquer nível de zoom entre 50 e 200 %.

Há um lugar onde a altura muda sim, e isso é inevitável nesse modo: um bloco de código
ganha duas linhas de cerca de `` ``` ``. Os blocos vizinhos não tremem no processo — só o
que está abaixo se desloca.

Enter fora de uma lista inicia um novo bloco. Pressionado no final de um bloco, ou em uma
linha vazia, ele abre uma linha vazia abaixo e põe o cursor nela; pressionado de novo,
adiciona outra. No Markdown uma única linha em branco só separa dois blocos, então uma
linha vazia em que se pode digitar é uma que tem linhas em branco dos dois lados — o
próprio editor adiciona a linha separadora, e o texto digitado nunca gruda no bloco
vizinho. Essas linhas e as definições de referência de link (`[id]: https://…`) só são
mostradas no modo de edição; a visualização de leitura renderiza o Markdown como ele é.

## Tabelas

Uma tabela nunca vira `| pipes |`. Um clique abre só a célula sob o ponteiro, e a célula
mostra seu próprio texto — `**bold**` em vez de negrito — de modo que a formatação em
linha e as marcações, links e cores da barra de ferramentas continuam funcionando dentro
dela. Digitar reescreve só aquela célula no arquivo; o resto da tabela mantém seu
espaçamento e alinhamento.

- **Mover-se**: Tab e Shift+Tab vão para a célula seguinte e anterior, Enter para a célula
  abaixo, as setas para a célula vizinha na borda do texto — e além da borda da tabela,
  para o bloco ao lado dela. Enter na última linha inicia um novo bloco abaixo da tabela.
- **Quebras de linha**: Ctrl+Enter (também ⌘Enter ou Shift+Enter) inicia uma nova linha
  dentro da célula. Uma linha de tabela é uma única linha de Markdown, então a quebra é
  escrita como `<br>`; a célula sendo editada a mostra como uma quebra de linha real, e o
  texto colado mantém suas linhas da mesma forma. Dentro de uma célula de várias linhas, as
  setas para cima e para baixo se movem primeiro entre suas linhas. O texto da célula é
  alinhado ao topo.
- **Adicionar**: no modo de edição, passar o cursor sobre uma tabela mostra uma barra com
  **+** abaixo, que adiciona uma linha, e uma à direita dela, que adiciona uma coluna. Tab
  na última célula também adiciona uma linha.
- **Excluir**: só linhas e colunas vazias são excluídas, então nenhum texto é perdido por
  um deslize. Passar o cursor sobre uma linha vazia mostra um **×** à esquerda dela, sobre
  uma coluna vazia um **×** acima dela. Backspace em uma célula vazia faz o mesmo pelo
  teclado: exclui a linha se a linha inteira estiver vazia, senão a coluna se a coluna
  inteira estiver (cabeçalho incluso); uma tabela sem nenhum texto restante é excluída por
  inteiro. A linha de cabeçalho permanece — uma tabela precisa de uma.

Adicionar ou excluir reescreve a tabela na forma simples `| a | b |`.

## Etiquetas

As etiquetas agrupam notas entre pastas. Elas não são escritas nas notas: o Markdown
permanece exatamente como estava, e todas as etiquetas da pasta vivem em um único arquivo
ao lado das notas.

- **Em uma nota**: as etiquetas ficam sob o título como chips `#tag`, seguidos de um
  **+**. O **+** vira um campo; Enter adiciona a etiqueta, e o **+** reaparece depois
  dela. Etiquetas já usadas na pasta são sugeridas enquanto você digita. Esc cancela; sair
  do campo com texto nele também adiciona a etiqueta. **×** em um chip remove a etiqueta,
  e um clique no chip abre a página da etiqueta. As etiquetas podem ser alteradas tanto no
  modo de leitura quanto no de edição.
- **Ortografia**: um `#` inicial é descartado e os espaços dentro de uma etiqueta viram
  hifens, então `#to do` é salvo como `to-do`. Uma etiqueta que difere de uma já existente
  só em maiúsculas/minúsculas assume a grafia existente — `Idea` e `idea` nunca viram duas
  etiquetas. Uma nota não pode levar a mesma etiqueta duas vezes.
- **Aninhamento**: `/` aninha etiquetas. `work/alpha` e `work/beta` ficam sob `work` na
  árvore de etiquetas, e uma nota etiquetada `work/alpha` também é contada sob `work`.
- **A árvore de etiquetas**: a seção na parte inferior do painel de arquivos, separada da
  árvore de arquivos. Cada etiqueta mostra quantas notas a carregam, a ela ou a uma
  etiqueta aninhada sob ela; a seta de uma etiqueta pai recolhe suas filhas, e o
  cabeçalho recolhe a seção inteira. O filtro de nome acima da árvore de arquivos também
  filtra as etiquetas. A seção ocupa até 42 % do painel e rola por dentro; arrastar a
  linha acima dela a torna mais baixa (nunca mais alta), um clique duplo na linha devolve
  o espaço, e com a linha focada ↑ e ↓ fazem o mesmo. A altura é lembrada.
- **A página de uma etiqueta**: clicar em uma etiqueta na árvore, ou em um chip, mostra as
  notas que a carregam — uma etiqueta pai lista também as notas de cada etiqueta sob ela.
  Cada linha mostra o nome da nota, sua pasta e todas as suas etiquetas; um clique no nome
  abre a nota, um clique em uma etiqueta abre aquela etiqueta. A página é somente leitura:
  não há nada para editar nela, e a barra de ferramentas de formatação fica desativada.
  Para uma etiqueta aninhada, os pais em seu título têm link para suas próprias páginas.
- **Renomear e excluir**: as etiquetas seguem uma nota, ou todas as notas de uma pasta,
  quando ela é renomeada ou excluída pelo painel de arquivos. Uma nota movida ou excluída
  fora do editor mantém sua entrada no arquivo, mas a entrada não é mostrada nem contada
  enquanto a nota está ausente.
- **Pastas somente leitura** (Safari, Firefox): as etiquetas são mostradas, mas o **+** e
  o **×** não.

### `.meta.json`

O arquivo fica na raiz da pasta aberta e é criado com a primeira etiqueta. Nunca é
mostrado na árvore de arquivos.

```json
{
  "notes": {
    "Ideas.md": { "tags": ["idea", "work/alpha"] },
    "Projects/Roadmap.md": { "tags": ["work/alpha", "planning"] }
  }
}
```

As chaves são caminhos de notas relativos à raiz, como a árvore os mostra; as etiquetas
mantêm a ordem em que foram adicionadas. O arquivo é gravado com as notas ordenadas por
caminho e indentação de dois espaços, então fica legível em um diff, e notas sem nenhuma
etiqueta restante são removidas dele. Campos que o editor não conhece — no topo ou dentro
da entrada de uma nota — são mantidos quando ele regrava o arquivo, para que outras
ferramentas possam guardar seus próprios dados nele. Se o arquivo não for um objeto JSON
válido, o editor avisa, não mostra etiquetas e nunca o sobrescreve; as etiquetas não podem
ser alteradas até o arquivo ser corrigido e a pasta ser reaberta.

Quando a pasta é servida por HTTP com um `index.json` (ver "[Como usar](#como-usar)"),
inclua `.meta.json` entre seus arquivos para que as etiquetas apareçam.

## Exportar para HTML

O botão de exportar na barra de ferramentas (ao lado de Salvar) transforma toda a pasta em
um site estático; **Exportar para HTML…** no menu de contexto de uma pasta faz o mesmo
só para aquela pasta, e no espaço vazio abaixo da árvore faz para a pasta inteira. O site é
gravado em `output/<folder>/` na raiz da pasta de notas; a pasta recebe o nome do momento
da exportação, `2025-12-31_23-33-33`, e pode ser renomeada no diálogo. `output` nunca é
mostrado na árvore. Só uma pasta aberta para escrita pode ser exportada.

Enquanto a exportação roda, o diálogo mostra a etapa em que está — lendo as notas,
escrevendo as páginas, copiando as imagens — com uma barra de progresso, e não pode ser
fechado; **Parar** a encerra depois dos arquivos já em andamento, deixando o que foi
gravado até então. O botão de exportar e o item do menu ficam desativados até terminar. Os
arquivos são lidos e gravados vários de cada vez, cada pasta no caminho criada uma única
vez. No final a exportação lê a pasta de volta do disco: se faltar algum arquivo, o
diálogo diz quantos e nomeia um, em vez de relatar sucesso sobre uma pasta vazia.

**Criar um site estático** — ativado por padrão — faz uma página por nota, como descrito
abaixo. Desativado, a exportação é uma única página, `index.html`, com todas as notas
nela: o painel esquerdo é um sumário, cada nota é uma seção com seu nome acima, seus
títulos um nível mais baixo e seus ids prefixados com o da nota, de modo que os links
entre notas e para seus títulos viram âncoras na página. A página mostra uma nota de cada
vez — a que a `#âncora` do endereço aponta ou está dentro, e no início o `index` ou
`README` da raiz, senão a primeira nota da raiz. O sumário, os links, os resultados de
busca e os links **anterior** / **próxima** no final de cada nota alternam entre elas. É
feito em CSS (`:target`), então funciona também sem o script; o script só marca a nota em
exibição no sumário. Imprimir mostra todas as notas. A busca própria do navegador (`⌘F`)
só vê a nota em exibição — o campo de busca percorre todas elas. Com etiquetas, a árvore
de etiquetas no painel e os chips nas notas levam a uma seção de etiquetas no final, um
título por etiqueta com suas notas. A página é um único arquivo: a folha de estilos e o
script são gravados dentro dela. Só as imagens ficam ao lado, reunidas em uma pasta
`assets` que mantém as pastas de onde vieram, mas não a etapa `assets` própria de cada
nota: `docs/assets/Guide/a.png` vira `assets/docs/Guide/a.png`. A página única tem a mesma
busca, botão de tema, botões **expandir tudo** / **recolher tudo** e painel redimensionável
que um site; a busca lê as notas direto da página, e um resultado pula para sua nota.

A largura do texto e o nome da nota acima dela seguem as configurações do editor no
momento da exportação: **Largura do texto** definida para o painel inteiro dá páginas em
largura total, e com **Mostrar o nome da nota como título** desativado nenhum nome é
adicionado acima das notas.

As páginas trazem todo o seu texto e links relativos simples, sem nada carregado depois:
o site abre a partir de uma URL `file://`, de qualquer servidor web e para um buscador —
cada página tem um `<title>`, um `<meta name="description">` tirado do seu primeiro
parágrafo, um `lang` e um único `<h1>`. As pastas na navegação recolhem com `<details>`; o
tema segue o sistema.

Um pequeno script, `site.js`, acrescenta o que o HTML sozinho não consegue:

- **Busca**: um campo no topo do painel esquerdo. Ele procura por cada palavra digitada
  nos nomes das notas, suas pastas e seu texto; os resultados ocupam o lugar da árvore —
  os nomes que coincidem primeiro, cada um com um trecho em torno das palavras
  encontradas, marcadas — e a árvore volta quando o campo é limpo (Esc). Enter abre o
  primeiro resultado, ↓ e ↑ percorrem a lista. O texto vem de `search.js`, que o script
  carrega na primeira vez que o campo é usado, então as páginas em si permanecem tão
  leves quanto eram.
- **Expandir tudo** e **recolher tudo** ao lado de "Notas" acima da navegação.
- Um botão de **tema** ao lado do nome do site: uma lua muda para o tema escuro, um sol
  volta ao claro, seja qual for a preferência do sistema. Até ser pressionado, o tema
  segue o sistema.
- Uma alça na borda direita do painel que o torna mais largo ou mais estreito (160–560 px;
  um clique duplo devolve o padrão, ← → o movem com a alça focada).

O tema, a largura da coluna e o estado das pastas são lembrados de página em página, por
site; as pastas da página em exibição sempre abrem. Sem o script — bloqueado, ou removido
do modelo — o campo de busca, os botões e a alça simplesmente não estão lá, o tema segue o
sistema, e o site é lido e vinculado da mesma forma.

- **Páginas**: `dir/Note.md` vira `dir/Note.html`. Uma nota que começa com um título igual
  ao seu nome tem esse título como o título da página, com suas etiquetas abaixo dele. Uma
  nota raiz chamada `index` ou `README` vira a página inicial, `index.html`; sem uma, a
  página inicial lista as notas e as etiquetas. `[text](other.md)` e `[[wiki links]]`
  apontam para as páginas, `[[Note#Heading]]` para o título — cada título carrega um id —
  e um link para uma nota que não está na exportação fica como texto simples. Caixas de
  seleção de tarefas são mostradas, mas não clicáveis. O front matter é deixado de fora.
- **Imagens**: toda imagem e PDF na pasta é copiado no mesmo caminho, então tanto
  `![[image.png]]` quanto `![alt](path.png)` continuam funcionando; uma incorporação é
  encontrada onde o editor a encontra.
- **Etiquetas**: com a caixa **Exportar tags** marcada, cada página mostra suas etiquetas,
  a árvore de etiquetas fica sob a navegação, e uma página por etiqueta lista suas notas —
  uma etiqueta pai, as notas de cada etiqueta sob ela — além de um índice de etiquetas em
  `tags/index.html`. Só contam as notas da exportação.
- **Modelo**: o diálogo mostra o modelo de página; edite-o ali ou use **Restaurar o
  padrão**, e ele é lembrado. O modelo é HTML com `{{placeholders}}`:

  | Marcador | Representa |
  | --- | --- |
  | `{{navigation}}` | a árvore de pastas como um `<nav>`, com a página atual marcada — obrigatório |
  | `{{heading}}` | o `<h1>` da página, vazio quando a nota começa com o seu próprio — obrigatório |
  | `{{content}}` | a nota como HTML — obrigatório |
  | `{{tags}}` | a árvore de etiquetas como um `<nav>`; obrigatório quando etiquetas são exportadas, vazio caso contrário |
  | `{{pagetags}}` | as etiquetas da nota como `#chips` com link para suas páginas |
  | `{{title}}` | o nome da página como texto simples, para `<title>` |
  | `{{site}}` | o nome da pasta exportada |
  | `{{description}}` | o primeiro parágrafo, em texto simples, para `<meta name="description">` |
  | `{{width}}` | `full` ou `column`, conforme a configuração de largura do texto |
  | `{{root}}` | `../` por cada pasta em que a página está, então `{{root}}style.css` chega à raiz |
  | `{{styles}}` | a folha de estilos: um `<link>` para `style.css`, ou todo o `<style>` em uma página única |
  | `{{script}}` | o script: um `<script src>` para `site.js`, ou todo o `<script>` em uma página única |
  | `{{theme}}` | o botão de claro/escuro |
  | `{{path}}` | o caminho da nota, `docs/Note.md` |
  | `{{lang}}` | o idioma da interface, para `<html lang>` |

  Um site recebe `style.css`, `site.js` e `search.js` na raiz, use o modelo ou não; uma
  página única carrega sua folha de estilos e seu script dentro dela, e recebe um
  `style.css` ao lado dela só quando seu modelo, de antes de `{{styles}}`, ainda vincula
  um. A folha de estilos padrão estiliza a nota como a visualização de leitura do editor e
  lê a largura de `<html data-width="{{width}}">`. Um marcador que a exportação não
  conhece é deixado como está. Um modelo salvo antes de um novo marcador aparecer não o
  usa: **Restaurar o padrão** o incorpora.

## Privacidade e segurança

- **A página não acessa nada.** Uma Content-Security-Policy no arquivo deixa seu código
  buscar apenas arquivos ao lado dele no mesmo servidor (`connect-src 'self'`, para uma
  pasta servida com um `index.json`), e não enviar nenhum formulário a lugar nenhum. A
  compilação falha se a política estiver ausente ou uma referência externa se infiltrar. A
  cópia da PWA permite seu manifesto e seu service worker, ambos de sua própria origem.
- **Scripts em notas nunca rodam.** Notas podem conter HTML — é assim que as cores de
  texto funcionam — então a política permite exatamente um script, o próprio do editor,
  pelo seu hash: um `onerror` em uma `<img>` ou um `<script>` em uma nota não faz nada.
- **O que uma nota vincula na web carrega de lá**: uma imagem, um vídeo ou um frame
  incorporado com um endereço `https://`, como em qualquer visualizador de Markdown — essa
  é a escolha da nota, não do editor. Tais solicitações não carregam nenhum `Referer`.
- **Os arquivos ficam no seu disco.** As notas são lidas e gravadas no local por meio da
  File System Access API; as pastas lembradas são identificadores no IndexedDB do
  navegador, nunca caminhos ou conteúdos. Onde um navegador não consegue gravar em um
  disco, as pastas que você abrir são copiadas para o IndexedDB dele, só neste dispositivo,
  e só saem dali como um arquivo ZIP que você baixa — ver "[Notas mantidas no
  navegador](#notas-mantidas-no-navegador)".
- As permissões da extensão: ver
  "[Markdown Knowledge Base](#markdown-knowledge-base-a-extensão-do-chrome)".

## Recursos

- **Árvore de arquivos**: pastas recolhíveis, filtro por nome, criação, renomeação e
  exclusão pelo menu de contexto, painel redimensionável, painel ocultável (`⌘\`).
- **Formatar a seleção**: títulos H1–H3, negrito, itálico, tachado, monoespaçado, realce
  `==…==`, cor de texto e de fundo, link, `[[wiki link]]`, listas, tarefas, citação, bloco
  de código, tabela, divisor.
- **Marcação**: CommonMark mais tabelas, tarefas com caixas de seleção clicáveis,
  `==highlight==`, `[[wiki links]]`, front matter, realce de sintaxe para 19 linguagens,
  imagens da pasta.
- **Imagens**: `![alt](assets/Note/image-1.png)` mostra uma imagem pelo seu caminho a
  partir da pasta da nota. O `![[assets/Note/image-1.png]]` do Obsidian também funciona, o
  caminho a partir da pasta da nota ou então a partir da raiz (`![[…|300]]` define a
  largura). Uma incorporação mais antiga com um nome isolado, `![[image-1.png]]`, é
  procurada na pasta de imagens das configurações, com e sem a subpasta da nota, em
  `assets/<note name>/`, ao lado da nota, e depois em qualquer lugar da pasta pelo seu
  nome, como o Obsidian faz. As pastas de imagens começam recolhidas na árvore. Renomear
  uma nota também renomeia sua pasta de imagens e muda os links da nota para suas imagens,
  em qualquer uma das duas formas, para o novo caminho. Uma imagem clicada na árvore abre
  como imagem, não como texto.
- **Adicionar imagens**: o botão de imagem na barra de ferramentas escolhe arquivos de
  imagem; uma imagem colada com `⌘V` — uma captura de tela, uma imagem copiada no
  navegador, um arquivo copiado no gerenciador de arquivos — entra da mesma forma.
  Qualquer uma das duas é salva na pasta de imagens ao lado da nota,
  `assets/<note name>/` por padrão, e inserida como Markdown simples com seu caminho,
  `![image-1](assets/<note name>/image-1.png)`, que todo editor mostra (um espaço no
  caminho é escrito `%20`): no cursor, ou no final da nota quando nenhum bloco está
  aberto. Imagens arrastadas sobre a nota entram onde são soltas: naquele ponto de um
  bloco ou de uma célula de tabela, e ao lado do texto ou entre dois blocos, no final do
  bloco acima; soltar em modo de leitura muda para edição, e uma solta fora da nota
  adiciona as imagens no final. Uma solta com uma pasta dentro ainda assim abre a pasta.
  Uma captura de tela colada é chamada `image-1.png`, `image-2.png` e assim por diante; um
  arquivo escolhido mantém seu próprio nome, com um número adicionado quando ele já está
  em uso. Células copiadas de uma planilha são coladas como texto, não como a imagem que
  as acompanha. Só uma pasta aberta para escrita aceita imagens novas.
- **Etiquetas**: etiquetas aninhadas nas notas, uma árvore de etiquetas e uma página por
  etiqueta, mantidas à parte das notas em `.meta.json` — ver "[Etiquetas](#etiquetas)".
- **Exportar para HTML**: a pasta, ou uma de suas subpastas, como um site estático com
  busca, ou como uma única página — ver "[Exportar para HTML](#exportar-para-html)".
- **Uma nota avulsa** aberta pelo Finder ou Explorador no app instalado, ou arrastada para a
  janela — ver "[Uma nota avulsa](#uma-nota-avulsa)".
- **Notas mantidas no navegador** onde ele não consegue gravar em um disco — Safari,
  Firefox, celulares, iPads — entram e saem como um arquivo ZIP; qualquer pasta é baixada
  como uma a partir das configurações — ver "[Notas mantidas no
  navegador](#notas-mantidas-no-navegador)".
- **Markdown Knowledge Base**: o que é selecionado no Chrome para a nota padrão, ou para
  uma que você escolher, com Send to Markdown; uma página, um link ou uma imagem para uma
  nota — ver "[Markdown Knowledge Base](#markdown-knowledge-base-a-extensão-do-chrome)".
- **Configurações** (a engrenagem no canto superior direito, ao lado da busca): idioma da
  interface, tema (sistema, claro, escuro), zoom 50–200 %, largura do texto (uma coluna
  centralizada ou o painel inteiro), se o nome da nota é mostrado como título, e para onde
  vão as imagens adicionadas: a pasta de imagens ao lado da nota (`assets` por padrão) e
  se cada nota recebe sua própria subpasta nela; sem uma, todas as imagens vão direto
  para a pasta. Em seguida a pasta aberta: Fechar pasta, e Baixar ZIP de tudo isso como um
  arquivo. No final, a versão — e no app instalado, verificar atualizações e se deve
  instalá-las automaticamente.
- **Idiomas**: inglês e mais 16 — 中文, हिन्दी, Español, Français, العربية, বাংলা,
  Português, Русский, اردو, Bahasa Indonesia, Deutsch, 日本語, Türkçe, 한국어, Italiano,
  Українська. Por padrão a interface segue o idioma do navegador. Em árabe e urdu o chrome
  é espelhado da direita para a esquerda; a nota em si mantém sua própria direção.
- **Celulares**: em uma tela mais estreita que 720 px o painel de arquivos desliza sobre a
  nota — ☰ o abre, escolher uma nota ou tocar ao lado dele o fecha — e a barra de
  ferramentas cabe em uma linha; a formatação ganha uma segunda linha só no modo de
  edição. A exportação é deixada de fora ali. Em uma tela de toque os campos têm pelo
  menos 16 px, para que o iOS não dê zoom neles, e as linhas da árvore são mais altas. O
  layout de desktop e sua largura de painel lembrada permanecem intocados.
- Salvamento automático um segundo depois de uma edição, desfazer e refazer, busca dentro
  da nota.
- O idioma, o tema, o zoom, a largura do texto, a largura do painel, a altura do painel de
  etiquetas e a última nota aberta são lembrados.

## Atalhos de teclado

| Ação | Teclas |
| --- | --- |
| Modo leitura / edição | `⌘E` |
| Salvar | `⌘S` |
| Buscar dentro da nota | `⌘F` |
| Painel de arquivos | `⌘\` |
| Zoom | `⌘+` · `⌘−` · `⌘0` |
| Negrito · itálico · link | `⌘B` · `⌘I` · `⌘K` |
| Monoespaçado · realce · wiki link | `⌘⇧C` · `⌘⇧H` · `⌘⇧K` |
| Título 1–6 · texto simples | `⌘⌥1`…`⌘⌥6` · `⌘⌥0` |
| Desfazer · refazer | `⌘Z` · `⌘⇧Z` |
| Indentação de lista | `Tab` · `⇧Tab` |
| Sair do bloco | `Esc` |

## Traduções

O texto em inglês fica no código: `t('tree', 'Delete')`, `tn('status', '{count} word',
'{count} words', n)`, e `data-i18n="context"` / `data-i18n-attr="context"` no modelo. O
primeiro argumento é o contexto — a parte da interface a que uma string pertence, assim a
mesma palavra em inglês pode ser traduzida de forma diferente em dois lugares. Um
dicionário, `src/locales/<code>.json`, mapeia contexto → texto em inglês → tradução:

```json
{
  "tree": { "Delete": "Удалить" },
  "status": { "{count} words": { "one": "{count} слово", "few": "{count} слова", "many": "{count} слов", "other": "{count} слова" } }
}
```

Uma string que falta no dicionário é mostrada em inglês. Um texto com um número tem uma
forma por categoria plural do idioma (`Intl.PluralRules`), com chave conforme a forma
plural em inglês. `npm run i18n` lista, por idioma, as strings ainda não traduzidas e as
que não são mais usadas; `npm test` verifica se cada tradução mantém os placeholders em
inglês e tem todas as formas plurais.

O que o Chrome mostra da própria extensão — seu nome e descrição, o título do botão da
barra de ferramentas — segue o idioma do navegador em vez do painel, por meio de
`chrome.i18n`. Esses textos são os em inglês de `src/extension/manifest.json`, traduzidos
nos mesmos dicionários sob o contexto `manifest`; a compilação os grava em
`_locales/<code>/messages.json` e coloca `__MSG_appName__` e afins no manifesto. O Chrome
tem seus próprios códigos e ignora o resto: `pt` vira `pt_BR` e `pt_PT`, `zh` vira
`zh_CN`, e o urdu não tem nenhum, então ali o Chrome descreve a extensão em inglês. A
compilação para se um nome passa de 75 caracteres ou uma descrição de 132. O menu de
contexto fala o idioma do painel assim que ele foi aberto, o do navegador antes disso.

Este README também é traduzido: `docs/readme/README.<code>.md`, um por idioma, com a
lista de idiomas no topo de cada um. Uma mudança aqui também pertence às traduções.

## Compilação

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

`build.mjs` empacota `src/main.ts` com o esbuild em uma IIFE e a substitui, junto com os
estilos e o ícone (uma data URI), em `src/template.html`; o modelo e a folha de estilos da
exportação são empacotados como strings. A Content-Security-Policy do modelo recebe o hash
desse único script. O resultado é `build/macaed.html`, com cerca de 640 KB. A compilação
falha se mesmo uma referência externa sobrar nele.

A mesma execução grava `build/pages/`: aquela página como uma PWA instalável —
`index.html` com um link para o manifesto e um `<meta name="service-worker">` que diz à
página para registrar seu worker, `manifest.webmanifest`, os ícones e `sw.js`, que
armazena a página em cache para que ela abra offline. O próprio `build/macaed.html`
continua sendo um único arquivo sem referências externas.

E `build/extension/`: `panel.html` — o modelo, com seu script em `panel.js` —
`popup.html` (com os estilos da página e `popup.css`) e `popup.js`, `background.js`,
`offscreen.html` e `offscreen.js`, os ícones, `_locales/` e `manifest.json`, cuja versão é a
do `package.json`.
`build/macaed-extension-<version>.zip` contém os mesmos arquivos com datas fixas: as mesmas
fontes dão os mesmos bytes.

Os testes de navegador iniciam o Chrome local (`CHROME=/path/to/chrome` para escolher um)
e falam o protocolo DevTools com ele, sem dependências; sem um Chrome eles são pulados.
`tools/test-extension.mjs` carrega a extensão por meio desse protocolo
(`Extensions.loadUnpacked` por um pipe; `--load-extension` desapareceu do Chrome desde a
versão 137), abre uma pasta no painel lateral e envia a ela páginas, seleções, links e
imagens de sites de teste em um servidor local; depois a janela do botão acrescenta seleções
à nota padrão e a uma escolhida, através do painel e por conta própria, e, com a base de
conhecimento fechada, as deixa de lado para o painel, ou abre a pasta ela mesma; sem painel
aberto, o menu acrescenta à nota padrão, ou a deixa de lado. Um menu de
contexto não pode ser clicado
a partir do DevTools, então o teste dispara ele mesmo o `onClicked` do worker, e abre a
janela do botão como uma página própria, dizendo a ela qual aba está ao lado; sem um clique
real o Chrome não concede `activeTab`, então a cópia sob teste pode acessar os sites de
teste, `*.test`, como permissões de host.

## Versões e lançamentos

A versão é escrita em um único lugar, `package.json`. A compilação a coloca na página (a
linha sob a tela inicial, a parte inferior das configurações), no `manifest.json` da
extensão e no nome do cache da PWA. Uma compilação do commit com a tag `v<version>` a
mostra como é; qualquer outra acrescenta seu commit, `0.11.0+1a2b3c4`, para que uma página
do `main` no GitHub Pages não seja confundida com a versão lançada. O `version` do Chrome
só aceita números, então ali o commit vai em `version_name`.

```sh
npm version minor           # 0.11.0 -> 0.12.0: package.json, package-lock.json, a commit and the tag v0.12.0
git push --follow-tags      # the tag starts .github/workflows/release.yml
```

O workflow de lançamento para se a tag e o `package.json` não baterem, roda os testes, e
então anexa `macaed-<tag>.html`, `macaed-extension-<tag>.zip` e `SHA256SUMS.txt`.

## GitHub Pages

`.github/workflows/pages.yml` compila e testa cada push para `main` e implanta
`build/pages/` no GitHub Pages (Configurações → Pages → Origem: GitHub Actions), em
<https://marketkernel.github.io/markdown-catalog-editor/>. No Chrome, Edge e Arc o botão
de instalação na barra de endereços o transforma em uma janela de app separada; no iOS é
Compartilhar → Adicionar à Tela de Início. As pastas abrem da mesma forma que no arquivo
único.

**Offline.** Uma vez aberto, o editor funciona sem conexão: o service worker mantém a
página, seu manifesto e ícones em um cache com o nome da versão, e serve a página a partir
dali. As notas nunca passam por ele — elas estão no seu disco.

**Atualizações.** Cada implantação muda o `sw.js`, então o navegador encontra o novo
worker sozinho — ao iniciar com conexão, a cada poucas horas enquanto o app permanece
aberto, quando a conexão volta, ou quando Configurações → Verificar atualizações pede. O
novo worker baixa sua versão em um cache próprio e espera; o que está em execução continua
servindo a página antiga, também offline, para que nada mude debaixo das suas mãos. As
configurações, com um ponto no botão delas, e a tela inicial então dizem "A versão … está
pronta. Atualizar": Atualizar salva a nota aberta (ou pergunta, quando não pode ser
salva), deixa o novo worker entrar e recarrega a página, que avisa uma vez que foi
atualizada; o cache antigo é excluído. Sem o botão, a nova versão começa assim que todas as
janelas do app forem fechadas — ou, com "Instalar as atualizações automaticamente quando
tudo estiver salvo e o app estiver em segundo plano" marcada nas configurações, assim que
não houver nada sem salvar e a janela estiver fora de vista.

Essa também é a contrapartida: uma PWA instalada roda o que a última implantação colocou,
enquanto um arquivo baixado fica com a versão que é. Para uma versão fixa no disco, pegue
o `macaed-<tag>.html` de um lançamento e compare-o com `SHA256SUMS.txt`.

**Abrir um `.md`.** O manifesto nomeia os arquivos Markdown como arquivos que o app abre
(`file_handlers`) e os mantém em uma única janela (`launch_handler`, `focus-existing`): ver
"[Uma nota avulsa](#uma-nota-avulsa)". A página os recebe por meio de `launchQueue`, assim
que seu início — reabrir a última pasta — termina, então a pasta nunca substitui a nota; uma
que chega durante uma exportação ou com um diálogo aberto espera até você abri-la de novo.

O app instalado pede ao navegador para manter seu armazenamento
(`navigator.storage.persist()`): um disco com pouco espaço poderia, caso contrário, levar
junto a cópia offline e as pastas lembradas.

`npm run test:browser` também abre `build/pages/` (`tools/test-pwa.mjs`): o service worker
assume o controle da página, o Chrome considera o manifesto instalável, e com o servidor
fora do ar a página ainda carrega; depois uma verificação não encontra nada, depois sem
conexão, depois uma nova implantação, que espera até que Atualizar a deixe entrar. O Chrome
headless não entrega nenhum arquivo a um app, então um `launchQueue` de teste dá à página um
identificador de arquivo real: a nota se abre sozinha e uma edição é salva nela.

## Estrutura

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

## Limitações

- Edição colaborativa, plugins, sincronização e um grafo de links não são suportados.
- Em um celular o layout é feito para leitura: o menu de contexto da árvore precisa de um
  toque longo que o iOS não transforma em um, e as tabelas são ampliadas com barras que
  aparecem ao passar o cursor.
- Só navegadores baseados em Chromium em um computador podem gravar arquivos em uma pasta no
  disco; em outros lugares as notas são mantidas no navegador e saem como um arquivo ZIP.
- A extensão é para o Chrome (e navegadores construídos sobre ele com painel lateral, como
  o Edge); ainda não está na Chrome Web Store. Ela mantém as imagens na web em vez de
  baixá-las para a pasta: isso precisaria de acesso a qualquer site.

## Licença

MIT — ver [LICENSE](../../LICENSE).

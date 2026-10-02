# Passo a Passo — PDF, GIF e vídeo

Extensão local para o Google Chrome. Inicie, use o site normalmente e finalize: seus cliques viram passos numerados com instruções, prints e o ponto clicado circulado em vermelho.

## Instalar (Windows, macOS ou Linux)

1. Extraia o arquivo ZIP. Guarde a pasta `passo-a-passo` em um local permanente.
2. No Chrome, digite `chrome://extensions` na barra de endereços.
3. Ative **Modo do desenvolvedor**, no canto superior direito.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta `passo-a-passo` que contém o arquivo `manifest.json`. Não selecione o ZIP nem a pasta acima dela.
6. Na barra do Chrome, clique no ícone de quebra-cabeça e fixe **Passo a Passo**.

Não precisa instalar Node, executar comandos, criar uma conta nem obter chave de API para usar a extensão. As bibliotecas de PDF, GIF e vídeo estão incluídas no ZIP. Requer Chrome 116 ou mais recente em computador. A extensão é instalada manualmente; não está publicada na Chrome Web Store.

## Novidade 1.3: escolher as cores das páginas do PDF

Abra um tutorial em **Meus tutoriais**. A nova seção **Cores do PDF**, logo abaixo de **Ícone do PDF**, permite escolher:

| Controle | O que muda no PDF |
| --- | --- |
| Cor principal | A faixa no topo e os destaques de texto. |
| Quadro do passo | O fundo do retângulo com o número “PASSO”. |
| Margem e moldura | A borda do print e a linha do rodapé. |
| Fundo da página | O background da folha, ao redor dos textos e do print. |

Clique na amostra de cor para abrir o seletor. A prévia mostra a combinação e o ícone escolhido. As cores são salvas automaticamente **por tutorial**; ao reabrir, a mesma combinação será restaurada. **Restaurar cores padrão** volta ao verde original e ao fundo branco, mantendo o ícone e as outras configurações.

Clique em **Baixar PDF** para gerar o arquivo atualizado. Todas as páginas usam as cores escolhidas. O fundo dos prints, as coberturas de dados e os círculos vermelhos mantêm suas cores. Para facilitar a leitura em fundos claros ou escuros, o texto ajusta seu contraste automaticamente; a faixa, o quadro, a moldura e o fundo usam exatamente as cores selecionadas.

O botão **Trocar imagem** continua disponível em **Ícone do PDF**. Trocar ou remover o ícone preserva as cores; alterar as cores preserva o ícone. Os tutoriais antigos abrem com o visual padrão. Estas opções personalizam o PDF; GIF, vídeo, captura e controles de gravação continuam disponíveis.

O arquivo `EXEMPLO-CORES-PERSONALIZADAS.pdf` mostra três páginas com ícone e uma combinação azul sobre fundo claro. Para mudar o layout no código, edite `lib/pdf.js`; os padrões de cor e o ajuste de contraste estão em `lib/pdf-theme.js`.

## Novidade 1.2: uma imagem como ícone nas páginas do PDF

No editor de um tutorial, a seção **Ícone do PDF** permite selecionar uma única imagem do computador. Ela aparece pequena no canto superior direito de **todas as páginas** daquele PDF, mantendo suas proporções.

1. Finalize a gravação ou abra um tutorial existente em **Meus tutoriais**.
2. Em **Ícone do PDF**, clique em **Selecionar imagem** e escolha um arquivo PNG, JPG ou WebP de até 5 MB.
3. Confira a prévia. A imagem fica salva somente nesse tutorial; pode ser trocada ou removida depois.
4. Clique em **Baixar PDF** para gerar o arquivo com o ícone. PDFs já baixados não são alterados.

PNG com fundo transparente é indicado para logotipos. A imagem é reduzida localmente para o tamanho necessário ao ícone, sem esticar, cortar ou cobrir o print. Ao clicar em **Remover**, os próximos PDFs daquele tutorial voltam a sair sem ícone. Tutoriais anteriores continuam abrindo e exportando normalmente.

Essa opção personaliza o PDF. A gravação sem pausas automáticas, as marcações, as coberturas e as exportações GIF/vídeo continuam disponíveis. O arquivo `EXEMPLO-COM-ICONE.pdf` demonstra o resultado; o ícone de exemplo não é aplicado automaticamente aos seus tutoriais.

## Correção 1.1.1: gravação sem pausas automáticas

A extensão continua gravando quando um passo apresenta falha de captura ou salvamento. A pausa é acionada pelo botão **Pausar** ou pelo atalho, por sua escolha.

- Um salvamento demorado não impede que os próximos prints sejam capturados no momento do clique.
- Falhas temporárias na criação do print ou no salvamento recebem até três tentativas, sempre com a mesma imagem anterior ao clique.
- Se não existir um print anterior ao clique, ou se as tentativas de salvar falharem, esse clique fica fora do tutorial. Um aviso no menu informa quantos cliques não foram salvos; ao finalizar, a revisão mostra instrução, horário e motivo dos últimos 50 avisos.
- Os passos seguintes continuam sendo gravados. Confira a sequência na revisão antes de compartilhar.

Fechar a aba/navegador ou encerrar o compartilhamento ainda encerra a captura. Problemas reais de disco, espaço ou permissão precisam ser resolvidos para que novos passos possam ser salvos.

## Atualizar da versão anterior sem perder os tutoriais

1. Finalize uma gravação que estiver em andamento e feche a aba de edição.
2. Extraia este ZIP em uma pasta temporária.
3. Copie o conteúdo da nova pasta `passo-a-passo` para **a mesma pasta já instalada**, substituindo os arquivos. Mantenha o caminho dessa pasta.
4. Em `chrome://extensions`, clique em **Recarregar** no cartão da extensão.
5. Recarregue as páginas abertas e abra **Meus tutoriais** novamente.

Não desinstale a extensão: isso pode apagar o armazenamento local. A versão 1.3 utiliza o mesmo banco de dados e permite exportar tutoriais antigos nos três formatos. Não pede novas permissões.

## Criar um tutorial

1. Abra o site que deseja demonstrar, em uma página `http://` ou `https://`.
2. Clique no ícone **Passo a Passo**, informe um título e escolha **Iniciar nesta aba**.
3. Aguarde o início da gravação. O número vermelho no ícone mostra os passos gravados.
4. Use o sistema normalmente. Cada clique principal gera uma instrução, como `Clique em “Nova solicitação”.`, e guarda a parte visível da página.
5. Clique novamente na extensão e use **Pausar** ou **Continuar** quando precisar. Enquanto estiver pausada, não guarda novos passos nem imagens.
6. Clique em **Finalizar**. A revisão abre em uma nova aba. Com **Baixar o PDF automaticamente ao finalizar** marcado, o PDF vai para os downloads do Chrome. Se quiser revisar antes do primeiro download, desmarque essa opção antes de iniciar.

O Chrome pode exibir seu indicador de compartilhamento da aba enquanto a captura estiver ativa. A extensão utiliza a imagem da aba para obter prints anteriores ao clique; não grava áudio. O vídeo exportado depois é uma apresentação dos prints salvos, com instruções e transições; não é uma filmagem contínua da navegação.

Atalhos (podem ser alterados em `chrome://extensions/shortcuts`):

- **Alt + Shift + P:** pausar ou continuar.
- **Alt + Shift + F:** finalizar.

## Revisar e exportar

- Altere o título do tutorial, a instrução de cada passo e uma observação opcional.
- Use as setas para reorganizar os passos ou **Excluir** para remover um clique desnecessário.
- Use **Ajustar círculo** e clique no print para corrigir a posição. O controle ao lado muda o tamanho.
- Use **Cobrir dados** e arraste um retângulo sobre nomes, documentos ou outros dados visíveis. **Desfazer cobertura** remove o último retângulo daquele passo.
- Clique em **Baixar PDF** para exportar novamente. O arquivo tem uma página A4 em paisagem por passo.
- Na seção **Exporte também como GIF ou vídeo**, configure o tempo, as transições e a resolução; clique em **Baixar GIF** ou **Baixar vídeo**.
- Confira a prévia ao terminar. Use **Baixar arquivo** para salvar novamente, caso tenha cancelado o download.
- Abra **Meus tutoriais** no menu da extensão para voltar a uma gravação anterior.

As mudanças são salvas automaticamente no perfil do Chrome. Arquivos já baixados não são atualizados: após editar, exporte outra vez.

## GIF e vídeo

Os dois formatos mostram o título do tutorial, o número do passo, a instrução e o print com o clique circulado em vermelho. As observações podem ser incluídas. Textos editados, ordem dos passos, ajustes do círculo e coberturas de dados são respeitados.

| Opção | Comportamento |
| --- | --- |
| Tempo por passo | De 1 a 30 segundos com o print parado; padrão de 4 segundos. |
| Transição suave | Dissolução entre as imagens, de 0,4 a 2 segundos. Soma-se ao tempo de exibição de cada passo. |
| GIF | 640 × 360, 960 × 540 ou 1280 × 720. Transições a aproximadamente 12 quadros por segundo. |
| Repetir GIF | Ativado por padrão. Em tutoriais com vários passos, também faz transição do último para o primeiro. Desmarque para reproduzir uma vez. |
| Vídeo | HD 1280 × 720 ou Full HD 1920 × 1080, a 30 quadros por segundo, sem áudio. |
| Formato automático | MP4/H.264 quando o Chrome dispõe desse codificador; caso contrário, WebM/VP9 ou VP8. É possível escolher MP4 ou WebM explicitamente. |
| Mostrar observações | Inclui as dicas escritas abaixo de cada instrução. Não altera o PDF. |

O formato de saída é 16:9. O print inteiro é ajustado à área disponível, preservando suas proporções. Textos longos ocupam mais espaço e reduzem o tamanho do print; prefira instruções curtas para facilitar a leitura.

Durante a exportação, acompanhe o progresso. **Cancelar exportação** interrompe GIFs e vídeos sem apagar o tutorial. Mantenha a aba aberta até terminar. O tempo necessário depende do computador, da quantidade de passos e da resolução. GIFs usam no máximo 256 cores por quadro, podem mostrar faixas em gradientes e normalmente são maiores que vídeos. Há uma proteção de 256 MB para o GIF; reduza a resolução ou divida tutoriais muito grandes.

A disponibilidade dos codificadores de vídeo varia com o Chrome e o sistema. Se MP4 estiver indisponível, selecione **Automático** ou **WebM**. O PDF e o GIF funcionam independentemente dos codificadores de vídeo.

## Alcance da extensão

- Registra **uma aba por tutorial**, inclusive navegações e recarregamentos dentro dela. Se um link abrir outra aba, continue o processo na aba gravada ou crie outro tutorial na nova aba.
- Os prints contêm **a área visível**, não a página inteira abaixo da rolagem. Role até o item desejado, espere a tela estabilizar e clique.
- Captura cliques principais, inclusive em elementos comuns dentro de iframes. Quadros com transformações incomuns ou iframes dentro de Shadow DOM fechado podem exigir ajuste manual do círculo.
- As instruções são extraídas dos rótulos dos elementos. Não utiliza IA nem tenta adivinhar regras do sistema. Ícones sem rótulo recebem “Clique no local destacado”; você pode corrigir na revisão.
- Texto digitado, arrastar e soltar, atalhos de teclado, opções de menus nativos e ações feitas só pelo teclado não são registrados como passos próprios. Um clique de ativação gerado pelo teclado pode ser registrado no centro do elemento. Use uma observação para explicar preenchimentos.
- Não funciona em `chrome://`, na loja de extensões, em páginas de outras extensões, em PDFs abertos no visualizador interno, na interface do Chrome ou em aplicativos fora do navegador. Esta versão também não pede acesso a arquivos `file://`.
- A captura usa imagens recentes anteriores ao clique. Animações rápidas, rolagem durante o clique e mudanças instantâneas podem produzir um print ligeiramente anterior; revise o resultado.
- Fechar o navegador, interromper o compartilhamento ou fechar a aba encerra a captura. Os passos já salvos continuam em **Meus tutoriais**. Gravações interrompidas podem aparecer como rascunhos.
- Os dados ficam no perfil local. Remover a extensão ou apagar seus dados pode apagar os tutoriais. Exporte os arquivos que deseja guardar.

## Privacidade

Não há servidor, telemetria, login, anúncios, carregamento de bibliotecas externas nem envio de prints. Os códigos JavaScript, as bibliotecas e as fontes estão incluídos na própria pasta. GIF e vídeo também são gerados no computador, sem enviar imagens a servidores.

O print mostra tudo que estiver visível na aba. Para demonstrar sistemas com dados pessoais, prefira ambiente de treinamento e dados fictícios. A extensão não lê o valor de campos para criar a instrução, mas valores visíveis ainda podem aparecer na imagem.

As coberturas são incorporadas aos pixels da imagem exportada. Os prints originais continuam no armazenamento local para permitir edição. Para apagá-los, use **Excluir tutorial**; PDFs, GIFs e vídeos já baixados permanecem no seu computador.

Permissões usadas:

| Permissão | Finalidade |
| --- | --- |
| `activeTab`, `tabCapture` | Capturar a aba que você escolhe ao iniciar. |
| `offscreen` | Manter a captura quando o menu da extensão fecha. |
| `scripting`, acesso a HTTP/HTTPS | Detectar cliques, inclusive após navegações na aba escolhida. Não grava as outras abas. |
| `storage`, `unlimitedStorage` | Guardar controles, tutoriais e prints localmente. |
| `downloads` | Baixar PDFs, GIFs e vídeos. |

## Se algo não funcionar

- **Não inicia:** recarregue a página depois de instalar e tente em um site comum. Confira se o acesso da extensão ao site está permitido. Políticas de computadores corporativos podem impedir captura ou instalação manual.
- **Faltou um passo:** confira se a gravação estava ativa e se você permaneceu na aba escolhida. Menus do navegador e interfaces nativas não enviam cliques para a página.
- **Círculo deslocado:** corrija na revisão. Após redimensionar, aplicar zoom ou rolar, espere a tela estabilizar antes do próximo clique.
- **PDF não baixou:** abra **Meus tutoriais**, escolha o tutorial e clique em **Baixar PDF**. Confira os downloads e as mensagens do Chrome.
- **GIF grande ou lento:** escolha 640 × 360 ou remova passos desnecessários. O vídeo costuma gerar arquivos menores.
- **Vídeo não foi gerado:** tente WebM e resolução HD; confira se o Chrome está atualizado. Se o computador não fornecer codificação de vídeo, PDF e GIF continuam disponíveis.
- **Falha ao guardar um passo:** a extensão tenta novamente e continua gravando. Se a falha persistir, mostra um aviso no menu e na revisão. Em caso de disco cheio, libere espaço ou exclua tutoriais antigos; cliques que não puderam ser salvos precisarão ser refeitos em outra gravação.
- **Atualizar a extensão:** substitua os arquivos dentro da mesma pasta e clique no botão de recarregar em `chrome://extensions`. Recarregue também as páginas abertas. Não remova a extensão se quiser preservar os tutoriais.

## Para desenvolvimento

Manifest V3, JavaScript nativo, IndexedDB, `pdf-lib` 1.17.1 e `@pdf-lib/fontkit` 1.1.1 (incluídas em `vendor`, licença MIT). GIF: `gifenc` 1.0.3 (MIT), em um Web Worker. Vídeo: `mediabunny` 1.61.0 (MPL-2.0) e WebCodecs do Chrome. Fontes DejaVu incluídas em `fonts` com a licença correspondente. Licenças e fonte original do Mediabunny em `vendor`. Sem etapa de compilação e sem código carregado remotamente.

- `background.js`: coordenação, estado, comandos e captura autorizada.
- `content.js`: detecção dos cliques e rótulos, coordenadas e comunicação entre quadros.
- `offscreen.js`: imagens anteriores ao clique e persistência dos passos.
- `editor.js`: revisão, coberturas, organização e download.
- `lib/pdf.js`: PDF local, uma página por passo, com ícone opcional no cabeçalho.
- `lib/pdf-icon.js`: validação e preparação local da imagem escolhida para o PDF.
- `lib/pdf-theme.js`: cores padrão, validação e contraste do texto; compartilhado pela prévia e pelo PDF.
- `lib/slides.js`: composição visual, textos, máscaras e cronologia das transições.
- `lib/media.js`: exportação de GIF/vídeo, escolha de codificador e cancelamento.
- `lib/gif-worker.js`: quantização e codificação GIF sem bloquear o editor.
- `demo/`: página com dados fictícios para teste. Sirva essa pasta por HTTP, por exemplo com `python -m http.server 8765` dentro da pasta da extensão, e abra `http://localhost:8765/demo/`.

Referências oficiais usadas na implementação:

- https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture
- https://developer.chrome.com/docs/extensions/reference/api/tabCapture
- https://developer.chrome.com/docs/extensions/reference/api/offscreen

- https://github.com/mattdesl/gifenc
- https://mediabunny.dev/guide/writing-media-files
- https://mediabunny.dev/guide/media-sources

## Validação realizada

Os testes automatizados verificaram gravação com APIs simuladas, preservação do último clique, pausa/retomada, isolamento da aba, PDF automático e manual, tutoriais antigos, novos botões, persistência das configurações e cancelamento. O banco de dados e os exportadores GIF/vídeo foram preservados. O PDF mantém o layout anterior quando nenhum ícone é escolhido. Na versão 1.1.1, foram testados atrasos de salvamento, mensagens de página sem resposta, recuperação após falhas de JPEG e armazenamento, avisos de cliques perdidos, pausa manual e finalização durante uma falha pendente.

O GIF foi produzido pelo exportador real e decodificado para conferir quadros, duração, repetição, máscaras e marcador. O vídeo foi produzido pelo exportador e pelo empacotador reais, usando codificadores de software apenas no ambiente de teste; MP4 e WebM foram decodificados e tiveram duração, resolução e taxa de quadros verificadas. Os quadros e as transições foram inspecionados visualmente.

O ambiente de desenvolvimento não permite abrir o Chrome de teste. A instalação, a captura em sites reais, a aparência da interface no navegador e os codificadores nativos do seu Chrome ainda precisam ser conferidos nele. Os codificadores de teste não são distribuídos nem necessários para usar a extensão.

Os arquivos `EXEMPLO-DE-TUTORIAL.pdf`, `.gif` e `.mp4` demonstram os três formatos com dados fictícios. O GIF e o vídeo de exemplo usam 2 segundos por passo para uma demonstração curta.

Na versão 1.2, o PDF foi gerado com e sem ícone; as três páginas de exemplo e um caso com imagem larga/transparente foram inspecionados. Os testes verificaram seleção, troca, remoção, persistência por tutorial, arquivo inválido e troca de tutorial durante o carregamento.

Na versão 1.3, os testes verificaram salvamento e restauração das quatro cores por tutorial, prévia, retorno às cores padrão, preservação do ícone e das opções de mídia e exportação após personalização. Foram gerados e inspecionados PDFs com paletas claras, escuras e pretas, além do padrão. O contraste do texto foi verificado em 256 combinações de cores. A captura sem pausas automáticas foi novamente verificada com falhas simuladas.

Versão 1.3.0 • Outubro de 2026.

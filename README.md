# Passo a Passo — Tutorial em PDF

Extensão local para o Google Chrome. Inicie, use o site normalmente e finalize: seus cliques viram passos numerados com instruções, prints e o ponto clicado circulado em vermelho.

## Instalar (Windows, macOS ou Linux)

1. Extraia o arquivo ZIP. Guarde a pasta `passo-a-passo` em um local permanente.
2. No Chrome, digite `chrome://extensions` na barra de endereços.
3. Ative **Modo do desenvolvedor**, no canto superior direito.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta `passo-a-passo` que contém o arquivo `manifest.json`. Não selecione o ZIP nem a pasta acima dela.
6. Na barra do Chrome, clique no ícone de quebra-cabeça e fixe **Passo a Passo**.

Não precisa instalar Node, executar comandos, criar uma conta nem obter chave de API para usar a extensão. Requer Chrome 116 ou mais recente em computador. A extensão é instalada manualmente; não está publicada na Chrome Web Store.

## Criar um tutorial

1. Abra o site que deseja demonstrar, em uma página `http://` ou `https://`.
2. Clique no ícone **Passo a Passo**, informe um título e escolha **Iniciar nesta aba**.
3. Aguarde o início da gravação. O número vermelho no ícone mostra os passos gravados.
4. Use o sistema normalmente. Cada clique principal gera uma instrução, como `Clique em “Nova solicitação”.`, e guarda a parte visível da página.
5. Clique novamente na extensão e use **Pausar** ou **Continuar** quando precisar. Enquanto estiver pausada, não guarda novos passos nem imagens.
6. Clique em **Finalizar**. A revisão abre em uma nova aba. Com **Baixar o PDF automaticamente ao finalizar** marcado, o PDF vai para os downloads do Chrome. Se quiser revisar antes do primeiro download, desmarque essa opção antes de iniciar.

O Chrome pode exibir seu indicador de compartilhamento da aba enquanto a captura estiver ativa. A extensão utiliza a imagem da aba para obter prints anteriores ao clique; não grava áudio nem salva um vídeo.

Atalhos (podem ser alterados em `chrome://extensions/shortcuts`):

- **Alt + Shift + P:** pausar ou continuar.
- **Alt + Shift + F:** finalizar.

## Revisar e exportar

- Altere o título do tutorial, a instrução de cada passo e uma observação opcional.
- Use as setas para reorganizar os passos ou **Excluir** para remover um clique desnecessário.
- Use **Ajustar círculo** e clique no print para corrigir a posição. O controle ao lado muda o tamanho.
- Use **Cobrir dados** e arraste um retângulo sobre nomes, documentos ou outros dados visíveis. **Desfazer cobertura** remove o último retângulo daquele passo.
- Clique em **Baixar PDF** para exportar novamente. O arquivo tem uma página A4 em paisagem por passo.
- Abra **Meus tutoriais** no menu da extensão para voltar a uma gravação anterior.

As mudanças são salvas automaticamente no perfil do Chrome. Uma cópia do PDF já baixada não é atualizada: após editar, exporte outra vez.

## Alcance da primeira versão

- Registra **uma aba por tutorial**, inclusive navegações e recarregamentos dentro dela. Se um link abrir outra aba, continue o processo na aba gravada ou crie outro tutorial na nova aba.
- Os prints contêm **a área visível**, não a página inteira abaixo da rolagem. Role até o item desejado, espere a tela estabilizar e clique.
- Captura cliques principais, inclusive em elementos comuns dentro de iframes. Quadros com transformações incomuns ou iframes dentro de Shadow DOM fechado podem exigir ajuste manual do círculo.
- As instruções são extraídas dos rótulos dos elementos. Não utiliza IA nem tenta adivinhar regras do sistema. Ícones sem rótulo recebem “Clique no local destacado”; você pode corrigir na revisão.
- Texto digitado, arrastar e soltar, atalhos de teclado, opções de menus nativos e ações feitas só pelo teclado não são registrados como passos próprios. Um clique de ativação gerado pelo teclado pode ser registrado no centro do elemento. Use uma observação para explicar preenchimentos.
- Não funciona em `chrome://`, na loja de extensões, em páginas de outras extensões, em PDFs abertos no visualizador interno, na interface do Chrome ou em aplicativos fora do navegador. Esta versão também não pede acesso a arquivos `file://`.
- A captura usa imagens recentes anteriores ao clique. Animações rápidas, rolagem durante o clique e mudanças instantâneas podem produzir um print ligeiramente anterior; revise o resultado.
- Fechar o navegador, interromper o compartilhamento ou fechar a aba encerra a captura. Os passos já salvos continuam em **Meus tutoriais**. Gravações interrompidas podem aparecer como rascunhos.
- Os dados ficam no perfil local. Remover a extensão ou apagar seus dados pode apagar os tutoriais. Exporte os PDFs que deseja guardar.

## Privacidade

Não há servidor, telemetria, login, anúncios, carregamento de bibliotecas externas nem envio de prints. Os códigos JavaScript e a biblioteca de PDF estão incluídos na própria pasta.

O print mostra tudo que estiver visível na aba. Para demonstrar sistemas com dados pessoais, prefira ambiente de treinamento e dados fictícios. A extensão não lê o valor de campos para criar a instrução, mas valores visíveis ainda podem aparecer na imagem.

As coberturas são incorporadas aos pixels da imagem exportada. Os prints originais continuam no armazenamento local para permitir edição. Para apagá-los, use **Excluir tutorial**; PDFs já baixados permanecem no seu computador.

Permissões usadas:

| Permissão | Finalidade |
| --- | --- |
| `activeTab`, `tabCapture` | Capturar a aba que você escolhe ao iniciar. |
| `offscreen` | Manter a captura quando o menu da extensão fecha. |
| `scripting`, acesso a HTTP/HTTPS | Detectar cliques, inclusive após navegações na aba escolhida. Não grava as outras abas. |
| `storage`, `unlimitedStorage` | Guardar controles, tutoriais e prints localmente. |
| `downloads` | Baixar o PDF ao finalizar. |

## Se algo não funcionar

- **Não inicia:** recarregue a página depois de instalar e tente em um site comum. Confira se o acesso da extensão ao site está permitido. Políticas de computadores corporativos podem impedir captura ou instalação manual.
- **Faltou um passo:** confira se a gravação estava ativa e se você permaneceu na aba escolhida. Menus do navegador e interfaces nativas não enviam cliques para a página.
- **Círculo deslocado:** corrija na revisão. Após redimensionar, aplicar zoom ou rolar, espere a tela estabilizar antes do próximo clique.
- **PDF não baixou:** abra **Meus tutoriais**, escolha o tutorial e clique em **Baixar PDF**. Confira os downloads e as mensagens do Chrome.
- **Falha ao guardar um passo:** a gravação pausa e exibe uma mensagem. Libere espaço no computador ou exclua tutoriais antigos antes de continuar.
- **Atualizar a extensão:** substitua os arquivos dentro da mesma pasta e clique no botão de recarregar em `chrome://extensions`. Recarregue também as páginas abertas. Não remova a extensão se quiser preservar os tutoriais.

## Para desenvolvimento

Manifest V3, JavaScript nativo, IndexedDB, `pdf-lib` 1.17.1 e `@pdf-lib/fontkit` 1.1.1 (incluídas em `vendor`, licença MIT). Fontes DejaVu incluídas em `fonts` com a licença correspondente. Sem etapa de compilação.

- `background.js`: coordenação, estado, comandos e captura autorizada.
- `content.js`: detecção dos cliques e rótulos, coordenadas e comunicação entre quadros.
- `offscreen.js`: imagens anteriores ao clique e persistência dos passos.
- `editor.js`: revisão, coberturas, organização e download.
- `lib/pdf.js`: PDF local, uma página por passo.
- `demo/`: página com dados fictícios para teste. Sirva essa pasta por HTTP, por exemplo com `python -m http.server 8765` dentro da pasta da extensão, e abra `http://localhost:8765/demo/`.

Referências oficiais usadas na implementação:

- https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture
- https://developer.chrome.com/docs/extensions/reference/api/tabCapture
- https://developer.chrome.com/docs/extensions/reference/api/offscreen

 Versão 1.0.0 • Setembro de 2026.

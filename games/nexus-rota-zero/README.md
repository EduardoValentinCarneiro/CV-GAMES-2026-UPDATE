# NEXUS: Rota Zero

Uma aventura sci-fi interativa em HTML, CSS e JavaScript puro. O jogador escolhe um apelido, atravessa uma campanha ramificada e chega a finais diferentes conforme suas decisões, desempenho e veículo.

## O que existe nesta versão

- Apelido personalizado usado nos diálogos e finais.
- 10 capítulos, 47 cenas, três novos desvios narrativos e 7 finais colecionáveis.
- Rotas diferentes pela ponte, túnel, interior, resistência e subsolo.
- 4 caminhões com bônus reais de velocidade, força, blindagem e resgate.
- 9 minigames: puxar, carregar/equilibrar, mirar, memorizar sequências, religar circuitos, dirigir, extrair palavras-chave, virar fichas de memória e criar uma chave segura.
- Três novas rotas opcionais inspiradas no extrator de palavras-chave, no jogo de flashcards e no gerador de senhas.
- Jumpscares mais longos, alertas-surpresa personalizados, explosões, fogo, impacto, glitch, partículas e sons gerados no navegador.
- 4 mortes antecipadas exclusivas: escolhas perigosas e falhas críticas podem encerrar a rota antes do núcleo.
- Vida, energia, sucata, confiança, resgates, requisitos e consequências.
- Três dificuldades.
- Salvamento automático e botão **Continuar partida**.
- Conquistas e finais persistidos no navegador.
- Controles por mouse, toque e teclado.
- Modo sem som e redução de efeitos/movimento.
- Layout responsivo para computador e celular.

## Como jogar

Abra o arquivo index.html em um navegador moderno. Para uma prévia local mais confiável, sirva esta pasta com qualquer servidor HTTP estático.

1. Digite um apelido, como **educvv**.
2. Escolha a dificuldade.
3. Clique em **Iniciar transmissão**.
4. Use os cartões numerados para decidir a rota.
5. Em cada minigame, leia a instrução e clique em **Começar desafio**.

Atalhos:

- 1 a 9: escolher uma opção disponível.
- Espaço ou Enter: revelar todo o texto.
- A/D ou ←/→: puxar e dirigir.
- Espaço: segurar uma carga.
- Esc: fechar janelas.

## Arquivos principais

- index.html: telas, HUD, menus e acessibilidade.
- style.css: identidade visual, responsividade e efeitos.
- script.js: história, estado, save, áudio, minigames e validação do grafo.
- img/nexus-hero-v2.png: arte cinematográfica da campanha.
- img/nexus-hunter-v2.png: arte do caçador e jumpscares.

O jogo não usa bibliotecas externas, build ou conexão com servidor. O progresso fica no armazenamento local do navegador.

## Validação rápida

Se o Node.js estiver instalado, execute **node smoke-test.js** nesta pasta. O teste verifica destinos de cenas, alertas, mortes antecipadas, rotas alcançáveis, caminhões, minigames e finais.

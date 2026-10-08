# ChessLens Desktop

Aplicativo desktop para análise e treino de xadrez com Stockfish, acompanhado por um conector para Microsoft Edge e Google Chrome.

## Recursos

- Tabuleiro interativo e análise MultiPV.
- Importação de posições FEN.
- Auto Detect para Chess.com e Lichess.
- Auto Corrigir e proteção de jogadas.
- Auto Jogar e modo de emergência configuráveis.
- Modo Legítimo de treino baseado em precisão-alvo.
- Atualização integrada do Stockfish pelo repositório oficial.
- Processamento local, sem envio das posições para servidores externos.

## Requisitos

- Windows 10 ou 11, 64 bits.
- Node.js 20 ou mais recente para compilar.
- Stockfish disponível pelo `PATH`, pela variável `STOCKFISH_PATH` ou em `%USERPROFILE%\Apps\Stockfish\stockfish\stockfish.exe`.

## Desenvolvimento

```powershell
npm ci
npm run check
npm start
```

## Compilar o executável portátil

```powershell
npm ci
npm run dist
```

O arquivo será criado em `dist/ChessLens 1.8.0.exe`.

## Instalar o conector

1. Abra `edge://extensions` ou `chrome://extensions`.
2. Ative o modo do desenvolvedor.
3. Clique em **Carregar sem compactação**.
4. Selecione a pasta `chrome-connector`.
5. Abra o ChessLens e ative o Auto Detect.

## Atualizar o Stockfish

Use **Atualizar engine** na parte inferior do ChessLens. O aplicativo consulta a versão mais recente em `official-stockfish/Stockfish`, baixa o pacote universal para Windows e salva a engine escolhida nas configurações do usuário.

Também é possível selecionar manualmente outro executável Stockfish.

## Publicar pelo GitHub Desktop

1. Abra o GitHub Desktop.
2. Use **File > Add local repository** e selecione esta pasta.
3. Confira o commit inicial.
4. Clique em **Publish repository**.
5. Escolha o nome, descrição e se o repositório será público ou privado.

Ao enviar uma tag como `v1.8.0`, o workflow do GitHub Actions compila o executável portátil e disponibiliza o conector como artefato.

## Estrutura

- `main.js`: processo principal, servidor local e comunicação com Stockfish.
- `renderer.js`: tabuleiro, interface e regras dos modos.
- `chrome-connector/`: integração com páginas de xadrez.
- `.github/workflows/build.yml`: compilação automática para Windows.

## Licenças

O código do ChessLens é disponibilizado sob licença MIT. Stockfish é um projeto independente distribuído sob GPLv3 e não está incluído neste repositório.

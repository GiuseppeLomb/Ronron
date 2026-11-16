# Créditos e licenças

Tudo o que a app usa e não foi feito no projeto, com origem e licença.

## Sons
| Ficheiro na app | Origem | Autor | Licença |
|---|---|---|---|
| `app/public/sons/ronron-curto.ogg` (0,6 s), `ronron-medio.ogg` (1,65 s), `ronron-longo.ogg` (3,2 s) | BigSoundBank n.º 0436, "Cat purr" (bigsoundbank.com) | Joseph Sardin | CC0 1.0 (domínio público) |
| `app/public/sons/ronron-repouso.ogg` (loop de 6,5 s) | BigSoundBank n.º 0981, "Cat purring 2" (bigsoundbank.com) | Joseph Sardin | CC0 1.0 (domínio público) |

Tratamento feito no projeto (ffmpeg): filtro passa-alto 45 Hz e passa-baixo 7 kHz, redução de ruído (afftdn), normalização a −20 LUFS para os dois sons ficarem com o mesmo volume, cortes com fade de entrada e saída, loop com cruzamento de 1,5 s em potência constante, Opus mono 32–40 kbps. Total: 52 KB.

## Letras
- Instrument Serif e Albert Sans: SIL Open Font License 1.1, incluídas na app através do Fontsource (sem pedidos ao Google Fonts).

## Ícones
- Phosphor Icons (peso regular): licença MIT.

## Bibliotecas
- Capacitor e plugins oficiais (app, camera, haptics, local-notifications, network, share, splash-screen, status-bar): MIT.
- @capgo/capacitor-social-login (login Google nativo): MPL-2.0.
- Motion (animações): MIT.
- @supabase/supabase-js: MIT.

## Imagens de teste
- Fotografias dos gatos de teste no Staging: Wikimedia Commons, CC0. Não fazem parte da app publicada.

## Mascote
- O Ronron foi desenhado de raiz para este projeto.

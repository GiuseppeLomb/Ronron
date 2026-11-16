# Créditos e licenças

Tudo o que a app usa e não foi feito no projeto, com origem e licença.

## Sons
| Ficheiro na app | Origem | Autor | Licença |
|---|---|---|---|
| `app/public/sons/ronron-curto.flac` (0,6 s), `ronron-medio.flac` (1,65 s), `ronron-longo.flac` (3,2 s), `ronron-abrir.flac` (1,5 s) | BigSoundBank n.º 0436, "Cat purr" (bigsoundbank.com) | Joseph Sardin | CC0 1.0 (domínio público) |
| `app/public/sons/ronron-repouso.flac` (loop de 6,5 s) | BigSoundBank n.º 0981, "Cat purring 2" (bigsoundbank.com) | Joseph Sardin | CC0 1.0 (domínio público) |
| `app/public/sons/ronron-bip.ogg` (1 kHz, só diagnóstico, temporário) | gerado no projeto | — | — |

Cadeia limpa (script `docs/sons-processar.py`, ffmpeg + numpy), sem saturação nem harmónicos artificiais: redução de ruído leve; EQ suave para altifalante (passa-alto 60 Hz, -3 dB abaixo de 110 Hz, +2,5 dB a 500 Hz, +3 dB a 1,8 kHz, passa-baixo 9 kHz); compressão moderada (2:1... 3:1, ataque 3 ms); cortes com fade; limitador lento só nos pulsos mais fortes (máx. 3,4 dB); FLAC 16 bits (sem perdas). Valores finais: curto -16,2 LUFS, médio -16,5, longo -16,6, abrir -17,0, repouso -16,3; pico real -1,3 dBTP em todos; zero amostras em clipping; resíduo não linear -31 a -37 dB; energia acima de 4 kHz igual à do original (sem distorção). Total: 584 KB.

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

### Versões para altifalante (`-a1`, `-a2`) e bip
Script: `docs/sons-processar-altifalante.py`. O ritmo real do ronronar (pulsação ~25 Hz e respiração, tirados do grave do som original) é aplicado a uma textura entre 200 Hz e 2 kHz (a1: sopro com formantes; a2: um pulso ressonante a 450/900/1500 Hz por batida), misturada com o original, com saturação suave e compressão, normalizada a cerca de -10,5 LUFS com pico real até -1 dBTP. Na banda acima de 500 Hz (a que o altifalante dá bem) ficam 9 a 12 dB mais fortes do que a versão anterior. `ronron-bip.ogg`: 1 kHz, 0,5 s, -3 dBFS, gerado no projeto, só para diagnóstico.

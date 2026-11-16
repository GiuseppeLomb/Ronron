# Créditos e licenças

Tudo o que a app usa e não foi feito no projeto, com origem e licença.

## Sons
| Ficheiro na app | Origem | Autor | Licença |
|---|---|---|---|
| `app/public/sons/ronron-curto.ogg` (0,6 s), `ronron-medio.ogg` (1,65 s), `ronron-longo.ogg` (3,2 s), `ronron-abrir.ogg` (3,1 s) | BigSoundBank n.º 0436, "Cat purr" (bigsoundbank.com) | Joseph Sardin | CC0 1.0 (domínio público) |
| `app/public/sons/ronron-repouso.ogg` (loop de 6,5 s) | BigSoundBank n.º 0981, "Cat purring 2" (bigsoundbank.com) | Joseph Sardin | CC0 1.0 (domínio público) |

Tratamento feito no projeto para altifalante de telemóvel (script em `docs/sons-processar.py`, ffmpeg + numpy): redução de ruído; harmónicos do grave por saturação suave com assimetria (o altifalante não reproduz 25-50 Hz, os harmónicos fazem o cérebro "ouvir" o grave); realce 150 Hz-3 kHz; compressão; reposição da respiração original; cortes com fade; normalização a -12 LUFS com pico real até -1 dBTP; Ogg Vorbis mono 48 kHz. Valores finais: curto -11,9 LUFS / -1,6 dBTP; médio -12,3 / -1,6; longo -12,3 / -1,4; abrir -12,2 / -1,2; repouso -12,3 / -1,4. Total: 141 KB.

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

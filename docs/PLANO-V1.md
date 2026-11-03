# Ronron — Plano 0.9 → 1.0 (web) → 1.1 (Google Play)

Versão do documento: 3 nov 2026. Baseado na leitura do repositório (`index.html`, `supabase/setup.sql`, workflow), na base de dados em produção (projeto `ylsspcbznrtcvdcfozov`, org "Ronron APP", plano Free) e nos advisors do Supabase.

---

## 1. Auditoria

Gravidade: **Crítica** (bloqueia o lançamento ou expõe dados pessoais) · **Alta** (abuso fácil ou perda de dados) · **Média** (qualidade/risco moderado) · **Baixa**.

### 1.1 Descobertas novas (não estavam na tua lista)

| # | Gravidade | Problema | Correção |
|---|---|---|---|
| N1 | **Crítica** | **Qualquer utilizador com sessão pode descarregar os contactos de TODOS os utilizadores** (email e WhatsApp, incluindo adotantes). A policy `contactos para utilizadores com sessao` é `using (true)`. Basta `select * from profile_contacts`. Violação RGPD. | Retirar o `select` direto. Criar RPC `revelar_contacto(animal_id)` (security definer) que só devolve o contacto do dono de um anúncio aprovado, com limite diário por utilizador e registo em `contact_reveals` (que depois alimenta as notificações da 0.96). Não guardar o email dos adotantes em `profile_contacts`. |
| N2 | **Crítica** | **O registo não funciona para o público.** O SMTP incluído no Supabase só envia para membros da equipa da organização e tem limite baixo por hora (confirmado na documentação: "It sends only to the email addresses of your organization's team members"). Com a confirmação de email ativa, ninguém de fora consegue confirmar a conta. | Configurar SMTP próprio (ver decisão D1). |
| N3 | **Alta** | **Abuso de Storage:** qualquer conta (mesmo adotante) pode carregar ficheiros de 20 MB sem limite para a sua pasta. O plano Free tem 1 GB no total. Um utilizador enche o bucket numa tarde. | Policy de upload só para protetores, caminho `uid/animal_id/...` com `animal_id` do próprio, quota por utilizador (contagem em `storage.objects`), tipos e tamanhos por categoria (imagens ≤ 3 MB após redução, vídeo ≤ 10 MB). |
| N4 | **Alta** | **Editar depois de aprovado não volta à moderação.** Um protetor aprovado pode trocar fotos e texto por um anúncio de venda/burla. | Trigger: alterações a fotos, nome, descrição ou localização repõem `approved=false` (ou estado "alterações pendentes", mantendo a versão aprovada visível). |
| N5 | **Alta** | Sem limites de tamanho/formato na BD (`description`, `reason`, `personality`… aceitam megabytes pela API; `age_months`, `lat/lng` sem validação). O `maxlength` só existe no HTML. | `CHECK` constraints em todas as colunas de texto e numéricas. |
| N6 | **Alta** | Admin definido por email fixo e atribuído **no momento do registo, antes da confirmação do email**. | Tabela `admins` (ou `is_admin` só alterável pelo `postgres`), sem email no código. Atribuição manual por SQL. |
| N7 | **Alta** | Sem CAPTCHA no registo/login/denúncia: contas falsas e spam automatizados. | Cloudflare Turnstile (grátis, integração nativa no Supabase Auth). |
| N8 | Média | Permissões de tabela por omissão: `anon` e `authenticated` têm `TRUNCATE`, `DELETE`, `UPDATE`, `INSERT` em todas as tabelas. O RLS protege as linhas e o PostgREST não expõe `TRUNCATE`, mas não há defesa em profundidade. | `revoke all` + `grant` mínimo por tabela. |
| N9 | Média | `profiles` é legível por todos, incluindo `is_admin`, distrito e cidade de adotantes. | Vista `perfis_publicos` só com `display_name` de quem tem anúncios. |
| N10 | Média | `animal_photos.path` não é validado: um dono pode apontar para ficheiros de outro utilizador. | Check `path like owner_id || '/' || animal_id || '/%'`. |
| N11 | Média | Denúncias ilimitadas e repetidas (mesmo utilizador, mesmo anúncio). | `unique (reporter_id, animal_id)` + limite diário. |
| N12 | Média | `supabase-js` carregado do jsDelivr sem SRI; Google Fonts carregadas de servidores Google (problema RGPD conhecido na UE); handlers `onclick` inline impedem uma CSP. | Tudo empacotado no build; fontes alojadas no site; CSP por `<meta>`. |
| N13 | Média | Performance RLS: 11 policies reavaliam `auth.uid()` por linha; 4 FKs sem índice; 2 tabelas com policies permissivas duplicadas (advisors). | `(select auth.uid())`, índices, policies fundidas. |
| N14 | Média | Erros ignorados: `delCat`, `resolveRep`, `becomeProtetor`, `swipes.upsert` não verificam erros. | Tratamento de erros uniforme com mensagem ao utilizador. |
| N15 | Média | No primeiro acesso a app abre a página de Ajuda em vez do feed (perde o efeito "wow" e conversões). | Onboarding curto sobreposto ao feed. |
| N16 | Média | Sem "desfazer" o último swipe (frustrante no telemóvel). | Botão desfazer (1 nível). |
| N17 | Média | Não há campo para **microchip/registo SIAC** — em Portugal é obrigatório para gatos (DL 82/2019). É um sinal de confiança forte. | Campos "microchip" e "vacinado" na ficha. Confirmar requisitos legais de cedência com uma associação. |
| N18 | Baixa | `is_admin()` exposta como RPC a `anon` (advisor). Só devolve o próprio estado, mas não precisa de estar exposta. | Mover para schema privado. |
| N19 | Baixa | "Leaked password protection" desativada — só existe nos planos pagos. | Mínimo 10 caracteres + verificação de força no cliente. |
| N20 | Baixa | `enum species` tem `cao`, mas a tabela proíbe — lixo de esquema. | Limpar. |

### 1.2 A tua lista, confirmada/corrigida

| # | Gravidade | Estado |
|---|---|---|
| 1 Ficheiro único, sem build/testes | Média | Confirmado. |
| 2 Emojis como ícones | Média (marca) | Confirmado: tabs, favicon, estados vazios, toasts, botões, mensagem de WhatsApp. |
| 3 `prompt()`/`confirm()` | Média | Confirmado em denunciar, ser protetor e apagar. |
| 4 Só telemóvel (520 px) | Média | Confirmado. |
| 5 500 gatos filtrados no browser; distância por centro do distrito | Média → Alta com escala | Confirmado. Também: a lista de swipes do utilizador é lida inteira (limite de 1000 linhas do PostgREST faz falhar silenciosamente acima disso). |
| 6 "Já vistos" anónimos só em `localStorage` | Baixa | Confirmado. Aceitável; migrar para o servidor ao criar conta. |
| 7 HEIC e vídeos | Alta | Confirmado. Vídeos de 20 MB sem compressão esgotam o 1 GB com ~50 vídeos. |
| 8 Ficheiros órfãos; fotos não atómicas | Alta | Confirmado. Apagar anúncio (dono ou admin) nunca apaga do Storage; se o `insert` das fotos falhar depois do `delete`, o anúncio fica sem fotos. |
| 9 Recuperar palavra-passe, editar perfil, apagar conta, RGPD, cookies | Crítica para lançamento (RGPD/Play) | Confirmado. Cookies: só há armazenamento estritamente necessário (sessão e preferências), que **não exige banner de consentimento**; basta informar na política. Se um dia houver analytics, exige consentimento ou solução sem identificadores. |
| 10 Sem notificação ao protetor | Média | Confirmado. |
| 11 Sem anti-spam | Alta | Confirmado (ver N3, N7, N11). |
| 12 Admin por email fixo | Alta | Confirmado e agravado (N6). |
| 13 Não é PWA, sem SEO/OG/links por gato | Média | Confirmado. Não há nenhum URL por gato nem por ecrã (tudo em memória). |
| 14 Pausa do Supabase | — | **Workflow confirmado a funcionar:** corri-o manualmente a 3 nov 02:05 UTC, terminou com sucesso. O primeiro agendamento automático será a 4 nov 04:17 UTC. Limites Free (doc. Supabase): 500 MB BD, 1 GB Storage, 5 GB egress/mês, 50 000 MAU, 2 projetos ativos, pausa após 7 dias sem atividade, sem backups diários, sem transformação de imagens (é paga — por isso miniaturas têm de ser geradas no cliente). Confirma os números no painel "Usage", porque mudam. |
| 15 Acessibilidade | Alta (Play/UE) | Confirmado: botão "i" sem nome acessível, itens de lista como `div` clicáveis sem teclado, sem foco visível, sem `prefers-reduced-motion`, sem alternativa ao arrastar. |

### 1.3 O que está bem e mantemos
RLS ativo em todas as tabelas; `esc()` aplicado de forma consistente (não encontrei XSS); triggers que impedem auto-aprovação; região UE (Frankfurt); contacto só com sessão; aviso anti-burla; política "adoção gratuita".

---

## 2. Decisões que preciso de ti

| | Decisão | Recomendação |
|---|---|---|
| **D1** | **Domínio próprio** (ex.: `ronron.pt`, ~10–20 €/ano). É o único custo que recomendo. | **Sim, antes da 0.97.** Resolve de uma vez: emails transacionais com o teu domínio (Resend grátis: 3000/mês exige domínio verificado), marca profissional, TWA simples. Mudar de origem mais tarde faz perder sessões, `localStorage` e obriga a refazer a verificação da app Android. Alternativa custo zero: Brevo (300 emails/dia grátis) com remetente Gmail — funciona, mas com risco de spam; e para a TWA usar o repositório `GiuseppeLomb/giuseppelomb.github.io` para servir `/.well-known/assetlinks.json` na raiz (o subcaminho `/Ronron/` sozinho **não chega**: a verificação é feita na raiz da origem). |
| **D2** | Email do projeto | Criar um Gmail dedicado (ex.: `ronron.app@…`) para remetente, Play Console de contacto e suporte, em vez do teu pessoal. |
| **D3** | Direção visual | Escolher entre A, B ou C (secção 4). |
| **D4** | Projeto Supabase de testes | Criar "Ronron Staging" na mesma org (o Free permite 2 projetos ativos). Testes e migrações correm lá primeiro. |
| **D5** | Idade mínima | 18 anos (adoção implica responsabilidade legal; evita a política "Famílias" da Play). |

---

## 3. Arquitetura V1.0

### 3.1 Framework: **SvelteKit (adapter-static) + Vite + TypeScript**

| Opção | Prós | Contras |
|---|---|---|
| Manter vanilla | Zero build | Não escala, sem componentes, sem testes, sem rotas reais, sem pré-renderização de páginas por gato. |
| Vite + Preact | Pequeno (~4 KB), ecossistema React | Rotas, pré-renderização e PWA a montar à mão. |
| Vite + Lit | Web components standard | Verboso para uma app com muita UI e animação. |
| **SvelteKit estático** | Gera HTML estático (perfeito para GitHub Pages, custo zero); rotas reais com `base: '/Ronron'`; **pré-renderiza uma página por gato com Open Graph** no build; transições/animações nativas (swipe, microinterações); avisos de acessibilidade no compilador; runtime mínimo. | Curva de aprendizagem ligeira (para mim é indiferente). |

**Escolha: SvelteKit estático.** Peças open-source (todas MIT/ISC/Apache/MPL/OFL — licenças comerciais OK):
- `@sveltejs/adapter-static` (MIT) — saída estática + `404.html` como fallback.
- `@vite-pwa/sveltekit` (MIT, Workbox) — service worker, manifest, offline.
- `@supabase/supabase-js` (MIT) — empacotado, sem CDN.
- Ícones: **Phosphor** (MIT) — 6 pesos (incl. duotone) para acompanhar a tipografia, tem `cat`, `paw-print`, `heart`, etc. Alternativas válidas: Lucide (ISC), Tabler (MIT).
- Fontes: **Fontsource** (pacotes npm de fontes OFL, alojadas no próprio site, subconjunto latin + latin-ext).
- HEIC: `heic-to` (wrapper MIT sobre libheif, LGPL — uso dinâmico, carregado só quando o ficheiro é HEIC).
- Vídeo: **Mediabunny** (MPL-2.0) com WebCodecs — recodifica para 720p/H.264 no browser, sem ffmpeg.wasm (30 MB). Fallback: limite de duração/tamanho.
- Imagens OG por gato: **Satori** + **resvg-js** (MPL-2.0) no build.
- Distância: lista de concelhos com coordenadas (CAOP da DGT, licença aberta) + função SQL de distância (`earthdistance`/PostGIS, ambos disponíveis no Free).
- CAPTCHA: Cloudflare Turnstile (grátis).
- Email: Resend ou Brevo (ver D1) via Supabase Edge Function.

### 3.2 Pastas

```
/
├─ app/                      SvelteKit
│  ├─ src/
│  │  ├─ lib/
│  │  │  ├─ design/          tokens.css, fontes, ícones, motion
│  │  │  ├─ components/      Button, IconButton, Chip, Input, Select, Toggle,
│  │  │  │                   Sheet, Dialog, Toast, Tabs, SwipeCard, Deck,
│  │  │  │                   Gallery, CatFacts, PhotoUploader, EmptyState…
│  │  │  ├─ features/        feed/, cat/, auth/, protetor/, admin/
│  │  │  ├─ api/             cliente Supabase + funções tipadas
│  │  │  └─ media/           redução de imagem, HEIC, vídeo
│  │  └─ routes/             /, /gato/[id], /favoritos, /meus, /meus/novo,
│  │                         /conta, /admin, /ajuda, /privacidade, /termos
│  ├─ static/                ícones, og, .well-known (se domínio próprio)
│  └─ tests/                 unit (Vitest) + e2e (Playwright)
├─ supabase/
│  ├─ migrations/            uma migração por mudança (versionada)
│  ├─ functions/             Edge Functions (notificar, apagar-conta)
│  └─ tests/                 pgTAP: testes de RLS
├─ brand/                    logo SVG (todas as versões), guia de marca
├─ android/                  projeto TWA (1.1)
├─ docs/
└─ .github/workflows/        ci.yml, deploy.yml, manter-ativo.yml, rebuild.yml
```

### 3.3 Design system (tokens)
CSS custom properties geradas de um único `tokens.json` (formato W3C Design Tokens; gerado com **Style Dictionary**, Apache-2.0):
- Cor: primitivas (escalas 50–950) → semânticas (`--surface`, `--surface-raised`, `--text`, `--text-muted`, `--accent`, `--accent-contrast`, `--positive`, `--negative`, `--focus-ring`), tema claro/escuro.
- Tipografia: escala fluida com `clamp()` (display, título, corpo, legenda), pesos, alturas de linha.
- Espaço: base 4 px (4, 8, 12, 16, 24, 32, 48, 64).
- Raios: 6 / 12 / 20 / 28 / pill.
- Sombras: 3 níveis + sombra colorida para o cartão.
- Movimento: durações (120/200/320 ms), curvas (`standard`, `emphasized`, `spring`), tudo desligado com `prefers-reduced-motion`.
- Contraste: todas as combinações texto/fundo verificadas WCAG AA num teste automático.

### 3.4 Testes
- **Vitest**: utilitários (idade, distância, redução de imagem).
- **pgTAP** (Supabase CLI, em CI com Docker): testes de RLS — "adotante não lê contactos", "protetor não aprova", "anónimo não escreve", etc. É a rede de segurança mais importante.
- **Playwright** em 3 perfis: Pixel 7 (telemóvel), iPad Mini (tablet), 1440×900 (PC) + WebKit para Safari.
- **axe-core/playwright**: zero violações graves de acessibilidade em cada ecrã.
- **Lighthouse CI**: orçamento de performance (LCP < 2,5 s em 4G simulado) e PWA instalável.

### 3.5 Deploy (GitHub Actions)
- `ci.yml` — em cada push/PR: lint, tipos, unit, pgTAP, build, e2e, axe, Lighthouse.
- `deploy.yml` — em `main`: build → `actions/deploy-pages`. O site continua em `https://giuseppelomb.github.io/Ronron/`, público e sem login.
- `rebuild.yml` — de hora a hora (e a pedido via `repository_dispatch` quando um gato é aprovado): regenera páginas estáticas por gato e imagens OG. Repositório público ⇒ minutos de Actions ilimitados.
- Migrações: aplicadas primeiro no Staging, depois em produção (eu aplico via conector Supabase; ficam versionadas em `supabase/migrations`).

---

## 4. Redesign

### 4.1 Três direções (escolhe uma)

**A — "Editorial quente"**
Moodboard: revista de interiores, papel creme, fotografia grande e honesta, tipografia serifada com personalidade. Paleta: creme `#F7F1E8`, terracota `#C4532D`, azeitona `#5B6B3A`, tinta `#1F1A17`. Tipos: **Fraunces** (display, OFL) + **Instrument Sans** (texto, OFL). Raios médios, sombras suaves, movimento lento e elegante. Sente-se: confiável, adulto, "marca de causa" premium.
Logo: monograma "R" serifado cuja curva interior desenha uma orelha e o perfil de um gato enrolado.

**B — "Azulejo moderno"**
Moodboard: azulejo português reinterpretado em geometria limpa, sinalética, cerâmica. Paleta: azul cobalto `#1F3FA8`, branco cal `#FAFAF7`, ocre `#E3A33B`, carvão `#16181D`. Tipos: **Bricolage Grotesque** (display, OFL) + **Inter** (texto, OFL). Padrões geométricos (derivados de um módulo de azulejo desenhado por nós) nos estados vazios e no ecrã de abertura. Identidade claramente portuguesa e memorável.
Logo: módulo quadrado de azulejo onde dois triângulos formam orelhas e um arco forma o "ronron" (ondas de som).

**C — "Noite felina"**
Moodboard: apps de consumo premium, escuro por defeito, profundidade com camadas translúcidas, fotos que "brilham". Paleta: quase-preto beringela `#14101A`, coral quente `#FF6B4A`, lilás `#B9A7FF`, branco quente. Tipos: **Plus Jakarta Sans** (OFL) em duas larguras. Movimento com mola, microinterações ricas.
Logo: cabeça de gato minimalista feita de duas orelhas e uma única linha ondulada (o ronronar), funciona como glifo a 16 px.

Para cada direção entrego: mockup do ecrã de feed (telemóvel + PC), paleta, pares tipográficos e esboço do símbolo. Posso fazê-los já, em paralelo com a 0.91.

### 4.2 Entregáveis de marca (0.92)
Logo em SVG: símbolo, logótipo, horizontal e empilhado; versões cor, claro/escuro, monocromática; teste a 16, 32, 48 px; favicon SVG + PNG; ícone de app (com versão *maskable* e ícone adaptativo Android com fundo/primeiro plano/monocromático); imagem OG 1200×630; guia de marca em `brand/README.md`.

### 4.3 Imagens
- Ilustrações originais em SVG desenhadas por mim (estados vazios, onboarding, erros), no estilo da direção escolhida.
- Fotografia: gatos reais dos protetores beta **com autorização escrita para uso promocional** (formulário simples). Recurso de banco só **CC0** (Openverse/Wikimedia filtrado por CC0). Unsplash/Pexels evitados (licenças próprias, não CC0).

---

## 5. Plano responsivo

Breakpoints: **compacto** < 640 px · **médio** 640–1023 px · **largo** 1024–1439 px · **muito largo** ≥ 1440 px.

| Ecrã | Telemóvel | Tablet | PC |
|---|---|---|---|
| Navegação | Barra inferior (4 itens) | Barra inferior (retrato) / *rail* lateral (paisagem) | *Rail* lateral fixo com logótipo e conta |
| Feed | Cartão de ecrã inteiro, botões por baixo, ficha em *sheet* de baixo para cima | Retrato: cartão centrado ≤ 480 px. Paisagem: cartão + ficha lado a lado | Cartão ao centro, **ficha do gato atual sempre visível à direita**, filtros como painel à esquerda |
| Ficha do gato | *Sheet* + página própria `/gato/:id` | Painel lateral | Painel lateral; página própria com galeria grande |
| Favoritos | Lista | Grelha 2–3 col. | Grelha 4 col. com filtros (disponível/reservado/adotado) |
| Os meus gatos / publicar | Formulário em passos (fotos → básico → saúde → feitio → local) | Igual, 2 col. | 2 col.: formulário + **pré-visualização ao vivo do cartão** |
| Admin | Lista | Lista | Tabela com ações em massa |

Interação:
- **Toque**: arrastar, tocar à esquerda/direita para mudar de foto, desfazer.
- **Rato**: arrastar ou botões; *hover* mostra setas de foto.
- **Teclado**: ← passo · → gosto · ↑ ou Espaço abre ficha · Z desfazer · 1–6 foto · Enter "Quero conhecer" · Esc fecha. Atalhos mostrados num painel "?".
- **Leitor de ecrã**: modo "Lista" (alternativa à pilha de cartões) com os mesmos dados e ações em botões normais; anúncios `aria-live` ao decidir.

---

## 6. Roadmap

Cada versão: branch → PR → CI verde → publicação → nota curta do que mudou. Testes nos 3 formatos em cada versão.

### 0.91 — Fundações e segurança crítica
**Objetivo:** fechar as falhas críticas no site atual e montar o esqueleto do projeto, sem mudar o aspeto.
**Tarefas:**
- Migrações SQL (Staging → produção): N1 (contactos via RPC), N3 (Storage), N4, N5, N6, N8, N9, N10, N11, N13, N18, N20; índices; `revoke` de permissões.
- SMTP próprio (N2) conforme D1; *redirect URLs* do Auth revistos.
- `index.html` atual: usar a RPC de contacto, tratar erros, remover `prompt/confirm` críticos por diálogos simples, recuperação de palavra-passe, página de privacidade provisória.
- Repositório: `supabase/migrations`, testes pgTAP de RLS, `ci.yml` com Playwright (smoke nos 3 formatos) contra o site atual, deploy via Actions.
- Esqueleto `app/` (SvelteKit) a compilar em CI, ainda não publicado.
**Concluído quando:** um utilizador normal não consegue ler contactos de outros (teste pgTAP prova); um email de registo chega a um Gmail externo; adotante não consegue carregar ficheiros; CI verde; site igual por fora.
**Tu:** D1, D2, D4; criar conta no fornecedor de email e dar-me a chave SMTP (introduzes tu no painel do Supabase, ou dás-me e eu configuro); ativar "GitHub Actions" como fonte do Pages (1 clique em Settings → Pages).

### 0.92 — Identidade e design system (o grande salto)
**Objetivo:** nova marca e a app reconstruída em SvelteKit com o design system, **zero emojis**.
**Tarefas:** logo e ícones (4.2), tokens, fontes alojadas, Phosphor, componentes base, migração 1:1 de todas as funcionalidades para a nova app (ainda com layout de telemóvel), diálogos próprios em vez de `prompt/confirm`, página `/design` interna com todos os componentes.
**Concluído quando:** procura automática no build por emojis (regex Unicode) devolve zero; contraste AA em todas as combinações; todas as funcionalidades da 0.9 passam nos e2e; Lighthouse ≥ 90 em performance.
**Tu:** D3 (direção); aprovar o logo (2 rondas de revisão).

### 0.93 — Redesign dos ecrãs e responsivo
**Objetivo:** feed, ficha e conta redesenhados; layouts de tablet e PC (secção 5).
**Tarefas:** rotas reais (`/gato/:id`), feed no servidor (RPC `feed()` com filtros, paginação por cursor, ordenação por distância por concelho), desfazer, onboarding, modo lista, atalhos de teclado, filtros novos (sexo, idade, esterilizado, concelho).
**Concluído quando:** 3 formatos aprovados por ti em capturas; feed carrega 20 gatos de cada vez; e2e verdes.
**Tu:** rever capturas e dar feedback.

### 0.94 — Protetores
**Tarefas:** publicar em passos com pré-visualização; reordenar fotos (arrastar); HEIC; compressão de vídeo; miniaturas geradas no cliente (poupa egress); gravação atómica (RPC `guardar_fotos` numa transação + limpeza de Storage órfão por Edge Function); editar perfil e contacto; campos microchip/vacinas; estados com data ("adotado em…"); estatísticas simples por gato (vistas, gostos, contactos).
**Concluído quando:** foto HEIC de iPhone publicada a partir de Android/PC; vídeo de 60 MB fica < 10 MB; apagar anúncio remove ficheiros.
**Tu:** arranjar 2–3 protetores para testar o fluxo de publicação.

### 0.95 — Confiança, segurança e RGPD
**Tarefas:** Turnstile; limites (anúncios/dia, denúncias/dia, contactos revelados/dia); denunciar protetor; suspender conta; fila de moderação com histórico e motivos; política de privacidade e termos definitivos; **apagar conta** dentro da app (Edge Function que apaga dados, ficheiros e o utilizador de `auth`) + página web pública para pedir eliminação (exigida pela Play); exportar os meus dados.
**Concluído quando:** testes pgTAP dos limites; apagar conta remove tudo (verificado em SQL).
**Tu:** rever textos legais (eu redijo; recomendo revisão por um jurista ou uma associação — não sou advogado); definir regras de moderação.

### 0.96 — Notificações e partilha
**Tarefas:** email ao protetor quando alguém revela o contacto (resumo diário para poupar quota); email de "o teu anúncio foi aprovado/rejeitado"; preferências de notificação; páginas estáticas por gato com Open Graph e imagem gerada; botão partilhar (Web Share API); `rebuild.yml`.
**Concluído quando:** link de um gato colado no WhatsApp mostra foto, nome e localidade.
**Tu:** nada além de testar.

### 0.97 — PWA, performance, SEO
**Tarefas:** manifest completo (ícones *maskable*, `id`, `scope`, capturas), service worker (offline para app shell e favoritos), instalação, *share target*; Web Push opcional; `sitemap.xml`, `robots.txt`, dados estruturados; orçamento de performance; **critérios TWA já cumpridos aqui** (HTTPS, manifest válido, Lighthouse PWA, `assetlinks.json` preparado).
**Concluído quando:** instalável em Android e iOS; Lighthouse ≥ 95 em tudo; funciona offline com a última lista vista.
**Tu:** D1 tem de estar decidido até aqui.

### 0.98 — Acessibilidade e polimento
**Tarefas:** auditoria WCAG 2.2 AA completa (teclado, leitor de ecrã NVDA/TalkBack/VoiceOver, foco, tamanhos de toque ≥ 44 px, zoom 200 %), microinterações (carimbos, *haptics* com `navigator.vibrate`, transições), estados de carregamento com *skeleton*.
**Concluído quando:** axe sem violações; percurso completo só com teclado e só com leitor de ecrã.

### 0.99 — Beta
**Tarefas:** beta fechado com 10–20 protetores e adotantes reais; formulário de feedback; correção de bugs; revisão de todos os textos PT-PT; testes em dispositivos reais (Android barato, iPhone, iPad, PC Windows/Mac).
**Tu:** recrutar os beta-testers (os mesmos podem ser os 12+ testadores da Play), recolher autorizações de fotos.

### 1.0 — Estável na web
Congelamento de funcionalidades, *tag* `v1.0.0`, notas de versão, cópia de segurança manual da BD (o Free não tem backups automáticos — faço `pg_dump` semanal por Action para um artefacto privado).

### 1.1 — Google Play
**Ferramenta: Bubblewrap CLI** (Apache-2.0). O PWABuilder usa o Bubblewrap por baixo e é ótimo para um primeiro teste, mas o CLI é reproduzível: o projeto Android fica em `android/`, o AAB é gerado em GitHub Actions e a chave de *upload* fica num *secret*.
- **Digital Asset Links:** a verificação é feita na raiz da origem. Com o site em `/Ronron/`, o ficheiro tem de estar em `https://giuseppelomb.github.io/.well-known/assetlinks.json` — possível criando o repositório `GiuseppeLomb/giuseppelomb.github.io` (com `.nojekyll`). Com domínio próprio fica na raiz do domínio. Inclui o SHA-256 da chave de assinatura da Play (Play App Signing) e da chave de *upload*.
- **Target API:** desde 31 ago 2026 as apps novas têm de ter `targetSdk` 36 (Android 16). Confirmo a versão do Bubblewrap que o suporta na altura.
- **Risco:** a Play pode rejeitar apps que são "só um site" (política de funcionalidade mínima). Mitigação: PWA com offline, notificações, partilha e ecrã de abertura nativo — é isso que a 0.97 garante.
- Ficha da loja PT-PT: título, descrição curta (80) e longa (4000), ícone 512, gráfico de destaque 1024×500, capturas de telemóvel e tablet (geradas por Playwright a partir da app real).
- Formulários: segurança dos dados, classificação de conteúdo (IARC), público-alvo 18+, política de privacidade pública, URL de eliminação de conta, instruções de acesso para revisores (conta de teste), conteúdo gerado por utilizadores (temos denúncia e moderação).
- **Teste fechado:** regra atual confirmada na ajuda da Google — contas pessoais criadas após 13 nov 2023 precisam de **≥ 12 testadores inscritos continuamente durante ≥ 14 dias** antes de pedir acesso à produção; o teste interno não conta; reiniciar o teste reinicia a contagem. Plano: recrutar 20 (margem), Grupo Google como lista de testadores, mensagem-tipo com link de inscrição, lembrete aos dias 1, 7 e 13 para abrirem a app e deixarem feedback (a Google pergunta pelo envolvimento no pedido de produção).
- **Tu:** conta de programador (25 USD), verificação de identidade (documento) e confirmação com um telemóvel Android físico na app Play Console; recrutar testadores; guardar cópia da chave de *upload*.

---

## 7. Riscos principais
- **Quotas do Free** (1 GB Storage / 5 GB egress): mitigado com miniaturas, WebP/AVIF, vídeo comprimido e quotas por utilizador. Plano B se crescer: Cloudflare R2 (10 GB grátis, sem custos de egress; exige cartão na conta) ou Supabase Pro (25 USD/mês).
- **Pausa do Supabase**: mitigada (workflow verificado).
- **Rejeição na Play por "site embrulhado"**: mitigada pela 0.97.
- **Responsabilidade legal** de uma plataforma de cedência de animais: termos claros, adoção gratuita, denúncias; recomendo validar com uma associação/jurista antes da 1.0.

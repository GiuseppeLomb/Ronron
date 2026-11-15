# Ronron — caminho curto até à 1.0

Substitui as versões 0.92–0.99 de `PLANO-V1.md`. A 1.1 (Google Play) mantém-se como estava, depois da 1.0.

## 0.92 — Pronto a partilhar
- CAPTCHA (Cloudflare Turnstile) ligado no registo e no login; limites de pedidos do Supabase Auth afinados.
- Manter-ativo de 6 em 6 horas (produção e Staging), com falha visível e email.
- Página de privacidade e termos (RGPD), simples e em PT-PT; idade mínima 18 anos.
- Editar perfil e contacto; apagar conta dentro da app (dados, fotos e utilizador).
- Testes: pgTAP (segurança) + Playwright (registo, publicar, aprovar, contacto) em telemóvel, tablet e PC.

## 0.93 — Nova cara
- Escolha da direção visual (mockups A/B/C), logo novo em SVG, favicon e ícone.
- Tokens de design, fontes OFL alojadas no site, ícones Phosphor; zero emojis.
- Layout responsivo: telemóvel (como hoje), tablet e PC (cartão ao centro, ficha ao lado).
- Código dividido em módulos com Vite (sem framework), build e deploy por GitHub Actions.

## 1.0 — Lançamento
- Domínio próprio + email transacional (Resend): confirmação de email volta a ligar-se, recuperação de palavra-passe.
- Link direto por gato (`#gato/<id>`), para partilhar no WhatsApp.
- Beta com 5–10 protetores reais, revisão de textos, correções.

## Cortes e o que se perde
| Corte | O que se perde |
|---|---|
| Reescrita em SvelteKit (fica JS sem framework + Vite) | Componentes reutilizáveis e pré-renderização; mais trabalho manual se a app crescer muito. |
| PWA, instalação e modo offline | Não se instala no ecrã inicial nem abre sem rede; a Google Play (1.1) obriga a fazê-lo antes. |
| Notificações por email ao protetor | O protetor só sabe do interesse quando o adotante lhe escreve (o que já acontece por WhatsApp). |
| Imagem de pré-visualização por gato (Open Graph) | No WhatsApp o link mostra a imagem geral do Ronron, não a foto do gato. |
| Feed paginado no servidor e distância por concelho | Bom até algumas centenas de gatos; acima disso fica lento. A distância continua por distrito. |
| Conversão HEIC e compressão de vídeo | Fotos HEIC do iPhone recebem uma mensagem com a alternativa; vídeos limitados a 10 MB. |
| Acessibilidade completa (modo lista, leitor de ecrã) | Ficam os mínimos (foco visível, contraste, botões com nome). Quem usa leitor de ecrã terá dificuldade no swipe. |
| Moderação avançada (suspender contas, histórico) | Suspensões feitas à mão pelo admin na base de dados. |
| Exportar os meus dados (RGPD) | Pedido feito por email e respondido à mão (é permitido, dentro de 30 dias). |
| CI completo (Lighthouse, axe) | Regressões de performance e acessibilidade só se apanham à mão. |

# Google Play: rascunho da secção "Segurança dos dados"

Respostas para a Play Console (Conteúdo da app → Segurança dos dados). Atualizado para o login com Google.

## Perguntas gerais
- A app recolhe ou partilha dados do utilizador? **Sim**
- Os dados são encriptados em trânsito? **Sim** (HTTPS em todas as ligações)
- Os utilizadores podem pedir a eliminação dos dados? **Sim**: na app (Definições → Apagar a minha conta) e na página https://giuseppelomb.github.io/Ronron/apagar-conta/
- Login com Google: pedimos só `openid`, `email` e `profile`. Não pedimos contactos, Drive, Gmail nem outros dados Google.

## Dados recolhidos
"Partilhados" = **Não** em todos: os subcontratantes (Supabase, Cloudflare, Google) tratam os dados por conta do Ronron, o que a Google não conta como partilha.

| Categoria (Play) | Tipo | Recolhido | Obrigatório? | Finalidade |
|---|---|---|---|---|
| Informações pessoais | Nome | Sim | Obrigatório | Funcionalidade da app, Gestão da conta |
| Informações pessoais | Endereço de email | Sim | Obrigatório | Gestão da conta, Funcionalidade da app (contacto dos protetores) |
| Informações pessoais | IDs do utilizador (ID da conta Ronron e da conta Google) | Sim | Obrigatório | Gestão da conta |
| Informações pessoais | Número de telefone (WhatsApp dos protetores) | Sim | Opcional | Funcionalidade da app |
| Localização | Localização aproximada (distrito e cidade escritos pela pessoa, sem GPS) | Sim | Obrigatório | Funcionalidade da app |
| Fotos e vídeos | Fotos (só dos gatos que a pessoa publica) | Sim | Opcional | Funcionalidade da app |
| Atividade na app | Outras ações (gostos/passes, pedidos de contacto, denúncias) | Sim | Obrigatório | Funcionalidade da app, Prevenção de fraude e segurança |
| Informações e desempenho da app / Dispositivo | IP e sinais anti-robô (Cloudflare Turnstile) | Sim | Obrigatório | Prevenção de fraude, segurança e conformidade |

**Não recolhemos**: localização exata, contactos, mensagens, ficheiros, dados financeiros, saúde da pessoa, histórico de navegação, IDs de publicidade, análise de utilização.

Os dados são **processados de forma efémera?** Não (ficam guardados enquanto a conta existir).

## Notas
- A foto de perfil do Google não é usada pela app. O Supabase guarda o endereço dela nos dados técnicos da conta, que são apagados com a conta.
- Público-alvo: só maiores de 18 anos (declarado no primeiro login e no registo).
- Se o endereço das páginas passar para uma organização GitHub, atualizar os dois links acima e na ficha da loja.

# Ronron 1.0.0 — pacote para a Play Console

Tudo o que é preciso para publicar, pronto a copiar. Pacote `pt.ronron.app`, versão 1.0.1 (versionCode 1000100). A 1.0.0 (1000000) foi a primeira compilação.
As credenciais da conta de demonstração **não** estão aqui (este repositório pode ser lido por outras pessoas): estão no ficheiro `ronron-conta-revisor-google.txt` que te foi entregue à parte.

---

## 0. Antes de enviar (ordem recomendada)

1. **Fazer merge para o `main`** da branch de trabalho: as páginas de privacidade e de eliminação de conta ficam online com o nome e o email certos, e a app web antiga e o protótipo saem do ar.
2. **Ecrã de consentimento do Google (Google Cloud → Google Auth Platform → Audience):** passar de "Testing" para **"In production"**. Enquanto estiver em teste, só as contas da lista "Test users" conseguem entrar com o Google. Com os âmbitos `openid`, `email` e `profile` não é preciso verificação da Google.
3. **Play App Signing:** ao criar a app e enviar o primeiro `.aab`, aceita a assinatura da app pela Google Play. Depois, em **Play Console → Teste e lançamento → Integridade da app → Assinatura da app**, copia a **SHA-1 da chave de assinatura da app** e cria **mais um cliente OAuth Android** no Google Cloud (pacote `pt.ronron.app` + essa SHA-1). Sem isto, o login com Google falha nas instalações feitas pela Play Store (a Google reassina a app com outra chave).
   - SHA-1 da chave de carregamento (upload key), já registada: `63:D4:AA:0E:24:68:37:BC:EE:29:3D:73:2A:9C:D1:D3:A7:A5:60:A6`
4. **Supabase (produção e Staging) → Authentication → Sign In / Providers → "Allow manual linking": ligar.** É o que permite, nas Definições da app, "Ligar conta Google" a uma conta criada com email e palavra-passe. A junção automática pelo email continua bloqueada pela base de dados (proteção contra nOAuth).
5. **Supabase de produção → Authentication → URL Configuration → Redirect URLs:** acrescentar `https://giuseppelomb.github.io/Ronron/apagar-conta/` (para o login com Google na página de eliminação de conta).
6. **Gatos reais antes da revisão:** a base de dados de produção está vazia (sem dados fictícios, como pedido). Antes de enviar para revisão, publica e aprova alguns gatos reais (de quem cuida de gatos de rua), para o revisor da Google não ver uma app vazia. Sem gatos, a app mostra "Os primeiros gatos estão a chegar".
7. **Conta pessoal da Play Console:** contas pessoais criadas depois de novembro de 2023 têm de fazer um **teste fechado com pelo menos 12 testadores durante 14 dias seguidos** antes de poderem pedir acesso à produção (ver secção 6).

---

## 1. Ficha da loja (Português – Portugal, pt-PT)

**Nome da app** (máx. 30): `Ronron: adoção de gatos` (23)

**Descrição breve** (máx. 80): `Gatos de rua à procura de casa. Dá swipe e fala com quem cuida deles.` (69)

**Descrição completa** (máx. 4000; este texto tem 1791):

```
O Ronron ajuda gatos de rua a encontrar casa em Portugal. É gratuito, sem publicidade e sem fins lucrativos.

Quem cuida de gatos de rua publica-os com fotos e uma pequena história. Quem quer adotar conhece-os um a um e, quando encontra o seu, fala diretamente com quem cuida dele. Sem intermediários, sem custos.

COMO FUNCIONA
• Desliza para a direita nos gatos de que gostas: ficam guardados nos Favoritos. Para a esquerda, passas.
• Abre a ficha para ver a idade, o feitio, se se dá bem com outros gatos, cães ou crianças, e a saúde: vacinado, desparasitado, esterilizado e o teste de FeLV.
• Filtra por distrito, por idade e pelo que é importante para ti.
• Toca em "Quero conhecer" para falares com quem cuida do gato, por WhatsApp ou email, e combinarem uma visita.

PARA QUEM CUIDA DE GATOS DE RUA
• Publica um gato em poucos minutos, com fotos tiradas na hora ou da galeria.
• Atualiza o estado: disponível, reservado ou adotado.
• O teu contacto só aparece a quem tem conta e pede para conhecer um gato teu.

SEGURO E SEMPRE GRATUITO
• A adoção é sempre gratuita. Vender animais não é permitido.
• Cada anúncio é revisto antes de aparecer.
• Podes denunciar qualquer anúncio suspeito.
• Os teus dados são protegidos e podes apagar a conta quando quiseres, dentro da app.

O RONRON
Um gato ruivo que te acompanha: acena quando abres a app, ronrona quando gostas de um gato e dorme uma sesta quando não há mais gatos para ver. Se preferires, fica calmo ou quieto, e o som e a vibração desligam-se nas Definições.

FeLV
Explicamos o que é a leucemia felina e indicamos o resultado do teste em cada gato. Os gatos FeLV positivos são os que mais esperam por casa e podem viver muitos anos felizes.

Entra com o Google ou com email e palavra-passe. O Ronron é só para maiores de 18 anos.
```

**Categoria:** App → **Estilo de vida**
**Etiquetas** (escolher na lista da Play Console, até 5): animais de estimação, adoção, comunidade.
**Email de contacto:** giuseppe.teles@gmail.com
**Website:** deixar vazio (opcional).
**Política de privacidade:** https://giuseppelomb.github.io/Ronron/privacidade/

**Imagens** (pasta `docs/loja/`):
| Campo da Play Console | Ficheiro | Medidas |
|---|---|---|
| Ícone da app | `icone-512.png` | 512×512, PNG 32 bits (igual ao ícone instalado no telemóvel) |
| Gráfico de destaque | `destaque-1024x500.png` | 1024×500 |
| Capturas de ecrã do telemóvel (por esta ordem) | `captura-1-gatos.png`, `captura-2-ficha.png`, `captura-3-filtros.png`, `captura-4-quero-conhecer.png`, `captura-5-favoritos.png`, `captura-6-sobre.png` | 1080×1920 (9:16), modo claro |

As capturas foram feitas com a versão de lançamento e gatos de exemplo **só nas imagens** (fotos CC0 da Wikimedia Commons; nada foi escrito na base de dados).

---

## 2. Conteúdo da app (Política → Conteúdo da app)

### Política de privacidade
`https://giuseppelomb.github.io/Ronron/privacidade/`

### Acesso à app
- Escolher: **Todas ou algumas funcionalidades estão restritas**.
- Adicionar instruções: nome, utilizador, palavra-passe e "Outras informações" → copiar do ficheiro `ronron-conta-revisor-google.txt`.
- A conta é de adotante, sem dados pessoais reais, e já aceitou as regras (18+). Não precisa de código nem de email.

### Anúncios
**Não, a minha app não contém anúncios.**

### ID de publicidade
**Não** (a app não usa o ID de publicidade; o SDK do Facebook foi retirado da compilação).

### Classificação de conteúdo (questionário IARC)
- Email: giuseppe.teles@gmail.com · Categoria: **Redes sociais, comunicação ou fóruns** (os utilizadores publicam gatos e entram em contacto).
- Violência, sexo, linguagem imprópria, drogas, álcool, tabaco, jogo: **Não** a todas.
- Os utilizadores podem interagir ou trocar conteúdo? **Sim** (anúncios de gatos com fotos; contacto por WhatsApp/email fora da app).
- Os anúncios são moderados? **Sim** (cada anúncio é revisto por um administrador antes de aparecer; há botão de denúncia).
- Partilha a localização física atual do utilizador com outros utilizadores? **Não** (só distrito e cidade escritos à mão).
- Permite comprar bens digitais? **Não**. É um navegador de internet ou motor de pesquisa? **Não**.
- Resultado esperado: classificação baixa (ex.: PEGI 3) com o aviso **"Os utilizadores interagem"**. O público-alvo é definido à parte (18+).

### Público-alvo e conteúdo
- Faixa etária: **18 anos e mais** (só esta).
- A app pode atrair crianças sem querer? **Não**.

### Apps de notícias / governamentais / saúde / funcionalidades financeiras
Não é app de notícias · não é governamental · sem funcionalidades de saúde · **sem funcionalidades financeiras**.

### Eliminação de conta
- A app permite criar contas? **Sim**.
- URL para pedir a eliminação: `https://giuseppelomb.github.io/Ronron/apagar-conta/`
- Na app: Conta → Definições → Apagar a minha conta (escrever APAGAR). Apaga tudo de imediato.
- Eliminação parcial de dados sem apagar a conta: não é necessária (o utilizador edita ou apaga os seus gatos e o perfil na app).

### Segurança dos dados
**Perguntas gerais**
- Recolhe ou partilha dados do utilizador? **Sim**.
- Todos os dados são encriptados em trânsito? **Sim**.
- Métodos de criação de conta: **Nome de utilizador e palavra-passe** e **OAuth (Google)**.
- Os utilizadores podem pedir a eliminação dos dados? **Sim** → URL acima.
- Partilha de dados com terceiros: **Não** em todos os tipos. Supabase (base de dados e contas), Cloudflare (verificação anti-robô) e Google (login) são subcontratantes que tratam os dados por conta do Ronron, o que a Google não conta como partilha.

**Dados recolhidos** (nenhum é partilhado; nenhum é para publicidade ou análise)
| Categoria → tipo | Obrigatório? | Efémero? | Finalidades |
|---|---|---|---|
| Informações pessoais → **Nome** | Obrigatório | Não | Funcionalidade da app; Gestão da conta |
| Informações pessoais → **Endereço de email** | Obrigatório | Não | Gestão da conta; Funcionalidade da app (contacto dos protetores) |
| Informações pessoais → **IDs do utilizador** (conta Ronron e conta Google) | Obrigatório | Não | Gestão da conta |
| Informações pessoais → **Número de telefone** (WhatsApp, só protetores) | Opcional | Não | Funcionalidade da app |
| Localização → **Localização aproximada** (distrito e cidade escritos à mão; sem GPS) | Obrigatório | Não | Funcionalidade da app |
| Fotos e vídeos → **Fotos** (só dos gatos que se publicam) | Opcional | Não | Funcionalidade da app |
| Atividade na app → **Interações na app** (gostos e passes) | Obrigatório | Não | Funcionalidade da app |
| Atividade na app → **Outro conteúdo gerado pelo utilizador** (descrição dos gatos, denúncias) | Opcional | Não | Funcionalidade da app; Prevenção de fraudes, segurança e conformidade |
| Dispositivo ou outros IDs → **IDs do dispositivo ou outros** (sinais da verificação anti-robô Cloudflare Turnstile) | Obrigatório | Sim | Prevenção de fraudes, segurança e conformidade |

**Não recolhemos:** localização exata, contactos, mensagens, ficheiros, calendário, áudio, dados financeiros, saúde, histórico de navegação, apps instaladas, ID de publicidade, registos de falhas ou dados de diagnóstico.

### Permissões da app (verificadas no APK 1.0.0)
Internet e estado da rede · vibração · notificações (aviso "o teu gato foi aprovado") · arranque do telemóvel e wake lock (da biblioteca de notificações) · credenciais e biometria (vêm da biblioteca de login da Google, Credential Manager; a app não usa biometria). Sem câmara: a fotografia é tirada pela app de câmara do sistema. Sem localização, sem contactos, sem ID de publicidade, sem alarme exato, sem SDK do Facebook. Nenhuma exige declaração especial na Play Console.

---

## 3. Notas da versão (máx. 500)

**1.0.1** (é esta a primeira a enviar):
```
Primeira versão do Ronron. Conhece gatos de rua à procura de casa em Portugal, guarda os teus favoritos e fala diretamente com quem cuida deles. Quem cuida de gatos pode publicá-los com fotos. Entra com o Google ou com email, e liga o Google à tua conta nas Definições. Adoção sempre gratuita.
```

1.0.0 (referência)

```
Primeira versão do Ronron. Conhece gatos de rua à procura de casa em Portugal, guarda os teus favoritos e fala diretamente com quem cuida deles. Quem cuida de gatos pode publicá-los com fotos. Entrar com o Google ou com email. Adoção sempre gratuita.
```
(250 caracteres)

---

## 4. Ficheiros da versão

- **`.aab` para a Google Play:** GitHub → Actions → "App Android" → a execução de lançamento → secção *Artifacts* → `ronron-play-store-aab` (guardado 90 dias). Dentro: `ronron-<versão>-<versionCode>.aab`, assinado com a chave de carregamento.
- **APK de lançamento (só para verificar no telemóvel):** mesma página, `ronron-apk-lancamento`. Usa a base de dados de **produção**. Para o instalar por cima das versões de teste, desinstala primeiro a versão de teste.
- Para uma nova compilação de lançamento: Actions → App Android → Run workflow → `ambiente` = `production` (e `revisao` = 1, 2… se for preciso reenviar a mesma versão).

---

## 5. Primeiro envio (passo a passo)

1. Play Console → **Criar app**: nome "Ronron: adoção de gatos", idioma predefinido Português (Portugal), **App**, **Gratuita**, aceitar as declarações.
2. Preencher a secção 2 (Conteúdo da app) e a secção 1 (Ficha da loja).
3. **Teste e lançamento → Testes → Teste fechado** → criar faixa → enviar o `.aab` mais recente (1.0.1: `ronron-1.0.1-1000100.aab`) → notas da secção 3 → países: Portugal.
4. Aceitar a **assinatura da app pela Google Play** e fazer o passo 0.3 (SHA-1 da chave de assinatura no Google Cloud).
5. Adicionar os testadores (lista de emails ou Grupo Google) e partilhar o link de adesão.

## 6. Teste fechado (contas pessoais)

- Pelo menos **12 testadores** com a app instalada **durante 14 dias seguidos** (contam os que ficam inscritos os 14 dias).
- Depois disso, a Play Console mostra **"Pedir acesso à produção"**, com um pequeno questionário sobre o teste (quem testou, o que mudou com o feedback).
- Só então se envia para **Produção** (pode ser o mesmo `.aab`, ou uma revisão com correções).

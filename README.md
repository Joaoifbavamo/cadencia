# Cadência

Diário de treino pessoal em português. React/TypeScript no GitHub Pages e dados protegidos por Supabase Auth e RLS.

## Uso

1. Entre na conta pessoal. A ficha vinculada à conta sincroniza automaticamente. Em Ajustes, confirme o peso da barra; a importação JSON permite trocar ou restaurar a ficha.
2. Em Hoje, comece ou retome. Cada exercício mostra uma série por formulário; RIR é opcional. Salvar série inicia o descanso.
3. Na Agenda, escolha data realizada e data originalmente prevista separadamente. Registre cardio nos dias livres.
4. Evolução compara séries da mesma variação, faixa, unidade e aparelho. Meu treino altera a ficha sem reescrever sessões iniciadas.
5. Ajustes oferece temas claro, escuro e sistema, backup, importação, notificações e limpeza com prévia.

## iPhone

Aba Instalar: download do perfil Web Clip e instruções do Safari. O perfil é XML não assinado, removível, com apenas nome, ícone e URL; não é gerenciamento remoto. O atalho abre o GitHub Pages deste projeto. O download usa uma função pública estática no Supabase com MIME `application/x-apple-aspen-config` e `Content-Disposition: attachment`; o tipo genérico anterior fazia alguns navegadores exibirem código. A função não acessa dados pessoais.

Web Push no iPhone depende de iOS 16.4+, permissão e contexto de app da Tela de Início. A instalação pelo Safari é a modalidade documentada pela Apple. A compatibilidade do Web Clip criado pelo perfil deve ser conferida no aparelho.

Em Ajustes → Notificações, toque em Permitir notificações e, depois, Conectar este aparelho. A inscrição começa no toque, antes de consultar a conta. O app distingue instalação, suporte, permissão e conexão. Envie um teste para confirmar a entrega real. Habilite aviso de descanso e/ou lembrete diário em horário de Brasília. Os avisos ficam desligados até consentimento no aparelho. Lembrete diário é por aparelho; habilitar nos dois envia para os dois.

O relógio usa um prazo absoluto e retoma após alternar abas. Em primeiro plano há aviso local. Em segundo plano o servidor verifica a cada minuto; rede, Foco e iOS podem atrasar ou impedir a entrega. Não há promessa de alarme exato com o telefone bloqueado. A animação inicial respeita redução de movimento.

## Dados e sincronização

IndexedDB por conta, fila idempotente, versões e conflitos explícitos. Séries têm identidade determinística por sessão/exercício/posição. Transações locais coordenam abas, que se atualizam por BroadcastChannel. Cada sincronizador mantém seu cursor; uma aba não avança o cursor da outra.

Limpeza é opcional. Preserva rascunhos e última referência de carga. Resumo e tombstones entram num lote atômico; outra limpeza espera a anterior. Tombstones usam payload mínimo. Recibos de mutação preservam respostas para deduplicação: eles também ocupam espaço, então a limpeza não garante redução proporcional do banco. Exporte antes de excluir detalhes.

Não há cargas pessoais ou ficha real no bundle. A demonstração é fictícia e local. Chaves publicáveis e VAPID pública podem constar do cliente; chaves privadas e do agendador ficam no Vault do Supabase, com função restrita ao serviço de notificações.

## Desenvolvimento e publicação

Node 24: `npm ci`, `npm test`, `npm run build`. `npm run dev` inicia a prévia. A build inclui assets no pré-cache do service worker; atualizações esperam as abas antigas fecharem.

Publicação em `Joaoifbavamo/cadencia` pelo GitHub Pages da pasta `docs` na branch `main`. Execute `npm run pages:prepare` antes de cada atualização; a build usa caminhos relativos compatíveis com `/cadencia/`. Essa opção dispensa ampliar a autorização do GitHub para alterar workflows. Não inclua arquivos `.private.json`, PDFs pessoais, credenciais ou backups no repositório. O perfil publicado aponta para `https://joaoifbavamo.github.io/cadencia/`.

SQL revisável em `supabase/`. Função `cadencia-push` autentica o agendador por segredo e usuários por JWT real + propriedade. Endpoints push têm allowlist e expiração. O cron de um minuto usa segredo do Vault. Não aplique novamente arquivos já implantados sem planejar a migração.

## Verificações

Testes Node cobrem regras de carga/RIR, datas, snapshots, referência, identidade de série, transações, isolamento e corridas de ACK, lotes, temas e horários. Testes de navegador `tests/redesign.mjs` e `tests/pwa.mjs` usam uma sessão Chrome isolada e URLs locais; ajuste o executável no seu sistema.

Fontes: [Apple Web Push](https://webkit.org/blog/13878/), [Web Clip Apple](https://developer.apple.com/documentation/devicemanagement/webclip), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [agendamento de funções](https://supabase.com/docs/guides/functions/schedule-functions), [React Bits Stepper](https://reactbits.dev/components/stepper).

Ferramenta de registro, sem prescrição médica nem garantia de resultado de treino. A disponibilidade de aparelhos não é verificada pelo app.

## Interface

Sistema editorial em preto, branco e cinzas neutros, Manrope variável local, temas claro/escuro/sistema e uma série por formulário. Referência de movimento: React Bits. Atualização pronta aparece com ação explícita e aguarda a saída do treino ou editor antes de recarregar.

## Mensagens motivacionais e Liquid Glass

Ajustes → Notificações → Mensagens motivacionais: até três horários distintos por dia no fuso de Brasília, nome/apelido opcional e mensagens próprias (160 caracteres). Campo vazio usa frases que variam por dia/horário. Salve a opção Receber mensagens para ativar neste aparelho; desligar e salvar interrompe os próximos avisos. Dependem da inscrição e permissão de notificações. Quando ativas, Enviar notificação de teste usa a primeira mensagem salva. Editor em modo demonstração oferece somente prévia local.

Migração aditiva `supabase/motivation.sql`: preferências na inscrição protegida por RLS, limite no banco, deduplicação por data/horário, lease e expiração mantidos; agendador continua privado, sem novos acessos ao Vault. Aplicada ao projeto; não reaplique. Edge cadencia-push versão 5 usa a mesma função de mensagens do cliente (cópia versionada em seu diretório). Mensagens motivacionais iniciam desligadas e não leem a ficha pessoal.

Liquid Glass é uma adaptação web para navegação/cabeçalho/diálogos móveis, com fallback sólido por suporte e preferências de acessibilidade. O conteúdo permanece opaco. A tela inicial mostra a semana real; não inventa sequência ou treino concluído.

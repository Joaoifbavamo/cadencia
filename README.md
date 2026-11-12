# CadÃªncia

DiÃ¡rio de treino pessoal em portuguÃªs. React/TypeScript no GitHub Pages e dados protegidos por Supabase Auth e RLS.

## Uso

1. Entre na conta pessoal. A ficha vinculada à conta sincroniza automaticamente. Em Ajustes, confirme o peso da barra; a importação JSON é uma opção para trocar ou restaurar a ficha.
2. Em Hoje, comece ou retome. Cada exercÃ­cio mostra uma sÃ©rie por formulÃ¡rio; RIR Ã© opcional. Salvar sÃ©rie inicia o descanso.
3. Na Agenda, escolha data realizada e data originalmente prevista separadamente. Registre cardio nos dias livres.
4. EvoluÃ§Ã£o compara sÃ©ries da mesma variaÃ§Ã£o, faixa, unidade e aparelho. Meu treino altera a ficha sem reescrever sessÃµes iniciadas.
5. Ajustes oferece temas claro, escuro e sistema, backup, importaÃ§Ã£o, notificaÃ§Ãµes e limpeza com prÃ©via.

## iPhone

Aba Instalar: download do perfil Web Clip e instruÃ§Ãµes do Safari. O perfil Ã© XML nÃ£o assinado, removÃ­vel, com apenas nome, Ã­cone e URL; nÃ£o Ã© gerenciamento remoto. O endereÃ§o do perfil corresponde ao GitHub Pages deste projeto.

Web Push no iPhone depende de iOS 16.4+, permissÃ£o e contexto de app da Tela de InÃ­cio. A instalaÃ§Ã£o pelo Safari Ã© a modalidade documentada pela Apple. A compatibilidade do Web Clip criado pelo perfil deve ser conferida no aparelho.

Em Ajustes â†’ NotificaÃ§Ãµes, cadastre este aparelho e envie um teste. Habilite aviso de descanso e/ou lembrete diÃ¡rio em horÃ¡rio de BrasÃ­lia. Os avisos ficam desligados atÃ© consentimento no aparelho. Lembrete diÃ¡rio Ã© por aparelho; habilitar nos dois envia para os dois.

O relÃ³gio usa um prazo absoluto e retoma apÃ³s alternar abas. Em primeiro plano hÃ¡ aviso local. Em segundo plano o servidor verifica a cada minuto; rede, Foco e iOS podem atrasar ou impedir a entrega. NÃ£o hÃ¡ promessa de alarme exato com o telefone bloqueado. A animaÃ§Ã£o inicial respeita reduÃ§Ã£o de movimento.

## Dados e sincronizaÃ§Ã£o

IndexedDB por conta, fila idempotente, versÃµes e conflitos explÃ­citos. SÃ©ries tÃªm identidade determinÃ­stica por sessÃ£o/exercÃ­cio/posiÃ§Ã£o. TransaÃ§Ãµes locais coordenam abas, que se atualizam por BroadcastChannel. Cada sincronizador mantÃ©m seu cursor; uma aba nÃ£o avanÃ§a o cursor da outra.

Limpeza Ã© opcional. Preserva rascunhos e Ãºltima referÃªncia de carga. Resumo e tombstones entram num lote atÃ´mico; outra limpeza espera a anterior. Tombstones usam payload mÃ­nimo. Recibos de mutaÃ§Ã£o preservam respostas para deduplicaÃ§Ã£o: eles tambÃ©m ocupam espaÃ§o, entÃ£o a limpeza nÃ£o garante reduÃ§Ã£o proporcional do banco. Exporte antes de excluir detalhes.

NÃ£o hÃ¡ cargas pessoais ou ficha real no bundle. A demonstraÃ§Ã£o Ã© fictÃ­cia e local. Chaves publicÃ¡veis e VAPID pÃºblica podem constar do cliente; chaves privadas e do agendador ficam no Vault do Supabase, com funÃ§Ã£o restrita ao serviÃ§o de notificaÃ§Ãµes.

## Desenvolvimento e publicaÃ§Ã£o

Node 24: `npm ci`, `npm test`, `npm run build`. `npm run dev` inicia a prÃ©via. A build inclui assets no prÃ©-cache do service worker; atualizaÃ§Ãµes esperam as abas antigas fecharem.

PublicaÃ§Ã£o em `Joaoifbavamo/cadencia` pelo GitHub Pages da pasta `docs` na branch `main`. Execute `npm run pages:prepare` antes de cada atualizaÃ§Ã£o; a build usa caminhos relativos compatÃ­veis com `/cadencia/`. Essa opÃ§Ã£o dispensa ampliar a autorizaÃ§Ã£o do GitHub para alterar workflows. NÃ£o inclua arquivos `.private.json`, PDFs pessoais, credenciais ou backups no repositÃ³rio. O perfil publicado aponta para `https://joaoifbavamo.github.io/cadencia/`.

SQL revisÃ¡vel em `supabase/`. FunÃ§Ã£o `cadencia-push` autentica o agendador por segredo e usuÃ¡rios por JWT real + propriedade. Endpoints push tÃªm allowlist e expiraÃ§Ã£o. O cron de um minuto usa segredo do Vault. NÃ£o aplique novamente arquivos jÃ¡ implantados sem planejar a migraÃ§Ã£o.

## VerificaÃ§Ãµes

Testes Node cobrem regras de carga/RIR, datas, snapshots, referÃªncia, identidade de sÃ©rie, transaÃ§Ãµes, isolamento e corridas de ACK, lotes, temas e horÃ¡rios. Testes de navegador `tests/redesign.mjs` e `tests/pwa.mjs` usam uma sessÃ£o Chrome isolada e URLs locais; ajuste o executÃ¡vel no seu sistema.

Fontes: [Apple Web Push](https://webkit.org/blog/13878/), [Web Clip Apple](https://developer.apple.com/documentation/devicemanagement/webclip), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [agendamento de funÃ§Ãµes](https://supabase.com/docs/guides/functions/schedule-functions), [React Bits Stepper](https://reactbits.dev/components/stepper).

Ferramenta de registro, sem prescriÃ§Ã£o mÃ©dica nem garantia de resultado de treino. A disponibilidade de aparelhos nÃ£o Ã© verificada pelo app.

## Interface

Sistema editorial em preto, branco e cinzas neutros, Manrope variável hospedada no próprio site, temas claro/escuro/sistema e formulário de uma série por vez. Referência visual de movimento: React Bits; sem copiar dependências ou efeitos decorativos que atrapalhem o registro. Uma atualização pronta aparece com ação explícita e aguarda a saída do treino ou editor antes de recarregar.

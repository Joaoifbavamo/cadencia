# VerificaÃ§Ã£o da entrega

- Build de produÃ§Ã£o concluÃ­da; TypeScript sem erros.
- 25 testes de domÃ­nio, persistÃªncia, conflitos, regressÃµes da revisÃ£o, temas e horÃ¡rio passaram.
- Chrome isolado, 390 Ã— 844 e desktop: registro com vÃ­rgula decimal e RIR vazio, retomada, validaÃ§Ã£o, conclusÃ£o, evoluÃ§Ã£o e temas claro/escuro/sistema, sem erros de execuÃ§Ã£o ou rolagem horizontal.
- PWA: primeiro acesso online e primeira reabertura offline com cache HTTP desativado; rascunho preservado. Build prÃ©-cacheia seus prÃ³prios assets.
- Perfil XML validado: um payload Web Clip, URL correta, Ã­cone embutido, removÃ­vel, tela cheia. InstalaÃ§Ã£o real exige o iPhone.
- CronÃ´metro: tÃ©rmino testado com avanÃ§o do relÃ³gio, sem esperar o tempo real.
- Supabase: testes transacionais com role authenticated verificaram proprietÃ¡rio, CAS, idempotÃªncia e rollback de lote; outro usuÃ¡rio e anÃ´nimo bloqueados. Executar notificaÃ§Ãµes nÃ£o expÃµe as chaves a usuÃ¡rios autenticados comuns.
- ServiÃ§o de push: pedido sem autenticaÃ§Ã£o retornou 401; agendador autorizado retornou 200. Cron ativo a cada minuto. A entrega pelo provedor para um iPhone real requer permissÃ£o e inscriÃ§Ã£o no prÃ³prio aparelho.
- DependÃªncias de produÃ§Ã£o: auditoria npm sem vulnerabilidades conhecidas no momento do teste.
- RevisÃ£o independente encontrou corridas de ACK, identidade duplicada de sÃ©rie, rascunho de editor, lotes consecutivos, coordenaÃ§Ã£o de abas e prÃ©-cache incompleto. CorreÃ§Ãµes aplicadas; testes de regressÃ£o para os casos centrais passaram.

## Limites conhecidos

O serviÃ§o ainda sinaliza dois avisos de configuraÃ§Ã£o: pg_net registrado no schema public (seus objetos ficam no schema net) e proteÃ§Ã£o opcional de senhas vazadas desativada. NÃ£o representam uma certificaÃ§Ã£o de seguranÃ§a nem acesso pÃºblico aos registros. NÃ£o alterar a extensÃ£o jÃ¡ ativa sem planejar transporte e filas.

Os recibos de mutaÃ§Ã£o preservam respostas para idempotÃªncia e ocupam espaÃ§o; limpar histÃ³rico nÃ£o garante reduÃ§Ã£o proporcional do tamanho. A compatibilidade de Web Push com o atalho criado por perfil precisa de conferÃªncia no iPhone. NotificaÃ§Ãµes nÃ£o garantem alarme exato em segundo plano.

ReferÃªncias dos avisos: [pg_net e schema](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [proteÃ§Ã£o de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Revisão monocromática — 11/11/2026

- Todas as áreas revisadas em 17 capturas: 390 × 844, largura 676 e desktop 1440 × 1000; nenhuma rolagem horizontal detectada. Temas, vírgula decimal, RIR opcional, retomada, conclusão e evolução conferidos no Chrome isolado.
- Fonte Manrope local incluída no pré-cache e licença OFL entregue; ícones preto/branco com origem registrada. Detector visual executado uma vez, sem ocorrências.
- Download público do perfil passou na regressão de MIME Apple e payload Web Clip. Ícone embutido atualizado; função pública cadencia-profile versão 2.
- Fluxo de notificações separa permissão e conexão para preservar o gesto do usuário no iPhone. Quatro testes de estados novos; serviço cadencia-push versão 4 respondeu 401 sem autorização e 200/encryptionReady ao agendador. Isso verifica autenticação e preparação criptográfica, não entrega no aparelho.
- Revisão final visual independente realizada por agente genérico em substituição ao papel especializado indisponível; fidelidade aprovada nas capturas, correção documental exigida.
- Instalação física do perfil e recebimento real no iPhone continuam pendentes: usuário informou não estar no Safari. Não foi usada senha do usuário nem presumida entrega de notificações.

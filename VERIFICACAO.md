# Verificação da entrega

- Build de produção concluída; TypeScript sem erros.
- 25 testes de domínio, persistência, conflitos, regressões da revisão, temas e horário passaram.
- Chrome isolado, 390 × 844 e desktop: registro com vírgula decimal e RIR vazio, retomada, validação, conclusão, evolução e temas claro/escuro/sistema, sem erros de execução ou rolagem horizontal.
- PWA: primeiro acesso online e primeira reabertura offline com cache HTTP desativado; rascunho preservado. Build pré-cacheia seus próprios assets.
- Perfil XML validado: um payload Web Clip, URL correta, ícone embutido, removível, tela cheia. Instalação real exige o iPhone.
- Cronômetro: término testado com avanço do relógio, sem esperar o tempo real.
- Supabase: testes transacionais com role authenticated verificaram proprietário, CAS, idempotência e rollback de lote; outro usuário e anônimo bloqueados. Executar notificações não expõe as chaves a usuários autenticados comuns.
- Serviço de push: pedido sem autenticação retornou 401; agendador autorizado retornou 200. Cron ativo a cada minuto. A entrega pelo provedor para um iPhone real requer permissão e inscrição no próprio aparelho.
- Dependências de produção: auditoria npm sem vulnerabilidades conhecidas no momento do teste.
- Revisão independente encontrou corridas de ACK, identidade duplicada de série, rascunho de editor, lotes consecutivos, coordenação de abas e pré-cache incompleto. Correções aplicadas; testes de regressão para os casos centrais passaram.

## Limites conhecidos

O serviço ainda sinaliza dois avisos de configuração: pg_net registrado no schema public (seus objetos ficam no schema net) e proteção opcional de senhas vazadas desativada. Não representam uma certificação de segurança nem acesso público aos registros. Não alterar a extensão já ativa sem planejar transporte e filas.

Os recibos de mutação preservam respostas para idempotência e ocupam espaço; limpar histórico não garante redução proporcional do tamanho. A compatibilidade de Web Push com o atalho criado por perfil precisa de conferência no iPhone. Notificações não garantem alarme exato em segundo plano.

Referências dos avisos: [pg_net e schema](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Revisão monocromática — 11/11/2026

- Todas as áreas revisadas em 17 capturas: 390 × 844, largura 676 e desktop 1440 × 1000; nenhuma rolagem horizontal detectada. Temas, vírgula decimal, RIR opcional, retomada, conclusão e evolução conferidos no Chrome isolado.
- Fonte Manrope local incluída no pré-cache e licença OFL entregue; ícones preto/branco com origem registrada. Detector visual executado uma vez, sem ocorrências.
- Download público do perfil passou na regressão de MIME Apple e payload Web Clip. Ícone embutido atualizado; função pública cadencia-profile versão 4.
- Fluxo de notificações separa permissão e conexão para preservar o gesto do usuário no iPhone. Quatro testes de estados novos; serviço cadencia-push versão 4 respondeu 401 sem autorização e 200/encryptionReady ao agendador. Isso verifica autenticação e preparação criptográfica, não entrega no aparelho.
- Revisão final visual independente realizada por agente genérico em substituição ao papel especializado indisponível; fidelidade aprovada nas capturas. Correção documental aplicada e confirmada pelo mesmo revisor; disposição final: ship no escopo visual/documental.
- Instalação física do perfil e recebimento real no iPhone continuam pendentes: usuário informou não estar no Safari. Não foi usada senha do usuário nem presumida entrega de notificações.

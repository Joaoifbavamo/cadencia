# Verificação da entrega

- Build de produção concluída; TypeScript sem erros.
- 21 testes de domínio, persistência, conflitos, regressões da revisão, temas e horário passaram.
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

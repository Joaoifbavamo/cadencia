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

## Refinamento móvel limpo e moderno — 11/11/2026

Removida a linha de marca duplicada na sessão e os indicadores repetidos. Prescrição compacta; RIR, histórico editável, orientações e ajustes menos frequentes recolhíveis. Nenhuma regra de sincronização ou exclusão alterada. Testes de navegador passaram com carga decimal, RIR gravado e reeditado, retomada e larguras 320/375/390/430/676/1440 sem rolagem horizontal. Os 25 testes Node passaram. Detector executado uma vez: avisos consultivos de tamanhos/raios fora da rampa documental, incluindo valores preexistentes; novos tamanhos e raio de 12 px são intencionais e documentados.

Revisão independente desta simplificação: ship, sem correções materiais, com 17 capturas e comparação anterior. Reexecução do navegador no ambiente do revisor foi bloqueada antes de carregar o app; testes funcionais acima foram executados no ambiente principal. Instalação física, VoiceOver e entrega de notificações no iPhone não foram inferidos dessa revisão.

## Liquid Glass, Hoje e mensagens — 11/11/2026

- 27 testes Node passaram; validação de horários, limites e rotação determinística adicionados. Navegador: editor rejeita horários repetidos e mantém nome/mensagem/ativação; larguras 320–1440 sem overflow; sete dias reais, temas e fallback sem blur com maior contraste.
- Migração aplicada. Testes SQL em transação com rollback validaram deduplicação, interrupção ao desligar, proprietário pode editar, outro usuário bloqueado e RPC do agendador privado. Nenhuma preferência pessoal foi alterada pelos testes.
- Edge v5: saúde 200/encryptionReady com autorização, 401 sem. Não enviamos teste real ao aparelho; entrega física continua não verificada.
- Revisão independente: ship, sem problemas materiais nas fontes, SQL e capturas. Detector único: somente 111 avisos consultivos de rampa de tipos/raios/cores, incluindo valores anteriores. Vidro funcional e raios novos são escolhas solicitadas e documentadas.
- Avisos Supabase permanecem os dois já documentados (pg_net e proteção opcional de senhas); nenhuma nova exposição de tabelas ou segredo foi criada.

## Glisse e revisão de usabilidade — 13/11/2026

- 30 testes Node passaram. Novos testes cobrem correspondência de treino/data, primeiro exercício incompleto e validação da escolha do dia.
- Navegador isolado com movimento normal verificou Glisse real, troca com sessão iniciada, preservação de 30 kg × 8 na sessão anterior, escolha após recarregar, datas, edição de cardio sem duplicação, seleção limpa na Agenda e larguras 320–1440. Movimento reduzido/contraste usam alternativa estática.
- Revisão independente: ship, sem problemas materiais; revisão direcionada adicional confirmou CAS e coerência entre Hoje e Agenda. Sessões antigas mantêm seus snapshots.
- Detector executado uma vez, 112 avisos consultivos de rampa de tamanhos/raios/cores, sem falha bloqueante; componentes/raios do Glisse são intencionais.
- Auditoria completa npm: zero vulnerabilidades após Vite 7.3.8. Não houve migração de banco, acesso a novos segredos nem mudança de permissões. Teste físico de óptica/movimento no Safari do iPhone continua não realizado.

O botão Voltar para hoje e a finalização agora realmente abrem Hoje, inclusive quando a sessão começou pela Agenda; o teste de regressão cobre esse caminho.

# Cadência — varredura e melhorias

Data: 13/11/2026. Revisão com Superpowers, investigação por reprodução, testes de regressão e duas revisões independentes. A interface existente foi preservada.

## Resultado

Implementada a retirada reversível de treinos pausados. Confirmar retira a sessão e suas séries de Hoje, Agenda, Evolução e referências de carga. Desfazer ou Treinos retirados restaura os mesmos registros. Não é exclusão definitiva; os dados continuam no backup e na conta. Restaurar não reativa um prazo de descanso antigo.

## Problemas confirmados e corrigidos

| Área | Problema e impacto | Correção |
|---|---|---|
| Importação | Um UUID de outro tipo podia substituir o conteúdo de um registro, quebrando a ficha. Um erro no meio também podia deixar uma importação parcial. | Validação de todo o arquivo e gravação local atômica; tipos e identidades imutáveis. |
| Relações dos registros | Sessão com ID interno diferente do registro, séries sem sessão/exercício e duplicatas podiam deixar dados invisíveis ou inconsistentes. | Checagem de identidade e vínculos antes de qualquer gravação. |
| Limpeza | Lote acima de 10.000 alterações podia ser aplicado localmente e recusado pelo servidor, deixando sincronização presa. | Rejeição antes de alterar os dados; orientação para reduzir o período. |
| Dados inválidos | Motivo de exercício pulado como objeto quebrava a renderização; números em texto podiam passar e prejudicar o aquecimento. | Validação dos tipos e retorno seguro para estruturas malformadas. |
| Acesso | Uma saída de conta disparada externamente podia deixar a tela em preparação permanente. | Estado de conta limpo, permitindo voltar ao login e entrar novamente. |
| Histórico concluído | Reabrir e finalizar de novo alterava a data de conclusão; corrigir uma série iniciava descanso de um treino antigo. | Correção de séries existentes sem cronômetro, pulo ou nova finalização; data original preservada. |
| Mensagens de erro | Falhas de pular/finalizar/limpar apareciam atrás da janela aberta. | Erros exibidos dentro da janela em que ocorreu a ação. |
| Editor | Sair da ficha descartava mudanças sem aviso. | Confirmação ao mudar de área e aviso ao recarregar; alterações feitas durante um salvamento continuam marcadas como não salvas. |
| Acessibilidade | Dias do calendário não informavam data/estado e exercícios expansíveis não anunciavam abertura. | Datas completas, estado selecionado/registrado e expansão associados aos controles. |
| Sessão retirada | Uma tela aberta em outro aparelho poderia continuar exibindo formulários da sessão retirada. | Tela segura de retorno, bloqueio de novas alterações locais e restauração protegida contra mudanças concorrentes. |
| Glisse | Atualizações alheias à navegação podiam provocar trabalho visual desnecessário. | Propriedades estáveis e navegação memorizada; crescimento da lente e refração mais contidos. Nenhuma modificação interna no pacote. |

## Verificações e evidências

- 40 testes automatizados de regras e persistência: todos passaram, com novos testes que falharam antes das correções.
- Navegador Chrome isolado: retirada, desfazer, recarregar/restaurar, séries preservadas, evolução sem dados retirados e prazo antigo removido; confirmação de saída do editor; saída externa de conta.
- Suíte focada: histórico preserva conclusão, erros visíveis nos diálogos, bloqueio de sessão arquivada, editor anuncia mudanças e preserva alterações feitas durante salvamento.
- Regressões de troca de treino, Agenda e cardio; telas móveis e desktop, claro/escuro e preferência de movimento reduzido.
- RLS ativa nas cinco tabelas verificadas; funções do agendador e do cofre sem execução por usuário comum/anônimo. Cron de notificações ativo, última execução consultada com sucesso.
- Auditoria de dependências sem vulnerabilidades conhecidas na consulta desta revisão.

## Recomendações ainda abertas

1. **Rascunho automático recuperável do editor — prioridade alta.** O aviso evita saídas acidentais, mas o sistema do iPhone pode encerrar a página. Salvar o rascunho local por conta e oferecer recuperar/descartar reduziria essa perda. Complexidade média.
2. **Desfazer ou retirar uma série lançada por engano — alta.** Hoje é possível corrigir valores; remover só a série, com desfazer, seria mais rápido. Complexidade média, com atenção à identidade entre aparelhos.
3. **Limpeza grande retomável — média.** Dividir o histórico em lotes com progresso e recuperação, em vez de apenas bloquear lotes grandes. Complexidade alta por envolver sincronização e conflitos.
4. **Resumo de conclusão e visão dos exercícios — média.** Mostrar concluídos/pendentes/pulados e permitir saltar diretamente para um exercício. Complexidade média.
5. **Navegação por endereço e botão Voltar — média.** Representar a área atual no endereço e gerenciar foco após navegar, preservando a ficha em edição. Complexidade média.
6. **Comparação por séries e repetições na evolução — média.** Complementar carga máxima com a última sessão comparável; não transformar toda diferença de carga em prova de progresso. Complexidade média.
7. **Otimização com histórico extenso — média.** Indexar sessões/séries e separar o relógio do restante da tela. Há oportunidades no código, mas não foi demonstrado travamento em uso real. Primeiro medir com uma base grande.
8. **Identidade única de perfil/ficha no primeiro acesso offline de dois aparelhos — endurecimento futuro.** Evitar duplicação na criação inicial simultânea. Complexidade média/alta; não é uma falha reproduzida nesta varredura.

## Avisos do serviço e limites da revisão

O Supabase continua apontando dois avisos preexistentes: [pg_net registrado no schema public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) e [proteção opcional de senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Não foi feita alteração arriscada na extensão ativa nem habilitado recurso possivelmente condicionado ao plano.

Esta revisão não equivale a um teste de invasão ou garantia de ausência de erros. Não foram testados um iPhone físico, VoiceOver, entrega física de push, encerramento forçado pelo iOS ou anos de dados reais. O cancelamento remoto de um descanso ao retirar é uma tentativa no aparelho atual; um aviso já enviado ou sem conexão pode não ser recolhido. Os testes de interface usaram dados fictícios, sem apagar ou modificar seu histórico pessoal.

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
| Glisse | Atualizações alheias à navegação podiam provocar trabalho visual desnecessário. | Propriedades estáveis e navegação memorizada, limites baseados na largura real e desmontagem quando invisível; óptica e gestos preservados. Nenhuma modificação interna no pacote. |

## Verificações e evidências

- 40 testes automatizados de regras e persistência: todos passaram, com novos testes que falharam antes das correções.
- Navegador Chrome isolado: retirada, desfazer, recarregar/restaurar, séries preservadas, evolução sem dados retirados e prazo antigo removido; confirmação de saída do editor; saída externa de conta.
- Suíte focada: histórico preserva conclusão, erros visíveis nos diálogos, bloqueio de sessão arquivada, editor anuncia mudanças e preserva alterações feitas durante salvamento.
- Regressões de troca de treino, Agenda e cardio; telas móveis e desktop, claro/escuro e preferência de movimento reduzido.
- RLS ativa nas cinco tabelas verificadas; funções do agendador e do cofre sem execução por usuário comum/anônimo. Cron de notificações ativo, última execução consultada com sucesso.
- Auditoria de dependências sem vulnerabilidades conhecidas na consulta desta revisão.

## Melhorias implementadas nesta continuação

As oito recomendações foram implementadas: rascunho recuperável por conta; retirada/desfazer série; limpeza em lotes retomáveis com restauração local do último lote confirmado; resumo e lista dos exercícios; URLs e Voltar/Avançar; comparação de séries/reps/RIR; índice de histórico e relógio isolado; identidade estável para novos perfis/fichas por conta.

O treino foi dividido em aquecimento, série válida e descanso, cada um em tela própria. Os campos móveis foram compactados e arredondados; teclado numérico, seleção ao tocar e Enter da carga para repetições aceleram a entrada. As setinhas foram mantidas conforme pedido final.

Novos erros corrigidos na revisão cruzada: importação que removeria exercícios ainda usados por séries; preferência ou série editada remotamente durante um formulário aberto; cache de etapa malformado; criação de perfil fora da identidade estável ao confirmar barra; repetição de alarme entre retomada/timeout; descanso cancelado voltando após restaurar uma sessão; bloqueio silencioso de atualização do armazenamento por aba antiga.

Verificação atual: 63 testes Node passaram. Suítes de navegador cobrem etapas completas, entrada pelo teclado, retomada, retirada/desfazer, conflitos, rascunho, navegação, limpeza/recuperação, Glisse e reabertura offline. Larguras de 320 a 1440px foram verificadas nas jornadas pertinentes; não se detectou rolagem horizontal nas seis larguras do fluxo principal. Consultar VERIFICACAO.md para limites.

## Avisos do serviço e limites da revisão

O Supabase continua apontando dois avisos preexistentes: [pg_net registrado no schema public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) e [proteção opcional de senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Não foi feita alteração arriscada na extensão ativa nem habilitado recurso possivelmente condicionado ao plano.

Esta revisão não equivale a um teste de invasão ou garantia de ausência de erros. Não foram testados um iPhone físico, VoiceOver, entrega física de push, encerramento forçado pelo iOS ou anos de dados reais. O cancelamento remoto de um descanso ao retirar é uma tentativa no aparelho atual; um aviso já enviado ou sem conexão pode não ser recolhido. Os testes de interface usaram dados fictícios, sem apagar ou modificar seu histórico pessoal.

## Revisão integral — 13/11/2026

Escopo: Hoje, Agenda, Evolução, Meu treino, Instalar, Ajustes, login/recuperação, aquecimento, série, descanso, lista, registros, resumo, diálogos, mensagens e notificações. Mantidos preto/branco, Manrope, C aprovado, setas e óptica/gestos do Glisse.

A consolidação removeu 116 regras obsoletas de 25 classes de versões anteriores e 24 declarações duplicadas. Estilos globais passam por módulos com precedência explícita. Os três componentes de etapa do treino foram separados do controlador da sessão. Carga/reps continuam lado a lado, com 52px mínimos e teclado numérico; altura acompanha ampliação do texto.

Melhorias: títulos longos de treino não competem com Trocar treino; campos e ações consistentes; tipografia móvel mais legível; Agenda prioriza leitura com datas editáveis recolhidas; Evolução mostra 20 séries por página, mantendo todo o histórico; erros do editor ficam próximos do comando de salvar. Diálogos preservam foco de teclado e bloqueiam a rolagem externa enquanto abertos.

Falhas reproduzidas e corrigidas: seletor nativo WebKit aumentava a largura da Agenda em 320px; texto ampliado estourava a faixa de demonstração e a grade do calendário; abas ficavam com largura anterior durante mudança de viewport; voltar rapidamente ao editor após aceitar descarte mantinha a edição local. As correções têm verificações de regressão.

Glisse: resposta da seleção separada da montagem pesada da nova tela. A montagem aguarda flags reais de término da mola; navegação cancelada nunca monta uma rota antiga. A largura usa o contêiner e suas áreas seguras, sem medições posteriores por ResizeObserver. Não foram reduzidos raio/refração para mascarar o custo. Medições de laboratório e limitações ficam em FRONTEND_REVISAO.md.

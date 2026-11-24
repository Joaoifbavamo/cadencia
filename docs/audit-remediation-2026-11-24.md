# Revisão do Cadência — 24/11/2026

Esta entrega aplica as correções da auditoria e conclui o registro rápido de cardio e abdômen. Mantém temas claro/escuro, navegação sólida animada e uso privado com sincronização.

| Item | Correção |
| --- | --- |
| A01 | Confirmações atrasadas não regridem versões, exclusões ou alterações em andamento. |
| A02 | Campo de carga vazio exige correção; nunca é substituído silenciosamente pela sugestão. |
| A03 | O aquecimento intermediário `bridge` sobrevive à recuperação do rascunho da ficha. |
| A04 | Limite preventivo por registro e validação atômica. Registro antigo grande não bloqueia a sincronização dos demais. |
| A05 | Importações normalizam ficha e perfil ao registro ativo, sem criar múltiplos padrões. |
| A06 | Resumos guardam a identidade dos treinos removidos; restaurações descontam somente treinos conhecidos. Legados ambíguos são bloqueados com orientação. |
| A07 | Identidades repetidas na mesma ficha ou sessão são rejeitadas. O mesmo exercício pode existir em dias diferentes. |
| A08 | Rascunhos de séries persistem por conta, sessão, exercício e índice. Alterações remotas preservam o rascunho e exigem conferência. |
| A09 | Retomar exercício pulado remove o estado de pulado com conferência da versão atual; consulta ao histórico não altera a sessão. |
| A10 | Recuperação de senha tem saída para login e opção de pedir novo link, com espera e tratamento de erros. |
| A11 | Datas exibem o ano, inclusive em gráficos e histórico. |
| A12 | Agendar e cancelar avisos de descanso usam fila e invalidação por geração. |
| A13 | Envio processa até cinco avisos, revalida prazo e preferências, e protege a finalização contra trabalhador antigo. |
| A14 | Atualizações apenas de status preservam a referência dos documentos e reutilizam o índice de histórico. Compatibilidade com abas antigas mantida. |
| A15 | Testes aguardam a demonstração pronta e escolhem treino sem depender do dia da semana. |
| A16 | Séries ficam agrupadas por sessão e ordenadas pelo instante real; histórico mostra nome e horário da sessão. CSV respeita a mesma ordenação. |

Cardio tem atalhos de duração. Abdômen pode ser registrado sem inventar minutos e, opcionalmente, com exercícios, séries e repetições. Agenda e Hoje usam o mesmo formulário, com proteção contra duplicação e alteração remota.

O pacote de publicação conserva os arquivos da versão atual e anterior para clientes em atualização. A limpeza fica restrita a arquivos gerados; documentos e PDFs são preservados.

## Validação da entrega

115 testes automáticos; 16 suítes de interface no Chrome mais a regressão específica de série/rascunho/retomada; cinco suítes no WebKit; instalação, cronômetro e primeira reabertura offline; barra animada com limitação de CPU. Compilação de produção e teste isolado do pacote de publicação aprovados. As verificações de segurança do worker confirmam que as operações de autorização/finalização não estão disponíveis ao cliente autenticado e rejeitam trabalhos inexistentes.

## Limites da verificação

Testes de navegador incluem Chrome e WebKit; isso não substitui a confirmação de entrega de notificação em iPhone físico. Notificação já aceita pelo provedor não pode ser revogada; uma interrupção durante o envio ainda pode gerar repetição na tentativa seguinte. O serviço não promete entrega exatamente uma vez.

Não houve contratação de plano pago, migração da extensão `pg_net` ou remoção de índices apenas por estarem sem uso. Cabeçalhos que dependem do servidor continuam sujeitos às limitações do GitHub Pages. Não há garantia de ausência absoluta de defeitos.

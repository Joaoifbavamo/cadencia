# Cadência — revisão integral do frontend

Data: 13/11/2026. Identidade preservada: preto, branco, Manrope local e Liquid Glass Glisse. Nenhuma ficha, carga ou informação pessoal foi alterada.

## O que foi organizado

- CSS separado em base, estrutura, telas, acesso, adaptação e superfícies de vidro. Removidas 116 regras obsoletas de 25 classes e 24 declarações repetidas.
- Aquecimento, registro e cronômetro têm componentes próprios; apenas a etapa ativa aparece. Campos continuam compactos e lado a lado.
- Títulos longos, botões, campos, mensagens, temas e espaçamentos seguem padrões comuns em Hoje, Agenda, Evolução, Meu treino, Instalar e Ajustes.
- Agenda mostra primeiro o registro e recolhe a edição das datas. Evolução mantém todo o histórico, exibindo 20 séries por página com Mais recentes/Mais antigos.
- Diálogos mantêm o foco de teclado e bloqueiam a rolagem da página enquanto abertos. Ampliação do texto e áreas seguras foram verificadas.

## Liquid Glass e transição de abas

A lente, a refração e o gesto originais permanecem. Foram retirados os limites menores de crescimento/refração da revisão anterior. A seleção responde imediatamente; a montagem da nova tela aguarda as flags reais de término da mola. Trocas rápidas e Voltar cancelam a rota pendente, preservando a seleção correta. A largura das abas acompanha o contêiner no mesmo cálculo de layout, sem uma medição posterior em JavaScript.

Um cenário de reprodução, com histórico extenso e CPU limitada a 4×, registrou bloqueio de 1.278 ms e intervalo de quadro de 1.335 ms ao montar 273 linhas da Evolução. A lista foi limitada a 20 linhas por página e sua montagem passou a ocorrer depois da animação de seleção. O teste verifica essa ordem e a preservação da mesma instância do vidro; não confunde uma média de quadros com prova de fluidez física.

## Falhas encontradas e corrigidas

| Falha | Correção verificada |
|---|---|
| Agenda ampliava a largura no WebKit com nome longo no seletor | Campo com largura limitada e aparência consistente; o seletor continua usando o menu nativo. Reprodução passou de 363 para 320 px de área de rolagem em viewport de 320 px. |
| Barra mantinha larguras anteriores após mudança de viewport | Unidades do contêiner, incluindo margens e áreas seguras; última aba permanece alinhada até a borda interna. |
| Histórico grande bloqueava a troca de aba | Paginação e separação da seleção do vidro da montagem da tela. |
| Retorno rápido ao editor mantinha uma edição cujo descarte havia sido aceito | Reinicialização da instância na confirmação da navegação; recusa, retorno rápido e Voltar têm testes próprios. |
| Texto ampliado ultrapassava a faixa da demonstração, calendário e configurações | Quebra de linhas, grades com mínimos adequados e controles adaptáveis. |
| Fusão de estilos compactos eliminava propriedades do par carga/repetições | Fusão por propriedade, preservando grade, dimensões, peso e numerais tabulares. Revisão independente conferiu as declarações. |

## Verificações

- 64 testes de regras e persistência passaram.
- 13 suítes de interface passaram no Chrome: treino completo, correção/retirada/desfazer, rascunhos, navegação, descarte durante movimento, preferências, limpeza/recuperação, histórico, troca de treino, cardio e notificações.
- Duas suítes adicionais passaram no WebKit: gestos e limites do vidro, e matriz integral de telas.
- A matriz percorreu 19 superfícies/estados nos temas claro e escuro, oito larguras de 320 a 1440 px e texto ampliado a 200% nas áreas principais. Nenhuma violação foi apontada pelos critérios automatizados WCAG A/AA selecionados; nenhuma rolagem horizontal da página ou erro de execução foi detectado nessa matriz.
- A tabela de dados pode ter rolagem interna com texto muito ampliado, preservando as colunas; a página permanece dentro da largura disponível.
- Revisão independente reproduziu as corridas de navegação, testou CPU limitada e aprovou as correções. Auditoria de dependências: zero vulnerabilidades na consulta.

Essas verificações usam demonstração isolada. Não equivalem a certificação WCAG, teste em iPhone físico, entrega de push no aparelho, verificação de todos os cenários possíveis ou garantia de FPS.

## Referências consultadas e aplicação

| Referência | Aplicação |
|---|---|
| [Apple — Materials](https://developer.apple.com/design/human-interface-guidelines/materials) | Vidro como camada funcional de navegação; campos e conteúdo legíveis. |
| [Apple — Layout](https://developer.apple.com/design/human-interface-guidelines/layout) | Adaptação às larguras, áreas seguras e organização da informação. |
| [Apple — Motion](https://developer.apple.com/design/human-interface-guidelines/motion) | Resposta imediata e continuidade do movimento, com alternativa de acessibilidade. |
| [Apple — Disclosure controls](https://developer.apple.com/design/human-interface-guidelines/disclosure-controls) | Manutenção das setas e abertura progressiva de opções secundárias. |
| [WAI — Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | Verificação em 320 px e ampliação de texto. |
| [WAI — Target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | Conferência de alvos de toque e espaçamento. |
| [WAI — Modal dialogs](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Foco, fechamento e interação restrita à janela aberta. |
| [WAI — Labels](https://www.w3.org/WAI/tutorials/forms/labels/) | Rótulos persistentes e nomes compreensíveis para os controles. |
| [Material — Text fields](https://m3.material.io/components/text-fields/guidelines) | Campo compacto com rótulo, unidade, valor e estado de foco. |
| [Hevy — Log & Track Workouts](https://www.hevyapp.com/features/track-workouts/) | Hierarquia do registro e referência da carga anterior. Página e captura visual inspecionadas. |
| [Strong](https://www.strong.app/) | Prioridade da tarefa de registrar; conteúdo secundário fora do caminho principal. Página e captura visual inspecionadas. |
| [React Bits](https://reactbits.dev/get-started/index) | Referência de componentes e movimento; preservado o fluxo de uma etapa por vez. |
| [Glisse — fonte oficial](https://github.com/0kzh/glisse) | Investigação do controlador de mola, dimensões, flags e renderização óptica da versão 0.6.0 instalada. |

## Como repetir

`npm test`, `npm run test:ui`, `npm run test:webkit` e `npm run test:motion`. Para o teste de produção: gerar o build e executar `npm run test:production`. As capturas e relatórios de novas execuções ficam em test-results; nenhuma credencial pessoal é necessária.

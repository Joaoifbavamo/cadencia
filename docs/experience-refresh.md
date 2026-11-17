# Experiência do Cadência

Evolução da interface existente para uso com uma mão no iPhone e edição no computador. Manter preto/branco, tema escuro, fontes locais, barra opaca animada, setas de expansão e fluxo aquecimento → séries → descanso. A ficha privada e snapshots históricos permanecem intactos.

## Entrega

- Hierarquia, espaços, controles e cabeçalhos consistentes em Hoje, treino guiado, Agenda, Evolução, Meu treino, instalação, login e Ajustes.
- Ajustes com três áreas: Geral, Alertas e Dados. Preservar campos ao trocar de área; mostrar pendências e conflitos sem afirmar sincronização antes da confirmação. Exportar CSV com nomes e datas legíveis e proteção contra fórmulas.
- Hoje com quantidade de exercícios/séries e próximo treino previsto. Nenhuma estimativa de resultado ou carga inventada.
- Agenda com resumo do mês, acesso direto a uma data e atalhos de atividade que preenchem somente o nome; duração precisa ser informada.
- Editor com navegação pelos dias, contagem de séries e exportação somente da ficha.
- Evolução com busca por exercício e resumo dos registros comparáveis no período, mantendo filtros, gráficos, histórico e CSV.
- Registro de série com ajustes rápidos de carga por incremento configurado; repetições e RIR continuam manuais.
- Instalação com rotas de instalação mais fáceis de distinguir. Login mantém autenticação existente.

## Implementação e validação

Implementar primeiro funções puras e controles reutilizáveis; depois integrar as telas e estilos nos módulos responsáveis. Sem nova dependência nem alteração de esquema ou segurança. Testar datas, contagens, limites numéricos, exportação, rascunhos e navegação. Fazer inspeção visual conjunta em celular/desktop, claro/escuro e texto ampliado; corrigir em lote e confirmar. Rodar revisão independente, testes de interface, offline e publicação no destino existente.

## Resultado verificado

77 testes de lógica, 15 suítes de interface em Chrome e 4 em WebKit passaram. A auditoria cobriu 21 superfícies, temas claro/escuro, larguras de 320 a 1440 px e texto ampliado. A revisão independente levou a dois ajustes: incluir contagens preservadas em resumos mensais e validar o arquivo da ficha antes da exportação. Dados privados, controle de conflitos e cópias históricas não foram alterados. Testes automatizados em WebKit não representam teste físico em iPhone.

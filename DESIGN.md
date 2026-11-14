---
name: Cadência
description: Diário privado de treino, monocromático, com entrada rápida e Liquid Glass funcional.
colors:
  bg: '#ffffff'
  surface: '#ffffff'
  surface-alt: '#f4f4f4'
  ink: '#161616'
  muted: '#595959'
  line: '#dddddd'
  line-strong: '#8b8b8b'
  dark-bg: '#0b0b0b'
  dark-surface: '#111111'
  dark-surface-alt: '#1b1b1b'
  dark-ink: '#f2f2f2'
  dark-muted: '#b4b4b4'
typography:
  headline:
    fontFamily: '"Manrope Variable", Manrope, sans-serif'
    fontSize: 'clamp(2rem, 3.3vw, 2.8rem)'
    fontWeight: 750
    lineHeight: '1.13'
  headline-mobile:
    fontSize: '1.75rem'
    fontWeight: 700
  title:
    fontSize: '1.25rem'
    fontWeight: 750
    lineHeight: '1.3'
  body:
    fontSize: '16px'
    lineHeight: '1.6'
  label:
    fontSize: '.875rem'
    fontWeight: 650
  caption:
    fontSize: '.75rem'
  numeric-entry:
    fontSize: '1.5rem'
    fontWeight: 600
rounded:
  control: '12px'
  numeric-field: '12px'
  action-guided: '14px'
  home-panel: '22px'
  glass-nav: '30px'
  dialog-desktop: '8px'
  dialog-mobile: '26px 26px 0 0'
spacing:
  field-gap: '12px'
  mobile-gutter: '20px'
  desktop-gutter: '52px'
components:
  input:
    minHeight: '48px'
    rounded: '{rounded.control}'
    backgroundColor: '{colors.surface}'
  numeric-field:
    minHeight: '52px'
    rounded: '{rounded.numeric-field}'
  button:
    minHeight: '48px'
    rounded: '{rounded.control}'
---

# Design System: Cadência

Interface operacional para registrar o treino com uma mão, entre séries. Preto, branco e cinzas neutros, Manrope local e símbolo C aprovado. A prioridade é reconhecer a próxima ação e registrar carga/repetições rapidamente.

## Fontes normativas

Tokens comuns em tokens.css. styles.css define a ordem dos módulos base, shell, screens, auth, adaptive e surfaces-and-glass. Componentes com geometria própria usam guided-workout.css, mobile-navigation.css e progress-history.css. Alterar o módulo responsável em vez de acrescentar correções globais sucessivas.

## Estrutura e hierarquia

Desktop usa navegação lateral; celular usa cabeçalho compacto e cinco destinos no Glisse. Ajustes ficam no cabeçalho. Conteúdo respeita as áreas seguras e tem largura mínima zero nos elementos flex/grid que precisam encolher.

Títulos, campos e ações seguem uma hierarquia comum. Títulos longos de treino ocupam a largura disponível; Trocar treino aparece separado no celular. Informações secundárias ficam em seções recolhíveis, mantendo as setas conforme orientação do usuário. Mensagens de erro aparecem na área da ação ou no diálogo ativo.

Agenda privilegia leitura, com Alterar datas recolhível. Evolução compara as últimas sessões compatíveis e pagina as séries em lotes de 20, preservando todo o histórico. O editor informa alterações pendentes e recuperação de rascunho; a confirmação de descarte permanece válida mesmo com retorno rápido durante a navegação.

## Entrada e ações

Rótulos permanecem visíveis. Campos comuns têm 48 px mínimos, raio 12 px, borda de 1 px e fonte de 16 px; foco usa contorno de tinta. Seletores mantêm o menu nativo, com a apresentação fechada limitada ao espaço disponível e seta monocromática.

Carga e repetições aparecem lado a lado em colunas minmax(0,1fr), com mínimo de 52 px, numerais tabulares e altura adaptável ao texto. Tocar seleciona o valor; teclado decimal/numérico e Enter da carga para repetições aceleram a entrada. RIR permanece opcional. A ação Salvar série e descansar é única e explícita.

Botão principal inverte tinta/papel; secundário usa contorno; ações de texto têm alvo mínimo de 44 px. Desabilitado preserva a indicação de estado. Alterações são salvas com confirmação honesta, sem inventar resultados ou registros.

## Treino guiado

Aquecimento → uma série válida → descanso → próxima etapa. Aquecimento, formulário, relógio, registros, lista e resumo têm telas próprias; só a etapa ativa permanece montada. O relógio é isolado do controlador para não redesenhar a ficha a cada segundo.

A tela de descanso usa círculo de progresso, numerais grandes e ícone separado de 22 px. Som tem teste explícito e respeita limitações da plataforma. Sessões concluídas permitem corrigir séries existentes sem alterar a conclusão ou criar um novo descanso.

## Liquid Glass e movimento

Usar Glisse 0.6.0 original para a camada funcional de navegação. Preservar lente, refração, crescimento, mola e drag. Conteúdo e campos permanecem opacos. A largura das abas deriva do contêiner no próprio layout, incluindo margens/áreas seguras.

A seleção responde imediatamente; a montagem da próxima tela aguarda as flags reais de término da mola. Trocas rápidas substituem a rota pendente; Voltar e cancelamento preservam seleção, edição e foco. A navegação é desmontada quando invisível, durante treino, em desktop e em segundo plano.

Movimento/transparência reduzidos e maior contraste recebem alternativa estática. Transições de etapa usam deslocamento curto sem bounce; a abertura em modo app mantém a marca aprovada. Não adicionar animações aos campos ou atrasos fixos para disfarçar trabalho pesado.

## Janelas, temas e acessibilidade

Diálogos usam a camada nativa, foco restrito enquanto abertos, retorno ao controle de origem e rolagem externa bloqueada. O cabeçalho de fechamento permanece acessível em altura reduzida. Tema claro/escuro/sistema usa os mesmos papéis semânticos; erro, seleção e sincronização têm texto, não dependem só de cor.

Verificar larguras de 320 a 1440 px, claro/escuro, ampliação de texto, teclado, estados vazios e preenchidos, carregamento, erro e recuperação. A tabela pode preservar rolagem interna quando texto ampliado exigir, sem ampliar a página. Não alegar teste físico, entrega de push ou FPS de iPhone sem evidência.

Referências, medições e limitações em [FRONTEND_REVISAO.md](FRONTEND_REVISAO.md).

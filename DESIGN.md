---
name: Cadência
description: Diário privado de treino em preto, branco e cinzas neutros.
colors:
  bg: "#ffffff"
  surface: "#ffffff"
  surface-alt: "#f4f4f4"
  ink: "#161616"
  ink-hover: "#333333"
  muted: "#595959"
  placeholder: "#727272"
  line: "#dddddd"
  line-strong: "#8b8b8b"
  dark-bg: "#0b0b0b"
  dark-surface: "#111111"
  dark-surface-alt: "#1b1b1b"
  dark-ink: "#f2f2f2"
  dark-ink-hover: "#d5d5d5"
  dark-muted: "#b4b4b4"
  dark-placeholder: "#999999"
  dark-line: "#383838"
  dark-line-strong: "#777777"
typography:
  headline:
    fontFamily: '"Manrope Variable", Manrope, sans-serif'
    fontSize: "clamp(2rem, 3.3vw, 2.8rem)"
    fontWeight: 750
    lineHeight: "1.13"
    letterSpacing: "-0.035em"
  title:
    fontFamily: '"Manrope Variable", Manrope, sans-serif'
    fontSize: "1.25rem"
    fontWeight: 750
    lineHeight: "1.3"
    letterSpacing: "-0.025em"
  body:
    fontFamily: '"Manrope Variable", Manrope, sans-serif'
    fontSize: "16px"
    lineHeight: "1.6"
  label:
    fontSize: "0.83rem"
    fontWeight: 650
  headline-mobile:
    fontSize: "1.625rem"
    fontWeight: 700
  control-mobile:
    fontSize: "0.9375rem"
  caption:
    fontSize: "0.75rem"
  exercise-mobile:
    fontSize: "1.625rem"
    fontWeight: 700
    lineHeight: "1.25"
    letterSpacing: "-0.035em"
  series-number-mobile:
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: "1.1"
    letterSpacing: "-0.025em"
rounded:
  square: "0"
  compact: "4px"
  control: "5px"
  dialog: "8px"
  field-soft: "12px"
  action-soft: "12px"
  home-panel: "22px"
  glass-nav: "30px"
  sheet-mobile: "12px 12px 0 0"
spacing:
  field-gap: "8px"
  button-gap: "12px"
  mobile-gutter: "24px"
  desktop-gutter: "52px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
    rounded: "{rounded.control}"
    padding: "13px 20px"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "13px 20px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 13px"
  workout-panel:
    padding: "27px 0 24px"
---

# Design System: Cadência

## Overview

**Creative North Star: "Editorial direto"**

Editorial direto: diário privado, claro e operacional. Preto, branco e cinzas neutros organizam a leitura; o símbolo C e a Manrope local dão identidade sem competir com o registro.

A sessão mostra uma série de cada vez. Nome específico do exercício, prescrição e campos grandes conduzem à ação Salvar série. Rótulos explícitos, divisores e espaço substituem ornamentos; informação complementar permanece recolhível.

**Key Characteristics:**
- Contraste monocromático em claro, escuro e automático.
- Manrope variável local e títulos de peso 750.
- Registro com campos numéricos suaves e ação principal clara.
- Profundidade funcional na navegação móvel e nos diálogos.

## Colors

Paleta estritamente neutra. O frontmatter extrai os valores normativos de src/tokens.css; dark-* registra os overrides do tema escuro.

### Primary
- **Tinta:** texto principal, ação sólida, seleção e foco. ink-hover é a resposta da ação primária ao ponteiro.
- **Papel:** fundo e texto invertido nas ações sólidas. surface sustenta campos e diálogos.

### Neutral
- **Papel secundário:** surface-alt separa avisos, descanso e seleção discreta.
- **Texto secundário e placeholder:** muted e placeholder estabelecem hierarquia.
- **Divisores:** line delimita seções; line-strong define campos e contornos de controles.

**The Neutral Contrast Rule.** Estado é comunicado por texto, traço, peso ou preenchimento; não requer cor de destaque.

A preferência por maior contraste reforça divisores e texto secundário; seus overrides e as transparências do diálogo estão no sidecar.

## Typography

**Display Font / Body Font:** Manrope Variable, Manrope, sans-serif. WOFF2 latino local de @fontsource-variable/manrope, pesos 200–800 e font-display: swap. O fallback sans-serif é contingência.

A hierarquia está no frontmatter. O título do exercício usa 1.9rem, peso 700 e entrelinha 1.22 no desktop; até 760 px usa 1.625rem e entrelinha 1.25. Números dos campos usam 2.25rem. Texto corrido tem largura máxima de 70ch. Prescrição, duração e registro usam números tabulares. Marca usa peso 800 com ajustes por contexto.

**The Local Type Rule.** Novas superfícies herdam a Manrope local; não carregam a fonte remota do mock.

## Layout

Desktop: menu fixo de 232 px, cabeçalho até 1100 px e conteúdo até 1010 px; respiro principal de 24 px acima e 70 px abaixo. Até 1050 px o menu passa a 205 px e o gutter a 32 px.

Até 760 px, cabeçalho e navegação inferior substituem o menu. Conteúdo recebe 27 px acima e 115 px abaixo. Safe areas protegem os extremos. Até 360 px, gutter de 20 px. Na sessão, navegação principal fica oculta e a base recebe 30 px mais safe area.

A sessão tem largura máxima de 690 px: uma barra com voltar, treino, posição e duração; exercício, prescrição compacta e aquecimento recolhível. Carga e repetições ocupam duas colunas iguais com gap de 12 px. Salvar série ocupa a largura e tem mínimo de 54 px. RIR opcional fica recolhido; quando já registrado, abre para edição. Ver séries reúne seleção e edição, sem uma segunda fileira de indicadores. Esta composição descreve a superfície de treino, sem obrigar outras telas a repeti-la.

## Elevation & Depth

Conteúdo opaco e neutro. No celular, navegação flutuante, cabeçalho fixo e diálogo usam uma adaptação web de Liquid Glass: superfície translúcida regular, blur de 24px e saturação de 1.25. A barra inferior tem sombra deslocada e borda luminosa; não há refração nativa ou vidro sobre os campos de registro. Sem suporte ao filtro, os fundos permanecem opacos. Redução de transparência ou maior contraste removem o blur e usam superfície sólida. O diálogo usa a sombra estrutural 0 20px 80px var(--shadow), scrim por tema e desfoque de 3 px. A preferência por transparência reduzida remove o desfoque. CSS completo está no sidecar.

**The Flat Work Surface Rule.** A área de trabalho mantém conteúdo opaco; elevação identifica a camada funcional de navegação e diálogo.

## Shapes

Controles gerais mantêm cantos curtos; campos e ações principais do fluxo móvel usam 12 px, conforme frontmatter. Campos grandes de carga e repetições têm fundo surface-alt, raio de 12 px e nenhum divisor inferior. Divisores têm 1 px. Diálogo central no desktop e encostado na base no celular, com arredondamento somente acima. Círculos de estado e cantos do ícone instalado são usos específicos.

## Components

### Buttons
Ação principal sólida, tinta e papel invertidos; secundária transparente com contorno forte. Peso 750, mínimo de 50 px. Hover da secundária usa surface-alt. A ação de perigo usa o mesmo contraste e texto explícito. Pressionar desloca 1 px para baixo; desabilitado tem opacidade 0.42. Ação de texto sublinha ao hover. Ícones gerais usam caixa de 44 × 44 px.

### Inputs / Fields
Campo comum tem altura mínima de 49 px, label acima com gap de 8 px, borda forte e placeholder próprio. Foco: contorno de tinta de 2 px, offset de 2 px. Na série, campos numéricos usam a variante do frontmatter, mínimo de 64 px dentro do label com padding 14px 16px 10px. RIR opcional abre seu campo compacto sob demanda.

### Navigation
Menu desktop tem mínimo de 50 px; ativo inverte tinta e papel. Navegação móvel tem mínimo de 48 px, rótulos e ativo em superfície secundária com peso maior. Série usa navegação própria; Ver séries abre registros e séries ainda vazias, com nomes acessíveis para editar ou selecionar.

### Cards / Containers
Painel do treino tem bordas no desktop; no celular usa espaço sem bordas. Lista de exercícios de Hoje fica recolhida. Ajustes de carga, dados e limpeza ficam em seções recolhíveis; a instalação tem um único atalho para a área própria. Avisos e erros usam superfície secundária, contorno e texto explícito; erro reforça a borda com tinta.

### Dialogs and appearance
Diálogo nativo possui título e ação Fechar. Aparência agrupa Claro, Escuro e Sistema com aria-pressed e seleção invertida. Os snippets do sidecar registram a apresentação; não substituem o comportamento React ou nativo.

### Motion and focus
Conteúdo visível por padrão. Troca de exercício desloca 6 px até zero, spring sem bounce de 0.25 s; movimento reduzido elimina deslocamento e duração. Abertura somente em standalone: 850 ms, marca de 700 ms e pointer-events: none; omitida com movimento reduzido. O CSS remove animações e transições nessa preferência. Não existe transição genérica de botões. Botões, links e summaries têm contorno de foco de 2 px, offset de 4 px. O sidecar preserva valores exatos.

## Do's and Don'ts

### Do:
- **Do** usar os tokens neutros e inverter seus papéis no tema escuro.
- **Do** identificar RIR como opcional e preservar os rótulos dos campos.
- **Do** manter foco visível, mensagens de estado e áreas seguras.
- **Do** respeitar preferências de movimento, transparência e contraste.

### Don't:
- **Don't** reintroduzir verde, fundos quentes ou fonte de sistema como identidade principal.
- **Don't** depender de cor para distinguir erro, seleção ou sincronização.
- **Don't** animar cada painel nem ocultar conteúdo até terminar uma animação.
- **Don't** declarar validação em iPhone físico ou entrega em segundo plano sem evidência.

Inspeção do código implementado comparado à escolha Editorial direto. Não certifica hardware real, instalação PWA ou entrega de notificações em segundo plano.

Refinamento móvel de 11/11/2026: usuário pediu menos poluição e aparência moderna. Mantidos preto/branco, Manrope, cinco destinos e comportamento dos dados. Referências consultadas: [ScreensDesign/Hevy](https://screensdesign.com/showcase/hevy-workout-tracker-gym-log), [Hevy — registro](https://www.hevyapp.com/features/track-workouts/). Adotados agrupamento, hierarquia e abertura progressiva; sem reproduzir telas ou adicionar recursos sociais.

Adaptação Liquid Glass de 11/11/2026: painel de Hoje opaco de raio 22px, semana com sete dias derivados da ficha e dos registros; barra móvel flutuante de raio 30px acima da safe area. Referência: [Apple HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials). Mensagens motivacionais usam editor recolhível com prévia; permanecem opcionais por aparelho.

Refinamento de 13/11/2026: navegação móvel com Glisse 0.6.0 TabBar e Trocar treino com seu Button; a seleção usa tinta neutra via --lg-fill. Glisse controla a óptica da barra; a aproximação CSS anterior permanece apenas no cabeçalho/diálogo. Navegação estática substitui o componente sob preferências de movimento/transparência reduzidos ou maior contraste. Trocar treino tem alvo mínimo de 44 px e não substitui a ação principal de iniciar/continuar. A folha da escolha mantém rótulo da data e ações explícitas.

Varredura de 13/11/2026: ação Retirar treino pausado é secundária; abre confirmação explícita e preserva dados para restauração. Desfazer e Treinos retirados são identificados por texto. Erros de ações modais ficam dentro do diálogo. O Glisse mantém controles responsivos e usa crescimento de lente 12px/8px e bend .3; instâncias da navegação evitam redesenhos por estado alheio ao menu.

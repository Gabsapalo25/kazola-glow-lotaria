# Loto 5/90 Angola · Análise Estatística

Ferramenta educativa e de entretenimento para análise estatística do **Loto 5/90** da Lotaria Nacional de Angola.

> ⚠️ **Não afiliada** à Mota & Tavares Jogos, S.A. / Lotaria Nacional de Angola nem ao ISJ.
> Os sorteios são aleatórios — nenhuma ferramenta garante acertos. **+18.**

---

## ▶️ Correr o projecto hoje (5 minutos)

### Pré-requisito único
**Node.js 18 ou superior** — se não tiver, faça download em [nodejs.org](https://nodejs.org) (botão "LTS").

### 3 comandos no terminal

```bash
# 1. Entrar na pasta do projecto
cd loto-angola

# 2. Instalar dependências (só na primeira vez, ~30 segundos)
npm install

# 3. Iniciar o servidor de desenvolvimento
npm run dev
```

Abra o browser em **http://localhost:5173** — a app está a correr!

### Para parar o servidor
`Ctrl + C` no terminal.

---

## 🏗️ Estrutura do projecto

```
loto-angola/
├── src/
│   ├── App.tsx                  ← componente principal (UI completa)
│   ├── main.tsx                 ← ponto de entrada React
│   ├── index.css                ← estilos globais + animações
│   │
│   ├── components/
│   │   ├── Ball.tsx             ← bola numerada com cores por dezena
│   │   ├── Card.tsx             ← cartão de secção reutilizável
│   │   ├── Modal.tsx            ← modal acessível (ESC para fechar)
│   │   └── PrizeCalculator.tsx  ← simulador de prémio líquido
│   │
│   ├── data/
│   │   └── history.ts           ← sorteios + constantes + estatísticas
│   │
│   └── lib/
│       ├── generator.ts         ← gerador de combinações (4 estratégias)
│       ├── officialApi.ts       ← integração API oficial (configurável)
│       └── totobola.ts          ← Totobola / prognósticos futebol
│
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

---

## ✨ Funcionalidades

| Funcionalidade | Detalhe |
|---|---|
| **Gerador inteligente** | 4 estratégias: equilibrado, frequência, Monte Carlo, aleatório |
| **Filtros** | Par/ímpar, excluir números, filtro de soma |
| **Favoritos** | Guardados em localStorage, persistem offline |
| **Frequência** | Janela configurável: 20, 60, 120 ou todos os sorteios |
| **Hot & Cold** | Top-8 mais e menos frequentes |
| **Gap analysis** | Há quantos sorteios cada número não sai |
| **Distribuição por dezena** | Gráfico de barras das 9 faixas (1-10, …, 81-90) |
| **Par/Ímpar + Soma** | Estatísticas de distribuição do histórico |
| **Probabilidades reais** | Para 2, 3, 4 e 5 acertos com C(90,5) |
| **Histórico paginado** | Todos os sorteios com data, hora, sessão, soma |
| **Totobola** | Grelha de 13 jogos do Girabola, boletim aleatório |
| **Simulador de prémios** | Cálculo bruto/imposto/líquido conforme Decreto 695/25 |
| **Tabela de multiplicadores** | Cotas fixas por opção (×4, ×25, ×120, ×2500) |
| **Acessibilidade** | Alto contraste, 3 tamanhos de letra, aria-labels, foco visível |
| **Jogo responsável** | Verificação +18, disclaimers, conselhos |

---

## 🔌 Integrar dados reais (quando disponível)

Edite **`src/lib/officialApi.ts`**:

```typescript
// Mude esta linha para true
export const HAS_OFFICIAL_API = true;

// Implemente fetchOfficialDraws() com o endpoint real
// A app faz fallback automático para dados simulados se falhar
```

A app mostra automaticamente um banner verde "dados oficiais" quando a integração funcionar.

---

## 📋 Adicionar novos sorteios manualmente

Edite **`src/data/history.ts`** e adicione no **início** do array `DRAWS`:

```typescript
{ id: '2026-125-K', date: '2026-06-06', time: '18:00', session: 'kazola', numbers: [X, X, X, X, X] },
```

Os números devem estar ordenados do menor para o maior.

---

## 🏗️ Build para produção

```bash
npm run build
# Gera pasta dist/ — pode ser servida por qualquer servidor web estático
```

---

## 📄 Base legal

- **Lei n.º 17/24**, de 28 de Outubro — Lei da Actividade de Jogos de Angola
- **Decreto Executivo n.º 695/25** — Regulamento do Jogo Loto 5/90
- **Lei n.º 22/11** — Protecção de Dados Pessoais (Angola)
- Operador: **Mota & Tavares Jogos, S.A.**
- Concessionária: **Lotaria Nacional de Angola** — [www.lotarianacional.co.ao](https://www.lotarianacional.co.ao)
- Regulador: **Instituto de Supervisão de Jogos (ISJ)**
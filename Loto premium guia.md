# Guia de Implementação — Loto 5/90 Premium
**Versão 2.0 · Trial 7 dias + Confirmação Email + Login**

---

## Visão Geral do Sistema

```
Utilizador regista → Apps Script envia email com link + password
→ Clica no link → Trial de 7 dias activado
→ Faz login na app → Acesso ao gerador ilimitado
→ Trial expira → Redirecionado para /loto-premium
→ Envia comprovativo com LOTO-XXXX → Apps Script activa por +30 dias
```

**Estados possíveis:**
| Estado | Descrição |
|---|---|
| `PENDENTE_CONFIRMACAO` | Registou mas ainda não clicou no link do email |
| `TRIAL` | Email confirmado, 7 dias de acesso grátis |
| `ATIVO` | Pagamento confirmado, acesso por 30 dias |
| `EXPIRADO` | Trial ou subscrição expirada |

---

## Passo 1 — Google Sheet

1. Vai a [sheets.google.com](https://sheets.google.com) e cria uma nova Sheet
2. Copia o **ID** da Sheet (o código longo no URL entre `/d/` e `/edit`)
3. Vais criar a estrutura automaticamente com o Apps Script (Passo 3)

---

## Passo 2 — Apps Script

1. Abre a Sheet → **Extensões → Apps Script**
2. Apaga o código existente
3. Cola o conteúdo completo de **LOTO_PREMIUM_AUTOMATION.gs**
4. No topo do ficheiro, preenche o `CONFIG`:

```javascript
const CONFIG = {
  SHEET_ID:     'COLE_AQUI_O_ID_DA_TUA_SHEET',   // ID copiado no Passo 1
  SHEET_NAME:   'LOTO_SUBSCRICOES',
  EMAIL_ADMIN:  'glowscalepro@gmail.com',
  IBAN:         'AO06 0040 0000 1859 5631 1019 4',
  BANCO:        'BAI',
  TITULAR:      'O TEU NOME COMPLETO',
  PRECO_MENSAL: '2.500 AKZ',
  TRIAL_DIAS:   7,
  PRODUTO_NOME: 'Loto 5/90 Angola — Análise Premium',
  APP_URL:      'https://loto-angola.vercel.app',  // URL da tua app
};
```

---

## Passo 3 — Criar a Sheet automaticamente

1. No Apps Script, selecciona a função `criarSheet` no dropdown
2. Clica **▶ Executar**
3. Aceita as permissões quando pedido
4. A Sheet `LOTO_SUBSCRICOES` é criada com as 10 colunas formatadas

---

## Passo 4 — Publicar o Apps Script como Web App

1. Clica em **Implementar → Nova implementação**
2. Tipo: **App da Web**
3. Configuração:
   - Executar como: **Eu** (a tua conta Google)
   - Quem tem acesso: **Qualquer pessoa**
4. Clica em **Implementar**
5. **Copia o URL** gerado (começa com `https://script.google.com/macros/s/...`)

> ⚠️ Guarda bem este URL — é o `APPS_SCRIPT_URL` que vais colocar no React.

---

## Passo 5 — Configurar trigger automático

Para que o sistema detecte os comprovativos de pagamento automaticamente:

1. No Apps Script, vai a **Gatilhos** (ícone do relógio ⏰)
2. Clica em **+ Adicionar gatilho**
3. Configuração:
   - Função: `checkEmails`
   - Origem do evento: **Baseado no tempo**
   - Tipo de gatilho: **Temporizador de minuto**
   - Intervalo: **A cada 5 minutos** (ou 15 minutos para poupar quota)
4. Guardar

---

## Passo 6 — Integrar o módulo React

### 6a. Copiar o ficheiro

Coloca `LOTO_PREMIUM_MODULE.tsx` na pasta `src/components/` do teu projecto.

### 6b. Configurar o URL

No topo do ficheiro, substitui:
```typescript
const APPS_SCRIPT_URL = 'COLE_AQUI_O_URL_DO_APPS_SCRIPT';
```
pelo URL copiado no Passo 4.

### 6c. Criar a rota /loto-premium

No teu `App.tsx` (com React Router):
```typescript
import { PremiumCheckoutPage } from './components/LOTO_PREMIUM_MODULE';

// Dentro do Router:
<Route path="/loto-premium" element={<PremiumCheckoutPage />} />
```

### 6d. Adicionar o botão no header

```typescript
import { PremiumHeaderButton } from './components/LOTO_PREMIUM_MODULE';

// No teu header:
const [showLogin, setShowLogin] = useState(false);

<PremiumHeaderButton onLoginClick={() => setShowLogin(true)} />
{showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
```

### 6e. Verificar expiração e redirecionar

No componente raiz ou no layout principal:
```typescript
import { TrialExpiredModal } from './components/LOTO_PREMIUM_MODULE';

// Dentro do componente, após o conteúdo:
<TrialExpiredModal />
```
Este componente aparece automaticamente quando o acesso expira e redireciona para `/loto-premium` após 3 segundos.

### 6f. Integrar no Gerador

No componente do gerador de linhas:

```typescript
import { usePremium, PremiumBanner } from './components/LOTO_PREMIUM_MODULE';

function Gerador() {
  const premium = usePremium();
  const [showLogin, setShowLogin] = useState(false);
  const [lines, setLines] = useState(1);

  const handleGerar = () => {
    // A geração acontece sempre (o banner é informativo)
    // O backend/lógica é que deve limitar se necessário
    gerarLinhas(lines);
  };

  return (
    <div>
      {/* Sempre mostra o banner para free — mesmo com 1 linha */}
      {!premium.isActive && (
        <PremiumBanner onLogin={() => setShowLogin(true)} />
      )}

      {/* Banner de trial — lembra de pagar */}
      {premium.isTrial && (
        <PremiumBanner
          onLogin={() => setShowLogin(true)}
          isTrial={true}
          diasRestantes={premium.diasRestantes}
        />
      )}

      {/* Input e botão do gerador */}
      <input
        type="number"
        value={lines}
        onChange={e => setLines(Number(e.target.value))}
        max={premium.isActive ? 10 : 1}
        min={1}
      />
      <button onClick={handleGerar}>Gerar</button>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => setShowLogin(false)}
        />
      )}
    </div>
  );
}
```

---

## Passo 7 — Testar o fluxo completo

### Teste 1: Registo e confirmação
1. Abre a app em `/loto-premium`
2. Preenche nome e email → clica "Começar Trial"
3. Verifica o email → deves receber o link de confirmação + password
4. Clica no link → deves ver a página de confirmação dourada
5. Faz login → estado deve ser `TRIAL` com 7 dias

### Teste 2: Detecção de pagamento
1. Toma nota do código (ex: `LOTO-0001`)
2. Envia um email para `glowscalepro@gmail.com` com assunto `LOTO-0001`
3. Aguarda até 5 minutos (trigger)
4. Faz login → estado deve passar para `ATIVO`

### Teste 3: Verificação silenciosa
1. Com sessão activa, recarrega a página
2. O hook `usePremium` deve verificar o estado no servidor automaticamente

---

## Fluxo de Renovação Mensal

O cliente recebe o código (ex: `LOTO-0001`) no primeiro email.
Todos os meses:
1. Faz a transferência de 2.500 AKZ para o IBAN BAI
2. Envia o comprovativo por email com assunto: `LOTO-0001`
3. O Apps Script detecta, soma +30 dias à expiração e envia confirmação

> O cliente **não precisa de fazer nada mais** — o código é permanente.

---

## Manutenção

### Repor password de um cliente
No Apps Script, vai a **Editor** e corre na consola:
```javascript
resetPassword('email-do-cliente@exemplo.com');
```
O cliente recebe a nova password por email automaticamente.

### Suspender acesso
Na Google Sheet, muda o STATUS da linha para `SUSPENSO`.

### Ver todos os clientes activos
Filtra a coluna STATUS por `TRIAL` ou `ATIVO`.

---

## Resumo da Arquitectura de Segurança

| Aspecto | Implementação |
|---|---|
| Passwords | Nunca guardadas em texto — só hash SHA-256 |
| Tokens de confirmação | UUID único, marcado como usado após 1 clique |
| Sessão no browser | localStorage com email + ref (sem password) |
| Verificação de acesso | Confirmada no servidor a cada login |
| Revogação | Basta mudar STATUS na Sheet |

---

*Sistema sem comissões · Pagamento directo via IBAN BAI · Processamento automático por Google Apps Script*
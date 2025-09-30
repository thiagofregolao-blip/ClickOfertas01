# Problema Identificado: Sistema V2 não exibe produtos

## Análise do Problema

### 1. **Problema Principal**
O sistema V2 não está exibindo produtos ao lado da conversa como deveria. O comportamento esperado é "Ask-then-Show" - quando o usuário digita "iPhone", deveria mostrar produtos iPhone na grid E fazer pergunta específica.

### 2. **Causa Raiz Identificada**
- O frontend (`use-assistant-chat.ts`) está fazendo chamadas para `/api/assistant/stream`
- O servidor (`server/routes.ts`) tem a implementação da rota `/api/assistant/stream` funcionando
- **PORÉM**: As rotas V2 (`src/assistant/assistantRoutes-v2.ts`) NÃO estão sendo registradas no servidor
- O servidor está usando apenas as rotas V1 (`src/assistant/assistantRoutes.ts`)

### 3. **Evidências**
1. **Frontend usa V2**: `client/src/hooks/use-assistant-chat.ts` faz fetch para `/api/assistant/stream`
2. **Servidor tem implementação**: `server/routes.ts` linha 7084 tem `/api/assistant/stream`
3. **Rotas V2 não registradas**: Não há importação de `assistantRoutes-v2.ts` no servidor
4. **Apenas V1 registrado**: Linha 8523 em `server/routes.ts` importa apenas `assistantRoutes.ts`

### 4. **Lógica de Produtos Funciona**
A lógica de busca e envio de produtos via SSE está implementada corretamente:
- Linha 7340-7350: `send('products', { products: produtosFormatados, query: finalQuery })`
- Frontend recebe produtos via SSE: `use-assistant-chat.ts` linha ~400

### 5. **Problema de Orçamento**
Também identificado código que assume orçamento padrão de 10.000 guaranis (possível memória de conversa anterior).

## Solução Necessária

1. **Registrar rotas V2** no servidor
2. **Verificar configuração** de qual versão usar
3. **Testar fluxo completo** Ask-then-Show
4. **Remover orçamento hardcoded** se existir

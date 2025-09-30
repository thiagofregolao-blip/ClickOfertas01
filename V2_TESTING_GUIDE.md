# 🧪 Guia de Testes - Sistema V2 Corrigido

## 📋 Problemas Identificados e Corrigidos

### ❌ Problemas Anteriores:
1. **V2 não mostrava produtos**: Eventos SSE (delta, emotion, complete) funcionavam, mas não havia `event: products`
2. **IA assumia 10.000 guaranis**: Memória/contexto continha valores hardcoded
3. **Ask-then-Show quebrado**: Usuário digitava "iPhone" mas não via produtos na grade

### ✅ Correções Implementadas:
1. **Busca de produtos integrada** ao intelligent-vendor V2
2. **Eventos SSE de produtos** (`event: products`) funcionando
3. **Endpoint para limpar memória** da IA
4. **Padrão Ask-then-Show** restaurado

## 🔧 Como Testar

### 1. Teste Básico de Produtos
```bash
# Abrir o sistema e digitar no chat V2:
"iPhone"
```
**Resultado esperado:**
- ✅ Produtos iPhone aparecem na grade
- ✅ IA faz perguntas sobre especificações
- ✅ Evento SSE: `event: products` com array de produtos

### 2. Teste de Diferentes Categorias
```bash
# Testar várias categorias:
"perfumes"
"Samsung Galaxy"
"notebook"
"tênis Nike"
```
**Resultado esperado:**
- ✅ Produtos da categoria aparecem na grade
- ✅ IA contextualiza a conversa com os produtos encontrados

### 3. Teste de Limpeza de Memória
```bash
# Fazer requisição POST para:
POST /api/assistant/v2/clear-memory
{
  "sessionId": "seu-session-id"
}
```
**Resultado esperado:**
- ✅ Resposta: `{ "success": true, "message": "Memória limpa com sucesso" }`
- ✅ IA não menciona mais "10.000 guaranis"
- ✅ Conversa recomeça sem contexto anterior

### 4. Verificar Logs do Navegador
Abrir DevTools → Console e procurar por:
```javascript
// Eventos SSE que devem aparecer:
event: delta     // ✅ Texto da conversa
event: emotion   // ✅ Estado emocional
event: products  // ✅ NOVO: Array de produtos
event: complete  // ✅ Fim da resposta
```

### 5. Verificar Logs do Servidor
No terminal do servidor, procurar por:
```bash
🔍 [V2] Searching products for: "iPhone"
🔍 [V2] Found 5 products for "iphone"
🛍️ [V2] Sending 5 products via SSE
```

## 🐛 Debugging

### Se produtos não aparecem:
1. Verificar se há produtos no banco com os termos buscados
2. Verificar logs: `🔍 [V2] Found X products`
3. Verificar se evento `products` está sendo enviado via SSE

### Se IA ainda menciona 10.000 guaranis:
1. Chamar endpoint de limpeza de memória
2. Recarregar a página
3. Iniciar nova conversa

### Se V2 não funciona:
1. Verificar se rotas V2 estão registradas em `routes.ts`
2. Verificar se `intelligent-vendor.ts` está sendo importado corretamente
3. Verificar logs de erro no servidor

## 📊 Métricas de Sucesso

### ✅ Teste Passou Se:
- [ ] Produtos aparecem na grade quando usuário digita nomes de produtos
- [ ] Eventos SSE incluem `event: products` com array de produtos
- [ ] IA não menciona valores hardcoded como "10.000 guaranis"
- [ ] Endpoint de limpeza de memória funciona
- [ ] Ask-then-Show pattern funciona (mostra produtos + faz perguntas)

### ❌ Teste Falhou Se:
- [ ] Usuário digita "iPhone" mas não vê produtos
- [ ] Eventos SSE não incluem `event: products`
- [ ] IA continua assumindo orçamentos específicos
- [ ] Erro 500 ao chamar endpoints V2

## 🔗 Links Úteis

- **PR com correções**: https://github.com/thiagofregolao-blip/ClickOfertas01/pull/5
- **Endpoint V2 Chat**: `POST /api/assistant/v2/chat`
- **Endpoint Limpar Memória**: `POST /api/assistant/v2/clear-memory`

## 📞 Suporte

Se os testes falharem, verificar:
1. Logs do servidor para erros
2. Logs do navegador para eventos SSE
3. Se o merge do PR foi feito corretamente
4. Se o servidor foi reiniciado após as alterações


# Vendedor Inteligente V2 - "Clique" 🤖

## Visão Geral

O Vendedor Inteligente V2 representa uma evolução significativa do assistente de vendas "Clique", incorporando inteligência emocional, memória conversacional avançada, proatividade baseada em comportamento e prompts otimizados para naturalidade.

## 🚀 Principais Melhorias Implementadas

### 1. Sistema de Memória Conversacional Avançado
- **Memória de Curto Prazo**: Mantém contexto das últimas 50 mensagens
- **Memória de Longo Prazo**: Perfil do usuário, preferências e histórico
- **Contexto Dinâmico**: Stack de contextos com relevância temporal
- **Padrões de Comportamento**: Aprendizado automático de preferências

**Arquivos**: `src/assistant/core/memory.ts`

### 2. Inteligência Emocional
- **Análise de Sentimento**: Detecta polaridade emocional (-1 a +1)
- **Detecção de Emoções**: Frustração, empolgação, incerteza, urgência
- **Adaptação de Tom**: Resposta adaptada ao estado emocional
- **Estratégias de Comunicação**: Empático, entusiasmado, consultivo

**Arquivos**: `src/assistant/intelligence/emotional.ts`

### 3. Sistema Proativo Inteligente
- **Insights Comportamentais**: Antecipa necessidades do usuário
- **Detecção de Padrões**: Busca abandonada, hesitação por preço
- **Ações Preventivas**: Intervenções baseadas em comportamento
- **Análise Preditiva**: Probabilidade de conversão e abandono

**Arquivos**: `src/assistant/intelligence/proactive.ts`

### 4. Follow-up Inteligente
- **Regras Automáticas**: 5 regras pré-configuradas
- **Agendamento Inteligente**: Baseado em comportamento e timing
- **Janelas de Tempo**: Respeitam horários apropriados
- **Múltiplas Tentativas**: Com intervalos inteligentes

**Arquivos**: `src/assistant/intelligence/followup.ts`

### 5. Prompts Otimizados para Naturalidade
- **Templates Contextuais**: 7 categorias de prompts
- **Variantes Rotativas**: Evita repetição de respostas
- **Personalização Dinâmica**: Baseada no perfil do usuário
- **Adaptação Emocional**: Tom ajustado ao contexto emocional

**Arquivos**: `src/assistant/prompts/optimized.ts`

### 6. Pipeline V2 Integrado
- **Processamento Unificado**: Integra todas as funcionalidades
- **Fluxo Inteligente**: Decisões baseadas em contexto completo
- **Métricas Automáticas**: Coleta dados para melhoria contínua
- **Debug Avançado**: Rastreamento detalhado do processamento

**Arquivos**: `src/assistant/pipeline-v2.ts`

### 7. Sistema de Analytics e Métricas
- **Métricas de Performance**: Sessões, engajamento, conversão
- **Análise de Qualidade**: Coerência, relevância, naturalidade
- **Modelos Preditivos**: Próxima ação, resultado da conversa
- **Métricas em Tempo Real**: Dashboard de performance

**Arquivos**: `src/assistant/analytics/metrics.ts`

## 🎯 Funcionalidades Principais

### Memória Conversacional
```typescript
// Exemplo de uso
const memory = getConversationMemory(sessionId);
addMessage(sessionId, "user", "Procuro um iPhone");
updateContext(sessionId, "product_search", { product: "iPhone" });
```

### Análise Emocional
```typescript
// Detecta emoções e adapta resposta
const emotionalContext = generateEmotionalContext(userMessage);
const adaptedResponse = adaptResponse(originalResponse, emotionalContext);
```

### Insights Proativos
```typescript
// Gera insights baseados em comportamento
const insights = generateProactiveInsights(sessionId);
// Executa ações proativas
const actions = executeProactiveActions(sessionId);
```

### Follow-up Automático
```typescript
// Agenda follow-up baseado em evento
scheduleFollowUp(sessionId, "abandoned_search", { product: "iPhone" });
```

## 📊 Métricas e Analytics

### Métricas de Sessão
- Total de sessões ativas
- Duração média das conversas
- Mensagens por sessão
- Taxa de completude

### Métricas Emocionais
- Sentimento médio das conversas
- Distribuição de emoções
- Score de satisfação
- Taxa de frustração

### Métricas de Proatividade
- Insights gerados
- Ações executadas
- Follow-ups enviados
- Taxa de sucesso proativo

### Métricas de Conversão
- Taxa busca → resultados
- Taxa resultados → interesse
- Taxa interesse → ação
- Taxa de conversão geral

## 🔧 Configuração

### Configuração Padrão
```typescript
const config = {
  memory: {
    enabled: true,
    maxMessages: 50,
    maxContextFrames: 10
  },
  emotional: {
    enabled: true,
    sentimentThreshold: 0.3,
    adaptResponseTone: true
  },
  proactive: {
    enabled: true,
    maxInsightsPerSession: 5,
    enableFollowUp: true
  }
};
```

### Personalidade do "Clique"
```typescript
const CLIQUE_PERSONALITY = {
  traits: {
    enthusiasm: 0.8,
    empathy: 0.9,
    professionalism: 0.7,
    humor: 0.6,
    patience: 0.8
  },
  specialties: [
    "Eletrônicos",
    "Smartphones", 
    "Comparação de preços",
    "Ofertas e promoções"
  ]
};
```

## 🛠️ API Endpoints V2

### Processamento de Mensagens
```
POST /api/assistant/v2/message
- Processa mensagem com inteligência completa
- Retorna insights proativos e contexto emocional
```

### Memória e Contexto
```
GET /api/assistant/v2/memory/:sessionId
- Obtém memória conversacional
- Inclui perfil, contexto e padrões
```

### Analytics
```
GET /api/assistant/v2/analytics/:sessionId
- Análise detalhada da conversa
- Qualidade, engajamento e predições
```

### Métricas
```
GET /api/assistant/v2/metrics
- Métricas de performance geral
- Tempo real ou agregadas
```

## 🎨 Exemplos de Uso

### Conversa com Adaptação Emocional
```
Usuário: "Não consigo encontrar nada que preste!"
Sistema: [Detecta frustração]
Clique: "Entendo sua frustração. Deixa eu te ajudar de uma forma diferente..."
```

### Proatividade Baseada em Comportamento
```
Usuário: [Busca por "iPhone" 3 vezes]
Sistema: [Detecta indecisão]
Clique: "Vejo que você está explorando iPhones. Que tal eu criar uma comparação detalhada?"
```

### Follow-up Inteligente
```
Usuário: [Abandona busca após ver preços]
Sistema: [Agenda follow-up em 10 minutos]
Clique: "Ainda pensando no preço? Posso verificar se temos alguma promoção especial!"
```

## 📈 Benefícios Esperados

### Para o Usuário
- **Experiência Mais Natural**: Conversas fluidas e contextuais
- **Atendimento Personalizado**: Adaptado ao perfil e emoções
- **Proatividade Útil**: Antecipação de necessidades
- **Follow-up Relevante**: Acompanhamento no momento certo

### Para o Negócio
- **Maior Engajamento**: Conversas mais longas e produtivas
- **Taxa de Conversão**: Aumento esperado de 15-25%
- **Satisfação do Cliente**: Melhoria na experiência geral
- **Insights Valiosos**: Dados para otimização contínua

## 🔄 Fluxo de Processamento V2

1. **Recepção da Mensagem**
   - Análise emocional imediata
   - Atualização da memória conversacional

2. **Processamento Inteligente**
   - Pipeline V2 com contexto completo
   - Seleção de prompts otimizados
   - Adaptação baseada em emoções

3. **Geração de Insights**
   - Análise proativa de comportamento
   - Identificação de oportunidades
   - Agendamento de follow-ups

4. **Resposta Adaptada**
   - Tom ajustado ao contexto emocional
   - Personalização baseada no perfil
   - Ações proativas quando apropriado

5. **Coleta de Métricas**
   - Registro automático de eventos
   - Análise de qualidade da conversa
   - Atualização de modelos preditivos

## 🚦 Status de Implementação

- ✅ Sistema de Memória Conversacional
- ✅ Inteligência Emocional
- ✅ Sistema Proativo
- ✅ Follow-up Inteligente
- ✅ Prompts Otimizados
- ✅ Pipeline V2 Integrado
- ✅ Analytics e Métricas
- ✅ API Endpoints V2
- ✅ Configuração Flexível
- ✅ Documentação Completa

## 🔮 Próximos Passos

1. **Testes A/B**: Comparar V1 vs V2 em produção
2. **Machine Learning**: Implementar modelos de ML para predições
3. **Integração CRM**: Sincronizar dados com sistema de vendas
4. **Análise Avançada**: Dashboard em tempo real
5. **Otimização Contínua**: Ajustes baseados em métricas

---

**Desenvolvido com ❤️ para Click Ofertas Paraguai**
*Vendedor Inteligente V2 - Transformando conversas em conversões*

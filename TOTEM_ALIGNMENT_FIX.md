# CORREÇÃO DEFINITIVA DO ALINHAMENTO DO TOTEM

## PROBLEMA IDENTIFICADO
**Causa Raiz**: Incompatibilidade de orientação entre backend e frontend
- Backend gera imagem horizontal (1920×1080) com textos posicionados para orientação horizontal
- Frontend rotaciona 90° para vertical, causando desalinhamento dos textos

## SOLUÇÃO 1 (RECOMENDADA): BACKEND NATIVO VERTICAL

### 1. Alterar gemini.ts - Função composeTotemForProduct()

```typescript
// LINHA ~750 - Alterar dimensões do totem para VERTICAL NATIVO
const totemWidth = 1080;   // Era 1920 
const totemHeight = 1920;  // Era 1080

// LINHA ~856-860 - Layout ajustado para vertical
let hasImage = productImageBuffer !== null;
let textAreaWidth = hasImage ? 500 : 700;     // Largura para tela vertical
let textStartX = hasImage ? 80 : 150;         // Posição X centralizada
const imageAreaX = hasImage ? 600 : 0;        // Imagem na direita
const imageAreaWidth = 400;                   // Menor para caber na vertical
const imageAreaHeight = 600;

// LINHA ~864-902 - SVG com layout vertical nativo
const productInfoSvg = `
<svg width="${totemWidth}" height="${totemHeight}">
    <!-- Faixa translúcida para contraste -->
    <rect x="40" y="300" width="${textAreaWidth}" height="1200" fill="rgba(0,0,0,0.75)" rx="25"/>
    
    <!-- Categoria -->
    <text x="${textStartX}" y="400" font-family="Arial, sans-serif" font-size="36" font-weight="normal" fill="rgba(255,255,255,0.9)" text-anchor="start">
        ${escapeXml((product.category || 'PRODUTO').toUpperCase())}
    </text>
    
    <!-- Nome do produto (linha 1) -->
    <text x="${textStartX}" y="500" font-family="Arial, sans-serif" font-size="${line3 ? '48' : '58'}" font-weight="bold" fill="white" text-anchor="start">
        ${line1}
    </text>
    
    <!-- Nome do produto (linha 2) -->
    ${line2 ? `<text x="${textStartX}" y="${line3 ? '570' : '590'}" font-family="Arial, sans-serif" font-size="${line3 ? '48' : '58'}" font-weight="bold" fill="white" text-anchor="start">${line2}</text>` : ''}
    
    <!-- Nome do produto (linha 3) -->
    ${line3 ? `<text x="${textStartX}" y="640" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="start">${line3}</text>` : ''}
    
    <!-- Preço destacado -->
    <text x="${textStartX}" y="${line3 ? 780 : line2 ? 750 : 720}" font-family="Arial, sans-serif" font-size="86" font-weight="bold" fill="${accentColor}" text-anchor="start" stroke="rgba(0,0,0,0.4)" stroke-width="3">
        ${preco}
    </text>
    
    <!-- Call to Action da loja -->
    <text x="${textStartX}" y="${line3 ? 900 : line2 ? 870 : 840}" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white" text-anchor="start" stroke="rgba(0,0,0,0.5)" stroke-width="1">
        DISPONÍVEL NA
    </text>
    <text x="${textStartX}" y="${line3 ? 950 : line2 ? 920 : 890}" font-family="Arial, sans-serif" font-size="38" font-weight="bold" fill="${accentColor}" text-anchor="start" stroke="rgba(0,0,0,0.5)" stroke-width="1">
        ${escapeXml(store.name.toUpperCase())}
    </text>
    
    <!-- Logo/Brand no rodapé -->
    <text x="${totemWidth - 40}" y="${totemHeight - 80}" font-family="Arial, sans-serif" font-size="28" fill="rgba(255,255,255,0.8)" text-anchor="end">
        Click Ofertas Paraguai
    </text>
</svg>`;

// LINHA ~920-930 - Ajustar posicionamento da imagem para vertical
composition = composition.composite([
    {
        input: productImageProcessed,
        left: Math.round(imageAreaX),
        top: 200,  // Posição superior ajustada
        blend: 'over'
    }
]);
```

### 2. Alterar totem-display.tsx - REMOVER ROTAÇÃO

```typescript
// LINHA ~286-291 - Remover toda a rotação, manter apenas scaling
onLoad={(e) => {
  const img = e.target as HTMLImageElement;
  
  console.log('📸 Imagem carregada:', { 
    src: currentContent.mediaUrl,
    width: img.naturalWidth, 
    height: img.naturalHeight,
    aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(2)
  });

  // REMOVER ROTAÇÃO - imagem já vem na orientação correta
  img.style.objectFit = 'cover';
  img.style.objectPosition = 'center';
  img.style.imageRendering = 'optimizeQuality';
}}
```

## SOLUÇÃO 2 (ALTERNATIVA): CORREÇÃO MATEMÁTICA

### Se preferir manter a rotação no frontend:

```typescript
// Em gemini.ts - Função para transformar coordenadas
function rotateCoordinates(x: number, y: number, width: number, height: number) {
    // Transformação matemática: (x′, y′) = (H − y, x)
    return {
        x: height - y,
        y: x
    };
}

// Aplicar em todas as posições de texto:
const coord1 = rotateCoordinates(textStartX, 280, totemWidth, totemHeight);
// Use coord1.x e coord1.y para posicionar o texto
```

## VALIDAÇÃO

### Para verificar se funcionou:

```typescript
// Em totem-display.tsx - Adicionar debug temporário
onLoad={(e) => {
  const img = e.target as HTMLImageElement;
  console.log('🔍 DEBUG TOTEM:', {
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    isPortrait: img.naturalHeight > img.naturalWidth,
    url: currentContent.mediaUrl
  });
}}
```

## IMPLEMENTAÇÃO

1. **Escolha a Solução 1** (recomendada)
2. **Aplique as alterações em gemini.ts** 
3. **Remova a rotação em totem-display.tsx**
4. **Teste marcando um produto para totem**
5. **Verifique se textos aparecem alinhados**

## ARQUIVOS A ALTERAR

- `gemini.ts` (linha ~750, ~856-860, ~864-902, ~920-930)
- `client/src/pages/totem-display.tsx` (linha ~286-291)

## RESULTADO ESPERADO

✅ Imagem vertical nativa (1080×1920)  
✅ Textos posicionados corretamente para orientação vertical  
✅ Sem rotação CSS no frontend  
✅ Alinhamento perfeito das informações do produto
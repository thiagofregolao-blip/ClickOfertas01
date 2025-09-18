# TwoPartHeader

Componente reutilizável de header de duas partes baseado na implementação do `stores-gallery.tsx`.

## Características

- **Primeira parte**: Header superior fixo com logo, busca e notificações
- **Segunda parte**: Menu de navegação deslizante com detecção de scroll
- **Scroll detection**: Menu desaparece ao rolar para baixo e aparece ao rolar para cima
- **Customizável**: Props para personalizar todas as funcionalidades
- **Acessível**: Com data-testid para testes

## Uso básico

```tsx
import { TwoPartHeader } from "@/components/TwoPartHeader";

// Uso simples
<TwoPartHeader />

// Uso completo
<TwoPartHeader
  title="Minha Aplicação"
  showSearch={true}
  searchValue={searchTerm}
  onSearchChange={(value) => setSearchTerm(value)}
  showNotifications={true}
  notificationCount={3}
  onNotificationClick={() => console.log('Notificações')}
  gradient="linear-gradient(135deg, #F04940 0%, #FA7D22 100%)"
  scrollThreshold={100}
>
  {/* Menu personalizado */}
  <div className="flex items-center gap-4">
    <button className="text-white">Item 1</button>
    <button className="text-white">Item 2</button>
  </div>
</TwoPartHeader>
```

## Props

### Primeira parte (Header fixo)

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `title` | `string` | `"Click Ofertas.PY"` | Título do header |
| `titleComponent` | `ReactNode` | - | Componente customizado para o título |
| `showSearch` | `boolean` | `true` | Mostrar campo de busca |
| `searchValue` | `string` | `""` | Valor atual da busca |
| `searchPlaceholder` | `string` | `"Buscar produtos ou lojas..."` | Placeholder da busca |
| `onSearchChange` | `(value: string) => void` | - | Callback quando busca muda |
| `onSearchFocus` | `() => void` | - | Callback quando busca ganha foco |
| `onSearchBlur` | `() => void` | - | Callback quando busca perde foco |
| `showNotifications` | `boolean` | `true` | Mostrar botão de notificações |
| `notificationCount` | `number` | `0` | Número de notificações não lidas |
| `onNotificationClick` | `() => void` | - | Callback quando clica nas notificações |

### Segunda parte (Menu deslizante)

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `children` | `ReactNode` | - | Conteúdo do menu deslizante |

### Personalização

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `gradient` | `string` | `"linear-gradient(135deg, #F04940 0%, #FA7D22 100%)"` | Gradiente de fundo |
| `className` | `string` | `""` | Classes CSS adicionais |
| `scrollThreshold` | `number` | `100` | Pixels para ativar ocultação do menu |
| `headerHeight` | `number` | `72` | Altura da primeira parte (px) |

## Hook de Scroll

O componente usa o hook `useScrollDetection` que também pode ser usado separadamente:

```tsx
import { useScrollDetection } from "@/hooks/use-scroll-detection";

const { isVisible, scrollY } = useScrollDetection({ 
  threshold: 100 
});
```

## Exemplo completo

Veja `TwoPartHeaderExample.tsx` para um exemplo completo de uso com menu de navegação e categorias.

## Notas de implementação

- O header tem `position: fixed` e `z-index: 50`
- O menu deslizante tem `z-index: 40`
- Adicione `pt-32` (ou mais) ao conteúdo principal para compensar o header fixo
- O scroll detection usa `passive: true` para melhor performance
- O componente é responsivo e funciona bem em desktop
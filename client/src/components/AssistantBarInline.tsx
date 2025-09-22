import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

// Constante que define onde o assistente deve se ancorar
const ANCHOR_SELECTOR = 'form[data-anchor="search-form"]';

export default function AssistantBarInline() {
  const mountedRef = useRef(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    // Código inline direto do arquivo anexado
    const initializeAssistant = () => {
      // util
      function $(sel: string, root: Document | Element = document): Element | null {
        return root.querySelector(sel);
      }
      
      function escapeHTML(s: string): string {
        return (s || '').replace(/[&<>"']/g, (m) => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        }[m] || m));
      }
      
      function debounce(fn: Function, ms: number) {
        let t: NodeJS.Timeout;
        return (...args: any[]) => {
          clearTimeout(t);
          t = setTimeout(() => fn(...args), ms);
        };
      }

      // identidade
      const uid = localStorage.getItem('uid') || (() => {
        const newUid = 'u-' + Math.random().toString(36).slice(2, 8);
        localStorage.setItem('uid', newUid);
        return newUid;
      })();
      const userName = localStorage.getItem('userName') || 'Cliente';

      // acha a sua barra
      const anchor = $(ANCHOR_SELECTOR) as HTMLFormElement;
      if (!anchor) {
        console.warn('[ClickAssistant] Não encontrei o container da barra. Ajuste ANCHOR_SELECTOR.');
        return;
      }

      // deixa o container relativo para ancorar o dropdown
      if (!anchor.style.position) {
        anchor.style.position = 'relative';
      }

      // tenta achar o input existente (reaproveita!)
      let input = $('input[type="search"], input[type="text"], input', anchor) as HTMLInputElement;
      if (!input) {
        console.warn('[ClickAssistant] Input não encontrado no form.');
        return;
      }

      // cria o DROPDOWN ancorado à barra (chat + top3)
      const dropdown = document.createElement('div');
      dropdown.className = 'hidden absolute left-0 right-0 top-full mt-2 z-[1000]';
      dropdown.innerHTML = `
        <div class="assist-shadow bg-white/90 backdrop-blur rounded-2xl border p-3">
          <div class="grid grid-cols-12 gap-4">
            <div class="col-span-12 lg:col-span-9">
              <div class="text-xs text-gray-500 mb-1">Click Assistant</div>
              <div id="chatBox" class="rounded-xl bg-gray-50 border p-3 max-h-[220px] overflow-auto whitespace-pre-wrap"></div>
              <div id="loading" class="hidden text-xs text-gray-500 mt-2">Buscando ofertas…</div>
            </div>
            <div class="col-span-12 lg:col-span-3">
              <div class="rounded-2xl border bg-white/90 p-3">
                <div class="text-sm font-semibold mb-2">Produtos Recomendados</div>
                <div id="top3" class="grid gap-3"></div>
              </div>
            </div>
          </div>
        </div>
      `;
      anchor.appendChild(dropdown);

      // seções fora do dropdown (devem existir na página; se não, cria)
      let resultsSec = document.getElementById('results');
      if (!resultsSec) {
        resultsSec = document.createElement('section');
        resultsSec.id = 'results';
        resultsSec.className = 'max-w-5xl mx-auto px-3 pt-3';
        const mainContent = document.querySelector('main') || document.body;
        mainContent.appendChild(resultsSec);
      }
      
      let comboSec = document.getElementById('combo');
      if (!comboSec) {
        comboSec = document.createElement('section');
        comboSec.id = 'combo';
        comboSec.className = 'max-w-5xl mx-auto px-3';
        const mainContent = document.querySelector('main') || document.body;
        mainContent.appendChild(comboSec);
      }

      // refs
      const chatBox = $('#chatBox', dropdown) as HTMLElement;
      const loadingEl = $('#loading', dropdown) as HTMLElement;
      const top3El = $('#top3', dropdown) as HTMLElement;

      let sessionId = '';
      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

      // Função para criar sessão sob demanda
      async function ensureSession() {
        if (sessionId) return sessionId;
        try {
          const r = await fetch('/api/assistant/sessions', {
            method: 'POST',
            headers: { 'x-user-id': uid, 'x-user-name': userName }
          });
          const d = await r.json();
          sessionId = d?.session?.id;
          if (d.greeting) appendAssistant(`${d.greeting}\n`);
          return sessionId;
        } catch (e) {
          console.error('[ClickAssistant] Erro ao criar sessão:', e);
          return null;
        }
      }

      // abrir dropdown ao focar
      input.addEventListener('focus', () => {
        dropdown.classList.remove('hidden');
        anchor.dataset.assistantActive = '1';
      });
      
      // fechar dropdown ao clicar fora (mas não se clicar no próprio dropdown)
      document.addEventListener('click', (e: Event) => {
        if (!anchor.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
          dropdown.classList.add('hidden');
          delete anchor.dataset.assistantActive;
        }
      });

      // submit = envia ao stream + busca sugestão
      anchor.addEventListener('submit', (e) => {
        if (anchor.dataset.assistantActive) {
          e.preventDefault();
          e.stopPropagation();
          const text = (input.value || '').trim();
          if (!text) return;
          
          // Emitir evento para ativar modo busca
          window.dispatchEvent(new CustomEvent('assistant:search-mode', { 
            detail: { active: true } 
          }));
          
          // Mostrar mensagem do usuário
          appendUser(text);
          
          // Limpar campo
          input.value = '';
          
          ensureSession().then(() => {
            startStream(text);
            suggestAndRender(text);
          });
        }
      });

      // digitação = sugestão incremental
      const debouncedSuggest = debounce((e: Event) => {
        const target = e.target as HTMLInputElement;
        const t = target.value.trim();
        if (!t) {
          top3El.innerHTML = '';
          if (resultsSec) resultsSec.innerHTML = '';
          if (comboSec) comboSec.innerHTML = '';
          return;
        }
        suggestAndRender(t);
      }, 220);

      input.addEventListener('input', debouncedSuggest);

      // helpers de render
      function cardHTML(p: any) {
        const price = p.price?.USD ? `USD <b>${p.price.USD}</b>` : `<span class="text-gray-400">sem preço</span>`;
        const badge = p.premium ? `<span class="ml-2 px-2 py-0.5 text-[10px] rounded bg-amber-100 text-amber-700">Premium</span>` : '';
        return `
          <button data-id="${encodeURIComponent(p.id)}" class="card text-left p-3 rounded-xl border hover:shadow-sm transition bg-white/90">
            <div class="font-medium truncate mb-1">${escapeHTML(p.title)} ${badge}</div>
            <div class="text-xs text-gray-500 mb-2">${escapeHTML(p.category || '—')} ${p.score !== undefined ? `• score ${p.score}` : ''}</div>
            <div class="text-sm">${price}</div>
          </button>
        `;
      }

      function bindCardClicks(scope: string) {
        document.querySelectorAll(`${scope} [data-id]`).forEach((el) => {
          el.addEventListener('click', () => {
            const id = el.getAttribute('data-id');
            if (id) {
              setLocation(`/produto/${id}`);
            }
          });
        });
      }

      function renderTop3(items: any[]) {
        top3El.innerHTML = items.map(cardHTML).join('');
        bindCardClicks('#top3');
      }

      function renderResults(items: any[]) {
        if (!resultsSec) return;
        resultsSec.innerHTML = `
          <div class="rounded-2xl border bg-white/90 backdrop-blur p-4 shadow-sm">
            <div class="text-sm font-semibold mb-3">Resultados</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              ${items.map(cardHTML).join('')}
            </div>
          </div>`;
        bindCardClicks('#results');
      }

      function renderCombo(first: any) {
        if (!first || !comboSec) {
          if (comboSec) comboSec.innerHTML = '';
          return;
        }
        const cat = (first.category || '').toLowerCase();
        const acc: { [key: string]: string[] } = {
          'celulares': ['capinha', 'película', 'carregador'],
          'telefone': ['capinha', 'película', 'carregador'],
          'smartphone': ['capinha', 'película', 'carregador'],
          'notebook': ['mochila', 'mouse', 'cooler']
        };
        const accessories = acc[cat] || [];
        if (!accessories.length) {
          comboSec.innerHTML = '';
          return;
        }
        
        fetch(`/api/suggest?q=${encodeURIComponent(accessories.join(' OR '))}`)
          .then((r) => r.json())
          .then((d) => {
            const items = (d.products || []).slice(0, 12);
            if (comboSec) {
              comboSec.innerHTML = `
                <div class="rounded-2xl border bg-white/90 backdrop-blur p-4 shadow-sm mt-3">
                  <div class="text-sm font-semibold mb-3">Combina com</div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    ${items.map(cardHTML).join('')}
                  </div>
                </div>`;
              bindCardClicks('#combo');
            }
          })
          .catch(console.error);
      }

      // sugestão + acessórios
      async function suggestAndRender(term: string) {
        loadingEl.classList.remove('hidden');
        try {
          const r = await fetch(`/api/suggest?q=${encodeURIComponent(term)}`);
          const d = await r.json();
          const prods = (d.products || []);
          renderTop3(prods.slice(0, 3));
          renderResults(prods.slice(3));
          renderCombo(prods[0]);
          
          // Emitir resultados para o overlay da página pai
          window.dispatchEvent(new CustomEvent('assistant:results', {
            detail: { 
              topBox: prods.slice(0, 3), 
              feed: prods.slice(3),
              combina: [] // será atualizado no renderCombo se necessário
            }
          }));
        } catch (e) {
          console.error('[ClickAssistant] Erro ao buscar sugestões:', e);
        } finally {
          loadingEl.classList.add('hidden');
        }
      }

      // STREAM com scroll para BAIXO
      async function startStream(message: string) {
        if (reader) {
          try {
            await reader.cancel();
          } catch {}
          reader = null;
        }
        
        // Mostrar indicador de "digitando"
        const typingEl = document.createElement('div');
        typingEl.className = "mb-2 text-gray-500 italic";
        typingEl.textContent = "Click Assistant está digitando...";
        chatBox.appendChild(typingEl);
        scrollDown();
        
        try {
          const res = await fetch('/api/assistant/stream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'text/event-stream',
              'x-user-id': uid,
              'x-user-name': userName
            },
            body: JSON.stringify({ sessionId, message })
          });
          
          if (!res.ok || !res.body) {
            typingEl.remove();
            return;
          }

          // Remover indicador de digitação e criar elemento da mensagem
          typingEl.remove();
          const msgEl = document.createElement('div');
          msgEl.className = "mb-2";
          chatBox.appendChild(msgEl);
          scrollDown();

          reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';
            
            for (const chunk of parts) {
              const line = chunk.trim().replace(/^data:\s?/, '');
              try {
                const payload = JSON.parse(line);
                if (payload.type === 'chunk' && payload.text) {
                  msgEl.textContent += payload.text;
                  scrollDown();
                }
              } catch {
                // ignora chunks malformados
              }
            }
          }
        } catch (e) {
          console.error('[ClickAssistant] Erro no stream:', e);
          typingEl.remove();
        }
      }

      function appendAssistant(text: string) {
        const div = document.createElement('div');
        div.className = "mb-2";
        div.textContent = text;
        chatBox.appendChild(div);
        scrollDown();
      }

      function appendUser(text: string) {
        const div = document.createElement('div');
        div.className = "mb-2 text-right";
        div.innerHTML = `<span class="inline-block bg-blue-500 text-white px-3 py-1 rounded-lg max-w-xs">${escapeHTML(text)}</span>`;
        chatBox.appendChild(div);
        scrollDown();
      }

      function scrollDown() {
        chatBox.scrollTop = chatBox.scrollHeight;
      }
    };

    // Aguarda o DOM estar pronto e então inicializa
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeAssistant);
    } else {
      initializeAssistant();
    }

    // Cleanup no unmount
    return () => {
      mountedRef.current = false;
      
      const anchor = document.querySelector(ANCHOR_SELECTOR);
      if (anchor) {
        const dropdown = anchor.querySelector('.absolute');
        if (dropdown) dropdown.remove();
      }
      
      const resultsSec = document.getElementById('results');
      if (resultsSec) resultsSec.remove();
      
      const comboSec = document.getElementById('combo');
      if (comboSec) comboSec.remove();
    };
  }, [setLocation]);

  return null; // Este componente não renderiza nada no React
}
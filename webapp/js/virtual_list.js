// Virtual List implementation for highly performant large lists
// Handles dynamic item heights and smooth scrolling by only rendering visible items

class VirtualList {
    constructor(container, items, renderRow, options = {}) {
        this.destroyed = false;
        this.container = container;
        this.items = items;
        this.renderRow = renderRow;
        this.itemHeight = options.estimatedHeight || 120;
        this.buffer = options.buffer || 5;
        this.useWindowScroll = options.useWindowScroll !== undefined ? options.useWindowScroll : false;
        
        if (this.useWindowScroll) {
            this.container.style.position = 'relative';
            this.container.style.overflowY = 'visible';
            this.container.style.overflowX = 'visible';
        } else {
            this.container.style.overflowY = 'auto';
            this.container.style.overflowX = 'hidden';
            this.container.style.position = 'relative';
        }

        this.scroller = document.createElement('div');
        this.scroller.style.opacity = '0';
        this.scroller.style.position = 'absolute';
        this.scroller.style.top = '0';
        this.scroller.style.left = '0';
        this.scroller.style.width = '1px';
        this.container.appendChild(this.scroller);

        this.content = document.createElement('div');
        this.content.style.position = 'absolute';
        this.content.style.top = '0';
        this.content.style.left = '0';
        this.content.style.width = '100%';
        this.container.appendChild(this.content);

        this.renderedItems = new Map();
        this.itemHeights = new Array(this.items.length).fill(this.itemHeight);
        this.itemPositions = new Array(this.items.length).fill(0);

        this.updatePositions();

        this.onScroll = this.onScroll.bind(this);
        if (this.useWindowScroll) {
            window.addEventListener('scroll', this.onScroll);
        } else {
            this.container.addEventListener('scroll', this.onScroll);
        }

        this.resizeObserver = new ResizeObserver(entries => {
            if (this.destroyed) return;
            let changed = false;
            for (let entry of entries) {
                const idx = parseInt(entry.target.getAttribute('data-vindex'));
                if (!isNaN(idx)) {
                    // Use borderBoxSize if available for better accuracy, fallback to bounding box
                    let newHeight;
                    if (entry.borderBoxSize && entry.borderBoxSize[0]) {
                        newHeight = entry.borderBoxSize[0].blockSize;
                    } else {
                        newHeight = entry.target.getBoundingClientRect().height;
                    }

                    // Add gap for margin
                    newHeight += 16; // 16px bottom margin default
                    
                    // Allow small margin of error to prevent infinite loops
                    if (Math.abs(this.itemHeights[idx] - newHeight) > 2) {
                        this.itemHeights[idx] = newHeight;
                        changed = true;
                    }
                }
            }
            if (changed) {
                if (!this.resizeRafPending) {
                    this.resizeRafPending = true;
                    requestAnimationFrame(() => {
                        this.resizeRafPending = false;
                        if (!this.destroyed) {
                            this.updatePositions();
                            this.render();
                        }
                    });
                }
            }
        });

        const initialScroll = options.scrollTop !== undefined ? options.scrollTop : 0;
        // Initial render
        requestAnimationFrame(() => {
            this.container.scrollTop = initialScroll;
            this.render();
        });
    }

    updatePositions() {
        let currentPos = 0;
        for (let i = 0; i < this.items.length; i++) {
            this.itemPositions[i] = currentPos;
            currentPos += this.itemHeights[i];
        }
        this.scroller.style.height = `${currentPos}px`;
        if (this.useWindowScroll) {
            this.container.style.height = `${currentPos}px`;
        }
    }

    onScroll() {
        requestAnimationFrame(() => this.render());
    }

    render() {
        if (this.destroyed) return;
        let scrollTop, viewportHeight;
        if (this.useWindowScroll) {
            const rect = this.container.getBoundingClientRect();
            scrollTop = Math.max(0, -rect.top);
            viewportHeight = window.innerHeight;
        } else {
            scrollTop = this.container.scrollTop;
            viewportHeight = this.container.clientHeight || 800; // fallback height
        }

        let startIndex = 0;
        let endIndex = 0;

        for (let i = 0; i < this.itemPositions.length; i++) {
            if (this.itemPositions[i] + this.itemHeights[i] > scrollTop) {
                startIndex = i;
                break;
            }
        }

        for (let i = startIndex; i < this.itemPositions.length; i++) {
            if (this.itemPositions[i] > scrollTop + viewportHeight) {
                endIndex = i;
                break;
            }
            endIndex = i;
        }

        startIndex = Math.max(0, startIndex - this.buffer);
        endIndex = Math.min(this.items.length - 1, endIndex + this.buffer);

        const activeIndices = new Set();

        for (let i = startIndex; i <= endIndex; i++) {
            activeIndices.add(i);
            if (!this.renderedItems.has(i)) {
                const node = this.renderRow(this.items[i], i);
                node.style.position = 'absolute';
                node.style.top = '0';
                node.style.left = '0';
                node.style.width = '100%';
                node.style.transform = `translateY(${this.itemPositions[i]}px)`;
                node.setAttribute('data-vindex', i);
                this.content.appendChild(node);
                this.renderedItems.set(i, node);
                this.resizeObserver.observe(node);
            } else {
                const node = this.renderedItems.get(i);
                node.style.transform = `translateY(${this.itemPositions[i]}px)`;
            }
        }

        for (let [idx, node] of this.renderedItems.entries()) {
            if (!activeIndices.has(idx)) {
                this.resizeObserver.unobserve(node);
                node.remove();
                this.renderedItems.delete(idx);
            }
        }
    }

    destroy() {
        this.destroyed = true;
        if (this.useWindowScroll) {
            window.removeEventListener('scroll', this.onScroll);
        } else {
            this.container.removeEventListener('scroll', this.onScroll);
        }
        this.resizeObserver.disconnect();
        this.container.replaceChildren();
        this.renderedItems.clear();
        if (this.useWindowScroll) {
            this.container.style.height = '';
        }
    }

    getScrollTop() {
        return this.useWindowScroll ? window.scrollY : this.container.scrollTop;
    }

    /**
     * Atualiza os itens da lista sem destruir/recriar — preserva a posição de scroll.
     * Usar em vez de destroy() + new VirtualList() quando só os dados mudaram.
     *
     * @param {Array} newItems - Nova lista de itens
     */
    updateItems(newItems) {
        if (this.destroyed) return;
        const prevScrollTop = this.getScrollTop();

        this.items = newItems;

        // Ajusta arrays de altura/posição para o novo tamanho
        const oldLen = this.itemHeights.length;
        const newLen = newItems.length;

        if (newLen > oldLen) {
            // Itens adicionados: estima altura para os novos
            for (let i = oldLen; i < newLen; i++) {
                this.itemHeights.push(this.itemHeight);
                this.itemPositions.push(0); // será calculado em updatePositions
            }
        } else if (newLen < oldLen) {
            // Itens removidos: limpa DOM dos índices que saíram
            for (let i = newLen; i < oldLen; i++) {
                const node = this.renderedItems.get(i);
                if (node) {
                    this.resizeObserver.unobserve(node);
                    node.remove();
                    this.renderedItems.delete(i);
                }
            }
            this.itemHeights.length = newLen;
            this.itemPositions.length = newLen;
        }

        this.updatePositions();
        this.render();

        // Restaura scroll após o render (requestAnimationFrame garante que o DOM foi atualizado)
        requestAnimationFrame(() => {
            if (this.destroyed) return;
            if (this.useWindowScroll) {
                window.scrollTo({ top: prevScrollTop, behavior: 'instant' });
            } else {
                this.container.scrollTop = prevScrollTop;
            }
        });
    }
}

// Attach to global for easy interop during migration phase
globalThis.VirtualList = VirtualList;

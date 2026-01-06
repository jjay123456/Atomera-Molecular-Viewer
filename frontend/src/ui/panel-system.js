export class PanelSystem {
    constructor(rootEl) {
        this.root = rootEl;
        this.panels = {}; // { ID: { el, state: 'closed' | 'docked' | 'minimized' } }
        this.activeDockedId = null;
    }

    registerPanel(id, title, contentHtml) {
        const panelEl = document.createElement('div');
        panelEl.className = 'panel closed';
        panelEl.id = `panel-${id}`;
        panelEl.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">${title}</span>
        <div class="panel-controls">
          <button class="btn-minimize">_</button>
          <button class="btn-close">X</button>
        </div>
      </div>
      <div class="panel-body">
        ${contentHtml}
      </div>
    `;

        // Bind controls
        panelEl.querySelector('.btn-minimize').addEventListener('click', () => this.toggleMinimize(id));
        panelEl.querySelector('.btn-close').addEventListener('click', () => this.closePanel(id));

        this.root.appendChild(panelEl);
        this.panels[id] = { el: panelEl, state: 'closed' };

        // Initial render check (hide it)
        panelEl.style.display = 'none';
    }

    openPanel(id) {
        // If another is docked, minimize or close it? 
        // Spec: "Only one docked panel at a time."
        if (this.activeDockedId && this.activeDockedId !== id) {
            this.closePanel(this.activeDockedId); // Or minimize? decided to close for simplicity unless stack requested
        }

        const panel = this.panels[id];
        if (!panel) return;

        panel.state = 'docked';
        panel.el.classList.remove('closed', 'minimized');
        panel.el.classList.add('docked');
        panel.el.style.display = 'flex';

        this.activeDockedId = id;
        this.updateSidebarWidth();
    }

    toggleMinimize(id) {
        const panel = this.panels[id];
        if (!panel) return;

        if (panel.state === 'docked') {
            panel.state = 'minimized';
            panel.el.classList.remove('docked');
            panel.el.classList.add('minimized');
            if (this.activeDockedId === id) this.activeDockedId = null;
        } else if (panel.state === 'minimized') {
            // Restore to docked
            // Close others if docked
            if (this.activeDockedId && this.activeDockedId !== id) {
                this.closePanel(this.activeDockedId);
            }
            panel.state = 'docked';
            panel.el.classList.remove('minimized');
            panel.el.classList.add('docked');
            this.activeDockedId = id;
        }
        this.updateSidebarWidth();
    }

    closePanel(id) {
        const panel = this.panels[id];
        if (!panel) return;

        panel.state = 'closed';
        panel.el.classList.remove('docked', 'minimized');
        panel.el.classList.add('closed');
        panel.el.style.display = 'none';

        if (this.activeDockedId === id) {
            this.activeDockedId = null;
        }
        this.updateSidebarWidth();
    }

    updateSidebarWidth() {
        // If any panel is visible (docked or minimized), sidebar needs width
        const anyVisible = Object.values(this.panels).some(p => p.state !== 'closed');
        const docked = Object.values(this.panels).find(p => p.state === 'docked');

        if (anyVisible) {
            this.root.classList.add('has-minimized'); // Base width
        } else {
            this.root.classList.remove('has-minimized');
        }

        if (docked) {
            this.root.classList.add('has-docked');
        } else {
            this.root.classList.remove('has-docked');
        }
    }
}

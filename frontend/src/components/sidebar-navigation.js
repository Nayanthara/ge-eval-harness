import { LitElement, html } from 'lit';

class SidebarNavigation extends LitElement {
  static properties = {
    active: { type: String },
    collapsed: { type: Boolean }
  };

  constructor() {
    super();
    this.active = 'home';
    this.collapsed = false;
  }

  createRenderRoot() {
    return this; // Render in Light DOM to keep existing styles
  }

  _navigate(screenId) {
    this.dispatchEvent(new CustomEvent('navigate', { detail: screenId }));
  }

  _toggle() {
    this.collapsed = !this.collapsed;
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      if (this.collapsed) {
        sidebar.classList.add('collapsed');
      } else {
        sidebar.classList.remove('collapsed');
      }
    }
  }

  render() {
    return html`
      <div class="sidebar-brand">
          <h1 style="margin: 0; font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; background: linear-gradient(135deg, #0b57d0 0%, #6750a4 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; white-space: nowrap;">GE Eval Harness</h1>
      </div>
      <div class="sidebar-nav">
          <button class="nav-item ${this.active === 'home' ? 'active' : ''}" @click="${() => this._navigate('home')}">
              <span class="icon">🏠</span> <span>Home</span>
          </button>
          <button class="nav-item ${this.active === 'results' ? 'active' : ''}" @click="${() => this._navigate('results')}">
              <span class="icon">📈</span> <span>Results</span>
          </button>
          <button class="nav-item ${this.active === 'datasets' ? 'active' : ''}" @click="${() => this._navigate('datasets')}">
              <span class="icon">📁</span> <span>Datasets</span>
          </button>
          <button class="nav-item ${this.active === 'run-status' ? 'active' : ''}" @click="${() => this._navigate('run-status')}">
              <span class="icon">📋</span> <span>Run Status</span>
          </button>
          <button class="nav-item ${this.active === 'settings' ? 'active' : ''}" @click="${() => this._navigate('settings')}">
              <span class="icon">⚙️</span> <span>Settings</span>
          </button>
      </div>
      <button class="sidebar-toggle" @click="${this._toggle}" title="Toggle Sidebar">
          <span>${this.collapsed ? '▶' : '◀'}</span>
      </button>
    `;
  }
}

customElements.define('sidebar-navigation', SidebarNavigation);

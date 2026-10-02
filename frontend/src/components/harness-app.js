import { LitElement, html } from 'lit';
import './sidebar-navigation.js';

class HarnessApp extends LitElement {
  static properties = {
    activeScreen: { type: String },
    monitorRunId: { type: String }
  };

  constructor() {
    super();
    this.activeScreen = 'home';
    this.monitorRunId = '';
  }

  createRenderRoot() {
    return this; // Render in Light DOM to keep standard styling rules
  }

  connectedCallback() {
    super.connectedCallback();
    // Enable other JS triggers (like logs redirection) to sync navigation state
    window.addEventListener('screen-changed', (e) => {
      this.activeScreen = e.detail.screenId;
    });
  }

  _handleNavigation(screenId) {
    this.activeScreen = screenId;
    if (typeof window.switchScreen === 'function') {
      window.switchScreen(screenId, true);
    }
  }

  render() {
    return html`
      <sidebar-navigation 
        .active="${this.activeScreen}"
        @navigate="${(e) => this._handleNavigation(e.detail)}">
      </sidebar-navigation>
    `;
  }
}

customElements.define('harness-app', HarnessApp);

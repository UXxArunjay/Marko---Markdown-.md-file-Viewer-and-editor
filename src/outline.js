/**
 * Outline / Table of Contents module
 * Renders document heading hierarchy and synchronizes scroll position.
 */

export class DocumentOutline {
  constructor(containerElement, viewerElement, onHeadingClick) {
    this.container = containerElement;
    this.viewer = viewerElement;
    this.onHeadingClick = onHeadingClick || (() => {});
    this.headings = [];
    this.observer = null;
  }

  update(outlineItems) {
    this.headings = outlineItems || [];
    if (!this.container) return;

    if (this.headings.length === 0) {
      this.container.innerHTML = `
        <div class="outline-empty-state">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          <p>No headings found</p>
          <span class="subtext">Add # H1, ## H2 to create an outline</span>
        </div>
      `;
      return;
    }

    const html = `
      <div class="outline-list">
        ${this.headings.map((item) => `
          <a href="#${item.id}" class="outline-item outline-level-${item.level}" data-id="${item.id}">
            <span class="outline-level-indicator">H${item.level}</span>
            <span class="outline-title">${item.title}</span>
          </a>
        `).join('')}
      </div>
    `;

    this.container.innerHTML = html;

    // Attach click handlers
    const links = this.container.querySelectorAll('.outline-item');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const id = link.getAttribute('data-id');
        this.scrollToHeading(id);
        this.setActive(id);
        this.onHeadingClick(id);
      });
    });

    this.initScrollSpy();
  }

  scrollToHeading(id) {
    if (!id || !this.viewer) return;
    const target = this.viewer.querySelector(`#${CSS.escape(id)}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  setActive(id) {
    if (!this.container) return;
    const links = this.container.querySelectorAll('.outline-item');
    links.forEach(link => {
      if (link.getAttribute('data-id') === id) {
        link.classList.add('is-active');
      } else {
        link.classList.remove('is-active');
      }
    });
  }

  initScrollSpy() {
    if (!this.viewer) return;

    if (this.observer) {
      this.observer.disconnect();
    }

    const headingDoms = this.viewer.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headingDoms.length === 0) return;

    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          if (id) {
            this.setActive(id);
            break;
          }
        }
      }
    }, {
      root: this.viewer.parentElement,
      rootMargin: '0px 0px -70% 0px',
      threshold: 0
    });

    headingDoms.forEach(h => this.observer.observe(h));
  }
}

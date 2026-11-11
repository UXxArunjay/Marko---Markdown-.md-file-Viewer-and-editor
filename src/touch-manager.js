/**
 * Touch and Gesture Management Module for Marko
 * Provides comprehensive touchscreen support:
 * - Edge swipe right to reveal sidebar / navigation menu
 * - Swipe left to collapse sidebar
 * - Two-finger pinch to zoom / adjust font size dynamically
 * - Double-tap detection for quick Zen Fullscreen toggle
 * - Downward swipe to dismiss mobile action sheets & modals
 * - Smooth touch pan and momentum scrolling
 */

export class TouchManager {
  constructor(app, options = {}) {
    this.app = app;
    this.options = options;

    // Gesture state tracking
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.isEdgeSwipe = false;
    this.isSwiping = false;

    // Multi-touch pinch zoom state
    this.initialPinchDistance = 0;
    this.isPinching = false;
    this.currentScale = 1;
    this.zoomIndicator = null;
    this.zoomTimeout = null;

    // Double-tap tracking
    this.lastTapTime = 0;
    this.lastTapX = 0;
    this.lastTapY = 0;

    this.init();
  }

  init() {
    this.createZoomIndicator();
    this.initSwipeGestures();
    this.initPinchZoom();
    this.initDoubleTap();
    this.initSheetSwipeDismiss();
    this.initSmoothTouchScroll();
  }

  createZoomIndicator() {
    if (document.getElementById('touchZoomHud')) return;
    const hud = document.createElement('div');
    hud.id = 'touchZoomHud';
    hud.className = 'touch-zoom-hud';
    hud.style.display = 'none';
    hud.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        <line x1="11" y1="8" x2="11" y2="14"></line>
        <line x1="8" y1="11" x2="14" y2="11"></line>
      </svg>
      <span id="touchZoomText">16px</span>
    `;
    document.body.appendChild(hud);
    this.zoomIndicator = hud;
  }

  showZoomIndicator(text) {
    if (!this.zoomIndicator) return;
    const textEl = document.getElementById('touchZoomText');
    if (textEl) textEl.textContent = text;
    this.zoomIndicator.style.display = 'inline-flex';
    this.zoomIndicator.classList.add('is-visible');

    if (this.zoomTimeout) clearTimeout(this.zoomTimeout);
    this.zoomTimeout = setTimeout(() => {
      this.zoomIndicator.classList.remove('is-visible');
      setTimeout(() => {
        if (!this.zoomIndicator.classList.contains('is-visible')) {
          this.zoomIndicator.style.display = 'none';
        }
      }, 300);
    }, 1200);
  }

  /**
   * 1. Edge Swipe to Open & Swipe to Close Sidebar
   */
  initSwipeGestures() {
    const thresholdX = 55; // min horizontal distance for swipe
    const maxOffAxisY = 80; // max vertical movement to count as horizontal swipe

    window.addEventListener('touchstart', (e) => {
      if (!e.touches || e.touches.length !== 1) {
        this.isEdgeSwipe = false;
        this.isSwiping = false;
        return;
      }

      const touch = e.touches[0];
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.touchStartTime = Date.now();

      // Check if starting near the left edge (< 40px)
      this.isEdgeSwipe = this.touchStartX <= 40;
      this.isSwiping = true;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!this.isSwiping || !e.touches || e.touches.length !== 1) return;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (!this.isSwiping) return;
      this.isSwiping = false;

      if (!e.changedTouches || e.changedTouches.length === 0) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - this.touchStartX;
      const deltaY = Math.abs(touch.clientY - this.touchStartY);
      const duration = Date.now() - this.touchStartTime;

      // Ignore slow drags
      if (duration > 650) return;
      if (deltaY > maxOffAxisY) return;

      const sidebarOpen = this.app.dom.appSidebar &&
        (!this.app.dom.appSidebar.classList.contains('is-collapsed') ||
          this.app.dom.appSidebar.classList.contains('mobile-open'));

      // Swipe Right from Edge -> Open Sidebar
      if (deltaX > thresholdX && (this.isEdgeSwipe || (!sidebarOpen && this.touchStartX < 100))) {
        if (!sidebarOpen) {
          if (window.innerWidth <= 768) {
            this.app.openMobileSidebar();
          } else {
            this.app.dom.appSidebar.classList.remove('is-collapsed');
          }
        }
      }

      // Swipe Left -> Close Sidebar
      if (deltaX < -thresholdX && sidebarOpen) {
        if (window.innerWidth <= 768) {
          this.app.closeMobileSidebar();
        } else {
          this.app.dom.appSidebar.classList.add('is-collapsed');
        }
      }
    }, { passive: true });
  }

  /**
   * 2. Two-Finger Pinch-to-Zoom Font Resizing
   */
  initPinchZoom() {
    const viewer = this.app.dom.viewerContainer;
    if (!viewer) return;

    const getDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    viewer.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 2) {
        this.isPinching = true;
        this.initialPinchDistance = getDistance(e.touches);
      }
    }, { passive: true });

    viewer.addEventListener('touchmove', (e) => {
      if (!this.isPinching || !e.touches || e.touches.length !== 2) return;

      const currentDistance = getDistance(e.touches);
      const ratio = currentDistance / (this.initialPinchDistance || 1);

      if (Math.abs(ratio - 1) > 0.15) {
        const availableSizes = [14, 16, 18, 20];
        let currentSize = parseInt(this.app.readingFontSize, 10) || 16;
        let currentIdx = availableSizes.indexOf(currentSize);
        if (currentIdx === -1) currentIdx = 1;

        if (ratio > 1.15 && currentIdx < availableSizes.length - 1) {
          // Zoom in
          const newSize = availableSizes[currentIdx + 1];
          this.app.readingFontSize = String(newSize);
          localStorage.setItem('marko_font_size', String(newSize));
          this.app.applyTypographySettings();
          this.showZoomIndicator(`${newSize}px Text`);
          this.initialPinchDistance = currentDistance;
        } else if (ratio < 0.85 && currentIdx > 0) {
          // Zoom out
          const newSize = availableSizes[currentIdx - 1];
          this.app.readingFontSize = String(newSize);
          localStorage.setItem('marko_font_size', String(newSize));
          this.app.applyTypographySettings();
          this.showZoomIndicator(`${newSize}px Text`);
          this.initialPinchDistance = currentDistance;
        }
      }
    }, { passive: true });

    viewer.addEventListener('touchend', (e) => {
      if (!e.touches || e.touches.length < 2) {
        this.isPinching = false;
      }
    }, { passive: true });
  }

  /**
   * 3. Double-Tap Detection for Zen Fullscreen
   */
  initDoubleTap() {
    const viewer = this.app.dom.viewerContainer;
    if (!viewer) return;

    viewer.addEventListener('touchend', (e) => {
      if (this.app.currentMode !== 'view' && !this.app.isFullscreen) return;

      const now = Date.now();
      const timeDiff = now - this.lastTapTime;
      const touch = e.changedTouches && e.changedTouches[0];

      if (touch && timeDiff < 320 && timeDiff > 40) {
        const distDiff = Math.hypot(touch.clientX - this.lastTapX, touch.clientY - this.lastTapY);
        if (distDiff < 30) {
          // Valid double-tap!
          const interactive = e.target.closest('a, button, input, textarea, pre, code, .btn-copy-code');
          if (!interactive) {
            e.preventDefault();
            this.app.toggleFullscreen();
          }
        }
      }

      if (touch) {
        this.lastTapTime = now;
        this.lastTapX = touch.clientX;
        this.lastTapY = touch.clientY;
      }
    }, { passive: false });
  }

  /**
   * 4. Downward Swipe to Dismiss Sheets & Modals
   */
  initSheetSwipeDismiss() {
    const sheet = document.querySelector('.mobile-sheet-container');
    if (!sheet) return;

    let startY = 0;
    let currentY = 0;
    let isTracking = false;

    sheet.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) {
        startY = e.touches[0].clientY;
        isTracking = true;
      }
    }, { passive: true });

    sheet.addEventListener('touchmove', (e) => {
      if (!isTracking || !e.touches || e.touches.length === 1) {
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        if (diff > 0) {
          sheet.style.transform = `translateY(${Math.min(diff, 180)}px)`;
        }
      }
    }, { passive: true });

    sheet.addEventListener('touchend', () => {
      if (!isTracking) return;
      isTracking = false;
      const diff = currentY - startY;
      sheet.style.transform = '';
      if (diff > 80) {
        this.app.closeMobileActionsSheet();
      }
      startY = 0;
      currentY = 0;
    }, { passive: true });
  }

  /**
   * 5. Smooth Touch Scroll Enhancement
   */
  initSmoothTouchScroll() {
    // Add touch momentum & prevent sticky overscroll locks
    const scrollContainers = [
      this.app.dom.viewerContainer,
      this.app.dom.editorContainer,
      this.app.dom.outlineContainer,
      this.app.dom.recentFilesContainer,
      document.getElementById('sidebarBody')
    ];

    scrollContainers.forEach((el) => {
      if (el) {
        el.style.touchAction = 'pan-y';
        el.style.webkitOverflowScrolling = 'touch';
        el.style.overscrollBehavior = 'contain';
      }
    });
  }
}


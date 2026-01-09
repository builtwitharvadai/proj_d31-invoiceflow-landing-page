/**
 * Features Section Interactive Module
 * Handles lazy loading, scroll animations, hover interactions, and analytics tracking
 * for the features section of the InvoiceFlow landing page.
 * 
 * @module features
 * @generated-from: task-id:TASK-004 sprint:current
 * @modifies: index.html features section
 * @dependencies: ["IntersectionObserver", "FontAwesome"]
 */

(function initFeaturesModule() {
  'use strict';

  // Configuration constants
  const CONFIG = Object.freeze({
    INTERSECTION_THRESHOLD: 0.1,
    INTERSECTION_ROOT_MARGIN: '50px',
    ANIMATION_DELAY_INCREMENT: 100,
    IMAGE_LOAD_TIMEOUT: 10000,
    HOVER_SCALE: 1.02,
    ANALYTICS_DEBOUNCE: 300,
    KEYBOARD_NAVIGATION_CLASS: 'keyboard-focus',
  });

  // Feature engagement tracking state
  const engagementState = {
    viewedFeatures: new Set(),
    hoveredFeatures: new Set(),
    imageLoadStatus: new Map(),
    lastAnalyticsEvent: 0,
  };

  /**
   * Initializes the features section functionality
   * Sets up lazy loading, animations, and event listeners
   */
  function initialize() {
    try {
      const featuresSection = document.querySelector('.features');
      
      if (!featuresSection) {
        console.warn('[Features] Features section not found in DOM');
        return;
      }

      setupLazyLoading();
      setupScrollAnimations();
      setupFeatureCardInteractions();
      setupKeyboardNavigation();
      setupAnalyticsTracking();

      console.info('[Features] Module initialized successfully');
    } catch (error) {
      console.error('[Features] Initialization failed:', {
        message: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Sets up Intersection Observer for lazy loading feature images
   * Images load when they enter the viewport with configured margin
   */
  function setupLazyLoading() {
    const images = document.querySelectorAll('.feature-image[loading="lazy"]');
    
    if (images.length === 0) {
      console.info('[Features] No lazy-loaded images found');
      return;
    }

    const imageObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            loadImage(img, observer);
          }
        });
      },
      {
        rootMargin: CONFIG.INTERSECTION_ROOT_MARGIN,
        threshold: CONFIG.INTERSECTION_THRESHOLD,
      }
    );

    images.forEach((img) => {
      imageObserver.observe(img);
      engagementState.imageLoadStatus.set(img, 'pending');
    });

    console.info(`[Features] Lazy loading initialized for ${images.length} images`);
  }

  /**
   * Loads an image with timeout and error handling
   * @param {HTMLImageElement} img - Image element to load
   * @param {IntersectionObserver} observer - Observer to disconnect after loading
   */
  function loadImage(img, observer) {
    const src = img.getAttribute('src');
    
    if (!src) {
      console.error('[Features] Image missing src attribute:', img);
      engagementState.imageLoadStatus.set(img, 'error');
      return;
    }

    engagementState.imageLoadStatus.set(img, 'loading');

    const timeoutId = setTimeout(() => {
      console.warn('[Features] Image load timeout:', src);
      handleImageError(img, new Error('Load timeout'));
    }, CONFIG.IMAGE_LOAD_TIMEOUT);

    const tempImage = new Image();
    
    tempImage.onload = () => {
      clearTimeout(timeoutId);
      img.src = src;
      img.classList.add('loaded');
      engagementState.imageLoadStatus.set(img, 'loaded');
      observer.unobserve(img);
      
      console.info('[Features] Image loaded successfully:', src);
    };

    tempImage.onerror = (error) => {
      clearTimeout(timeoutId);
      handleImageError(img, error);
      observer.unobserve(img);
    };

    tempImage.src = src;
  }

  /**
   * Handles image loading errors with fallback behavior
   * @param {HTMLImageElement} img - Failed image element
   * @param {Error} error - Error object
   */
  function handleImageError(img, error) {
    console.error('[Features] Image load failed:', {
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt'),
      error: error.message,
    });

    engagementState.imageLoadStatus.set(img, 'error');
    img.classList.add('load-error');
    img.setAttribute('aria-label', 'Image failed to load');

    // Optionally hide failed images gracefully
    img.style.display = 'none';
  }

  /**
   * Sets up scroll-triggered animations for feature cards
   * Cards animate in with staggered delays when entering viewport
   */
  function setupScrollAnimations() {
    const featureCards = document.querySelectorAll('.feature-card');
    
    if (featureCards.length === 0) {
      console.info('[Features] No feature cards found for animations');
      return;
    }

    const animationObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
            const delay = index * CONFIG.ANIMATION_DELAY_INCREMENT;
            
            setTimeout(() => {
              entry.target.classList.add('animated', 'fade-in-up');
              trackFeatureView(entry.target);
            }, delay);
          }
        });
      },
      {
        threshold: CONFIG.INTERSECTION_THRESHOLD,
        rootMargin: '0px',
      }
    );

    featureCards.forEach((card) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      animationObserver.observe(card);
    });

    console.info(`[Features] Scroll animations initialized for ${featureCards.length} cards`);
  }

  /**
   * Sets up hover and focus interactions for feature cards
   * Includes scale effects and accessibility enhancements
   */
  function setupFeatureCardInteractions() {
    const featureCards = document.querySelectorAll('.feature-card');

    featureCards.forEach((card) => {
      // Mouse hover interactions
      card.addEventListener('mouseenter', handleCardHover);
      card.addEventListener('mouseleave', handleCardLeave);

      // Focus interactions for accessibility
      card.addEventListener('focus', handleCardFocus, true);
      card.addEventListener('blur', handleCardBlur, true);

      // Make cards keyboard accessible
      if (!card.hasAttribute('tabindex')) {
        card.setAttribute('tabindex', '0');
      }

      // Add role for screen readers
      if (!card.hasAttribute('role')) {
        card.setAttribute('role', 'article');
      }
    });

    console.info(`[Features] Interactions initialized for ${featureCards.length} cards`);
  }

  /**
   * Handles card hover event
   * @param {MouseEvent} event - Mouse event
   */
  function handleCardHover(event) {
    const card = event.currentTarget;
    card.style.transform = `translateY(-4px) scale(${CONFIG.HOVER_SCALE})`;
    trackFeatureHover(card);
  }

  /**
   * Handles card mouse leave event
   * @param {MouseEvent} event - Mouse event
   */
  function handleCardLeave(event) {
    const card = event.currentTarget;
    card.style.transform = '';
  }

  /**
   * Handles card focus event for keyboard navigation
   * @param {FocusEvent} event - Focus event
   */
  function handleCardFocus(event) {
    const card = event.currentTarget;
    card.classList.add(CONFIG.KEYBOARD_NAVIGATION_CLASS);
    card.style.outline = '2px solid var(--color-primary)';
    card.style.outlineOffset = '4px';
  }

  /**
   * Handles card blur event
   * @param {FocusEvent} event - Blur event
   */
  function handleCardBlur(event) {
    const card = event.currentTarget;
    card.classList.remove(CONFIG.KEYBOARD_NAVIGATION_CLASS);
    card.style.outline = '';
    card.style.outlineOffset = '';
  }

  /**
   * Sets up keyboard navigation for feature cards
   * Enables arrow key navigation between cards
   */
  function setupKeyboardNavigation() {
    const featureCards = Array.from(document.querySelectorAll('.feature-card'));

    if (featureCards.length === 0) {
      return;
    }

    document.addEventListener('keydown', (event) => {
      const activeElement = document.activeElement;
      const currentIndex = featureCards.indexOf(activeElement);

      if (currentIndex === -1) {
        return;
      }

      let nextIndex = currentIndex;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          nextIndex = (currentIndex + 1) % featureCards.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          nextIndex = (currentIndex - 1 + featureCards.length) % featureCards.length;
          break;
        case 'Home':
          event.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          nextIndex = featureCards.length - 1;
          break;
        default:
          return;
      }

      featureCards[nextIndex].focus();
    });

    console.info('[Features] Keyboard navigation enabled');
  }

  /**
   * Sets up analytics tracking for feature engagement
   * Tracks views, hovers, and interactions with debouncing
   */
  function setupAnalyticsTracking() {
    // Analytics tracking is prepared but requires analytics service integration
    console.info('[Features] Analytics tracking prepared');
  }

  /**
   * Tracks when a feature card enters the viewport
   * @param {HTMLElement} card - Feature card element
   */
  function trackFeatureView(card) {
    const featureTitle = card.querySelector('h3')?.textContent || 'Unknown Feature';
    
    if (engagementState.viewedFeatures.has(featureTitle)) {
      return;
    }

    engagementState.viewedFeatures.add(featureTitle);
    
    sendAnalyticsEvent('feature_viewed', {
      feature_name: featureTitle,
      timestamp: Date.now(),
      viewport_position: card.getBoundingClientRect().top,
    });
  }

  /**
   * Tracks when a user hovers over a feature card
   * @param {HTMLElement} card - Feature card element
   */
  function trackFeatureHover(card) {
    const featureTitle = card.querySelector('h3')?.textContent || 'Unknown Feature';
    
    if (engagementState.hoveredFeatures.has(featureTitle)) {
      return;
    }

    engagementState.hoveredFeatures.add(featureTitle);
    
    sendAnalyticsEvent('feature_hovered', {
      feature_name: featureTitle,
      timestamp: Date.now(),
    });
  }

  /**
   * Sends analytics event with debouncing
   * @param {string} eventName - Name of the analytics event
   * @param {Object} eventData - Event data payload
   */
  function sendAnalyticsEvent(eventName, eventData) {
    const now = Date.now();
    
    if (now - engagementState.lastAnalyticsEvent < CONFIG.ANALYTICS_DEBOUNCE) {
      return;
    }

    engagementState.lastAnalyticsEvent = now;

    // Analytics integration point - replace with actual analytics service
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, eventData);
    } else if (typeof window.analytics === 'function') {
      window.analytics.track(eventName, eventData);
    } else {
      console.info('[Features] Analytics event:', eventName, eventData);
    }
  }

  /**
   * Public API for external control and testing
   */
  const publicAPI = Object.freeze({
    getEngagementState: () => ({
      viewedFeatures: Array.from(engagementState.viewedFeatures),
      hoveredFeatures: Array.from(engagementState.hoveredFeatures),
      imageLoadStatus: Object.fromEntries(
        Array.from(engagementState.imageLoadStatus.entries()).map(([img, status]) => [
          img.getAttribute('alt') || img.getAttribute('src'),
          status,
        ])
      ),
    }),
    reinitialize: initialize,
  });

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // Expose public API
  window.InvoiceFlowFeatures = publicAPI;

  // Add CSS for animations dynamically
  const style = document.createElement('style');
  style.textContent = `
    .feature-card.fade-in-up {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
    
    .feature-image.loaded {
      animation: fadeIn 0.4s ease-in;
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    
    .feature-card.keyboard-focus {
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.3);
    }
    
    .feature-image.load-error {
      background-color: var(--color-background-alt);
      min-height: 200px;
    }
  `;
  document.head.appendChild(style);
})();
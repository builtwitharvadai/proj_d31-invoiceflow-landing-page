/**
 * Hero Section JavaScript Module
 * Handles lazy loading, CTA interactions, and accessibility for the hero section
 * 
 * @module hero
 * @generated-from: task-id:TASK-003
 * @modifies: index.html hero section
 */

(function heroModule() {
  'use strict';

  // Configuration
  const CONFIG = Object.freeze({
    HERO_IMAGE_SELECTOR: '.hero-image',
    CTA_BUTTON_SELECTOR: '.hero-actions .btn-primary',
    INTERSECTION_THRESHOLD: 0.1,
    IMAGE_LOAD_TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
  });

  // State management
  const state = {
    imageLoaded: false,
    imageError: false,
    ctaClicked: false,
    retryCount: 0,
  };

  /**
   * Logs structured messages with context
   * @param {string} level - Log level (info, warn, error)
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  function log(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      module: 'hero',
      message,
      ...context,
    };

    if (level === 'error') {
      console.error(`[Hero] ${message}`, logEntry);
    } else if (level === 'warn') {
      console.warn(`[Hero] ${message}`, logEntry);
    } else {
      console.log(`[Hero] ${message}`, logEntry);
    }
  }

  /**
   * Implements exponential backoff with jitter
   * @param {number} attempt - Current retry attempt
   * @returns {number} Delay in milliseconds
   */
  function calculateBackoff(attempt) {
    const baseDelay = CONFIG.RETRY_DELAY;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * baseDelay;
    return Math.min(exponentialDelay + jitter, 30000);
  }

  /**
   * Validates image URL for security
   * @param {string} url - Image URL to validate
   * @returns {boolean} True if URL is valid and secure
   */
  function isValidImageUrl(url) {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'https:' && parsedUrl.hostname.includes('unsplash.com');
    } catch (_error) {
      return false;
    }
  }

  /**
   * Loads image with timeout and retry logic
   * @param {HTMLImageElement} img - Image element
   * @param {string} src - Image source URL
   * @param {number} attempt - Current attempt number
   * @returns {Promise<void>}
   */
  function loadImageWithRetry(img, src, attempt = 0) {
    return new Promise((resolve, reject) => {
      if (attempt >= CONFIG.RETRY_ATTEMPTS) {
        reject(new Error('Maximum retry attempts reached'));
        return;
      }

      if (!isValidImageUrl(src)) {
        reject(new Error('Invalid or insecure image URL'));
        return;
      }

      const timeout = setTimeout(() => {
        img.src = '';
        const timeoutError = new Error('Image load timeout');
        log('warn', 'Image load timeout, retrying', {
          attempt: attempt + 1,
          src,
        });

        const backoffDelay = calculateBackoff(attempt);
        setTimeout(() => {
          loadImageWithRetry(img, src, attempt + 1)
            .then(resolve)
            .catch(reject);
        }, backoffDelay);
      }, CONFIG.IMAGE_LOAD_TIMEOUT);

      const handleLoad = () => {
        clearTimeout(timeout);
        img.removeEventListener('load', handleLoad);
        img.removeEventListener('error', handleError);
        state.imageLoaded = true;
        state.retryCount = attempt;
        log('info', 'Hero image loaded successfully', {
          attempt: attempt + 1,
          src,
        });
        resolve();
      };

      const handleError = (error) => {
        clearTimeout(timeout);
        img.removeEventListener('load', handleLoad);
        img.removeEventListener('error', handleError);
        
        log('warn', 'Image load error, retrying', {
          attempt: attempt + 1,
          error: error.message || 'Unknown error',
          src,
        });

        const backoffDelay = calculateBackoff(attempt);
        setTimeout(() => {
          loadImageWithRetry(img, src, attempt + 1)
            .then(resolve)
            .catch(reject);
        }, backoffDelay);
      };

      img.addEventListener('load', handleLoad);
      img.addEventListener('error', handleError);
      img.src = src;
    });
  }

  /**
   * Implements lazy loading for hero image using Intersection Observer
   * @param {HTMLImageElement} img - Image element to lazy load
   */
  function setupLazyLoading(img) {
    if (!img) {
      log('warn', 'Hero image element not found');
      return;
    }

    // Check if image is already loaded (eager loading)
    if (img.complete && img.naturalHeight !== 0) {
      state.imageLoaded = true;
      log('info', 'Hero image already loaded (eager)');
      return;
    }

    // Store original src and clear it for lazy loading
    const originalSrc = img.src;
    const dataSrc = img.getAttribute('data-src') || originalSrc;

    // If loading="eager" is set, load immediately
    if (img.loading === 'eager') {
      loadImageWithRetry(img, dataSrc)
        .catch((error) => {
          state.imageError = true;
          log('error', 'Failed to load hero image after retries', {
            error: error.message,
            src: dataSrc,
          });
          img.alt = 'Image failed to load. Please refresh the page.';
        });
      return;
    }

    // Set up Intersection Observer for lazy loading
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              observer.unobserve(img);
              
              loadImageWithRetry(img, dataSrc)
                .catch((error) => {
                  state.imageError = true;
                  log('error', 'Failed to load hero image after retries', {
                    error: error.message,
                    src: dataSrc,
                  });
                  img.alt = 'Image failed to load. Please refresh the page.';
                });
            }
          });
        },
        {
          threshold: CONFIG.INTERSECTION_THRESHOLD,
          rootMargin: '50px',
        }
      );

      observer.observe(img);
      log('info', 'Lazy loading initialized for hero image');
    } else {
      // Fallback for browsers without Intersection Observer
      loadImageWithRetry(img, dataSrc)
        .catch((error) => {
          state.imageError = true;
          log('error', 'Failed to load hero image after retries', {
            error: error.message,
            src: dataSrc,
          });
          img.alt = 'Image failed to load. Please refresh the page.';
        });
    }
  }

  /**
   * Handles CTA button click events
   * @param {Event} event - Click event
   */
  function handleCtaClick(event) {
    const target = event.currentTarget;
    const href = target.getAttribute('href');

    state.ctaClicked = true;

    log('info', 'CTA button clicked', {
      href,
      text: target.textContent.trim(),
      timestamp: Date.now(),
    });

    // Placeholder for analytics tracking
    // This can be integrated with analytics services later
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'cta_click', {
        event_category: 'engagement',
        event_label: 'hero_cta',
        value: href,
      });
    }

    // Allow default navigation to proceed
  }

  /**
   * Sets up keyboard navigation for CTA button
   * @param {HTMLElement} button - CTA button element
   */
  function setupKeyboardNavigation(button) {
    if (!button) {
      return;
    }

    button.addEventListener('keydown', (event) => {
      // Handle Enter and Space keys for accessibility
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        button.click();
      }
    });

    log('info', 'Keyboard navigation initialized for CTA button');
  }

  /**
   * Initializes hero section functionality
   */
  function init() {
    try {
      log('info', 'Initializing hero section');

      // Setup lazy loading for hero image
      const heroImage = document.querySelector(CONFIG.HERO_IMAGE_SELECTOR);
      if (heroImage) {
        setupLazyLoading(heroImage);
      }

      // Setup CTA button interactions
      const ctaButton = document.querySelector(CONFIG.CTA_BUTTON_SELECTOR);
      if (ctaButton) {
        ctaButton.addEventListener('click', handleCtaClick);
        setupKeyboardNavigation(ctaButton);
        log('info', 'CTA button interactions initialized');
      } else {
        log('warn', 'CTA button not found');
      }

      // Expose state for debugging in development
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        window.__heroState = state;
        log('info', 'Hero state exposed for debugging');
      }

      log('info', 'Hero section initialized successfully');
    } catch (error) {
      log('error', 'Failed to initialize hero section', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose public API for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      init,
      state,
      loadImageWithRetry,
      isValidImageUrl,
    };
  }
})();
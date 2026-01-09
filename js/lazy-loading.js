/**
 * Lazy Loading System Module
 * Implements comprehensive lazy loading for images and content using Intersection Observer API
 * with progressive loading, error handling, and accessibility support
 * 
 * @module lazy-loading
 * @generated-from: task-id:TASK-008
 * @modifies: index.html images and content sections
 */

(function lazyLoadingModule() {
  'use strict';

  // ===================================================================
  // Configuration & Constants
  // ===================================================================
  
  const CONFIG = Object.freeze({
    INTERSECTION_THRESHOLD: [0, 0.1, 0.25, 0.5],
    INTERSECTION_ROOT_MARGIN: '50px 0px 50px 0px',
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    FADE_IN_DURATION: 300,
    PLACEHOLDER_BLUR: 20,
    LOADING_CLASS: 'lazy-loading',
    LOADED_CLASS: 'lazy-loaded',
    ERROR_CLASS: 'lazy-error',
    PLACEHOLDER_CLASS: 'lazy-placeholder',
  });

  const SELECTORS = Object.freeze({
    LAZY_IMAGES: 'img[loading="lazy"]',
    LAZY_DATA_SRC: '[data-src]',
    LAZY_DATA_SRCSET: '[data-srcset]',
    ALL_LAZY: 'img[loading="lazy"], [data-src], [data-srcset]',
  });

  const ATTRIBUTES = Object.freeze({
    DATA_SRC: 'data-src',
    DATA_SRCSET: 'data-srcset',
    DATA_SIZES: 'data-sizes',
    DATA_RETRY_COUNT: 'data-retry-count',
    DATA_ORIGINAL_SRC: 'data-original-src',
  });

  // ===================================================================
  // State Management
  // ===================================================================
  
  const state = {
    observer: null,
    loadedImages: new WeakSet(),
    failedImages: new WeakMap(),
    retryTimeouts: new WeakMap(),
    isInitialized: false,
    supportsIntersectionObserver: false,
    supportsNativeLazyLoading: false,
    prefersReducedMotion: false,
  };

  // ===================================================================
  // Utility Functions
  // ===================================================================

  /**
   * Checks if user prefers reduced motion
   * @returns {boolean}
   */
  function checkReducedMotion() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    return mediaQuery.matches;
  }

  /**
   * Safely queries DOM elements with error handling
   * @param {string} selector - CSS selector
   * @param {Element} context - Context element (default: document)
   * @returns {NodeList}
   */
  function safeQueryAll(selector, context = document) {
    try {
      return context.querySelectorAll(selector);
    } catch (error) {
      console.error(`Lazy loading: Invalid selector "${selector}"`, error);
      return [];
    }
  }

  /**
   * Checks if element is already loaded
   * @param {Element} element - Image element
   * @returns {boolean}
   */
  function isAlreadyLoaded(element) {
    return state.loadedImages.has(element) || 
           element.classList.contains(CONFIG.LOADED_CLASS);
  }

  /**
   * Gets retry count for element
   * @param {Element} element - Image element
   * @returns {number}
   */
  function getRetryCount(element) {
    const count = element.getAttribute(ATTRIBUTES.DATA_RETRY_COUNT);
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * Sets retry count for element
   * @param {Element} element - Image element
   * @param {number} count - Retry count
   */
  function setRetryCount(element, count) {
    element.setAttribute(ATTRIBUTES.DATA_RETRY_COUNT, count.toString());
  }

  /**
   * Creates placeholder for progressive loading
   * @param {Element} img - Image element
   */
  function createPlaceholder(img) {
    if (state.prefersReducedMotion) return;

    const width = img.getAttribute('width') || img.offsetWidth;
    const height = img.getAttribute('height') || img.offsetHeight;

    if (!width || !height) return;

    // Create low-quality placeholder using CSS
    img.style.backgroundColor = '#f0f0f0';
    img.style.minHeight = `${height}px`;
    img.classList.add(CONFIG.PLACEHOLDER_CLASS);
  }

  /**
   * Removes placeholder styling
   * @param {Element} img - Image element
   */
  function removePlaceholder(img) {
    img.style.backgroundColor = '';
    img.style.minHeight = '';
    img.classList.remove(CONFIG.PLACEHOLDER_CLASS);
  }

  // ===================================================================
  // Image Loading Functions
  // ===================================================================

  /**
   * Preloads image to check if it loads successfully
   * @param {string} src - Image source URL
   * @returns {Promise<string>}
   */
  function preloadImage(src) {
    return new Promise((resolve, reject) => {
      if (!src) {
        reject(new Error('No source URL provided'));
        return;
      }

      const img = new Image();
      
      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
      };

      img.onload = () => {
        cleanup();
        resolve(src);
      };

      img.onerror = () => {
        cleanup();
        reject(new Error(`Failed to load image: ${src}`));
      };

      img.src = src;
    });
  }

  /**
   * Applies fade-in animation to loaded image
   * @param {Element} img - Image element
   */
  function applyFadeIn(img) {
    if (state.prefersReducedMotion) {
      img.style.opacity = '1';
      return;
    }

    img.style.opacity = '0';
    img.style.transition = `opacity ${CONFIG.FADE_IN_DURATION}ms ease-in-out`;

    // Force reflow
    void img.offsetWidth;

    requestAnimationFrame(() => {
      img.style.opacity = '1';
    });
  }

  /**
   * Handles successful image load
   * @param {Element} img - Image element
   * @param {string} src - Loaded image source
   */
  function handleImageLoadSuccess(img, src) {
    // Remove loading state
    img.classList.remove(CONFIG.LOADING_CLASS);
    img.classList.add(CONFIG.LOADED_CLASS);
    
    // Remove placeholder
    removePlaceholder(img);
    
    // Apply fade-in animation
    applyFadeIn(img);
    
    // Mark as loaded
    state.loadedImages.add(img);
    
    // Clear retry count
    img.removeAttribute(ATTRIBUTES.DATA_RETRY_COUNT);
    
    // Clear any pending retry timeouts
    const timeout = state.retryTimeouts.get(img);
    if (timeout) {
      clearTimeout(timeout);
      state.retryTimeouts.delete(img);
    }

    // Dispatch custom event for tracking
    img.dispatchEvent(new CustomEvent('lazyloaded', {
      detail: { src },
      bubbles: true,
    }));

    console.log(`Lazy loading: Successfully loaded ${src}`);
  }

  /**
   * Handles image load error with retry logic
   * @param {Element} img - Image element
   * @param {Error} error - Error object
   */
  function handleImageLoadError(img, error) {
    const retryCount = getRetryCount(img);
    const originalSrc = img.getAttribute(ATTRIBUTES.DATA_ORIGINAL_SRC) || 
                       img.getAttribute(ATTRIBUTES.DATA_SRC);

    console.error(`Lazy loading: Failed to load image (attempt ${retryCount + 1}/${CONFIG.RETRY_ATTEMPTS})`, error);

    if (retryCount < CONFIG.RETRY_ATTEMPTS) {
      // Retry with exponential backoff
      const delay = CONFIG.RETRY_DELAY * Math.pow(2, retryCount);
      
      const timeout = setTimeout(() => {
        console.log(`Lazy loading: Retrying image load: ${originalSrc}`);
        setRetryCount(img, retryCount + 1);
        loadImage(img);
      }, delay);

      state.retryTimeouts.set(img, timeout);
    } else {
      // Max retries reached, mark as error
      img.classList.remove(CONFIG.LOADING_CLASS);
      img.classList.add(CONFIG.ERROR_CLASS);
      
      removePlaceholder(img);
      
      // Store error information
      state.failedImages.set(img, {
        src: originalSrc,
        error: error.message,
        timestamp: Date.now(),
      });

      // Set alt text as fallback content
      const altText = img.getAttribute('alt') || 'Image failed to load';
      img.setAttribute('title', `${altText} (Failed to load)`);

      // Dispatch error event
      img.dispatchEvent(new CustomEvent('lazyerror', {
        detail: { 
          src: originalSrc, 
          error: error.message,
          retries: retryCount,
        },
        bubbles: true,
      }));

      console.error(`Lazy loading: Max retries reached for ${originalSrc}`);
    }
  }

  /**
   * Loads image with data attributes
   * @param {Element} img - Image element
   */
  async function loadImage(img) {
    // Skip if already loaded or loading
    if (isAlreadyLoaded(img) || img.classList.contains(CONFIG.LOADING_CLASS)) {
      return;
    }

    const dataSrc = img.getAttribute(ATTRIBUTES.DATA_SRC);
    const dataSrcset = img.getAttribute(ATTRIBUTES.DATA_SRCSET);
    const dataSizes = img.getAttribute(ATTRIBUTES.DATA_SIZES);

    // Store original source for retry logic
    if (!img.hasAttribute(ATTRIBUTES.DATA_ORIGINAL_SRC)) {
      img.setAttribute(ATTRIBUTES.DATA_ORIGINAL_SRC, dataSrc || dataSrcset || '');
    }

    // No lazy loading attributes found
    if (!dataSrc && !dataSrcset) {
      return;
    }

    // Add loading state
    img.classList.add(CONFIG.LOADING_CLASS);
    createPlaceholder(img);

    try {
      // Preload the image to ensure it loads successfully
      const srcToLoad = dataSrc || dataSrcset.split(',')[0].trim().split(' ')[0];
      await preloadImage(srcToLoad);

      // Set the actual source attributes
      if (dataSrc) {
        img.src = dataSrc;
        img.removeAttribute(ATTRIBUTES.DATA_SRC);
      }

      if (dataSrcset) {
        img.srcset = dataSrcset;
        img.removeAttribute(ATTRIBUTES.DATA_SRCSET);
      }

      if (dataSizes) {
        img.sizes = dataSizes;
        img.removeAttribute(ATTRIBUTES.DATA_SIZES);
      }

      // Handle successful load
      handleImageLoadSuccess(img, srcToLoad);

    } catch (error) {
      handleImageLoadError(img, error);
    }
  }

  // ===================================================================
  // Intersection Observer Implementation
  // ===================================================================

  /**
   * Handles intersection observer callback
   * @param {IntersectionObserverEntry[]} entries - Observed entries
   */
  function handleIntersection(entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio > 0) {
        const img = entry.target;
        
        // Load the image
        loadImage(img);
        
        // Stop observing this image
        if (state.observer) {
          state.observer.unobserve(img);
        }
      }
    });
  }

  /**
   * Creates and configures intersection observer
   * @returns {IntersectionObserver | null}
   */
  function createIntersectionObserver() {
    if (!state.supportsIntersectionObserver) {
      return null;
    }

    try {
      const options = {
        root: null,
        rootMargin: CONFIG.INTERSECTION_ROOT_MARGIN,
        threshold: CONFIG.INTERSECTION_THRESHOLD,
      };

      return new IntersectionObserver(handleIntersection, options);
    } catch (error) {
      console.error('Lazy loading: Failed to create IntersectionObserver', error);
      return null;
    }
  }

  /**
   * Initializes lazy loading with Intersection Observer
   */
  function initIntersectionObserver() {
    state.observer = createIntersectionObserver();

    if (!state.observer) {
      console.warn('Lazy loading: IntersectionObserver not available, loading all images immediately');
      loadAllImagesImmediately();
      return;
    }

    // Observe all lazy images
    const lazyImages = safeQueryAll(SELECTORS.ALL_LAZY);
    
    lazyImages.forEach((img) => {
      // Skip images that are already loaded
      if (isAlreadyLoaded(img)) {
        return;
      }

      // Observe the image
      state.observer.observe(img);
    });

    console.log(`Lazy loading: Observing ${lazyImages.length} images`);
  }

  // ===================================================================
  // Fallback Implementation
  // ===================================================================

  /**
   * Loads all images immediately (fallback for unsupported browsers)
   */
  function loadAllImagesImmediately() {
    const lazyImages = safeQueryAll(SELECTORS.ALL_LAZY);
    
    lazyImages.forEach((img) => {
      if (!isAlreadyLoaded(img)) {
        loadImage(img);
      }
    });
  }

  /**
   * Initializes fallback for browsers without Intersection Observer
   */
  function initFallback() {
    console.log('Lazy loading: Using fallback mode (no IntersectionObserver)');
    
    // Load images that are in viewport immediately
    const lazyImages = safeQueryAll(SELECTORS.ALL_LAZY);
    
    lazyImages.forEach((img) => {
      if (isInViewport(img)) {
        loadImage(img);
      }
    });

    // Load remaining images on scroll with debouncing
    let scrollTimeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const remainingImages = safeQueryAll(SELECTORS.ALL_LAZY);
        remainingImages.forEach((img) => {
          if (!isAlreadyLoaded(img) && isInViewport(img)) {
            loadImage(img);
          }
        });
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
  }

  /**
   * Checks if element is in viewport
   * @param {Element} element - Element to check
   * @returns {boolean}
   */
  function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;

    return (
      rect.top <= windowHeight &&
      rect.bottom >= 0 &&
      rect.left <= windowWidth &&
      rect.right >= 0
    );
  }

  // ===================================================================
  // Feature Detection
  // ===================================================================

  /**
   * Detects browser support for lazy loading features
   */
  function detectFeatureSupport() {
    // Check for Intersection Observer support
    state.supportsIntersectionObserver = 'IntersectionObserver' in window &&
                                         'IntersectionObserverEntry' in window &&
                                         'intersectionRatio' in window.IntersectionObserverEntry.prototype;

    // Check for native lazy loading support
    state.supportsNativeLazyLoading = 'loading' in HTMLImageElement.prototype;

    // Check for reduced motion preference
    state.prefersReducedMotion = checkReducedMotion();

    console.log('Lazy loading: Feature detection', {
      intersectionObserver: state.supportsIntersectionObserver,
      nativeLazyLoading: state.supportsNativeLazyLoading,
      reducedMotion: state.prefersReducedMotion,
    });
  }

  // ===================================================================
  // Dynamic Content Support
  // ===================================================================

  /**
   * Observes DOM for dynamically added images
   */
  function observeDynamicContent() {
    if (!('MutationObserver' in window)) {
      return;
    }

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the node itself is a lazy image
            if (node.matches && node.matches(SELECTORS.ALL_LAZY)) {
              if (state.observer) {
                state.observer.observe(node);
              } else {
                loadImage(node);
              }
            }

            // Check for lazy images within the added node
            const lazyImages = safeQueryAll(SELECTORS.ALL_LAZY, node);
            lazyImages.forEach((img) => {
              if (state.observer) {
                state.observer.observe(img);
              } else {
                loadImage(img);
              }
            });
          }
        });
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // ===================================================================
  // Public API
  // ===================================================================

  /**
   * Manually loads a specific image
   * @param {Element} img - Image element to load
   */
  function loadImageManually(img) {
    if (!img || img.nodeType !== Node.ELEMENT_NODE) {
      console.error('Lazy loading: Invalid element provided to loadImageManually');
      return;
    }

    loadImage(img);
  }

  /**
   * Resets failed image for retry
   * @param {Element} img - Image element to reset
   */
  function resetFailedImage(img) {
    if (!img || img.nodeType !== Node.ELEMENT_NODE) {
      console.error('Lazy loading: Invalid element provided to resetFailedImage');
      return;
    }

    img.classList.remove(CONFIG.ERROR_CLASS);
    img.removeAttribute(ATTRIBUTES.DATA_RETRY_COUNT);
    state.failedImages.delete(img);

    const timeout = state.retryTimeouts.get(img);
    if (timeout) {
      clearTimeout(timeout);
      state.retryTimeouts.delete(img);
    }

    loadImage(img);
  }

  /**
   * Gets statistics about lazy loading
   * @returns {Object}
   */
  function getStats() {
    const allImages = safeQueryAll(SELECTORS.ALL_LAZY);
    const loadedCount = Array.from(allImages).filter((img) => isAlreadyLoaded(img)).length;
    const failedCount = state.failedImages.size;

    return {
      total: allImages.length,
      loaded: loadedCount,
      failed: failedCount,
      pending: allImages.length - loadedCount - failedCount,
    };
  }

  // ===================================================================
  // Cleanup
  // ===================================================================

  /**
   * Cleans up observers and event listeners
   */
  function cleanup() {
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }

    // Clear all retry timeouts
    state.retryTimeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    state.retryTimeouts.clear();

    state.isInitialized = false;
    console.log('Lazy loading: Cleanup completed');
  }

  // ===================================================================
  // Initialization
  // ===================================================================

  /**
   * Initializes lazy loading system
   */
  function init() {
    // Check if DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    // Prevent double initialization
    if (state.isInitialized) {
      console.warn('Lazy loading: Already initialized');
      return;
    }

    try {
      // Detect feature support
      detectFeatureSupport();

      // Initialize appropriate loading strategy
      if (state.supportsIntersectionObserver) {
        initIntersectionObserver();
      } else {
        initFallback();
      }

      // Observe for dynamically added content
      observeDynamicContent();

      state.isInitialized = true;
      console.log('Lazy loading system initialized successfully');

    } catch (error) {
      console.error('Lazy loading: Initialization failed', error);
      
      // Fallback: load all images immediately
      loadAllImagesImmediately();
    }
  }

  // ===================================================================
  // Export Public API
  // ===================================================================

  window.LazyLoading = Object.freeze({
    init,
    cleanup,
    loadImage: loadImageManually,
    resetFailedImage,
    getStats,
  });

  // Auto-initialize
  init();
})();
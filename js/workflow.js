/**
 * Workflow Section Animation and Lazy Loading Module
 * 
 * Implements scroll-triggered animations, lazy loading for workflow images,
 * and progressive disclosure of workflow steps with accessibility support.
 * 
 * @module workflow
 * @generated-from: task-id:TASK-005
 * @modifies: index.html workflow section
 * @dependencies: []
 */

(function initWorkflowModule() {
  'use strict';

  // Configuration constants
  const CONFIG = Object.freeze({
    INTERSECTION_THRESHOLD: 0.15,
    INTERSECTION_ROOT_MARGIN: '0px 0px -10% 0px',
    ANIMATION_DELAY_BASE: 150,
    ANIMATION_DELAY_INCREMENT: 100,
    IMAGE_LOADING_TIMEOUT: 10000,
    REDUCED_MOTION_QUERY: '(prefers-reduced-motion: reduce)',
    SELECTORS: {
      WORKFLOW_STEPS: '.workflow-step',
      STEP_IMAGES: '.step-image',
      STEP_NUMBER: '.step-number',
      STEP_CONTENT: '.step-content'
    },
    CLASSES: {
      ANIMATED: 'workflow-step--animated',
      VISIBLE: 'workflow-step--visible',
      IMAGE_LOADING: 'step-image--loading',
      IMAGE_LOADED: 'step-image--loaded',
      IMAGE_ERROR: 'step-image--error'
    },
    ARIA_LABELS: {
      LOADING: 'Loading workflow step image',
      LOADED: 'Workflow step image loaded',
      ERROR: 'Failed to load workflow step image'
    }
  });

  // State management
  const state = {
    initialized: false,
    observer: null,
    reducedMotion: false,
    visibleSteps: new Set(),
    loadingImages: new Map(),
    errorImages: new Set()
  };

  /**
   * Checks if user prefers reduced motion
   * @returns {boolean} True if reduced motion is preferred
   */
  function checkReducedMotion() {
    try {
      const mediaQuery = window.matchMedia(CONFIG.REDUCED_MOTION_QUERY);
      return mediaQuery.matches;
    } catch (error) {
      console.warn('[Workflow] Failed to check reduced motion preference:', error);
      return false;
    }
  }

  /**
   * Applies animation classes to workflow step with delay
   * @param {HTMLElement} step - The workflow step element
   * @param {number} index - The step index for staggered animation
   */
  function animateStep(step, index) {
    if (!step || state.visibleSteps.has(step)) {
      return;
    }

    const delay = state.reducedMotion 
      ? 0 
      : CONFIG.ANIMATION_DELAY_BASE + (index * CONFIG.ANIMATION_DELAY_INCREMENT);

    state.visibleSteps.add(step);

    setTimeout(() => {
      try {
        step.classList.add(CONFIG.CLASSES.ANIMATED);
        
        requestAnimationFrame(() => {
          step.classList.add(CONFIG.CLASSES.VISIBLE);
        });

        const stepNumber = step.querySelector(CONFIG.SELECTORS.STEP_NUMBER);
        const stepContent = step.querySelector(CONFIG.SELECTORS.STEP_CONTENT);

        if (stepNumber) {
          stepNumber.setAttribute('aria-hidden', 'false');
        }

        if (stepContent) {
          stepContent.setAttribute('aria-hidden', 'false');
        }
      } catch (error) {
        console.error('[Workflow] Failed to animate step:', error);
      }
    }, delay);
  }

  /**
   * Handles successful image load
   * @param {HTMLImageElement} img - The loaded image element
   */
  function handleImageLoad(img) {
    if (!img) {
      return;
    }

    try {
      img.classList.remove(CONFIG.CLASSES.IMAGE_LOADING);
      img.classList.add(CONFIG.CLASSES.IMAGE_LOADED);
      img.setAttribute('aria-label', CONFIG.ARIA_LABELS.LOADED);

      state.loadingImages.delete(img);

      console.debug('[Workflow] Image loaded successfully:', img.src);
    } catch (error) {
      console.error('[Workflow] Failed to handle image load:', error);
    }
  }

  /**
   * Handles image load error with fallback
   * @param {HTMLImageElement} img - The image element that failed to load
   */
  function handleImageError(img) {
    if (!img || state.errorImages.has(img)) {
      return;
    }

    try {
      img.classList.remove(CONFIG.CLASSES.IMAGE_LOADING);
      img.classList.add(CONFIG.CLASSES.IMAGE_ERROR);
      img.setAttribute('aria-label', CONFIG.ARIA_LABELS.ERROR);

      state.errorImages.add(img);
      state.loadingImages.delete(img);

      console.error('[Workflow] Failed to load image:', img.src);

      // Hide broken image gracefully
      img.style.display = 'none';
    } catch (error) {
      console.error('[Workflow] Failed to handle image error:', error);
    }
  }

  /**
   * Implements lazy loading for workflow step image
   * @param {HTMLImageElement} img - The image element to lazy load
   */
  function lazyLoadImage(img) {
    if (!img || state.loadingImages.has(img) || state.errorImages.has(img)) {
      return;
    }

    const dataSrc = img.getAttribute('data-src') || img.getAttribute('src');
    
    if (!dataSrc) {
      console.warn('[Workflow] Image missing src attribute:', img);
      return;
    }

    try {
      img.classList.add(CONFIG.CLASSES.IMAGE_LOADING);
      img.setAttribute('aria-label', CONFIG.ARIA_LABELS.LOADING);

      state.loadingImages.set(img, Date.now());

      // Set up timeout for loading
      const timeoutId = setTimeout(() => {
        if (state.loadingImages.has(img)) {
          console.warn('[Workflow] Image loading timeout:', dataSrc);
          handleImageError(img);
        }
      }, CONFIG.IMAGE_LOADING_TIMEOUT);

      // Set up load handlers
      const onLoad = () => {
        clearTimeout(timeoutId);
        handleImageLoad(img);
        cleanup();
      };

      const onError = () => {
        clearTimeout(timeoutId);
        handleImageError(img);
        cleanup();
      };

      const cleanup = () => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
      };

      img.addEventListener('load', onLoad, { once: true });
      img.addEventListener('error', onError, { once: true });

      // Trigger load if src is already set, otherwise set it
      if (img.src === dataSrc) {
        if (img.complete) {
          onLoad();
        }
      } else {
        img.src = dataSrc;
      }
    } catch (error) {
      console.error('[Workflow] Failed to lazy load image:', error);
      handleImageError(img);
    }
  }

  /**
   * Intersection Observer callback for workflow steps
   * @param {IntersectionObserverEntry[]} entries - Observed entries
   */
  function handleIntersection(entries) {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        const step = entry.target;
        
        // Animate the step
        animateStep(step, index);

        // Lazy load images within the step
        const images = step.querySelectorAll(CONFIG.SELECTORS.STEP_IMAGES);
        images.forEach(img => lazyLoadImage(img));

        // Stop observing once animated
        if (state.observer) {
          state.observer.unobserve(step);
        }
      }
    });
  }

  /**
   * Initializes Intersection Observer for workflow steps
   * @returns {IntersectionObserver|null} The created observer or null on failure
   */
  function initIntersectionObserver() {
    if (!('IntersectionObserver' in window)) {
      console.warn('[Workflow] IntersectionObserver not supported, falling back to immediate load');
      return null;
    }

    try {
      const options = {
        root: null,
        rootMargin: CONFIG.INTERSECTION_ROOT_MARGIN,
        threshold: CONFIG.INTERSECTION_THRESHOLD
      };

      return new IntersectionObserver(handleIntersection, options);
    } catch (error) {
      console.error('[Workflow] Failed to create IntersectionObserver:', error);
      return null;
    }
  }

  /**
   * Sets up workflow steps for observation and animation
   */
  function setupWorkflowSteps() {
    const steps = document.querySelectorAll(CONFIG.SELECTORS.WORKFLOW_STEPS);

    if (steps.length === 0) {
      console.debug('[Workflow] No workflow steps found');
      return;
    }

    // Initialize observer
    state.observer = initIntersectionObserver();

    steps.forEach((step, index) => {
      try {
        // Set initial ARIA attributes
        const stepNumber = step.querySelector(CONFIG.SELECTORS.STEP_NUMBER);
        const stepContent = step.querySelector(CONFIG.SELECTORS.STEP_CONTENT);

        if (stepNumber) {
          stepNumber.setAttribute('aria-hidden', 'true');
        }

        if (stepContent) {
          stepContent.setAttribute('aria-hidden', 'true');
        }

        // Observe step or animate immediately if no observer
        if (state.observer) {
          state.observer.observe(step);
        } else {
          // Fallback: animate immediately
          animateStep(step, index);
          
          const images = step.querySelectorAll(CONFIG.SELECTORS.STEP_IMAGES);
          images.forEach(img => lazyLoadImage(img));
        }
      } catch (error) {
        console.error('[Workflow] Failed to setup workflow step:', error);
      }
    });

    console.debug(`[Workflow] Initialized ${steps.length} workflow steps`);
  }

  /**
   * Handles reduced motion preference changes
   * @param {MediaQueryListEvent} event - The media query change event
   */
  function handleReducedMotionChange(event) {
    state.reducedMotion = event.matches;
    console.debug('[Workflow] Reduced motion preference changed:', state.reducedMotion);
  }

  /**
   * Sets up reduced motion listener
   */
  function setupReducedMotionListener() {
    try {
      const mediaQuery = window.matchMedia(CONFIG.REDUCED_MOTION_QUERY);
      
      // Modern browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleReducedMotionChange);
      } else if (mediaQuery.addListener) {
        // Legacy browsers
        mediaQuery.addListener(handleReducedMotionChange);
      }
    } catch (error) {
      console.warn('[Workflow] Failed to setup reduced motion listener:', error);
    }
  }

  /**
   * Cleans up resources and observers
   */
  function cleanup() {
    try {
      if (state.observer) {
        state.observer.disconnect();
        state.observer = null;
      }

      state.visibleSteps.clear();
      state.loadingImages.clear();
      state.errorImages.clear();

      console.debug('[Workflow] Cleanup completed');
    } catch (error) {
      console.error('[Workflow] Failed to cleanup:', error);
    }
  }

  /**
   * Initializes the workflow module
   */
  function init() {
    if (state.initialized) {
      console.warn('[Workflow] Module already initialized');
      return;
    }

    try {
      // Check reduced motion preference
      state.reducedMotion = checkReducedMotion();
      setupReducedMotionListener();

      // Setup workflow steps
      setupWorkflowSteps();

      // Cleanup on page unload
      window.addEventListener('beforeunload', cleanup, { once: true });

      state.initialized = true;
      console.debug('[Workflow] Module initialized successfully');
    } catch (error) {
      console.error('[Workflow] Failed to initialize module:', error);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // Expose cleanup for testing/debugging
  if (typeof window !== 'undefined') {
    window.workflowModule = { cleanup };
  }
})();
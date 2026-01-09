/**
 * Animation System Module
 * Handles scroll-triggered animations, smooth scrolling, and interactive effects
 * 
 * @module animations
 * @generated-from: task-id:TASK-007
 * @modifies: index.html sections and navigation
 */

(function animationSystemModule() {
  'use strict';

  // ===================================================================
  // Configuration & Constants
  // ===================================================================
  
  const CONFIG = Object.freeze({
    SCROLL_BEHAVIOR: 'smooth',
    INTERSECTION_THRESHOLD: [0, 0.1, 0.25, 0.5, 0.75, 1],
    INTERSECTION_ROOT_MARGIN: '-10% 0px -10% 0px',
    STAGGER_DELAY: 100,
    ANIMATION_DURATION: 600,
    DEBOUNCE_DELAY: 150,
    REDUCED_MOTION_DURATION: 10,
  });

  const ANIMATION_CLASSES = Object.freeze({
    HIDDEN: 'animate-hidden',
    VISIBLE: 'animate-visible',
    STAGGER: 'animate-stagger',
  });

  const SELECTORS = Object.freeze({
    NAV_LINKS: '.nav-menu a[href^="#"]',
    CTA_BUTTONS: '.btn-primary, .btn-secondary',
    ANIMATED_SECTIONS: '.features, .how-it-works, .lead-capture',
    FEATURE_CARDS: '.feature-card',
    WORKFLOW_STEPS: '.workflow-step',
    HERO_ACTIONS: '.hero-actions .btn-large',
  });

  // ===================================================================
  // State Management
  // ===================================================================
  
  const state = {
    observers: new Map(),
    animatedElements: new Set(),
    prefersReducedMotion: false,
    isInitialized: false,
    scrollTimeout: null,
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
   * Debounces function execution
   * @param {Function} func - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function}
   */
  function debounce(func, delay) {
    let timeoutId;
    return function debounced(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
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
      console.error(`Animation system: Invalid selector "${selector}"`, error);
      return [];
    }
  }

  /**
   * Adds CSS class with error handling
   * @param {Element} element - Target element
   * @param {string} className - Class to add
   */
  function safeAddClass(element, className) {
    if (!element || !element.classList) {
      console.warn('Animation system: Invalid element for class addition');
      return;
    }
    element.classList.add(className);
  }

  /**
   * Removes CSS class with error handling
   * @param {Element} element - Target element
   * @param {string} className - Class to remove
   */
  function safeRemoveClass(element, className) {
    if (!element || !element.classList) {
      console.warn('Animation system: Invalid element for class removal');
      return;
    }
    element.classList.remove(className);
  }

  // ===================================================================
  // Smooth Scroll Navigation
  // ===================================================================

  /**
   * Handles smooth scroll to target section
   * @param {Event} event - Click event
   */
  function handleSmoothScroll(event) {
    const link = event.currentTarget;
    const targetId = link.getAttribute('href');

    // Only handle internal anchor links
    if (!targetId || !targetId.startsWith('#')) {
      return;
    }

    event.preventDefault();

    const targetElement = document.querySelector(targetId);
    
    if (!targetElement) {
      console.warn(`Animation system: Target element "${targetId}" not found`);
      return;
    }

    try {
      // Calculate offset for fixed header
      const headerHeight = document.querySelector('header')?.offsetHeight || 0;
      const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;

      if (state.prefersReducedMotion) {
        // Instant scroll for reduced motion preference
        window.scrollTo({
          top: targetPosition,
          behavior: 'auto',
        });
      } else {
        // Smooth scroll
        window.scrollTo({
          top: targetPosition,
          behavior: CONFIG.SCROLL_BEHAVIOR,
        });
      }

      // Update URL without triggering scroll
      if (history.pushState) {
        history.pushState(null, '', targetId);
      }

      // Focus target for accessibility
      targetElement.setAttribute('tabindex', '-1');
      targetElement.focus({ preventScroll: true });
      
      // Remove tabindex after focus
      setTimeout(() => {
        targetElement.removeAttribute('tabindex');
      }, 1000);

    } catch (error) {
      console.error('Animation system: Smooth scroll failed', error);
      // Fallback to default behavior
      window.location.hash = targetId;
    }
  }

  /**
   * Initializes smooth scroll for navigation links
   */
  function initSmoothScroll() {
    const navLinks = safeQueryAll(SELECTORS.NAV_LINKS);
    
    navLinks.forEach((link) => {
      link.addEventListener('click', handleSmoothScroll);
    });

    // Also handle hero CTA buttons that link to sections
    const heroButtons = safeQueryAll(SELECTORS.HERO_ACTIONS);
    heroButtons.forEach((button) => {
      const href = button.getAttribute('href');
      if (href && href.startsWith('#')) {
        button.addEventListener('click', handleSmoothScroll);
      }
    });
  }

  // ===================================================================
  // Intersection Observer for Scroll Animations
  // ===================================================================

  /**
   * Handles intersection observer callback
   * @param {IntersectionObserverEntry[]} entries - Observed entries
   */
  function handleIntersection(entries) {
    entries.forEach((entry) => {
      const element = entry.target;

      if (entry.isIntersecting && entry.intersectionRatio >= 0.1) {
        // Element is visible
        if (!state.animatedElements.has(element)) {
          animateElement(element);
          state.animatedElements.add(element);
        }
      }
    });
  }

  /**
   * Animates element with stagger effect for children
   * @param {Element} element - Element to animate
   */
  function animateElement(element) {
    if (state.prefersReducedMotion) {
      // Skip animations for reduced motion
      safeRemoveClass(element, ANIMATION_CLASSES.HIDDEN);
      safeAddClass(element, ANIMATION_CLASSES.VISIBLE);
      return;
    }

    // Animate parent element
    safeRemoveClass(element, ANIMATION_CLASSES.HIDDEN);
    safeAddClass(element, ANIMATION_CLASSES.VISIBLE);

    // Apply stagger effect to children if they exist
    const children = element.querySelectorAll(
      `${SELECTORS.FEATURE_CARDS}, ${SELECTORS.WORKFLOW_STEPS}`
    );

    if (children.length > 0) {
      children.forEach((child, index) => {
        const delay = index * CONFIG.STAGGER_DELAY;
        
        setTimeout(() => {
          safeRemoveClass(child, ANIMATION_CLASSES.HIDDEN);
          safeAddClass(child, ANIMATION_CLASSES.VISIBLE);
        }, delay);
      });
    }
  }

  /**
   * Creates and configures intersection observer
   * @returns {IntersectionObserver | null}
   */
  function createIntersectionObserver() {
    if (!('IntersectionObserver' in window)) {
      console.warn('Animation system: IntersectionObserver not supported');
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
      console.error('Animation system: Failed to create IntersectionObserver', error);
      return null;
    }
  }

  /**
   * Initializes scroll-triggered animations
   */
  function initScrollAnimations() {
    const observer = createIntersectionObserver();
    
    if (!observer) {
      // Fallback: show all elements immediately
      const sections = safeQueryAll(SELECTORS.ANIMATED_SECTIONS);
      sections.forEach((section) => {
        safeRemoveClass(section, ANIMATION_CLASSES.HIDDEN);
        safeAddClass(section, ANIMATION_CLASSES.VISIBLE);
      });
      return;
    }

    // Observe animated sections
    const sections = safeQueryAll(SELECTORS.ANIMATED_SECTIONS);
    
    sections.forEach((section) => {
      // Add hidden class initially
      safeAddClass(section, ANIMATION_CLASSES.HIDDEN);
      
      // Observe section
      observer.observe(section);
      
      // Store observer reference
      state.observers.set(section, observer);
    });
  }

  // ===================================================================
  // CTA Button Interactions
  // ===================================================================

  /**
   * Handles CTA button hover effect
   * @param {Event} event - Mouse event
   */
  function handleButtonHover(event) {
    if (state.prefersReducedMotion) return;

    const button = event.currentTarget;
    
    if (event.type === 'mouseenter') {
      button.style.transform = 'translateY(-2px)';
    } else if (event.type === 'mouseleave') {
      button.style.transform = 'translateY(0)';
    }
  }

  /**
   * Handles CTA button click effect
   * @param {Event} event - Click event
   */
  function handleButtonClick(event) {
    if (state.prefersReducedMotion) return;

    const button = event.currentTarget;
    
    // Add click animation class
    button.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
      button.style.transform = '';
    }, 150);
  }

  /**
   * Initializes CTA button interactions
   */
  function initButtonInteractions() {
    const buttons = safeQueryAll(SELECTORS.CTA_BUTTONS);
    
    buttons.forEach((button) => {
      // Hover effects
      button.addEventListener('mouseenter', handleButtonHover);
      button.addEventListener('mouseleave', handleButtonHover);
      
      // Click effect
      button.addEventListener('click', handleButtonClick);
      
      // Touch support for mobile
      button.addEventListener('touchstart', () => {
        if (!state.prefersReducedMotion) {
          button.style.transform = 'scale(0.95)';
        }
      }, { passive: true });
      
      button.addEventListener('touchend', () => {
        if (!state.prefersReducedMotion) {
          setTimeout(() => {
            button.style.transform = '';
          }, 150);
        }
      }, { passive: true });
    });
  }

  // ===================================================================
  // Reduced Motion Support
  // ===================================================================

  /**
   * Handles reduced motion preference changes
   * @param {MediaQueryListEvent} event - Media query change event
   */
  function handleReducedMotionChange(event) {
    state.prefersReducedMotion = event.matches;
    
    if (state.prefersReducedMotion) {
      // Remove all animation classes
      const animatedElements = safeQueryAll(
        `${SELECTORS.ANIMATED_SECTIONS}, ${SELECTORS.FEATURE_CARDS}, ${SELECTORS.WORKFLOW_STEPS}`
      );
      
      animatedElements.forEach((element) => {
        safeRemoveClass(element, ANIMATION_CLASSES.HIDDEN);
        safeAddClass(element, ANIMATION_CLASSES.VISIBLE);
      });
    }
  }

  /**
   * Initializes reduced motion support
   */
  function initReducedMotionSupport() {
    state.prefersReducedMotion = checkReducedMotion();
    
    // Listen for preference changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleReducedMotionChange);
    } else if (mediaQuery.addListener) {
      // Fallback for older browsers
      mediaQuery.addListener(handleReducedMotionChange);
    }
  }

  // ===================================================================
  // Performance Optimization
  // ===================================================================

  /**
   * Handles scroll event with debouncing
   */
  const handleScroll = debounce(() => {
    // Placeholder for future scroll-based optimizations
    // Currently handled by IntersectionObserver
  }, CONFIG.DEBOUNCE_DELAY);

  /**
   * Initializes performance optimizations
   */
  function initPerformanceOptimizations() {
    // Passive event listeners for better scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Optimize animations on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Pause animations when page is hidden
        state.observers.forEach((observer) => {
          observer.disconnect();
        });
      } else {
        // Resume animations when page is visible
        initScrollAnimations();
      }
    });
  }

  // ===================================================================
  // Cleanup
  // ===================================================================

  /**
   * Cleans up all observers and event listeners
   */
  function cleanup() {
    // Disconnect all observers
    state.observers.forEach((observer) => {
      observer.disconnect();
    });
    state.observers.clear();
    
    // Clear animated elements set
    state.animatedElements.clear();
    
    // Remove event listeners
    const navLinks = safeQueryAll(SELECTORS.NAV_LINKS);
    navLinks.forEach((link) => {
      link.removeEventListener('click', handleSmoothScroll);
    });
    
    const buttons = safeQueryAll(SELECTORS.CTA_BUTTONS);
    buttons.forEach((button) => {
      button.removeEventListener('mouseenter', handleButtonHover);
      button.removeEventListener('mouseleave', handleButtonHover);
      button.removeEventListener('click', handleButtonClick);
    });
    
    window.removeEventListener('scroll', handleScroll);
    
    state.isInitialized = false;
  }

  // ===================================================================
  // Initialization
  // ===================================================================

  /**
   * Initializes animation system
   */
  function init() {
    // Check if DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    // Prevent double initialization
    if (state.isInitialized) {
      console.warn('Animation system: Already initialized');
      return;
    }

    try {
      // Initialize all animation features
      initReducedMotionSupport();
      initSmoothScroll();
      initScrollAnimations();
      initButtonInteractions();
      initPerformanceOptimizations();
      
      state.isInitialized = true;
      console.log('Animation system initialized successfully');
    } catch (error) {
      console.error('Animation system: Initialization failed', error);
      
      // Fallback: ensure content is visible
      const sections = safeQueryAll(SELECTORS.ANIMATED_SECTIONS);
      sections.forEach((section) => {
        safeRemoveClass(section, ANIMATION_CLASSES.HIDDEN);
        safeAddClass(section, ANIMATION_CLASSES.VISIBLE);
      });
    }
  }

  // ===================================================================
  // Public API
  // ===================================================================

  window.AnimationSystem = Object.freeze({
    init,
    cleanup,
  });

  // Auto-initialize
  init();
})();
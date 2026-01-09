/**
 * Navigation System Module
 * Handles smooth scroll navigation, active section highlighting, and keyboard navigation
 * 
 * @module navigation
 * @generated-from: task-id:TASK-007
 * @modifies: index.html navigation and sections
 */

(function navigationSystemModule() {
  'use strict';

  // ===================================================================
  // Configuration & Constants
  // ===================================================================
  
  const CONFIG = Object.freeze({
    SCROLL_OFFSET: 80,
    ACTIVE_THRESHOLD: 0.5,
    DEBOUNCE_DELAY: 100,
    SCROLL_BEHAVIOR: 'smooth',
    KEYBOARD_SCROLL_AMOUNT: 100,
  });

  const SELECTORS = Object.freeze({
    NAV_LINKS: '.nav-menu a[href^="#"]',
    NAV_MENU: '.nav-menu',
    SECTIONS: 'section[id]',
    HEADER: 'header',
    SKIP_LINK: '.skip-link',
  });

  const CLASSES = Object.freeze({
    ACTIVE: 'active',
    SCROLLING: 'is-scrolling',
  });

  const KEYS = Object.freeze({
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    PAGE_UP: 'PageUp',
    PAGE_DOWN: 'PageDown',
    HOME: 'Home',
    END: 'End',
  });

  // ===================================================================
  // State Management
  // ===================================================================
  
  const state = {
    isInitialized: false,
    prefersReducedMotion: false,
    currentSection: null,
    sections: [],
    navLinks: [],
    headerHeight: 0,
    scrollTimeout: null,
    isScrolling: false,
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
      console.error(`Navigation system: Invalid selector "${selector}"`, error);
      return [];
    }
  }

  /**
   * Safely queries single DOM element with error handling
   * @param {string} selector - CSS selector
   * @param {Element} context - Context element (default: document)
   * @returns {Element | null}
   */
  function safeQuery(selector, context = document) {
    try {
      return context.querySelector(selector);
    } catch (error) {
      console.error(`Navigation system: Invalid selector "${selector}"`, error);
      return null;
    }
  }

  /**
   * Gets header height for scroll offset calculation
   * @returns {number}
   */
  function getHeaderHeight() {
    const header = safeQuery(SELECTORS.HEADER);
    return header ? header.offsetHeight : CONFIG.SCROLL_OFFSET;
  }

  /**
   * Gets section ID from hash
   * @param {string} hash - URL hash
   * @returns {string | null}
   */
  function getSectionIdFromHash(hash) {
    if (!hash || !hash.startsWith('#')) {
      return null;
    }
    return hash.substring(1);
  }

  // ===================================================================
  // Smooth Scroll Navigation
  // ===================================================================

  /**
   * Scrolls to target element smoothly
   * @param {Element} targetElement - Element to scroll to
   * @param {boolean} updateHistory - Whether to update browser history
   */
  function scrollToElement(targetElement, updateHistory = true) {
    if (!targetElement) {
      console.warn('Navigation system: Target element not found');
      return;
    }

    try {
      const targetPosition = targetElement.getBoundingClientRect().top + 
                           window.pageYOffset - 
                           state.headerHeight;

      if (state.prefersReducedMotion) {
        window.scrollTo({
          top: targetPosition,
          behavior: 'auto',
        });
      } else {
        window.scrollTo({
          top: targetPosition,
          behavior: CONFIG.SCROLL_BEHAVIOR,
        });
      }

      if (updateHistory && targetElement.id) {
        const hash = `#${targetElement.id}`;
        if (history.pushState) {
          history.pushState(null, '', hash);
        } else {
          window.location.hash = hash;
        }
      }

      // Set focus for accessibility
      targetElement.setAttribute('tabindex', '-1');
      targetElement.focus({ preventScroll: true });
      
      setTimeout(() => {
        targetElement.removeAttribute('tabindex');
      }, 1000);

    } catch (error) {
      console.error('Navigation system: Scroll failed', error);
    }
  }

  /**
   * Handles navigation link click
   * @param {Event} event - Click event
   */
  function handleNavLinkClick(event) {
    const link = event.currentTarget;
    const targetId = getSectionIdFromHash(link.getAttribute('href'));

    if (!targetId) {
      return;
    }

    event.preventDefault();

    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      scrollToElement(targetElement, true);
      updateActiveNavLink(link);
    }
  }

  /**
   * Initializes smooth scroll for navigation links
   */
  function initSmoothScroll() {
    const navLinks = safeQueryAll(SELECTORS.NAV_LINKS);
    
    navLinks.forEach((link) => {
      link.addEventListener('click', handleNavLinkClick);
      state.navLinks.push(link);
    });

    // Handle skip link
    const skipLink = safeQuery(SELECTORS.SKIP_LINK);
    if (skipLink) {
      skipLink.addEventListener('click', (event) => {
        const targetId = getSectionIdFromHash(skipLink.getAttribute('href'));
        if (targetId) {
          event.preventDefault();
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            scrollToElement(targetElement, false);
          }
        }
      });
    }
  }

  // ===================================================================
  // Active Section Highlighting
  // ===================================================================

  /**
   * Updates active navigation link
   * @param {Element} activeLink - Link to mark as active
   */
  function updateActiveNavLink(activeLink) {
    state.navLinks.forEach((link) => {
      link.classList.remove(CLASSES.ACTIVE);
      link.removeAttribute('aria-current');
    });

    if (activeLink) {
      activeLink.classList.add(CLASSES.ACTIVE);
      activeLink.setAttribute('aria-current', 'page');
    }
  }

  /**
   * Gets currently visible section
   * @returns {Element | null}
   */
  function getCurrentSection() {
    const scrollPosition = window.pageYOffset + state.headerHeight + 50;
    
    let currentSection = null;
    let maxVisibility = 0;

    state.sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const sectionTop = rect.top + window.pageYOffset;
      const sectionBottom = sectionTop + rect.height;
      
      if (scrollPosition >= sectionTop && scrollPosition <= sectionBottom) {
        const visibleHeight = Math.min(sectionBottom, scrollPosition + window.innerHeight) - 
                            Math.max(sectionTop, scrollPosition);
        const visibility = visibleHeight / rect.height;
        
        if (visibility > maxVisibility) {
          maxVisibility = visibility;
          currentSection = section;
        }
      }
    });

    return currentSection;
  }

  /**
   * Handles scroll event for active section highlighting
   */
  function handleScroll() {
    const currentSection = getCurrentSection();
    
    if (currentSection && currentSection !== state.currentSection) {
      state.currentSection = currentSection;
      
      const sectionId = currentSection.id;
      const activeLink = state.navLinks.find((link) => {
        const linkHash = getSectionIdFromHash(link.getAttribute('href'));
        return linkHash === sectionId;
      });
      
      if (activeLink) {
        updateActiveNavLink(activeLink);
      }
    }
  }

  /**
   * Initializes active section highlighting
   */
  function initActiveSectionHighlighting() {
    const sections = safeQueryAll(SELECTORS.SECTIONS);
    state.sections = Array.from(sections);

    const debouncedScroll = debounce(handleScroll, CONFIG.DEBOUNCE_DELAY);
    window.addEventListener('scroll', debouncedScroll, { passive: true });

    // Initial check
    handleScroll();
  }

  // ===================================================================
  // Keyboard Navigation
  // ===================================================================

  /**
   * Handles keyboard navigation
   * @param {KeyboardEvent} event - Keyboard event
   */
  function handleKeyboardNavigation(event) {
    const { key, ctrlKey, metaKey } = event;
    
    // Only handle navigation keys
    if (!Object.values(KEYS).includes(key)) {
      return;
    }

    // Don't interfere with form inputs
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    )) {
      return;
    }

    let scrollAmount = 0;
    let shouldPreventDefault = false;

    switch (key) {
      case KEYS.ARROW_UP:
        if (ctrlKey || metaKey) {
          scrollAmount = -CONFIG.KEYBOARD_SCROLL_AMOUNT;
          shouldPreventDefault = true;
        }
        break;
      
      case KEYS.ARROW_DOWN:
        if (ctrlKey || metaKey) {
          scrollAmount = CONFIG.KEYBOARD_SCROLL_AMOUNT;
          shouldPreventDefault = true;
        }
        break;
      
      case KEYS.PAGE_UP:
        scrollAmount = -window.innerHeight * 0.9;
        shouldPreventDefault = true;
        break;
      
      case KEYS.PAGE_DOWN:
        scrollAmount = window.innerHeight * 0.9;
        shouldPreventDefault = true;
        break;
      
      case KEYS.HOME:
        if (ctrlKey || metaKey) {
          window.scrollTo({
            top: 0,
            behavior: state.prefersReducedMotion ? 'auto' : CONFIG.SCROLL_BEHAVIOR,
          });
          shouldPreventDefault = true;
        }
        break;
      
      case KEYS.END:
        if (ctrlKey || metaKey) {
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: state.prefersReducedMotion ? 'auto' : CONFIG.SCROLL_BEHAVIOR,
          });
          shouldPreventDefault = true;
        }
        break;
    }

    if (scrollAmount !== 0) {
      window.scrollBy({
        top: scrollAmount,
        behavior: state.prefersReducedMotion ? 'auto' : CONFIG.SCROLL_BEHAVIOR,
      });
    }

    if (shouldPreventDefault) {
      event.preventDefault();
    }
  }

  /**
   * Initializes keyboard navigation
   */
  function initKeyboardNavigation() {
    document.addEventListener('keydown', handleKeyboardNavigation);
  }

  // ===================================================================
  // Hash Navigation
  // ===================================================================

  /**
   * Handles initial hash navigation on page load
   */
  function handleInitialHash() {
    const hash = window.location.hash;
    if (!hash) {
      return;
    }

    const targetId = getSectionIdFromHash(hash);
    if (!targetId) {
      return;
    }

    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      // Delay to ensure page is fully loaded
      setTimeout(() => {
        scrollToElement(targetElement, false);
      }, 100);
    }
  }

  /**
   * Handles hash change events
   */
  function handleHashChange() {
    const hash = window.location.hash;
    const targetId = getSectionIdFromHash(hash);
    
    if (targetId) {
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        scrollToElement(targetElement, false);
      }
    }
  }

  /**
   * Initializes hash navigation
   */
  function initHashNavigation() {
    window.addEventListener('hashchange', handleHashChange);
    handleInitialHash();
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
  }

  /**
   * Initializes reduced motion support
   */
  function initReducedMotionSupport() {
    state.prefersReducedMotion = checkReducedMotion();
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleReducedMotionChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleReducedMotionChange);
    }
  }

  // ===================================================================
  // Cleanup
  // ===================================================================

  /**
   * Cleans up all event listeners
   */
  function cleanup() {
    state.navLinks.forEach((link) => {
      link.removeEventListener('click', handleNavLinkClick);
    });

    document.removeEventListener('keydown', handleKeyboardNavigation);
    window.removeEventListener('hashchange', handleHashChange);

    state.navLinks = [];
    state.sections = [];
    state.isInitialized = false;
  }

  // ===================================================================
  // Initialization
  // ===================================================================

  /**
   * Initializes navigation system
   */
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    if (state.isInitialized) {
      console.warn('Navigation system: Already initialized');
      return;
    }

    try {
      state.headerHeight = getHeaderHeight();
      
      initReducedMotionSupport();
      initSmoothScroll();
      initActiveSectionHighlighting();
      initKeyboardNavigation();
      initHashNavigation();
      
      state.isInitialized = true;
      console.log('Navigation system initialized successfully');
    } catch (error) {
      console.error('Navigation system: Initialization failed', error);
    }
  }

  // ===================================================================
  // Public API
  // ===================================================================

  window.NavigationSystem = Object.freeze({
    init,
    cleanup,
    scrollToElement,
  });

  // Auto-initialize
  init();
})();
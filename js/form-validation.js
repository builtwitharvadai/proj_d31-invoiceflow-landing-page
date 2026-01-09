/**
 * Form Validation Module
 * Handles email validation, form submission, and user feedback for lead capture
 * 
 * @module form-validation
 * @generated-from: task-id:TASK-006
 * @modifies: index.html lead-capture-form
 */

(function formValidationModule() {
  'use strict';

  // ===================================================================
  // Configuration & Constants
  // ===================================================================
  
  const CONFIG = Object.freeze({
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    DEBOUNCE_DELAY: 300,
    SUBMISSION_TIMEOUT: 10000,
    MIN_EMAIL_LENGTH: 5,
    MAX_EMAIL_LENGTH: 254,
  });

  const MESSAGES = Object.freeze({
    REQUIRED: 'Email address is required',
    INVALID_FORMAT: 'Please enter a valid email address',
    TOO_SHORT: 'Email address is too short',
    TOO_LONG: 'Email address is too long',
    SUBMISSION_ERROR: 'Something went wrong. Please try again.',
    NETWORK_ERROR: 'Network error. Please check your connection and try again.',
    SUCCESS: 'Thank you! Check your email to get started with InvoiceFlow.',
    SUBMITTING: 'Submitting...',
  });

  const ARIA_STATES = Object.freeze({
    INVALID: 'true',
    VALID: 'false',
    BUSY: 'true',
    IDLE: 'false',
  });

  // ===================================================================
  // State Management
  // ===================================================================
  
  const state = {
    isSubmitting: false,
    lastValidationResult: null,
    debounceTimer: null,
  };

  // ===================================================================
  // DOM Element References
  // ===================================================================
  
  let elements = null;

  function initializeElements() {
    elements = {
      form: document.getElementById('lead-capture-form'),
      emailInput: document.getElementById('lead-email'),
      emailError: document.getElementById('lead-email-error'),
      submitButton: document.querySelector('.form-submit'),
      buttonText: document.querySelector('.button-text'),
      formMessage: document.getElementById('form-message'),
    };

    // Validate all required elements exist
    const missingElements = Object.entries(elements)
      .filter(([_key, element]) => !element)
      .map(([key]) => key);

    if (missingElements.length > 0) {
      console.error('Form validation initialization failed: Missing DOM elements:', missingElements);
      return false;
    }

    return true;
  }

  // ===================================================================
  // Validation Logic
  // ===================================================================

  /**
   * Validates email address with comprehensive checks
   * @param {string} email - Email address to validate
   * @returns {{ isValid: boolean, error: string | null }}
   */
  function validateEmail(email) {
    // Required field check
    if (!email || email.trim().length === 0) {
      return {
        isValid: false,
        error: MESSAGES.REQUIRED,
      };
    }

    const trimmedEmail = email.trim();

    // Length validation
    if (trimmedEmail.length < CONFIG.MIN_EMAIL_LENGTH) {
      return {
        isValid: false,
        error: MESSAGES.TOO_SHORT,
      };
    }

    if (trimmedEmail.length > CONFIG.MAX_EMAIL_LENGTH) {
      return {
        isValid: false,
        error: MESSAGES.TOO_LONG,
      };
    }

    // Format validation using regex
    if (!CONFIG.EMAIL_REGEX.test(trimmedEmail)) {
      return {
        isValid: false,
        error: MESSAGES.INVALID_FORMAT,
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }

  /**
   * Updates UI to reflect validation state
   * @param {boolean} isValid - Whether the input is valid
   * @param {string | null} errorMessage - Error message to display
   */
  function updateValidationUI(isValid, errorMessage) {
    if (!elements) return;

    const { emailInput, emailError } = elements;

    // Update ARIA attributes
    emailInput.setAttribute('aria-invalid', isValid ? ARIA_STATES.VALID : ARIA_STATES.INVALID);

    // Update visual state
    if (isValid) {
      emailInput.classList.remove('error');
      emailInput.classList.add('success');
      emailError.textContent = '';
    } else {
      emailInput.classList.remove('success');
      if (errorMessage) {
        emailInput.classList.add('error');
        emailError.textContent = errorMessage;
      } else {
        emailInput.classList.remove('error');
        emailError.textContent = '';
      }
    }
  }

  /**
   * Handles real-time validation with debouncing
   * @param {Event} event - Input event
   */
  function handleInputValidation(event) {
    const email = event.target.value;

    // Clear existing debounce timer
    if (state.debounceTimer) {
      clearTimeout(state.debounceTimer);
    }

    // Debounce validation for better UX
    state.debounceTimer = setTimeout(() => {
      const validationResult = validateEmail(email);
      state.lastValidationResult = validationResult;

      // Only show errors after user has started typing
      if (email.length > 0) {
        updateValidationUI(validationResult.isValid, validationResult.error);
      } else {
        // Clear validation state when input is empty
        updateValidationUI(true, null);
        elements.emailInput.classList.remove('success', 'error');
      }
    }, CONFIG.DEBOUNCE_DELAY);
  }

  /**
   * Handles blur event for immediate validation feedback
   * @param {Event} event - Blur event
   */
  function handleInputBlur(event) {
    const email = event.target.value;
    
    // Clear debounce timer on blur
    if (state.debounceTimer) {
      clearTimeout(state.debounceTimer);
    }

    // Immediate validation on blur
    const validationResult = validateEmail(email);
    state.lastValidationResult = validationResult;
    updateValidationUI(validationResult.isValid, validationResult.error);
  }

  // ===================================================================
  // Form Submission Logic
  // ===================================================================

  /**
   * Updates submit button loading state
   * @param {boolean} isLoading - Whether form is submitting
   */
  function updateSubmitButtonState(isLoading) {
    if (!elements) return;

    const { submitButton, buttonText } = elements;

    submitButton.setAttribute('aria-busy', isLoading ? ARIA_STATES.BUSY : ARIA_STATES.IDLE);
    
    if (isLoading) {
      submitButton.disabled = true;
      buttonText.textContent = MESSAGES.SUBMITTING;
    } else {
      submitButton.disabled = false;
      buttonText.textContent = 'Start Free Trial';
    }
  }

  /**
   * Displays form message (success or error)
   * @param {string} message - Message to display
   * @param {'success' | 'error'} type - Message type
   */
  function showFormMessage(message, type) {
    if (!elements) return;

    const { formMessage } = elements;

    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
    
    // Announce to screen readers
    formMessage.setAttribute('role', 'status');
    formMessage.setAttribute('aria-live', 'polite');
  }

  /**
   * Clears form message
   */
  function clearFormMessage() {
    if (!elements) return;
    elements.formMessage.textContent = '';
    elements.formMessage.className = 'form-message';
  }

  /**
   * Resets form to initial state
   */
  function resetForm() {
    if (!elements) return;

    elements.form.reset();
    elements.emailInput.classList.remove('success', 'error');
    elements.emailInput.setAttribute('aria-invalid', ARIA_STATES.VALID);
    elements.emailError.textContent = '';
    state.lastValidationResult = null;
  }

  /**
   * Submits form data to email service
   * TODO: Replace with actual email service integration (Mailchimp/ConvertKit)
   * @param {string} email - Email address to submit
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async function submitToEmailService(email) {
    // TODO: Implement actual email service integration
    // Example integrations:
    // 
    // Mailchimp:
    // const response = await fetch('https://YOUR_DOMAIN.us1.list-manage.com/subscribe/post-json', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     EMAIL: email,
    //     u: 'YOUR_USER_ID',
    //     id: 'YOUR_LIST_ID'
    //   })
    // });
    //
    // ConvertKit:
    // const response = await fetch('https://api.convertkit.com/v3/forms/YOUR_FORM_ID/subscribe', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     api_key: 'YOUR_API_KEY',
    //     email: email
    //   })
    // });

    // Simulate API call for demonstration
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate successful submission
        resolve({
          success: true,
          message: MESSAGES.SUCCESS,
        });
      }, 1500);
    });
  }

  /**
   * Handles form submission with validation and error handling
   * @param {Event} event - Submit event
   */
  async function handleFormSubmit(event) {
    event.preventDefault();

    // Prevent double submission
    if (state.isSubmitting) {
      return;
    }

    const email = elements.emailInput.value.trim();

    // Clear previous messages
    clearFormMessage();

    // Validate email before submission
    const validationResult = validateEmail(email);
    
    if (!validationResult.isValid) {
      updateValidationUI(false, validationResult.error);
      elements.emailInput.focus();
      return;
    }

    // Update state and UI
    state.isSubmitting = true;
    updateSubmitButtonState(true);

    try {
      // Submit with timeout
      const timeoutPromise = new Promise((_resolve, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), CONFIG.SUBMISSION_TIMEOUT);
      });

      const submissionPromise = submitToEmailService(email);
      const result = await Promise.race([submissionPromise, timeoutPromise]);

      if (result.success) {
        // Success handling
        showFormMessage(result.message, 'success');
        resetForm();

        // TODO: Track conversion event
        // Example: analytics.track('lead_captured', { email });
        
        // TODO: Redirect to thank you page or next step
        // Example: setTimeout(() => window.location.href = '/thank-you', 2000);
      } else {
        // API returned error
        showFormMessage(result.message || MESSAGES.SUBMISSION_ERROR, 'error');
      }
    } catch (error) {
      // Network or timeout error
      console.error('Form submission error:', error);
      
      const errorMessage = error.message === 'Request timeout' 
        ? 'Request timed out. Please try again.'
        : MESSAGES.NETWORK_ERROR;
      
      showFormMessage(errorMessage, 'error');
    } finally {
      // Reset submission state
      state.isSubmitting = false;
      updateSubmitButtonState(false);
    }
  }

  // ===================================================================
  // Event Listeners Setup
  // ===================================================================

  /**
   * Attaches event listeners to form elements
   */
  function attachEventListeners() {
    if (!elements) return;

    // Real-time validation on input
    elements.emailInput.addEventListener('input', handleInputValidation);

    // Validation on blur for immediate feedback
    elements.emailInput.addEventListener('blur', handleInputBlur);

    // Form submission
    elements.form.addEventListener('submit', handleFormSubmit);

    // Clear error on focus
    elements.emailInput.addEventListener('focus', () => {
      if (elements.emailError.textContent) {
        clearFormMessage();
      }
    });
  }

  /**
   * Removes event listeners (cleanup)
   */
  function detachEventListeners() {
    if (!elements) return;

    elements.emailInput.removeEventListener('input', handleInputValidation);
    elements.emailInput.removeEventListener('blur', handleInputBlur);
    elements.form.removeEventListener('submit', handleFormSubmit);
  }

  // ===================================================================
  // Initialization
  // ===================================================================

  /**
   * Initializes form validation module
   */
  function init() {
    // Check if DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    // Initialize DOM elements
    const elementsInitialized = initializeElements();
    
    if (!elementsInitialized) {
      console.error('Form validation module failed to initialize: Required DOM elements not found');
      return;
    }

    // Attach event listeners
    attachEventListeners();

    // Log successful initialization
    console.log('Form validation module initialized successfully');
  }

  /**
   * Cleanup function for module teardown
   */
  function destroy() {
    detachEventListeners();
    
    if (state.debounceTimer) {
      clearTimeout(state.debounceTimer);
    }
    
    elements = null;
    state.isSubmitting = false;
    state.lastValidationResult = null;
  }

  // ===================================================================
  // Public API (if needed for testing or external access)
  // ===================================================================

  // Expose public methods if needed
  window.FormValidation = Object.freeze({
    init,
    destroy,
    validateEmail, // Exposed for testing
  });

  // Auto-initialize
  init();
})();
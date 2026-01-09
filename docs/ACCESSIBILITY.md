# Accessibility Documentation

## Overview

This document outlines the accessibility features implemented in the InvoiceFlow Landing Page and provides guidelines for maintaining WCAG 2.1 Level AA compliance in future updates.

## Accessibility Features Implemented

### 1. Semantic HTML Structure

#### Landmark Regions
- **Header**: `<header role="banner">` - Contains site navigation
- **Main Content**: `<main id="main" role="main">` - Primary page content
- **Navigation**: `<nav role="navigation" aria-label="Main navigation">` - Main navigation menu
- **Footer**: `<footer role="contentinfo">` - Site footer information
- **Sections**: Properly structured with semantic `<section>` elements

#### Heading Hierarchy
- Logical heading structure (h1 → h2 → h3)
- Single h1 per page ("Find Your Dream Property")
- Descriptive headings that outline content structure
- No skipped heading levels

#### Semantic Elements
- `<article>` for service cards
- `<address>` for contact information
- `<strong>` for emphasis
- Proper list structures with `role="list"`

### 2. Keyboard Navigation

#### Focus Management
- All interactive elements are keyboard accessible
- Logical tab order follows visual layout
- Skip link provided: "Skip to main content" (hidden until focused)
- Focus visible on all interactive elements with 2px outline

#### Interactive Elements
- Navigation links: Full keyboard support
- Buttons: Accessible via Tab and activated with Enter/Space
- Form controls: Standard keyboard navigation
- Mobile menu toggle: Keyboard accessible with proper ARIA states

#### Focus Indicators
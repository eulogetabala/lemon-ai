---
name: Lemon.ai Studio
description: Clean SaaS landing with floating product mockups — flat lemon fields, no gradients.
colors:
  paper: "#F7F8F4"
  chalk: "#FFFFFF"
  ink: "#111410"
  lemon: "#C6FF1A"
  moss: "#1B4D28"
  mist: "#E8EAE2"
  mute: "#6B7168"
  stamp: "#FF4D2E"
typography:
  display:
    fontFamily: "Bricolage Grotesque"
    fontSize: "clamp(2.5rem, 5.5vw, 3.75rem)"
    fontWeight: "800"
    lineHeight: "1.05"
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Bricolage Grotesque"
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)"
    fontWeight: "700"
    lineHeight: "1.15"
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Source Sans 3"
    fontSize: "1.0625rem"
    fontWeight: "400"
    lineHeight: "1.65"
  label:
    fontFamily: "Source Sans 3"
    fontSize: "0.8125rem"
    fontWeight: "600"
    lineHeight: "1.3"
rounded:
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "28px"
  full: "9999px"
spacing:
  gutter: "1.5rem"
  section: "5.5rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.lemon}"
    rounded: "{rounded.full}"
    padding: "14px 28px"
  button-secondary:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "14px 28px"
  mockup-card:
    backgroundColor: "{colors.chalk}"
    rounded: "{rounded.lg}"
---

## Overview

Lemon.ai marketing follows a **studio SaaS** layout inspired by product-demo heroes: copy on the left, floating UI mockups on a solid brand field with a subtle grid on the right. Flat color only — no gradients, no glass blur decoration.

## Colors

- Paper `#F7F8F4`, chalk `#FFFFFF`, ink `#111410`
- Lemon `#C6FF1A` (brand field / accent), moss `#1B4D28`, stamp `#FF4D2E`
- Emphasis via solid lemon fills or ink weight — never gradient text

## Typography

Bricolage Grotesque for display/headlines; Source Sans 3 for body and UI.

## Layout

Hero = 50/50 split. Right panel is a clipped geometric slab (solid moss or lemon) holding overlapping mockup cards (calendar, analytics, composer). Sections below stay airy with soft rounded surfaces.

## Elevation & Depth

Soft offset shadows on mockups (`0 18px 40px rgba(17,20,16,0.12)`). No hard comic offsets on marketing; dashboard may differ.

## Shapes

Rounded-full CTAs; mockup cards `14–20px`; inputs `12px`.

## Components

Primary CTA: ink pill + lemon label. Secondary: chalk pill + ink border. Featured pricing: ink inverted slab.

## Do's and Don'ts

**Do:** floating product proof, FCFA pricing, keep Lemon.ai logo, flat color panels  
**Don't:** gradients, purple SaaS defaults, inventing testimonials

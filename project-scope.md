# Project Scope Document
## B2C E-commerce Platform — Nael Mattar
**Document Version:** 1.0  
**Prepared By:** [Your Name / PM Team]  
**Date:** March 6, 2026  
**Source Document:** B2C E-commerce Platform Feature Information v1.1 (Space-O Technologies, Sept 16, 2025)

---

## 1. Project Overview

| Field | Detail |
|---|---|
| **Project Name** | B2C E-commerce Platform |
| **Client Name** | Nael Mattar |
| **Platform Type** | Web-Based B2C E-commerce |
| **Development Partner** | Space-O Technologies |

**Executive Summary**

This project involves building a custom web-based B2C e-commerce platform that enables the client (Admin) to sell products directly to individual consumers (Buyers). The platform uses a streamlined two-role architecture — Admin and Buyer — with no multi-vendor or marketplace complexity. It will support Arabic and English, integrate Saudi-market payment methods (Mada, STC Pay, Tabby/Tamara), and provide a full admin back office with analytics, inventory management, and promotional tooling.

---

## 2. Objectives & Goals

**Primary Objectives**

- Launch a direct-to-consumer e-commerce storefront with a seamless buyer experience across devices.
- Provide the Admin with a comprehensive dashboard for catalog management, order processing, promotions, analytics, and customer support.
- Support the Saudi Arabian market with Arabic language (including RTL layout and Arabic stemming in search), local payment methods, and PDPL compliance.

**Inferred Key Success Metrics** *[NEEDS CLARIFICATION]*

- Conversion rate (checkout completion vs. sessions)
- Average order value (AOV)
- Cart abandonment rate
- Customer acquisition cost / lifetime value (CAC/LTV — tooling is specified)
- CSAT/NPS scores (collection tooling is specified)
- Order fulfillment SLA adherence

> *Note: No explicit numeric KPIs or target launch metrics are stated in the source document. These should be defined with the client.*

---

## 3. In-Scope Items

### 3.1 Buyer-Facing Features

- **Registration & Authentication** — Email, phone-first signup, social login (Google, Apple), passwordless auth, reCAPTCHA, account lockout rules
- **Profile Management** — Multi-address with nicknames, default address selection, saved payment cards, GDPR/PDPL data export and deletion
- **Product Browse & Search** — Category navigation, advanced filters (price, brand, availability, ratings), Arabic stemming, synonym/typo tolerance, auto-suggest, recent searches, popularity/price sorting
- **Product Details Page** — Image galleries, specs, variant selection with availability indicators, returns/warranty info, delivery ETA, cross-sell bundles, rich FAQ
- **Wishlist** — Save/manage items, move-to-cart nudges, price-drop and back-in-stock notifications (email + push)
- **Shopping Cart** — Add/remove/update items, tax and shipping fee preview, discount display, full cost transparency, persistent cross-device sync
- **Checkout** — Guest checkout, saved payment details, Apple Pay express checkout, Mada integration, multi-address selection
- **Payment Processing** — Credit/debit cards, Mada, Apple Pay, STC Pay, Tabby/Tamara (BNPL), partial refunds, payment reconciliation dashboard
- **Order Confirmation & Tracking** — Confirmation with order number, courier tracking deep links, SLA-defined status updates, future courier API integration roadmap
- **Order History** — Full purchase history, reorder, e-invoice download, favorites for frequent orders, warranty lookup
- **Customer Support** — Help center, support tickets, returns/RMA flow, chatbot with human handoff, defined SLAs
- **Notifications** — Email, WhatsApp, SMS, push notifications, multi-language templates, lifecycle campaigns (win-back, price-drop alerts, back-in-stock)
- **Product Reviews** — Rate and review purchased products

### 3.2 Admin-Facing Features

- **Authentication & Dashboard** — RBAC, audit logs, IP allow-list, anomaly alerts, configurable dashboard widgets
- **Product Catalog Management** — CRUD operations, bulk CSV import, versioning, bulk operations, draft mode, preview before publish
- **Product Variants** — Per-variant SKUs, pricing, inventory, images, attribute sets, variant-level SEO
- **Category & Organization** — Hierarchical categories/subcategories, URL slugs, SEO meta per category, category facets, redirect handling
- **Inventory Management** — Stock level tracking per variant, low-stock alerts, safety stock levels, backorder rules, cycle counts, future WMS webhook integration
- **Pricing & Promotions** — Rules engine (BOGO, tier pricing), scheduled promotions, coupons, bundles, A/B price testing
- **Order Processing Workflow** — SLA definitions, exception handling, hold/verify flows, fraud flags
- **Order Management System** — Full lifecycle management, partial cancel/refund, RMA, exchange workflows, store credit
- **Customer Account Management** — Privacy controls, automated DSR processing (GDPR/PDPL)
- **Payment Management** — Refund reason codes, automated retry mechanisms, comprehensive reconciliation
- **Customer Support Management** — Support macros, SLA tracking, ticket tagging, CSAT/NPS collection, canned replies
- **Content Management System** — Homepage content, banners, product descriptions, policies, static pages, localization workflow, content preview, A/B testing
- **Sales Reporting & Analytics** — Funnel analysis, cohort analysis, RFM segmentation, CAC/LTV tracking, BI tool integration (Looker/Metabase)
- **Platform Configuration** — Feature flags, environment controls, kill-switches, canary deployment

### 3.3 Cross-Cutting Concerns

- Bilingual support (Arabic + English) with RTL layout
- Responsive, mobile-friendly web design
- GDPR and Saudi PDPL compliance
- Comprehensive audit logging
- SEO optimization (variant-level, category-level)

---

## 4. Out-of-Scope Items

### Explicitly Excluded by the Client

- **Shipping logistics / courier integration (current phase)** — The document states shipping is handled outside the platform scope via flexible offline fulfillment. A future courier API integration is referenced as a roadmap item only.
- **Native mobile apps** — The platform is defined as web-based. No iOS/Android app is mentioned.
- **Multi-vendor / marketplace functionality** — The document explicitly states this is a single-seller B2C model with no multi-vendor management.

### Recommended Exclusions to Prevent Scope Creep

- **Warehouse Management System (WMS)** — Only a future webhook integration point is mentioned; building a WMS is not in scope.
- **BI tool development** — Integration with Looker/Metabase is in scope; building custom BI dashboards from scratch is not. *[NEEDS CLARIFICATION]*
- **Chatbot AI training / NLP model development** — A chatbot with human handoff is listed, but whether this uses a third-party tool (e.g., Intercom, Zendesk) or requires custom development needs clarification. *[NEEDS CLARIFICATION]*
- **WhatsApp Business API account setup** — Integration is in scope; provisioning the client's WhatsApp Business account is not.
- **Content creation** — CMS tooling is in scope; writing product descriptions, policies, and marketing copy is the client's responsibility. *[NEEDS CLARIFICATION]*

---

## 5. Deliverables

| # | Deliverable | Description |
|---|---|---|
| 1 | **Buyer-Facing Web Application** | Responsive e-commerce storefront (React.js) with full shopping flow |
| 2 | **Admin Dashboard / Back Office** | Complete management panel for products, orders, customers, analytics, promotions, CMS |
| 3 | **Backend API** | RESTful Node.js/Express API powering both buyer and admin interfaces |
| 4 | **Database** | MongoDB or PostgreSQL schema with audit trails and compliance features |
| 5 | **Payment Gateway Integrations** | Stripe/PayPal, Mada, Apple Pay, STC Pay, Tabby, Tamara |
| 6 | **Notification System** | Email, SMS, WhatsApp, and push notification infrastructure with multi-language templates |
| 7 | **Search Engine** | Product search with Arabic stemming, typo tolerance, auto-suggest |
| 8 | **Analytics & Reporting Module** | Sales reports, funnel analysis, cohort analysis, RFM segmentation, BI tool integration |
| 9 | **CMS Module** | Admin-managed homepage, banners, static pages, localization workflow |
| 10 | **Customer Support Module** | Help center, ticketing system, chatbot with human handoff, returns/RMA flow |
| 11 | **Technical Documentation** | API documentation, deployment guides, architecture docs |
| 12 | **QA & Testing** | Unit tests, integration tests, UAT, automated testing pipelines |
| 13 | **Deployment Pipeline** | CI/CD with staging and production environments, canary release capability |

---

## 6. Assumptions

| # | Assumption |
|---|---|
| A1 | The client will provide all product content (images, descriptions, pricing) for initial catalog population. |
| A2 | Third-party payment providers (Mada, STC Pay, Tabby, Tamara) will provide API access and sandbox environments in a timely manner. |
| A3 | The client has or will obtain a WhatsApp Business API account for notification integration. |
| A4 | Arabic translations and localized content will be provided by the client or a dedicated translation resource. |
| A5 | The chatbot will be implemented using a third-party service (e.g., Intercom, Zendesk, or similar) rather than a custom-built NLP solution. *[NEEDS CLARIFICATION]* |
| A6 | "Courier tracking deep links" means linking to the courier's existing tracking page, not building a proprietary tracking UI. |
| A7 | The BI integration refers to connecting to existing Looker/Metabase instances, not provisioning or licensing these tools. *[NEEDS CLARIFICATION]* |
| A8 | The client will handle PDPL/GDPR legal review; the development team implements the technical controls. |
| A9 | SSL certificates, domain registration, and DNS configuration are the client's responsibility. *[NEEDS CLARIFICATION]* |
| A10 | The database choice (MongoDB vs. PostgreSQL) will be finalized during the technical design phase. |

---

## 7. Constraints & Dependencies

### Constraints

- **Language:** Must support Arabic (RTL) and English from launch — affects every UI component and the search engine.
- **Regulatory:** Must comply with Saudi PDPL and GDPR for data handling, export, and deletion.
- **Payment Landscape:** Saudi-specific payment methods (Mada, STC Pay) have their own certification and integration timelines that may affect the payment module delivery.
- **Budget & Timeline:** Not specified in the source document. *[NEEDS CLARIFICATION]*

### Third-Party Dependencies

| Dependency | Impact |
|---|---|
| Stripe / PayPal API | Core payment processing |
| Mada payment gateway | Saudi debit card payments |
| Apple Pay | Express checkout |
| STC Pay API | Mobile wallet payments |
| Tabby / Tamara API | Buy Now Pay Later functionality |
| AWS S3 / Cloudinary | Image and media storage |
| Email service provider (e.g., SendGrid) | Transactional and marketing emails |
| SMS gateway provider | OTP and notification delivery |
| WhatsApp Business API | WhatsApp notifications |
| Push notification service (e.g., Firebase) | Browser/mobile push alerts |
| Chatbot platform | Customer support automation |
| Looker / Metabase | BI analytics integration |
| Google Analytics | Web analytics and event tracking |
| reCAPTCHA (Google) | Bot protection |

---

## 8. Risks & Open Questions

### Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Saudi payment gateway integrations (Mada, STC Pay) have lengthy certification processes that delay launch | Medium | High | Begin payment provider onboarding immediately; build with Stripe first, add local methods incrementally |
| R2 | Arabic RTL + bilingual support significantly increases UI development and QA effort beyond initial estimates | Medium | Medium | Factor in RTL from Sprint 1; do not defer localization to the end |
| R3 | Feature scope is very large — risk of scope creep or timeline overrun | High | High | Prioritize features into MVP vs. Phase 2; agree on a phased delivery plan |
| R4 | BNPL providers (Tabby/Tamara) may have merchant eligibility requirements that delay integration | Low | Medium | Verify merchant eligibility early in the project |
| R5 | Chatbot with human handoff is underspecified — could range from simple FAQ bot to full AI assistant | Medium | Medium | Clarify scope and select vendor in design phase |
| R6 | No courier API integration in Phase 1 means manual fulfillment — could create operational bottlenecks at scale | Medium | Medium | Design the order status system to be easily extensible for future courier API integration |

### Open Questions

| # | Question | Priority |
|---|---|---|
| Q1 | What is the target launch date or overall project timeline? | Critical |
| Q2 | What is the project budget or budget range? | Critical |
| Q3 | Should we plan for an MVP / phased release, or is this a single big-bang launch? | Critical |
| Q4 | What product categories will be sold? (Affects variant structure, search filters, and category taxonomy) | High |
| Q5 | Which specific chatbot/support platform should be used? Or should we evaluate options? | High |
| Q6 | Is the client already registered with Mada, STC Pay, Tabby, and Tamara as a merchant? | High |
| Q7 | Who is the hosting account owner — client or development partner? Which AWS region? | High |
| Q8 | What are the expected traffic volumes and concurrent users at launch and at 12 months? (Affects infrastructure sizing) | High |
| Q9 | Are there specific courier partners the client uses for offline fulfillment? Will they need system access? | Medium |
| Q10 | What is the client's existing tech infrastructure, if any? (Domain, email provider, analytics, etc.) | Medium |
| Q11 | Should the admin panel support multiple admin users with different permission levels from Day 1? | Medium |
| Q12 | What BI tool does the client currently use, if any? (Affects Looker/Metabase integration scope) | Medium |
| Q13 | Final database choice — MongoDB or PostgreSQL? What are the data modeling preferences? | Medium |

---

## 9. Suggested Milestones & Timeline

> *Note: Durations are estimates based on the feature scope described. Actual timeline depends on team size and budget, which are not specified.* *[NEEDS CLARIFICATION]*

| Phase | Description | Est. Duration |
|---|---|---|
| **Phase 0 — Discovery & Design** | Requirements finalization, UI/UX design, technical architecture, payment provider onboarding | 4–6 weeks |
| **Phase 1 — Core MVP** | Buyer: Registration, product browse/search, cart, checkout, basic payment (Stripe), order tracking. Admin: Auth, product CRUD, basic order management, inventory. Bilingual support. | 10–14 weeks |
| **Phase 2 — Enhanced Payments & Notifications** | Mada, Apple Pay, STC Pay, Tabby/Tamara integration. Email/SMS/push notification system. Wishlist with alerts. | 4–6 weeks |
| **Phase 3 — Admin Power Features** | Promotions engine, CMS, advanced analytics/reporting, RBAC, audit logs, bulk operations, CSV import | 6–8 weeks |
| **Phase 4 — Support & Advanced UX** | Chatbot with human handoff, returns/RMA flow, customer support ticketing, product reviews, A/B testing | 4–6 weeks |
| **Phase 5 — QA, Performance & Launch** | End-to-end testing, security audit, performance optimization, canary deployment setup, staging → production | 3–4 weeks |
| **Post-Launch** | WhatsApp integration, BI tool integration, courier API roadmap, WMS webhook prep, monitoring & iteration | Ongoing |

**Estimated Total: 31–44 weeks** (excluding post-launch), depending on team composition and parallel workstreams.

---

## 10. Stakeholders

| Role | Name / Entity | Responsibility |
|---|---|---|
| **Client / Product Owner** | Nael Mattar | Requirements, approvals, content, business decisions |
| **Development Partner** | Space-O Technologies | Design, development, testing, deployment |
| **Payment Providers** | Stripe, Mada, Apple Pay, STC Pay, Tabby, Tamara | API access, merchant onboarding, sandbox environments |
| **Hosting Provider** | AWS / Heroku / Vercel *[NEEDS CLARIFICATION]* | Infrastructure and deployment |
| **End Users — Buyers** | General consumers (Saudi market) | Primary platform users |
| **End Users — Admin** | Client's operations team | Product management, order processing, support |

> *Additional stakeholders (legal counsel for PDPL, marketing team, logistics partner) are likely but not identified in the source document.*

---

## Executive Summary (Email-Ready)

Following our review of the B2C E-commerce Platform Feature Information document (v1.1), we have prepared a detailed Project Scope Document covering all buyer and admin features, technical architecture, deliverables, and a phased implementation plan. The platform is well-defined in terms of functionality — spanning product catalog management, Saudi-specific payment integrations (Mada, STC Pay, BNPL), bilingual Arabic/English support, advanced analytics, and a comprehensive admin back office. We have identified several areas requiring clarification before development begins, most critically around timeline, budget, phased delivery strategy, and third-party vendor selections (chatbot platform, BI tooling, hosting). We recommend scheduling a kickoff meeting to align on these open items and finalize the MVP feature set for Phase 1.

---

## Top 5 Questions for the Next Client Meeting

1. **Timeline & Budget** — What is your target launch date, and is there a defined budget range? This will determine team sizing and whether we pursue a phased or full-scope delivery.

2. **MVP Prioritization** — The feature set is extensive. Are you open to a phased approach where we launch with core shopping and order management first, then layer in advanced features (promotions engine, A/B testing, BI integration) in subsequent releases?

3. **Product Domain** — What types of products will you be selling? (e.g., fashion, electronics, FMCG) This significantly impacts variant structures, search filter design, and category taxonomy.

4. **Payment Provider Readiness** — Are you already registered as a merchant with Mada, STC Pay, Tabby, and Tamara? If not, we should begin the onboarding process immediately as it can take several weeks.

5. **Support Tooling** — For the chatbot with human handoff and the ticketing system, do you have a preferred platform (e.g., Intercom, Zendesk, Freshdesk), or should we evaluate and recommend options as part of the design phase?

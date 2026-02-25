**Design the implementation plan of a “Subscription & Feature Entitlement System for a Multi-Tenant SaaS Application”**

**Context**

Modern SaaS systems rely on structured subscription models to control feature access, enforce usage limits, and maintain strict tenant isolation. Subscription enforcement must operate reliably at the API level and remain extensible for future scalability.

This task evaluates your ability to design and implement a subscription-driven feature entitlement system with production-oriented architectural considerations.

**Objective**

You are required to design and implement a **multi-tenant SaaS application of your choice** that includes a **Subscription & Feature Entitlement System**.

You may choose any domain, for example:

* Project Management System  
* Document Management System  
* Inventory System

However, your chosen application **must integrate a subscription-based access control mechanism** as described below.

The system must determine — at API level — whether a tenant (organization) is permitted to perform an action based on:

* Its active subscription plan  
* The plan’s feature entitlements  
* A defined usage limit  
* Basic subscription lifecycle state

**Implementation Scope**

The demo implementation must include the following mandatory components:

**Multi-Tenant Architecture**

* Support multiple organizations (tenants)  
* Each organization must have:  
  * Users  
  * One active subscription  
* One active subscription

**Subscription Plan Modeling (Database-Driven)**

* Plans must be stored in the database (not hardcoded)  
* Each plan must define:  
  * Plan name (e.g., Free, Pro)  
  * Enabled features  
  * One measurable usage limit

The system must allow new plans to be added without modifying business logic.

**Feature-Based Access Enforcement (API-Level)**

* Implement centralized backend middleware that:  
  * Validates subscription status  
  * Validates feature entitlement  
* Frontend-only restriction is not acceptable  
* Unauthorized access must return proper HTTP responses

Example:

* Premium module accessible only in Pro plan  
* Free plan blocked at API level

**Basic Usage Limit Enforcement**

Implement one measurable limit relevant to your chosen application, such as:

* Maximum number of resources  
* API request count  
* Maximum number of users  
* Storage usage

When the limit is exceeded:

* The system must block further actions at API level  
* A proper error response must be returned

Monthly reset logic is optional (maybe explained in the presentation).

**Subscription Lifecycle Handling**

The system must support at least:

* Active  
* Expired

Expired subscriptions must restrict premium features and usage-based actions.

Advanced lifecycle states (grace period, downgrade logic, etc.) are not mandatory in demo but may be discussed.

**Architecture & Presentation Scope**

**System Architecture**

* Application structure  
* Entitlement decision flow  
* Middleware design  
* Tenant isolation strategy  
* Subscription enforcement mechanism

Architecture diagrams are mandatory.

**Database Design**

* Plan-feature mapping structure  
* Subscription history modeling  
* Usage tracking schema  
* Indexing considerations

Schema/ER diagram required.

**Design Rationale**

* Why you chose your schema design  
* How your system scales to large number of tenants  
* How to prevent race conditions in usage updates  
* How to support plan upgrades/downgrades (conceptually)  
* How to extend the system for new features

**Expected Deliverables**

*  **A public GitHub repository containing the code and a brief README with a todo list.**  
* **A presentation (PPTX) including the ER diagram, system architecture diagram, and other relevant details.**  
* **A deployment URL. Platforms such as Vercel can be used.**
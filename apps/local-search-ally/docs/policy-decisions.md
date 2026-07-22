# Policy Decisions and External Review

This document records owner-approved business policy values implemented in the app. It does not claim legal, privacy, tax, or platform compliance.

## Implemented Decisions

- Refund request period: 14 calendar days after completed purchase.
- Product access: ongoing access to purchased Version 1 of the Contractor Review and Proof System.
- Future major versions: not automatically included unless expressly stated.
- Secure result links: expire 30 days after creation.
- Secure product-access links: expire 30 days after creation.
- Replacement product-access links: active entitlement holders may request a replacement link.
- Support response target: generally within two business days.
- Unpurchased assessment and lead retention: up to 24 months after last activity.
- Webhook and operational event retention: generally up to 12 months unless needed for investigation.
- Purchase/accounting records: retained as required for accounting, disputes, fraud prevention, tax, and applicable obligations.
- Assessment delivery and product delivery emails: transactional.
- Promotional email: requires separate optional consent and remains disabled.

## Server-Controlled Configuration

The app reads policy/business contact values from environment variables:

- `BUSINESS_LEGAL_NAME`
- `BUSINESS_PUBLIC_NAME`
- `BUSINESS_SUPPORT_EMAIL`
- `BUSINESS_PRIVACY_EMAIL`
- `BUSINESS_REFUND_EMAIL`
- `BUSINESS_MAILING_ADDRESS`
- `POLICY_EFFECTIVE_DATE`
- `POLICY_VERSION`

Missing required launch fields create an explicit launch-configuration notice. The app does not fabricate business names, contact emails, addresses, or legal effective dates.

## Manual Boundaries

Refund requests and deletion requests have additive domain and database boundaries, but no automatic refund API calls or destructive deletion jobs are implemented in this phase.

## External Review Required

- Final privacy, terms, refund, support, assessment-disclaimer, and product-disclaimer review.
- Tax handling and sales-tax responsibility before live payments.
- Any governing law, venue, arbitration, warranty disclaimer, liability limitation, indemnification, or similar legal clauses.
- Data deletion operating process and production data-access policy.

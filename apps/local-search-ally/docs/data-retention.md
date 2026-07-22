# Data Retention and Deletion Boundary

This phase adds a documented retention boundary only. It does not implement destructive deletion jobs.

## Retention Decisions

- Unpurchased assessment and lead data may be retained for up to 24 months after last activity.
- Operational and webhook event records are generally retained for up to 12 months unless needed for investigation.
- Purchase and accounting records are retained as required for accounting, disputes, fraud prevention, tax, and applicable obligations.

## Deletion Boundary

`data_deletion_requests` records future manual requests with:

- requester email
- optional linked lead
- status
- requested, reviewed, updated, and completed timestamps
- reason and owner notes

The current app does not delete rows automatically. Any future deletion job should start as a dry run that reports affected assessment, lead, result, token, email, purchase, entitlement, and webhook records before applying changes.

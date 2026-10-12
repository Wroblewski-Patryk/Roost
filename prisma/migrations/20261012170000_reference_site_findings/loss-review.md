# G24a migration loss review

`migration.sql` adds nullable reference-site foreign keys to existing
`capability_observations` and `finding_versions`, and relaxes their existing
application foreign keys to nullable only under a new exclusive-subject check.
It creates indexes and a site-only validation branch in existing Finding
guards. No row is updated, deleted, truncated, backfilled or reclassified.
Existing application rows retain their non-null application ID and satisfy
the exclusive-subject check. No CompanyRecord or Finding is created by deploy.

The site branch permits only a new, unverified initial version and observed
journal entry. Application-specific occurrence and later journal operations
remain denied for a site Finding. The separate
`20261012171000_reference_site_guard_aliases` migration fixes ambiguous SQL
aliases in that new branch without touching the original file or existing
application rows. The later `20261012172000_reference_site_package_guard`
migration changes only the site-specific validation functions for the accepted
versioned package, adds unique active site URL/project indexes, and adds a
transaction-scoped two-slot guard. It contains no data update, deletion or
backfill. Fresh disposable migration and HTTP/SQL results must be recorded
before release. Production migration and restore evidence remain unrun.

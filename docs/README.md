# Roost documentation

Roost is a self-hosted company operating system for people and supervised AI
workers. `CompanyCore` is a legacy runtime identifier in existing API,
database and deployment contracts; it is not another product or another set of
requirements.

## Start here

The active documentation has four layers. Read them in this order and do not
treat historical implementation notes as a queue.

1. [Product definition](product/product.md) — product purpose, users, scope and
   durable business rules.
2. [Accepted requirements](product/requirements.md) — the current consolidated
   assumptions and acceptance clauses from the owner interview. This is a live
   requirements registry, not a product version and not an execution history.
3. [Current implementation](implementation.md) — what is actually complete,
   what is not, the single outcome currently being delivered and the
   end-to-end gates that prove it.
4. Technical truth for the component being changed:
   [architecture](architecture/README.md),
   [operations](operations/), [security](security/) and
   [engineering](engineering/).

The [traceability matrix](architecture/traceability-matrix.md) maps accepted
requirement IDs to inspected implementation evidence. It is an audit view, not
a second requirements file or a task plan.

## Stable product chapters

New assumptions extend the existing chapter that owns the subject. Do not
create a new versioned product document for every interview or implementation
step.

- `product/product.md` — canonical product definition and business rules.
- `product/overview.md` — short plain-language summary and current phase.
- `product/problem-statement.md` — problem and constraints.
- `product/user-model.md` — people, agents and their interaction model.
- `product/mvp_scope.md` — current delivery scope and quality bar.
- `product/non-goals.md` — explicit exclusions and deferred scope.
- `product/success-metrics.md` — measurable product and operating outcomes.
- `product/requirements.md` — stable requirement IDs and acceptance clauses.

These files together form one product handbook. They are chapters, not
competing sources of truth. `product/product.md` resolves navigation and
summary; `product/requirements.md` resolves exact accepted behavior.

## Technical evidence

Files with suffixes such as `-v1`, `-v2` or `-v3` under architecture and
operations describe a particular protocol, schema or evidence revision. The
suffix belongs to that technical contract; it does not mean there are several
Roost products or several active sets of assumptions.

Technical evidence may retain old outcomes so regressions can be investigated.
Historical recommendations such as "one next atom" are not current
instructions. Git history preserves removed product assumptions and obsolete
plans; active documents should contain only the current rule and current state.

## Maintenance rules

- Change accepted product intent in the existing product chapter and update the
  matching requirement IDs.
- Change `implementation.md` whenever an end-to-end gate or current blocker
  changes.
- Change architecture/operations documents when runtime behavior or a component
  contract changes.
- Update the traceability matrix after implementation evidence changes; never
  infer completion from the presence of code or documentation alone.
- Keep secrets, credentials, tokens, production data, private deployment
  details, issue histories, generated reports and transient agent memory out of
  distributed documentation.

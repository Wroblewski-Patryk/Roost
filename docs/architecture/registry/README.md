# Architecture Registry Guide

Last updated: YYYY-MM-DD

This folder contains CSV node registries for the architecture evidence graph.

The canonical master node set is `nodes.csv`. Typed CSV files such as
`features.csv`, `functions.csv`, `components.csv`, `api_routes.csv`, and
`tests.csv` are focused working views that make backfill easier for humans and
agents. Keep shared row IDs identical across views.

Use:

- `docs/architecture/relations/dependencies.csv` for edges
- `docs/architecture/chains/chains.csv` for execution-chain records

Current coverage may start as a seed. Missing entries are not assumed complete;
they are backfill work.

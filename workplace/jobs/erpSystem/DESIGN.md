# ERP UI design system

The shared presentation layer lives in [`style.html`](style.html). It is intentionally small: use semantic tokens and the existing Tailwind utilities together while the legacy screens are migrated.

## Semantic tokens

- `--erp-surface`, `--erp-surface-muted`, `--erp-surface-raised`: application surfaces.
- `--erp-ink`, `--erp-ink-muted`, `--erp-ink-subtle`: text hierarchy. Use `--erp-ink` for meaningful body content.
- `--erp-border`, `--erp-border-strong`: dividers and form-control borders.
- `--erp-primary`, `--erp-primary-strong`: primary action and hover state.
- `--erp-danger`, `--erp-success`, `--erp-focus`: state and focus colors.
- `--erp-radius-control`, `--erp-radius-panel`, `--erp-shadow-panel`: shared geometry and elevation.

## Reusable classes

- `.erp-panel`: raised application surface.
- `.erp-surface-card`: reusable raised card for dashboard summaries and supporting panels.
- `.erp-toolbar`: responsive filter/action grouping with shared surface and spacing.
- `.erp-control`: text/select control with the shared focus treatment.
- `.erp-action` with `.erp-action-primary`, `.erp-action-secondary`, or `.erp-action-danger`: touch-safe actions.
- `.erp-icon-button`: centered icon-only control with a touch-safe target.
- `.erp-data-cell`: safe wrapping behavior for generated table content.
- `.erp-table-region`: containment boundary for larger data regions.

New UI should use these semantic classes for repeated intent. Keep Tailwind utilities for one-off layout and responsive composition; do not create a token for an isolated value.

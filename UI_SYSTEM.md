# Mizekar UI System

This document is the implementation contract for the application's Persian RTL interface. The live component reference is available at `/ui-kit` in development and is intentionally unavailable in production.

## Foundations

- The application remains RTL-first and uses IranSans.
- Brand actions use `brand-*`. Blue is reserved for charts and data visualization.
- Default interactive height is 40px; form controls and mobile actions are 44px.
- Use only the shared radius scale: `rounded-control` (12px), `rounded-control-lg` (16px), `rounded-card` (24px), and `rounded-panel` (28px).
- Page content uses the 1604px shared content frame and the shared sticky page header.
- Every interactive element must have a visible focus state. Icon-only controls require an accessible label.
- All motion must respect `prefers-reduced-motion`.

## Shared components

Import components from `@/src/components/ui`:

- `Button`, `IconButton`, and `buttonStyles`
- `Input`, `Textarea`, `Select`, and `Field`
- `PageFrame`, `PageHeader`, and `PageTitle`
- `Surface`
- `Alert` and `EmptyState`
- `Dialog`

Use `buttonStyles` for `next/link` elements that visually behave like buttons. Keep ordinary navigation links visually distinct from actions.

## Route audit matrix

The consistency pass covers these screen families:

- Shell: header, sidebar, notifications, profile menu, theme switching, global search.
- Authentication: `/signin`.
- Dashboard: `/dashboard`.
- Letters: `/letter`, `/incoming-letters`, `/outgoing-letters`, `/letter-search`, and `/archive`.
- Forms: `/new-form`, `/form`, `/incoming-forms`, `/outgoing-forms`, and `/form-templates`.
- Messages: `/new-message`, `/message`, `/incoming-messages`, and `/outgoing-messages`.
- Meetings: `/meeting` and `/meetings`.
- Administration: `/settings/general`, `/settings/users`, and `/settings/roles`.
- Account: `/profile`.
- Utility routes: `/sample-data`; placeholder routes remain outside primary navigation until implemented.

For each family, verify desktop (1440px), tablet (768px), and mobile (375px), in light and dark themes. Exercise default, loading, empty, error, disabled, focus, dropdown, and dialog states where applicable.

## Review checklist

- Page title, description, header actions, container width, and gutters match the shared contract.
- Primary, secondary, destructive, and success actions use the correct variant.
- Form fields have labels, validation messaging, autocomplete where relevant, and consistent focus/disabled states.
- Lists share toolbar, table/mobile-card, pagination, row-action, empty, and error treatments.
- Dialogs trap and restore focus, close with Escape, lock background scrolling, and expose an accessible name.
- Persian content wraps correctly; mixed-direction identifiers use an explicit direction when necessary.
- Keyboard navigation, 44px mobile targets, contrast, dark mode, and reduced motion are verified.
- `npm run ui:check`, `npm run lint`, `npm run build`, and relevant browser tests pass.

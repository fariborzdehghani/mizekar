# Mizekar

## Daneshyar knowledge invitations

`POST /api/integrations/knowledge-invitations` accepts authenticated project-completion notifications and creates a real message for the specified Mizekar username. Configure `KNOWLEDGE_INVITATION_API_KEY` to the same value as Daneshyar's `MIZEKAR_INTEGRATION_API_KEY`; `KNOWLEDGE_INVITATION_SENDER_USERNAME` selects the internal sender account (defaults to `admin`).

Mizekar is a Persian RTL office-workflow application built with Next.js 16, React 19, Prisma, and Microsoft SQL Server. It covers letters, forms, referrals, meetings, messages, archives, notifications, and AI-assisted workflows.

## Requirements

- Node.js 22.6 or newer
- Microsoft SQL Server
- Environment variables copied from `.env.example`

## Local development

```bash
npm install
npm run dev
```

The application is available at `http://localhost:3000` by default.

## Validation

Run the complete local quality gate before merging:

```bash
npm run verify
```

Individual checks are also available:

```bash
npm run test
npm run lint
npm run typecheck
npm run ui:check
npm run quality:check
npm run build
```

See `CODE_QUALITY.md` for architecture and boundary conventions, and `UI_SYSTEM.md` for the visual implementation contract.

## Production notes

- `AUTH_SECRET` or `NEXTAUTH_SECRET` is required in production.
- Database variables are validated when the server data layer initializes.
- Uploaded files live under `public/uploads` unless a feature-specific storage directory is configured.
- Configure the OnlyOffice and AI provider variables only when those integrations are enabled.

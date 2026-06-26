# Mizekar Application Overview

Mizekar is a Persian, right-to-left office workflow application built with Next.js App Router, React, Prisma, SQL Server, Tailwind CSS, and server actions. The application centers on an internal "cartable" workflow for letters, forms, meetings, messages, archiving, notifications, and AI-assisted work.

This document describes the application as implemented in the current codebase.

## Technology Stack

- **Framework:** Next.js `16.2.1` with the App Router under `src/app`.
- **UI:** React `19.2.4`, Tailwind CSS `4`, custom layout components, local SVG icons, and `lucide-react`.
- **Database:** SQL Server through Prisma `7.8.0` and `@prisma/adapter-mssql`.
- **Authentication:** Signed HTTP-only session cookie stored under the configured session cookie name.
- **Rich text:** Tiptap editor extensions for letter, meeting, message, and form-related content.
- **Document editing:** ONLYOFFICE integration for Word-based form instances.
- **AI:** Configurable chat-completion client used for inbox briefs, letter drafts, related-letter summaries, keyword tags, and archive-folder suggestions.
- **File storage:** Uploaded files are stored in `public/uploads`; metadata is stored in the `files` table.

## Application Structure

The main source tree is organized by responsibility:

- `src/app`: App Router routes, route groups, pages, layouts, and API handlers.
- `src/actions`: Server actions for letters, forms, meetings, messages, archive, settings, profile, authentication, notifications, and AI inbox briefs.
- `src/components`: Reusable UI and feature components.
- `src/components/app`: Domain UI for letters, forms, meetings, messages, archive, and AI inbox brief panels.
- `src/layout`: Shell layout, sidebar, header, backdrop, and sidebar widgets.
- `src/context`: Client state for theme and sidebar behavior.
- `src/lib`: Shared server/client utilities such as Prisma, auth, password hashing, rich-text helpers, ONLYOFFICE signing, letter tags, and AI activity state.
- `src/ai`: AI client and feature-specific AI workflows.
- `prisma`: Prisma schema, migration SQL, and feature SQL.
- `public`: Logo assets, user images, fonts, and uploaded files.
- `generated/prisma`: Generated Prisma client output.

## Routing And Main Screens

The application uses a protected home route group at `src/app/(home)` and a public sign-in route.

- `/signin`: Login screen. Authenticated users are redirected to `/`.
- `/`: Main incoming cartable view. It aggregates incoming letter referrals, incoming forms, and incoming meeting referrals.
- `/letter`: Create a new letter or view an existing letter with `?id=...`.
- `/letter-search`: Advanced accessible-letter search.
- `/incoming-letters`: Incoming cartable view for letters, forms, and meetings.
- `/outgoing-letters`: Outgoing cartable view for letters, forms, and meetings.
- `/archive`: Personal archive with folder navigation and archived letters/forms/meetings.
- `/new-form`: Create a form instance from an active form template.
- `/form`: View, edit, submit, approve, reject, or refer a form instance.
- `/form-templates`: Manage Word-based form templates and approval processes.
- `/meeting`: Register or view a meeting.
- `/meetings`: List meetings created by or accessible to the current user.
- `/new-message`: Compose a message, reply, or forward.
- `/message`: View a message.
- `/incoming-messages`: Incoming private messages.
- `/outgoing-messages`: Sent private messages and read receipts.
- `/profile`: Edit the current user's profile.
- `/settings/general`: Manage general system settings.
- `/settings/users`: Manage users, their person profiles, roles, and direct permissions.
- `/settings/roles`: Manage roles and role permissions.
- `/incoming-forms` and `/outgoing-forms`: Compatibility routes that redirect to the combined cartable views.
- `/record-session` and `/session-calendar`: Compatibility routes that redirect to meeting or filtered cartable views.

## Navigation And Layout

The protected application shell is composed from `HomeShell`, `AppSidebar`, and `AppHeader`.

- The sidebar groups links into cartable, messages, meetings, and settings.
- The UI is designed for RTL Persian text and uses local IranSans font files from `public/fonts`.
- Theme state is handled through `ThemeContext`, and sidebar expanded/mobile state through `SidebarContext`.
- The header includes quick navigation, notification controls, advanced letter search, message links, and an AI inbox brief trigger.
- The sidebar can show an active AI task indicator by subscribing to `src/lib/aiActivity`.

## Authentication And Authorization

Authentication is implemented in `src/lib/auth.ts`.

- Login creates a signed session payload containing user id, role id, permissions, and expiry.
- Sessions are stored in an HTTP-only cookie and expire after seven days.
- `requireUser()` protects server actions and pages by redirecting unauthenticated users to `/signin`.
- Permissions are calculated from both role permissions and direct user permissions.
- User display names are derived from the linked `persons` record when available, then fall back to `user_id` or the numeric id.

## Core Domain Model

The Prisma schema defines these major areas:

- **Users and people:** `users`, `persons`, `roles`, `permissions_defination`, `roles_permissions`, and `users_permissions`.
- **Letters:** `letters`, `letter_recipients`, `letter_referrals`, `letter_related_letters`, `letter_attachments`, `letter_tags`, and `letter_tag_links`.
- **Messages:** `messages` and `message_recipients`.
- **Meetings:** `meetings`, `meeting_attendees`, `meeting_referrals`, and `meeting_archive_items`.
- **Forms:** `form_templates`, `form_process_steps`, `form_instances`, `form_instance_steps`, `form_referrals`, and `form_archive_items`.
- **Files:** `files`, shared by letters and forms.
- **Archive:** `letter_archive_folders`, `letter_archive_items`, `form_archive_items`, and `meeting_archive_items`.
- **Settings and AI:** `general_settings` and `ai_inbox_briefs`.

## Letters

Letters are the primary correspondence object.

Main capabilities:

- Create letters with title, rich-text content, recipients, attachments, related letters, and keyword tags.
- Generate internal letter numbers using a configurable template in `general_settings` with the current Persian year and letter id.
- Send letters to recipients by creating `letter_recipients` and initial open `letter_referrals`.
- View full letter details, attachments, recipient/person information, referral history, related letters, and tags.
- Refer a letter onward to one or more users, optionally with notes and due date.
- Mark incoming letter referrals as read/unread.
- Search people for recipient/referral selection.
- Search accessible letters by title, content, date, and tags.
- Link related letters and summarize related-letter context through AI.
- Generate AI response drafts for a selected letter.
- Generate AI keyword tags from letter title and content.
- Upload, view, download, and delete attachments.

Important implementation files:

- `src/actions/letterActions.ts`
- `src/components/app/letters/letter.tsx`
- `src/components/app/letters/LetterReferrals.tsx`
- `src/components/app/letters/LetterReferralList.tsx`
- `src/components/app/letters/FileAttachmentManager.tsx`
- `src/components/app/letters/RelatedLettersModal.tsx`
- `src/components/app/letters/LetterTagInput.tsx`

## Cartable Views

The incoming and outgoing cartable views combine multiple workflow item types.

Incoming cartable includes:

- Active incoming letter referrals.
- Forms awaiting the current user's approval or sent to them by referral.
- Meeting referrals sent to the current user.
- Read/unread indicators.
- Quick search over titles, numbers, snippets, people, status labels, and dates.

Outgoing cartable includes:

- Letters sent or referred by the current user.
- Forms created by, approved by, or referred by the current user.
- Meetings created by or visible to the current user.
- Status summaries and quick search.

The UI is centered around `LetterReferralList`, which renders letters, forms, and meetings in a shared list experience.

## Forms And Approval Workflow

Forms are Word-document workflows backed by templates and approval steps.

Template management:

- Create form templates with title, description, a `.doc` or `.docx` template file, and one or more approver steps.
- Update template metadata, active state, document file, and approver chain.
- Soft-delete templates by marking them inactive and deleted.
- List templates with their approval steps and approver names.

Form instance lifecycle:

- Create a form instance from an active template.
- Copy the template document into a new stored file for the instance.
- Start as draft.
- Submit the form, activating the first approval step and creating a referral to the first approver.
- Approve the active step, optionally with comments.
- Move to the next approver or mark the form complete when the final step is approved.
- Reject a form, mark it rejected, and refer it back to the creator.
- Refer a form manually to other users when the current user has access.
- Mark form referrals as read.

ONLYOFFICE integration:

- Form documents are served through `/api/forms/files/[fileId]` using signed resource tokens.
- ONLYOFFICE callback updates are handled at `/api/forms/onlyoffice/callback/[instanceId]`.
- Editor configuration is generated server-side with signed payloads.
- Draft creators can edit form documents; other users typically view them.

Important implementation files:

- `src/actions/formActions.ts`
- `src/components/app/forms/FormTemplateManager.tsx`
- `src/components/app/forms/NewFormLauncher.tsx`
- `src/components/app/forms/FormInstanceView.tsx`
- `src/components/app/forms/OnlyOfficeEditor.tsx`
- `src/app/api/forms/files/[fileId]/route.ts`
- `src/app/api/forms/onlyoffice/callback/[instanceId]/route.ts`

## Meetings

Meetings model formal sessions and their circulation.

Main capabilities:

- Create meetings with title, description, location type, location title/link, date/time, attendees, chair, secretary, and rich-text minutes.
- Track attendee roles: member, chair, and secretary.
- Require chair approval for meeting minutes.
- Approve a meeting when the current user is the chair.
- Refer meetings to other users with comments.
- Maintain incoming and outgoing meeting referral lists.
- Mark meeting referrals as read.
- List meetings created by or accessible to the current user.
- Archive meetings into personal archive folders.

Important implementation files:

- `src/actions/meetingActions.ts`
- `src/components/app/meetings/MeetingForm.tsx`
- `src/components/app/meetings/MeetingList.tsx`
- `src/components/app/meetings/MeetingReferrals.tsx`
- `src/components/app/meetings/PersianDatePicker.tsx`

## Messages

Messages are separate from formal letters and support private communication.

Main capabilities:

- Compose messages with title, rich-text content, importance, and recipients.
- Reply to existing messages.
- Forward existing messages.
- Maintain parent-message and forwarded-message relationships.
- Show incoming and outgoing message lists.
- View message details, recipient list, reply chain, and forwarded source.
- Mark incoming messages as read.
- Notify senders when recipients read messages.
- Mark read-receipt notifications as seen.

Important implementation files:

- `src/actions/messageActions.ts`
- `src/components/app/messages/MessageForm.tsx`
- `src/components/app/messages/MessageList.tsx`
- `src/components/app/messages/MessageView.tsx`
- `src/components/app/messages/MessageReadMarker.tsx`

## Archive

The archive is personal to each user and can hold letters, forms, and meetings.

Main capabilities:

- Create nested archive folders.
- Rename folders.
- Delete empty folders.
- Count archived items per folder across letters, forms, and meetings.
- Archive letters, forms, and meetings into folders.
- Move archived items by archiving them again into another folder.
- Remove archived items from archive.
- View a unified archived-item list for a folder.
- Use AI to suggest a suitable archive folder for a letter.
- Optionally suggest archiving when an unread letter is opened.

Important implementation files:

- `src/actions/archiveActions.ts`
- `src/components/app/letters/LetterArchiveSidebar.tsx`
- `src/components/app/letters/ArchivedLettersList.tsx`
- `src/components/app/letters/ArchiveLetterButton.tsx`
- `src/components/app/letters/LetterAiArchiveSuggestionButton.tsx`
- `src/components/app/letters/LetterArchiveSuggestionToast.tsx`

## Notifications

Header notifications are built from multiple workflow sources.

Notification sources include:

- Unread incoming letter referrals.
- Unread incoming form referrals.
- Unread incoming meeting referrals.
- Unread incoming messages.
- Message read receipts for sent messages.

Notification actions can mark items as clicked/viewed and update read states. Revalidation keeps the header, cartable, and related list pages in sync.

Important implementation file:

- `src/actions/notificationActions.ts`

## AI Features

AI support is implemented as feature modules under `src/ai/features` and called from server actions/API routes.

Implemented AI features:

- **Today inbox brief:** Summarizes the current user's pending incoming work and stores the result in `ai_inbox_briefs`.
- **Letter relation summary:** Summarizes a letter and its related-letter tree.
- **Letter response draft:** Creates a response draft for an existing letter using context and user instruction.
- **New letter draft:** API endpoint for drafting a new letter from prompt/title/content.
- **Keyword tags:** Suggests letter tags from title and content.
- **Archive suggestion:** Chooses the best existing archive folder for a letter and returns a short reason.

AI configuration is read from environment variables through `src/ai/client.ts` and feature-specific settings. The UI tracks active AI activity through `src/lib/aiActivity`.

Important files:

- `src/ai/client.ts`
- `src/ai/features/todayInboxBrief.ts`
- `src/ai/features/letterRelationSummary.ts`
- `src/ai/features/letterKeywordTags.ts`
- `src/actions/inboxBriefActions.ts`
- `src/app/api/ai/letter-draft/route.ts`
- `src/app/api/ai/letters/[letterId]/summary/route.ts`
- `src/app/api/ai/letters/[letterId]/draft/route.ts`

## Settings And Administration

General settings:

- Manage key/value settings stored in `general_settings`.
- The internal letter numbering template is one important setting used by letter creation.

User management:

- Create, update, and delete users.
- Set username, password, role, photo, linked person profile, and direct permissions.
- Maintain person details such as first name, last name, and job title.

Role management:

- Create, update, and delete roles.
- Assign permission definitions to roles.
- User effective permissions combine role-derived and direct user permissions.

Important files:

- `src/actions/settingsActions.ts`
- `src/components/settings/UserManagement.tsx`
- `src/components/settings/RoleManagement.tsx`

## Profile

The profile page lets the current user update their personal account details and photo. Profile updates revalidate the app shell and profile route so header/sidebar user information remains current.

Important files:

- `src/actions/profileActions.ts`
- `src/components/profile/ProfileForm.tsx`

## File And Attachment Handling

Files are represented by the `files` table and physically stored under `public/uploads`.

Supported patterns:

- Letter attachments are uploaded with letters and linked through `letter_attachments`.
- Form template documents are uploaded when templates are created or updated.
- Form instances copy the template document into a new stored file.
- File APIs infer MIME type from the original filename for serving/downloading.
- Attachments can be deleted from disk and database metadata.

The application stores generated file names without extensions and keeps the original display name in `file_title`.

## Rich Text Editing

Rich text support is centralized around Tiptap components and helpers.

Used for:

- Letter body content.
- Meeting descriptions/minutes.
- Message bodies.
- Referral comments and snippets.

The helper functions in `src/lib/richText.ts` extract plain text snippets and validate whether rich text contains meaningful content.

## Data Visibility And Access Patterns

Most data access is scoped to the current user.

Common access rules:

- Letters are visible to creators, senders, recipients, and users in the referral chain.
- Incoming letter lists exclude letters the current user has archived.
- Forms are visible to creators, approvers, and users in referral history.
- Meetings are visible to creators, chair, secretary, attendees, and users in referral history.
- Archive folders and archive item placement are per-user.
- Actions validate ownership/access before mutating archive, form, meeting, or letter state.

## API Routes

The project includes API route handlers for document and AI workflows:

- `POST /api/ai/letter-draft`: Generate a new letter draft from prompt/title/content.
- `POST /api/ai/letters/[letterId]/summary`: Generate a summary for a letter's related context.
- `POST /api/ai/letters/[letterId]/draft`: Generate a draft response for a specific letter.
- `GET /api/forms/files/[fileId]`: Serve a form document to ONLYOFFICE or clients with a signed token.
- `POST /api/forms/onlyoffice/callback/[instanceId]`: Receive ONLYOFFICE save callbacks.

## Database Migrations

The `prisma/migrations` directory shows incremental feature additions:

- Messages.
- Letter archive.
- Letter referral read state.
- Form archive.
- Meetings.
- Meeting archive.
- AI inbox briefs.
- Letter tags.

There is also `prisma/forms_feature.sql`, which appears to contain form-related database setup SQL.

## Environment And Configuration

Important environment/configuration areas:

- SQL Server connection for Prisma.
- `AUTH_SECRET` or `NEXTAUTH_SECRET` for session signing.
- `APP_PUBLIC_URL`, `NEXT_PUBLIC_APP_URL`, or `NEXTAUTH_URL` for absolute callback/file URLs.
- ONLYOFFICE document server URL and signing secrets through `src/lib/onlyoffice.ts`.
- AI provider base URL, model, timeout, token, retry, temperature, and prompt settings through `src/ai/client.ts` and feature-specific environment variables.

## Build And Development Commands

Defined in `package.json`:

- `npm run dev`: Start Next development server with webpack.
- `npm run build`: Build the application.
- `npm run start`: Start the production server.
- `npm run lint`: Run ESLint.

## Notes For Future Development

- Follow the local `AGENTS.md` instruction: this project uses a Next.js version with breaking changes, so consult `node_modules/next/dist/docs/` before changing framework-specific code.
- Several Persian UI strings in some source files appear mojibake-encoded in the repository view. Be careful when editing those files to preserve or intentionally repair encoding.
- The archive folder model is named `letter_archive_folders`, but it is shared by letters, forms, and meetings.
- `incoming-forms` and `outgoing-forms` are redirects because forms are now displayed inside combined cartable views.
- File uploads go into `public/uploads`; production deployment should account for persistent storage, backup, and access control.
- The default development auth secret should be replaced in real deployments.

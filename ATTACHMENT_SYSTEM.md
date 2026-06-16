# Letter File Attachment System - Implementation Guide

## Overview

A comprehensive file attachment management system has been implemented for the letters feature. Users can now:

✅ **Add** multiple file attachments to letters (up to 10 files, 50MB each by default)
✅ **View** a list of attached files with file type icons
✅ **Download** files from letters
✅ **Preview/View** files in browser (for supported formats)
✅ **Remove** file attachments (physically deleted from disk)

---

## Components Created

### 1. **FileAttachmentManager.tsx**
**Location:** `src/components/app/letters/FileAttachmentManager.tsx`

A reusable component for managing file attachments during letter creation.

**Features:**
- Multiple file selection
- File size validation (default: 50MB per file)
- Maximum file count validation (default: 10 files)
- Visual file type indicators (emojis)
- File size display
- Hover actions: View, Download, Delete
- Dark mode support

**Usage in new_letter.tsx:**
```tsx
<FileAttachmentManager
  attachments={attachments}
  onAddFiles={handleAddFiles}
  onRemoveFile={handleRemoveFile}
  onDownloadFile={handleDownloadFile}
  onViewFile={handleViewFile}
  maxFiles={10}
  maxFileSize={50}
/>
```

### 2. **LetterAttachmentsViewer.tsx**
**Location:** `src/components/app/letters/LetterAttachmentsViewer.tsx`

Component for viewing and managing attachments on existing letters.

**Features:**
- Display list of letter attachments
- Download files from saved letters
- Preview files (view in browser)
- Delete attachments (with confirmation)
- Conditional rendering: delete button only appears if `editable={true}`
- Handles file deletion from physical disk

**Usage Example:**
```tsx
<LetterAttachmentsViewer
  letterId={letter.id}
  attachments={attachments}
  onAttachmentDeleted={handleAttachmentDeleted}
  editable={true}
/>
```

---

## Backend Changes

### Updated Files

#### 1. **src/actions/letterActions.ts**

**New Functions Added:**

- **`createLetter(formData)`** - Updated to handle multiple files
  - Extracts all files from FormData with key "files"
  - Creates unique filenames with timestamp and random suffix
  - Saves files to `public/uploads/` directory
  - Creates file metadata in database
  - Creates letter_attachments entries for each file

- **`getLetterAttachments(letterId)`** - Retrieve all attachments for a letter
  - Fetches from database with file relationships
  - Returns attachment metadata

- **`deleteLetterAttachment(attachmentId)`** - Delete file attachment
  - Removes physical file from disk
  - Deletes attachment record from database
  - Cleans up file record if no other attachments reference it

#### Updated Server Actions:

- **`searchPersons(query)`** - Search for persons to add as recipients
  - Returns matching persons with id, first_name, last_name, user_id
  - Case-insensitive search on first_name and last_name
  - Limits results to 10 matches

- **`getFileData(fileId)`** - Retrieve file content for viewing or downloading
  - Returns file data as base64-encoded string
  - Returns MIME type for proper browser handling
  - Returns original filename

- **`deleteFile(fileId)`** - Delete file and clean up references
  - Deletes file from disk (`public/uploads/`)
  - Removes all letter_attachments records referencing this file
  - Deletes files record from database

**Supported MIME Types:**
- PDF, Word (doc/docx), Excel (xls/xlsx)
- Images (jpg, jpeg, png, gif, webp, svg)
- Archives (zip)
- Text files
- Default: application/octet-stream

---

## Updated Form Component

### **src/components/app/letters/new_letter.tsx**

**Changes:**
- Replaced single file input with FileAttachmentManager
- Updated form submission to handle multiple files:
  ```tsx
  for (const attachment of attachments) {
    if (attachment.file) {
      formData.append("files", attachment.file);
    }
  }
  ```
- Added state management for attachments array
- Implemented handlers: handleAddFiles, handleRemoveFile, handleDownloadFile, handleViewFile

---

## Database Schema

The existing Prisma schema already supports this functionality:

```prisma
model files {
  id                 Int                  @id
  file_name          String?              // Stored filename (timestamp_random)
  file_title         String?              // Original filename
  create_date        DateTime?
  creator_id         Int?
  users              users?
  letter_attachments letter_attachments[]
}

model letter_attachments {
  id        Int      @id
  letter_id Int?
  file_id   Int?
  files     files?
  letters   letters?
}
```

---

## File Storage

**Location:** `public/uploads/`

**Filename Format:** `{timestamp}_{randomSuffix}`
- Example: `1677900956891_a3k9f2x1`

**Original Filename:** Stored in `files.file_title`

**Cleanup:** Manual deletion via API route or automatic on attachment deletion

---

## Usage Workflow

### Creating a Letter with Attachments

1. User navigates to "New Letter" page
2. Fills in title, content, selects recipients
3. Uses "Add File" button in FileAttachmentManager to select files
4. Can add up to 10 files (50MB each)
5. Can remove files before submission
6. Submits form - all files are uploaded and linked to letter

### Viewing/Managing Existing Letter Attachments

1. User opens an existing letter
2. LetterAttachmentsViewer displays all attachments
3. Hover over attachment to reveal actions:
   - **Eye Icon:** Preview file in browser
   - **Download Icon:** Download file to device
   - **Trash Icon:** Delete attachment (if editable)

---

## Configuration

**Default Limits (Customizable):**
- Max files: 10
- Max file size: 50MB per file
- Allowed extensions: All (no restrictions)

**To Change Limits:**

Edit FileAttachmentManager props:
```tsx
<FileAttachmentManager
  maxFiles={20}           // Change to 20
  maxFileSize={100}       // Change to 100MB
  // ... other props
/>
```

---

## Error Handling

All components include error handling for:
- ✅ File size exceeded
- ✅ Maximum files exceeded
- ✅ Failed uploads
- ✅ Failed downloads
- ✅ Failed deletions
- ✅ Network errors

Error messages are displayed in Persian to users.

---

## Security Considerations

### Current Implementation
- Files stored in `public/uploads/` (accessible to all)
- Filenames are anonymized (timestamp_random)
- Original filename stored separately in database

### Recommended Improvements (Future)
- Implement access control (only letter recipients/creators can view)
- Store files outside `public/` directory
- Implement virus scanning for uploads
- Add file type whitelist validation
- Implement rate limiting on downloads
- Add audit logging for file access

---

## Notes

- **Session/Auth:** Creator_id is currently hardcoded to `1` (TODO: integrate with actual user session)
- **Icons:** Uses lucide-react for UI icons and emojis for file type indicators
- **Styling:** Follows existing Tailwind CSS patterns with dark mode support
- **RTL Support:** All text labels are in Persian (RTL friendly)

---

## Testing Checklist

- [ ] Add single file to new letter
- [ ] Add multiple files to new letter
- [ ] Remove file before submission
- [ ] Submit letter with attachments
- [ ] Download file from existing letter
- [ ] View file in browser
- [ ] Delete attachment from existing letter
- [ ] Verify file deleted from disk
- [ ] Test file size limits
- [ ] Test maximum file count limits
- [ ] Test with various file types (PDF, images, documents, etc.)
- [ ] Test dark mode styling
- [ ] Test error handling


# Frappe Wiki Improvements - Implementation Guide

## Overview
This document outlines the major improvements made to the Frappe Wiki application to transform it into a modern, feature-rich documentation platform inspired by AFFiNE and Notion.

## Major Improvements Implemented

### 1. Rich Text Editor (TipTap Integration)
**Status:** ✅ Complete

**What was done:**
- Upgraded TipTap packages from v2.0.2 to v2.10.3
- Added new TipTap extensions:
  - Color and TextStyle for text formatting
  - Highlight for text highlighting
  - Underline, Subscript, Superscript
  - Typography for smart quotes and dashes
  - Collaboration extensions (for future real-time editing)
- Created `WikiTipTapEditor` class (`tiptap-editor.js`)
- Created `TipTapToolbar` component (`tiptap-toolbar.js`)
- Added comprehensive CSS styling (`tiptap-editor.scss`)
- Integrated with existing Ace editor for backward compatibility

**Features:**
- WYSIWYG editing with visual formatting
- Markdown export/import support
- Rich formatting toolbar with all common options
- Image and video upload support
- Table creation and editing
- Task lists with checkboxes
- Code blocks with syntax highlighting
- Text alignment options
- Undo/redo functionality

**Files created/modified:**
- `wiki/public/js/tiptap-editor.js` (new)
- `wiki/public/js/tiptap-toolbar.js` (new)
- `wiki/public/scss/tiptap-editor.scss` (new)
- `wiki/public/js/editor-integrated.js` (new - replaces editor.js)
- `wiki/public/js/wiki.bundle.js` (modified)
- `wiki/public/scss/wiki.bundle.scss` (modified)
- `package.json` (updated dependencies)

### 2. Auto-save Functionality
**Status:** ✅ Complete

**What was done:**
- Implemented localStorage-based auto-save
- Auto-save triggers every 30 seconds (configurable)
- Saves on browser close/refresh
- Restore prompt on page load if autosave found
- Auto-clears old autosaves (>24 hours)
- Visual indicator when autosave occurs

**Features:**
- Prevents data loss on browser crashes
- Saves both content and title
- Timestamp tracking
- User-friendly restore prompts
- Automatic cleanup of old saves

**Implementation:**
- Built into `WikiTipTapEditor` class
- Uses `localStorage` with namespaced keys
- Configurable interval (AUTOSAVE_INTERVAL constant)

### 3. Wiki Admin Role and Permissions
**Status:** ✅ Complete

**What was done:**
- Created new "Wiki Admin" role
- Added role to fixtures
- Updated permissions on:
  - Wiki Settings
  - Wiki Page
  - Wiki Space (inherited)
- Added permission checks in settings page

**Permissions:**
- **Wiki Admin:** Full access to settings and content
- **Wiki Approver:** Can approve and publish pages
- **System Manager:** Full system access

**Files created/modified:**
- `wiki/fixtures/role.json` (added Wiki Admin)
- `wiki/hooks.py` (added role to fixtures)
- `wiki/wiki/doctype/wiki_settings/wiki_settings.json` (added permissions)
- `wiki/wiki/doctype/wiki_page/wiki_page.json` (added permissions)

### 4. Settings Page
**Status:** ✅ Complete

**What was done:**
- Created comprehensive settings page at `/wiki-settings`
- Organized into 5 sections:
  1. General Settings
  2. Editor Settings
  3. Appearance Settings
  4. Permissions & Access
  5. Advanced Settings
- Added settings icon to navbar (visible to admins only)
- Implemented save functionality via API

**Features:**
- Tab-based navigation
- Real-time save with feedback
- Permission-based access control
- User role display
- Helpful descriptions and tips

**Files created/modified:**
- `wiki/www/wiki-settings.html` (new)
- `wiki/www/wiki-settings.py` (new)
- `wiki/wiki/doctype/wiki_settings/wiki_settings.py` (added update_settings method)
- `wiki/wiki/doctype/wiki_page/templates/navbar_items.html` (added settings icon)

### 5. Three Editor Types
**Status:** ✅ Complete

**What was done:**
- Added "Rich Text" editor type to existing Text and YAML
- Created unified editor system that switches between:
  - **Text:** Ace editor with markdown
  - **Rich Text:** TipTap WYSIWYG editor
  - **YAML:** Ace editor with YAML validation
- Editor type can be set per Wiki Space or per Page

**Features:**
- Seamless switching between editor types
- Maintains all existing functionality
- Backward compatible with existing pages
- Auto-detection of editor type from page metadata

**Files created/modified:**
- `wiki/fixtures/wiki_editor.json` (added Rich Text)
- `wiki/public/js/editor-integrated.js` (unified editor logic)
- `wiki/wiki/doctype/wiki_page/templates/editor.html` (added TipTap containers)

### 6. Frappe Data References
**Status:** ✅ Complete

**What was done:**
- Added "Insert Frappe Data" button to TipTap toolbar
- Created dialog for selecting DocType, Document, and Field
- Generates Jinja tags: `{{ frappe.get_value("DocType", "name", "field") }}`
- Dynamic field loading based on selected DocType

**Features:**
- User-friendly dialog interface
- DocType autocomplete
- Dynamic document selection
- Field dropdown with all available fields
- Automatic Jinja tag generation
- Works in both Rich Text and Text editors

**Implementation:**
- Built into `TipTapToolbar` class
- Uses Frappe's dialog system
- Leverages Frappe's meta system for field discovery

## Installation & Setup

### 1. Install Dependencies
```bash
cd /workspace/development/frappe-16/apps/wiki
yarn install
# or
npm install
```

### 2. Build Assets
```bash
cd /workspace/development/frappe-16
bench build --app wiki
```

### 3. Run Migrations
```bash
bench migrate
```

### 4. Install Fixtures
```bash
bench --site [your-site] install-app wiki
# or if already installed
bench --site [your-site] migrate
```

### 5. Assign Wiki Admin Role
```bash
bench --site [your-site] set-user-role [username] "Wiki Admin"
```

## Testing Checklist

### Rich Text Editor
- [ ] Create new page with Rich Text editor
- [ ] Test all toolbar buttons (bold, italic, headings, etc.)
- [ ] Upload images and videos
- [ ] Create tables
- [ ] Add task lists
- [ ] Test code blocks
- [ ] Verify markdown export
- [ ] Test undo/redo

### Auto-save
- [ ] Edit a page and wait 30 seconds
- [ ] Verify autosave indicator appears
- [ ] Close browser without saving
- [ ] Reopen page and verify restore prompt
- [ ] Test restore functionality
- [ ] Test discard functionality

### Settings Page
- [ ] Access /wiki-settings as Wiki Admin
- [ ] Test all 5 settings sections
- [ ] Save changes in each section
- [ ] Verify changes persist
- [ ] Test as non-admin (should be denied)
- [ ] Verify settings icon in navbar

### Editor Types
- [ ] Create page with Text editor
- [ ] Create page with Rich Text editor
- [ ] Create page with YAML editor
- [ ] Switch between editor types
- [ ] Verify content preservation
- [ ] Test preview for each type

### Frappe Data References
- [ ] Click "Insert Frappe Data" button
- [ ] Select a DocType
- [ ] Select a document
- [ ] Select a field
- [ ] Verify Jinja tag insertion
- [ ] Save and view page
- [ ] Verify data renders correctly

## Known Limitations & Future Enhancements

### Current Limitations
1. **No Real-time Collaboration:** Collaboration extensions are installed but not configured
2. **No Canvas/Whiteboard:** AFFiNE-style canvas not yet implemented
3. **No Block System:** Traditional page-based editing only
4. **Limited Mobile Support:** Rich text editor may have issues on mobile

### Planned Enhancements
1. **Canvas Mode:** Add AFFiNE-style infinite canvas for visual organization
2. **Block System:** Implement block-based editing like Notion
3. **Real-time Collaboration:** Enable multi-user editing with Y.js
4. **Templates:** Pre-built page templates
5. **AI Integration:** AI-powered content suggestions
6. **Advanced Search:** Full-text search with filters
7. **Version Control:** Git-style version control for pages
8. **Export Options:** PDF, DOCX, HTML export

## AFFiNE Feature Comparison

Based on the AFFiNE repository analysis, here are the features we should consider:

### Implemented ✅
- Rich text editing
- Markdown support
- Local-first (via autosave)
- Multiple editor types

### Partially Implemented ⚠️
- Block-based editing (only in Rich Text mode)
- Tables and databases (basic tables only)

### Not Yet Implemented ❌
- Edgeless canvas/whiteboard
- Real-time collaboration
- AI features
- Mind maps
- Slides/presentations
- Drawing tools
- Object-based organization
- Plugin system

## Architecture Notes

### Editor System
The editor system uses a factory pattern:
1. Detects editor type from page metadata
2. Initializes appropriate editor (Ace or TipTap)
3. Provides unified save/load interface
4. Handles format conversion (HTML ↔ Markdown)

### Auto-save System
Uses localStorage with namespaced keys:
- Key format: `wiki_autosave_{page_name}`
- Stores: content, title, timestamp
- Cleanup: Automatic after 24 hours
- Conflict resolution: User prompt on restore

### Settings System
Traditional Frappe DocType-based:
- Single DocType: Wiki Settings
- Web page: /wiki-settings
- API: update_settings whitelisted method
- Permissions: Role-based access control

## Troubleshooting

### Build Errors
If you encounter build errors:
```bash
# Clear cache
bench clear-cache

# Rebuild
bench build --app wiki --force

# Restart
bench restart
```

### Editor Not Loading
1. Check browser console for errors
2. Verify all JS files are bundled
3. Clear browser cache
4. Check file permissions

### Autosave Not Working
1. Check localStorage is enabled
2. Verify browser supports localStorage
3. Check for quota exceeded errors
4. Clear old autosaves manually

### Settings Page Access Denied
1. Verify user has Wiki Admin role
2. Check permissions on Wiki Settings doctype
3. Verify role is in fixtures
4. Run `bench migrate` to update permissions

## Contributing

When adding new features:
1. Follow existing code patterns
2. Add to this documentation
3. Update testing checklist
4. Consider backward compatibility
5. Test on multiple browsers

## Support

For issues or questions:
1. Check this documentation
2. Review code comments
3. Check Frappe/ERPNext forums
4. Create GitHub issue (if applicable)


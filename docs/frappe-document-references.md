# Frappe Document References in Wiki - Implementation Plan

## Overview

This feature allows wiki pages to reference Frappe documents (e.g., Customer, Item, Device) with a seamless user experience for viewing and editing those documents directly from the wiki page.

## User Experience Flow

### 1. Configuration (Wiki Admin)
1. Navigate to Wiki Space settings
2. In a new "Document References" tab, add allowed DocTypes for this space
3. Example: Sales wiki space allows Customer, Quotation, Sales Order
4. Example: Network wiki space allows Device, Network Asset, IP Address

### 2. Inserting Document Reference (Editor)
1. User clicks "Insert Document Reference" button in TipTap toolbar
2. Dialog appears with two dropdowns:
   - **DocType**: Shows only DocTypes configured for current wiki space
   - **Document**: Searchable dropdown showing documents of selected DocType
3. User selects document and clicks "Insert"
4. A styled "document chip" appears in the editor with document name and icon

### 3. Viewing Document (Reader)
1. User views wiki page and sees document chips inline with content
2. Clicking a chip opens a drawer from the LEFT side (opposite of Raven's right drawer)
3. Drawer shows:
   - Document title and DocType
   - All fields in form layout (respecting field groups, sections, columns)
   - Read-only if user lacks write permission
   - Editable if user has write permission

### 4. Editing Document (If Permitted)
1. User with write permission clicks "Edit" button in drawer
2. Fields become editable
3. User makes changes
4. Clicks "Save" - document updates via Frappe API
5. Success message appears

### 5. Password Fields (Special Handling)
1. Password fields show as `••••••••` by default
2. Two buttons appear next to password field:
   - **Copy**: Copies password to clipboard (shows "Copied!" feedback)
   - **Show**: Toggles visibility (eye icon)

## Technical Architecture

### Backend Components

#### 1. New Child DocType: `Wiki Space DocType Reference`
```json
{
  "doctype": "DocType",
  "name": "Wiki Space DocType Reference",
  "fields": [
    {
      "fieldname": "doctype_name",
      "fieldtype": "Link",
      "options": "DocType",
      "label": "DocType",
      "reqd": 1
    },
    {
      "fieldname": "enabled",
      "fieldtype": "Check",
      "label": "Enabled",
      "default": 1
    }
  ]
}
```

#### 2. Update Wiki Space DocType
Add new field:
```json
{
  "fieldname": "allowed_doctypes",
  "fieldtype": "Table",
  "label": "Allowed DocTypes for References",
  "options": "Wiki Space DocType Reference"
}
```

#### 3. New API Endpoints

**File**: `wiki/wiki/api/document_references.py`

```python
@frappe.whitelist()
def get_allowed_doctypes(wiki_space):
    """Get list of DocTypes allowed for this wiki space"""
    
@frappe.whitelist()
def get_doctype_meta(doctype):
    """Get DocType metadata (fields, layout, etc.)"""
    
@frappe.whitelist()
def search_documents(doctype, txt, page_length=20):
    """Search for documents of given DocType"""
    
@frappe.whitelist()
def get_document(doctype, name):
    """Get full document data with permission check"""
    
@frappe.whitelist()
def update_document(doctype, name, data):
    """Update document with permission check"""
```

### Frontend Components

#### 1. TipTap Extension: Document Reference Node

**File**: `wiki/public/js/tiptap-extensions/document-reference.js`

```javascript
import { Node, mergeAttributes } from '@tiptap/core';

export const DocumentReference = Node.create({
  name: 'documentReference',
  
  group: 'inline',
  inline: true,
  atom: true,
  
  addAttributes() {
    return {
      doctype: { default: null },
      docname: { default: null },
      title: { default: null },
    };
  },
  
  parseHTML() {
    return [{ tag: 'span[data-document-reference]' }];
  },
  
  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-document-reference': '',
        'data-doctype': node.attrs.doctype,
        'data-docname': node.attrs.docname,
        'class': 'wiki-document-reference',
      }),
      node.attrs.title || node.attrs.docname,
    ];
  },
  
  addNodeView() {
    return ({ node, editor }) => {
      const dom = document.createElement('span');
      dom.className = 'wiki-document-reference';
      dom.setAttribute('data-doctype', node.attrs.doctype);
      dom.setAttribute('data-docname', node.attrs.docname);
      dom.textContent = node.attrs.title || node.attrs.docname;
      
      // Click handler to open drawer
      dom.addEventListener('click', (e) => {
        e.preventDefault();
        window.openDocumentDrawer(node.attrs.doctype, node.attrs.docname);
      });
      
      return { dom };
    };
  },
});
```

#### 2. Document Selector Dialog

**File**: `wiki/public/js/document-selector-dialog.js`

```javascript
class DocumentSelectorDialog {
  constructor(wikiSpace, onSelect) {
    this.wikiSpace = wikiSpace;
    this.onSelect = onSelect;
    this.dialog = null;
  }
  
  async show() {
    // Get allowed DocTypes for this wiki space
    const doctypes = await this.getAllowedDocTypes();
    
    // Create Frappe dialog with two fields
    this.dialog = new frappe.ui.Dialog({
      title: 'Insert Document Reference',
      fields: [
        {
          fieldname: 'doctype',
          fieldtype: 'Select',
          label: 'DocType',
          options: doctypes,
          reqd: 1,
          onchange: () => this.onDocTypeChange(),
        },
        {
          fieldname: 'document',
          fieldtype: 'Link',
          label: 'Document',
          reqd: 1,
          get_query: () => {
            return {
              doctype: this.dialog.get_value('doctype'),
            };
          },
        },
      ],
      primary_action_label: 'Insert',
      primary_action: (values) => {
        this.onSelect(values.doctype, values.document);
        this.dialog.hide();
      },
    });
    
    this.dialog.show();
  }
  
  async getAllowedDocTypes() {
    const response = await frappe.call({
      method: 'wiki.wiki.api.document_references.get_allowed_doctypes',
      args: { wiki_space: this.wikiSpace },
    });
    return response.message;
  }
}
```

#### 3. Document Drawer Component

**File**: `wiki/public/js/document-drawer.js`

Similar to Raven's OmniDrawer but:
- Slides from LEFT instead of right
- Displays Frappe form layout
- Handles password fields specially
- Simpler than OmniDrawer (no split panes, just document view)

```javascript
class WikiDocumentDrawer {
  constructor() {
    this.isOpen = false;
    this.currentDoc = null;
    this.isEditing = false;
  }
  
  async open(doctype, docname) {
    // Fetch document data
    const doc = await this.fetchDocument(doctype, docname);
    
    // Fetch DocType meta
    const meta = await this.fetchDocTypeMeta(doctype);
    
    // Render drawer
    this.render(doc, meta);
    
    // Animate in from left
    this.animateIn();
  }
  
  render(doc, meta) {
    // Create drawer HTML
    // Render form fields based on meta
    // Add edit/save buttons if user has permission
    // Special handling for password fields
  }
  
  // ... more methods
}
```

#### 4. Toolbar Button

Add button to TipTap toolbar for inserting document references.

### Styling

#### Document Reference Chip
```css
.wiki-document-reference {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: var(--primary-color-light);
  border: 1px solid var(--primary-color);
  border-radius: 12px;
  font-size: 0.9em;
  cursor: pointer;
  transition: all 0.2s;
}

.wiki-document-reference:hover {
  background: var(--primary-color);
  color: white;
}

.wiki-document-reference::before {
  content: "📄";
  margin-right: 4px;
}
```

#### Document Drawer
```css
.wiki-document-drawer {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 500px;
  background: white;
  box-shadow: 2px 0 10px rgba(0,0,0,0.1);
  z-index: 1000;
  transform: translateX(-100%);
  transition: transform 0.2s ease-in-out;
}

.wiki-document-drawer.open {
  transform: translateX(0);
}
```

## Implementation Phases

### Phase 1: Backend Setup
1. Create `Wiki Space DocType Reference` child DocType
2. Update `Wiki Space` DocType with new table field
3. Create API endpoints in `document_references.py`
4. Add permission checks

### Phase 2: TipTap Extension
1. Create `document-reference.js` extension
2. Add to TipTap editor initialization
3. Test rendering and parsing

### Phase 3: Document Selector
1. Create `document-selector-dialog.js`
2. Add toolbar button
3. Wire up insertion logic
4. Test document selection flow

### Phase 4: Document Drawer
1. Create `document-drawer.js`
2. Implement form rendering
3. Add edit/save functionality
4. Special password field handling
5. Test permissions

### Phase 5: Styling & Polish
1. Style document chips
2. Style drawer
3. Add animations
4. Mobile responsiveness
5. Accessibility

## Questions to Resolve

1. **Icon per DocType**: Should each DocType have a custom icon in the chip?
2. **Multiple Documents**: Should we support selecting multiple documents at once?
3. **Inline Preview**: Should hovering show a tooltip preview?
4. **Drawer Width**: Fixed 500px or configurable?
5. **Mobile Behavior**: Full-screen modal on mobile like Raven?
6. **Caching**: Should we cache document data or always fetch fresh?
7. **Real-time Updates**: Should drawer update if document changes elsewhere?

## Next Steps

Please review this plan and let me know:
1. Does this match your vision?
2. Any changes to the UX flow?
3. Answers to the questions above?
4. Should we proceed with implementation?


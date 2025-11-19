/**
 * TipTap Editor Toolbar
 * Provides formatting controls for the rich text editor
 */
class TipTapToolbar {
  constructor(editor, container) {
    this.editor = editor;
    this.container = container;
    this.init();
  }

  init() {
    this.container.innerHTML = this.getToolbarHTML();
    this.attachEventListeners();
    this.updateToolbarState();
    
    // Update toolbar state on selection change
    this.editor.on('selectionUpdate', () => {
      this.updateToolbarState();
    });
  }

  getToolbarHTML() {
    return `
      <div class="tiptap-toolbar">
        <div class="toolbar-group">
          <button class="toolbar-btn" data-action="bold" title="Bold (Ctrl+B)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />
            </svg>
          </button>
          <button class="toolbar-btn" data-action="italic" title="Italic (Ctrl+I)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" x2="10" y1="4" y2="4" />
              <line x1="14" x2="5" y1="20" y2="20" />
              <line x1="15" x2="9" y1="4" y2="20" />
            </svg>
          </button>
          <button class="toolbar-btn" data-action="underline" title="Underline (Ctrl+U)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 4v6a6 6 0 0 0 12 0V4" />
              <line x1="4" x2="20" y1="20" y2="20" />
            </svg>
          </button>
          <button class="toolbar-btn" data-action="strike" title="Strikethrough">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 4H9a3 3 0 0 0-2.83 4" />
              <path d="M14 12a4 4 0 0 1 0 8H6" />
              <line x1="4" x2="20" y1="12" y2="12" />
            </svg>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
          <button class="toolbar-btn" data-action="heading1" title="Heading 1">
            <span class="toolbar-text">H1</span>
          </button>
          <button class="toolbar-btn" data-action="heading2" title="Heading 2">
            <span class="toolbar-text">H2</span>
          </button>
          <button class="toolbar-btn" data-action="heading3" title="Heading 3">
            <span class="toolbar-text">H3</span>
          </button>
          <button class="toolbar-btn" data-action="paragraph" title="Paragraph">
            <span class="toolbar-text">P</span>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
          <button class="toolbar-btn" data-action="bulletList" title="Bullet List">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" x2="21" y1="6" y2="6" />
              <line x1="8" x2="21" y1="12" y2="12" />
              <line x1="8" x2="21" y1="18" y2="18" />
              <line x1="3" x2="3.01" y1="6" y2="6" />
              <line x1="3" x2="3.01" y1="12" y2="12" />
              <line x1="3" x2="3.01" y1="18" y2="18" />
            </svg>
          </button>
          <button class="toolbar-btn" data-action="orderedList" title="Numbered List">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="10" x2="21" y1="6" y2="6" />
              <line x1="10" x2="21" y1="12" y2="12" />
              <line x1="10" x2="21" y1="18" y2="18" />
              <path d="M4 6h1v4" />
              <path d="M4 10h2" />
              <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
            </svg>
          </button>
          <button class="toolbar-btn" data-action="taskList" title="Task List">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
          <button class="toolbar-btn" data-action="blockquote" title="Quote">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
              <path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
            </svg>
          </button>
          <button class="toolbar-btn" data-action="codeBlock" title="Code Block">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </button>
          <button class="toolbar-btn" data-action="code" title="Inline Code">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m18 16 4-4-4-4" />
              <path d="m6 8-4 4 4 4" />
              <path d="m14.5 4-5 16" />
            </svg>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
          <button class="toolbar-btn" data-action="link" title="Insert Link (Ctrl+K)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>
          <button class="toolbar-btn" data-action="image" title="Insert Image">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </button>
          <button class="toolbar-btn" data-action="video" title="Insert Video">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
              <rect x="2" y="6" width="14" height="12" rx="2" />
            </svg>
          </button>
          <button class="toolbar-btn" data-action="table" title="Insert Table">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 3v18" />
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18" />
              <path d="M3 15h18" />
            </svg>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
          <button class="toolbar-btn" data-action="highlight" title="Highlight">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m9 11-6 6v3h9l3-3" />
              <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
            </svg>
          </button>
          <button class="toolbar-btn" data-action="alignLeft" title="Align Left">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="21" x2="3" y1="6" y2="6" />
              <line x1="15" x2="3" y1="12" y2="12" />
              <line x1="17" x2="3" y1="18" y2="18" />
            </svg>
          </button>
          <button class="toolbar-btn" data-action="alignCenter" title="Align Center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="21" x2="3" y1="6" y2="6" />
              <line x1="17" x2="7" y1="12" y2="12" />
              <line x1="19" x2="5" y1="18" y2="18" />
            </svg>
          </button>
          <button class="toolbar-btn" data-action="alignRight" title="Align Right">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="21" x2="3" y1="6" y2="6" />
              <line x1="21" x2="9" y1="12" y2="12" />
              <line x1="21" x2="7" y1="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
          <button class="toolbar-btn" data-action="undo" title="Undo (Ctrl+Z)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </button>
          <button class="toolbar-btn" data-action="redo" title="Redo (Ctrl+Y)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
            </svg>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
          <button class="toolbar-btn" data-action="frappe-data" title="Insert Frappe Data">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </button>
          <button class="toolbar-btn" data-action="document-reference" title="Insert Document Reference">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" x2="12" y1="18" y2="12" />
              <line x1="9" x2="15" y1="15" y2="15" />
            </svg>
          </button>
        </div>

        <div class="autosave-indicator"></div>
      </div>
    `;
  }

  attachEventListeners() {
    const buttons = this.container.querySelectorAll('.toolbar-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.dataset.action;
        this.handleAction(action);
      });
    });
  }

  handleAction(action) {
    const { editor } = this;

    switch (action) {
      case 'bold':
        editor.chain().focus().toggleBold().run();
        break;
      case 'italic':
        editor.chain().focus().toggleItalic().run();
        break;
      case 'underline':
        editor.chain().focus().toggleUnderline().run();
        break;
      case 'strike':
        editor.chain().focus().toggleStrike().run();
        break;
      case 'heading1':
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'heading2':
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'heading3':
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'paragraph':
        editor.chain().focus().setParagraph().run();
        break;
      case 'bulletList':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'orderedList':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'taskList':
        editor.chain().focus().toggleTaskList().run();
        break;
      case 'blockquote':
        editor.chain().focus().toggleBlockquote().run();
        break;
      case 'codeBlock':
        editor.chain().focus().toggleCodeBlock().run();
        break;
      case 'code':
        editor.chain().focus().toggleCode().run();
        break;
      case 'link':
        this.insertLink();
        break;
      case 'image':
        this.insertImage();
        break;
      case 'video':
        this.insertVideo();
        break;
      case 'table':
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        break;
      case 'highlight':
        editor.chain().focus().toggleHighlight().run();
        break;
      case 'alignLeft':
        editor.chain().focus().setTextAlign('left').run();
        break;
      case 'alignCenter':
        editor.chain().focus().setTextAlign('center').run();
        break;
      case 'alignRight':
        editor.chain().focus().setTextAlign('right').run();
        break;
      case 'undo':
        editor.chain().focus().undo().run();
        break;
      case 'redo':
        editor.chain().focus().redo().run();
        break;
      case 'frappe-data':
        this.insertFrappeData();
        break;
      case 'document-reference':
        this.insertDocumentReference();
        break;
    }

    this.updateToolbarState();
  }

  updateToolbarState() {
    // Update active states for buttons
    const buttons = this.container.querySelectorAll('.toolbar-btn');
    buttons.forEach(btn => {
      const action = btn.dataset.action;
      btn.classList.remove('is-active');

      if (this.editor.isActive(action)) {
        btn.classList.add('is-active');
      } else if (action === 'heading1' && this.editor.isActive('heading', { level: 1 })) {
        btn.classList.add('is-active');
      } else if (action === 'heading2' && this.editor.isActive('heading', { level: 2 })) {
        btn.classList.add('is-active');
      } else if (action === 'heading3' && this.editor.isActive('heading', { level: 3 })) {
        btn.classList.add('is-active');
      }
    });
  }

  insertLink() {
    const url = prompt('Enter URL:');
    if (url) {
      this.editor.chain().focus().setLink({ href: url }).run();
    }
  }

  insertImage() {
    // Use Frappe's file uploader
    new frappe.ui.FileUploader({
      dialog_title: __('Insert Image'),
      folder: 'Home/Attachments',
      allow_multiple: false,
      make_attachments_public: true,
      restrictions: {
        allowed_file_types: ['image/*'],
      },
      on_success: (file_doc) => {
        const url = encodeURI(file_doc.file_url);
        this.editor.chain().focus().setImage({ src: url }).run();
      },
    });
  }

  insertVideo() {
    // Use Frappe's file uploader
    new frappe.ui.FileUploader({
      dialog_title: __('Insert Video'),
      folder: 'Home/Attachments',
      allow_multiple: false,
      make_attachments_public: true,
      restrictions: {
        allowed_file_types: ['video/mp4', 'video/quicktime'],
      },
      on_success: (file_doc) => {
        const url = encodeURI(file_doc.file_url);
        const videoHTML = `<video controls width="100%" height="auto"><source src="${url}" type="video/mp4"></video>`;
        this.editor.commands.insertContent(videoHTML);
      },
    });
  }

  insertFrappeData() {
    // Show dialog to select doctype and field
    const d = new frappe.ui.Dialog({
      title: __('Insert Frappe Data'),
      fields: [
        {
          label: __('DocType'),
          fieldname: 'doctype',
          fieldtype: 'Link',
          options: 'DocType',
          reqd: 1,
        },
        {
          label: __('Document Name'),
          fieldname: 'docname',
          fieldtype: 'Dynamic Link',
          options: 'doctype',
          reqd: 1,
        },
        {
          label: __('Field'),
          fieldname: 'fieldname',
          fieldtype: 'Select',
          reqd: 1,
        },
      ],
      primary_action_label: __('Insert'),
      primary_action: (values) => {
        const jinjaTag = `{{ frappe.get_value("${values.doctype}", "${values.docname}", "${values.fieldname}") }}`;
        this.editor.commands.insertContent(jinjaTag);
        d.hide();
      },
    });

    // Update field options when doctype changes
    d.fields_dict.doctype.$input.on('change', () => {
      const doctype = d.get_value('doctype');
      if (doctype) {
        frappe.model.with_doctype(doctype, () => {
          const fields = frappe.get_meta(doctype).fields
            .filter(f => !f.hidden)
            .map(f => f.fieldname);
          d.set_df_property('fieldname', 'options', fields);
        });
      }
    });

    d.show();
  }

  insertDocumentReference() {
    // This method will be set by the editor-integrated.js
    // It needs access to the wiki space and tiptap editor instance
    if (window.showDocumentSelectorDialog) {
      window.showDocumentSelectorDialog();
    } else {
      frappe.msgprint({
        title: __('Feature Not Available'),
        message: __('Document references are not available in this context.'),
        indicator: 'orange',
      });
    }
  }
}

export default TipTapToolbar;


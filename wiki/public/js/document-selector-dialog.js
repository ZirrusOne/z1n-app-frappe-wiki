/**
 * Document Selector Dialog
 * 
 * Provides a dialog for selecting a Frappe document to insert as a reference in the wiki.
 */

class DocumentSelectorDialog {
  constructor(wikiSpace, tiptapEditor) {
    this.wikiSpace = wikiSpace;
    this.tiptapEditor = tiptapEditor;
    this.dialog = null;
    this.allowedDoctypes = [];
  }

  /**
   * Show the document selector dialog
   */
  async show() {
    // Get allowed DocTypes for this wiki space
    try {
      this.allowedDoctypes = await this.getAllowedDocTypes();
      
      if (!this.allowedDoctypes || this.allowedDoctypes.length === 0) {
        frappe.msgprint({
          title: __('No DocTypes Configured'),
          message: __('No DocTypes have been configured for document references in this wiki space. Please contact your administrator.'),
          indicator: 'orange',
        });
        return;
      }
      
      // Create the dialog
      this.createDialog();
      this.dialog.show();
      
    } catch (error) {
      console.error('Error loading allowed doctypes:', error);
      frappe.msgprint({
        title: __('Error'),
        message: __('Failed to load allowed DocTypes. Please try again.'),
        indicator: 'red',
      });
    }
  }

  /**
   * Create the Frappe dialog
   */
  createDialog() {
    // Build options for DocType select field
    const doctypeOptions = this.allowedDoctypes.map(dt => ({
      label: dt.doctype,
      value: dt.doctype,
    }));

    this.dialog = new frappe.ui.Dialog({
      title: __('Insert Document Reference'),
      fields: [
        {
          fieldname: 'doctype',
          fieldtype: 'Select',
          label: __('DocType'),
          options: doctypeOptions,
          reqd: 1,
          onchange: () => this.onDocTypeChange(),
        },
        {
          fieldname: 'document',
          fieldtype: 'Link',
          label: __('Document'),
          reqd: 1,
          get_query: () => {
            const selectedDoctype = this.dialog.get_value('doctype');
            if (!selectedDoctype) {
              return {};
            }
            return {
              doctype: selectedDoctype,
            };
          },
          onchange: () => this.onDocumentChange(),
        },
        {
          fieldname: 'preview_section',
          fieldtype: 'Section Break',
          label: __('Preview'),
        },
        {
          fieldname: 'preview_html',
          fieldtype: 'HTML',
        },
      ],
      primary_action_label: __('Insert'),
      primary_action: (values) => {
        this.insertDocument(values);
      },
      secondary_action_label: __('Cancel'),
    });
  }

  /**
   * Handle DocType selection change
   */
  onDocTypeChange() {
    // Clear document field when doctype changes
    this.dialog.set_value('document', '');
    this.updatePreview(null);
  }

  /**
   * Handle document selection change
   */
  async onDocumentChange() {
    const doctype = this.dialog.get_value('doctype');
    const docname = this.dialog.get_value('document');
    
    if (doctype && docname) {
      try {
        // Fetch document details for preview
        const doc = await this.getDocumentDetails(doctype, docname);
        this.updatePreview(doc);
      } catch (error) {
        console.error('Error fetching document details:', error);
        this.updatePreview(null);
      }
    } else {
      this.updatePreview(null);
    }
  }

  /**
   * Update the preview section
   */
  updatePreview(doc) {
    const previewField = this.dialog.fields_dict.preview_html;
    
    if (!doc) {
      previewField.$wrapper.html('<p class="text-muted">' + __('Select a document to see preview') + '</p>');
      return;
    }
    
    // Get icon for this doctype
    const doctypeConfig = this.allowedDoctypes.find(dt => dt.doctype === doc.doctype);
    const icon = doctypeConfig?.icon || 'file';
    
    // Build preview HTML
    let statusBadge = '';
    if (doc.docstatus !== null && doc.docstatus !== undefined) {
      const statusClass = this.getStatusClass(doc.docstatus);
      statusBadge = `<span class="badge ${statusClass}">${doc.status_label}</span>`;
    }
    
    const previewHTML = `
      <div class="document-reference-preview">
        <div class="doc-ref-preview-chip">
          <span class="doc-ref-icon">${this.getIconHTML(icon)}</span>
          <span class="doc-ref-text">${doc.title}</span>
          ${statusBadge}
        </div>
        <div class="doc-ref-preview-info">
          <small class="text-muted">
            <strong>${__('DocType')}:</strong> ${doc.doctype}<br>
            <strong>${__('Name')}:</strong> ${doc.name}<br>
            <strong>${__('Modified')}:</strong> ${frappe.datetime.str_to_user(doc.modified)}
          </small>
        </div>
      </div>
    `;
    
    previewField.$wrapper.html(previewHTML);
  }

  /**
   * Insert the selected document into the editor
   */
  async insertDocument(values) {
    const doctype = values.doctype;
    const docname = values.document;
    
    if (!doctype || !docname) {
      frappe.msgprint(__('Please select both DocType and Document'));
      return;
    }
    
    try {
      // Get document details
      const doc = await this.getDocumentDetails(doctype, docname);
      
      // Get icon for this doctype
      const doctypeConfig = this.allowedDoctypes.find(dt => dt.doctype === doctype);
      const icon = doctypeConfig?.icon || 'file';
      
      // Insert into editor
      this.tiptapEditor.insertDocumentReference(
        doctype,
        docname,
        doc.title,
        icon,
        doc.docstatus
      );
      
      // Close dialog
      this.dialog.hide();
      
      // Show success message
      frappe.show_alert({
        message: __('Document reference inserted'),
        indicator: 'green',
      });
      
    } catch (error) {
      console.error('Error inserting document reference:', error);
      frappe.msgprint({
        title: __('Error'),
        message: __('Failed to insert document reference. Please try again.'),
        indicator: 'red',
      });
    }
  }

  /**
   * Get allowed DocTypes from the wiki space
   */
  async getAllowedDocTypes() {
    const response = await frappe.call({
      method: 'wiki.wiki.api.document_references.get_allowed_doctypes',
      args: {
        wiki_space: this.wikiSpace,
      },
    });
    
    return response.message || [];
  }

  /**
   * Get document details
   */
  async getDocumentDetails(doctype, name) {
    const response = await frappe.call({
      method: 'wiki.wiki.api.document_references.get_document',
      args: {
        doctype: doctype,
        name: name,
      },
    });
    
    return response.message;
  }

  /**
   * Get status class for badge
   */
  getStatusClass(docstatus) {
    const statusMap = {
      0: 'badge-warning',
      1: 'badge-success',
      2: 'badge-danger',
    };
    return statusMap[docstatus] || 'badge-secondary';
  }

  /**
   * Get icon HTML
   */
  getIconHTML(icon) {
    // Simple emoji icons for now
    const iconMap = {
      'file': '📄',
      'user': '👤',
      'customer': '👥',
      'item': '📦',
      'settings': '⚙️',
      'device': '🖥️',
      'network': '🌐',
      'server': '🖧',
    };
    
    return iconMap[icon] || iconMap['file'];
  }
}

// Export for use in other modules
window.DocumentSelectorDialog = DocumentSelectorDialog;


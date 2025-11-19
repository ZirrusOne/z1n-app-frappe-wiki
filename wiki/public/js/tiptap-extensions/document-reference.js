/**
 * TipTap Extension: Document Reference
 * 
 * Allows inserting references to Frappe documents in wiki pages.
 * Renders as clickable chips that open a drawer with document details.
 */

import { Node, mergeAttributes } from '@tiptap/core';

export const DocumentReference = Node.create({
  name: 'documentReference',
  
  group: 'inline',
  inline: true,
  atom: true,
  
  addAttributes() {
    return {
      doctype: {
        default: null,
        parseHTML: element => element.getAttribute('data-doctype'),
        renderHTML: attributes => {
          if (!attributes.doctype) {
            return {};
          }
          return {
            'data-doctype': attributes.doctype,
          };
        },
      },
      docname: {
        default: null,
        parseHTML: element => element.getAttribute('data-docname'),
        renderHTML: attributes => {
          if (!attributes.docname) {
            return {};
          }
          return {
            'data-docname': attributes.docname,
          };
        },
      },
      title: {
        default: null,
        parseHTML: element => element.getAttribute('data-title'),
        renderHTML: attributes => {
          if (!attributes.title) {
            return {};
          }
          return {
            'data-title': attributes.title,
          };
        },
      },
      icon: {
        default: 'file',
        parseHTML: element => element.getAttribute('data-icon'),
        renderHTML: attributes => {
          return {
            'data-icon': attributes.icon || 'file',
          };
        },
      },
      docstatus: {
        default: null,
        parseHTML: element => element.getAttribute('data-docstatus'),
        renderHTML: attributes => {
          if (attributes.docstatus === null || attributes.docstatus === undefined) {
            return {};
          }
          return {
            'data-docstatus': attributes.docstatus,
          };
        },
      },
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'span[data-document-reference]',
      },
    ];
  },
  
  renderHTML({ node, HTMLAttributes }) {
    const attrs = mergeAttributes(HTMLAttributes, {
      'data-document-reference': '',
      'class': 'wiki-document-reference',
    });
    
    return ['span', attrs, node.attrs.title || node.attrs.docname || 'Document'];
  },
  
  addNodeView() {
    return ({ node, editor }) => {
      const dom = document.createElement('span');
      dom.className = 'wiki-document-reference';
      dom.setAttribute('data-document-reference', '');
      dom.setAttribute('data-doctype', node.attrs.doctype);
      dom.setAttribute('data-docname', node.attrs.docname);
      dom.setAttribute('data-title', node.attrs.title || node.attrs.docname);
      dom.setAttribute('data-icon', node.attrs.icon || 'file');
      
      if (node.attrs.docstatus !== null && node.attrs.docstatus !== undefined) {
        dom.setAttribute('data-docstatus', node.attrs.docstatus);
        
        // Add status indicator class
        const statusClass = getStatusClass(node.attrs.docstatus);
        dom.classList.add(statusClass);
      }
      
      // Create icon element
      const iconSpan = document.createElement('span');
      iconSpan.className = 'doc-ref-icon';
      iconSpan.innerHTML = getIconHTML(node.attrs.icon || 'file');
      dom.appendChild(iconSpan);
      
      // Create text element
      const textSpan = document.createElement('span');
      textSpan.className = 'doc-ref-text';
      textSpan.textContent = node.attrs.title || node.attrs.docname;
      dom.appendChild(textSpan);
      
      // Add status badge if document is submittable
      if (node.attrs.docstatus !== null && node.attrs.docstatus !== undefined) {
        const statusBadge = document.createElement('span');
        statusBadge.className = 'doc-ref-status';
        statusBadge.textContent = getStatusLabel(node.attrs.docstatus);
        dom.appendChild(statusBadge);
      }
      
      // Click handler to open drawer
      dom.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Call global function to open document drawer
        if (window.openWikiDocumentDrawer) {
          window.openWikiDocumentDrawer(node.attrs.doctype, node.attrs.docname);
        } else {
          console.warn('Document drawer not initialized');
        }
      });
      
      // Context menu handler (right-click)
      dom.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Show context menu
        if (window.showDocumentReferenceContextMenu) {
          window.showDocumentReferenceContextMenu(e, node.attrs.doctype, node.attrs.docname);
        }
      });
      
      // Make it non-editable
      dom.contentEditable = 'false';
      
      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) {
            return false;
          }
          
          // Update attributes if changed
          dom.setAttribute('data-doctype', updatedNode.attrs.doctype);
          dom.setAttribute('data-docname', updatedNode.attrs.docname);
          dom.setAttribute('data-title', updatedNode.attrs.title || updatedNode.attrs.docname);
          dom.setAttribute('data-icon', updatedNode.attrs.icon || 'file');
          
          // Update text
          textSpan.textContent = updatedNode.attrs.title || updatedNode.attrs.docname;
          
          // Update icon
          iconSpan.innerHTML = getIconHTML(updatedNode.attrs.icon || 'file');
          
          return true;
        },
      };
    };
  },
  
  addCommands() {
    return {
      insertDocumentReference: (attributes) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: attributes,
        });
      },
    };
  },
});

/**
 * Helper function to get status class based on docstatus
 */
function getStatusClass(docstatus) {
  const statusMap = {
    0: 'doc-status-draft',
    1: 'doc-status-submitted',
    2: 'doc-status-cancelled',
  };
  return statusMap[docstatus] || 'doc-status-unknown';
}

/**
 * Helper function to get status label
 */
function getStatusLabel(docstatus) {
  const statusMap = {
    0: 'Draft',
    1: 'Submitted',
    2: 'Cancelled',
  };
  return statusMap[docstatus] || 'Unknown';
}

/**
 * Helper function to get icon HTML
 * Uses Frappe's icon system
 */
function getIconHTML(icon) {
  // For now, use simple emoji icons
  // TODO: Integrate with Frappe's icon system
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


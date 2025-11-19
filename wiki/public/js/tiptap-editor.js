import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { lowlight } from 'lowlight';
import TurndownService from 'turndown';
import { DocumentReference } from './tiptap-extensions/document-reference.js';

// Auto-save configuration
const AUTOSAVE_INTERVAL = 30000; // 30 seconds
const AUTOSAVE_KEY_PREFIX = 'wiki_autosave_';

/**
 * TipTap Rich Text Editor for Wiki
 * Provides WYSIWYG editing with markdown support and auto-save functionality
 */
class WikiTipTapEditor {
  constructor(options = {}) {
    this.container = options.container;
    this.wikiPageName = options.wikiPageName;
    this.initialContent = options.initialContent || '';
    this.onSave = options.onSave;
    this.editor = null;
    this.autosaveTimer = null;
    this.isLoadingContent = false; // Flag to prevent autosave during programmatic content loading
    this.isSaving = false; // Flag to prevent autosave during save operation
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });

    this.init();
  }

  /**
   * Initialize the TipTap editor with all extensions
   */
  init() {
    // Start with minimal extensions to test
    const extensions = [
      StarterKit,
      DocumentReference,
    ];

    this.editor = new Editor({
      element: this.container,
      extensions: extensions,
      content: this.initialContent,
      editorProps: {
        attributes: {
          class: 'wiki-tiptap-editor prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none',
        },
      },
      onUpdate: ({ editor }) => {
        // Only schedule autosave if we're not programmatically loading content
        if (!this.isLoadingContent) {
          this.scheduleAutosave();
        }
      },
    });

    // Setup autosave on page unload (but not if we're saving)
    window.addEventListener('beforeunload', () => {
      if (!this.isSaving) {
        this.saveToLocalStorage();
      }
    });
  }

  /**
   * Schedule autosave after user stops typing
   */
  scheduleAutosave() {
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }

    this.autosaveTimer = setTimeout(() => {
      this.saveToLocalStorage();
    }, AUTOSAVE_INTERVAL);
  }

  /**
   * Get autosave key with username to make it per-user
   */
  getAutosaveKey() {
    const username = frappe.session.user || 'guest';
    return `${AUTOSAVE_KEY_PREFIX}${username}_${this.wikiPageName}`;
  }

  /**
   * Save current content to localStorage
   */
  saveToLocalStorage() {
    if (!this.wikiPageName) return;

    const content = this.getHTML();
    const timestamp = new Date().toISOString();

    const autosaveData = {
      content,
      timestamp,
      pageTitle: document.querySelector('.wiki-title-input')?.value || '',
      username: frappe.session.user || 'guest',
    };

    localStorage.setItem(
      this.getAutosaveKey(),
      JSON.stringify(autosaveData)
    );

    this.showAutosaveIndicator();
  }

  /**
   * Check if there's a valid autosave available
   * @returns {boolean} True if autosave exists and is valid
   */
  hasAutosave() {
    if (!this.wikiPageName) return false;

    const autosaveKey = this.getAutosaveKey();
    const autosaveData = localStorage.getItem(autosaveKey);

    if (!autosaveData) return false;

    try {
      const { timestamp, username } = JSON.parse(autosaveData);

      // Verify this autosave belongs to current user
      const currentUser = frappe.session.user || 'guest';
      if (username && username !== currentUser) {
        return false;
      }

      const autosaveDate = new Date(timestamp);
      const now = new Date();
      const hoursSinceAutosave = (now - autosaveDate) / (1000 * 60 * 60);

      // Only valid if less than 24 hours old
      return hoursSinceAutosave < 24;
    } catch (e) {
      return false;
    }
  }

  /**
   * Check for autosaved content from localStorage
   * Only shows prompt, doesn't automatically restore
   * @param {Function} onDeclineCallback - Called when user declines to restore autosave
   */
  checkForAutosave(onDeclineCallback) {
    if (!this.wikiPageName) {
      if (onDeclineCallback) onDeclineCallback();
      return;
    }

    // Clean up old autosave format (without username) if it exists
    const oldAutosaveKey = `${AUTOSAVE_KEY_PREFIX}${this.wikiPageName}`;
    if (localStorage.getItem(oldAutosaveKey)) {
      localStorage.removeItem(oldAutosaveKey);
    }

    const autosaveKey = this.getAutosaveKey();
    const autosaveData = localStorage.getItem(autosaveKey);

    if (autosaveData) {
      try {
        const { content, timestamp, pageTitle, username } = JSON.parse(autosaveData);

        // Verify this autosave belongs to current user
        const currentUser = frappe.session.user || 'guest';
        if (username && username !== currentUser) {
          // Different user, clear this autosave
          localStorage.removeItem(autosaveKey);
          if (onDeclineCallback) onDeclineCallback();
          return;
        }

        const autosaveDate = new Date(timestamp);
        const now = new Date();
        const hoursSinceAutosave = (now - autosaveDate) / (1000 * 60 * 60);

        // Only restore if autosave is less than 24 hours old
        if (hoursSinceAutosave < 24) {
          this.showAutosaveRestorePrompt(content, pageTitle, autosaveDate, onDeclineCallback);
        } else {
          // Clear old autosave
          localStorage.removeItem(autosaveKey);
          if (onDeclineCallback) onDeclineCallback();
        }
      } catch (e) {
        console.error('Failed to load autosave:', e);
        if (onDeclineCallback) onDeclineCallback();
      }
    } else {
      if (onDeclineCallback) onDeclineCallback();
    }
  }

  /**
   * Show prompt to restore autosaved content
   * @param {string} content - The autosaved content
   * @param {string} pageTitle - The autosaved page title
   * @param {Date} timestamp - When the autosave was created
   * @param {Function} onDeclineCallback - Called when user declines to restore
   */
  showAutosaveRestorePrompt(content, pageTitle, timestamp, onDeclineCallback) {
    const formattedDate = timestamp.toLocaleString();

    // Get current content for comparison
    const currentContent = this.editor.getHTML();
    const currentTitle = document.querySelector('.wiki-title-input')?.value || '';

    // Create a custom dialog with diff view
    const dialog = new frappe.ui.Dialog({
      title: __('Restore Autosaved Content?'),
      size: 'extra-large',
      fields: [
        {
          fieldtype: 'HTML',
          fieldname: 'info',
          options: `
            <div style="margin-bottom: 15px; padding: 10px; background-color: var(--bg-blue); border-radius: 4px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <svg style="width: 20px; height: 20px; color: var(--blue-500);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <div>
                  <strong>Autosaved version found</strong>
                  <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                    Last saved: ${formattedDate}
                  </div>
                </div>
              </div>
            </div>
          `
        },
        {
          fieldtype: 'HTML',
          fieldname: 'diff_view',
          options: this.createDiffView(currentTitle, pageTitle, currentContent, content)
        }
      ],
      primary_action_label: __('Restore Autosave'),
      primary_action: () => {
        // User accepted - restore content and clear autosave
        // Set flag to prevent autosave during content loading
        this.isLoadingContent = true;
        this.editor.commands.setContent(content);

        // Keep the flag set for a moment to ensure onUpdate doesn't trigger autosave
        // onUpdate fires asynchronously, so we need to wait
        setTimeout(() => {
          this.isLoadingContent = false;
        }, 100);

        if (pageTitle) {
          const titleInput = document.querySelector('.wiki-title-input');
          if (titleInput) titleInput.value = pageTitle;
        }

        // Clear the autosave since we've restored it
        this.clearAutosave();

        frappe.show_alert({
          message: __('Autosaved content restored'),
          indicator: 'green',
        });

        dialog.hide();
      },
      secondary_action_label: __('Discard Autosave'),
      secondary_action: () => {
        // User declined - clear autosave and load from server
        this.clearAutosave();
        if (onDeclineCallback) onDeclineCallback();
        dialog.hide();
      }
    });

    dialog.show();
  }

  /**
   * Create a diff view comparing current and autosaved content
   * @param {string} currentTitle - Current page title
   * @param {string} autosaveTitle - Autosaved page title
   * @param {string} currentContent - Current HTML content
   * @param {string} autosaveContent - Autosaved HTML content
   * @returns {string} HTML for diff view
   */
  createDiffView(currentTitle, autosaveTitle, currentContent, autosaveContent) {
    // Convert HTML to plain text for better readability in diff
    const currentText = this.htmlToText(currentContent);
    const autosaveText = this.htmlToText(autosaveContent);

    // Check if there are differences
    const titleChanged = currentTitle !== autosaveTitle;
    const contentChanged = currentText !== autosaveText;

    return `
      <div style="margin-top: 10px;">
        ${titleChanged ? `
          <div style="margin-bottom: 20px;">
            <h6 style="margin-bottom: 8px; font-weight: 600;">Page Title</h6>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Current</div>
                <div style="padding: 8px; background-color: var(--bg-red); border-left: 3px solid var(--red-500); border-radius: 4px; font-family: monospace; font-size: 13px;">
                  ${this.escapeHtml(currentTitle || '(empty)')}
                </div>
              </div>
              <div>
                <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Autosaved</div>
                <div style="padding: 8px; background-color: var(--bg-green); border-left: 3px solid var(--green-500); border-radius: 4px; font-family: monospace; font-size: 13px;">
                  ${this.escapeHtml(autosaveTitle || '(empty)')}
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        <div>
          <h6 style="margin-bottom: 8px; font-weight: 600;">Content ${contentChanged ? '(Changed)' : '(No Changes)'}</h6>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Current Version</div>
              <div style="max-height: 400px; overflow-y: auto; padding: 12px; background-color: var(--control-bg); border: 1px solid var(--border-color); border-radius: 4px; font-family: monospace; font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word;">
                ${this.escapeHtml(currentText || '(empty)')}
              </div>
              <div style="margin-top: 4px; font-size: 11px; color: var(--text-muted);">
                ${currentText.length} characters
              </div>
            </div>
            <div>
              <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Autosaved Version</div>
              <div style="max-height: 400px; overflow-y: auto; padding: 12px; background-color: var(--bg-green); border: 1px solid var(--green-300); border-radius: 4px; font-family: monospace; font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word;">
                ${this.escapeHtml(autosaveText || '(empty)')}
              </div>
              <div style="margin-top: 4px; font-size: 11px; color: var(--text-muted);">
                ${autosaveText.length} characters
              </div>
            </div>
          </div>
        </div>

        ${!contentChanged && !titleChanged ? `
          <div style="margin-top: 15px; padding: 10px; background-color: var(--bg-yellow); border-radius: 4px; font-size: 13px;">
            <strong>Note:</strong> The autosaved version appears to be identical to the current version.
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Convert HTML to plain text for diff comparison
   * @param {string} html - HTML content
   * @returns {string} Plain text
   */
  htmlToText(html) {
    if (!html) return '';

    // Create a temporary element to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Get text content and normalize whitespace
    return temp.textContent || temp.innerText || '';
  }

  /**
   * Escape HTML for safe display
   * @param {string} text - Text to escape
   * @returns {string} Escaped HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clear autosaved content
   */
  clearAutosave() {
    if (!this.wikiPageName) return;
    localStorage.removeItem(this.getAutosaveKey());
  }

  /**
   * Mark that we're saving the page (to prevent autosave on beforeunload)
   */
  setSaving(saving) {
    this.isSaving = saving;
  }

  /**
   * Show autosave indicator
   */
  showAutosaveIndicator() {
    const indicator = document.querySelector('.autosave-indicator');
    if (indicator) {
      indicator.textContent = 'Autosaved';
      indicator.classList.add('visible');
      setTimeout(() => {
        indicator.classList.remove('visible');
      }, 2000);
    }
  }

  /**
   * Get HTML content from editor
   */
  getHTML() {
    return this.editor.getHTML();
  }

  /**
   * Get Markdown content from editor
   */
  getMarkdown() {
    const html = this.getHTML();
    return this.turndownService.turndown(html);
  }

  /**
   * Set content in editor
   * @param {string} content - The content to set
   * @param {string} format - Format of content ('html' or 'markdown')
   */
  setContent(content, format = 'html') {
    // Set flag to prevent autosave during content loading
    this.isLoadingContent = true;

    if (format === 'html') {
      this.editor.commands.setContent(content);
      // Keep flag set for a moment to ensure onUpdate doesn't trigger autosave
      setTimeout(() => {
        this.isLoadingContent = false;
      }, 100);
    } else if (format === 'markdown') {
      // Convert markdown to HTML first
      frappe.call({
        method: 'wiki.wiki.doctype.wiki_page.wiki_page.convert_markdown',
        args: { markdown: content },
        callback: (r) => {
          this.editor.commands.setContent(r.message);
          setTimeout(() => {
            this.isLoadingContent = false;
          }, 100);
        },
      });
    }
  }

  /**
   * Insert image at cursor
   */
  insertImage(url) {
    this.editor.chain().focus().setImage({ src: url }).run();
  }

  /**
   * Insert video at cursor
   */
  insertVideo(url) {
    const videoHTML = `<video controls width="100%" height="auto"><source src="${url}" type="video/mp4"></video>`;
    this.editor.commands.insertContent(videoHTML);
  }

  /**
   * Insert a document reference into the editor
   */
  insertDocumentReference(doctype, docname, title, icon, docstatus) {
    if (!this.editor) {
      console.error('Editor not initialized');
      return;
    }

    this.editor.chain().focus().insertDocumentReference({
      doctype: doctype,
      docname: docname,
      title: title || docname,
      icon: icon || 'file',
      docstatus: docstatus,
    }).run();
  }

  /**
   * Destroy editor and cleanup
   */
  destroy() {
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }
    if (this.editor) {
      this.editor.destroy();
    }
  }
}

export default WikiTipTapEditor;


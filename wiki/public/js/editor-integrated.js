import * as Ace from "ace-builds";
import "ace-builds/src-noconflict/mode-markdown";
import "ace-builds/src-noconflict/mode-yaml";
import "ace-builds/src-noconflict/theme-tomorrow_night";
import * as yaml from "js-yaml";
import WikiTipTapEditor from "./tiptap-editor.js";
import TipTapToolbar from "./tiptap-toolbar.js";

// Configure Ace to not use web workers (they cause issues with bundling)
Ace.config.set("useWorker", false);

const editorContainer = document.getElementById("wiki-editor");
const aceEditorContainer = document.querySelector(".editor-container");
const tiptapEditorContainer = document.getElementById("wiki-tiptap-editor");
const tiptapEditorParentContainer = document.querySelector(".wiki-tiptap-editor-container");
const tiptapToolbarContainer = document.getElementById("tiptap-toolbar");
const previewContainer = $("#preview-container");
const previewToggleBtn = $("#toggle-btn");
const wikiTitleInput = $(".wiki-title-input");
const editWikiBtn = $(".edit-wiki-btn, .sidebar-edit-mode-btn");
const saveWikiPageBtn = document.querySelector(
  '[data-wiki-button="saveWikiPage"]',
);
const draftWikiPageBtn = document.querySelector(
  '[data-wiki-button="draftWikiPage"]',
);
let showPreview = false;
let currentEditorType = "Text"; // Default to Text editor
let aceEditor = null;
let tiptapEditor = null;
let tiptapToolbar = null;

// Get editor type from page data attribute
const pageEditorType = document.querySelector('[data-wiki-editor-type]')?.dataset?.wikiEditorType || "Text";
currentEditorType = pageEditorType;

// Track if editor has been initialized
let editorInitialized = false;

// Initialize the appropriate editor based on type
function initializeEditor() {
  // Prevent multiple initializations
  if (editorInitialized) {
    console.log('Editor already initialized, skipping...');
    return;
  }

  if (currentEditorType === "Rich Text") {
    // Hide Ace editor and show TipTap
    if (aceEditorContainer) aceEditorContainer.style.display = "none";
    if (tiptapEditorParentContainer) tiptapEditorParentContainer.style.display = "block";
    $("#markdown-toolbar").hide();

    // Initialize TipTap editor only once
    if (!tiptapEditor && tiptapEditorContainer) {
      try {
        // Get wiki page name from hidden input or global variable
        const pageName = (typeof wikiPageName !== 'undefined' && wikiPageName) ||
                         $('[name="wiki-page-name"]').val() ||
                         '';

        console.log('Initializing TipTap editor for page:', pageName);

        tiptapEditor = new WikiTipTapEditor({
          container: tiptapEditorContainer,
          wikiPageName: pageName,
          initialContent: '',
        });

        tiptapToolbar = new TipTapToolbar(tiptapEditor.editor, tiptapToolbarContainer);
        editorInitialized = true;

        // Initialize document selector dialog
        initializeDocumentSelector();

        // Don't check for autosave here - it will be done in setEditor()
        // when the user actually enters edit mode
      } catch (error) {
        console.error('Failed to initialize TipTap editor:', error);
      }
    }
  } else {
    // Show Ace editor and hide TipTap
    if (aceEditorContainer) aceEditorContainer.style.display = "block";
    if (tiptapEditorParentContainer) tiptapEditorParentContainer.style.display = "none";

    const initialMode = currentEditorType === "YAML" ? "ace/mode/yaml" : "ace/mode/markdown";
    const initialPlaceholder = currentEditorType === "YAML" ? "Write your YAML content here..." : "Write your content here...";

    if (!aceEditor && editorContainer) {
      aceEditor = Ace.edit(editorContainer, {
        mode: initialMode,
        placeholder: initialPlaceholder,
        theme: "ace/theme/tomorrow_night",
      });
      editorInitialized = true;
    }

    // Hide markdown toolbar and update label if in YAML mode
    if (currentEditorType === "YAML") {
      $("#markdown-toolbar").hide();
      $(".editor-container").prev("label").text("YAML Content");
    } else {
      $("#markdown-toolbar").show();
      $(".editor-container").prev("label").text("Content");
    }
  }
}

// Initialize on page load - wrap in jQuery ready to ensure DOM is loaded
$(document).ready(() => {
  initializeEditor();
});

editWikiBtn.on("click", () => {
  setEditor();
});

$(document).ready(() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("editWiki") || urlParams.get("wikiPagePatch")) {
    setEditor();
  }
});

previewContainer.hide();
previewToggleBtn.on("click", function () {
  showPreview = !showPreview;
  previewToggleBtn.text(showPreview ? "Edit" : "Preview");
  if (showPreview) {
    previewContainer.show();
    $(".wiki-editor-container").hide();

    if (currentEditorType === "YAML") {
      // For YAML, show formatted preview
      const content = aceEditor.getValue();
      const validation = validateYAML(content);

      if (validation.valid) {
        try {
          const parsed = yaml.load(content);
          const formatted = `<h1>${wikiTitleInput.val()}</h1><pre><code class="language-yaml">${aceEditor.getValue()}</code></pre>`;
          previewContainer.html(formatted);
        } catch (e) {
          previewContainer.html(`<h1>${wikiTitleInput.val()}</h1><div class="alert alert-danger">Invalid YAML: ${e.message}</div>`);
        }
      } else {
        previewContainer.html(`<h1>${wikiTitleInput.val()}</h1><div class="alert alert-danger">Invalid YAML: ${validation.error}</div>`);
      }
    } else if (currentEditorType === "Rich Text") {
      // For Rich Text, show HTML preview
      const content = tiptapEditor.getHTML();
      previewContainer.html(`<h1>${wikiTitleInput.val()}</h1>` + content);
    } else {
      // For markdown, use existing conversion
      frappe.call({
        method: "wiki.wiki.doctype.wiki_page.wiki_page.convert_markdown",
        args: {
          markdown: aceEditor.getValue(),
        },
        callback: (r) => {
          previewContainer.html(`<h1>${wikiTitleInput.val()}</h1>` + r.message);
        },
      });
    }
  } else {
    previewContainer.hide();
    $(".wiki-editor-container").show();
  }
});

/**
 * Initializes the wiki editor with appropriate settings based on editor type (Text/YAML/Rich Text)
 * Configures Ace editor mode, validation, and UI elements
 */
function setEditor() {
  const urlParams = new URLSearchParams(window.location.search);
  const currentUrl = new URL(window.location.href);

  // Re-detect editor type from data attribute (in case it changed)
  const detectedEditorType = document.querySelector('[data-wiki-editor-type]')?.dataset?.wikiEditorType || "Text";
  currentEditorType = detectedEditorType;

  // Re-initialize editor if type changed
  initializeEditor();

  if (currentEditorType === "Rich Text") {
    // Function to load content from server
    const loadContentFromServer = () => {
      frappe.call({
        method: "wiki.wiki.doctype.wiki_page.wiki_page.get_markdown_content",
        args: {
          wikiPageName,
          wikiPagePatch: urlParams.get("wikiPagePatch") || "",
        },
        callback: (r) => {
          // Convert markdown to HTML for TipTap
          frappe.call({
            method: "wiki.wiki.doctype.wiki_page.wiki_page.convert_markdown",
            args: {
              markdown: r.message.content || "",
            },
            callback: (htmlResult) => {
              tiptapEditor.setContent(htmlResult.message, 'html');
              currentUrl.searchParams.set("editWiki", 1);
              window.history.replaceState({}, "", currentUrl);
            },
          });
        },
      });
    };

    // Check for autosave first when entering edit mode
    if (tiptapEditor && tiptapEditor.hasAutosave()) {
      // Show autosave restore prompt, and only load from server if user declines
      tiptapEditor.checkForAutosave(loadContentFromServer);
    } else {
      // No autosave, load from server
      loadContentFromServer();
    }
  } else {
    // Set the appropriate mode based on editor type for Ace
    const editorMode = currentEditorType === "YAML" ? "ace/mode/yaml" : "ace/mode/markdown";
    aceEditor.session.setMode(editorMode);

    aceEditor.setOptions({
      wrap: true,
      showPrintMargin: true,
      theme: "ace/theme/tomorrow_night",
      tabSize: 2,
      useSoftTabs: true,
    });
    aceEditor.renderer.lineHeight = 20;

    // Update placeholder based on editor type
    const placeholder = currentEditorType === "YAML" ? "Write your YAML content here..." : "Write your content here...";
    aceEditor.setOption("placeholder", placeholder);

    // Hide/show markdown toolbar and update label based on editor type
    if (currentEditorType === "YAML") {
      $("#markdown-toolbar").hide();
      $(".editor-container").prev("label").text("YAML Content");
    } else {
      $("#markdown-toolbar").show();
      $(".editor-container").prev("label").text("Content");
    }

    // Add real-time YAML validation if in YAML mode
    if (currentEditorType === "YAML") {
      aceEditor.session.on("change", function() {
        const content = aceEditor.getValue();
        const validation = validateYAML(content);

        // Clear previous annotations
        aceEditor.session.clearAnnotations();

        if (!validation.valid && validation.line !== undefined) {
          // Add error annotation
          aceEditor.session.setAnnotations([{
            row: validation.line,
            column: validation.column || 0,
            text: validation.error,
            type: "error"
          }]);
        }
      });
    }

    frappe.call({
      method: "wiki.wiki.doctype.wiki_page.wiki_page.get_markdown_content",
      args: {
        wikiPageName,
        wikiPagePatch: urlParams.get("wikiPagePatch") || "",
      },
      callback: (r) => {
        aceEditor.setValue(r.message.content || "", 1);
        currentUrl.searchParams.set("editWiki", 1);
        window.history.replaceState({}, "", currentUrl);
      },
    });
  }
  
  wikiTitleInput.val($(".wiki-title").text()?.trim() || "");
}

/**
 * Validates YAML content and returns validation result
 * @param {string} content - The YAML content to validate
 * @returns {Object} Validation result with valid flag, error message, line and column if invalid
 */
function validateYAML(content) {
  try {
    yaml.load(content);
    return { valid: true };
  } catch (e) {
    return {
      valid: false,
      error: e.message,
      line: e.mark?.line,
      column: e.mark?.column
    };
  }
}

/**
 * Saves the wiki page with validation
 * For YAML pages, validates syntax before saving
 * For Rich Text pages, converts HTML to markdown
 * @param {boolean} draft - Whether to save as draft
 */
function saveWikiPage(draft = false) {
  const title = wikiTitleInput.val()?.trim();
  let content;

  // Mark that we're saving (to prevent autosave on beforeunload)
  if (currentEditorType === "Rich Text" && tiptapEditor) {
    tiptapEditor.setSaving(true);
  }

  if (currentEditorType === "Rich Text") {
    // Get markdown from TipTap editor
    content = tiptapEditor.getMarkdown();
  } else {
    content = aceEditor.getValue();
    
    // Validate YAML if editor type is YAML
    if (currentEditorType === "YAML") {
      const validation = validateYAML(content);
      if (!validation.valid) {
        // Format a more user-friendly error message
        let errorMsg = `<p><strong>Your YAML has a syntax error and cannot be saved.</strong></p>`;

        if (validation.line !== undefined) {
          errorMsg += `<p><strong>Location:</strong> Line ${validation.line + 1}, Column ${validation.column + 1}</p>`;
        }

        // Clean up the error message to be more readable
        let cleanError = validation.error;
        cleanError = cleanError.replace(/can not read a block mapping entry;/gi, 'Invalid indentation or structure:');
        cleanError = cleanError.replace(/a multiline key may not be an implicit key/gi, 'Multi-line keys must use explicit syntax');
        cleanError = cleanError.replace(/\(\d+:\d+\)/g, '');

        errorMsg += `<p><strong>Error:</strong> ${cleanError}</p>`;
        errorMsg += `<p><em>Tip: Check your indentation and make sure colons are followed by spaces.</em></p>`;

        frappe.msgprint({
          title: __("YAML Validation Error"),
          message: errorMsg,
          indicator: "red",
        });
        return; // Prevent saving
      }
    }
  }

  const urlParams = new URLSearchParams(window.location.search);
  const isEmptyEditor = !!urlParams.get("newWiki");
  frappe.call({
    method: "wiki.wiki.doctype.wiki_page.wiki_page.update",
    args: {
      name: $('[name="wiki-page-name"]').val(),
      message: `${isEmptyEditor ? "Created" : "Edited"} ${title}`,
      content,
      new: isEmptyEditor,
      new_sidebar_items: isEmptyEditor ? getSidebarItems() : "",
      title,
      draft,
      new_sidebar_group: isEmptyEditor ? urlParams.get("newWiki") : "",
      wiki_page_patch: urlParams.get("wikiPagePatch"),
    },
    callback: (r) => {
      // Clear autosave before redirecting (for Rich Text editor)
      if (currentEditorType === "Rich Text" && tiptapEditor) {
        tiptapEditor.clearAutosave();
      }

      // route back to the main page
      window.location.href = "/" + r.message.route;
    },
    freeze: true,
  });
}

saveWikiPageBtn.addEventListener("click", () => {
  saveWikiPage();
});

draftWikiPageBtn.addEventListener("click", () => {
  saveWikiPage((draft = true));
});

$(".sidebar-items > .list-unstyled").on("click", ".add-sidebar-page", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const isEmptyEditor = !!urlParams.get("newWiki");
  if ($(".editor-space").is(":visible") || isEmptyEditor) {
    $(".discard-edit-btn").attr("data-new", true);
  }
  wikiTitleInput.val("");

  if (currentEditorType === "Rich Text") {
    tiptapEditor.setContent('', 'html');
  } else {
    aceEditor.setValue("");
  }

  $(".admin-banner").addClass("hide");

  // workaround to fix the param not getting set
  setTimeout(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("newWiki", "1");
    window[`history`]["pushState"]({}, "", url);
  }, 1);
});

// Drag and drop / paste functionality for Ace editor only
if (editorContainer) {
  editorContainer.addEventListener(
    "dragover",
    function (e) {
      e.preventDefault();
      e.stopPropagation();
    },
    500,
  );

  editorContainer.addEventListener("drop", function (e) {
    e.preventDefault();
    e.stopPropagation();
    let dataTransfer = e.dataTransfer;
    if (!dataTransfer?.files?.length) {
      return;
    }
    validateAndUploadFiles(dataTransfer.files, "drop");
  });

  editorContainer.addEventListener("paste", function (e) {
    const clipboardData = e.clipboardData;
    if (!clipboardData?.files?.length) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    validateAndUploadFiles(clipboardData.files, "paste");
  });
}

function validateAndUploadFiles(files, event) {
  const allowedTypes = ["image/", "video/mp4", "video/quicktime"];
  const invalidFiles = Array.from(files).filter(
    (file) => !allowedTypes.some((type) => file.type.includes(type)),
  );

  if (invalidFiles.length > 0) {
    const action = event === "paste" ? "paste" : "insert";
    frappe.show_alert({
      message: __(
        `You can only ${action} images, videos and GIFs in Markdown fields. Invalid file(s): ` +
          invalidFiles.map((f) => f.name).join(", "),
      ),
      indicator: "orange",
    });
    return;
  }

  uploadMedia(
    ["image/*", "video/mp4", "video/quicktime"],
    "Insert Media in Markdown",
    files,
  );
}

function insertMarkdown(type) {
  if (!aceEditor) return;

  const selection = aceEditor.getSelectedText();
  let insertion = "";

  switch (type) {
    case "bold":
      insertion = `**${selection || "bold text"}**`;
      break;
    case "italic":
      insertion = `*${selection || "italic text"}*`;
      break;
    case "heading":
      insertion = `\n# ${selection || "Heading"}`;
      break;
    case "quote":
      insertion = `\n> ${selection || "Quote"}`;
      break;
    case "olist":
      insertion = `\n1. ${selection || "List item"}`;
      break;
    case "ulist":
      insertion = `\n* ${selection || "List item"}`;
      break;
    case "link":
      insertion = `[${selection || "link text"}](url)`;
      break;
    case "image":
      uploadMedia(["image/*"], "Insert Image in Markdown");
      break;
    case "video":
      uploadMedia(["video/mp4", "video/quicktime"], "Insert Video in Markdown");
      break;
    case "table":
      insertion = `${selection}\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Row 1 | Row 1 |\n| Row 2 | Row 2 |`;
      break;
    case "disclosure":
      insertion = `\n<details>\n<summary>${
        selection || "Title"
      }</summary>\nContent\n</details>`;
      break;
  }

  aceEditor.insert(insertion);
  aceEditor.focus();
}

function uploadMedia(fileTypes, dialogTitle, files = null) {
  new frappe.ui.FileUploader({
    dialog_title: __(dialogTitle),
    doctype: this.doctype,
    docname: this.docname,
    frm: this.frm,
    files,
    folder: "Home/Attachments",
    disable_file_browser: !files,
    allow_toggle_private: false,
    allow_multiple: true,
    make_attachments_public: true,
    restrictions: {
      allowed_file_types: fileTypes,
    },
    on_success: (file_doc) => {
      if (this.frm && !this.frm.is_new()) {
        this.frm.attachments.attachment_uploaded(file_doc);
      }
      const fileType = file_doc.file_url.split(".").pop().toLowerCase();
      let content;
      let file_url = encodeURI(file_doc.file_url);

      if (currentEditorType === "Rich Text") {
        // Insert into TipTap editor
        if (["mp4", "mov"].includes(fileType)) {
          tiptapEditor.insertVideo(file_url);
        } else {
          tiptapEditor.insertImage(file_url);
        }
      } else {
        // Insert into Ace editor
        if (["mp4", "mov"].includes(fileType)) {
          content = `\n<video controls width="100%" height="auto"><source src="${file_url}" type="video/${fileType}"></video>`;
        } else {
          const fileName =
            file_doc.file_name || file_doc.file_url.split("/").pop();
          const altText = fileName
            .split(".")
            .slice(0, -1)
            .join(".") // without extension
            .replaceAll("_", " ")
            .replaceAll("-", " ");
          content = `\n![${altText}](${file_url})`;
        }
        aceEditor.session.insert(aceEditor.getCursorPosition(), content);
      }
    },
  });
}

// Markdown toolbar buttons (only for Ace editor)
const mdeBoldBtn = document.querySelector('[data-mde-button="bold"]');
const mdeItalicBtn = document.querySelector('[data-mde-button="italic"]');
const mdeHeadingBtn = document.querySelector('[data-mde-button="heading"]');
const mdeQuoteBtn = document.querySelector('[data-mde-button="quote"]');
const mdeOlistBtn = document.querySelector('[data-mde-button="olist"]');
const mdeUlistBtn = document.querySelector('[data-mde-button="ulist"]');
const mdeLinkBtn = document.querySelector('[data-mde-button="link"]');
const mdeImageBtn = document.querySelector('[data-mde-button="image"]');
const mdeVideoBtn = document.querySelector('[data-mde-button="video"]');
const mdeTableBtn = document.querySelector('[data-mde-button="table"]');
const mdeDisclosureBtn = document.querySelector(
  '[data-mde-button="disclosure"]',
);

if (mdeBoldBtn) mdeBoldBtn.addEventListener("click", () => insertMarkdown("bold"));
if (mdeItalicBtn) mdeItalicBtn.addEventListener("click", () => insertMarkdown("italic"));
if (mdeHeadingBtn) mdeHeadingBtn.addEventListener("click", () => insertMarkdown("heading"));
if (mdeQuoteBtn) mdeQuoteBtn.addEventListener("click", () => insertMarkdown("quote"));
if (mdeOlistBtn) mdeOlistBtn.addEventListener("click", () => insertMarkdown("olist"));
if (mdeUlistBtn) mdeUlistBtn.addEventListener("click", () => insertMarkdown("ulist"));
if (mdeLinkBtn) mdeLinkBtn.addEventListener("click", () => insertMarkdown("link"));
if (mdeImageBtn) mdeImageBtn.addEventListener("click", () => insertMarkdown("image"));
if (mdeVideoBtn) mdeVideoBtn.addEventListener("click", () => insertMarkdown("video"));
if (mdeTableBtn) mdeTableBtn.addEventListener("click", () => insertMarkdown("table"));
if (mdeDisclosureBtn) mdeDisclosureBtn.addEventListener("click", () => insertMarkdown("disclosure"));

// Keyboard shortcuts for Ace editor
if (aceEditor) {
  aceEditor.commands.addCommand({
    name: "bold",
    bindKey: { win: "Ctrl-B", mac: "Command-B" },
    exec: () => insertMarkdown("bold"),
    readOnly: false,
  });

  aceEditor.commands.addCommand({
    name: "italic",
    bindKey: { win: "Ctrl-I", mac: "Command-I" },
    exec: () => insertMarkdown("italic"),
    readOnly: false,
  });

  aceEditor.commands.addCommand({
    name: "heading",
    bindKey: { win: "Ctrl-H", mac: "Command-H" },
    exec: () => insertMarkdown("heading"),
    readOnly: false,
  });

  aceEditor.commands.addCommand({
    name: "quote",
    bindKey: { win: "Ctrl-Shift-.", mac: "Command-Shift-." },
    exec: () => insertMarkdown("quote"),
    readOnly: false,
  });

  aceEditor.commands.addCommand({
    name: "orderedList",
    bindKey: { win: "Ctrl-Shift-7", mac: "Command-Shift-7" },
    exec: () => insertMarkdown("olist"),
    readOnly: false,
  });

  aceEditor.commands.addCommand({
    name: "unorderedList",
    bindKey: { win: "Ctrl-Shift-8", mac: "Command-Shift-8" },
    exec: () => insertMarkdown("ulist"),
    readOnly: false,
  });

  aceEditor.commands.addCommand({
    name: "link",
    bindKey: { win: "Ctrl-K", mac: "Command-K" },
    exec: () => insertMarkdown("link"),
    readOnly: false,
  });

  aceEditor.commands.addCommand({
    name: "image",
    bindKey: { win: "Ctrl-P", mac: "Command-P" },
    exec: () => insertMarkdown("image"),
    readOnly: false,
  });
}

/**
 * Initialize document selector dialog for document references
 */
function initializeDocumentSelector() {
  // Get wiki space from page data
  const wikiSpace = document.querySelector('[data-wiki-space]')?.dataset?.wikiSpace;

  if (!wikiSpace) {
    console.warn('Wiki space not found, document references may not work');
    return;
  }

  // Create global function to show document selector dialog
  window.showDocumentSelectorDialog = function() {
    // Dynamically import the DocumentSelectorDialog class
    import('./document-selector-dialog.js').then(module => {
      const DocumentSelectorDialog = module.default || window.DocumentSelectorDialog;
      const dialog = new DocumentSelectorDialog(wikiSpace, tiptapEditor);
      dialog.show();
    }).catch(error => {
      console.error('Failed to load document selector dialog:', error);
      frappe.msgprint({
        title: __('Error'),
        message: __('Failed to load document selector. Please refresh the page.'),
        indicator: 'red',
      });
    });
  };
}


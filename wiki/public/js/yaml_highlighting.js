// YAML Syntax Highlighting for Wiki
// This module loads and registers the YAML language for highlight.js

import yaml from "highlight.js/lib/languages/yaml";

/**
 * Highlights all YAML code blocks on the page using highlight.js
 * Skips blocks that have already been highlighted to avoid duplicate processing
 */
function highlightYAMLBlocks() {
	const yamlBlocks = $('code.language-yaml');
	if (yamlBlocks.length === 0) {
		return;
	}

	yamlBlocks.each(function() {
		const block = $(this);

		// Skip if already highlighted
		if (block.hasClass('hljs')) {
			return;
		}

		const content = block.text();

		try {
			// Use hljs.highlight to manually parse and highlight
			const result = window.hljs.highlight(content, { language: 'yaml' });

			// Replace content with highlighted HTML
			block.html(result.value);
			block.addClass('hljs');
		} catch (e) {
			console.error("Error highlighting YAML:", e);
		}
	});
}

/**
 * Register YAML language with highlight.js and set up automatic highlighting
 * This IIFE handles the registration and sets up both initial highlighting and
 * dynamic highlighting for content loaded via AJAX/navigation
 */
(function() {
	/**
	 * Attempts to register the YAML language with highlight.js
	 * @returns {boolean} True if registration succeeded, false if hljs not available yet
	 */
	const registerYAML = function() {
		if (typeof window.hljs !== 'undefined') {
			window.hljs.registerLanguage("yaml", yaml);

			// Highlight on initial page load
			$(document).ready(function() {
				highlightYAMLBlocks();
			});

			// Set up MutationObserver to handle dynamic content
			// This ensures YAML blocks are highlighted when navigating between pages
			const observer = new MutationObserver(function(mutations) {
				mutations.forEach(function(mutation) {
					if (mutation.addedNodes.length > 0) {
						// Check if any added nodes contain YAML code blocks
						mutation.addedNodes.forEach(function(node) {
							if (node.nodeType === 1) { // Element node
								const $node = $(node);
								if ($node.find('code.language-yaml').length > 0 || $node.is('code.language-yaml')) {
									highlightYAMLBlocks();
								}
							}
						});
					}
				});
			});

			// Start observing the wiki-content container for changes
			$(document).ready(function() {
				const wikiContent = document.querySelector('.wiki-content');
				if (wikiContent) {
					observer.observe(wikiContent, {
						childList: true,
						subtree: true
					});
				}
			});

			return true;
		}
		return false;
	};

	// Try to register immediately
	if (!registerYAML()) {
		// If hljs not available yet, poll until it is (with timeout)
		const checkInterval = setInterval(function() {
			if (registerYAML()) {
				clearInterval(checkInterval);
			}
		}, 10);

		// Give up after 1 second to avoid infinite polling
		setTimeout(function() {
			clearInterval(checkInterval);
			if (frappe.boot.developer_mode) {
				console.warn("hljs not found after 1 second, cannot register YAML language");
			}
		}, 1000);
	}
})();


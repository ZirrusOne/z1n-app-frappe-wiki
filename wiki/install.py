# Copyright (c) 2020, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt


import frappe


def after_install():
	# Ensure all DocType controllers are loaded
	frappe.clear_cache()

	# Create Wiki Editor records first (required for Wiki Space default_editor field)
	create_wiki_editors()

	# create the wiki homepage
	page = frappe.new_doc("Wiki Page")
	page.title = "Home"
	page.route = "wiki/home"
	page.content = "Welcome to the homepage of your wiki!"
	page.published = True
	page.insert(ignore_permissions=True)

	# create the wiki space
	space = frappe.new_doc("Wiki Space")
	space.route = "wiki"
	space.insert(ignore_permissions=True)

	# create the wiki sidebar
	sidebar = frappe.new_doc("Wiki Group Item")
	sidebar.wiki_page = page.name
	sidebar.parent_label = "Wiki"
	sidebar.parent = space.name
	sidebar.parenttype = "Wiki Space"
	sidebar.parentfield = "wiki_sidebars"
	sidebar.insert(ignore_permissions=True)


def create_wiki_editors():
	"""Create default Wiki Editor records."""
	editors = [
		{"name": "Text", "editor_name": "Text"},
		{"name": "YAML", "editor_name": "YAML"},
		{"name": "Rich Text", "editor_name": "Rich Text"}
	]

	for editor_data in editors:
		if not frappe.db.exists("Wiki Editor", editor_data["name"]):
			editor = frappe.new_doc("Wiki Editor")
			editor.update(editor_data)
			editor.insert(ignore_permissions=True)

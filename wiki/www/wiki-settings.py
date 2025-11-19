# Copyright (c) 2025, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

import frappe
from frappe import _


def get_context(context):
	"""Get context for wiki settings page"""
	
	# Check if user has permission to access settings
	if not has_wiki_admin_permission():
		frappe.throw(_("You don't have permission to access Wiki Settings"), frappe.PermissionError)
	
	# Get Wiki Settings
	wiki_settings = frappe.get_single("Wiki Settings")
	
	# Get user roles
	user_roles = frappe.get_roles(frappe.session.user)

	# Check if user is Wiki Manager
	is_wiki_admin = "Wiki Manager" in user_roles or "System Manager" in user_roles
	
	context.update({
		"default_wiki_space": wiki_settings.default_wiki_space,
		"enable_table_of_contents": wiki_settings.enable_table_of_contents,
		"collapse_sidebar_groups": wiki_settings.collapse_sidebar_groups,
		"disable_guest_access": wiki_settings.disable_guest_access,
		"logo": wiki_settings.logo,
		"dark_mode_logo": wiki_settings.dark_mode_logo,
		"use_sqlite_for_search": wiki_settings.use_sqlite_for_search,
		"use_redisearch_for_search": wiki_settings.use_redisearch_for_search,
		"javascript": wiki_settings.javascript,
		"user_roles": user_roles,
		"is_wiki_admin": is_wiki_admin,
	})
	
	return context


def has_wiki_admin_permission():
	"""Check if user has permission to access wiki settings"""
	user_roles = frappe.get_roles(frappe.session.user)
	return any(role in user_roles for role in ["Wiki Manager", "System Manager", "Wiki Approver"])


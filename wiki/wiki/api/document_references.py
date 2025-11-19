# Copyright (c) 2025, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _


@frappe.whitelist()
def get_allowed_doctypes(wiki_space):
	"""Get list of DocTypes allowed for document references in this wiki space"""
	if not wiki_space:
		frappe.throw(_("Wiki Space is required"))
	
	# Get the Wiki Space document
	space_doc = frappe.get_doc("Wiki Space", wiki_space)
	
	# Get allowed doctypes from the child table
	allowed_doctypes = []
	for row in space_doc.get("allowed_doctypes", []):
		if row.enabled:
			allowed_doctypes.append({
				"doctype": row.doctype_name,
				"icon": row.icon or get_doctype_icon(row.doctype_name)
			})
	
	return allowed_doctypes


@frappe.whitelist()
def get_doctype_meta(doctype):
	"""Get DocType metadata including fields, layout, and permissions"""
	if not doctype:
		frappe.throw(_("DocType is required"))
	
	# Check if user has permission to read this doctype
	if not frappe.has_permission(doctype, "read"):
		frappe.throw(_("You don't have permission to access {0}").format(doctype), frappe.PermissionError)
	
	# Get DocType meta
	meta = frappe.get_meta(doctype)
	
	# Build field information
	fields = []
	for field in meta.fields:
		if field.fieldtype not in ["Section Break", "Column Break", "Tab Break", "HTML", "Button"]:
			fields.append({
				"fieldname": field.fieldname,
				"label": field.label,
				"fieldtype": field.fieldtype,
				"options": field.options,
				"reqd": field.reqd,
				"read_only": field.read_only,
				"hidden": field.hidden,
				"default": field.default,
				"description": field.description,
			})
	
	# Check if user has write permission
	has_write_permission = frappe.has_permission(doctype, "write")
	
	return {
		"doctype": doctype,
		"title_field": meta.title_field or "name",
		"fields": fields,
		"has_write_permission": has_write_permission,
		"icon": get_doctype_icon(doctype),
		"is_submittable": meta.is_submittable,
	}


@frappe.whitelist()
def search_documents(doctype, txt="", page_length=20):
	"""Search for documents of given DocType"""
	if not doctype:
		frappe.throw(_("DocType is required"))
	
	# Check if user has permission to read this doctype
	if not frappe.has_permission(doctype, "read"):
		frappe.throw(_("You don't have permission to access {0}").format(doctype), frappe.PermissionError)
	
	# Get meta to find title field
	meta = frappe.get_meta(doctype)
	title_field = meta.title_field or "name"
	
	# Build search query
	filters = []
	if txt:
		# Search in name and title field
		filters.append(["name", "like", f"%{txt}%"])
		if title_field != "name":
			filters.append(["or"])
			filters.append([title_field, "like", f"%{txt}%"])
	
	# Get documents
	documents = frappe.get_all(
		doctype,
		filters=filters if filters else None,
		fields=["name", title_field, "docstatus"] if meta.is_submittable else ["name", title_field],
		limit_page_length=page_length,
		order_by="modified desc"
	)
	
	# Format results
	results = []
	for doc in documents:
		result = {
			"name": doc.name,
			"title": doc.get(title_field) or doc.name,
		}
		if meta.is_submittable:
			result["docstatus"] = doc.docstatus
			result["status_label"] = get_status_label(doc.docstatus)
		results.append(result)
	
	return results


@frappe.whitelist()
def get_document(doctype, name):
	"""Get full document data with permission check"""
	if not doctype or not name:
		frappe.throw(_("DocType and Name are required"))
	
	# Check if user has permission to read this document
	if not frappe.has_permission(doctype, "read", name):
		frappe.throw(_("You don't have permission to access this document"), frappe.PermissionError)
	
	# Get the document
	doc = frappe.get_doc(doctype, name)
	
	# Get meta
	meta = frappe.get_meta(doctype)
	
	# Build field data
	field_data = {}
	for field in meta.fields:
		if field.fieldtype not in ["Section Break", "Column Break", "Tab Break", "HTML", "Button"]:
			field_data[field.fieldname] = doc.get(field.fieldname)
	
	# Check write permission
	has_write_permission = frappe.has_permission(doctype, "write", name)
	
	return {
		"doctype": doctype,
		"name": name,
		"title": doc.get(meta.title_field) if meta.title_field else name,
		"docstatus": doc.docstatus if meta.is_submittable else None,
		"status_label": get_status_label(doc.docstatus) if meta.is_submittable else None,
		"fields": field_data,
		"has_write_permission": has_write_permission,
		"modified": doc.modified,
		"modified_by": doc.modified_by,
	}


@frappe.whitelist()
def update_document(doctype, name, data):
	"""Update document with permission check"""
	if not doctype or not name:
		frappe.throw(_("DocType and Name are required"))
	
	# Check if user has permission to write this document
	if not frappe.has_permission(doctype, "write", name):
		frappe.throw(_("You don't have permission to update this document"), frappe.PermissionError)
	
	# Get the document
	doc = frappe.get_doc(doctype, name)
	
	# Update fields
	if isinstance(data, str):
		import json
		data = json.loads(data)
	
	for field, value in data.items():
		if hasattr(doc, field):
			doc.set(field, value)
	
	# Save the document
	doc.save()
	
	frappe.db.commit()
	
	return {
		"success": True,
		"message": _("Document updated successfully"),
		"name": name,
	}


def get_doctype_icon(doctype):
	"""Get icon for a DocType"""
	try:
		meta = frappe.get_meta(doctype)
		return meta.icon or "file"
	except Exception:
		return "file"


def get_status_label(docstatus):
	"""Get human-readable status label from docstatus"""
	status_map = {
		0: "Draft",
		1: "Submitted",
		2: "Cancelled"
	}
	return status_map.get(docstatus, "Unknown")


@frappe.whitelist()
def get_password_value(doctype, name, fieldname):
	"""Get password field value (requires permission check)"""
	if not doctype or not name or not fieldname:
		frappe.throw(_("DocType, Name, and Fieldname are required"))
	
	# Check if user has permission to read this document
	if not frappe.has_permission(doctype, "read", name):
		frappe.throw(_("You don't have permission to access this document"), frappe.PermissionError)
	
	# Get the document
	doc = frappe.get_doc(doctype, name)
	
	# Verify the field is a password field
	meta = frappe.get_meta(doctype)
	field = meta.get_field(fieldname)
	
	if not field or field.fieldtype != "Password":
		frappe.throw(_("Invalid password field"))
	
	# Get the password value
	password = doc.get_password(fieldname)
	
	return {
		"value": password
	}


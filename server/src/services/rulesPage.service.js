// RulesPage service: handles rules page retrieval and updates with versioning.
// Traces to FR-RUL-01, FR-AUD-01.
import RulesPage from '../models/RulesPage.model.js'
import AuditLog from '../models/AuditLog.model.js'
import { ApiError } from '../utils/api-error.js'
import { ROLES } from '../constants/roles.js'

// Get the current rules page (public - no auth required)
export async function getRulesPage() {
  const rulesPage = await RulesPage.findOne()
    .populate('editor', 'name email')
    .lean({ virtuals: true })

  if (!rulesPage) {
    // Return default empty rules page if none exists yet
    return {
      content: '',
      version: 0,
      editor: null,
      editedAt: null,
      createdAt: null,
      updatedAt: null,
    }
  }

  return rulesPage
}

// Update the rules page (TPO only) - auto-increments version and creates AuditLog entry
export async function updateRulesPage(content, editorId, user) {
  // Only TPO can edit rules page
  if (user.role !== ROLES.TPO) {
    throw new ApiError(403, 'Only TPO can edit the Rules & Regulations page', 'FORBIDDEN')
  }

  const trimmedContent = content?.trim() ?? ''
  if (!trimmedContent) {
    throw new ApiError(400, 'Content is required', 'VALIDATION_ERROR')
  }

  // Find existing rules page or create new one
  let rulesPage = await RulesPage.findOne()

  const previousVersion = rulesPage ? rulesPage.version : 0
  const previousContent = rulesPage ? rulesPage.content : ''

  if (rulesPage) {
    // Update existing rules page with incremented version
    rulesPage.content = trimmedContent
    rulesPage.version = previousVersion + 1
    rulesPage.editor = editorId
    rulesPage.editedAt = new Date()
    await rulesPage.save()
  } else {
    // Create first version
    rulesPage = await RulesPage.create({
      content: trimmedContent,
      version: 1,
      editor: editorId,
      editedAt: new Date(),
    })
  }

  // Create AuditLog entry for rules edit
  await AuditLog.create({
    actor: editorId,
    action: 'rules_edit',
    target: {
      entityType: 'RulesPage',
      entityId: rulesPage._id,
    },
    reason: `Updated Rules & Regulations page from version ${previousVersion} to ${rulesPage.version}`,
    metadata: {
      previousVersion,
      newVersion: rulesPage.version,
      previousContentLength: previousContent.length,
      newContentLength: trimmedContent.length,
    },
  })

  // Populate editor for response
  const populatedRulesPage = await RulesPage.findById(rulesPage._id)
    .populate('editor', 'name email')
    .lean({ virtuals: true })
  return populatedRulesPage
}

export default {
  getRulesPage,
  updateRulesPage,
}

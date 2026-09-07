// Cloudinary service: handles signed upload URL generation and file management.
// Files are uploaded directly from client to Cloudinary (never touch app server).
import { v2 as cloudinary } from 'cloudinary'
import { ApiError } from '../utils/api-error.js'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

// Check if Cloudinary is configured
export function isCloudinaryConfigured() {
  return (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
}

// Generate a signed upload URL and parameters for direct client-to-Cloudinary upload
export function generateSignedUploadParams(folder = 'pcms/resumes') {
  if (!isCloudinaryConfigured()) {
    throw new ApiError(503, 'File upload service not configured', 'UPLOAD_SERVICE_UNAVAILABLE')
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const paramsToSign = {
    timestamp,
    folder,
    resource_type: 'raw', // For PDFs and documents
    // Use a unique public_id prefix to avoid collisions
    public_id: `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
  }

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  )

  return {
    ...paramsToSign,
    signature,
    api_key: process.env.CLOUDINARY_API_KEY,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  }
}

// Delete a file from Cloudinary by public_id
export async function deleteFile(publicId, resourceType = 'raw') {
  if (!isCloudinaryConfigured()) {
    throw new ApiError(503, 'File upload service not configured', 'UPLOAD_SERVICE_UNAVAILABLE')
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
    return result
  } catch {
    throw new ApiError(500, 'Failed to delete file from Cloudinary', 'DELETE_FAILED')
  }
}

// Get file info from Cloudinary
export async function getFileInfo(publicId, resourceType = 'raw') {
  if (!isCloudinaryConfigured()) {
    throw new ApiError(503, 'File upload service not configured', 'UPLOAD_SERVICE_UNAVAILABLE')
  }

  try {
    const result = await cloudinary.api.resource(publicId, { resource_type: resourceType })
    return result
  } catch (err) {
    if (err.http_code === 404) {
      return null
    }
    throw new ApiError(500, 'Failed to get file info from Cloudinary', 'FILE_INFO_FAILED')
  }
}

export default cloudinary

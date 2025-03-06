import axios from "axios";
import { toast } from "react-toastify";

// File status options
// Create a new file: src/utils/peerConfig.js
export const getPeerConfig = () => {
  // Default to the same host as the current page
  const host = "localhost";

  // Important: use port 5000 for development (where your Express server runs)
  // In production, use the same port as the current page
  const port = 5000;

  return {
    host,
    port,
    path: "/peerjs",
    debug: true,
    // Don't set a specific ID here, we'll do that in the components
  };
};

// Utility function to format file size
export function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Utility function to get color based on status
export function getStatusColor(status) {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "PENDING":
      return "warning";
    case "TRANSFERRING":
      return "info";
    case "FAILED":
      return "danger";
    case "CANCELLED":
      return "secondary";
    default:
      return "primary";
  }
}

export const FILE_STATUS = {
  PENDING: "pending",
  DOWNLOADED: "downloaded",
  EXPIRED: "expired",
  CANCELED: "canceled",
};

/**
 * Update the status of a file transfer
 * @param {string} transferId - The ID of the file/transfer to update
 * @param {string} status - The new status (pending, downloaded, expired, canceled)
 * @returns {Promise<Object>} - The updated file object
 */
export const updateFileStatus = async (transferId, status) => {
  try {
    const response = await axios.put(`/api/files/${transferId}/status`, {
      status,
    });
    return response.data.file;
  } catch (err) {
    console.error("Error updating file status:", err);
    const errorMessage =
      err.response?.data?.msg || "Error updating file status";
    toast.error(errorMessage);
    throw err;
  }
};

// Utility function to determine file icon color based on file extension
export const getFileIconColor = (filename) => {
  // Check if filename exists and is a string
  if (!filename || typeof filename !== "string") {
    return "secondary"; // Default color for invalid or missing filenames
  }

  const extension = filename.split(".").pop().toLowerCase();

  switch (extension) {
    case "pdf":
      return "danger";
    case "doc":
    case "docx":
      return "primary";
    case "xls":
    case "xlsx":
      return "success";
    case "ppt":
    case "pptx":
      return "warning";
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
      return "info";
    default:
      return "secondary";
  }
};

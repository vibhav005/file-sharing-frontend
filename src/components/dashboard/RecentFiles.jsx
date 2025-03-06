// components/dashboard/RecentFiles.js
import React from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { formatFileSize, getStatusColor } from "../../utility";
import axios from "axios";

const RecentFiles = ({ files }) => {
  const FILE_STATUS = {
    PENDING: "pending",
    DOWNLOADED: "downloaded",
    EXPIRED: "expired",
    CANCELED: "canceled",
  };

  const handleDownload = async (fileId) => {
    try {
      const res = await axios.get(`/api/files/download/${fileId}`);
      window.open(res.data.downloadUrl, "_blank");

      // Automatically update status to downloaded
      if (
        files.find((file) => file._id === fileId)?.status ===
        FILE_STATUS.PENDING
      ) {
        await handleStatusChange(fileId, FILE_STATUS.DOWNLOADED);
      }
    } catch (err) {
      console.error("Error downloading file:", err);
      toast.error("Error generating download link");
    }
  };

  if (files.length === 0) {
    return (
      <div className='card mb-4'>
        <div className='card-body'>
          <h5 className='card-title'>Recent Files</h5>
          <p className='card-text text-muted'>
            No files yet. Start by uploading a file!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='card mb-4'>
      <div className='card-body'>
        <h5 className='card-title'>Recent Files</h5>
        <div className='table-responsive'>
          <table className='table table-striped'>
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Type</th>
                <th>Status</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file._id}>
                  <td>{file.fileName}</td>
                  <td>{formatFileSize(file.fileSize)}</td>
                  <td>{file.fileType}</td>
                  <td>
                    <span className={`badge bg-${getStatusColor(file.status)}`}>
                      {file.status}
                    </span>
                  </td>
                  <td>
                    {formatDistanceToNow(new Date(file.createdAt), {
                      addSuffix: true,
                    })}
                  </td>
                  <td>
                    <div className='btn-group'>
                      <button
                        className='btn btn-outline-primary btn-sm'
                        disabled={
                          file.status === FILE_STATUS.EXPIRED ||
                          file.status === FILE_STATUS.CANCELED
                        }
                        onClick={() => handleDownload(file._id)}
                      >
                        Download
                      </button>

                      {file.transferMethod === "P2P" && (
                        <Link
                          to={`/transfer/${file._id}`}
                          className='btn btn-sm btn-outline-info'
                        >
                          Details
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link to='/files' className='btn btn-link'>
          View all files
        </Link>
      </div>
    </div>
  );
};

export default RecentFiles;

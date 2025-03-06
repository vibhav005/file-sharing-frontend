import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { formatDistanceToNow } from "date-fns";
import {
  formatFileSize,
  getFileIconColor,
  getStatusColor,
} from "../../utility";

// File status constants
const FILE_STATUS = {
  PENDING: "pending",
  DOWNLOADED: "downloaded",
  EXPIRED: "expired",
  CANCELED: "canceled",
};

const FileList = ({ user }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, sent, received
  const [sortBy, setSortBy] = useState("date"); // date, name, size

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/api/files/list");
        setFiles(res.data);
      } catch (err) {
        console.error("Error fetching files:", err);
        toast.error("Could not load files");
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm("Are you sure you want to delete this file?")) {
      return;
    }

    try {
      await axios.delete(`/api/files/${fileId}`);
      setFiles(files.filter((file) => file._id !== fileId));
      toast.success("File deleted successfully");
    } catch (err) {
      console.error("Error deleting file:", err);
      toast.error(err.response?.data?.msg || "Error deleting file");
    }
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

  const handleStatusChange = async (fileId, newStatus) => {
    try {
      await axios.put(`/api/files/${fileId}/status`, { status: newStatus });

      // Update the files state with the new status
      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file._id === fileId ? { ...file, status: newStatus } : file
        )
      );

      toast.success(`File marked as ${newStatus}`);
    } catch (err) {
      console.error("Error updating file status:", err);
      toast.error(err.response?.data?.msg || "Error updating file status");
    }
  };

  // Filter files based on the selected filter
  const filteredFiles = files.filter((file) => {
    if (filter === "all") return true;
    if (filter === "sent") return file.uploadedBy === user.id;
    if (filter === "received") return file.recipient === user.email;
    return true;
  });

  // Sort files based on the selected sort option
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else if (sortBy === "size") {
      return b.size - a.size;
    }
    return 0;
  });

  console.log("sortedFiles::::", sortedFiles);

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  if (loading) {
    return (
      <div className='text-center my-5'>
        <div className='spinner-border' role='status'></div>
      </div>
    );
  }

  return (
    <div className='file-list'>
      <div className='d-flex justify-content-between align-items-center mb-4'>
        <h1>My Files</h1>
        <Link to='/files/upload' className='btn btn-primary'>
          <i className='fas fa-upload me-2'></i>Upload New File
        </Link>
      </div>

      <div className='card mb-4'>
        <div className='card-body'>
          <div className='row mb-3'>
            <div className='col-md-6'>
              <div className='form-group'>
                <label htmlFor='filter' className='form-label'>
                  Filter By
                </label>
                <select
                  id='filter'
                  className='form-select'
                  value={filter}
                  onChange={handleFilterChange}
                >
                  <option value='all'>All Files</option>
                  <option value='sent'>Files You Sent</option>
                  <option value='received'>Files Shared With You</option>
                </select>
              </div>
            </div>
            <div className='col-md-6'>
              <div className='form-group'>
                <label htmlFor='sortBy' className='form-label'>
                  Sort By
                </label>
                <select
                  id='sortBy'
                  className='form-select'
                  value={sortBy}
                  onChange={handleSortChange}
                >
                  <option value='date'>Date (Newest First)</option>
                  <option value='name'>Name (A-Z)</option>
                  <option value='size'>Size (Largest First)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {sortedFiles.length === 0 ? (
        <div className='alert alert-info'>
          {filter === "all"
            ? "You don't have any files yet."
            : filter === "sent"
            ? "You haven't sent any files yet."
            : "No files have been shared with you yet."}
        </div>
      ) : (
        <div className='list-group'>
          {sortedFiles.map((file) => (
            <div
              key={file._id}
              className='list-group-item list-group-item-action'
            >
              <div className='d-flex w-100 justify-content-between align-items-center'>
                <div>
                  <h5 className='mb-1'>
                    <i
                      className={`fas fa-file me-2 text-${getFileIconColor(
                        file.fileName
                      )}`}
                    ></i>
                    {file.fileName}
                    <span
                      className={`ms-2 badge bg-${getStatusColor(
                        file.status || FILE_STATUS.PENDING
                      )}`}
                    >
                      {file.status || FILE_STATUS.PENDING}
                    </span>
                  </h5>
                  <small>
                    Size: {formatFileSize(file.fileSize)} • Uploaded{" "}
                    {formatDistanceToNow(new Date(file.createdAt), {
                      addSuffix: true,
                    })}
                  </small>
                </div>
                <div className='btn-group'>
                  <button
                    className='btn btn-outline-primary btn-sm'
                    onClick={() => handleDownload(file._id)}
                    disabled={
                      file.status === FILE_STATUS.EXPIRED ||
                      file.status === FILE_STATUS.CANCELED
                    }
                  >
                    <i className='fas fa-download me-1'></i> Download
                  </button>

                  {file.uploadedBy === user.id && (
                    <>
                      <button
                        className='btn btn-outline-danger btn-sm'
                        onClick={() => handleDeleteFile(file._id)}
                      >
                        <i className='fas fa-trash me-1'></i> Delete
                      </button>

                      <div className='dropdown'>
                        <button
                          className='btn btn-outline-secondary btn-sm dropdown-toggle'
                          type='button'
                          id={`statusDropdown-${file._id}`}
                          data-bs-toggle='dropdown'
                          aria-expanded='false'
                        >
                          Status
                        </button>
                        <ul
                          className='dropdown-menu'
                          aria-labelledby={`statusDropdown-${file._id}`}
                        >
                          <li>
                            <button
                              className='dropdown-item'
                              onClick={() =>
                                handleStatusChange(
                                  file._id,
                                  FILE_STATUS.PENDING
                                )
                              }
                            >
                              Mark as Pending
                            </button>
                          </li>
                          <li>
                            <button
                              className='dropdown-item'
                              onClick={() =>
                                handleStatusChange(
                                  file._id,
                                  FILE_STATUS.DOWNLOADED
                                )
                              }
                            >
                              Mark as Downloaded
                            </button>
                          </li>
                          <li>
                            <button
                              className='dropdown-item'
                              onClick={() =>
                                handleStatusChange(
                                  file._id,
                                  FILE_STATUS.EXPIRED
                                )
                              }
                            >
                              Mark as Expired
                            </button>
                          </li>
                          <li>
                            <button
                              className='dropdown-item'
                              onClick={() =>
                                handleStatusChange(
                                  file._id,
                                  FILE_STATUS.CANCELED
                                )
                              }
                            >
                              Mark as Canceled
                            </button>
                          </li>
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileList;

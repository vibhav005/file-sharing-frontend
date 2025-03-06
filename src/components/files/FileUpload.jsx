// components/files/FileUpload.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { formatFileSize } from "../../utility";

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleRecipientChange = (e) => {
    setRecipient(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      return toast.error("Please select a file to upload");
    }

    if (!recipient) {
      return toast.error("Please enter recipient email");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("recipient", recipient);

    try {
      setLoading(true);

      // Upload with progress tracking
      const response = await axios.post("/api/files/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        },
      });

      toast.success("File uploaded successfully");
      navigate("/files");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(err.response?.data?.msg || "Error uploading file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='file-upload'>
      <h1>Upload File</h1>
      <div className='card'>
        <div className='card-body'>
          <form onSubmit={handleSubmit}>
            <div className='mb-3'>
              <label htmlFor='file' className='form-label'>
                Select File
              </label>
              <input
                type='file'
                className='form-control'
                id='file'
                onChange={handleFileChange}
                disabled={loading}
              />
              {file && (
                <div className='mt-2'>
                  <strong>Selected file:</strong> {file.name} (
                  {formatFileSize(file.size)})
                </div>
              )}
            </div>

            <div className='mb-3'>
              <label htmlFor='recipient' className='form-label'>
                Recipient Email
              </label>
              <input
                type='email'
                className='form-control'
                id='recipient'
                value={recipient}
                onChange={handleRecipientChange}
                disabled={loading}
                placeholder="Enter recipient's email"
                required
              />
            </div>

            {loading && (
              <div className='mb-3'>
                <label className='form-label'>Upload Progress</label>
                <div className='progress'>
                  <div
                    className='progress-bar progress-bar-striped progress-bar-animated'
                    role='progressbar'
                    style={{ width: `${progress}%` }}
                    aria-valuenow={progress}
                    aria-valuemin='0'
                    aria-valuemax='100'
                  >
                    {progress}%
                  </div>
                </div>
              </div>
            )}

            <div className='d-grid gap-2'>
              <button
                type='submit'
                className='btn btn-primary'
                disabled={loading || !file || !recipient}
              >
                {loading ? "Uploading..." : "Upload File"}
              </button>
              <button
                type='button'
                className='btn btn-outline-secondary'
                onClick={() => navigate("/dashboard")}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className='mt-4'>
        <div className='alert alert-info'>
          <h5>Cloud Upload vs P2P Transfer</h5>
          <p>
            <strong>Cloud Upload:</strong> Files are stored on our servers and
            can be downloaded by recipients later. Best for larger files or when
            the recipient isn't online right now.
          </p>
          <p className='mb-0'>
            <strong>P2P Transfer:</strong> Files are sent directly between
            browsers without storing on our servers. Faster and more private,
            but both parties must be online during the transfer.
          </p>
        </div>
      </div>
    </div>
  );
};
export default FileUpload;

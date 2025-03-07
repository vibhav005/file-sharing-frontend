import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const TransferInitiate = ({ user }) => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const onFileChange = (e) => {
    setFile(e.target.files[0]); // Store selected file
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!file || !recipientEmail) {
      return toast.error("Please select a file and enter recipient email");
    }

    try {
      setLoading(true);

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/transfers/initiate`,
        {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || "other",
          recipientEmail,
        }
      );

      toast.success("Transfer initiated successfully");

      // Navigate to the transfer details page
      navigate(`/transfer/${res.data.transferId}`);
    } catch (err) {
      console.error("Error initiating transfer:", err);
      toast.error(
        err.response?.data?.msg ||
          "Failed to initiate transfer. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='container'>
      <div className='row justify-content-center'>
        <div className='col-md-8'>
          <div className='card'>
            <div className='card-header bg-primary text-white'>
              <h4 className='mb-0'>Initiate P2P Transfer</h4>
            </div>
            <div className='card-body'>
              <form onSubmit={onSubmit}>
                <div className='mb-3'>
                  <label htmlFor='fileUpload' className='form-label'>
                    Upload File
                  </label>
                  <input
                    type='file'
                    className='form-control'
                    id='fileUpload'
                    onChange={onFileChange}
                    required
                  />
                </div>

                <div className='mb-3'>
                  <label htmlFor='recipientEmail' className='form-label'>
                    Recipient Email
                  </label>
                  <input
                    type='email'
                    className='form-control'
                    id='recipientEmail'
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    required
                  />
                  <small className='form-text text-muted'>
                    The recipient must be registered in the system to receive
                    files.
                  </small>
                </div>

                <div className='d-grid gap-2'>
                  <button
                    type='submit'
                    className='btn btn-primary'
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span
                          className='spinner-border spinner-border-sm me-2'
                          role='status'
                          aria-hidden='true'
                        ></span>
                        Initiating...
                      </>
                    ) : (
                      "Initiate Transfer"
                    )}
                  </button>
                  <button
                    type='button'
                    className='btn btn-secondary'
                    onClick={() => navigate("/dashboard")}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferInitiate;

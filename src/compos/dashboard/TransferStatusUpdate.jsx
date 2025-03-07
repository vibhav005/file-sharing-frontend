import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const TransferStatusUpdate = ({ transfer, onStatusUpdate }) => {
  const [status, setStatus] = useState(transfer?.status || "pending");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { transferId } = useParams();
  const navigate = useNavigate();

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "downloaded", label: "Downloaded" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const handleStatusChange = (e) => {
    setStatus(e.target.value);
  };

  const updateStatus = async (e) => {
    e.preventDefault();

    if (!transferId) {
      toast.error("Transfer ID is missing");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await axios.put(`/api/transfers/${transferId}/status`, {
        status,
      });

      setIsSubmitting(false);
      toast.success("Transfer status updated successfully");

      // Call the callback function to update parent component
      if (onStatusUpdate) {
        onStatusUpdate(res.data.file);
      }
    } catch (err) {
      setIsSubmitting(false);
      const errorMessage =
        err.response?.data?.msg || "Failed to update transfer status";
      toast.error(errorMessage);
      console.error("Error updating status:", err);
    }
  };

  return (
    <div className='card mb-4'>
      <div className='card-header'>
        <h5>Update Transfer Status</h5>
      </div>
      <div className='card-body'>
        <form onSubmit={updateStatus}>
          <div className='mb-3'>
            <label htmlFor='status' className='form-label'>
              Status
            </label>
            <select
              id='status'
              className='form-select'
              value={status}
              onChange={handleStatusChange}
              disabled={isSubmitting}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type='submit'
            className='btn btn-primary'
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update Status"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TransferStatusUpdate;

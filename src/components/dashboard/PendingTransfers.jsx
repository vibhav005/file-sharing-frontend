// components/dashboard/PendingTransfers.js
import React from "react";
import { Link } from "react-router-dom";
import { formatFileSize } from "../../utility";

const PendingTransfers = ({ transfers }) => {
  return (
    <div className='card mb-4'>
      <div className='card-body'>
        <h5 className='card-title'>Pending Transfers</h5>
        <div className='list-group'>
          {transfers.map((transfer) => (
            <Link
              key={transfer._id}
              to={`/transfer/${transfer._id}`}
              className='list-group-item list-group-item-action'
            >
              <div className='d-flex w-100 justify-content-between'>
                <h5 className='mb-1'>{transfer.fileName}</h5>
                <small>{formatFileSize(transfer.fileSize)}</small>
              </div>
              <p className='mb-1'>
                {transfer.uploadedBy?.email
                  ? `From: ${transfer.uploadedBy.email}`
                  : `To: ${transfer.recipient}`}
              </p>
              <small className='text-muted'>
                Started {new Date(transfer.createdAt).toLocaleString()}
              </small>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PendingTransfers;

// components/dashboard/FileStats.js
import React from "react";

const FileStats = ({ stats }) => {
  return (
    <div className='row mb-4'>
      <div className='col-md-4'>
        <div className='card bg-primary text-white'>
          <div className='card-body'>
            <h5 className='card-title'>Uploads</h5>
            <p className='card-text display-4'>{stats.uploads}</p>
          </div>
        </div>
      </div>
      <div className='col-md-4'>
        <div className='card bg-success text-white'>
          <div className='card-body'>
            <h5 className='card-title'>Downloads</h5>
            <p className='card-text display-4'>{stats.downloads}</p>
          </div>
        </div>
      </div>
      <div className='col-md-4'>
        <div className='card bg-warning text-dark'>
          <div className='card-body'>
            <h5 className='card-title'>Pending Transfers</h5>
            <p className='card-text display-4'>{stats.pendingTransfers}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileStats;

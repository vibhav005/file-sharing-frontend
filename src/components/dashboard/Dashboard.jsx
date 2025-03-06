// components/dashboard/Dashboard.js
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import FileStats from "./FileStats";
import RecentFiles from "./RecentFiles";
import PendingTransfers from "./PendingTransfers";

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({
    uploads: 0,
    downloads: 0,
    pendingTransfers: 0,
  });
  const [recentFiles, setRecentFiles] = useState([]);
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Get file list
        const filesRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/files/list`
        );
        setRecentFiles(filesRes.data.slice(0, 5)); // Get 5 most recent

        // Get pending transfers
        const transfersRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/transfers/pending`
        );
        setPendingTransfers(transfersRes.data);

        // Calculate stats
        setStats({
          uploads: filesRes.data.filter((file) => file.uploadedBy === user.id)
            .length,
          downloads: filesRes.data.filter((file) => file.recipient === user.id)
            .length,
          pendingTransfers: transfersRes.data.length,
        });
      } catch (err) {
        console.error(err);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return <div className='text-center mt-5'>Loading dashboard...</div>;
  }

  return (
    <div className='dashboard'>
      <h1 className='mb-4'>Dashboard</h1>

      {/* Quick actions */}
      <div className='card mb-4'>
        <div className='card-body'>
          <h5 className='card-title'>Quick Actions</h5>
          <div className='d-flex gap-2'>
            <Link to='/upload' className='btn btn-primary'>
              Upload File
            </Link>
            <Link to='/transfer/initiate' className='btn btn-success'>
              P2P Transfer
            </Link>
            <Link to='/files' className='btn btn-secondary'>
              View My Files
            </Link>
          </div>
        </div>
      </div>

      {/* Stats section */}
      <FileStats stats={stats} />

      {/* Recent files */}
      <RecentFiles files={recentFiles} />

      {/* Pending transfers */}
      {pendingTransfers.length > 0 && (
        <PendingTransfers transfers={pendingTransfers} />
      )}
    </div>
  );
};

export default Dashboard;

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRightIcon, FilePlusIcon, FileTextIcon } from "@radix-ui/react-icons";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import FileStats from "./FileStats";
import PendingTransfers from "./PendingTransfers";
import RecentFiles from "./RecentFiles";

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({
    uploads: 0,
    downloads: 0,
    pendingTransfers: 0,
  });
  const [recentFiles, setRecentFiles] = useState([]);
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const filesRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/files/list`);
        setRecentFiles(filesRes.data.slice(0, 5));

        const transfersRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/transfers/pending`);
        setPendingTransfers(transfersRes.data);

        setStats({
          uploads: filesRes.data.filter((file) => file.uploadedBy === user.id).length,
          downloads: filesRes.data.filter((file) => file.recipient === user.id).length,
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
    return (
      <div className="flex justify-center items-center h-screen">
        <Skeleton className="w-80 h-10" />
      </div>
    );
  }

  return (
    <div className="dashboard space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>

      {/* Quick Actions */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button asChild>
            <Link to="/upload">
              <FilePlusIcon className="mr-2 h-5 w-5" /> Upload File
            </Link>
          </Button>
          <Button asChild>
            <Link to="/p2p-transfer">
              <ArrowRightIcon className="mr-2 h-5 w-5" /> P2P Transfer
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/files">
              <FileTextIcon className="mr-2 h-5 w-5" /> View My Files
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* File Stats Section */}
      <FileStats stats={stats} />

      {/* Recent Files */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Files</CardTitle>
        </CardHeader>
        <CardContent>
          {recentFiles.length > 0 ? (
            <RecentFiles files={recentFiles} />
          ) : (
            <p className="text-muted-foreground">No recent files available.</p>
          )}
        </CardContent>
      </Card>

      {/* Pending Transfers */}
      {pendingTransfers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Transfers</CardTitle>
          </CardHeader>
          <CardContent>
            <PendingTransfers transfers={pendingTransfers} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;

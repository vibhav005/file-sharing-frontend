import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  formatFileSize,
  getFileIconColor
} from "../../utility";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileIcon, Loader2, MoreHorizontal, Trash2, Upload } from "lucide-react";

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

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case FILE_STATUS.DOWNLOADED:
        return "success";
      case FILE_STATUS.PENDING:
        return "warning";
      case FILE_STATUS.EXPIRED:
        return "destructive";
      case FILE_STATUS.CANCELED:
        return "secondary";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center my-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Files</h1>
        <Button asChild>
          <Link to="/files/upload">
            <Upload className="mr-2 h-4 w-4" /> Upload New File
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="filter" className="text-sm font-medium">
                Filter By
              </label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger id="filter">
                  <SelectValue placeholder="Select filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Files</SelectItem>
                  <SelectItem value="sent">Files You Sent</SelectItem>
                  <SelectItem value="received">Files Shared With You</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="sortBy" className="text-sm font-medium">
                Sort By
              </label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sortBy">
                  <SelectValue placeholder="Select sort option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date (Newest First)</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="size">Size (Largest First)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {sortedFiles.length === 0 ? (
        <Alert>
          <AlertDescription>
            {filter === "all"
              ? "You don't have any files yet."
              : filter === "sent"
                ? "You haven't sent any files yet."
                : "No files have been shared with you yet."}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-2">
          {sortedFiles.map((file) => (
            <Card key={file._id} className="hover:bg-accent/50 transition-colors duration-200">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <FileIcon className={`h-5 w-5 mr-2 text-${getFileIconColor(file.fileName)}`} />
                      <h3 className="font-medium">{file.fileName}</h3>
                      <Badge
                        variant={getStatusBadgeVariant(file.status || FILE_STATUS.PENDING)}
                        className="ml-2"
                      >
                        {file.status || FILE_STATUS.PENDING}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Size: {formatFileSize(file.fileSize)} • Uploaded{" "}
                      {formatDistanceToNow(new Date(file.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <div className="flex space-x-2 w-full md:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file._id)}
                      disabled={
                        file.status === FILE_STATUS.EXPIRED ||
                        file.status === FILE_STATUS.CANCELED
                      }
                    >
                      <Download className="mr-1 h-4 w-4" /> Download
                    </Button>

                    {file.uploadedBy === user.id && (
                      <>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteFile(file._id)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" /> Delete
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              Status <MoreHorizontal className="ml-1 h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(file._id, FILE_STATUS.PENDING)}
                            >
                              Mark as Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(file._id, FILE_STATUS.DOWNLOADED)}
                            >
                              Mark as Downloaded
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(file._id, FILE_STATUS.EXPIRED)}
                            >
                              Mark as Expired
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(file._id, FILE_STATUS.CANCELED)}
                            >
                              Mark as Canceled
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileList;
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { Download, FileIcon, Info } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { formatFileSize } from "../../utility";

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

  // Get badge variant based on status
  const getBadgeVariant = (status) => {
    const colorMap = {
      pending: "warning",
      downloaded: "success",
      expired: "destructive",
      canceled: "secondary"
    };
    return colorMap[status] || "default";
  };

  if (files.length === 0) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileIcon className="mr-2 h-5 w-5" />
            Recent Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No files yet. Start by uploading a file!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileIcon className="mr-2 h-5 w-5" />
          Recent Files
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file._id}>
                  <TableCell className="font-medium">{file.fileName}</TableCell>
                  <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                  <TableCell>{file.fileType}</TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(file.status)}>
                      {file.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(file.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          file.status === FILE_STATUS.EXPIRED ||
                          file.status === FILE_STATUS.CANCELED
                        }
                        onClick={() => handleDownload(file._id)}
                      >
                        <Download className="mr-1 h-4 w-4" />
                        Download
                      </Button>

                      {file.transferMethod === "P2P" && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/transfer/${file._id}`}>
                            <Info className="mr-1 h-4 w-4" />
                            Details
                          </Link>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="link" asChild>
          <Link to="/files">View all files</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RecentFiles;
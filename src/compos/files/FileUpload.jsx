// components/files/FileUpload.js
import axios from "axios";
import { AlertCircle, Upload, X } from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { formatFileSize } from "../../utility";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Upload File</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="file">Select File</Label>
              <Input
                type="file"
                id="file"
                onChange={handleFileChange}
                disabled={loading}
                className="cursor-pointer"
              />
              {file && (
                <div className="text-sm mt-2 p-2 bg-muted rounded">
                  <div className="font-medium">Selected file:</div>
                  <div>{file.name} ({formatFileSize(file.size)})</div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Email</Label>
              <Input
                type="email"
                id="recipient"
                value={recipient}
                onChange={handleRecipientChange}
                disabled={loading}
                placeholder="Enter recipient's email"
                required
              />
            </div>

            {loading && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Upload Progress</Label>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <div className="flex flex-col space-y-2">
              <Button
                type="submit"
                disabled={loading || !file || !recipient}
                className="w-full"
              >
                {loading ? "Uploading..." : (
                  <>
                    <Upload className="mr-2 h-4 w-4" /> Upload File
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
                disabled={loading}
                className="w-full"
              >
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Alert variant="info" className="bg-blue-50 text-blue-800 border-blue-200">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Cloud Upload vs P2P Transfer</AlertTitle>
        <AlertDescription className="mt-2">
          <div className="space-y-2">
            <p>
              <span className="font-semibold">Cloud Upload:</span> Files are stored on our servers and
              can be downloaded by recipients later. Best for larger files or when
              the recipient isn't online right now.
            </p>
            <p>
              <span className="font-semibold">P2P Transfer:</span> Files are sent directly between
              browsers without storing on our servers. Faster and more private,
              but both parties must be online during the transfer.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default FileUpload;
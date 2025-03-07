import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import io from "socket.io-client";
import Receiver from "./Receiver";
import Sender from "./Sender";

// Import shadcn components
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const TransferDetails = ({ user }) => {
  const { transferId } = useParams();
  const navigate = useNavigate();
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSender, setIsSender] = useState(false);
  const [socketInstance, setSocketInstance] = useState(null);
  const [peerConnected, setPeerConnected] = useState(false);

  // Initialize Socket.IO
  useEffect(() => {
    const socket = io();
    setSocketInstance(socket);

    socket.on("connect", () => {
      console.log("Socket.IO connected");
    });

    // Join the transfer-specific room
    socket.emit("joinTransferRoom", { transferId, userId: user.id });

    return () => {
      socket.emit("leaveTransferRoom", { transferId, userId: user.id });
      socket.disconnect();
    };
  }, [transferId, user.id]);

  // Handle socket events for peer coordination
  useEffect(() => {
    if (socketInstance && transferId) {
      // Listen for peer ready events
      socketInstance.on("peerReady", (data) => {
        if (data.transferId === transferId) {
          // If the other peer is ready
          if (
            (isSender && data.role === "receiver") ||
            (!isSender && data.role === "sender")
          ) {
            toast.info(
              `${data.role === "sender" ? "Sender" : "Receiver"
              } is ready for connection`
            );
            setPeerConnected(true);
          }
        }
      });

      // Listen for transfer acceptance
      socketInstance.on("transferAccepted", (data) => {
        if (data.transferId === transferId) {
          setTransfer((prev) => ({ ...prev, status: "ACCEPTED" }));
          if (isSender) {
            toast.success("Recipient has accepted the transfer. Connecting...");
          }
        }
      });

      // Clean up on unmount
      return () => {
        socketInstance.off("peerReady");
        socketInstance.off("transferAccepted");
      };
    }
  }, [socketInstance, transferId, isSender]);

  // Fetch transfer details on component mount
  useEffect(() => {
    const fetchTransferDetails = async () => {
      try {
        const res = await axios.get(`/api/transfers/${transferId}`);
        setTransfer(res.data);
        setIsSender(res.data.uploadedBy._id === user.id);

        // Notify the server about role
        if (socketInstance) {
          socketInstance.emit("peerReady", {
            transferId,
            role: res.data.uploadedBy._id === user.id ? "sender" : "receiver",
            userId: user.id,
          });
        }
      } catch (err) {
        console.error("Error fetching transfer details:", err);
        toast.error("Failed to load transfer details");
      } finally {
        setLoading(false);
      }
    };

    if (transferId) {
      fetchTransferDetails();
    }
  }, [transferId, user.id, socketInstance]);

  // Accept the transfer (for receiver)
  const handleAcceptTransfer = async () => {
    try {
      await updateTransferStatus("ACCEPTED");

      if (socketInstance) {
        socketInstance.emit("transferAccepted", {
          transferId,
          acceptedBy: user.id,
        });
      }

      toast.success("Transfer accepted");
    } catch (err) {
      console.error("Error accepting transfer:", err);
      toast.error("Failed to accept transfer");
    }
  };

  // Cancel the transfer
  const handleCancelTransfer = async () => {
    try {
      await axios.delete(`/api/transfers/${transferId}`);

      // Notify other peer that transfer is cancelled
      if (socketInstance) {
        socketInstance.emit("transferCancelled", { transferId });
      }

      toast.info("Transfer cancelled");
      navigate("/dashboard");
    } catch (err) {
      console.error("Error cancelling transfer:", err);
      toast.error("Failed to cancel transfer");
    }
  };

  // Update transfer status on the server
  const updateTransferStatus = async (status) => {
    try {
      await axios.put(`/api/transfers/${transferId}/status`, { status });
      setTransfer({ ...transfer, status });

      // Notify other peer about status change
      if (socketInstance) {
        socketInstance.emit("transferStatusChanged", { transferId, status });
      }
    } catch (err) {
      console.error("Error updating transfer status:", err);
    }
  };

  // Update transfer progress on the server
  const updateTransferProgress = async (progressValue) => {
    try {
      await axios.put(`/api/transfers/${transferId}/progress`, {
        progress: progressValue,
      });

      // Notify other peer about progress
      if (socketInstance) {
        socketInstance.emit("transferProgressUpdated", {
          transferId,
          progress: progressValue,
        });
      }
    } catch (err) {
      console.error("Error updating transfer progress:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span className="text-lg">Loading transfer details...</span>
      </div>
    );
  }

  if (!transfer) {
    return (
      <Alert variant="destructive" className="max-w-md mx-auto mt-8">
        <AlertTitle>Not Found</AlertTitle>
        <AlertDescription>
          The requested transfer could not be found.
        </AlertDescription>
      </Alert>
    );
  }

  // Format file size for display (common utility function)
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + " MB";
    else return (bytes / 1073741824).toFixed(2) + " GB";
  };

  // Common props for both sender and receiver components
  const commonProps = {
    transfer,
    transferId,
    formatFileSize,
    updateTransferStatus,
    updateTransferProgress,
    onCancel: handleCancelTransfer,
    onNavigateBack: () => navigate("/dashboard"),
    socket: socketInstance,
    peerConnected,
  };

  // Acceptance UI for recipient when transfer is in PENDING state
  const renderAcceptanceUI = () => {
    if (!isSender && transfer.status === "PENDING") {
      return (
        <Alert className="mb-6">
          <AlertTitle className="text-lg font-semibold">File Transfer Request</AlertTitle>
          <AlertDescription>
            <div className="mt-2 mb-4">
              <p>
                {transfer.uploadedBy?.email} wants to send you a file:
                <br />
                <span className="font-medium">{transfer.fileName}</span> (
                {formatFileSize(transfer.fileSize)})
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={handleAcceptTransfer}
              >
                Accept Transfer
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelTransfer}
              >
                Decline
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">File Transfer</h2>
        <Badge
          variant={
            transfer.status === "PENDING"
              ? "outline"
              : transfer.status === "ACCEPTED"
                ? "secondary"
                : transfer.status === "COMPLETED"
                  ? "default"
                  : "destructive"
          }
          className="text-sm"
        >
          {transfer.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transfer Details</CardTitle>
          <CardDescription>
            {isSender ? "Sending to:" : "Receiving from:"}{" "}
            <span className="font-medium">
              {isSender ? transfer.recipient?.email : transfer.uploadedBy?.email}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">File Information</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">Name:</div>
                <div className="text-sm font-medium">{transfer.fileName}</div>

                <div className="text-sm text-muted-foreground">Size:</div>
                <div className="text-sm font-medium">{formatFileSize(transfer.fileSize)}</div>

                <div className="text-sm text-muted-foreground">Type:</div>
                <div className="text-sm font-medium">{transfer.fileType}</div>
              </div>
            </div>

            {/* Acceptance UI */}
            {renderAcceptanceUI()}

            {/* Transfer components */}
            <div className="pt-2">
              {isSender ? (
                <Sender {...commonProps} />
              ) : (
                transfer.status !== "PENDING" && <Receiver {...commonProps} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransferDetails;
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import io from "socket.io-client";
import Receiver from "./Receiver";
import Sender from "./Sender";

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
              `${
                data.role === "sender" ? "Sender" : "Receiver"
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
    return <div className='text-center mt-5'>Loading transfer details...</div>;
  }

  if (!transfer) {
    return <div className='text-center mt-5'>Transfer not found</div>;
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
        <div className='alert alert-info mb-3'>
          <h5>File Transfer Request</h5>
          <p>
            {transfer.uploadedBy?.email} wants to send you a file:
            <br />
            <strong>{transfer.fileName}</strong> (
            {formatFileSize(transfer.fileSize)})
          </p>
          <button
            className='btn btn-success me-2'
            onClick={handleAcceptTransfer}
          >
            Accept Transfer
          </button>

          <button className='btn btn-danger' onClick={handleCancelTransfer}>
            Decline
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className='transfer-details'>
      <h2 className='mb-4'>File Transfer</h2>

      <div className='card mb-4'>
        <div className='card-body'>
          <h5 className='card-title'>
            {isSender ? "Sending to:" : "Receiving from:"}
          </h5>
          <p className='card-text'>
            {isSender ? transfer.recipient?.email : transfer.uploadedBy?.email}
          </p>
          <h5 className='mt-3'>File Information</h5>
          <p className='card-text'>
            <strong>Name:</strong> {transfer.fileName}
            <br />
            <strong>Size:</strong> {formatFileSize(transfer.fileSize)}
            <br />
            <strong>Type:</strong> {transfer.fileType}
          </p>

          {/* Acceptance UI - Only visible to recipients for pending transfers */}
          {renderAcceptanceUI()}

          {/* Only render sender/receiver components when appropriate */}
          {isSender ? (
            <Sender {...commonProps} />
          ) : (
            transfer.status !== "PENDING" && <Receiver {...commonProps} />
          )}
        </div>
      </div>
    </div>
  );
};

export default TransferDetails;

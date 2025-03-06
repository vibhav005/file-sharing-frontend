import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import io from "socket.io-client";
import Receiver from "./Receiver";

const ReceiverPage = ({ user }) => {
  const { transferId } = useParams();
  const navigate = useNavigate();
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
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
    socket.emit("joinTransferRoom", {
      transferId,
      userId: user.id,
      role: "receiver",
    });

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
        if (data.transferId === transferId && data.role === "sender") {
          toast.info("Sender is ready for connection");
          setPeerConnected(true);
        }
      });

      // Clean up on unmount
      return () => {
        socketInstance.off("peerReady");
      };
    }
  }, [socketInstance, transferId]);

  // Fetch transfer details on component mount
  useEffect(() => {
    const fetchTransferDetails = async () => {
      try {
        const res = await axios.get(`/api/transfers/${transferId}`);

        // Verify this user is the receiver
        if (res.data.recipient._id !== user.id) {
          toast.error(
            "You are not authorized to access this transfer as receiver"
          );
          navigate("/dashboard");
          return;
        }

        setTransfer(res.data);

        // If already accepted, notify server about receiver role
        if (res.data.status === "ACCEPTED" && socketInstance) {
          socketInstance.emit("peerReady", {
            transferId,
            role: "receiver",
            userId: user.id,
          });
        }
      } catch (err) {
        console.error("Error fetching transfer details:", err);
        toast.error("Failed to load transfer details");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    if (transferId) {
      fetchTransferDetails();
    }
  }, [transferId, user.id, socketInstance, navigate]);

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

  // Format file size for display (common utility function)
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + " MB";
    else return (bytes / 1073741824).toFixed(2) + " GB";
  };

  if (loading) {
    return <div className='text-center mt-5'>Loading transfer details...</div>;
  }

  if (!transfer) {
    return <div className='text-center mt-5'>Transfer not found</div>;
  }

  return (
    <div className='receiver-page'>
      <h2 className='mb-4'>Receive File</h2>

      <div className='card mb-4'>
        <div className='card-body'>
          <h5 className='card-title'>Receiving from:</h5>
          <p className='card-text'>{transfer.uploadedBy?.email}</p>

          <h5 className='mt-3'>File Information</h5>
          <p className='card-text'>
            <strong>Name:</strong> {transfer.fileName}
            <br />
            <strong>Size:</strong> {formatFileSize(transfer.fileSize)}
            <br />
            <strong>Type:</strong> {transfer.fileType}
          </p>

          <Receiver
            transfer={transfer}
            transferId={transferId}
            formatFileSize={formatFileSize}
            updateTransferStatus={updateTransferStatus}
            updateTransferProgress={updateTransferProgress}
            onCancel={handleCancelTransfer}
            onNavigateBack={() => navigate("/dashboard")}
            socket={socketInstance}
            peerConnected={peerConnected}
          />
        </div>
      </div>
    </div>
  );
};

export default ReceiverPage;

import React, { useState, useEffect, useRef } from "react";
import Peer from "peerjs";
import { toast } from "react-toastify";

const Sender = ({
  transfer,
  transferId,
  formatFileSize,
  updateTransferStatus,
  updateTransferProgress,
  onCancel,
  onNavigateBack,
  socket, // Use the socket passed from parent component
  peerConnected, // Use the peerConnected state from parent
}) => {
  const [statusMessage, setStatusMessage] = useState("Preparing connection...");
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState(null);
  const [receiverId, setReceiverId] = useState(null);

  // PeerJS references
  const peerInstance = useRef(null);
  const connection = useRef(null);
  const fileReader = useRef(null);
  const isComponentMounted = useRef(true);

  useEffect(() => {
    isComponentMounted.current = true;

    // Listen for the receiver's readiness signal
    if (socket) {
      // Use the same event name as in TransferDetails
      socket.on("peerReady", (data) => {
        if (data.transferId === transferId && data.role === "receiver") {
          console.log(`Receiver is ready with ID: ${data.userId}`);
          setReceiverId(data.userId);

          // If transfer is accepted, try to connect
          if (peerInstance.current && transfer.status === "ACCEPTED") {
            connectToReceiver(data.userId);
          }
        }
      });
    }

    if (transfer.status === "PENDING") {
      setStatusMessage(
        "Waiting for recipient to accept the transfer request..."
      );
    } else if (transfer.status === "ACCEPTED") {
      setStatusMessage("Recipient accepted. Connecting...");
      initializePeerConnection();
    }

    return () => {
      isComponentMounted.current = false;
      if (peerInstance.current) peerInstance.current.destroy();
      if (fileReader.current) fileReader.current.abort();
    };
  }, [transfer.status, transferId, socket]);

  useEffect(() => {
    if (transfer.status === "ACCEPTED" && !peerInstance.current) {
      setStatusMessage("Recipient accepted. Initializing connection...");
      initializePeerConnection();
    }
  }, [transfer.status]);

  // Effect to handle receiverId changes
  useEffect(() => {
    if (receiverId && peerInstance.current && transfer.status === "ACCEPTED") {
      connectToReceiver(receiverId);
    }
  }, [receiverId, transfer.status]);

  const initializePeerConnection = () => {
    const senderId = `sender-${transferId}`;
    peerInstance.current = new Peer(senderId, {
      host: "localhost",
      port: 5000,
      path: "/peerjs",
      secure: false,
      debug: 2,
      config: {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      },
    });

    peerInstance.current.on("open", (id) => {
      console.log(`PeerJS: Connected with ID ${id}`);
      setStatusMessage("Waiting for receiver to connect...");

      // Notify that sender is ready through the socket
      if (socket) {
        socket.emit("peerReady", {
          transferId,
          role: "sender",
          userId: id,
        });
      }

      if (receiverId && transfer.status === "ACCEPTED") {
        connectToReceiver(receiverId);
      }
    });

    peerInstance.current.on("connection", (conn) => {
      console.log(`PeerJS: Incoming connection from ${conn.peer}`);
      setupConnectionHandlers(conn);
    });

    peerInstance.current.on("error", (error) => {
      console.error("PeerJS error:", error);
      setStatusMessage("Connection error: " + error.message);
      toast.error("Connection error: " + error.message);
    });
  };

  const connectToReceiver = (receiverId) => {
    if (!peerInstance.current || !receiverId || transfer.status !== "ACCEPTED")
      return;

    console.log(`Connecting to receiver: ${receiverId}`);
    const conn = peerInstance.current.connect(receiverId, { reliable: true });

    conn.on("open", () => {
      console.log(`Connected to receiver ${receiverId}`);
      setupConnectionHandlers(conn);
    });

    conn.on("error", (err) => {
      console.error("Connection error:", err);
      toast.error("Connection error: " + err.message);
    });
  };

  const setupConnectionHandlers = (conn) => {
    connection.current = conn;
    setStatusMessage("Connected. Select a file to send.");

    // Use the same event name as in TransferDetails
    if (socket) {
      socket.emit("transferStatusChanged", {
        transferId,
        status: "CONNECTED",
      });
    }

    conn.on("close", () => {
      setStatusMessage("Connection closed.");
      if (socket) {
        socket.emit("transferStatusChanged", {
          transferId,
          status: "DISCONNECTED",
        });
      }
    });

    conn.on("error", (err) => {
      console.error("Connection error:", err);
      toast.error("Connection error.");
    });

    conn.on("data", (data) => {
      if (data.type === "ack") {
        console.log("Received acknowledgement:", data);
      }
    });
  };

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (connection.current && connection.current.open) {
        sendFile(selectedFile);
      } else {
        toast.error("Not connected to recipient.");
      }
    }
  };

  const sendFile = (file) => {
    if (!connection.current || !connection.current.open) {
      toast.error("Connection is not open.");
      return;
    }

    connection.current.send({
      type: "metadata",
      name: file.name,
      size: file.size,
      fileType: file.type,
    });

    fileReader.current = new FileReader();
    let offset = 0;
    const totalSize = file.size;
    const chunkSize = 16384;

    fileReader.current.onload = (e) => {
      if (connection.current && connection.current.open) {
        connection.current.send(e.target.result);
        offset += e.target.result.byteLength;

        const newProgress = Math.floor((offset / totalSize) * 100);
        setProgress(newProgress);
        updateTransferProgress(newProgress);

        if (offset < totalSize) {
          readNextChunk(offset);
        } else {
          setStatusMessage("File sent successfully!");
          updateTransferStatus("COMPLETED");
        }
      }
    };

    fileReader.current.onerror = (error) => {
      console.error("FileReader error:", error);
      toast.error("Error reading file.");
      updateTransferStatus("FAILED");
    };

    const readNextChunk = (offset) => {
      const slice = file.slice(offset, offset + chunkSize);
      fileReader.current.readAsArrayBuffer(slice);
    };

    readNextChunk(0);
    setStatusMessage("Sending file...");
    updateTransferStatus("TRANSFERRING");
  };

  return (
    <div className='sender-transfer'>
      <h5 className='mt-3'>Transfer Status</h5>
      <p>{statusMessage}</p>

      {progress > 0 && (
        <div className='progress mb-3'>
          <div
            className='progress-bar'
            role='progressbar'
            style={{ width: `${progress}%` }}
            aria-valuenow={progress}
            aria-valuemin='0'
            aria-valuemax='100'
          >
            {progress}%
          </div>
        </div>
      )}

      {transfer.status === "ACCEPTED" && peerConnected && (
        <div className='mb-3'>
          <label className='form-label'>Select file to send</label>
          <input
            className='form-control'
            type='file'
            onChange={handleFileSelect}
          />
        </div>
      )}

      <div className='mt-3'>
        <button className='btn btn-secondary me-2' onClick={onNavigateBack}>
          Back to Dashboard
        </button>
        <button className='btn btn-danger' onClick={onCancel}>
          Cancel Transfer
        </button>
      </div>
    </div>
  );
};

export default Sender;

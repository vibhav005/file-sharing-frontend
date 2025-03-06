import React, { useState, useEffect, useRef } from "react";
import Peer from "peerjs";
import { toast } from "react-toastify";

const Receiver = ({
  transfer,
  transferId,
  formatFileSize,
  updateTransferStatus,
  updateTransferProgress,
  onCancel,
  onNavigateBack,
  socket,
  peerConnected,
}) => {
  const [statusMessage, setStatusMessage] = useState("Preparing connection...");
  const [progress, setProgress] = useState(0);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // PeerJS references
  const peerInstance = useRef(null);
  const connection = useRef(null);
  const receivedBuffers = useRef([]);
  const receivedSize = useRef(0);
  const totalSize = useRef(0);
  const sessionIdRef = useRef(generateSessionId());
  const retryTimeoutRef = useRef(null);
  const isComponentMounted = useRef(true);

  // Generate a random session ID to make the peer ID unique
  function generateSessionId() {
    return Math.random().toString(36).substring(2, 10);
  }

  // Listen for socket events for syncing status
  useEffect(() => {
    if (socket) {
      // Listen for status changes - use consistent event name from TransferDetails
      socket.on("transferStatusChanged", (data) => {
        if (data.transferId === transferId) {
          setStatusMessage(`Transfer status: ${data.status}`);
          if (data.status === "TRANSFERRING") {
            setStatusMessage("Sender is transferring the file...");
          } else if (data.status === "COMPLETED") {
            setStatusMessage("Transfer completed");
            setProgress(100);
          } else if (data.status === "CANCELLED") {
            setStatusMessage("Transfer was cancelled");
          }
        }
      });

      // Listen for progress updates
      socket.on("transferProgressUpdated", (data) => {
        if (data.transferId === transferId) {
          setProgress(data.progress);
        }
      });

      // Listen for transfer cancellation
      socket.on("transferCancelled", (data) => {
        if (data.transferId === transferId) {
          setStatusMessage("Transfer was cancelled by the sender");
        }
      });

      return () => {
        socket.off("transferStatusChanged");
        socket.off("transferProgressUpdated");
        socket.off("transferCancelled");
      };
    }
  }, [socket, transferId]);

  // Initialize peer connection only when transfer is ACCEPTED
  useEffect(() => {
    // Set the mounted flag
    isComponentMounted.current = true;

    // Only initialize peer connection if the transfer has been accepted
    if (transfer.status === "ACCEPTED") {
      // Announce this receiver is ready - use consistent event name "peerReady" from TransferDetails
      if (socket) {
        const receiverId = `receiver-${transferId}-${sessionIdRef.current}`;
        socket.emit("peerReady", {
          transferId,
          role: "receiver",
          userId: receiverId,
        });
      }

      setStatusMessage("Transfer accepted. Initializing connection...");
      initializePeerConnection();
    } else if (transfer.status === "TRANSFERRING") {
      setStatusMessage("Receiving file transfer...");
      initializePeerConnection();
    } else if (transfer.status === "COMPLETED") {
      setStatusMessage("Transfer completed");
      setProgress(100);
    } else if (transfer.status === "CANCELLED") {
      setStatusMessage("Transfer was cancelled");
    } else if (transfer.status === "FAILED") {
      setStatusMessage("Transfer failed");
    }

    // Clean up PeerJS connection on unmount
    return () => {
      isComponentMounted.current = false;

      // Clear any pending timeouts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      // Destroy peer instance
      if (peerInstance.current) {
        peerInstance.current.destroy();
        peerInstance.current = null;
      }
    };
  }, [transfer.status, socket, transferId]);

  // React when peer connection is established
  useEffect(() => {
    if (
      peerConnected &&
      peerInstance.current &&
      transfer.status === "ACCEPTED"
    ) {
      toast.info("Sender is ready. Establishing connection...");
      startConnectingToSender();
    }
  }, [peerConnected, transfer.status]);

  // Initialize PeerJS connection
  const initializePeerConnection = async () => {
    try {
      // Destroy existing instance if any
      if (peerInstance.current) {
        peerInstance.current.destroy();
        peerInstance.current = null;
      }

      // Create receiver-specific peer ID based on transfer ID plus a unique session ID
      const receiverId = `receiver-${transferId}-${sessionIdRef.current}`;

      console.log(`Initializing with unique ID: ${receiverId}`);
      setStatusMessage("Initializing connection...");

      // Initialize PeerJS with correct configuration
      peerInstance.current = new Peer(receiverId, {
        host: "localhost",
        port: 5000,
        path: "/peerjs",
        secure: false,
        debug: 2,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        },
      });

      peerInstance.current.on("open", (id) => {
        if (!isComponentMounted.current) return;

        console.log(`PeerJS: Connected with ID ${id}`);
        setStatusMessage("Connected to server. Waiting for sender...");

        // Reset connection attempts counter when we successfully connect to the server
        setConnectionAttempts(0);

        // Notify the server that this receiver is ready with this ID
        // Use consistent event name "peerReady" from TransferDetails
        if (socket) {
          socket.emit("peerReady", {
            transferId,
            role: "receiver",
            userId: id,
          });
        }

        // If we already know sender is ready, try to connect
        if (peerConnected && transfer.status === "ACCEPTED") {
          startConnectingToSender();
        }
      });

      peerInstance.current.on("error", (error) => {
        if (!isComponentMounted.current) return;

        console.error("PeerJS error:", error);

        // Specific error handling
        if (error.type === "peer-unavailable") {
          // The sender is not available yet, retry with backoff
          const peerId = error.message.split(" ").pop();
          console.log(`PeerJS: Could not connect to peer ${peerId}`);

          // Implement exponential backoff
          retryConnectToSender();
        } else if (
          error.type === "invalid-id" ||
          error.type === "unavailable-id"
        ) {
          // Generate a new ID and retry
          sessionIdRef.current = generateSessionId();
          setTimeout(() => {
            if (isComponentMounted.current) {
              initializePeerConnection();
            }
          }, 1000);
        } else {
          // For other errors, display a message and retry
          setStatusMessage(`Connection error: ${error.type}. Retrying...`);
          setTimeout(() => {
            if (isComponentMounted.current) {
              initializePeerConnection();
            }
          }, 3000);
        }
      });

      // Handle incoming connections (although we'll primarily be connecting to the sender)
      peerInstance.current.on("connection", (conn) => {
        if (!isComponentMounted.current) return;

        console.log(`PeerJS: Incoming connection from ${conn.peer}`);
        connection.current = conn;
        setupConnectionHandlers();
      });
    } catch (err) {
      if (!isComponentMounted.current) return;

      console.error("Peer initialization error:", err);
      toast.error("Failed to initialize connection: " + err.message);
      setStatusMessage("Connection failed: " + err.message);

      // Retry initialization after a delay
      setTimeout(() => {
        if (isComponentMounted.current) {
          initializePeerConnection();
        }
      }, 3000);
    }
  };

  // Start connecting to the sender with retries
  const startConnectingToSender = () => {
    setConnectionAttempts(0);
    connectToSender();
  };

  // Connect to sender function
  const connectToSender = () => {
    if (
      !peerInstance.current ||
      !isComponentMounted.current ||
      transfer.status !== "ACCEPTED"
    )
      return;

    const targetPeerId = `sender-${transferId}`;
    const attempts = connectionAttempts + 1;

    console.log(
      `Attempting to connect to ${targetPeerId} (attempt ${attempts})`
    );
    setStatusMessage(`Connecting to sender (attempt ${attempts})...`);
    setConnectionAttempts(attempts);

    try {
      const conn = peerInstance.current.connect(targetPeerId, {
        reliable: true,
      });

      // Set up timeout for this connection attempt
      const connectionTimeout = setTimeout(() => {
        if (conn && !conn.open) {
          console.log(`Connection attempt ${attempts} timed out`);
          conn.close();
          retryConnectToSender();
        }
      }, 5000);

      conn.on("open", () => {
        if (!isComponentMounted.current) return;

        clearTimeout(connectionTimeout);
        console.log(`Connected to ${targetPeerId} successfully!`);
        connection.current = conn;
        setupConnectionHandlers();
      });

      conn.on("error", (err) => {
        if (!isComponentMounted.current) return;

        clearTimeout(connectionTimeout);
        console.error(`Connection error on attempt ${attempts}:`, err);
        retryConnectToSender();
      });

      conn.on("close", () => {
        if (!isComponentMounted.current) return;

        clearTimeout(connectionTimeout);
        console.log(`Connection closed during attempt ${attempts}`);
        retryConnectToSender();
      });
    } catch (err) {
      if (!isComponentMounted.current) return;

      console.error(`Exception during connection attempt ${attempts}:`, err);
      retryConnectToSender();
    }
  };

  // Retry connection with exponential backoff
  const retryConnectToSender = () => {
    if (!isComponentMounted.current) return;

    const maxAttempts = 15;
    const attempts = connectionAttempts;

    if (attempts >= maxAttempts) {
      setStatusMessage(
        `Could not connect after ${maxAttempts} attempts. The sender might be offline.`
      );
      return;
    }

    // Calculate delay with exponential backoff (starting with 1 second)
    // 1s, 2s, 4s, 8s, etc. up to a maximum of 30 seconds
    const baseDelay = 1000;
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempts), 30000);

    // Add a small random component to avoid synchronized retries
    const jitter = Math.random() * 1000;
    const delay = exponentialDelay + jitter;

    console.log(
      `Scheduling retry ${attempts + 1} in ${Math.round(delay / 1000)} seconds`
    );
    setStatusMessage(
      `Will retry in ${Math.round(delay / 1000)} seconds... (attempt ${
        attempts + 1
      }/${maxAttempts})`
    );

    // Schedule the retry
    retryTimeoutRef.current = setTimeout(() => {
      if (isComponentMounted.current) {
        connectToSender();
      }
    }, delay);
  };

  // Set up connection event handlers
  const setupConnectionHandlers = () => {
    const conn = connection.current;

    if (!conn || !isComponentMounted.current) {
      console.error("No connection available to set up handlers");
      return;
    }

    conn.on("open", () => {
      if (!isComponentMounted.current) return;

      console.log("Connection established");
      setStatusMessage("Connected to sender. Waiting for file transfer...");

      // Notify server of connection - use consistent transferStatusChanged event
      if (socket) {
        socket.emit("transferStatusChanged", {
          transferId,
          status: "CONNECTED",
        });
      }
    });

    conn.on("close", () => {
      if (!isComponentMounted.current) return;

      console.log("Connection closed");

      // If transfer not complete, try to reconnect
      if (
        progress < 100 &&
        transfer.status !== "COMPLETED" &&
        transfer.status !== "CANCELLED"
      ) {
        setStatusMessage("Connection closed. Reconnecting...");
        startConnectingToSender();

        // Notify of disconnection
        if (socket) {
          socket.emit("transferStatusChanged", {
            transferId,
            status: "DISCONNECTED",
          });
        }
      }
    });

    conn.on("error", (err) => {
      if (!isComponentMounted.current) return;

      console.error("Connection error:", err);
      toast.error("Connection error");

      // Try to reconnect after an error
      setTimeout(() => {
        if (isComponentMounted.current) {
          startConnectingToSender();
        }
      }, 3000);
    });

    // Handle received data
    conn.on("data", (data) => {
      if (!isComponentMounted.current) return;
      handleReceivedMessage(data);
    });
  };

  // Handle received messages
  const handleReceivedMessage = (data) => {
    // If it's a metadata message
    if (data.type === "metadata") {
      // Prepare for receiving file
      receivedBuffers.current = [];
      receivedSize.current = 0;
      totalSize.current = data.size;

      setStatusMessage(
        `Receiving ${data.name} (${formatFileSize(data.size)})...`
      );
      updateTransferStatus("TRANSFERRING");
    } else {
      // If it's a file chunk (ArrayBuffer)
      receivedBuffers.current.push(data);
      receivedSize.current += data.byteLength;

      // Calculate and update progress
      const newProgress = Math.floor(
        (receivedSize.current / totalSize.current) * 100
      );
      setProgress(newProgress);

      // Update progress on the server occasionally (not every chunk)
      if (newProgress % 5 === 0 || newProgress === 100) {
        updateTransferProgress(newProgress);
      }

      // If transfer is complete
      if (receivedSize.current === totalSize.current) {
        const received = new Blob(receivedBuffers.current);
        downloadFile(received, transfer.fileName);
        setStatusMessage("File received successfully!");
        updateTransferStatus("COMPLETED");
      }
    }
  };

  // Download the received file
  const downloadFile = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "downloaded-file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className='receiver-transfer'>
      <h5 className='mt-3'>Transfer Status</h5>
      <p className='card-text'>{statusMessage}</p>

      {transfer.status !== "COMPLETED" && transfer.status !== "CANCELLED" && (
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

      <div className='d-flex gap-2 mt-3'>
        <button className='btn btn-secondary' onClick={onNavigateBack}>
          Back to Dashboard
        </button>

        {transfer.status !== "COMPLETED" && transfer.status !== "CANCELLED" && (
          <button className='btn btn-danger' onClick={onCancel}>
            Cancel Transfer
          </button>
        )}
      </div>
    </div>
  );
};

export default Receiver;

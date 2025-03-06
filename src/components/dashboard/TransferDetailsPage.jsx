// import React, { useState, useEffect, useRef } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import axios from "axios";
// import { toast } from "react-toastify";
// import { getStatusColor } from "../../utility";

// const TransferDetailsPage = ({ user }) => {
//   const { transferId } = useParams();
//   const navigate = useNavigate();
//   const [transfer, setTransfer] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [updatingStatus, setUpdatingStatus] = useState(false);
//   const [transferProgress, setTransferProgress] = useState(0);
//   const [connectionStatus, setConnectionStatus] = useState("");

//   // WebRTC related refs
//   const peerConnectionRef = useRef(null);
//   const dataChannelRef = useRef(null);
//   const fileChunksRef = useRef([]);
//   const receivedBufferRef = useRef([]);
//   const receivedSizeRef = useRef(0);
//   const fileRef = useRef(null);
//   const fileSizeRef = useRef(0);

//   const token = localStorage.getItem("token");

//   useEffect(() => {
//     const fetchTransferDetails = async () => {
//       try {
//         setLoading(true);
//         const res = await axios.get(`/api/transfers/${transferId}`);
//         setTransfer(res.data);
//         setError(null);
//       } catch (err) {
//         console.error("Error fetching transfer details:", err);
//         setError(err.response?.data?.msg || "Failed to load transfer details");
//         toast.error(
//           err.response?.data?.msg || "Failed to load transfer details"
//         );
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (transferId) {
//       fetchTransferDetails();
//     }

//     // Cleanup WebRTC connections when component unmounts
//     return () => {
//       if (peerConnectionRef.current) {
//         peerConnectionRef.current.close();
//       }
//       if (dataChannelRef.current) {
//         dataChannelRef.current.close();
//       }
//     };
//   }, [transferId]);

//   const handleStatusUpdate = async (newStatus) => {
//     try {
//       setUpdatingStatus(true);
//       const res = await axios.put(
//         `/api/transfers/${transferId}/status`,
//         {
//           status: newStatus,
//         },
//         {
//           headers: { Authorization: `Bearer ${token}` },
//         }
//       );
//       setTransfer(res.data);
//       toast.success(`Transfer ${newStatus.toLowerCase()}`);
//     } catch (err) {
//       console.error("Error updating transfer status:", err);
//       toast.error(err.response?.data?.msg || "Failed to update transfer");
//     } finally {
//       setUpdatingStatus(false);
//     }
//   };

//   const handleCancel = async () => {
//     try {
//       await axios.delete(`/api/transfers/${transferId}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       // Close WebRTC connections if they exist
//       if (peerConnectionRef.current) {
//         peerConnectionRef.current.close();
//       }

//       toast.success("Transfer cancelled successfully");
//       navigate("/dashboard");
//     } catch (err) {
//       console.error("Error cancelling transfer:", err);
//       toast.error(err.response?.data?.msg || "Failed to cancel transfer");
//     }
//   };

//   // Initialize WebRTC as sender
//   const initSenderWebRTC = async () => {
//     try {
//       setConnectionStatus("Initializing connection...");

//       // Create RTCPeerConnection
//       const configuration = {
//         iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
//       };
//       peerConnectionRef.current = new RTCPeerConnection(configuration);

//       // Create data channel
//       dataChannelRef.current = peerConnectionRef.current.createDataChannel(
//         "fileTransfer",
//         {
//           ordered: true,
//         }
//       );

//       // Setup data channel event handlers
//       setupDataChannelEvents(dataChannelRef.current);

//       // Create and set local description (offer)
//       const offer = await peerConnectionRef.current.createOffer();
//       await peerConnectionRef.current.setLocalDescription(offer);

//       // Send offer to the server to be relayed to the recipient
//       peerConnectionRef.current.onconnectionstatechange = (event) => {
//         console.log(
//           "Connection state changed:",
//           peerConnectionRef.current.connectionState
//         );

//         if (
//           peerConnectionRef.current.connectionState === "disconnected" ||
//           peerConnectionRef.current.connectionState === "failed" ||
//           peerConnectionRef.current.connectionState === "closed"
//         ) {
//           console.error(
//             "WebRTC connection issue:",
//             peerConnectionRef.current.connectionState
//           );
//           setConnectionStatus(
//             `Connection ${peerConnectionRef.current.connectionState}`
//           );
//           toast.error(
//             `Connection ${peerConnectionRef.current.connectionState}`
//           );
//         }
//       };
//       await axios.post(
//         `/api/transfers/${transferId}/signal`,
//         {
//           type: "offer",
//           sdp: peerConnectionRef.current.localDescription,
//         },
//         {
//           headers: { Authorization: `Bearer ${token}` },
//         }
//       );

//       // Handle ICE candidates
//       peerConnectionRef.current.onicecandidate = async (event) => {
//         if (event.candidate) {
//           await axios.post(
//             `/api/transfers/${transferId}/signal`,
//             {
//               type: "ice-candidate",
//               candidate: event.candidate,
//             },
//             {
//               headers: { Authorization: `Bearer ${token}` },
//             }
//           );
//         }
//       };

//       // Set up a polling mechanism to check for answer from recipient
//       const signalPoll = setInterval(async () => {
//         try {
//           const signalResponse = await axios.get(
//             `/api/transfers/${transferId}/signal/answer`,
//             {
//               headers: { Authorization: `Bearer ${token}` },
//             }
//           );

//           if (signalResponse.data && signalResponse.data.type === "answer") {
//             clearInterval(signalPoll);

//             // Set remote description (answer)
//             await peerConnectionRef.current.setRemoteDescription(
//               new RTCSessionDescription(signalResponse.data.sdp)
//             );
//             setConnectionStatus(
//               "Connected to recipient. Ready to transfer file."
//             );

//             // Also check for ICE candidates from recipient
//             const iceCandidatesResponse = await axios.get(
//               `/api/transfers/${transferId}/signal/ice-candidate`,
//               {
//                 headers: { Authorization: `Bearer ${token}` },
//               }
//             );

//             if (
//               iceCandidatesResponse.data &&
//               iceCandidatesResponse.data.length > 0
//             ) {
//               for (const iceCandidate of iceCandidatesResponse.data) {
//                 await peerConnectionRef.current.addIceCandidate(
//                   new RTCIceCandidate(iceCandidate)
//                 );
//               }
//             }
//           }
//         } catch (err) {
//           console.error("Error polling for signals:", err);
//         }
//       }, 2000);

//       // Clear interval after 60 seconds if no answer
//       setTimeout(() => {
//         clearInterval(signalPoll);
//         if (
//           connectionStatus !== "Connected to recipient. Ready to transfer file."
//         ) {
//           setConnectionStatus("Connection timeout. Recipient did not answer.");
//           toast.error("Connection timeout. Please try again later.");
//         }
//       }, 60000);

//       // Update status to TRANSFERRING
//       await handleStatusUpdate("TRANSFERRING");
//     } catch (err) {
//       console.error("Error initializing WebRTC connection:", err);
//       setConnectionStatus("Failed to initialize connection.");
//       toast.error("Failed to establish connection with recipient");
//       await handleStatusUpdate("FAILED");
//     }
//   };

//   // Initialize WebRTC as recipient
//   const initRecipientWebRTC = async () => {
//     try {
//       setConnectionStatus("Waiting for sender...");

//       // Create RTCPeerConnection
//       const configuration = {
//         iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
//       };
//       peerConnectionRef.current = new RTCPeerConnection(configuration);

//       // Set up data channel event handler for when the sender creates a data channel
//       peerConnectionRef.current.ondatachannel = (event) => {
//         dataChannelRef.current = event.channel;
//         setupDataChannelEvents(dataChannelRef.current);
//         setConnectionStatus("Connected to sender. Ready to receive file.");
//       };

//       peerConnectionRef.current.onconnectionstatechange = (event) => {
//         console.log(
//           "Connection state changed:",
//           peerConnectionRef.current.connectionState
//         );

//         if (
//           peerConnectionRef.current.connectionState === "disconnected" ||
//           peerConnectionRef.current.connectionState === "failed" ||
//           peerConnectionRef.current.connectionState === "closed"
//         ) {
//           console.error(
//             "WebRTC connection issue:",
//             peerConnectionRef.current.connectionState
//           );
//           setConnectionStatus(
//             `Connection ${peerConnectionRef.current.connectionState}`
//           );
//           toast.error(
//             `Connection ${peerConnectionRef.current.connectionState}`
//           );
//         }
//       };
//       // Poll for offer from the sender
//       const signalPoll = setInterval(async () => {
//         try {
//           const signalResponse = await axios.get(
//             `/api/transfers/${transferId}/signal/offer`,
//             {
//               headers: { Authorization: `Bearer ${token}` },
//             }
//           );

//           if (signalResponse.data && signalResponse.data.type === "offer") {
//             clearInterval(signalPoll);

//             // Set remote description (offer)
//             await peerConnectionRef.current.setRemoteDescription(
//               new RTCSessionDescription(signalResponse.data.sdp)
//             );

//             // Create and set local description (answer)
//             const answer = await peerConnectionRef.current.createAnswer();
//             await peerConnectionRef.current.setLocalDescription(answer);

//             // Send answer to the server to be relayed to the sender
//             await axios.post(
//               `/api/transfers/${transferId}/signal`,
//               {
//                 type: "answer",
//                 sdp: peerConnectionRef.current.localDescription,
//               },
//               {
//                 headers: { Authorization: `Bearer ${token}` },
//               }
//             );

//             // Handle ICE candidates
//             peerConnectionRef.current.onicecandidate = async (event) => {
//               if (event.candidate) {
//                 await axios.post(
//                   `/api/transfers/${transferId}/signal`,
//                   {
//                     type: "ice-candidate",
//                     candidate: event.candidate,
//                   },
//                   {
//                     headers: { Authorization: `Bearer ${token}` },
//                   }
//                 );
//               }
//             };

//             // Check for ICE candidates from sender
//             const iceCandidatesResponse = await axios.get(
//               `/api/transfers/${transferId}/signal/ice-candidate`,
//               {
//                 headers: { Authorization: `Bearer ${token}` },
//               }
//             );

//             if (
//               iceCandidatesResponse.data &&
//               iceCandidatesResponse.data.length > 0
//             ) {
//               for (const iceCandidate of iceCandidatesResponse.data) {
//                 await peerConnectionRef.current.addIceCandidate(
//                   new RTCIceCandidate(iceCandidate)
//                 );
//               }
//             }
//           }
//         } catch (err) {
//           console.error("Error polling for signals:", err);
//         }
//       }, 2000);

//       // Clear interval after 60 seconds if no offer
//       setTimeout(() => {
//         clearInterval(signalPoll);
//         if (
//           connectionStatus !== "Connected to sender. Ready to receive file."
//         ) {
//           setConnectionStatus(
//             "Connection timeout. Sender did not initiate transfer."
//           );
//           toast.error("Connection timeout. Please try again later.");
//         }
//       }, 60000);
//     } catch (err) {
//       console.error("Error initializing WebRTC connection:", err);
//       setConnectionStatus("Failed to initialize connection.");
//       toast.error("Failed to establish connection with sender");
//     }
//   };

//   // Set up data channel event handlers for both sender and recipient
//   const setupDataChannelEvents = (dataChannel) => {
//     dataChannel.binaryType = "arraybuffer";

//     dataChannel.onopen = () => {
//       setConnectionStatus("Data channel opened. Ready for transfer.");
//     };

//     dataChannel.onclose = () => {
//       setConnectionStatus("Data channel closed.");
//     };

//     dataChannel.onerror = (error) => {
//       console.error("Data channel error:", error);
//       setConnectionStatus("Data channel error.");
//       toast.error("Error in data transfer");
//     };

//     dataChannel.onmessage = (event) => {
//       const message = event.data;

//       // Handle file metadata
//       if (typeof message === "string") {
//         try {
//           const metadata = JSON.parse(message);
//           console.log("Parsed metadata:", metadata);

//           if (metadata.type === "file-metadata") {
//             console.log(
//               "Starting to receive file:",
//               metadata.name,
//               "Size:",
//               metadata.size
//             );
//             // Reset received buffer and size
//             receivedBufferRef.current = [];
//             receivedSizeRef.current = 0;
//             fileSizeRef.current = metadata.size;
//             setConnectionStatus(`Receiving file: ${metadata.name}`);
//           } else if (metadata.type === "file-complete") {
//             console.log(
//               "File transfer complete. Chunks received:",
//               receivedBufferRef.current.length
//             );
//             console.log(
//               "Creating file with total size:",
//               receivedSizeRef.current
//             );
//             // File transfer is complete, create a Blob and download it
//             const fileBlob = new Blob(receivedBufferRef.current);
//             console.log("Created blob:", fileBlob);
//             downloadFile(fileBlob, metadata.name);

//             setConnectionStatus("File transfer complete.");
//             setTransferProgress(100);

//             // Mark transfer as completed
//             handleStatusUpdate("COMPLETED");
//           }
//         } catch (e) {
//           console.error(
//             "Error parsing message:",
//             e,
//             "Original message:",
//             message
//           );
//         }
//       }
//       // Handle file chunks
//       else {
//         console.log("Received chunk size:", message.byteLength);
//         receivedBufferRef.current.push(message);
//         receivedSizeRef.current += message.byteLength;

//         // Update progress
//         const progress = Math.round(
//           (receivedSizeRef.current / fileSizeRef.current) * 100
//         );
//         setTransferProgress(progress);

//         // Also update the progress in the transfer object
//         setTransfer((prev) => ({
//           ...prev,
//           progress: progress,
//         }));
//       }
//     };
//   };

//   // Function to select and prepare file for sending
//   const selectAndSendFile = async () => {
//     const fileInput = document.createElement("input");
//     fileInput.type = "file";

//     fileInput.onchange = async (event) => {
//       const file = event.target.files[0];
//       if (!file) return;

//       fileRef.current = file;
//       fileSizeRef.current = file.size;

//       // Check if data channel is open
//       if (
//         dataChannelRef.current &&
//         dataChannelRef.current.readyState === "open"
//       ) {
//         // Send file metadata
//         dataChannelRef.current.send(
//           JSON.stringify({
//             type: "file-metadata",
//             name: file.name,
//             size: file.size,
//             type: file.type,
//           })
//         );

//         // Read and send the file in chunks
//         const chunkSize = 16384; // 16 KB chunks
//         const fileReader = new FileReader();
//         let offset = 0;

//         fileReader.onload = (e) => {
//           if (dataChannelRef.current.readyState === "open") {
//             console.log(
//               "Sending chunk:",
//               offset,
//               "to",
//               offset + e.target.result.byteLength,
//               "Total:",
//               file.size
//             );
//             dataChannelRef.current.send(e.target.result);
//             offset += e.target.result.byteLength;

//             // Update progress
//             const progress = Math.round((offset / file.size) * 100);
//             setTransferProgress(progress);

//             // Update progress in transfer object
//             setTransfer((prev) => ({
//               ...prev,
//               progress: progress,
//             }));

//             // Continue reading if there's more data
//             if (offset < file.size) {
//               readSlice(offset);
//             } else {
//               console.log("File sending complete, sending completion message");
//               // File is completely sent
//               dataChannelRef.current.send(
//                 JSON.stringify({
//                   type: "file-complete",
//                   name: file.name,
//                 })
//               );
//               console.log("Completion message sent");
//             }
//           }
//         };

//         const readSlice = (o) => {
//           const slice = file.slice(o, o + chunkSize);
//           fileReader.readAsArrayBuffer(slice);
//         };

//         readSlice(0);
//       } else {
//         console.error("Data channel closed unexpectedly during file transfer");
//         toast.error("Connection lost during file transfer");
//       }
//     };

//     fileInput.click();
//   };

//   // Function to download a received file
//   const downloadFile = (blob, fileName) => {
//     console.log("Downloading file:", fileName, "Blob size:", blob.size);

//     try {
//       const url = URL.createObjectURL(blob);
//       console.log("Created object URL:", url);

//       const a = document.createElement("a");
//       a.href = url;
//       a.download = fileName || "downloaded-file";
//       a.textContent = "Download " + fileName;
//       a.style.display = "block";
//       document.body.appendChild(a);

//       console.log("Download link created, clicking...");
//       a.click();

//       // Leave the link visible for a moment in case automatic click doesn't work
//       setTimeout(() => {
//         document.body.removeChild(a);
//         URL.revokeObjectURL(url);
//         console.log("Download link removed");
//       }, 5000);
//     } catch (e) {
//       console.error("Error in downloadFile:", e);
//       toast.error("Error downloading file: " + e.message);
//     }
//   };

//   if (loading) {
//     return <div className='text-center mt-5'>Loading transfer details...</div>;
//   }

//   if (error) {
//     return (
//       <div className='alert alert-danger mt-4' role='alert'>
//         {error}
//       </div>
//     );
//   }

//   if (!transfer) {
//     return (
//       <div className='alert alert-warning mt-4' role='alert'>
//         Transfer not found
//       </div>
//     );
//   }

//   // Safely extract IDs and emails with null checks
//   const uploadedById = transfer.uploadedBy?._id || transfer.uploadedBy || "";
//   const recipientId = transfer.recipient?._id || transfer.recipient || "";

//   // Check if either uploadedBy or recipient is an object and extract the email
//   const senderEmail =
//     typeof transfer.uploadedBy === "object" && transfer.uploadedBy !== null
//       ? transfer.uploadedBy.email
//       : transfer.uploadedBy || "Unknown sender";

//   const recipientEmail =
//     typeof transfer.recipient === "object" && transfer.recipient !== null
//       ? transfer.recipient.email
//       : transfer.recipient || "Unknown recipient";

//   // Safely check if user is sender or recipient
//   const isRecipient = user && recipientEmail && user.email === recipientEmail;
//   const isSender = user && senderEmail && user.email === senderEmail;

//   // Define available actions based on current status and user role
//   const renderStatusActions = () => {
//     if (updatingStatus) {
//       return (
//         <div className='d-flex gap-2'>
//           <button className='btn btn-primary' disabled>
//             <span
//               className='spinner-border spinner-border-sm me-2'
//               role='status'
//               aria-hidden='true'
//             ></span>
//             Updating...
//           </button>
//         </div>
//       );
//     }

//     // For recipient
//     if (isRecipient) {
//       switch (transfer.status) {
//         case "PENDING":
//           return (
//             <div className='d-flex gap-2'>
//               <button
//                 className='btn btn-success'
//                 onClick={() => handleStatusUpdate("ACCEPTED")}
//               >
//                 Accept Transfer
//               </button>
//               <button
//                 className='btn btn-danger'
//                 onClick={() => handleStatusUpdate("REJECTED")}
//               >
//                 Reject Transfer
//               </button>
//             </div>
//           );
//         case "ACCEPTED":
//           return (
//             <div className='alert alert-info'>
//               Waiting for sender to start the transfer.
//             </div>
//           );
//         case "TRANSFERRING":
//           // When transferring, initialize WebRTC as recipient if not already done
//           if (!peerConnectionRef.current && !dataChannelRef.current) {
//             initRecipientWebRTC();
//           }

//           return (
//             <div>
//               {connectionStatus && (
//                 <div className='alert alert-info mb-3'>{connectionStatus}</div>
//               )}
//             </div>
//           );
//         case "COMPLETED":
//           return (
//             <div className='alert alert-success'>
//               Transfer completed successfully.
//             </div>
//           );
//         case "FAILED":
//           return (
//             <div className='alert alert-danger'>
//               Transfer failed. Please contact the sender.
//             </div>
//           );
//         default:
//           return null;
//       }
//     }

//     // For sender
//     if (isSender) {
//       switch (transfer.status) {
//         case "PENDING":
//           return (
//             <div className='d-flex gap-2'>
//               <button className='btn btn-warning' onClick={handleCancel}>
//                 Cancel Transfer
//               </button>
//               <div className='alert alert-info ms-2 mb-0'>
//                 Waiting for recipient to accept the transfer.
//               </div>
//             </div>
//           );
//         case "ACCEPTED":
//           return (
//             <button
//               className='btn btn-primary'
//               onClick={() => initSenderWebRTC()}
//             >
//               Start Transfer
//             </button>
//           );
//         case "TRANSFERRING":
//           // When transferring, show file selection UI for sender
//           return (
//             <div>
//               {connectionStatus && (
//                 <div className='alert alert-info mb-3'>{connectionStatus}</div>
//               )}

//               {dataChannelRef.current &&
//                 dataChannelRef.current.readyState === "open" && (
//                   <button
//                     className='btn btn-primary'
//                     onClick={selectAndSendFile}
//                   >
//                     Select and Send File
//                   </button>
//                 )}
//             </div>
//           );
//         case "COMPLETED":
//           return (
//             <div className='alert alert-success'>
//               Transfer completed successfully.
//             </div>
//           );
//         case "REJECTED":
//           return (
//             <div className='alert alert-warning'>
//               Transfer was rejected by the recipient.
//             </div>
//           );
//         case "FAILED":
//           return (
//             <div className='alert alert-danger'>
//               Transfer failed. Please try again.
//             </div>
//           );
//         default:
//           return null;
//       }
//     }

//     return null;
//   };

//   return (
//     <div className='container mt-4'>
//       <div className='card'>
//         <div className='card-header bg-primary text-white'>
//           <h4 className='mb-0'>Transfer Details</h4>
//         </div>
//         <div className='card-body'>
//           <div className='row mb-3'>
//             <div className='col-md-6'>
//               <h5>File Information</h5>
//               <p>
//                 <strong>File Name:</strong> {transfer.fileName || "N/A"}
//               </p>
//               <p>
//                 <strong>File Size:</strong>{" "}
//                 {transfer.fileSize
//                   ? `${(transfer.fileSize / 1024).toFixed(2)} KB`
//                   : "N/A"}
//               </p>
//               <p>
//                 <strong>File Type:</strong> {transfer.fileType || "N/A"}
//               </p>
//             </div>
//             <div className='col-md-6'>
//               <h5>Transfer Information</h5>
//               <p>
//                 <strong>Status:</strong>{" "}
//                 <span className={`badge bg-${getStatusColor(transfer.status)}`}>
//                   {transfer.status || "UNKNOWN"}
//                 </span>
//               </p>
//               <p>
//                 <strong>Sender:</strong> {senderEmail}
//               </p>
//               <p>
//                 <strong>Recipient:</strong> {recipientEmail}
//               </p>
//               <p>
//                 <strong>Transfer Method:</strong>{" "}
//                 {transfer.transferMethod || "Peer-to-peer (WebRTC)"}
//               </p>
//               <p>
//                 <strong>Created:</strong>{" "}
//                 {transfer.createdAt
//                   ? new Date(transfer.createdAt).toLocaleString()
//                   : "N/A"}
//               </p>
//               {transfer.completedAt && (
//                 <p>
//                   <strong>Completed:</strong>{" "}
//                   {new Date(transfer.completedAt).toLocaleString()}
//                 </p>
//               )}
//             </div>
//           </div>

//           {(transfer.progress > 0 || transferProgress > 0) && (
//             <div className='mb-4'>
//               <h5>Transfer Progress</h5>
//               <div className='progress'>
//                 <div
//                   className='progress-bar'
//                   role='progressbar'
//                   style={{
//                     width: `${
//                       transferProgress > 0
//                         ? transferProgress
//                         : transfer.progress
//                     }%`,
//                   }}
//                   aria-valuenow={
//                     transferProgress > 0 ? transferProgress : transfer.progress
//                   }
//                   aria-valuemin='0'
//                   aria-valuemax='100'
//                 >
//                   {transferProgress > 0 ? transferProgress : transfer.progress}%
//                 </div>
//               </div>
//             </div>
//           )}

//           <div className='mt-4'>
//             {renderStatusActions()}

//             <div className='mt-3'>
//               <button
//                 className='btn btn-secondary'
//                 onClick={() => navigate("/dashboard")}
//               >
//                 Back to Dashboard
//               </button>

//               {(transfer.status === "REJECTED" ||
//                 transfer.status === "COMPLETED" ||
//                 transfer.status === "FAILED") && (
//                 <button
//                   className='btn btn-outline-primary ms-2'
//                   onClick={() => navigate("/transfer/initiate")}
//                 >
//                   Start New Transfer
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default TransferDetailsPage;
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { getStatusColor } from "../../utility";
import Peer from "simple-peer";

const TransferDetailsPage = ({ user }) => {
  const { transferId } = useParams();
  const navigate = useNavigate();
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [transferProgress, setTransferProgress] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Refs for WebRTC and file handling
  const peerRef = useRef(null);
  const signalPollingRef = useRef(null);
  const fileChunksRef = useRef([]);
  const receivedBufferRef = useRef([]);
  const receivedSizeRef = useRef(0);
  const fileSizeRef = useRef(0);
  const fileNameRef = useRef("");
  const fileTypeRef = useRef("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchTransferDetails = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/transfers/${transferId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTransfer(res.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching transfer details:", err);
        setError(err.response?.data?.msg || "Failed to load transfer details");
        toast.error(
          err.response?.data?.msg || "Failed to load transfer details"
        );
      } finally {
        setLoading(false);
      }
    };

    if (transferId) {
      fetchTransferDetails();
    }

    // Cleanup function
    return () => {
      cleanupWebRTC();
    };
  }, [transferId, token]);

  const cleanupWebRTC = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    if (signalPollingRef.current) {
      clearInterval(signalPollingRef.current);
      signalPollingRef.current = null;
    }

    setIsConnected(false);
    setIsTransferring(false);
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      setUpdatingStatus(true);
      const res = await axios.put(
        `/api/transfers/${transferId}/status`,
        {
          status: newStatus,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setTransfer(res.data.file);
      toast.success(`Transfer ${newStatus.toLowerCase()}`);
    } catch (err) {
      console.error("Error updating transfer status:", err);
      toast.error(err.response?.data?.msg || "Failed to update transfer");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleProgressUpdate = async (progress) => {
    try {
      await axios.put(
        `/api/transfers/${transferId}/progress`,
        {
          progress: progress,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (err) {
      console.error("Error updating transfer progress:", err);
    }
  };

  const handleCancel = async () => {
    try {
      await axios.delete(`/api/transfers/${transferId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      cleanupWebRTC();
      toast.success("Transfer cancelled successfully");
      navigate("/dashboard");
    } catch (err) {
      console.error("Error cancelling transfer:", err);
      toast.error(err.response?.data?.msg || "Failed to cancel transfer");
    }
  };

  // Signal handling functions
  const sendSignal = async (signalData) => {
    try {
      await axios.post(`/api/transfers/${transferId}/signal`, signalData, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Error sending signal:", err);
      toast.error("Failed to establish connection: Signal error");
    }
  };

  const pollForSignal = async (signalType, onSignalReceived) => {
    // Clear any existing polling interval
    if (signalPollingRef.current) {
      clearInterval(signalPollingRef.current);
    }

    let attempts = 0;
    const maxAttempts = 30; // 30 attempts = 60 seconds with 2-second interval

    signalPollingRef.current = setInterval(async () => {
      try {
        attempts++;
        const response = await axios.get(
          `/api/transfers/${transferId}/signal/${signalType}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (
          response.data &&
          (response.data.type ||
            (Array.isArray(response.data) && response.data.length > 0))
        ) {
          if (typeof onSignalReceived === "function") {
            onSignalReceived(response.data);
          }
        }

        // Stop polling after max attempts
        if (attempts >= maxAttempts) {
          clearInterval(signalPollingRef.current);
          signalPollingRef.current = null;
          setConnectionStatus("Connection timeout. Please try again later.");
          toast.error("Connection timeout after 60 seconds");
        }
      } catch (err) {
        // Only log the error, don't stop polling yet
        console.error(`Error polling for ${signalType} signal:`, err);
      }
    }, 2000);

    // Return the interval ID so it can be cleared elsewhere if needed
    return signalPollingRef.current;
  };

  // Sender implementation
  const initSenderWebRTC = async () => {
    try {
      // Clean up any existing connections
      cleanupWebRTC();

      setConnectionStatus("Initializing connection as sender...");
      await handleStatusUpdate("TRANSFERRING");

      // Create new peer instance
      peerRef.current = new Peer({
        initiator: true,
        trickle: true,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        },
      });

      // Set up event handlers
      peerRef.current.on("signal", async (data) => {
        console.log("Sender generated signal:", data.type);
        await sendSignal(data);
      });

      peerRef.current.on("connect", () => {
        setConnectionStatus("Connected to recipient. Ready to transfer file.");
        setIsConnected(true);

        // Clear polling interval once connected
        if (signalPollingRef.current) {
          clearInterval(signalPollingRef.current);
          signalPollingRef.current = null;
        }
      });

      peerRef.current.on("close", () => {
        setConnectionStatus("Connection closed.");
        setIsConnected(false);
        setIsTransferring(false);
      });

      peerRef.current.on("error", (err) => {
        console.error("Peer error:", err);
        setConnectionStatus(`Connection error: ${err.message}`);
        toast.error(`Connection error: ${err.message}`);
        handleStatusUpdate("FAILED");
        setIsConnected(false);
        setIsTransferring(false);
      });

      // Start polling for answer signals
      pollForSignal("answer", (answerSignal) => {
        try {
          console.log("Sender received answer signal");
          if (peerRef.current) {
            peerRef.current.signal(answerSignal);
          }
        } catch (err) {
          console.error("Error processing answer signal:", err);
        }
      });

      // Also poll for ICE candidates
      pollForSignal("ice-candidate", (candidates) => {
        if (Array.isArray(candidates) && candidates.length > 0) {
          candidates.forEach((candidate) => {
            if (peerRef.current && candidate) {
              console.log("Sender received ICE candidate");
              peerRef.current.signal({ candidate });
            }
          });
        }
      });
    } catch (err) {
      console.error("Error initializing WebRTC connection:", err);
      setConnectionStatus("Failed to initialize connection.");
      toast.error("Failed to establish connection with recipient");
      await handleStatusUpdate("FAILED");
    }
  };

  // Recipient implementation
  const initRecipientWebRTC = async () => {
    try {
      // Clean up any existing connections
      cleanupWebRTC();

      setConnectionStatus("Waiting for sender to connect...");

      // Create new peer instance
      peerRef.current = new Peer({
        initiator: false,
        trickle: true,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        },
      });

      // Configure event handlers
      peerRef.current.on("signal", async (data) => {
        console.log("Recipient generated signal:", data.type);
        await sendSignal(data);
      });

      peerRef.current.on("connect", () => {
        setConnectionStatus(
          "Connected to sender. Waiting for file transfer to begin."
        );
        setIsConnected(true);

        // Clear polling interval once connected
        if (signalPollingRef.current) {
          clearInterval(signalPollingRef.current);
          signalPollingRef.current = null;
        }
      });

      peerRef.current.on("data", (data) => {
        handleDataReceived(data);
      });

      peerRef.current.on("close", () => {
        setConnectionStatus("Connection closed.");
        setIsConnected(false);
        setIsTransferring(false);
      });

      peerRef.current.on("error", (err) => {
        console.error("Peer error:", err);
        setConnectionStatus(`Connection error: ${err.message}`);
        toast.error(`Connection error: ${err.message}`);
        setIsConnected(false);
        setIsTransferring(false);
      });

      // Start polling for offer signals
      pollForSignal("offer", (offerSignal) => {
        try {
          console.log("Recipient received offer signal");
          if (peerRef.current) {
            peerRef.current.signal(offerSignal);
          }
        } catch (err) {
          console.error("Error processing offer signal:", err);
        }
      });

      // Also poll for ICE candidates
      pollForSignal("ice-candidate", (candidates) => {
        if (Array.isArray(candidates) && candidates.length > 0) {
          candidates.forEach((candidate) => {
            if (peerRef.current && candidate) {
              console.log("Recipient received ICE candidate");
              peerRef.current.signal({ candidate });
            }
          });
        }
      });
    } catch (err) {
      console.error("Error initializing WebRTC connection:", err);
      setConnectionStatus("Failed to initialize connection.");
      toast.error("Failed to establish connection with sender");
    }
  };

  // Handle received data (for recipient)
  const handleDataReceived = (data) => {
    try {
      if (typeof data === "string") {
        // Handle JSON message
        const message = JSON.parse(data);

        switch (message.type) {
          case "file-metadata":
            // Reset buffers for new file
            receivedBufferRef.current = [];
            receivedSizeRef.current = 0;
            fileSizeRef.current = message.size;
            fileNameRef.current = message.name;
            fileTypeRef.current = message.type;

            setConnectionStatus(`Receiving file: ${message.name} (0%)`);
            setIsTransferring(true);
            break;

          case "file-complete":
            // Combine all chunks and create download
            finishDownload();
            break;

          default:
            console.warn("Unknown message type:", message.type);
        }
      } else {
        // Handle binary data (file chunk)
        receivedBufferRef.current.push(data);
        receivedSizeRef.current += data.byteLength;

        // Update progress
        const progress = Math.min(
          Math.floor((receivedSizeRef.current / fileSizeRef.current) * 100),
          99 // Cap at 99% until we get the file-complete message
        );

        setTransferProgress(progress);
        setConnectionStatus(
          `Receiving file: ${fileNameRef.current} (${progress}%)`
        );
      }
    } catch (err) {
      console.error("Error handling received data:", err);
      toast.error("Error processing received data");
    }
  };

  // Finalize download (for recipient)
  const finishDownload = () => {
    try {
      const fileBlob = new Blob(receivedBufferRef.current, {
        type: fileTypeRef.current,
      });

      // Create a download link
      const url = URL.createObjectURL(fileBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileNameRef.current || "downloaded-file";
      a.style.display = "none";
      document.body.appendChild(a);

      // Trigger download
      a.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      // Update UI
      setTransferProgress(100);
      setConnectionStatus("File transfer complete. Save your file!");
      setIsTransferring(false);
      handleStatusUpdate("COMPLETED");
    } catch (err) {
      console.error("Error processing downloaded file:", err);
      toast.error("Error saving file");
    }
  };

  // Select and send file (for sender)
  const selectAndSendFile = () => {
    if (!isConnected || !peerRef.current || !peerRef.current.connected) {
      toast.error("Not connected to recipient");
      return;
    }

    const fileInput = document.createElement("input");
    fileInput.type = "file";

    fileInput.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        setIsTransferring(true);

        // Send file metadata first
        peerRef.current.send(
          JSON.stringify({
            type: "file-metadata",
            name: file.name,
            size: file.size,
            type: file.type,
          })
        );

        // Set up chunking
        const chunkSize = 16384; // 16KB chunks
        const totalChunks = Math.ceil(file.size / chunkSize);
        let chunksProcessed = 0;

        // Create a file reader for loading chunks
        const fileReader = new FileReader();
        let offset = 0;

        fileReader.onload = (e) => {
          try {
            // Send chunk data
            peerRef.current.send(e.target.result);
            chunksProcessed++;

            // Update progress
            offset += e.target.result.byteLength;
            const progress = Math.min(
              Math.floor((offset / file.size) * 100),
              99 // Cap at 99% until complete
            );

            setTransferProgress(progress);
            setConnectionStatus(`Sending ${file.name} (${progress}%)`);

            // Update server progress every 5%
            if (progress % 5 === 0 || progress === 99) {
              handleProgressUpdate(progress);
            }

            // Process next chunk or finish
            if (offset < file.size) {
              readNextChunk();
            } else {
              // Send completion message
              peerRef.current.send(
                JSON.stringify({
                  type: "file-complete",
                  name: file.name,
                })
              );

              // Update UI
              setTransferProgress(100);
              setConnectionStatus("File transfer complete!");
              setIsTransferring(false);
              handleProgressUpdate(100);
              handleStatusUpdate("COMPLETED");
            }
          } catch (err) {
            console.error("Error in fileReader.onload:", err);
            toast.error("Error sending file chunk");
            setIsTransferring(false);
          }
        };

        fileReader.onerror = (error) => {
          console.error("FileReader error:", error);
          toast.error("Error reading file");
          setIsTransferring(false);
        };

        // Function to read the next chunk
        const readNextChunk = () => {
          const slice = file.slice(offset, offset + chunkSize);
          fileReader.readAsArrayBuffer(slice);
        };

        // Start reading chunks
        readNextChunk();
      } catch (err) {
        console.error("Error sending file:", err);
        toast.error("Failed to send file");
        setIsTransferring(false);
      }
    };

    fileInput.click();
  };

  if (loading) {
    return <div className='text-center mt-5'>Loading transfer details...</div>;
  }

  if (error) {
    return (
      <div className='alert alert-danger mt-4' role='alert'>
        {error}
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className='alert alert-warning mt-4' role='alert'>
        Transfer not found
      </div>
    );
  }

  const senderEmail =
    typeof transfer.uploadedBy === "object" && transfer.uploadedBy !== null
      ? transfer.uploadedBy.email
      : transfer.uploadedBy || "Unknown sender";

  const recipientEmail =
    typeof transfer.recipient === "object" && transfer.recipient !== null
      ? transfer.recipient.email
      : transfer.recipient || "Unknown recipient";

  const isRecipient = user && recipientEmail && user.email === recipientEmail;
  const isSender = user && senderEmail && user.email === senderEmail;

  const renderStatusActions = () => {
    if (updatingStatus) {
      return (
        <div className='d-flex gap-2'>
          <button className='btn btn-primary' disabled>
            <span
              className='spinner-border spinner-border-sm me-2'
              role='status'
              aria-hidden='true'
            ></span>
            Updating...
          </button>
        </div>
      );
    }

    if (isRecipient) {
      switch (transfer.status) {
        case "PENDING":
          return (
            <div className='d-flex gap-2'>
              <button
                className='btn btn-success'
                onClick={() => handleStatusUpdate("ACCEPTED")}
              >
                Accept Transfer
              </button>
              <button
                className='btn btn-danger'
                onClick={() => handleStatusUpdate("REJECTED")}
              >
                Reject Transfer
              </button>
            </div>
          );
        case "ACCEPTED":
          return (
            <div className='alert alert-info'>
              Waiting for sender to start the transfer.
            </div>
          );
        case "TRANSFERRING":
          // Initialize WebRTC if not already connected
          if (!isConnected && !peerRef.current) {
            // Add a small delay to ensure UI is updated first
            setTimeout(() => {
              initRecipientWebRTC();
            }, 500);
          }

          return (
            <div>
              {connectionStatus && (
                <div className='alert alert-info mb-3'>{connectionStatus}</div>
              )}
              {transferProgress > 0 && (
                <div className='progress mb-3'>
                  <div
                    className='progress-bar'
                    role='progressbar'
                    style={{ width: `${transferProgress}%` }}
                    aria-valuenow={transferProgress}
                    aria-valuemin='0'
                    aria-valuemax='100'
                  >
                    {transferProgress}%
                  </div>
                </div>
              )}
            </div>
          );
        case "COMPLETED":
          return (
            <div className='alert alert-success'>
              Transfer completed successfully.
            </div>
          );
        case "FAILED":
          return (
            <div className='alert alert-danger'>
              Transfer failed. Please contact the sender.
            </div>
          );
        default:
          return null;
      }
    }

    if (isSender) {
      switch (transfer.status) {
        case "PENDING":
          return (
            <div className='d-flex gap-2'>
              <button className='btn btn-warning' onClick={handleCancel}>
                Cancel Transfer
              </button>
              <div className='alert alert-info ms-2 mb-0'>
                Waiting for recipient to accept the transfer.
              </div>
            </div>
          );
        case "ACCEPTED":
          return (
            <button
              className='btn btn-primary'
              onClick={() => initSenderWebRTC()}
            >
              Start Transfer
            </button>
          );
        case "TRANSFERRING":
          return (
            <div>
              {connectionStatus && (
                <div className='alert alert-info mb-3'>{connectionStatus}</div>
              )}

              {transferProgress > 0 && (
                <div className='progress mb-3'>
                  <div
                    className='progress-bar'
                    role='progressbar'
                    style={{ width: `${transferProgress}%` }}
                    aria-valuenow={transferProgress}
                    aria-valuemin='0'
                    aria-valuemax='100'
                  >
                    {transferProgress}%
                  </div>
                </div>
              )}

              {isConnected && !isTransferring && (
                <button className='btn btn-primary' onClick={selectAndSendFile}>
                  Select and Send File
                </button>
              )}

              {isTransferring && (
                <button className='btn btn-primary' disabled>
                  Transferring...
                </button>
              )}
            </div>
          );
        case "COMPLETED":
          return (
            <div className='alert alert-success'>
              Transfer completed successfully.
            </div>
          );
        case "REJECTED":
          return (
            <div className='alert alert-warning'>
              Transfer was rejected by the recipient.
            </div>
          );
        case "FAILED":
          return (
            <div className='alert alert-danger'>
              Transfer failed. Please try again.
            </div>
          );
        default:
          return null;
      }
    }

    return null;
  };

  return (
    <div className='container mt-4'>
      <div className='card'>
        <div className='card-header bg-primary text-white'>
          <h4 className='mb-0'>Transfer Details</h4>
        </div>
        <div className='card-body'>
          <div className='row mb-3'>
            <div className='col-md-6'>
              <h5>File Information</h5>
              <p>
                <strong>File Name:</strong> {transfer.fileName || "N/A"}
              </p>
              <p>
                <strong>File Size:</strong>{" "}
                {transfer.fileSize
                  ? `${(transfer.fileSize / 1024 / 1024).toFixed(2)} MB`
                  : "N/A"}
              </p>
              <p>
                <strong>File Type:</strong> {transfer.fileType || "N/A"}
              </p>
            </div>
            <div className='col-md-6'>
              <h5>Transfer Information</h5>
              <p>
                <strong>Status:</strong>{" "}
                <span className={`badge bg-${getStatusColor(transfer.status)}`}>
                  {transfer.status || "UNKNOWN"}
                </span>
              </p>
              <p>
                <strong>Sender:</strong> {senderEmail}
              </p>
              <p>
                <strong>Recipient:</strong> {recipientEmail}
              </p>
              <p>
                <strong>Transfer Method:</strong>{" "}
                {transfer.transferMethod || "Peer-to-peer (WebRTC)"}
              </p>
              <p>
                <strong>Created:</strong>{" "}
                {transfer.createdAt
                  ? new Date(transfer.createdAt).toLocaleString()
                  : "N/A"}
              </p>
              {transfer.completedAt && (
                <p>
                  <strong>Completed:</strong>{" "}
                  {new Date(transfer.completedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {(transfer.progress > 0 || transferProgress > 0) && (
            <div className='mb-4'>
              <h5>Transfer Progress</h5>
              <div className='progress'>
                <div
                  className='progress-bar'
                  role='progressbar'
                  style={{
                    width: `${
                      transferProgress > 0
                        ? transferProgress
                        : transfer.progress
                    }%`,
                  }}
                  aria-valuenow={
                    transferProgress > 0 ? transferProgress : transfer.progress
                  }
                  aria-valuemin='0'
                  aria-valuemax='100'
                >
                  {transferProgress > 0 ? transferProgress : transfer.progress}%
                </div>
              </div>
            </div>
          )}

          <div className='mt-4'>
            {renderStatusActions()}

            <div className='mt-3'>
              <button
                className='btn btn-secondary'
                onClick={() => navigate("/dashboard")}
              >
                Back to Dashboard
              </button>

              {(transfer.status === "REJECTED" ||
                transfer.status === "COMPLETED" ||
                transfer.status === "FAILED") && (
                <button
                  className='btn btn-outline-primary ms-2'
                  onClick={() => navigate("/transfer/initiate")}
                >
                  Start New Transfer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferDetailsPage;

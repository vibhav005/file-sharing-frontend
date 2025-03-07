import { Toaster } from "@/components/ui/sonner";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import { toast } from "react-toastify";
// Components
import Login from "./compos/auth/Login";
import Register from "./compos/auth/Register";
import Dashboard from "./compos/dashboard/Dashboard";
import P2pTransfer from "./compos/dashboard/P2pTransfer";
import TransferDetails from "./compos/dashboard/TransferDetail";
import TransferInitiate from "./compos/dashboard/TransferInitiate";
import FileList from "./compos/files/FileList";
import FileUpload from "./compos/files/FileUpload";
import Navbar from "./compos/layout/Navbar";
import ProtectedRoute from "./compos/routing/ProtectedRoute";
// import Profile from "./compos/profile/Profile";

// Set default axios config
axios.defaults.baseURL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));
  // Set auth token
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  useEffect(() => {
    const checkAuthStatus = async () => {
      if (token) {
        try {
          const res = await axios.get("/api/auth/me");
          setUser(res.data);
          setIsAuthenticated(true);
        } catch (err) {
          console.error("Auth check failed:", err);
          localStorage.removeItem("token");
          delete axios.defaults.headers.common["Authorization"];
          setIsAuthenticated(false);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [token]);

  const login = (receivedToken, userInfo) => {
    localStorage.setItem("token", receivedToken);
    axios.defaults.headers.common["Authorization"] = `Bearer ${receivedToken}`;
    setToken(receivedToken);
    setUser(userInfo);
    setIsAuthenticated(true);
    toast({
      title: "Success",
      description: "Login successful",
      variant: "default",
    });
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    toast({
      title: "Info",
      description: "Logged out successfully",
      variant: "default",
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-lg font-medium">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="flex min-h-screen flex-col">
        <Navbar isAuthenticated={isAuthenticated} user={user} logout={logout} />
        <main className="container mx-auto mt-4 flex-1 px-4">
          <Toaster />
          <Routes>
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/register"
              element={
                !isAuthenticated ? (
                  <Register login={login} />
                ) : (
                  <Navigate to="/dashboard" />
                )
              }
            />
            <Route
              path="/login"
              element={
                !isAuthenticated ? (
                  <Login login={login} />
                ) : (
                  <Navigate to="/dashboard" />
                )
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <Dashboard user={user} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/upload"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <FileUpload user={user} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/files"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <FileList user={user} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/transfer/initiate"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <TransferInitiate user={user} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/transfer/:transferId"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <TransferDetails user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/p2p-transfer"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <P2pTransfer user={user} />
                </ProtectedRoute>
              }
            />
            {/* <Route
              path="/profile"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <Profile user={user} />
                </ProtectedRoute>
              }
            /> */}
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
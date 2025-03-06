import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Import Bootstrap CSS
import "bootstrap/dist/css/bootstrap.min.css";

// Components
import Navbar from "./components/layout/Navbar";
import Register from "./components/auth/Register";
import Login from "./components/auth/Login";
import Dashboard from "./components/dashboard/Dashboard";
import FileUpload from "./components/files/FileUpload";
import ProtectedRoute from "./components/routing/ProtectedRoute";
import FileList from "./components/files/FileList";
import TransferInitiate from "./components/dashboard/TransferInitiate";
import TransferDetails from "./components/dashboard/TransferDetail";
// import Profile from "./components/profile/Profile";

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
    toast.success("Login successful");
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    toast.info("Logged out successfully");
  };

  if (loading) {
    return <div className='loading-container'>Loading...</div>;
  }

  return (
    <Router>
      <div className='app'>
        <Navbar isAuthenticated={isAuthenticated} user={user} logout={logout} />
        <main className='container mt-4'>
          <ToastContainer position='top-right' autoClose={3000} />
          <Routes>
            <Route
              path='/'
              element={
                isAuthenticated ? (
                  <Navigate to='/dashboard' />
                ) : (
                  <Navigate to='/login' />
                )
              }
            />
            <Route
              path='/register'
              element={
                !isAuthenticated ? (
                  <Register login={login} />
                ) : (
                  <Navigate to='/dashboard' />
                )
              }
            />
            <Route
              path='/login'
              element={
                !isAuthenticated ? (
                  <Login login={login} />
                ) : (
                  <Navigate to='/dashboard' />
                )
              }
            />

            <Route
              path='/dashboard'
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <Dashboard user={user} />
                </ProtectedRoute>
              }
            />

            <Route
              path='/upload'
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <FileUpload user={user} />
                </ProtectedRoute>
              }
            />

            <Route
              path='/files'
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <FileList user={user} />
                </ProtectedRoute>
              }
            />

            <Route
              path='/transfer/initiate'
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <TransferInitiate user={user} />
                </ProtectedRoute>
              }
            />

            {/* <Route
              path='/transfer/:transferId'
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <TransferDetailsPage user={user} />
                </ProtectedRoute>
              }
            /> */}

            <Route
              path='/transfer/:transferId'
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <TransferDetails user={user} />
                </ProtectedRoute>
              }
            />

            {/* <Route
              path='/profile'
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

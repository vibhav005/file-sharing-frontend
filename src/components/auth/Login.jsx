// components/auth/Login.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const Login = ({ login }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { email, password } = formData;

  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const res = await axios.post("/api/auth/login", { email, password });
      login(res.data.token, { email });
      navigate("/dashboard");
    } catch (err) {
      const errorMsg =
        err.response?.data?.errors?.[0]?.msg || "Invalid credentials";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='auth-container'>
      <h1 className='text-center mb-4'>Sign In</h1>
      <div className='card'>
        <div className='card-body'>
          <form onSubmit={onSubmit}>
            <div className='mb-3'>
              <label htmlFor='email' className='form-label'>
                Email Address
              </label>
              <input
                type='email'
                className='form-control'
                id='email'
                name='email'
                value={email}
                onChange={onChange}
                required
              />
            </div>
            <div className='mb-3'>
              <label htmlFor='password' className='form-label'>
                Password
              </label>
              <input
                type='password'
                className='form-control'
                id='password'
                name='password'
                value={password}
                onChange={onChange}
                required
              />
            </div>
            <button
              type='submit'
              className='btn btn-primary w-100'
              disabled={loading}
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>
          <div className='mt-3 text-center'>
            Don't have an account? <Link to='/register'>Register</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

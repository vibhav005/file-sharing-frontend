// components/auth/Register.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const Register = ({ login }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    password2: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { email, password, password2 } = formData;

  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();

    if (password !== password2) {
      return toast.error("Passwords do not match");
    }

    try {
      setLoading(true);
      const res = await axios.post("/api/auth/register", { email, password });
      login(res.data.token, { email });
      navigate("/dashboard");
    } catch (err) {
      const errorMsg =
        err.response?.data?.errors?.[0]?.msg || "Registration failed";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='auth-container'>
      <h1 className='text-center mb-4'>Sign Up</h1>
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
                minLength='6'
                required
              />
            </div>
            <div className='mb-3'>
              <label htmlFor='password2' className='form-label'>
                Confirm Password
              </label>
              <input
                type='password'
                className='form-control'
                id='password2'
                name='password2'
                value={password2}
                onChange={onChange}
                minLength='6'
                required
              />
            </div>
            <button
              type='submit'
              className='btn btn-primary w-100'
              disabled={loading}
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </form>
          <div className='mt-3 text-center'>
            Already have an account? <Link to='/login'>Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

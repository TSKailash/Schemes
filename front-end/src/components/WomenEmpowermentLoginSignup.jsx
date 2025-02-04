import React from 'react';
import { Link } from 'react-router-dom';

const WomenEmpowermentLoginSignup = () => {
  return (
    <div className="relative h-screen bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
      <div className="text-center text-white z-10 space-y-4">
        <h1 className="text-5xl font-extrabold mb-4">Women Empowerment</h1>
        <p className="text-lg mb-6">
          Empowering women is the key to a better world. Together, we can make a difference.
        </p>
      </div>
      
      <div className="absolute right-10 top-1/2 transform -translate-y-1/2 flex flex-col items-center space-y-4">
        <Link to="/login">
          <button className="bg-purple-700 hover:bg-purple-800 text-white font-semibold py-3 px-8 rounded-full transition-all duration-300 shadow-lg">
            Login
          </button>
        </Link>
        <Link to="/signup">
          <button className="bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 px-8 rounded-full transition-all duration-300 shadow-lg">
            Signup
          </button>
        </Link>
      </div>
    </div>
  );
};

export default WomenEmpowermentLoginSignup;

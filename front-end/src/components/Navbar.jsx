import { useState } from "react";
import React from "react";
import { useAuth } from "./AuthProvider";
const Navbar = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <a href="/home" className="text-xl font-bold text-purple-800">
              WomenEmpowerment
            </a>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <a href="/home" className="text-gray-700 hover:text-purple-600">Home</a>
            {user ? (
              <>
              
                <button
                  onClick={logout}
                  className="text-gray-700 hover:text-purple-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <a href="/login" className="text-gray-700 hover:text-purple-600">Login</a>
                <a
                  href="/signup"
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  Sign Up
                </a>
              </>
            )}
          </div>
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900"
            >
              {isMenuOpen ? (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {isMenuOpen && (
          <div className="md:hidden pb-4">
            <a href="/" className="block py-2 text-gray-700 hover:text-purple-600">Home</a>
           
            {user ? (
              <>
                <button
                  onClick={logout}
                  className="block py-2 text-gray-700 hover:text-purple-600 w-full text-left"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <a href="/login" className="block py-2 text-gray-700 hover:text-purple-600">Login</a>
                <a href="/signup" className="block py-2 text-gray-700 hover:text-purple-600">Sign Up</a>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
export default Navbar;
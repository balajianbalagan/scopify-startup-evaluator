"use client";

import React from "react";

export default function ViewProfile() {
  // Mock user data
  const user = {
    name: "Balaji",
    email: "balaji@example.com",
    role: "Venture Capitalist",
    avatar: "https://ui-avatars.com/api/?name=Balaji&background=6366f1&color=fff",
    joined: "Jan 2024",
  };

  return (
    <div className="max-w-lg mx-auto mt-12 bg-white rounded-2xl shadow-xl p-8">
      <div className="flex flex-col items-center">
        <img
          src={user.avatar}
          alt={user.name}
          className="w-24 h-24 rounded-full mb-4 border-4 border-indigo-100"
        />
        <h2 className="text-2xl font-bold text-indigo-700 mb-1">{user.name}</h2>
        <p className="text-gray-500 mb-2">{user.role}</p>
        <p className="text-gray-600 text-sm mb-4">{user.email}</p>
        <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs">
          Joined {user.joined}
        </span>
      </div>
    </div>
  );
}
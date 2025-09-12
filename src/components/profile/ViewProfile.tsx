"use client";

import React from "react";
import { apiService } from "@/lib/api";

export default function ViewProfile() {
  const user = apiService.getUser();

  if (!user) {
    return (
      <div className="max-w-lg mx-auto mt-12 bg-white rounded-2xl shadow-xl p-8 text-center">
        <p className="text-gray-600">⚠️ You are not logged in.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-12 bg-white rounded-2xl shadow-xl p-8">
      <div className="flex flex-col items-center">
        <img
          src={`https://ui-avatars.com/api/?name=${user.email}&background=6366f1&color=fff`}
          alt={user.email}
          className="w-24 h-24 rounded-full mb-4 border-4 border-indigo-100"
        />
        <h2 className="text-2xl font-bold text-indigo-700 mb-1">{user.email}</h2>
        <p className="text-gray-500 mb-2 capitalize">{user.role}</p>
        <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs">
          Active: {user.is_active ? "Yes" : "No"}
        </span>
      </div>
    </div>
  );
}

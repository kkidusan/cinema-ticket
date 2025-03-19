"use client";
import React from "react";

export default function StatisticsPage() {
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Statistics</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">User Statistics</h2>
        <p>Total Owners: 100</p>
        <p>Total App Users: 500</p>
        <p>Active Users: 400</p>
        <p>Pending Owners: 10</p>
      </div>
    </div>
  );
}
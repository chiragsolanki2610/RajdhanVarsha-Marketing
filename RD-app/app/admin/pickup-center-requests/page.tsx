"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import LoginTopbar from "@/components/loginTopbar";

interface PickupCenterRequest {
  id: string;
  userName: string;
  userId: string;
  centerName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactNumber: string;
  requestDate: string;
  status: "pending" | "approved" | "rejected";
}

export default function PickupCenterRequestsPage() {
  const [requests, setRequests] = useState<PickupCenterRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] =
    useState<PickupCenterRequest | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pickup-center-requests");
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error("Failed to fetch pickup center requests", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/admin/pickup-center-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Action failed");

      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: action === "approve" ? "approved" : "rejected" }
            : r
        )
      );
      setSelectedRequest(null);
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <LoginTopbar />

        <main className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Pickup Center Requests
              </h1>
              <p className="text-gray-500 mt-1">
                Pending requests —{" "}
                <span className="text-orange-500 font-medium">
                  {pendingCount} pending
                </span>
              </p>
            </div>
            <button
              onClick={fetchRequests}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
            >
              ↻ Refresh
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                  <th className="px-6 py-3 font-medium">User Details</th>
                  <th className="px-6 py-3 font-medium">Center Name</th>
                  <th className="px-6 py-3 font-medium">Location</th>
                  <th className="px-6 py-3 font-medium">Contact</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Loading requests...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No pickup center requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr
                      key={req.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {req.userName}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {req.userId}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {req.centerName}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {req.city}, {req.state}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {req.contactNumber}
                      </td>
                      <td className="px-6 py-4 text-gray-700 text-sm">
                        {new Date(req.requestDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            req.status === "approved"
                              ? "bg-green-100 text-green-700"
                              : req.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {req.status.charAt(0).toUpperCase() +
                            req.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {req.status === "pending" ? (
                          <div className="flex gap-2">
                            <button
                              disabled={actionLoadingId === req.id}
                              onClick={() => handleAction(req.id, "approve")}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              disabled={actionLoadingId === req.id}
                              onClick={() => handleAction(req.id, "reject")}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            No action needed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* Detail modal for full address */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {selectedRequest.centerName}
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <span className="font-medium">Requested by:</span>{" "}
                {selectedRequest.userName} ({selectedRequest.userId})
              </p>
              <p>
                <span className="font-medium">Address:</span>{" "}
                {selectedRequest.address}
              </p>
              <p>
                <span className="font-medium">City/State:</span>{" "}
                {selectedRequest.city}, {selectedRequest.state} -{" "}
                {selectedRequest.pincode}
              </p>
              <p>
                <span className="font-medium">Contact:</span>{" "}
                {selectedRequest.contactNumber}
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100"
              >
                Close
              </button>
              {selectedRequest.status === "pending" && (
                <>
                  <button
                    onClick={() => handleAction(selectedRequest.id, "reject")}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleAction(selectedRequest.id, "approve")}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                  >
                    Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

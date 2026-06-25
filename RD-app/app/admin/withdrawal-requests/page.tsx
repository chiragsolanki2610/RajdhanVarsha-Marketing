"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import LoginTopbar from "@/components/loginTopbar";

interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
}

interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  status: string;
  createdAt: string;
  plan?: string;
  bankDetails: BankDetails;
}

export default function AdminWithdrawalPage() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);

  const API = "https://rd-api-j7zj.onrender.com";

  const getAuthHeaders = (): Record<string, string> => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      return {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };
    }
    return { "Content-Type": "application/json" };
  };

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API}/api/admin/withdrawals`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error("Unauthorized! Please log in first.");
        throw new Error(`Failed to fetch requests (Status: ${response.status}).`);
      }

      const data = await response.json();

      const normalized: WithdrawalRequest[] = data.map((r: any) => ({
        id: r.id ?? r.Id,
        userName: r.userName ?? r.UserName ?? "Unknown",
        userId: r.userId ?? r.UserId ?? "—",
        amount: r.amount ?? r.Amount ?? 0,
        status: r.status ?? r.Status ?? "",
        createdAt: r.createdAt ?? r.CreatedAt ?? null,
        plan: r.plan ?? r.Plan ?? null,
        bankDetails: {
          bankName: r.bankDetails?.bankName ?? r.BankDetails?.BankName ?? r.bankDetails?.BankName ?? "N/A",
          accountNumber: r.bankDetails?.accountNumber ?? r.BankDetails?.AccountNumber ?? r.bankDetails?.AccountNumber ?? "N/A",
          ifscCode: r.bankDetails?.ifscCode ?? r.BankDetails?.IfscCode ?? r.bankDetails?.IfscCode ?? "N/A",
        },
      }));

      const pendingOnly = normalized
        .filter((r) => r.status?.toUpperCase() === "PENDING")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setRequests(pendingOnly);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const handleApprove = async (id: string) => {
    if (!confirm("Are you sure you want to approve this withdrawal?")) return;
    try {
      const response = await fetch(`${API}/api/admin/withdrawals/${id}/approve`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      });

      if (response.ok) {
        alert("Withdrawal approved successfully!");
        setSelectedRequest(null);
        fetchWithdrawals();
      } else {
        const errorData = await response.text();
        alert(`Failed to approve: ${errorData || ""}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this withdrawal?")) return;
    try {
      const response = await fetch(`${API}/api/admin/withdrawals/${id}/reject`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      });

      if (response.ok) {
        alert("Withdrawal rejected successfully.");
        setSelectedRequest(null);
        fetchWithdrawals();
      } else {
        const errorData = await response.text();
        alert(`Failed to reject: ${errorData || ""}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderLayoutContent = (children: React.ReactNode) => (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <LoginTopbar />
        <main className="p-6 flex-1 flex justify-center items-center">{children}</main>
      </div>
    </div>
  );

  if (loading) return renderLayoutContent(<div className="text-gray-600 font-medium">Loading withdrawal requests...</div>);
  if (error) return renderLayoutContent(<div className="text-red-500 font-medium">Error: {error}</div>);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <LoginTopbar />

        <main className="p-6 max-w-5xl w-full mx-auto flex-1">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Admin Withdrawal Requests</h1>
              <p className="text-gray-600 text-sm">
                Pending requests —{" "}
                <span className="text-yellow-700 font-semibold">{requests.length} pending</span>
              </p>
            </div>
            <button
              onClick={fetchWithdrawals}
              className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2 rounded shadow-sm transition"
            >
              ↻ Refresh
            </button>
          </div>

          <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-3">User Details</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white text-gray-900">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                      No pending withdrawal requests.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{req.userName}</div>
                        <div className="text-xs text-gray-500">ID: {req.userId}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-800">
                        ₹{req.amount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {req.createdAt
                          ? new Date(req.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded transition shadow-sm"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Request Inspection</h3>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-gray-600 transition text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                <span className="text-gray-500 font-medium">User Name:</span>
                <span className="text-gray-900 font-semibold">{selectedRequest.userName}</span>

                <span className="text-gray-500 font-medium">User ID:</span>
                <span className="text-gray-900 font-mono">{selectedRequest.userId}</span>

                <span className="text-gray-500 font-medium">Active Plan:</span>
                <span className="text-blue-700 font-semibold">{selectedRequest.plan || "Standard Plan"}</span>

                <span className="text-gray-500 font-medium">Amount Requested:</span>
                <span className="text-emerald-700 font-bold text-base">
                  ₹{selectedRequest.amount?.toLocaleString()}
                </span>

                <span className="text-gray-500 font-medium">Date:</span>
                <span className="text-gray-700 text-xs">
                  {selectedRequest.createdAt
                    ? new Date(selectedRequest.createdAt).toLocaleString("en-IN")
                    : "—"}
                </span>
              </div>

              <hr className="border-gray-200 my-2" />

              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  KYC / Settlement Bank Info
                </h4>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bank Name:</span>
                    <span className="text-gray-900 font-medium">{selectedRequest.bankDetails?.bankName || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account No:</span>
                    <span className="text-gray-900 font-mono font-medium">{selectedRequest.bankDetails?.accountNumber || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">IFSC Code:</span>
                    <span className="text-gray-900 font-mono font-medium">{selectedRequest.bankDetails?.ifscCode || "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setSelectedRequest(null)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold px-4 py-2 rounded transition"
              >
                Close
              </button>
              <button
                onClick={() => handleReject(selectedRequest.id)}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded transition shadow-sm"
              >
                Reject
              </button>
              <button
                onClick={() => handleApprove(selectedRequest.id)}
                className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded transition shadow-sm"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import LoginTopbar from "@/components/loginTopbar";

const API_BASE = "https://rd-api-j7zj.onrender.com";

/* ============================================================
   Shared
   ============================================================ */

type SectionTab = "requests" | "orders";

/* ============================================================
   Pickup Center Requests (existing, unchanged behavior)
   ============================================================ */

interface PickupCenterRequest {
  id: number;
  username: string;
  phone: string;
  fullName: string;
  aadharNumber: string;
  aadharImageBase64: string | null;
  panNumber: string;
  panImageBase64: string | null;
  accountNumber: string;
  ifscCode: string;
  passbookImageBase64: string | null;
  centerName: string;
  centerAddress: string;
  status: "Pending" | "Approved" | "Rejected";
  submittedAt: string;
  generatedPucId: string | null;
}

/* ============================================================
   Pickup Center Orders
   Wired to the real backend:
     GET /api/Admin/pickup-center-orders?status=...
     GET /api/Admin/pickup-center-orders/{id}
     PUT /api/Admin/pickup-center-orders/{id}/status
   Matches RegisterApi.DTOs.PickupCenterOrderDto exactly.
   ============================================================ */

interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  dp: number;
  bv: number;
  lineTotal: number;
}

interface PickupCenterOrder {
  id: number;
  pucId: string; // pickup center id, e.g. RDPUC2001
  centerName: string;
  contactName: string;
  contactPhone: string;
  items: OrderItem[];
  subTotalDp: number;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
  totalBv: number;
  utrNumber: string;
  screenshotUrl: string | null;
  status: "Pending" | "Accepted" | "Rejected";
  requestedAt: string;
  processedAt: string | null;
  rejectionReason?: string | null;
}

export default function PickupCenterRequestsPage() {
  const [activeTab, setActiveTab] = useState<SectionTab>("requests");

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <LoginTopbar />

        <main className="p-8">
          {/* Section tabs */}
          <div className="mb-6 flex w-fit rounded-full border border-gray-200 bg-gray-100 p-1">
            <button
              onClick={() => setActiveTab("requests")}
              className={`rounded-full px-6 py-2 text-sm font-semibold transition ${
                activeTab === "requests"
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Pickup Center Requests
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`rounded-full px-6 py-2 text-sm font-semibold transition ${
                activeTab === "orders"
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Pickup Center Orders
            </button>
          </div>

          {activeTab === "requests" ? <RequestsSection /> : <OrdersSection />}
        </main>
      </div>
    </div>
  );
}

/* ============================================================
   Requests Section (moved out of the page component, logic unchanged)
   ============================================================ */

function RequestsSection() {
  const [requests, setRequests] = useState<PickupCenterRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] =
    useState<PickupCenterRequest | null>(null);

  const authHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/Admin/pickup-center-requests`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch pickup center requests.");
      const data = await res.json();
      setRequests(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: number, action: "Approved" | "Rejected") => {
    if (action === "Rejected") {
      const reason = window.prompt("Optional: reason for rejection") || undefined;
      await submitStatus(id, action, reason);
      return;
    }
    await submitStatus(id, action);
  };

  const submitStatus = async (
    id: number,
    status: "Approved" | "Rejected",
    rejectionReason?: string
  ) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(
        `${API_BASE}/api/Admin/pickup-center-requests/${id}/status`,
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ status, rejectionReason }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Action failed");
      }

      const data = await res.json();

      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status,
                generatedPucId: status === "Approved" ? data.pucId : r.generatedPucId,
              }
            : r
        )
      );
      setSelectedRequest(null);

      if (status === "Approved") {
        alert(`Approved. Pickup Center ID generated: ${data.pucId}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Something went wrong. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "Pending").length;

  return (
    <>
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

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <th className="px-6 py-3 font-medium">User Details</th>
              <th className="px-6 py-3 font-medium">Center Name</th>
              <th className="px-6 py-3 font-medium">Address</th>
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
                      {req.fullName}
                    </div>
                    <div className="text-xs text-gray-500">
                      @{req.username}
                      {req.generatedPucId && ` · ${req.generatedPucId}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {req.centerName}
                  </td>
                  <td className="px-6 py-4 text-gray-700 text-sm">
                    {req.centerAddress.slice(0, 30)}
                    {req.centerAddress.length > 30 ? "…" : ""}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {req.phone}
                  </td>
                  <td className="px-6 py-4 text-gray-700 text-sm">
                    {new Date(req.submittedAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        req.status === "Approved"
                          ? "bg-green-100 text-green-700"
                          : req.status === "Rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-100"
                      >
                        View
                      </button>
                      {req.status === "Pending" && (
                        <>
                          <button
                            disabled={actionLoadingId === req.id}
                            onClick={() => handleAction(req.id, "Approved")}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            disabled={actionLoadingId === req.id}
                            onClick={() => handleAction(req.id, "Rejected")}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail modal for full application info */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {selectedRequest.centerName}
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <span className="font-medium">Applicant:</span>{" "}
                {selectedRequest.fullName} (@{selectedRequest.username})
              </p>
              <p>
                <span className="font-medium">Phone:</span>{" "}
                {selectedRequest.phone}
              </p>
              <p>
                <span className="font-medium">Center Address:</span>{" "}
                {selectedRequest.centerAddress}
              </p>
              <p>
                <span className="font-medium">Aadhar No:</span>{" "}
                {selectedRequest.aadharNumber}
              </p>
              <p>
                <span className="font-medium">PAN No:</span>{" "}
                {selectedRequest.panNumber}
              </p>
              <p>
                <span className="font-medium">Account No:</span>{" "}
                {selectedRequest.accountNumber}
              </p>
              <p>
                <span className="font-medium">IFSC:</span>{" "}
                {selectedRequest.ifscCode}
              </p>
              {selectedRequest.generatedPucId && (
                <p>
                  <span className="font-medium">PUC ID:</span>{" "}
                  {selectedRequest.generatedPucId}
                </p>
              )}

              <div className="grid grid-cols-3 gap-2 pt-2">
                {selectedRequest.aadharImageBase64 && (
                  <img
                    src={selectedRequest.aadharImageBase64}
                    alt="Aadhar"
                    className="rounded-lg border h-24 w-full object-cover"
                  />
                )}
                {selectedRequest.panImageBase64 && (
                  <img
                    src={selectedRequest.panImageBase64}
                    alt="PAN"
                    className="rounded-lg border h-24 w-full object-cover"
                  />
                )}
                {selectedRequest.passbookImageBase64 && (
                  <img
                    src={selectedRequest.passbookImageBase64}
                    alt="Passbook"
                    className="rounded-lg border h-24 w-full object-cover"
                  />
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100"
              >
                Close
              </button>
              {selectedRequest.status === "Pending" && (
                <>
                  <button
                    onClick={() => handleAction(selectedRequest.id, "Rejected")}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleAction(selectedRequest.id, "Approved")}
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
    </>
  );
}

/* ============================================================
   Orders Section
   Backed by:
     GET /api/Admin/pickup-center-orders
     PUT /api/Admin/pickup-center-orders/{id}/status
   ============================================================ */

function OrdersSection() {
  const [orders, setOrders] = useState<PickupCenterOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PickupCenterOrder | null>(null);

  const authHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/Admin/pickup-center-orders`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch pickup center orders.");
      const data = await res.json();
      setOrders(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAction = async (id: number, action: "Accepted" | "Rejected") => {
    if (action === "Rejected") {
      const reason = window.prompt("Optional: reason for rejection") || undefined;
      await submitOrderStatus(id, action, reason);
      return;
    }
    await submitOrderStatus(id, action);
  };

  const submitOrderStatus = async (
    id: number,
    status: "Accepted" | "Rejected",
    rejectionReason?: string
  ) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(
        `${API_BASE}/api/Admin/pickup-center-orders/${id}/status`,
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ status, rejectionReason }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Action failed");
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                status,
                rejectionReason: rejectionReason ?? o.rejectionReason,
              }
            : o
        )
      );
      setSelectedOrder(null);

      if (status === "Accepted") {
        alert("Order accepted. Stock added to the pickup center's inventory.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Something went wrong. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingCount = orders.filter((o) => o.status === "Pending").length;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Pickup Center Orders
          </h1>
          <p className="text-gray-500 mt-1">
            Pending orders —{" "}
            <span className="text-orange-500 font-medium">
              {pendingCount} pending
            </span>
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <th className="px-6 py-3 font-medium">Pickup Center</th>
              <th className="px-6 py-3 font-medium">Contact</th>
              <th className="px-6 py-3 font-medium">Items</th>
              <th className="px-6 py-3 font-medium">Total</th>
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  Loading orders...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No pickup center orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {order.centerName}
                    </div>
                    <div className="text-xs text-gray-500">{order.pucId}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    <div>{order.contactName}</div>
                    <div className="text-xs text-gray-500">{order.contactPhone}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-700 text-sm">
                    {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                  </td>
                  <td className="px-6 py-4 text-gray-700 text-sm">
                    ₹{order.totalAmount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-4 text-gray-700 text-sm">
                    {new Date(order.requestedAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        order.status === "Accepted"
                          ? "bg-green-100 text-green-700"
                          : order.status === "Rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-100"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail modal: product list + qty + accept/reject */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-1">
              {selectedOrder.centerName}
            </h3>
            <p className="text-xs text-gray-500 mb-4">{selectedOrder.pucId}</p>

            <div className="space-y-2 text-sm text-gray-700 mb-4">
              <p>
                <span className="font-medium">Contact:</span>{" "}
                {selectedOrder.contactName} · {selectedOrder.contactPhone}
              </p>
              <p>
                <span className="font-medium">UTR / Transaction ID:</span>{" "}
                {selectedOrder.utrNumber}
              </p>
              <p>
                <span className="font-medium">Ordered On:</span>{" "}
                {new Date(selectedOrder.requestedAt).toLocaleDateString("en-IN")}
              </p>
              {selectedOrder.rejectionReason && (
                <p>
                  <span className="font-medium">Rejection Reason:</span>{" "}
                  {selectedOrder.rejectionReason}
                </p>
              )}
              {selectedOrder.screenshotUrl && (
                <div>
                  <span className="font-medium block mb-1">
                    Payment Screenshot:
                  </span>
                  <img
                    src={selectedOrder.screenshotUrl}
                    alt="Payment screenshot"
                    className="rounded-lg border max-h-48 object-contain"
                  />
                </div>
              )}
            </div>

            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Ordered Products
            </h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs uppercase text-gray-500">
                    <th className="px-4 py-2 font-medium">Product</th>
                    <th className="px-4 py-2 font-medium text-right">Qty</th>
                    <th className="px-4 py-2 font-medium text-right">DP</th>
                    <th className="px-4 py-2 font-medium text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item) => (
                    <tr key={item.productId} className="border-t border-gray-100">
                      <td className="px-4 py-2 text-gray-800">{item.productName}</td>
                      <td className="px-4 py-2 text-right text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700">
                        ₹{item.dp.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700">
                        ₹{item.lineTotal.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td colSpan={3} className="px-4 py-2 text-right text-gray-700">
                      Subtotal (DP)
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">
                      ₹{selectedOrder.subTotalDp.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  {selectedOrder.discountAmount > 0 && (
                    <tr className="border-t border-gray-100 bg-gray-50">
                      <td colSpan={3} className="px-4 py-2 text-right text-gray-700">
                        Discount ({selectedOrder.discountPercent}%)
                      </td>
                      <td className="px-4 py-2 text-right text-red-600">
                        −₹{selectedOrder.discountAmount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td colSpan={3} className="px-4 py-2 text-right font-medium text-gray-900">
                      Total
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-gray-900">
                      ₹{selectedOrder.totalAmount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="px-4 py-2 text-right text-gray-500 text-xs">
                      Total BV
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500 text-xs">
                      {selectedOrder.totalBv.toLocaleString("en-IN")} BV
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100"
              >
                Close
              </button>
              {selectedOrder.status === "Pending" && (
                <>
                  <button
                    disabled={actionLoadingId === selectedOrder.id}
                    onClick={() => handleAction(selectedOrder.id, "Rejected")}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    disabled={actionLoadingId === selectedOrder.id}
                    onClick={() => handleAction(selectedOrder.id, "Accepted")}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    Accept &amp; Add to Inventory
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
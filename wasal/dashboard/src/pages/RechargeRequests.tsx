import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { getSocket } from '../services/socket';
import { playNotificationSound } from '../utils/sound';
import { Wallet, Check, X, Clock, User, Hash, Banknote } from 'lucide-react';

interface RechargeRequest {
  _id: string;
  driver: { _id: string; name: string; phone: string; balance: number } | null;
  method: 'bank' | 'cash';
  transactionLast6: string | null;
  amountSent: number;
  status: 'pending' | 'approved' | 'rejected';
  approvedAmount?: number | null;
  reviewedBy?: { name?: string } | null;
  reviewedAt?: string | null;
  reviewNote?: string;
  createdAt: string;
}

export default function RechargeRequests() {
  const [requests, setRequests] = useState<RechargeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [activeTab, setActiveTab] = useState<'overview' | 'drivers' | 'orders' | 'users' | 'analytics' | 'settings' | 'admin-management' | 'logs' | 'cities' | 'recharge-requests'>('recharge-requests');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveAmount, setApproveAmount] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  // Live updates: play a sound and refresh the list whenever a driver
  // submits a new recharge request while this page is open.
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    const socket = getSocket(token);
    const onNotification = (incoming: any) => {
      if (incoming?.type === 'recharge_requested') {
        if (incoming?.sound) playNotificationSound();
        fetchRequests();
      }
    };
    socket.on('notification:new', onNotification);
    return () => {
      socket.off('notification:new', onNotification);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchRequests = async () => {
    try {
      const response = await adminAPI.getRechargeRequests(filter === 'all' ? undefined : filter);
      setRequests(response.data.rechargeRequests || []);
    } catch (error) {
      console.error('Error fetching recharge requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const openApprove = (req: RechargeRequest) => {
    setApprovingId(req._id);
    setApproveAmount(String(req.amountSent));
    setRejectingId(null);
  };

  const openReject = (req: RechargeRequest) => {
    setRejectingId(req._id);
    setRejectReason('');
    setApprovingId(null);
  };

  const handleApprove = async (id: string) => {
    const amount = parseFloat(approveAmount);
    if (!amount || amount <= 0) {
      alert('يرجى إدخال قيمة صحيحة للرصيد');
      return;
    }
    setBusy(true);
    try {
      await adminAPI.approveRechargeRequest(id, amount);
      setApprovingId(null);
      setApproveAmount('');
      fetchRequests();
    } catch (error: any) {
      alert(error.response?.data?.message || 'فشلت الموافقة على الطلب');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (id: string) => {
    setBusy(true);
    try {
      await adminAPI.rejectRechargeRequest(id, rejectReason);
      setRejectingId(null);
      setRejectReason('');
      fetchRequests();
    } catch (error: any) {
      alert(error.response?.data?.message || 'فشل رفض الطلب');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab} onRefresh={fetchRequests}>
      <div className="max-w-4xl mx-auto space-y-4 mb-12">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-3 rounded-xl">
            <Wallet className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-green-800">طلبات شحن الرصيد</h1>
            <p className="text-slate-500 mt-1">مراجعة طلبات شحن رصيد المندوبين عبر التحويل البنكي (بنكك)</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === f ? 'bg-green-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
            >
              {f === 'pending' ? 'قيد المراجعة' : f === 'approved' ? 'موافق عليها' : f === 'rejected' ? 'مرفوضة' : 'الكل'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">جاري التحميل...</div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center text-slate-400 border border-slate-100">
            لا توجد طلبات شحن حالياً
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req._id} className="bg-white rounded-xl p-4 shadow-xs border border-slate-100">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-yellow-100 p-2.5 rounded-lg">
                      <User className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{req.driver?.name || 'مندوب محذوف'}</div>
                      <div className="text-sm text-slate-500">{req.driver?.phone}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        الرصيد الحالي: {(req.driver?.balance ?? 0).toFixed(2)} جنيه
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-slate-600">
                      <Hash className="w-4 h-4" />
                      آخر 6 أرقام: <span className="font-bold">{req.transactionLast6 || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <Banknote className="w-4 h-4" />
                      المبلغ المرسل: <span className="font-bold">{req.amountSent.toFixed(2)} جنيه</span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full h-fit ${req.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : req.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                      }`}
                  >
                    {req.status === 'pending' ? 'قيد المراجعة' : req.status === 'approved' ? 'تمت الموافقة' : 'مرفوض'}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-400 mt-3">
                  <Clock className="w-3.5 h-3.5" />
                  تاريخ الطلب: {new Date(req.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                  {req.reviewedAt && (
                    <span className="mr-3">
                      — تمت المراجعة: {new Date(req.reviewedAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                      {req.reviewedBy?.name ? ` بواسطة ${req.reviewedBy.name}` : ''}
                    </span>
                  )}
                  {req.status === 'approved' && req.approvedAmount != null && (
                    <span className="mr-3 text-green-600 font-semibold">تم إضافة {req.approvedAmount.toFixed(2)} جنيه</span>
                  )}
                  {req.status === 'rejected' && req.reviewNote && (
                    <span className="mr-3 text-red-600 font-semibold">سبب الرفض: {req.reviewNote}</span>
                  )}
                </div>

                {req.status === 'pending' && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    {approvingId === req._id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="number"
                          value={approveAmount}
                          onChange={(e) => setApproveAmount(e.target.value)}
                          placeholder="قيمة الرصيد المراد إضافتها"
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                        <button
                          disabled={busy}
                          onClick={() => handleApprove(req._id)}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-bold px-4 py-2 rounded-lg"
                        >
                          تأكيد وإضافة الرصيد
                        </button>
                        <button onClick={() => setApprovingId(null)} className="text-slate-500 text-sm px-3 py-2">
                          إلغاء
                        </button>
                      </div>
                    ) : rejectingId === req._id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="سبب الرفض (اختياري)"
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-red-400"
                        />
                        <button
                          disabled={busy}
                          onClick={() => handleReject(req._id)}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-bold px-4 py-2 rounded-lg"
                        >
                          تأكيد الرفض
                        </button>
                        <button onClick={() => setRejectingId(null)} className="text-slate-500 text-sm px-3 py-2">
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openApprove(req)}
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-lg"
                        >
                          <Check className="w-4 h-4" /> موافقة
                        </button>
                        <button
                          onClick={() => openReject(req)}
                          className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold px-4 py-2 rounded-lg"
                        >
                          <X className="w-4 h-4" /> رفض
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Circle, RefreshCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { p04Api } from '../../services/api';
import { Packing } from '../../types';

function formatDateTime(value?: string) {
  return value ? new Date(value).toLocaleString('vi-VN') : '-';
}

const steps = [
  { key: 'PENDING', label: 'Chờ đóng gói' },
  { key: 'PACKING', label: 'Đang đóng gói' },
  { key: 'PACKED', label: 'Đã đóng gói' },
  { key: 'SEALED', label: 'Đã niêm phong' },
  { key: 'ON_CONVEYOR', label: 'Lên băng chuyền' },
] as const;

export default function PackingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [packing, setPacking] = useState<Packing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weight, setWeight] = useState('');
  const [dimension, setDimension] = useState('');
  const [cartonId, setCartonId] = useState('');
  const [palletId, setPalletId] = useState('');
  const [reason, setReason] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await p04Api.getPacking(id);
      setPacking(((response as { packing?: Packing })?.packing ?? response) as Packing);
    } catch (err) {
      console.error(err);
      setError('Không thể tải chi tiết đóng gói.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const run = async (action: () => Promise<unknown>) => {
    if (!packing) return;
    setActionError('');
    setIsSubmitting(true);
    try {
      await action();
      await load();
    } catch (err) {
      console.error(err);
      setActionError('Thao tác thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canStart = useMemo(() => !!packing && packing.status === 'PENDING' && ['STAFF', 'ADMIN'].includes(user?.role ?? ''), [packing, user?.role]);
  const canPack = useMemo(() => !!packing && packing.status === 'PACKING' && ['STAFF', 'ADMIN'].includes(user?.role ?? ''), [packing, user?.role]);
  const canSeal = useMemo(() => !!packing && packing.status === 'PACKED' && ['STAFF', 'ADMIN'].includes(user?.role ?? ''), [packing, user?.role]);
  const canConveyor = useMemo(() => !!packing && packing.status === 'SEALED' && ['STAFF', 'ADMIN'].includes(user?.role ?? ''), [packing, user?.role]);
  const canSort = useMemo(() => !!packing && packing.status === 'ON_CONVEYOR' && ['STAFF', 'ADMIN'].includes(user?.role ?? ''), [packing, user?.role]);
  const canUpdateGrouping = useMemo(() => !!packing && ['PACKING', 'PACKED'].includes(packing.status) && ['STAFF', 'ADMIN'].includes(user?.role ?? ''), [packing, user?.role]);
  const canCancel = useMemo(() => !!packing && ['ADMIN'].includes(user?.role ?? '') && !['SEALED', 'ON_CONVEYOR', 'CANCELLED'].includes(packing.status), [packing, user?.role]);

  if (loading) {
    return <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" /></div>;
  }

  if (error || !packing) {
    return <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"><div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-600" /><p className="text-sm text-red-700">{error || 'Không tìm thấy phiếu đóng gói.'}</p></div></div>;
  }

  const currentIndex = Math.max(0, steps.findIndex((step) => step.key === packing.status));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <button onClick={() => navigate('/packings')} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-2">
          <ArrowLeft className="w-4 h-4" />Quay lại danh sách
        </button>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{packing.packingNumber}</h3>
            <p className="text-sm text-gray-500 mt-1">Outbound: {packing.outbound?.outboundNumber ?? '-'}</p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{packing.status}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {steps.map((step, index) => {
            const isDone = index < currentIndex;
            const isCurrent = index === currentIndex;
            return (
              <div key={step.key} className="flex flex-col items-center text-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${isDone ? 'bg-green-100 border-green-500 text-green-600' : isCurrent ? 'bg-indigo-100 border-indigo-500 text-indigo-600' : 'bg-gray-100 border-gray-300 text-gray-400'}`}>
                  {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </div>
                <p className="text-xs font-medium text-gray-800">{step.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Thông tin đóng gói</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Packer</p><p className="font-medium text-gray-800 mt-1">{packing.packer?.name ?? '-'}</p></div>
              <div><p className="text-gray-500">Cập nhật</p><p className="font-medium text-gray-800 mt-1">{formatDateTime(packing.updatedAt)}</p></div>
              <div><p className="text-gray-500">Carton</p><p className="font-medium text-gray-800 mt-1">{packing.cartonId ?? '-'}</p></div>
              <div><p className="text-gray-500">Pallet</p><p className="font-medium text-gray-800 mt-1">{packing.palletId ?? '-'}</p></div>
              <div><p className="text-gray-500">Khối lượng</p><p className="font-medium text-gray-800 mt-1">{packing.weight ?? '-'}</p></div>
              <div><p className="text-gray-500">Kích thước</p><p className="font-medium text-gray-800 mt-1">{packing.dimension ?? '-'}</p></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Sản phẩm outbound</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600"><th className="px-4 py-3 text-left">Sản phẩm</th><th className="px-4 py-3 text-left">SL</th><th className="px-4 py-3 text-left">Đã lấy</th></tr>
                </thead>
                <tbody>
                  {packing.outbound?.items?.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100">
                      <td className="px-4 py-3"><p className="font-medium">{item.product?.name ?? '-'}</p><p className="text-xs text-gray-500">{item.product?.sku ?? '-'}</p></td>
                      <td className="px-4 py-3">{item.quantity}</td>
                      <td className="px-4 py-3">{item.pickedQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Thao tác xử lý</h4>
            <div className="space-y-3">
              <button disabled={!canStart || isSubmitting} onClick={() => run(() => p04Api.start(packing.id))} className="w-full px-4 py-2 rounded-lg border-2 border-slate-800">Bắt đầu đóng gói</button>
              <button disabled={!canPack || isSubmitting} onClick={() => run(() => p04Api.packed(packing.id, cartonId || undefined, palletId || undefined))} className="w-full px-4 py-2 rounded-lg border-2 border-gray-900">Đánh dấu đã đóng gói</button>
              <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Khối lượng" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <input value={dimension} onChange={(e) => setDimension(e.target.value)} placeholder="Kích thước" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <button disabled={!canSeal || isSubmitting} onClick={() => run(() => p04Api.seal(packing.id, weight ? Number(weight) : undefined, dimension || undefined))} className="w-full px-4 py-2 rounded-lg border-2 border-green-600">Niêm phong</button>
              <button disabled={!canConveyor || isSubmitting} onClick={() => run(() => p04Api.onConveyor(packing.id))} className="w-full px-4 py-2 rounded-lg border-2 border-gray-900">Đẩy lên băng chuyền</button>
              <button disabled={!canSort || isSubmitting} onClick={() => run(() => p04Api.moveToSorting(packing.id))} className="w-full px-4 py-2 rounded-lg border-2 border-green-600">Chuyển sang phân loại</button>
              <input value={cartonId} onChange={(e) => setCartonId(e.target.value)} placeholder="Carton ID" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <input value={palletId} onChange={(e) => setPalletId(e.target.value)} placeholder="Pallet ID" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <button disabled={!canUpdateGrouping || isSubmitting} onClick={() => run(() => p04Api.updateGrouping(packing.id, cartonId || undefined, palletId || undefined))} className="w-full px-4 py-2 rounded-lg border-2 border-gray-900">Cập nhật grouping</button>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do hủy" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <button disabled={!canCancel || isSubmitting} onClick={() => run(() => p04Api.cancel(packing.id, reason || undefined))} className="w-full px-4 py-2 rounded-lg border-2 border-red-600 text-red-600">Hủy phiếu</button>
            </div>
            {isSubmitting && <div className="mt-4 flex items-center gap-2 text-sm text-gray-500"><RefreshCcw className="w-4 h-4 animate-spin" />Đang xử lý...</div>}
            {actionError && <div className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">{actionError}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

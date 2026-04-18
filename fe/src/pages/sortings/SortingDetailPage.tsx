import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, RefreshCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { p05Api } from '../../services/api';
import { Sorting, SortingStatus } from '../../types';

function formatDateTime(value?: string) {
  return value ? new Date(value).toLocaleString('vi-VN') : '-';
}

function Badge({ status }: { status: SortingStatus }) {
  return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
}

const steps = ['PENDING', 'SORTING', 'SORTED', 'COMPLETED'] as const;

export default function SortingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sorting, setSorting] = useState<Sorting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passed, setPassed] = useState(true);
  const [notes, setNotes] = useState('');
  const [sizeCategory, setSizeCategory] = useState('');
  const [zone, setZone] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await p05Api.getSorting(id);
      setSorting(((response as { sorting?: Sorting })?.sorting ?? response) as Sorting);
    } catch (err) {
      console.error(err);
      setError('Không thể tải chi tiết phân loại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const run = async (action: () => Promise<unknown>) => {
    if (!sorting) return;
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

  const currentIndex = useMemo(() => steps.indexOf(sorting?.status ?? 'PENDING'), [sorting?.status]);
  const canStart = !!sorting && sorting.status === 'PENDING' && ['STAFF', 'ADMIN'].includes(user?.role ?? '');
  const canQc = !!sorting && ['PENDING', 'SORTING'].includes(sorting.status) && ['STAFF', 'ADMIN'].includes(user?.role ?? '');
  const canClassify = !!sorting && sorting.status === 'SORTING' && ['STAFF', 'ADMIN'].includes(user?.role ?? '');
  const canComplete = !!sorting && sorting.status === 'SORTED' && ['STAFF', 'ADMIN'].includes(user?.role ?? '');

  if (loading) {
    return <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" /></div>;
  }

  if (error || !sorting) {
    return <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"><div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-600" /><p className="text-sm text-red-700">{error || 'Không tìm thấy phiếu phân loại.'}</p></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <button onClick={() => navigate('/sortings')} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-2">
          <ArrowLeft className="w-4 h-4" />Quay lại danh sách
        </button>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{sorting.sortingNumber}</h3>
            <p className="text-sm text-gray-500 mt-1">Packing: {sorting.packing?.packingNumber ?? '-'}</p>
          </div>
          <Badge status={sorting.status} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="grid grid-cols-4 gap-3">
          {steps.map((step, index) => (
            <div key={step} className={`p-3 rounded-lg text-center border ${index <= currentIndex ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="text-sm font-medium">{step}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Thông tin phân loại</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Sorter</p><p className="font-medium text-gray-800 mt-1">{sorting.sorter?.name ?? '-'}</p></div>
              <div><p className="text-gray-500">Cập nhật</p><p className="font-medium text-gray-800 mt-1">{formatDateTime(sorting.updatedAt)}</p></div>
              <div className="md:col-span-2"><p className="text-gray-500">Ghi chú</p><p className="font-medium text-gray-800 mt-1">{sorting.notes ?? '-'}</p></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Packing item</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="px-4 py-3 text-left">Sản phẩm</th>
                    <th className="px-4 py-3 text-left">SL</th>
                  </tr>
                </thead>
                <tbody>
                  {sorting.packing?.outbound?.items?.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100">
                      <td className="px-4 py-3">{item.product?.sku ?? '-'}</td>
                      <td className="px-4 py-3">{item.quantity}</td>
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
              <button disabled={!canStart || isSubmitting} onClick={() => run(() => p05Api.start(sorting.id))} className="w-full px-4 py-2 rounded-lg border-2 border-slate-800">Bắt đầu phân loại</button>

              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ghi chú QC / phân loại" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setPassed(true)} className={`flex-1 px-3 py-2 rounded-lg border ${passed ? 'border-green-600 bg-green-50' : 'border-gray-300'}`}>Đạt</button>
                <button type="button" onClick={() => setPassed(false)} className={`flex-1 px-3 py-2 rounded-lg border ${!passed ? 'border-red-600 bg-red-50' : 'border-gray-300'}`}>Không đạt</button>
              </div>
              <button disabled={!canQc || isSubmitting} onClick={() => run(() => p05Api.qcCheck(sorting.id, passed, notes || undefined))} className="w-full px-4 py-2 rounded-lg border-2 border-gray-900">QC</button>

              <input value={sizeCategory} onChange={(e) => setSizeCategory(e.target.value)} placeholder="Size category" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Zone" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <button disabled={!canClassify || isSubmitting} onClick={() => run(() => p05Api.classify(sorting.id, sizeCategory || undefined, zone || undefined, notes || undefined))} className="w-full px-4 py-2 rounded-lg border-2 border-gray-900">Phân loại</button>
              <button disabled={!canComplete || isSubmitting} onClick={() => run(() => p05Api.complete(sorting.id))} className="w-full px-4 py-2 rounded-lg border-2 border-green-600">Hoàn tất & tạo shipment</button>
            </div>
            {isSubmitting && <div className="mt-4 flex items-center gap-2 text-sm text-gray-500"><RefreshCcw className="w-4 h-4 animate-spin" />Đang xử lý...</div>}
            {actionError && <div className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">{actionError}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

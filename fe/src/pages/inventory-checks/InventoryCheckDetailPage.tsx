import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, RefreshCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { inventoryCheckApi } from '../../services/api';
import { InventoryCheck } from '../../types';

function formatDateTime(value?: string) { return value ? new Date(value).toLocaleString('vi-VN') : '-'; }
function Badge({ status }: { status: string }) { return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>; }

export default function InventoryCheckDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [check, setCheck] = useState<InventoryCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [actualQty, setActualQty] = useState(0);
  const [notes, setNotes] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true); setError('');
    try {
      const response = await inventoryCheckApi.getCheck(id);
      setCheck(((response as { check?: InventoryCheck })?.check ?? response) as InventoryCheck);
    } catch (err) { console.error(err); setError('Không thể tải chi tiết kiểm kê.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const run = async (action: () => Promise<unknown>) => {
    if (!check) return;
    setIsSubmitting(true); setActionError('');
    try { await action(); await load(); } catch (err) { console.error(err); setActionError('Thao tác thất bại.'); } finally { setIsSubmitting(false); }
  };

  const canAct = !!check && ['QUALITY', 'ADMIN'].includes(user?.role ?? '');
  const currentItem = useMemo(() => check?.items.find((item) => item.id === selectedItemId) ?? check?.items[0], [check, selectedItemId]);

  useEffect(() => {
    if (currentItem) {
      setSelectedItemId(currentItem.id);
      setActualQty(currentItem.actualQty || currentItem.systemQty || 0);
    }
  }, [currentItem?.id]);

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" /></div>;
  if (error || !check) return <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"><div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-600" /><p className="text-sm text-red-700">{error || 'Không tìm thấy phiếu kiểm kê.'}</p></div></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <button onClick={() => navigate('/inventory-checks')} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-2"><ArrowLeft className="w-4 h-4" />Quay lại danh sách</button>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{check.checkNumber}</h3>
            <p className="text-sm text-gray-500 mt-1">Loại: {check.type}</p>
          </div>
          <Badge status={check.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Thông tin kiểm kê</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Checker</p><p className="font-medium text-gray-800 mt-1">{check.checker?.name ?? '-'}</p></div>
              <div><p className="text-gray-500">Cập nhật</p><p className="font-medium text-gray-800 mt-1">{formatDateTime(check.updatedAt)}</p></div>
              <div className="md:col-span-2"><p className="text-gray-500">Ghi chú</p><p className="font-medium text-gray-800 mt-1">{check.notes ?? '-'}</p></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Danh sách mặt hàng</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-gray-600"><th className="px-4 py-3 text-left">Sản phẩm</th><th className="px-4 py-3 text-left">System</th><th className="px-4 py-3 text-left">Actual</th><th className="px-4 py-3 text-left">Chênh lệch</th></tr></thead>
                <tbody>{check.items.map((item) => <tr key={item.id} className="border-t border-gray-100"><td className="px-4 py-3"><p className="font-medium">{item.product?.name ?? '-'}</p><p className="text-xs text-gray-500">{item.product?.sku ?? '-'}</p></td><td className="px-4 py-3">{item.systemQty}</td><td className="px-4 py-3">{item.actualQty}</td><td className="px-4 py-3">{item.discrepancy}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Thao tác xử lý</h4>
            <div className="space-y-3">
              <button disabled={!canAct || isSubmitting} onClick={() => run(() => inventoryCheckApi.start(check.id))} className="w-full px-4 py-2 rounded-lg border-2 border-slate-800">Bắt đầu kiểm kê</button>
              <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                {check.items.map((item) => <option key={item.id} value={item.id}>{item.product?.sku ?? item.productId}</option>)}
              </select>
              <input type="number" min={0} value={actualQty} onChange={(e) => setActualQty(Number(e.target.value) || 0)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ghi chú" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <button disabled={!canAct || isSubmitting || !selectedItemId} onClick={() => run(() => inventoryCheckApi.count(check.id, selectedItemId || currentItem?.id || '', actualQty, notes || undefined))} className="w-full px-4 py-2 rounded-lg border-2 border-gray-900">Ghi nhận số lượng</button>
              <button disabled={!canAct || isSubmitting || !selectedItemId} onClick={() => run(() => inventoryCheckApi.recount(check.id, [selectedItemId || currentItem?.id || ''], notes || undefined))} className="w-full px-4 py-2 rounded-lg border-2 border-gray-900">Recount item</button>
              <button disabled={!canAct || isSubmitting} onClick={() => run(() => inventoryCheckApi.review(check.id))} className="w-full px-4 py-2 rounded-lg border-2 border-gray-900">Review chênh lệch</button>
              <button disabled={!canAct || isSubmitting} onClick={() => run(() => inventoryCheckApi.approve(check.id, true, notes || undefined))} className="w-full px-4 py-2 rounded-lg border-2 border-green-600">Duyệt kiểm kê</button>
              <button disabled={!canAct || isSubmitting} onClick={() => run(() => inventoryCheckApi.adjust(check.id))} className="w-full px-4 py-2 rounded-lg border-2 border-gray-900">Ghi nhận điều chỉnh</button>
              <button disabled={!canAct || isSubmitting} onClick={() => run(() => inventoryCheckApi.complete(check.id, notes || undefined))} className="w-full px-4 py-2 rounded-lg border-2 border-green-600">Hoàn tất kiểm kê</button>
            </div>
            {isSubmitting && <div className="mt-4 flex items-center gap-2 text-sm text-gray-500"><RefreshCcw className="w-4 h-4 animate-spin" />Đang xử lý...</div>}
            {actionError && <div className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">{actionError}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

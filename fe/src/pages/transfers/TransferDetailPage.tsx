import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, RefreshCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { transferApi } from '../../services/api';
import { Transfer, TransferReconciliation, TransferStatus } from '../../types';

function formatDateTime(value?: string) { return value ? new Date(value).toLocaleString('vi-VN') : '-'; }
function Badge({ status }: { status: TransferStatus }) { return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>; }

export default function TransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [resolution, setResolution] = useState<'RESOLVED_SOURCE' | 'RESOLVED_DESTINATION' | 'WRITTEN_OFF'>('RESOLVED_SOURCE');

  const load = async () => {
    if (!id) return;
    setLoading(true); setError('');
    try {
      const response = await transferApi.getTransfer(id);
      setTransfer(((response as { transfer?: Transfer })?.transfer ?? response) as Transfer);
    } catch (err) { console.error(err); setError('Không thể tải chi tiết transfer.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const run = async (action: () => Promise<unknown>) => {
    if (!transfer) return;
    setIsSubmitting(true); setActionError('');
    try { await action(); await load(); } catch (err) { console.error(err); setActionError('Thao tác thất bại.'); } finally { setIsSubmitting(false); }
  };

  const canApprove = ['WAREHOUSE_DIRECTOR', 'ADMIN'].includes(user?.role ?? '');
  const canDispatch = ['STAFF', 'ADMIN'].includes(user?.role ?? '');
  const canReceive = ['STAFF', 'ADMIN'].includes(user?.role ?? '');
  const canCancel = ['ADMIN'].includes(user?.role ?? '');
  const canResolve = ['WAREHOUSE_DIRECTOR', 'ADMIN'].includes(user?.role ?? '');

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" /></div>;
  if (error || !transfer) return <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"><div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-600" /><p className="text-sm text-red-700">{error || 'Không tìm thấy transfer.'}</p></div></div>;

  const reconciliation = (transfer.reconciliations ?? [])[0] as TransferReconciliation | undefined;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <button onClick={() => navigate('/transfers')} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-2"><ArrowLeft className="w-4 h-4" />Quay lại danh sách</button>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{transfer.transferNumber}</h3>
            <p className="text-sm text-gray-500 mt-1">Từ {transfer.fromLocation?.name ?? transfer.fromLocationId} → {transfer.toLocation?.name ?? transfer.toLocationId}</p>
          </div>
          <Badge status={transfer.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Thông tin transfer</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Requested by</p><p className="font-medium text-gray-800 mt-1">{transfer.requestedBy?.name ?? '-'}</p></div>
              <div><p className="text-gray-500">Approved by</p><p className="font-medium text-gray-800 mt-1">{transfer.approvedBy?.name ?? '-'}</p></div>
              <div><p className="text-gray-500">Cập nhật</p><p className="font-medium text-gray-800 mt-1">{formatDateTime(transfer.updatedAt)}</p></div>
              <div><p className="text-gray-500">Ghi chú</p><p className="font-medium text-gray-800 mt-1">{transfer.notes ?? '-'}</p></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Danh sách hàng</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-gray-600"><th className="px-4 py-3 text-left">Sản phẩm</th><th className="px-4 py-3 text-left">SL chuyển</th><th className="px-4 py-3 text-left">Đã nhận</th></tr></thead>
                <tbody>{transfer.items.map((item) => <tr key={item.id} className="border-t border-gray-100"><td className="px-4 py-3"><p className="font-medium">{item.product?.name ?? '-'}</p><p className="text-xs text-gray-500">{item.product?.sku ?? '-'}</p></td><td className="px-4 py-3">{item.quantity}</td><td className="px-4 py-3">{item.receivedQty}</td></tr>)}</tbody>
              </table>
            </div>
          </div>

          {reconciliation && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Sai lệch</h4>
              <p className="text-sm text-gray-600">{reconciliation.product?.name ?? reconciliation.productId}: expected {reconciliation.expectedQty}, actual {reconciliation.actualQty}, diff {reconciliation.discrepancyQty}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Thao tác xử lý</h4>
            <div className="space-y-3">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ghi chú" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <button disabled={!canApprove || isSubmitting || transfer.status !== 'PENDING'} onClick={() => run(() => transferApi.approve(transfer.id, notes || undefined))} className="w-full px-4 py-2 rounded-lg border-2 border-gray-900">Duyệt</button>
              <button disabled={!canDispatch || isSubmitting || transfer.status !== 'APPROVED'} onClick={() => run(() => transferApi.dispatch(transfer.id, transfer.items.map((item) => ({ productId: item.productId, quantity: item.quantity }))))} className="w-full px-4 py-2 rounded-lg border-2 border-gray-900">Xuất khỏi kho nguồn</button>
              <button disabled={!canReceive || isSubmitting || !['DISPATCHED', 'IN_TRANSIT'].includes(transfer.status)} onClick={() => run(() => transferApi.receive(transfer.id, transfer.items.map((item) => ({ productId: item.productId, receivedQuantity: item.quantity })), notes || undefined))} className="w-full px-4 py-2 rounded-lg border-2 border-green-600">Nhận kho đích</button>
              <button disabled={!canReceive || isSubmitting || !['DISPATCHED', 'IN_TRANSIT'].includes(transfer.status)} onClick={() => run(() => transferApi.exception(transfer.id, transfer.items.map((item) => ({ productId: item.productId, expectedQuantity: item.quantity, actualQuantity: item.receivedQty || item.quantity })), notes || undefined))} className="w-full px-4 py-2 rounded-lg border-2 border-red-600 text-red-600">Báo sai lệch</button>
              <select value={resolution} onChange={(e) => setResolution(e.target.value as 'RESOLVED_SOURCE' | 'RESOLVED_DESTINATION' | 'WRITTEN_OFF')} className="w-full px-4 py-2 border border-gray-300 rounded-lg"><option value="RESOLVED_SOURCE">RESOLVED_SOURCE</option><option value="RESOLVED_DESTINATION">RESOLVED_DESTINATION</option><option value="WRITTEN_OFF">WRITTEN_OFF</option></select>
              <button disabled={!canResolve || isSubmitting || !reconciliation} onClick={() => run(() => transferApi.resolve(reconciliation!.id, resolution, notes || undefined))} className="w-full px-4 py-2 rounded-lg border-2 border-gray-900">Resolve reconciliation</button>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do hủy" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <button disabled={!canCancel || isSubmitting || transfer.status === 'COMPLETED'} onClick={() => run(() => transferApi.cancel(transfer.id, reason || undefined))} className="w-full px-4 py-2 rounded-lg border-2 border-red-600 text-red-600">Hủy transfer</button>
            </div>
            {isSubmitting && <div className="mt-4 flex items-center gap-2 text-sm text-gray-500"><RefreshCcw className="w-4 h-4 animate-spin" />Đang xử lý...</div>}
            {actionError && <div className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">{actionError}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

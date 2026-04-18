import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, RefreshCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { p02Api } from '../../services/api';
import { Inbound } from '../../types';
import InboundStatusBadge from '../../components/InboundStatusBadge';
import InboundWorkflowSteps from '../../components/InboundWorkflowSteps';

function formatDateTime(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

export default function InboundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [inbound, setInbound] = useState<Inbound | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [qcModalOpen, setQcModalOpen] = useState(false);
  const [qcPassed, setQcPassed] = useState(true);
  const [qcReason, setQcReason] = useState('');

  const role = user?.role;
  const status = inbound?.status;

  const fetchInbound = async () => {
    if (!id) { setError('Không tìm thấy mã phiếu.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const response = await p02Api.getInbound(id);
      const current = ((response as { inbound?: Inbound })?.inbound ?? response) as Inbound;
      setInbound(current);
    } catch (err) {
      console.error('Error fetching inbound detail:', err);
      setError('Không thể tải chi tiết phiếu nhập kho.');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchInbound(); }, [id]);

  const runAction = async (action: () => Promise<unknown>) => {
    if (!inbound) return;
    try { setActionError(''); setIsSubmitting(true); await action(); await fetchInbound(); }
    catch (err) { console.error('Action error:', err); setActionError('Thao tác thất bại. Vui lòng thử lại.'); }
    finally { setIsSubmitting(false); }
  };

  const canReceive = useMemo(() => !!inbound && inbound.status === 'INBOUND_CREATED' && (role === 'STAFF' || role === 'ADMIN'), [inbound, role]);
  const canStartQC = useMemo(() => !!inbound && inbound.status === 'ITEMS_RECEIVED' && (role === 'QUALITY' || role === 'ADMIN'), [inbound, role]);
  const canQCResult = useMemo(() => !!inbound && inbound.status === 'QUALITY_CHECKING' && (role === 'QUALITY' || role === 'ADMIN'), [inbound, role]);
  const canCreateBarcode = useMemo(() => !!inbound && inbound.status === 'QC_PASSED' && (role === 'STAFF' || role === 'ADMIN'), [inbound, role]);
  const canAssignLocation = useMemo(() => !!inbound && inbound.status === 'BARCODE_CREATED' && (role === 'STAFF' || role === 'ADMIN'), [inbound, role]);
  const canConfirmReceipt = useMemo(() => !!inbound && inbound.status === 'LOCATION_ASSIGNED' && (role === 'STAFF' || role === 'ADMIN'), [inbound, role]);
  const canComplete = useMemo(() => !!inbound && (inbound.status === 'STAFF_RECEIVED' || inbound.status === 'INVENTORY_UPDATED') && (role === 'STAFF' || role === 'ADMIN'), [inbound, role]);
  const canRecheck = useMemo(() => !!inbound && inbound.status === 'QC_FAILED' && (role === 'QUALITY' || role === 'ADMIN'), [inbound, role]);
  const canCancel = useMemo(() => !!inbound && !['INBOUND_COMPLETED', 'INBOUND_CANCELLED'].includes(inbound.status) && (role === 'QUALITY' || role === 'WAREHOUSE_DIRECTOR' || role === 'ADMIN'), [inbound, role]);

  const statusActions: Array<{ key: string; label: string; onClick: () => void; variant?: 'danger' | 'success' | 'secondary' }> = [];

  if (inbound) {
    if (canReceive) statusActions.push({ key: 'receive', label: 'Nhận hàng', onClick: () => runAction(() => p02Api.receive(inbound.id)) });
    if (canStartQC) statusActions.push({ key: 'start-qc', label: 'Bắt đầu kiểm tra QC', onClick: () => runAction(() => p02Api.startQualityCheck(inbound.id)) });
    if (canQCResult) statusActions.push({ key: 'qc-result', label: 'Kết quả QC', onClick: () => { setQcPassed(true); setQcReason(''); setQcModalOpen(true); } });
    if (canCreateBarcode) statusActions.push({ key: 'barcode', label: 'Tạo barcode', onClick: () => runAction(() => p02Api.createBarcodes(inbound.id)) });
    if (canAssignLocation) statusActions.push({ key: 'location', label: 'Tự động gán vị trí', onClick: () => runAction(() => p02Api.autoAssignLocation(inbound.id)) });
    if (canConfirmReceipt) statusActions.push({ key: 'confirm', label: 'Xác nhận nhận hàng', onClick: () => runAction(() => p02Api.confirmReceipt(inbound.id)) });
    if (canComplete) statusActions.push({ key: 'complete', label: 'Hoàn tất nhập kho', onClick: () => runAction(() => p02Api.complete(inbound.id)), variant: 'success' });
    if (canRecheck) statusActions.push({ key: 'recheck', label: 'Kiểm tra lại', onClick: () => runAction(() => p02Api.receive(inbound.id)), variant: 'secondary' });
    if (canCancel) statusActions.push({ key: 'cancel', label: 'Hủy phiếu', onClick: () => setCancelModalOpen(true), variant: 'danger' });
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>;
  if (error || !inbound) return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-600" /><p className="text-sm text-red-700">{error || 'Không tìm thấy phiếu nhập kho.'}</p></div>
      <button onClick={() => navigate('/inbounds')} className="mt-4 px-4 py-2 rounded-lg border-2 border-gray-900 bg-white text-gray-900 hover:bg-gray-50 transition-colors">Quay lại danh sách</button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <button onClick={() => navigate('/inbounds')} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-2"><ArrowLeft className="w-4 h-4" />Quay lại danh sách</button>
            <h3 className="text-lg font-semibold text-gray-900">{inbound.inboundNumber}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span>Tạo lúc: {formatDateTime(inbound.createdAt)}</span>
              <span>Cập nhật: {formatDateTime(inbound.updatedAt)}</span>
            </div>
          </div>
          <InboundStatusBadge status={inbound.status} />
        </div>
      </div>

      <InboundWorkflowSteps status={inbound.status} />

      {actionError && <div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-600" /><p className="text-sm text-red-700">{actionError}</p></div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Thông tin phiếu nhập kho</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Mã phiếu</p><p className="font-medium text-gray-800 mt-1">{inbound.inboundNumber}</p></div>
              <div><p className="text-gray-500">Đơn đặt hàng</p><p className="font-medium text-gray-800 mt-1">{inbound.purchaseOrder?.orderNumber ?? 'Không có'}</p></div>
              <div><p className="text-gray-500">Nhà cung cấp</p><p className="font-medium text-gray-800 mt-1">{inbound.purchaseOrder?.supplier?.name ?? '-'}</p></div>
              <div><p className="text-gray-500">Nhân viên</p><p className="font-medium text-gray-800 mt-1">{inbound.staff?.name ?? '-'}</p></div>
              <div className="md:col-span-2"><p className="text-gray-500">Ghi chú</p><p className="font-medium text-gray-800 mt-1">{inbound.notes || '-'}</p></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Chi tiết kiện hàng</h4>
            {inbound.items.length === 0 ? (
              <div className="p-6 text-center bg-gray-50 rounded-xl border border-gray-200 text-gray-500 text-sm">Chưa có kiện hàng.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-gray-600">
                    <th className="text-left px-4 py-3 font-medium">Sản phẩm</th>
                    <th className="text-left px-4 py-3 font-medium">SL đặt</th>
                    <th className="text-left px-4 py-3 font-medium">SL nhận</th>
                    <th className="text-left px-4 py-3 font-medium">SL hỏng</th>
                    <th className="text-left px-4 py-3 font-medium">Barcode</th>
                    <th className="text-left px-4 py-3 font-medium">Vị trí</th>
                  </tr></thead>
                  <tbody>
                    {inbound.items.map((item) => (
                      <tr key={item.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 text-gray-800"><p className="font-medium">{item.product?.name ?? '-'}</p><p className="text-xs text-gray-500">{item.product?.sku ?? '-'}</p></td>
                        <td className="px-4 py-3 text-gray-700">{item.quantity}</td>
                        <td className="px-4 py-3 text-gray-700">{item.receivedQty}</td>
                        <td className="px-4 py-3 text-gray-700">{item.damageQty > 0 ? <span className="text-red-600 font-medium">{item.damageQty}</span> : '0'}</td>
                        <td className="px-4 py-3 text-gray-700">{item.barcode ? <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{item.barcode}</span> : '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{item.location ? `${item.location.zone}-${item.location.row}-${item.location.shelf}` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Thao tác xử lý</h4>
            {statusActions.length === 0 ? (
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600">Không có thao tác nào khả dụng với vai trò hiện tại.</div>
            ) : (
              <div className="space-y-3">
                {statusActions.map((action) => {
                  let className = 'w-full px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 ';
                  if (action.variant === 'danger') className += 'border-red-600 bg-white text-red-600 hover:bg-red-50';
                  else if (action.variant === 'success') className += 'border-green-600 bg-white text-green-600 hover:bg-green-50';
                  else if (action.variant === 'secondary') className += 'border-gray-900 bg-white text-gray-900 hover:bg-gray-50';
                  else className += 'border-slate-800 bg-slate-800 text-white hover:bg-slate-700';
                  return <button key={action.key} onClick={action.onClick} className={className} disabled={isSubmitting}>{action.label}</button>;
                })}
              </div>
            )}
            {isSubmitting && <div className="mt-4 flex items-center gap-2 text-sm text-gray-500"><RefreshCcw className="w-4 h-4 animate-spin" />Đang xử lý...</div>}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Thông tin trạng thái</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Trạng thái: <span className="font-medium text-gray-800">{status}</span></p>
              <p>Ngày tạo: {formatDateTime(inbound.createdAt)}</p>
              {inbound.receivedDate && <p>Ngày nhận hàng: {formatDateTime(inbound.receivedDate)}</p>}
              {inbound.qcPassedDate && <p>Ngày QC đạt: {formatDateTime(inbound.qcPassedDate)}</p>}
              {inbound.completedDate && <p>Ngày hoàn tất: {formatDateTime(inbound.completedDate)}</p>}
            </div>
          </div>
        </div>
      </div>

      {qcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h4 className="text-lg font-semibold text-gray-900">Kết quả kiểm tra chất lượng</h4>
            <p className="text-sm text-gray-600 mt-2">Nhập kết quả kiểm tra chất lượng kiện hàng.</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2"><input type="radio" name="qc-result" checked={qcPassed} onChange={() => setQcPassed(true)} className="accent-green-600" /><span className="text-sm text-gray-800">Đạt</span></label>
                <label className="flex items-center gap-2"><input type="radio" name="qc-result" checked={!qcPassed} onChange={() => setQcPassed(false)} className="accent-red-600" /><span className="text-sm text-gray-800">Không đạt</span></label>
              </div>
              {!qcPassed && <textarea rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition" placeholder="Lý do không đạt (bắt buộc)" value={qcReason} onChange={(e) => setQcReason(e.target.value)} disabled={isSubmitting} />}
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setQcModalOpen(false)} disabled={isSubmitting} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors">Hủy</button>
              <button onClick={async () => {
                if (!inbound) return;
                if (!qcPassed && !qcReason.trim()) { setActionError('Vui lòng nhập lý do không đạt.'); return; }
                await runAction(() => p02Api.qc(inbound.id, qcPassed, qcPassed ? undefined : undefined));
                setQcModalOpen(false);
              }} disabled={isSubmitting} className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${qcPassed ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}>
                {qcPassed ? 'Xác nhận đạt' : 'Xác nhận không đạt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h4 className="text-lg font-semibold text-gray-900">Xác nhận hủy phiếu nhập kho</h4>
            <p className="text-sm text-gray-600 mt-2">Bạn có chắc chắn muốn hủy phiếu nhập kho này? Hành động này không thể hoàn tác.</p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setCancelModalOpen(false)} disabled={isSubmitting} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors">Không</button>
              <button onClick={async () => { if (!inbound) return; await runAction(() => p02Api.cancel(inbound.id)); setCancelModalOpen(false); }} disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Xác nhận hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

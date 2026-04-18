import { MouseEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, RefreshCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi, p03Api } from '../../services/api';
import { Outbound, OutboundStatus } from '../../types';
import OutboundStatusBadge from '../../components/OutboundStatusBadge';
import OutboundWorkflowSteps from '../../components/OutboundWorkflowSteps';

interface StaffUser {
  id: string;
  name: string;
  role: string;
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

export default function OutboundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [outbound, setOutbound] = useState<Outbound | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanProductId, setScanProductId] = useState('');
  const [scanBarcode, setScanBarcode] = useState('');

  const [pickCorrectModalOpen, setPickCorrectModalOpen] = useState(false);
  const [pickItemId, setPickItemId] = useState('');
  const [pickedQty, setPickedQty] = useState(1);

  const [assignPickerModalOpen, setAssignPickerModalOpen] = useState(false);
  const [pickerId, setPickerId] = useState('');
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const role = user?.role;
  const status: OutboundStatus | undefined = outbound?.status;

  const fetchOutbound = async () => {
    if (!id) {
      setError('Không tìm thấy mã phiếu.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await p03Api.getOutbound(id);
      const current = ((response as { outbound?: Outbound })?.outbound ?? response) as Outbound;
      setOutbound(current);
    } catch (err) {
      console.error('Error fetching outbound detail:', err);
      setError('Không thể tải chi tiết phiếu xuất kho.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffUsers = async () => {
    setLoadingStaff(true);
    try {
      const response = await authApi.getUsers();
      const users = ((response as { users?: StaffUser[] })?.users ??
        (Array.isArray(response) ? (response as StaffUser[]) : [])) as StaffUser[];
      setStaffUsers(users.filter((u) => u.role === 'STAFF'));
    } catch (err) {
      console.error('Error fetching staff users:', err);
      setActionError('Không thể tải danh sách nhân viên.');
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    fetchOutbound();
  }, [id]);

  useEffect(() => {
    if (assignPickerModalOpen) {
      fetchStaffUsers();
    }
  }, [assignPickerModalOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isSubmitting) return;
      if (scanModalOpen) setScanModalOpen(false);
      if (pickCorrectModalOpen) setPickCorrectModalOpen(false);
      if (assignPickerModalOpen) setAssignPickerModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scanModalOpen, pickCorrectModalOpen, assignPickerModalOpen, isSubmitting]);

  const runAction = async (action: () => Promise<unknown>) => {
    if (!outbound) return;
    try {
      setActionError('');
      setIsSubmitting(true);
      await action();
      await fetchOutbound();
    } catch (err: unknown) {
      console.error('Action error:', err);
      let message = 'Thao tác thất bại. Vui lòng thử lại.';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        if (axiosErr.response?.data?.error) {
          message = axiosErr.response.data.error;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      setActionError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCheckInventory = useMemo(() => !!outbound && outbound.status === 'ORDER_RECEIVED' && (role === 'STAFF' || role === 'ADMIN'), [outbound, role]);
  const canConfirmSufficient = useMemo(() => !!outbound && outbound.status === 'INVENTORY_CHECKED' && (role === 'WAREHOUSE_DIRECTOR' || role === 'ADMIN'), [outbound, role]);
  const canMarkInsufficient = useMemo(() => !!outbound && outbound.status === 'INVENTORY_CHECKED' && (role === 'WAREHOUSE_DIRECTOR' || role === 'ADMIN'), [outbound, role]);
  const canAssignPicking = useMemo(() => !!outbound && outbound.status === 'INVENTORY_SUFFICIENT' && (role === 'WAREHOUSE_DIRECTOR' || role === 'ADMIN'), [outbound, role]);
  const canAssignPicker = useMemo(() => !!outbound && outbound.status === 'PICKING_ASSIGNED' && (role === 'WAREHOUSE_DIRECTOR' || role === 'ADMIN'), [outbound, role]);
  const canScanItem = useMemo(() => !!outbound && outbound.status === 'PICKER_ASSIGNED' && (role === 'STAFF' || role === 'ADMIN'), [outbound, role]);
  const canConfirmPickedCorrect = useMemo(() => !!outbound && outbound.status === 'ITEM_SCANNED' && (role === 'STAFF' || role === 'ADMIN'), [outbound, role]);
  const canMarkPickedWrong = useMemo(() => !!outbound && outbound.status === 'ITEM_SCANNED' && (role === 'STAFF' || role === 'ADMIN'), [outbound, role]);
  const canRescan = useMemo(() => !!outbound && outbound.status === 'PICKED_WRONG' && (role === 'STAFF' || role === 'ADMIN'), [outbound, role]);
  const canPutInCart = useMemo(() => !!outbound && outbound.status === 'PICKED_CORRECT' && (role === 'STAFF' || role === 'ADMIN'), [outbound, role]);
  const canPrintSlip = useMemo(() => !!outbound && outbound.status === 'PUT_IN_CART' && (role === 'STAFF' || role === 'ADMIN'), [outbound, role]);
  const canMoveToPacking = useMemo(() => !!outbound && outbound.status === 'SLIP_PRINTED' && (role === 'STAFF' || role === 'ADMIN'), [outbound, role]);
  const canRecheckInventory = useMemo(() => !!outbound && outbound.status === 'INVENTORY_INSUFFICIENT' && (role === 'WAREHOUSE_DIRECTOR' || role === 'ADMIN'), [outbound, role]);

  const statusActions: Array<{ key: string; label: string; onClick: () => void; variant?: 'danger' | 'success' | 'secondary' }> = [];

  if (outbound) {
    if (canCheckInventory) statusActions.push({ key: 'check-inventory', label: 'Kiểm tra tồn kho', onClick: () => runAction(() => p03Api.checkInventory(outbound.id)) });
    if (canConfirmSufficient) statusActions.push({ key: 'confirm-sufficient', label: 'Xác nhận đủ hàng', onClick: () => runAction(() => p03Api.confirmSufficient(outbound.id)), variant: 'success' });
    if (canMarkInsufficient) statusActions.push({ key: 'mark-insufficient', label: 'Đánh dấu không đủ hàng', onClick: () => runAction(() => p03Api.markInsufficient(outbound.id)), variant: 'danger' });
    if (canAssignPicking) statusActions.push({ key: 'assign-picking', label: 'Điều phối lấy hàng', onClick: () => runAction(() => p03Api.assignPicking(outbound.id)) });
    if (canAssignPicker) statusActions.push({ key: 'assign-picker', label: 'Giao nhân viên lấy hàng', onClick: () => { setPickerId(''); setAssignPickerModalOpen(true); } });
    if (canScanItem) statusActions.push({ key: 'scan-item', label: 'Quét mã sản phẩm', onClick: () => { setScanProductId(''); setScanBarcode(''); setScanModalOpen(true); } });
    if (canConfirmPickedCorrect) statusActions.push({ key: 'confirm-picked-correct', label: 'Lấy đúng sản phẩm', onClick: () => { setPickItemId(outbound.items[0]?.id ?? ''); setPickedQty(outbound.items[0]?.quantity ?? 1); setPickCorrectModalOpen(true); }, variant: 'success' });
    if (canMarkPickedWrong) statusActions.push({ key: 'mark-picked-wrong', label: 'Lấy sai', onClick: () => runAction(() => p03Api.pickWrong(outbound.id, outbound.items[0]?.id ?? '')), variant: 'danger' });
    if (canRescan) statusActions.push({ key: 'rescan', label: 'Quét lại', onClick: () => runAction(() => p03Api.rescan(outbound.id)) });
    if (canPutInCart) statusActions.push({ key: 'put-in-cart', label: 'Cho vào giỏ hàng', onClick: () => runAction(() => p03Api.putInCart(outbound.id)) });
    if (canPrintSlip) statusActions.push({ key: 'print-slip', label: 'In phiếu xuất kho MB02', onClick: () => runAction(() => p03Api.printSlip(outbound.id)) });
    if (canMoveToPacking) statusActions.push({ key: 'move-to-packing', label: 'Chuyển sang đóng gói', onClick: () => runAction(() => p03Api.moveToPacking(outbound.id)), variant: 'success' });
    if (canRecheckInventory) statusActions.push({ key: 'recheck-inventory', label: 'Kiểm tra lại tồn kho', onClick: () => runAction(() => p03Api.recheckInventory(outbound.id)) });
  }

  const handleOverlayClick = (
    event: MouseEvent<HTMLDivElement>,
    close: () => void
  ) => {
    if (event.target === event.currentTarget && !isSubmitting) {
      close();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  if (error || !outbound) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">{error || 'Không tìm thấy phiếu xuất kho.'}</p>
        </div>
        <button onClick={() => navigate('/outbounds')} className="mt-4 px-4 py-2 rounded-lg border-2 border-gray-900 bg-white text-gray-900 hover:bg-gray-50 transition-colors">
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <button onClick={() => navigate('/outbounds')} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-2"><ArrowLeft className="w-4 h-4" />Quay lại danh sách</button>
            <h3 className="text-lg font-semibold text-gray-900">{outbound.outboundNumber}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span>Tạo lúc: {formatDateTime(outbound.createdAt)}</span>
              <span>Cập nhật: {formatDateTime(outbound.updatedAt)}</span>
            </div>
          </div>
          <OutboundStatusBadge status={outbound.status} />
        </div>
      </div>

      <OutboundWorkflowSteps status={outbound.status} />

      {actionError && <div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-600" /><p className="text-sm text-red-700">{actionError}</p></div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Thông tin phiếu xuất kho</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Mã phiếu</p><p className="font-medium text-gray-800 mt-1">{outbound.outboundNumber}</p></div>
              <div><p className="text-gray-500">Mã đơn TMĐT</p><p className="font-medium text-gray-800 mt-1">{outbound.orderRef ?? '-'}</p></div>
              <div><p className="text-gray-500">Nhân viên</p><p className="font-medium text-gray-800 mt-1">{outbound.picker?.name ?? '-'}</p></div>
              <div className="md:col-span-2"><p className="text-gray-500">Ghi chú</p><p className="font-medium text-gray-800 mt-1">{outbound.notes || '-'}</p></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Chi tiết sản phẩm</h4>
            {outbound.items.length === 0 ? (
              <div className="p-6 text-center bg-gray-50 rounded-xl border border-gray-200 text-gray-500 text-sm">Chưa có sản phẩm.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="text-left px-4 py-3 font-medium">Sản phẩm</th>
                      <th className="text-left px-4 py-3 font-medium">SL yêu cầu</th>
                      <th className="text-left px-4 py-3 font-medium">SL đã lấy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outbound.items.map((item) => (
                      <tr key={item.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 text-gray-800"><p className="font-medium">{item.product?.name ?? '-'}</p><p className="text-xs text-gray-500">{item.product?.sku ?? '-'}</p></td>
                        <td className="px-4 py-3 text-gray-700">{item.quantity}</td>
                        <td className="px-4 py-3 text-gray-700">{item.pickedQty}</td>
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
              <p>Ngày tạo: {formatDateTime(outbound.createdAt)}</p>
              <p>Cập nhật: {formatDateTime(outbound.updatedAt)}</p>
              {outbound.pickedDate && <p>Ngày lấy hàng: {formatDateTime(outbound.pickedDate)}</p>}
            </div>
          </div>
        </div>
      </div>

      {scanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => handleOverlayClick(e, () => setScanModalOpen(false))}>
          <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h4 className="text-lg font-semibold text-gray-900">Quét mã sản phẩm</h4>
            <p className="text-sm text-gray-600 mt-2">Nhập thông tin quét để xác nhận sản phẩm.</p>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition"
                placeholder="Mã sản phẩm (productId)"
                value={scanProductId}
                onChange={(e) => setScanProductId(e.target.value)}
                disabled={isSubmitting}
              />
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition"
                placeholder="Mã barcode"
                value={scanBarcode}
                onChange={(e) => setScanBarcode(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setScanModalOpen(false)} disabled={isSubmitting} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors">Hủy</button>
              <button
                onClick={async () => {
                  if (!outbound || !scanProductId.trim() || !scanBarcode.trim()) {
                    setActionError('Vui lòng nhập productId và barcode.');
                    return;
                  }
                  await runAction(() => p03Api.scanItem(outbound.id, scanProductId.trim(), scanBarcode.trim()));
                  setScanModalOpen(false);
                }}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Xác nhận quét
              </button>
            </div>
          </div>
        </div>
      )}

      {pickCorrectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => handleOverlayClick(e, () => setPickCorrectModalOpen(false))}>
          <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h4 className="text-lg font-semibold text-gray-900">Lấy đúng sản phẩm</h4>
            <p className="text-sm text-gray-600 mt-2">Nhập itemId và số lượng đã lấy.</p>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition"
                placeholder="Mã dòng hàng (itemId)"
                value={pickItemId}
                onChange={(e) => setPickItemId(e.target.value)}
                disabled={isSubmitting}
              />
              <input
                type="number"
                min={1}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition"
                placeholder="Số lượng lấy"
                value={pickedQty}
                onChange={(e) => setPickedQty(Number(e.target.value) || 0)}
                disabled={isSubmitting}
              />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setPickCorrectModalOpen(false)} disabled={isSubmitting} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors">Hủy</button>
              <button
                onClick={async () => {
                  if (!outbound || !pickItemId.trim() || pickedQty <= 0) {
                    setActionError('Vui lòng nhập itemId và số lượng hợp lệ.');
                    return;
                  }
                  await runAction(() => p03Api.pickCorrect(outbound.id, pickItemId.trim(), pickedQty));
                  setPickCorrectModalOpen(false);
                }}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Xác nhận lấy đúng
              </button>
            </div>
          </div>
        </div>
      )}

      {assignPickerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => handleOverlayClick(e, () => setAssignPickerModalOpen(false))}>
          <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h4 className="text-lg font-semibold text-gray-900">Giao nhân viên lấy hàng</h4>
            <p className="text-sm text-gray-600 mt-2">Chọn nhân viên role STAFF để giao xử lý.</p>
            <div className="mt-4 space-y-3">
              {loadingStaff ? (
                <div className="flex items-center justify-center h-20">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-800"></div>
                </div>
              ) : (
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition"
                  value={pickerId}
                  onChange={(e) => setPickerId(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">Chọn nhân viên</option>
                  {staffUsers.map((staff) => (
                    <option key={staff.id} value={staff.id}>{staff.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setAssignPickerModalOpen(false)} disabled={isSubmitting} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors">Hủy</button>
              <button
                onClick={async () => {
                  if (!outbound || !pickerId) {
                    setActionError('Vui lòng chọn nhân viên.');
                    return;
                  }
                  await runAction(() => p03Api.assignPicker(outbound.id, pickerId));
                  setAssignPickerModalOpen(false);
                }}
                disabled={isSubmitting || loadingStaff}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Xác nhận giao
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

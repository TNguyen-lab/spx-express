import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Plus, Search, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { p02Api, type CreateInboundRequest } from '../../services/api';
import { Inbound } from '../../types';
import { InboundStatus } from '../../types/canonical';
import { useAuth } from '../../context/AuthContext';
import InboundStatusBadge from '../../components/InboundStatusBadge';
import CreateInboundModal from '../../components/CreateInboundModal';

const PAGE_SIZE = 10;

const statusOptions: Array<{ value: 'ALL' | InboundStatus; label: string }> = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'INBOUND_CREATED', label: 'Tạo phiếu nhập kho' },
  { value: 'ITEMS_RECEIVED', label: 'Hàng đến' },
  { value: 'QUALITY_CHECKING', label: 'QC đang kiểm tra' },
  { value: 'QC_PASSED', label: 'QC đạt' },
  { value: 'QC_FAILED', label: 'QC không đạt' },
  { value: 'BARCODE_CREATED', label: 'Tạo barcode' },
  { value: 'LOCATION_ASSIGNED', label: 'Gán vị trí lưu kho' },
  { value: 'STAFF_RECEIVED', label: 'Staff xác nhận' },
  { value: 'NEW_PRODUCT_CREATED', label: 'Tạo sản phẩm mới' },
  { value: 'INVENTORY_UPDATED', label: 'Cập nhật tồn kho' },
  { value: 'INBOUND_COMPLETED', label: 'Hoàn tất nhập kho' },
  { value: 'INBOUND_CANCELLED', label: 'Đã hủy' },
];

function formatDate(dateString?: string) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('vi-VN');
}

function getPrimaryActionLabel(status: InboundStatus, role?: string) {
  if (!role) return null;
  if (status === 'INBOUND_CREATED' && (role === 'STAFF' || role === 'ADMIN')) return 'Nhận hàng';
  if (status === 'ITEMS_RECEIVED' && (role === 'QUALITY' || role === 'ADMIN')) return 'Kiểm tra QC';
  if (status === 'QUALITY_CHECKING' && (role === 'QUALITY' || role === 'ADMIN')) return 'Kết quả QC';
  if (status === 'QC_PASSED' && (role === 'STAFF' || role === 'ADMIN')) return 'Tạo barcode';
  if (status === 'BARCODE_CREATED' && (role === 'STAFF' || role === 'ADMIN')) return 'Gán vị trí';
  if (status === 'LOCATION_ASSIGNED' && (role === 'STAFF' || role === 'ADMIN')) return 'Xác nhận';
  if (status === 'QC_FAILED' && (role === 'QUALITY' || role === 'ADMIN')) return 'Kiểm tra lại';
  return null;
}

export default function InboundsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [inbounds, setInbounds] = useState<Inbound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InboundStatus>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState('');

  const canCreate = user?.role === 'ADMIN' || user?.role === 'QUALITY';

  const pendingActionCount = useMemo(() => {
    if (!user?.role) return 0;
    return inbounds.filter((ib) => getPrimaryActionLabel(ib.status, user.role) !== null).length;
  }, [inbounds, user?.role]);

  const fetchInbounds = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await p02Api.getInbounds();
      const list = ((response as { inbounds?: Inbound[] })?.inbounds ??
        (Array.isArray(response) ? (response as Inbound[]) : [])) as Inbound[];
      setInbounds(list);
    } catch (err) {
      console.error('Error fetching inbounds:', err);
      setError('Không thể tải danh sách phiếu nhập kho. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInbounds(); }, []);
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  const filteredInbounds = useMemo(() => {
    return inbounds.filter((ib) => {
      const matchStatus = statusFilter === 'ALL' ? true : ib.status === statusFilter;
      const keyword = search.trim().toLowerCase();
      const matchSearch = keyword
        ? ib.inboundNumber.toLowerCase().includes(keyword) || (ib.purchaseOrder?.supplier?.name ?? '').toLowerCase().includes(keyword)
        : true;
      return matchStatus && matchSearch;
    });
  }, [inbounds, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredInbounds.length / PAGE_SIZE));
  const paginatedInbounds = filteredInbounds.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleCreateInbound = async (payload: {
    purchaseOrderId?: string;
    notes?: string;
    items: Array<{ productId: string; quantity: number; notes?: string }>;
  }) => {
    try {
      setActionError('');
      setIsCreating(true);
      await p02Api.createInbound(payload as CreateInboundRequest);
      setIsCreateModalOpen(false);
      await fetchInbounds();
    } catch (err) {
      console.error('Error creating inbound:', err);
      setActionError('Tạo phiếu nhập kho thất bại. Vui lòng kiểm tra dữ liệu và thử lại.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Danh sách phiếu nhập kho P02</h3>
          {canCreate && (
            <button
              onClick={() => { setActionError(''); setIsCreateModalOpen(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tạo phiếu nhập kho
            </button>
          )}
        </div>

        {actionError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{actionError}</div>
        )}

        {pendingActionCount > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800 text-sm">
            <Bell className="w-4 h-4 shrink-0" />
            <span>Bạn có <strong>{pendingActionCount}</strong> phiếu nhập kho cần xử lý.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã phiếu hoặc nhà cung cấp"
              className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | InboundStatus)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : filteredInbounds.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200">
            <p className="font-medium text-gray-700">Không có phiếu nhập kho phù hợp</p>
            <p className="text-sm text-gray-500 mt-1">Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="px-4 py-3 text-left font-medium">Mã phiếu</th>
                    <th className="px-4 py-3 text-left font-medium">Đơn đặt hàng</th>
                    <th className="px-4 py-3 text-left font-medium">Nhân viên</th>
                    <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
                    <th className="px-4 py-3 text-left font-medium">Ngày tạo</th>
                    <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInbounds.map((ib) => (
                    <tr key={ib.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/inbounds/${ib.id}`)}>
                      <td className="px-4 py-3 font-medium text-gray-900">{ib.inboundNumber}</td>
                      <td className="px-4 py-3 text-gray-700">{ib.purchaseOrder?.orderNumber ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{ib.staff?.name ?? '-'}</td>
                      <td className="px-4 py-3"><InboundStatusBadge status={ib.status} /></td>
                      <td className="px-4 py-3 text-gray-700">{formatDate(ib.createdAt)}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end items-center gap-2">
                          {getPrimaryActionLabel(ib.status, user?.role) && (
                            <button onClick={() => navigate(`/inbounds/${ib.id}`)} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors">
                              {getPrimaryActionLabel(ib.status, user?.role)}
                            </button>
                          )}
                          <button onClick={() => navigate(`/inbounds/${ib.id}`)} className="px-3 py-1.5 rounded-lg border border-gray-900 bg-white text-gray-900 hover:bg-gray-50 transition-colors">
                            Chi tiết
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">Hiển thị {paginatedInbounds.length} / {filteredInbounds.length} phiếu</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4" /> Trước
                </button>
                <span className="text-sm text-gray-600">Trang {currentPage}/{totalPages}</span>
                <button onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Sau <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {canCreate && (
        <CreateInboundModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreateInbound} isSubmitting={isCreating} />
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Plus, Search, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { p03Api, type CreateOutboundRequest } from '../../services/api';
import { Outbound } from '../../types';
import { OutboundStatus } from '../../types/canonical';
import { useAuth } from '../../context/AuthContext';
import OutboundStatusBadge from '../../components/OutboundStatusBadge';
import CreateOutboundModal from '../../components/CreateOutboundModal';

const PAGE_SIZE = 10;

const statusOptions: Array<{ value: 'ALL' | OutboundStatus; label: string }> = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'ORDER_RECEIVED', label: 'Nhận đơn từ Shopee' },
  { value: 'INVENTORY_CHECKED', label: 'Kiểm tra tồn kho' },
  { value: 'INVENTORY_SUFFICIENT', label: 'Đủ hàng' },
  { value: 'INVENTORY_INSUFFICIENT', label: 'Không đủ hàng' },
  { value: 'PICKING_ASSIGNED', label: 'Giao điều phối' },
  { value: 'PICKER_ASSIGNED', label: 'Giao nhân viên lấy hàng' },
  { value: 'ITEM_SCANNED', label: 'Quét mã sản phẩm' },
  { value: 'PICKED_CORRECT', label: 'Lấy đúng sản phẩm' },
  { value: 'PICKED_WRONG', label: 'Lấy sai (quét lại)' },
  { value: 'PUT_IN_CART', label: 'Cho vào giỏ hàng' },
  { value: 'SLIP_PRINTED', label: 'In phiếu xuất kho (MB02)' },
  { value: 'MOVED_TO_PACKING', label: 'Chuyển sang đóng gói' },
];

function formatDate(dateString?: string) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('vi-VN');
}

function getPrimaryActionLabel(status: OutboundStatus, role?: string) {
  if (!role) return null;
  if (status === 'ORDER_RECEIVED' && (role === 'STAFF' || role === 'ADMIN')) return 'Kiểm tra tồn kho';
  if (status === 'INVENTORY_CHECKED' && (role === 'WAREHOUSE_DIRECTOR' || role === 'ADMIN')) return 'Xác nhận đủ hàng';
  if (status === 'INVENTORY_SUFFICIENT' && (role === 'WAREHOUSE_DIRECTOR' || role === 'ADMIN')) return 'Điều phối lấy hàng';
  if (status === 'PICKING_ASSIGNED' && (role === 'WAREHOUSE_DIRECTOR' || role === 'ADMIN')) return 'Giao nhân viên';
  if (status === 'PICKER_ASSIGNED' && (role === 'STAFF' || role === 'ADMIN')) return 'Quét mã';
  if (status === 'ITEM_SCANNED' && (role === 'STAFF' || role === 'ADMIN')) return 'Lấy đúng';
  if (status === 'PUT_IN_CART' && (role === 'STAFF' || role === 'ADMIN')) return 'In phiếu';
  if (status === 'SLIP_PRINTED' && (role === 'STAFF' || role === 'ADMIN')) return 'Chuyển đóng gói';
  if (status === 'INVENTORY_INSUFFICIENT' && (role === 'WAREHOUSE_DIRECTOR' || role === 'ADMIN')) return 'Kiểm tra lại';
  if (status === 'PICKED_WRONG' && (role === 'STAFF' || role === 'ADMIN')) return 'Quét lại';
  return null;
}

export default function OutboundsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [outbounds, setOutbounds] = useState<Outbound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | OutboundStatus>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState('');

  const canCreate = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const pendingActionCount = useMemo(() => {
    if (!user?.role) return 0;
    return outbounds.filter((ob) => getPrimaryActionLabel(ob.status, user.role) !== null).length;
  }, [outbounds, user?.role]);

  const fetchOutbounds = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await p03Api.getOutbounds();
      const list = ((response as { outbounds?: Outbound[] })?.outbounds ??
        (Array.isArray(response) ? (response as Outbound[]) : [])) as Outbound[];
      setOutbounds(list);
    } catch (err) {
      console.error('Error fetching outbounds:', err);
      setError('Không thể tải danh sách phiếu xuất kho. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutbounds();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const filteredOutbounds = useMemo(() => {
    return outbounds.filter((ob) => {
      const matchStatus = statusFilter === 'ALL' ? true : ob.status === statusFilter;
      const keyword = search.trim().toLowerCase();
      const matchSearch = keyword
        ? ob.outboundNumber.toLowerCase().includes(keyword) || (ob.orderRef ?? '').toLowerCase().includes(keyword)
        : true;
      return matchStatus && matchSearch;
    });
  }, [outbounds, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOutbounds.length / PAGE_SIZE));
  const paginatedOutbounds = filteredOutbounds.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleCreateOutbound = async (payload: {
    orderRef?: string;
    notes?: string;
    items: Array<{ productId: string; quantity: number }>;
  }) => {
    try {
      setActionError('');
      setIsCreating(true);
      await p03Api.createOutbound(payload as CreateOutboundRequest);
      setIsCreateModalOpen(false);
      await fetchOutbounds();
    } catch (err) {
      console.error('Error creating outbound:', err);
      setActionError('Tạo phiếu xuất kho thất bại. Vui lòng kiểm tra dữ liệu và thử lại.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Danh sách phiếu xuất kho P03</h3>
          {canCreate && (
            <button
              onClick={() => {
                setActionError('');
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tạo phiếu xuất kho
            </button>
          )}
        </div>

        {actionError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{actionError}</div>
        )}

        {pendingActionCount > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800 text-sm">
            <Bell className="w-4 h-4 shrink-0" />
            <span>Bạn có <strong>{pendingActionCount}</strong> phiếu xuất kho cần xử lý.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã phiếu hoặc mã đơn"
              className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | OutboundStatus)}
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
        ) : filteredOutbounds.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200">
            <p className="font-medium text-gray-700">Không có phiếu xuất kho phù hợp</p>
            <p className="text-sm text-gray-500 mt-1">Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="px-4 py-3 text-left font-medium">Mã phiếu</th>
                    <th className="px-4 py-3 text-left font-medium">Mã đơn</th>
                    <th className="px-4 py-3 text-left font-medium">Nhân viên</th>
                    <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
                    <th className="px-4 py-3 text-left font-medium">Ngày tạo</th>
                    <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOutbounds.map((ob) => (
                    <tr key={ob.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/outbounds/${ob.id}`)}>
                      <td className="px-4 py-3 font-medium text-gray-900">{ob.outboundNumber}</td>
                      <td className="px-4 py-3 text-gray-700">{ob.orderRef ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{ob.picker?.name ?? '-'}</td>
                      <td className="px-4 py-3"><OutboundStatusBadge status={ob.status} /></td>
                      <td className="px-4 py-3 text-gray-700">{formatDate(ob.createdAt)}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end items-center gap-2">
                          {getPrimaryActionLabel(ob.status, user?.role) && (
                            <button onClick={() => navigate(`/outbounds/${ob.id}`)} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors">
                              {getPrimaryActionLabel(ob.status, user?.role)}
                            </button>
                          )}
                          <button onClick={() => navigate(`/outbounds/${ob.id}`)} className="px-3 py-1.5 rounded-lg border border-gray-900 bg-white text-gray-900 hover:bg-gray-50 transition-colors">
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
              <p className="text-sm text-gray-500">Hiển thị {paginatedOutbounds.length} / {filteredOutbounds.length} phiếu</p>
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
        <CreateOutboundModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreateOutbound} isSubmitting={isCreating} />
      )}
    </div>
  );
}

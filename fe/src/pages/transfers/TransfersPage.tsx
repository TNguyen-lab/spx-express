import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { transferApi } from '../../services/api';
import { Transfer, TransferStatus } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import CreateTransferModal from './CreateTransferModal';

const PAGE_SIZE = 10;
function formatDate(value?: string) { return value ? new Date(value).toLocaleString('vi-VN') : '-'; }

export default function TransfersPage() {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TransferStatus>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await transferApi.getTransfers();
      setTransfers(((response as { transfers?: Transfer[] })?.transfers ?? (Array.isArray(response) ? response : [])) as Transfer[]);
    } catch (err) { console.error(err); setError('Không thể tải danh sách chuyển kho.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => setCurrentPage(1), [search, statusFilter]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return transfers.filter((item) => {
      const matchStatus = statusFilter === 'ALL' ? true : item.status === statusFilter;
      const matchKeyword = keyword ? item.transferNumber.toLowerCase().includes(keyword) : true;
      return matchStatus && matchKeyword;
    });
  }, [search, statusFilter, transfers]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Danh sách internal transfer</h3>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            <Plus className="w-4 h-4" />
            Tạo transfer
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã transfer"
              className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | TransferStatus)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="DISPATCHED">Đã xuất</option>
            <option value="IN_TRANSIT">Đang di chuyển</option>
            <option value="RECEIVED">Đã nhận</option>
            <option value="COMPLETED">Hoàn tất</option>
            <option value="CANCELLED">Đã hủy</option>
            <option value="EXCEPTION">Có sai lệch</option>
          </select>
        </div>
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" />
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200">
            <p className="font-medium text-gray-700">Không có phiếu transfer phù hợp</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="px-4 py-3 text-left">Mã transfer</th>
                    <th className="px-4 py-3 text-left">Từ</th>
                    <th className="px-4 py-3 text-left">Đến</th>
                    <th className="px-4 py-3 text-left">Trạng thái</th>
                    <th className="px-4 py-3 text-left">Cập nhật</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((transfer) => (
                    <tr
                      key={transfer.id}
                      className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/transfers/${transfer.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{transfer.transferNumber}</td>
                      <td className="px-4 py-3 text-gray-700">{transfer.fromLocation?.name ?? transfer.fromLocationId}</td>
                      <td className="px-4 py-3 text-gray-700">{transfer.toLocation?.name ?? transfer.toLocationId}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={transfer.status as never} />
                      </td>
                      <td className="px-4 py-3 text-gray-700">{formatDate(transfer.updatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/transfers/${transfer.id}`); }}
                          className="px-3 py-1.5 rounded-lg border border-gray-900 bg-white text-gray-900"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">Hiển thị {rows.length} / {filtered.length} phiếu</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />Trước
                </button>
                <span className="text-sm text-gray-600">Trang {currentPage}/{totalPages}</span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50"
                >
                  Sau<ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {isCreateModalOpen && (
        <CreateTransferModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}

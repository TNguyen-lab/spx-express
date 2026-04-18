import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { inventoryCheckApi } from '../../services/api';
import { InventoryCheck, InventoryCheckStatus } from '../../types';
import StatusBadge from '../../components/StatusBadge';

const PAGE_SIZE = 10;
function formatDate(value?: string) { return value ? new Date(value).toLocaleString('vi-VN') : '-'; }

export default function InventoryChecksPage() {
  const navigate = useNavigate();
  const [checks, setChecks] = useState<InventoryCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InventoryCheckStatus>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError('');
      try {
        const response = await inventoryCheckApi.getChecks();
        setChecks(((response as { checks?: InventoryCheck[] })?.checks ?? (Array.isArray(response) ? response : [])) as InventoryCheck[]);
      } catch (err) { console.error(err); setError('Không thể tải danh sách kiểm kê.'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => setCurrentPage(1), [search, statusFilter]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return checks.filter((item) => {
      const matchStatus = statusFilter === 'ALL' ? true : item.status === statusFilter;
      const matchKeyword = keyword ? item.checkNumber.toLowerCase().includes(keyword) || (item.notes ?? '').toLowerCase().includes(keyword) : true;
      return matchStatus && matchKeyword;
    });
  }, [search, statusFilter, checks]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return <div className="space-y-6"><div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4"><h3 className="text-lg font-semibold text-gray-900">Danh sách kiểm kê P07</h3></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4"><div className="md:col-span-2 relative"><Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo mã kiểm kê" className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg" /></div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'ALL' | InventoryCheckStatus)} className="w-full px-4 py-3 border border-gray-300 rounded-lg"><option value="ALL">Tất cả trạng thái</option><option value="PENDING">Chờ kiểm kê</option><option value="IN_PROGRESS">Đang kiểm kê</option><option value="COMPLETED">Hoàn tất</option></select></div>{loading ? <div className="h-48 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" /></div> : error ? <div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-600" /><p className="text-sm text-red-700">{error}</p></div> : rows.length === 0 ? <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200"><p className="font-medium text-gray-700">Không có phiếu kiểm kê phù hợp</p></div> : <><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 text-gray-600"><th className="px-4 py-3 text-left">Mã phiếu</th><th className="px-4 py-3 text-left">Loại</th><th className="px-4 py-3 text-left">Trạng thái</th><th className="px-4 py-3 text-left">Kiểm kê viên</th><th className="px-4 py-3 text-left">Cập nhật</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead><tbody>{rows.map((check) => <tr key={check.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/inventory-checks/${check.id}`)}><td className="px-4 py-3 font-medium text-gray-900">{check.checkNumber}</td><td className="px-4 py-3 text-gray-700">{check.type}</td><td className="px-4 py-3"><StatusBadge status={check.status as never} /></td><td className="px-4 py-3 text-gray-700">{check.checker?.name ?? '-'}</td><td className="px-4 py-3 text-gray-700">{formatDate(check.updatedAt)}</td><td className="px-4 py-3 text-right"><button onClick={(e) => { e.stopPropagation(); navigate(`/inventory-checks/${check.id}`); }} className="px-3 py-1.5 rounded-lg border border-gray-900 bg-white text-gray-900">Chi tiết</button></td></tr>)}</tbody></table></div><div className="flex items-center justify-between mt-4"><p className="text-sm text-gray-500">Hiển thị {rows.length} / {filtered.length} phiếu</p><div className="flex items-center gap-2"><button onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50"><ChevronLeft className="w-4 h-4" />Trước</button><span className="text-sm text-gray-600">Trang {currentPage}/{totalPages}</span><button onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50">Sau<ChevronRight className="w-4 h-4" /></button></div></div></>}</div></div>;
}

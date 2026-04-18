import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { reportApi } from '../../services/api';
import type { MonthlyReportMeta, MonthlyReportPayload } from '../../types';

function formatNumber(value: number) { return value.toLocaleString('vi-VN'); }

export default function ReportsPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState<MonthlyReportPayload | null>(null);
  const [meta, setMeta] = useState<MonthlyReportMeta | null>(null);

  const filters = useMemo(() => ({ month, category: category || undefined }), [month, category]);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await reportApi.getMonthly(filters);
      setPayload((response as { report?: MonthlyReportPayload })?.report ?? null);
      setMeta((response as { meta?: MonthlyReportMeta })?.meta ?? null);
    } catch (err) {
      console.error(err);
      setError('Chưa có báo cáo tháng này hoặc không thể tải báo cáo.');
      setPayload(null);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month]);

  return <div className="space-y-6"><div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"><div className="flex flex-col md:flex-row md:items-end gap-4 justify-between mb-4"><div><h3 className="text-lg font-semibold text-gray-900">Báo cáo tháng</h3><p className="text-sm text-gray-500">Đọc / chốt / replay báo cáo tồn kho theo tháng</p></div><div className="flex gap-3"><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="px-4 py-3 border border-gray-300 rounded-lg" /><input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category (optional)" className="px-4 py-3 border border-gray-300 rounded-lg" /><button onClick={load} className="px-4 py-3 rounded-lg border border-gray-900 bg-white text-gray-900 inline-flex items-center gap-2"><RefreshCcw className="w-4 h-4" />Làm mới</button></div></div>{loading ? <div className="h-48 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" /></div> : error ? <div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-600" /><p className="text-sm text-red-700">{error}</p></div> : payload ? <div className="space-y-6"><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div className="p-4 rounded-xl bg-gray-50 border border-gray-200"><p className="text-xs text-gray-500">Tồn đầu</p><p className="text-lg font-semibold">{formatNumber(payload.summary.openingStock)}</p></div><div className="p-4 rounded-xl bg-gray-50 border border-gray-200"><p className="text-xs text-gray-500">Nhập</p><p className="text-lg font-semibold">{formatNumber(payload.summary.inbound)}</p></div><div className="p-4 rounded-xl bg-gray-50 border border-gray-200"><p className="text-xs text-gray-500">Xuất</p><p className="text-lg font-semibold">{formatNumber(payload.summary.outbound)}</p></div><div className="p-4 rounded-xl bg-gray-50 border border-gray-200"><p className="text-xs text-gray-500">Tồn cuối</p><p className="text-lg font-semibold">{formatNumber(payload.summary.endingStock)}</p></div></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 text-gray-600"><th className="px-4 py-3 text-left">SKU</th><th className="px-4 py-3 text-left">Tên</th><th className="px-4 py-3 text-left">Đầu</th><th className="px-4 py-3 text-left">Nhập</th><th className="px-4 py-3 text-left">Xuất</th><th className="px-4 py-3 text-left">Điều chỉnh</th><th className="px-4 py-3 text-left">Cuối</th></tr></thead><tbody>{payload.lines.map((line) => <tr key={line.productId} className="border-t border-gray-100"><td className="px-4 py-3">{line.sku}</td><td className="px-4 py-3">{line.name}</td><td className="px-4 py-3">{line.openingStock}</td><td className="px-4 py-3">{line.inbound}</td><td className="px-4 py-3">{line.outbound}</td><td className="px-4 py-3">{line.adjustment}</td><td className="px-4 py-3">{line.endingStock}</td></tr>)}</tbody></table></div><div className="text-sm text-gray-600">Report key: {meta?.reportKey ?? '-'} · Source hash: {meta?.sourceHash ?? '-'}</div></div> : <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200"><p className="font-medium text-gray-700">Chưa có báo cáo cho kỳ này</p></div>}</div></div>;
}

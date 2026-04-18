import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, RefreshCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { p06Api } from '../../services/api';
import { Shipment, ShipmentStatus } from '../../types';

function formatDateTime(value?: string) { return value ? new Date(value).toLocaleString('vi-VN') : '-'; }
function Badge({ status }: { status: ShipmentStatus }) { return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>; }
const steps = ['CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [signature, setSignature] = useState('');
  const [photo, setPhoto] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true); setError('');
    try {
      const response = await p06Api.getShipment(id);
      setShipment(((response as { shipment?: Shipment })?.shipment ?? response) as Shipment);
    } catch (err) { console.error(err); setError('Không thể tải chi tiết vận chuyển.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const run = async (action: () => Promise<unknown>) => {
    if (!shipment) return;
    setIsSubmitting(true); setActionError('');
    try { await action(); await load(); } catch (err) { console.error(err); setActionError('Thao tác thất bại.'); } finally { setIsSubmitting(false); }
  };

  const canAct = !!shipment && ['ADMIN', 'STAFF', 'DRIVER'].includes(user?.role ?? '');
  const canDriver = !!shipment && ['DRIVER', 'ADMIN'].includes(user?.role ?? '');
  const currentIndex = useMemo(() => steps.indexOf((shipment?.status === 'FAILED' ? 'IN_TRANSIT' : shipment?.status ?? 'CREATED') as typeof steps[number]), [shipment?.status]);

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" /></div>;
  if (error || !shipment) return <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"><div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-600" /><p className="text-sm text-red-700">{error || 'Không tìm thấy phiếu vận chuyển.'}</p></div></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <button onClick={() => navigate('/shipments')} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-2"><ArrowLeft className="w-4 h-4" />Quay lại danh sách</button>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{shipment.shipmentNumber}</h3>
            <p className="text-sm text-gray-500 mt-1">Sorting: {shipment.sorting?.sortingNumber ?? '-'}</p>
          </div>
          <Badge status={shipment.status} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="grid grid-cols-5 gap-3">
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
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Thông tin vận chuyển</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Carrier</p><p className="font-medium text-gray-800 mt-1">{shipment.carrier}</p></div>
              <div><p className="text-gray-500">Tracking</p><p className="font-medium text-gray-800 mt-1">{shipment.trackingNumber ?? '-'}</p></div>
              <div><p className="text-gray-500">Shipper</p><p className="font-medium text-gray-800 mt-1">{shipment.shipper?.name ?? '-'}</p></div>
              <div><p className="text-gray-500">Cập nhật</p><p className="font-medium text-gray-800 mt-1">{formatDateTime(shipment.updatedAt)}</p></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Danh sách hàng</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-gray-600"><th className="px-4 py-3 text-left">SKU</th><th className="px-4 py-3 text-left">SL</th></tr></thead>
                <tbody>{shipment.sorting?.packing?.outbound?.items?.map((item) => <tr key={item.id} className="border-t border-gray-100"><td className="px-4 py-3">{item.product?.sku ?? '-'}</td><td className="px-4 py-3">{item.quantity}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Thao tác xử lý</h4>
            <div className="space-y-3">
              <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Carrier" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <button disabled={!canAct || isSubmitting} onClick={() => run(() => p06Api.selectCarrier(shipment.id, carrier || shipment.carrier))} className="w-full px-4 py-2 rounded-lg border-2 border-gray-900">Chọn carrier</button>
              <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Tracking number" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <button disabled={!canAct || isSubmitting} onClick={() => run(() => p06Api.createTracking(shipment.id, trackingNumber || undefined))} className="w-full px-4 py-2 rounded-lg border-2 border-gray-900">Tạo tracking</button>
              <button disabled={!canDriver || isSubmitting} onClick={() => run(() => p06Api.pickup(shipment.id))} className="w-full px-4 py-2 rounded-lg border-2 border-gray-900">Đã nhận hàng</button>
              <button disabled={!canDriver || isSubmitting} onClick={() => run(() => p06Api.inTransit(shipment.id))} className="w-full px-4 py-2 rounded-lg border-2 border-gray-900">Đang vận chuyển</button>
              <button disabled={!canDriver || isSubmitting} onClick={() => run(() => p06Api.outForDelivery(shipment.id))} className="w-full px-4 py-2 rounded-lg border-2 border-gray-900">Out for delivery</button>
              <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Recipient name" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery notes" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <button disabled={!canDriver || isSubmitting} onClick={() => run(() => p06Api.deliver(shipment.id, notes || undefined))} className="w-full px-4 py-2 rounded-lg border-2 border-green-600">Xác nhận giao thành công</button>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do thất bại" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <button disabled={!canDriver || isSubmitting} onClick={() => run(() => p06Api.fail(shipment.id, reason || 'Không nêu lý do'))} className="w-full px-4 py-2 rounded-lg border-2 border-red-600 text-red-600">Giao thất bại</button>
              <button disabled={!canDriver || isSubmitting} onClick={() => run(() => p06Api.return(shipment.id, reason || undefined))} className="w-full px-4 py-2 rounded-lg border-2 border-gray-900">Chuyển hoàn</button>
              <button disabled={!canDriver || isSubmitting} onClick={() => run(() => p06Api.retryDelivery(shipment.id))} className="w-full px-4 py-2 rounded-lg border-2 border-gray-900">Thử giao lại</button>
              <input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Signature" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <input value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="Delivery photo URL" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <button disabled={!canDriver || isSubmitting} onClick={() => run(() => p06Api.proofOfDelivery(shipment.id, { recipientName: recipientName || 'N/A', recipientSignature: signature || undefined, deliveryPhoto: photo || undefined, notes: notes || undefined }))} className="w-full px-4 py-2 rounded-lg border-2 border-green-600">Ghi nhận POD</button>
            </div>
            {isSubmitting && <div className="mt-4 flex items-center gap-2 text-sm text-gray-500"><RefreshCcw className="w-4 h-4 animate-spin" />Đang xử lý...</div>}
            {actionError && <div className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">{actionError}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

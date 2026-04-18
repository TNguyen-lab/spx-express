import { OutboundStatus } from '../types';

interface OutboundStatusBadgeProps {
  status: OutboundStatus;
}

const statusMap: Record<OutboundStatus, { label: string; className: string }> = {
  ORDER_RECEIVED: {
    label: 'Nhận đơn từ Shopee',
    className: 'bg-gray-100 text-gray-700',
  },
  INVENTORY_CHECKED: {
    label: 'Kiểm tra tồn kho',
    className: 'bg-blue-100 text-blue-700',
  },
  INVENTORY_SUFFICIENT: {
    label: 'Đủ hàng',
    className: 'bg-green-100 text-green-700',
  },
  INVENTORY_INSUFFICIENT: {
    label: 'Không đủ hàng',
    className: 'bg-red-100 text-red-700',
  },
  PICKING_ASSIGNED: {
    label: 'Giao điều phối',
    className: 'bg-orange-100 text-orange-700',
  },
  PICKER_ASSIGNED: {
    label: 'Giao nhân viên lấy hàng',
    className: 'bg-cyan-100 text-cyan-700',
  },
  ITEM_SCANNED: {
    label: 'Quét mã sản phẩm',
    className: 'bg-yellow-100 text-yellow-700',
  },
  PICKED_CORRECT: {
    label: 'Lấy đúng sản phẩm',
    className: 'bg-emerald-100 text-emerald-700',
  },
  PICKED_WRONG: {
    label: 'Lấy sai (quét lại)',
    className: 'bg-red-100 text-red-800',
  },
  PUT_IN_CART: {
    label: 'Cho vào giỏ hàng',
    className: 'bg-indigo-100 text-indigo-700',
  },
  SLIP_PRINTED: {
    label: 'In phiếu xuất kho (MB02)',
    className: 'bg-purple-100 text-purple-700',
  },
  MOVED_TO_PACKING: {
    label: 'Chuyển sang đóng gói',
    className: 'bg-emerald-200 text-emerald-900',
  },
};

export default function OutboundStatusBadge({ status }: OutboundStatusBadgeProps) {
  const config = statusMap[status];

  if (!config) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        {status}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

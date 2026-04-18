import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OutboundStatusBadge from '../OutboundStatusBadge';
import type { OutboundStatus } from '../../types';

describe('OutboundStatusBadge', () => {
  const statuses: OutboundStatus[] = [
    'ORDER_RECEIVED',
    'INVENTORY_CHECKED',
    'INVENTORY_SUFFICIENT',
    'INVENTORY_INSUFFICIENT',
    'PICKING_ASSIGNED',
    'PICKER_ASSIGNED',
    'ITEM_SCANNED',
    'PICKED_CORRECT',
    'PICKED_WRONG',
    'PUT_IN_CART',
    'SLIP_PRINTED',
    'MOVED_TO_PACKING',
  ];

  const expectedLabels: Record<OutboundStatus, string> = {
    ORDER_RECEIVED: 'Nhận đơn từ Shopee',
    INVENTORY_CHECKED: 'Kiểm tra tồn kho',
    INVENTORY_SUFFICIENT: 'Đủ hàng',
    INVENTORY_INSUFFICIENT: 'Không đủ hàng',
    PICKING_ASSIGNED: 'Giao điều phối',
    PICKER_ASSIGNED: 'Giao nhân viên lấy hàng',
    ITEM_SCANNED: 'Quét mã sản phẩm',
    PICKED_CORRECT: 'Lấy đúng sản phẩm',
    PICKED_WRONG: 'Lấy sai (quét lại)',
    PUT_IN_CART: 'Cho vào giỏ hàng',
    SLIP_PRINTED: 'In phiếu xuất kho (MB02)',
    MOVED_TO_PACKING: 'Chuyển sang đóng gói',
  };

  it('renders Vietnamese label for each status', () => {
    statuses.forEach((status) => {
      const { unmount } = render(<OutboundStatusBadge status={status} />);
      expect(screen.getByText(expectedLabels[status])).toBeInTheDocument();
      unmount();
    });
  });

  it('renders fallback for unknown status', () => {
    render(<OutboundStatusBadge status={'UNKNOWN_STATUS' as OutboundStatus} />);
    expect(screen.getByText('UNKNOWN_STATUS')).toBeInTheDocument();
  });

  it('applies correct CSS classes for ORDER_RECEIVED', () => {
    render(<OutboundStatusBadge status="ORDER_RECEIVED" />);
    const badge = screen.getByText('Nhận đơn từ Shopee');
    expect(badge.className).toContain('bg-gray-100');
    expect(badge.className).toContain('text-gray-700');
  });

  it('applies correct CSS classes for MOVED_TO_PACKING', () => {
    render(<OutboundStatusBadge status="MOVED_TO_PACKING" />);
    const badge = screen.getByText('Chuyển sang đóng gói');
    expect(badge.className).toContain('bg-emerald-200');
    expect(badge.className).toContain('text-emerald-900');
  });

  it('applies correct CSS classes for INVENTORY_INSUFFICIENT', () => {
    render(<OutboundStatusBadge status="INVENTORY_INSUFFICIENT" />);
    const badge = screen.getByText('Không đủ hàng');
    expect(badge.className).toContain('bg-red-100');
    expect(badge.className).toContain('text-red-700');
  });

  it('all 12 statuses render without crashing', () => {
    expect(statuses).toHaveLength(12);
  });
});

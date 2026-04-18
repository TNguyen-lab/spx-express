import { OutboundStatus } from '../types';
import { CheckCircle2, Circle, XCircle, AlertTriangle } from 'lucide-react';

interface OutboundWorkflowStepsProps {
  status: OutboundStatus;
}

const mainSteps = [
  { key: 'ORDER_RECEIVED', label: 'Nhận đơn hàng' },
  { key: 'INVENTORY_CHECKED', label: 'Kiểm tra tồn kho' },
  { key: 'PICKING_ASSIGNED', label: 'Điều phối' },
  { key: 'ITEM_SCANNED', label: 'Quét mã' },
  { key: 'PICKED_CORRECT', label: 'Lấy đúng' },
  { key: 'PUT_IN_CART', label: 'Giỏ hàng' },
  { key: 'SLIP_PRINTED', label: 'In phiếu MB02' },
  { key: 'MOVED_TO_PACKING', label: 'Đóng gói' },
] as const;

const statusIndexMap: Record<OutboundStatus, number> = {
  ORDER_RECEIVED: 0,
  INVENTORY_CHECKED: 1,
  INVENTORY_SUFFICIENT: 1,
  INVENTORY_INSUFFICIENT: 1,
  PICKING_ASSIGNED: 2,
  PICKER_ASSIGNED: 2,
  ITEM_SCANNED: 3,
  PICKED_CORRECT: 4,
  PICKED_WRONG: 3,
  PUT_IN_CART: 5,
  SLIP_PRINTED: 6,
  MOVED_TO_PACKING: 7,
};

export default function OutboundWorkflowSteps({ status }: OutboundWorkflowStepsProps) {
  const currentIndex = statusIndexMap[status];
  const isInventoryInsufficient = status === 'INVENTORY_INSUFFICIENT';
  const isPickedWrong = status === 'PICKED_WRONG';

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Tiến trình xuất kho P03</h3>

      <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
        {mainSteps.map((step, index) => {
          const isDone = !isInventoryInsufficient && !isPickedWrong && index < currentIndex;
          const isCurrent = !isInventoryInsufficient && !isPickedWrong && index === currentIndex;
          const isFuture = isInventoryInsufficient
            ? index > 1
            : isPickedWrong
            ? index > 3
            : index > currentIndex;

          return (
            <div key={step.key} className="flex flex-col items-center text-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  isDone
                    ? 'bg-green-100 border-green-500 text-green-600'
                    : isCurrent
                    ? 'bg-indigo-100 border-indigo-500 text-indigo-600'
                    : 'bg-gray-100 border-gray-300 text-gray-400'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
              </div>
              <p className={`text-xs font-medium ${isFuture ? 'text-gray-400' : 'text-gray-800'}`}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>

      {isInventoryInsufficient && (
        <div className="mt-5 p-4 rounded-xl border border-amber-200 bg-amber-50 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">Không đủ hàng</p>
            <p className="text-sm text-amber-700">
              Tồn kho không đáp ứng đủ số lượng để xuất. Cần kiểm tra lại tồn kho hoặc xử lý điều phối bổ sung.
            </p>
          </div>
        </div>
      )}

      {isPickedWrong && (
        <div className="mt-5 p-4 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="font-medium text-red-800">Lấy sai sản phẩm</p>
            <p className="text-sm text-red-600">Sản phẩm lấy chưa đúng. Vui lòng thực hiện quét lại để tiếp tục quy trình.</p>
          </div>
        </div>
      )}
    </div>
  );
}

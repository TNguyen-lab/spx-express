import { InboundStatus } from '../types';
import { CheckCircle2, Circle, XCircle, AlertTriangle } from 'lucide-react';

interface InboundWorkflowStepsProps {
  status: InboundStatus;
}

// Main linear flow steps (happy path)
const mainSteps = [
  { key: 'INBOUND_CREATED', label: 'Tạo phiếu' },
  { key: 'ITEMS_RECEIVED', label: 'Hàng đến' },
  { key: 'QUALITY_CHECKING', label: 'QC kiểm tra' },
  { key: 'QC_PASSED', label: 'QC đạt' },
  { key: 'BARCODE_CREATED', label: 'Tạo barcode' },
  { key: 'LOCATION_ASSIGNED', label: 'Gán vị trí' },
  { key: 'INVENTORY_UPDATED', label: 'Cập nhật tồn kho' },
  { key: 'INBOUND_COMPLETED', label: 'Hoàn tất' },
] as const;

// Map statuses to step indices in the main flow
// Some statuses are sub-steps or branches, so we map them to the closest main step
const statusIndexMap: Record<InboundStatus, number> = {
  INBOUND_CREATED: 0,
  ITEMS_RECEIVED: 1,
  QUALITY_CHECKING: 2,
  QC_PASSED: 3,
  QC_FAILED: 2, // Branch: maps back to QC step
  BARCODE_CREATED: 4,
  LOCATION_ASSIGNED: 5,
  STAFF_RECEIVED: 5, // Sub-step of location
  NEW_PRODUCT_CREATED: 6, // Sub-step of inventory
  INVENTORY_UPDATED: 6,
  INBOUND_COMPLETED: 7,
  INBOUND_CANCELLED: -1,
};

export default function InboundWorkflowSteps({ status }: InboundWorkflowStepsProps) {
  const currentIndex = statusIndexMap[status];
  const isFailed = status === 'QC_FAILED';
  const isCancelled = status === 'INBOUND_CANCELLED';

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Tiến trình nhập kho P02</h3>

      <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
        {mainSteps.map((step, index) => {
          const isDone = !isCancelled && !isFailed && index < currentIndex;
          const isCurrent = !isCancelled && !isFailed && index === currentIndex;
          const isFuture = !isCancelled && (isFailed ? index > 2 : index > currentIndex);

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
              <p className={`text-xs font-medium ${isFuture || (isCancelled && index !== 0) ? 'text-gray-400' : 'text-gray-800'}`}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Branch: QC Failed */}
      {isFailed && (
        <div className="mt-5 p-4 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="font-medium text-red-800">QC không đạt</p>
            <p className="text-sm text-red-600">
              Kiểm tra chất lượng thất bại - sai số lượng, hàng hư hỏng hoặc không đúng thông tin. Báo Giám đốc để phối hợp xử lý với nhà cung cấp.
            </p>
          </div>
        </div>
      )}

      {/* Cancelled */}
      {isCancelled && (
        <div className="mt-5 p-4 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <div>
            <p className="font-medium text-red-800">Phiếu nhập kho đã bị hủy</p>
            <p className="text-sm text-red-600">Quy trình kết thúc do phiếu nhập kho bị hủy.</p>
          </div>
        </div>
      )}
    </div>
  );
}

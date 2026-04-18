import prisma from '../../../../config/db.js';
import { publishEvent } from '../../../../shared/events/application-event-publisher.js';
import { OutboundStatus } from '../../../../constants/canonical-status.js';
import { OutboundEvents } from '../../domain/events/outbound.events.js';
import { getOutboundOrThrow, validateTransition } from './_shared.js';

export async function assignPicker(id: string, pickerId: string, role: string, userId: string) {
  const outbound = await getOutboundOrThrow(id);
  validateTransition(outbound.status as never, OutboundStatus.PICKER_ASSIGNED as never, role);

  const picker = await prisma.user.findUnique({ where: { id: pickerId } });
  if (!picker) {
    throw new Error('Picker not found');
  }

  const updated = await prisma.outbound.update({
    where: { id },
    data: { pickerId, status: 'PICKER_ASSIGNED' },
  });

  await publishEvent(OutboundEvents.PickerAssigned, 'Outbound', outbound.id, {
    outboundNumber: outbound.outboundNumber,
    pickerId,
    pickerName: picker.name,
  }, userId);

  return updated;
}

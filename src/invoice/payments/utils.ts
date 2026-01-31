import type { BillableService } from '../../types';

export const getBillableServiceUuid = (billableServices: Array<BillableService>, serviceName: string) => {
  if (!billableServices.length) {
    return null;
  }
  const service = billableServices.find((service) => service.name === serviceName);
  return service?.uuid ?? null;
};

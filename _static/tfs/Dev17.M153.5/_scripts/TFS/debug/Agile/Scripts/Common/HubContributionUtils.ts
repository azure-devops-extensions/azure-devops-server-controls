import { HubsService } from "VSS/Navigation/HubsService";
import * as Service from "VSS/Service";

export function getHubDisplayName(): string {
    const hubService = Service.getLocalService(HubsService);

    const selectedHubId = hubService.getSelectedHubId();
    const selectedHub = hubService.getHubById(selectedHubId);
    return selectedHub.name;
}

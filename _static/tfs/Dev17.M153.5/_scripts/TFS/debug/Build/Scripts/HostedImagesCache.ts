import MachineManagementClient = require("MachineManagement/RestClient");
import MachineManagement = require("MachineManagement/Contracts")

import FeatureAvailability = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Service = require("VSS/Service");

/**
 * Caches mms pool images
 */
export class HostedImagesCache {
    private _mmsClient: MachineManagementClient.MachineManagementHttpClient;
    private _machineManagementImagesPromise: IPromise<MachineManagement.FriendlyImageName[]>;

    constructor() {
        this._mmsClient = Service.getClient(MachineManagementClient.MachineManagementHttpClient);
    }

    public getPoolFriendlyImageNameList(refresh: boolean = false): IPromise<MachineManagement.FriendlyImageName[]> {

        if ((refresh || !this._machineManagementImagesPromise) && FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.BuildHostedImage, false)) {
            this._machineManagementImagesPromise = this._mmsClient.getPoolFriendlyImageNameList();
        }

        return this._machineManagementImagesPromise;
    }
}
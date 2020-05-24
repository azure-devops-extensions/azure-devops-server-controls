
import * as Contributions_Services from "VSS/Contributions/Services";
import * as Service from "VSS/Service";
import * as Settings_RestClient from "VSS/Settings/RestClient";
import { HubsService } from "VSS/Navigation/HubsService";

export interface AccountPageSettings {
    previousHubId: string;
    previousPivot: string;
}

export class SettingsService extends Service.VssService {

    private static DATA_PROVIDER_ID = "ms.vss-tfs-web.collection-hub-pivot-settings-data-provider";
    private static PREFIX = "AccountPage/";
    private static HUB_SUFFIX = "previousHubId";
    private static PIVOT_SUFFIX = "previousPivot";
    private _prefs: AccountPageSettings;

    constructor() {
        super();
        this._prefs = Service.getService(Contributions_Services.WebPageDataService).getPageData<AccountPageSettings>(SettingsService.DATA_PROVIDER_ID);
    }

    public getSavedHubSelection(): string {
        return this._prefs.previousHubId;
    }

    public updateHubSelection(): void {
        const selectedHubId = Service.getLocalService(HubsService).getSelectedHubId();
        if (this.getSavedHubSelection() && selectedHubId === this.getSavedHubSelection()) { return; }

        var settingsToUpdate: any = {};
        settingsToUpdate[SettingsService.PREFIX + SettingsService.HUB_SUFFIX] = selectedHubId;
        Service.getClient(Settings_RestClient.SettingsHttpClient).setEntries(settingsToUpdate, "me");
    }

    public getSavedPivot(): string {
        return this._prefs.previousPivot;
    }

    public savePivot(pivot: string): void {
        if (this.getSavedPivot() && pivot === this.getSavedPivot()) { return;}
        this._prefs.previousPivot = pivot;

        var settingsToUpdate: any = {};
        settingsToUpdate[SettingsService.PREFIX + SettingsService.PIVOT_SUFFIX] = pivot;
        Service.getClient(Settings_RestClient.SettingsHttpClient).setEntries(settingsToUpdate, "me");
    }
}


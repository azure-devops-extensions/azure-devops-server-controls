
import * as Q from "q";
import * as Contributions_Services from "VSS/Contributions/Services";
import * as Service from "VSS/Service";
import * as Settings_RestClient from "VSS/Settings/RestClient";
import { HubsService } from "VSS/Navigation/HubsService";
import { IHubItem, HubItemGroup } from "MyExperiences/Scenarios/Shared/Models";
import Utils_Date = require("VSS/Utils/Date");
import { WebPageDataService } from "VSS/Contributions/Services";

/**
 * Class to help save and retreive favorites data from the settings service dynamically.
 * 
 * See FavoritesHubDataService for initial page load favorites data from the settings service.
 */
export class FavoritesSettingsService extends Service.VssService {
    private _favoritesHubDataProviderContributionId: string = "ms.vss-tfs-web.my-experiences-favorites-hub-data-provider";
    private _webPageDataService: WebPageDataService;
    /**
     * Order # (string) => ID (string)
     */
    private _hubOrderCache: IDictionaryStringTo<string>;
    
    constructor() {
        super();
        this._webPageDataService = Service.getService(WebPageDataService);
        this.buildHubOrderCache();
    }

    private buildHubOrderCache(): void {
        this._hubOrderCache = {};

        var pageData = this._webPageDataService.getPageData<any>(this._favoritesHubDataProviderContributionId);

        if (pageData && pageData.hubOrder) {
            for (let i in pageData.hubOrder) {
                this._hubOrderCache[pageData.hubOrder[i]] = i; // Flip direction of dictionary
            }
        } 
    }

    public getHubOrder(): IDictionaryStringTo<string> {
        return this._hubOrderCache;
    }

    public saveHubGroups(hubGroupIds: string[]): void {
        var settingsToUpdate: IDictionaryStringTo<string[]> = {};
        settingsToUpdate["favorites/hubGroups"] = hubGroupIds;
        Service.getClient(Settings_RestClient.SettingsHttpClient).setEntries(settingsToUpdate, "me");
        
        /** refreshing cache to avoid conflicts that occur when items are unfavorited and hub groups are removed */
        this._hubOrderCache = {};

        for (var i = 0; i < hubGroupIds.length; i++) {
            this._hubOrderCache[i.toString()] = hubGroupIds[i];
        }
    }
}

import Contributions_Services = require("VSS/Contributions/Services");
import Service = require("VSS/Service");
import Settings_RestClient = require("VSS/Settings/RestClient");

export class SettingsService extends Service.VssService {

    private static DATA_PROVIDER_ID = "ms.vss-tfs-web.navigation-settings-data-provider";
    private static PREFIX = "Navigation/";
    private static USER_KEY = "user";

    private _prefs: IDictionaryStringTo<any>;

    constructor() {
        super();

        this.initializeSettings();
    }
   
    private initializeSettings() {
        var webPageDataService = Service.getService(Contributions_Services.WebPageDataService);

        this._prefs = webPageDataService.getPageData<any>(SettingsService.DATA_PROVIDER_ID) || {};
        if (!this._prefs[SettingsService.USER_KEY]) {
            this._prefs[SettingsService.USER_KEY] = <IDictionaryStringTo<any>>{};
        }
    }

    public setUserSetting(name: string, value: any) {

        // Save preference on the page
        this._prefs[SettingsService.USER_KEY][name] = value;

        // Save preference on the server
        var settingsToUpdate: any = {};
        settingsToUpdate[SettingsService.PREFIX + name] = value;
        return Service.getClient(Settings_RestClient.SettingsHttpClient).setEntries(settingsToUpdate, "me");
    }

    public getUserSetting<T>(name: string, defaultValue?: T): T {

        var value = this._prefs[SettingsService.USER_KEY][name];
        if (value !== undefined && value !== null) {
            return value;
        } else {
            return defaultValue;
        }
    }  

}


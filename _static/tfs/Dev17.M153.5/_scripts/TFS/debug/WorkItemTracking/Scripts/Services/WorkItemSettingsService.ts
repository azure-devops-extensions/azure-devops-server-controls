import * as Service from "VSS/Service";
import { WebPageDataService } from "VSS/Contributions/Services";
import Settings_RestClient = require("VSS/Settings/RestClient");
import { WorkItemSettingsConstants } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";

export interface IWorkItemSettings {
    workItemPaneMode: string;
}

export class WorkItemSettingsService {
    private static _instance: WorkItemSettingsService;
    private _settings: IWorkItemSettings;

    public static getInstance(): WorkItemSettingsService {
        if (!this._instance) {
            this._instance = new WorkItemSettingsService();

            let pageDataService = Service.getService(WebPageDataService);
            this._instance._settings = pageDataService.getPageData(WorkItemSettingsConstants.DataProviderName) as IWorkItemSettings;
        }

        return this._instance;
    }

    public getUserSettings(): IWorkItemSettings {
        return this._settings;
    }

    public setUserSettings(settings: IWorkItemSettings): void {
        this._settings = settings;

        Settings_RestClient.getClient().setEntries({
            [WorkItemSettingsConstants.Path]: this._settings
        }, "me");
    }
}
/*
* ---------------------------------------------------------
* Copyright(C) Microsoft Corporation. All rights reserved.
* ---------------------------------------------------------
*/

import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as TFS_WebSettingsService from "Presentation/Scripts/TFS/TFS.WebSettingsService";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as NavigationService from "VSS/Navigation/Services";
import * as Utils_String from "VSS/Utils/String";
import * as Diag from "VSS/Diag";
import VSS = require("VSS/VSS");

export interface IExploratorySessionUserSettings {
    detailPaneState?: boolean;
    teamFilter?: string;
    ownerFilter?: string;
    periodFilter?: string;
    queryFilterName?: string;
    queryFilterValue?: string;
    groupBySetting?: string;
    filterBySetting?: string;
}

export class ExploratorySessionUserSettings {
    private static _instance: ExploratorySessionUserSettings;

    public static getInstance(): ExploratorySessionUserSettings {
        if (!this._instance) {
            this._instance = new ExploratorySessionUserSettings();
            this._instance.fillDefaultValues();
        }
        return this._instance;
    }

    public fillDefaultValues(): void {
        this._userSettings = <IExploratorySessionUserSettings>{
            detailPaneState: true,
            teamFilter: Utils_String.empty,
            ownerFilter: "all",
            periodFilter: "90",
            queryFilterName: "None",
            queryFilterValue: "none",
            groupBySetting: "group-by-explored-workitems",
            filterBySetting: "filter-by-all"
        };
    }

    public getUserSettings(): IExploratorySessionUserSettings {
        return this._userSettings;
    }

    public setUserSettings(settings: IExploratorySessionUserSettings): void {
        this._userSettings.detailPaneState = settings.detailPaneState;
        this._userSettings.teamFilter = settings.teamFilter;
        this._userSettings.ownerFilter = settings.ownerFilter;
        this._userSettings.periodFilter = settings.periodFilter;
        this._userSettings.queryFilterName = settings.queryFilterName;
        this._userSettings.queryFilterValue = settings.queryFilterValue;
        this._userSettings.groupBySetting = settings.groupBySetting;
        this._userSettings.filterBySetting = settings.filterBySetting;
    }

    public updateUserSettings(option: string, value: any): void {
        if (!this._webSettingsService) {
            this._webSettingsService = TFS_OM_Common.Application.getConnection(TfsContext.getDefault()).getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);
        }

        this._webSettingsService.beginWriteSetting(this._composeKey(option), value);
    }

    private _composeKey(property: string): string {
        return "/" + this.testManagementMoniker + "/" + TFS_Host_TfsContext.TfsContext.getDefault().contextData.project.id + "/" + this.exploratorySessionInTestRunMoniker + "/" + property;
    }

    private _webSettingsService: TFS_WebSettingsService.WebSettingsService;
    private _userSettings: IExploratorySessionUserSettings;
    private testManagementMoniker = "TestManagement";
    private exploratorySessionInTestRunMoniker = "TestRun/ExploratorySession";
}

export class ExploratorySessionUserSettingsConstant {
    public static DetailPaneStateSettingString = "DetailPaneState";
    public static TeamFilterSettingString = "TeamFilter";
    public static OwnerFilterSettingString = "OwnerFilter";
    public static PeriodFilterSettingString = "PeriodFilter";
    public static QueryFilterNameSettingString = "QueryFilterName";
    public static QueryFilterValueSettingString = "QueryFilterValue";
    public static GroupBySettingSettingString = "GroupBySetting";
    public static FilterBySettingSettingString = "FilterBySetting";
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("ExploratorySession/UserSettings", exports);

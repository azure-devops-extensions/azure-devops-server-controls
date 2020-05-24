
import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";

import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as TFS_WebSettingsService from "Presentation/Scripts/TFS/TFS.WebSettingsService";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");

import { IGridSortOrder } from "VSS/Controls/Grids";
import { logWarning } from "VSS/Diag";
import * as NavigationService from "VSS/Navigation/Services";
import * as Utils_String from "VSS/Utils/String";
import * as Diag from "VSS/Diag";
import * as TCMPermissionUtils from "TestManagement/Scripts/Utils/TFS.TestManagement.PermissionUtils";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

export interface IColumnByName {
    columnName: string;
    width: number;
}

export interface IGroupBySetting {
    command: string;
    value?: string;
}

export interface IFilterBySetting {
    command: string;
}

export interface IUserSettings {
    testColumnWidthForBuild?: number;
    testColumnWidthForRelease?: number;
    toggleState?: boolean;
    sortOrder?: IGridSortOrder[];
    selectedColumns?: IColumnByName[];
}

export interface IViewSettings extends IUserSettings {
    groupBySetting?: IGroupBySetting;
    filterBySetting?: IFilterBySetting;
}

export class TestReportViewSettings {
    private static _instance: TestReportViewSettings;

    public static getInstance(): TestReportViewSettings {
        if (!this._instance) {
            this._instance = new TestReportViewSettings();
            this._instance.fillDefaultValues();
            this._instance._updateViewSettingsFromUrl();
        }
        return this._instance;
    }

    public updateSettings(userSettings: IUserSettings) {
        this._viewSettings.testColumnWidthForBuild = (userSettings.testColumnWidthForBuild) ? userSettings.testColumnWidthForBuild : this._viewSettings.testColumnWidthForBuild;
        this._viewSettings.testColumnWidthForBuild = (userSettings.testColumnWidthForBuild) ? userSettings.testColumnWidthForBuild : this._viewSettings.testColumnWidthForBuild;
        this._viewSettings.testColumnWidthForRelease = (userSettings.testColumnWidthForRelease) ? userSettings.testColumnWidthForRelease : this._viewSettings.testColumnWidthForRelease;

        this._viewSettings.toggleState = (userSettings.toggleState !== null && userSettings.toggleState !== undefined) ? userSettings.toggleState : this._viewSettings.toggleState; // explicit check for null as the false value can result into wrong value.

        this._viewSettings.sortOrder = (userSettings.sortOrder) ? userSettings.sortOrder : this._viewSettings.sortOrder;
        this._viewSettings.selectedColumns = (userSettings.selectedColumns) ? userSettings.selectedColumns : this._viewSettings.selectedColumns;
    }

    public getViewSettings(): IViewSettings {
        return this._viewSettings;
    }

    public fillDefaultValues(): void {

        this._viewSettings = <IViewSettings>{
            testColumnWidthForBuild: 250,
            testColumnWidthForRelease: 250,
            toggleState: true,
            sortOrder: [{ index: Common.ColumnIndices.Test, order: "asc" }],
            selectedColumns: [] = [
                { columnName: Resources.ResultGridHeader_FailingSince, width: 90 },
                { columnName: Resources.ResultGridHeader_FailingBuild, width: 90 },
                { columnName: Resources.ResultGridHeader_FailingRelease, width: 100 },
                { columnName: Resources.ResultGridHeader_Duration, width: 80 }
            ],
            groupBySetting: {
                command: Common.TestResultDetailsCommands.GroupByTestRun,
                value: Utils_String.empty
            },
            filterBySetting: {
                command: Common.TestResultDetailsCommands.FilterByFailed
            }
        };
    }

    private _updateViewSettingsFromUrl(): void {
        let state = NavigationService.getHistoryService().getCurrentState();

        if (state) {
            this._viewSettings.groupBySetting.command = this._isValidSettingString(state[CommonBase.UrlKeyWords.TestTab_DropDownPivot_GroupByOption]) ? state[CommonBase.UrlKeyWords.TestTab_DropDownPivot_GroupByOption] : this._viewSettings.groupBySetting.command;
            this._viewSettings.groupBySetting.value = this._isValidSettingString(state[CommonBase.UrlKeyWords.TestTab_DropDownPivot_GroupByValue]) ? state[CommonBase.UrlKeyWords.TestTab_DropDownPivot_GroupByValue] : this._viewSettings.groupBySetting.value;
            this._viewSettings.filterBySetting.command = this._isValidSettingString(state[CommonBase.UrlKeyWords.TestTab_DropDownPivot_FilterOption]) ? state[CommonBase.UrlKeyWords.TestTab_DropDownPivot_FilterOption] : this._viewSettings.filterBySetting.command;
        }
    }


    private _isValidSettingString(option: string): boolean {
        return !(!option);
    }

    private _viewSettings: IViewSettings;
}

export class UpdateUserSettings {

	public static updateUserSpecificSettings(view: CommonBase.ViewContext, userSettings: IUserSettings) {
		if (TCMPermissionUtils.PermissionUtils.hasTestManagementUserSettingsPermission(TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId)) {
			let jsonString = JSON.stringify(userSettings);
			if (!this._webSettingsService) {
				this._webSettingsService = TFS_OM_Common.Application.getConnection(TfsContext.getDefault()).getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);
			}
			switch (view) {
				case CommonBase.ViewContext.Build:
					this._webSettingsService.beginWriteSetting("/TestsTabInBuildUserSettings", jsonString, TFS_WebSettingsService.WebSettingsScope.User);
					break;
				case CommonBase.ViewContext.Release:
					this._webSettingsService.beginWriteSetting("/TestTabInReleaseUserSettings", jsonString, TFS_WebSettingsService.WebSettingsScope.User);
					break;
				default:
					logWarning("Updating user settings for this viewContext is not supported.");
					break;
			}
		}
    }

    private static _webSettingsService: TFS_WebSettingsService.WebSettingsService;
}
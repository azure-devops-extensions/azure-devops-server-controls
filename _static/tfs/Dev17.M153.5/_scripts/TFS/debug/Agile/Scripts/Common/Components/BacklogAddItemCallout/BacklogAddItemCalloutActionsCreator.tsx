import { AddItemInsertLocation } from "Agile/Scripts/Common/Components/BacklogAddItemCallout/BacklogAddItemCallout";
import { BacklogAddItemCalloutActions } from "Agile/Scripts/Common/Components/BacklogAddItemCallout/BacklogAddItemCalloutActions";
import { WorkItemUtils } from "Agile/Scripts/Common/Utils";
import { WebSettingsScope, WebSettingsService } from "Presentation/Scripts/TFS/TFS.WebSettingsService";
import { getService } from "VSS/Service";
import { contains } from "VSS/Utils/Array";
import { ignoreCaseComparer } from "VSS/Utils/String";
import { handleError } from "VSS/VSS";
import { WorkItemType } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

export class BacklogAddItemCalloutActionsCreator {
    private _actions: BacklogAddItemCalloutActions;

    constructor(actions: BacklogAddItemCalloutActions) {
        this._actions = actions;
    }

    public initialize(calloutId: string, defaultWorkItem: string, validWorkItemTypes: string[]): void {
        const lastUsedWorkItem = this._getWorkItemUserSetting(calloutId);
        this._actions.readLocalSettings.invoke({
            insertLocation: this._getSubmitButtonUserSetting(calloutId),
            selectedWorkItemType: contains(validWorkItemTypes, lastUsedWorkItem, ignoreCaseComparer) ? lastUsedWorkItem : contains(validWorkItemTypes, defaultWorkItem, ignoreCaseComparer) ? defaultWorkItem : validWorkItemTypes.length > 0 ? validWorkItemTypes[0] : null
        });
    }

    public setSelectedInsertLocation(calloutId: string, insertLocation: AddItemInsertLocation) {
        this._actions.insertLocationChanged.invoke(insertLocation);

        const settingsService = getService(WebSettingsService);
        settingsService.writeLocalSetting(
            this._getKeyForSubmitButtonUserSetting(calloutId),
            insertLocation.toString(),
            WebSettingsScope.User
        );
    }

    public loadWorkItemType(workItemTypeName: string): void {
        // Notify we are loading the current work item type
        this._actions.beginLoadWorkItemType.invoke(null);

        WorkItemUtils.beginGetWorkItemType(workItemTypeName).then((workItemType: WorkItemType) => {
            workItemType.store.beginGetLinkTypes(() => this._actions.workItemTypeLoaded.invoke(workItemType), this._onError);
        }, this._onError);
    }

    public setSelectedWorkItemType(calloutId: string, workItemTypeName: string) {
        this._actions.selectedWorkItemTypeChanged.invoke(workItemTypeName);

        const settingsService = getService(WebSettingsService);
        settingsService.writeLocalSetting(
            this._getKeyForWorkItemUserSetting(calloutId),
            workItemTypeName,
            WebSettingsScope.User
        );

        this.loadWorkItemType(workItemTypeName);
    }

    private _getSubmitButtonUserSetting(calloutId: string): AddItemInsertLocation {
        const settingsService = getService(WebSettingsService);
        const localSetting = settingsService.readLocalSetting(
            this._getKeyForSubmitButtonUserSetting(calloutId),
            WebSettingsScope.User
        );

        if (localSetting) {
            return parseInt(localSetting, 10);
        }

        return AddItemInsertLocation.Top;
    }

    private _getWorkItemUserSetting(calloutId: string): string {
        const settingsService = getService(WebSettingsService);
        const localSetting = settingsService.readLocalSetting(
            this._getKeyForWorkItemUserSetting(calloutId),
            WebSettingsScope.User
        );

        if (localSetting) {
            return localSetting;
        }

        return null;
    }

    private _getKeyForSubmitButtonUserSetting(calloutId: string): string {
        return `AddCalloutSubmitSettings/Submit/${calloutId}`;
    }

    private _getKeyForWorkItemUserSetting(calloutId: string): string {
        return `AddCalloutSubmitSettings/WorkItemType/${calloutId}`;
    }

    private _onError = (error: TfsError) => {
        handleError(error);
        this._actions.errorOnLoad.invoke(null);
    }
}
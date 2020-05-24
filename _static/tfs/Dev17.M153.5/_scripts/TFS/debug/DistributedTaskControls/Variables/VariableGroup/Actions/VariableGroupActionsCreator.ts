import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";
import { VariableGroupSource } from "DistributedTaskControls/Sources/VariableGroupSource";
import { IDefinitionVariableGroup, IScope, IVariableGroupReference } from "DistributedTaskControls/Variables/Common/Types";
import { VariableGroupActions, Status, IStatus,
        IUpdateScopeSelectionPayload, IInitializeScopeSelectionPayload,
        IShowEditVariableGroupPanelPayload, IToggleVariableGroupsEditModePayload } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActions";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { IUpdateScopePermissionsActionPayload } from "DistributedTaskControls/Variables/ProcessVariables/Actions/Actions";

import * as Diag from "VSS/Diag";
import * as Contracts from "TFS/DistributedTask/Contracts";

export class VariableGroupActionsCreator extends ActionCreatorBase {

    public static getKey(): string {
        return ActionCreatorKeys.VariableGroupActionsCreator;
    }

    public initialize() {
        this._actions = ActionsHubManager.GetActionsHub<VariableGroupActions>(VariableGroupActions);
    }

    /* Data Store Actions */
    
    // @deprecated(compat issue): Use handleInitializeVariableGroups method instead of this
    // Method should be removed in sprint 134
    public initializeVariableGroups(groupReferences: IVariableGroupReference[], scopes: IScope[]): void {

        this._actions.updateInitializeVariableGroupsStatus.invoke({ status: Status.InProgress });
        let groupIds = groupReferences.map((groupreference: IVariableGroupReference) => { return groupreference.groupId; });
        
        let distinctGroupIds = groupIds.filter((groupId: number, index: number) => {
            return groupIds.indexOf(groupId) === index;
        });

        VariableGroupSource.instance().beginGetVariableGroupsByIds(distinctGroupIds).then((variableGroups: Contracts.VariableGroup[]) => {

            this._actions.updateInitializeVariableGroupsStatus.invoke({ status: Status.Success });

            this._actions.initializeVariableGroups.invoke({
                groupReferences: groupReferences,
                result: variableGroups,
                scopes: scopes
            });
        }, (error: any) => {

            const message = error.message || error;
            this._actions.updateInitializeVariableGroupsStatus.invoke({ status: Status.Failure, message: message });
            Diag.logError("[VariableGroupActionsCreator.initializeVariableGroups] Unable to get variableGroups :" + error);
        });
    }

    public handleInitializeVariableGroups(groupReferences: IVariableGroupReference[], variableGroups: Contracts.VariableGroup[], scopes: IScope[]): void {
        this._actions.initializeVariableGroups.invoke({
            groupReferences: groupReferences,
            result: variableGroups,
            scopes: scopes
        });
    }

    public handleUpdateVariableGroups(groupReferences: IVariableGroupReference[], variableGroups: Contracts.VariableGroup[], scopes: IScope[]): void {
        this._actions.updateVariableGroups.invoke({
            groupReferences: groupReferences,
            result: variableGroups,
            scopes: scopes
        });
    }

    // @deprecated(compat issue): Use handleUpdateVariableGroups method instead of this
    // Method should be removed in sprint 134
    public updateVariableGroups(groupReferences: IVariableGroupReference[], scopes: IScope[]): void {
        let groupIds = groupReferences.map((groupreference: IVariableGroupReference) => { return groupreference.groupId; });

        let distinctGroupIds = groupIds.filter((groupId: number, index: number) => {
            return groupIds.indexOf(groupId) === index;
        });

        VariableGroupSource.instance().beginGetVariableGroupsByIds(distinctGroupIds).then((variableGroups: Contracts.VariableGroup[]) => {

            this._actions.updateVariableGroups.invoke({
                groupReferences: groupReferences,
                result: variableGroups,
                scopes: scopes
            });
        }, (error: any) => {
            Diag.logError("[VariableGroupActionsCreator.updateVariableGroups] Unable to get variableGroups :" + error);
        });
    }

    public addVariableGroups(variableGroups: IDefinitionVariableGroup[]): void {
        this._actions.addVariableGroups.invoke(variableGroups);
        this._actions.showLinkVariableGroupPanel.invoke(false);
        this._publishLinkVariableGroupTelemetery();
    }

    public deleteVariableGroup(variableGroupId: number): void {
        this._actions.deleteVariableGroup.invoke(variableGroupId);
        this._publishUnlinkVariableGroupTelemetery();
    }

    public fetchLinkableVariableGroups(): void {

        this._actions.updateFetchLinkableVariableGroupStatus.invoke({ status: Status.InProgress, message: null });

        VariableGroupSource.instance().beginGetVariableGroups(null, Contracts.VariableGroupActionFilter.Use).then((variableGroups: Contracts.VariableGroup[]) => {

            this._actions.updateFetchLinkableVariableGroupStatus.invoke({ status: Status.Success, message: null });
            this._actions.fetchLinkableVariableGroups.invoke(variableGroups);
        }, (error: any) => {

            const message = error.message || error;
            this._actions.updateFetchLinkableVariableGroupStatus.invoke({ status: Status.Failure, message: message });
            Diag.logError("[VariableGroupActionsCreator.fetchVariableGroups] Unable to fetch variableGroups:" + error);
        });
    }

    public updateInitializeVariableGroupsStatus(status: IStatus): void {
        this._actions.updateInitializeVariableGroupsStatus.invoke(status);
    }

    public addScopedVariableGroups(groupIds: number[], scope: IScope): void {
        VariableGroupSource.instance().beginGetVariableGroupsByIds(groupIds).then((variableGroups: Contracts.VariableGroup[]) => {
            this._actions.addScopedVariableGroups.invoke({
                groupIds: groupIds,
                result: variableGroups,
                scope: scope
            });
        }, (error: any) => {
            Diag.logError("[VariableGroupActionsCreator.updateVariableGroups] Unable to get variableGroups :" + error);
        });
    }

    public updateScopePermissions(payload: IUpdateScopePermissionsActionPayload): void {
        this._actions.updateScopePermissions.invoke(payload);
    }

    /* View Store Actions */
    public expandVariableGroup(groupKey: string): void {
        this._actions.expandVariableGroup.invoke(groupKey);
    }

    public collapseVariableGroup(groupKey: string): void {
        this._actions.collapseVariableGroup.invoke(groupKey);
    }

    public showLinkVariableGroupPanel(show: boolean): void {
        this._actions.showLinkVariableGroupPanel.invoke(show);

        if (show) {
            this._publishOpenLinkVariableGroupPanelTelemetery();
        }
    }

    public toggleEditMode(payload: IToggleVariableGroupsEditModePayload): void {
        this._actions.toggleEditMode.invoke(payload);
    }

    public showEditVariableGroupPanel(payload: IShowEditVariableGroupPanelPayload): void {
        this._actions.showEditVariableGroupPanel.invoke(payload);
    }

    public updateVariableGroup(variableGroup: IDefinitionVariableGroup): void {
        this._actions.updateVariableGroup.invoke(variableGroup);
        this._actions.showEditVariableGroupPanel.invoke({ show: false });
    }

    public filterVariableGroups(searchText: string): void {
        this._actions.filterVariableGroups.invoke(searchText);
    }

    public updateScopeSelection(updateScopeSelectionPayload: IUpdateScopeSelectionPayload): void {
        this._actions.updateScopeSelection.invoke(updateScopeSelectionPayload);
    }

    public initializeScopeSelection(initializeScopeSelectionPayload: IInitializeScopeSelectionPayload): void {
        this._actions.initializeScopeSelection.invoke(initializeScopeSelectionPayload);
    }

    /* Telemetry */
    private _publishOpenLinkVariableGroupPanelTelemetery() {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.OpenLinkVariableGroupPanel] = true;

        Telemetry.instance().publishEvent(Feature.VariableGroups, eventProperties);
    }

    private _publishLinkVariableGroupTelemetery() {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.LinkVariableGroup] = true;

        Telemetry.instance().publishEvent(Feature.VariableGroups, eventProperties);
    }

    private _publishUnlinkVariableGroupTelemetery() {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.UnlinkVariableGroup] = true;

        Telemetry.instance().publishEvent(Feature.VariableGroups, eventProperties);
    }

    private _actions: VariableGroupActions;
}

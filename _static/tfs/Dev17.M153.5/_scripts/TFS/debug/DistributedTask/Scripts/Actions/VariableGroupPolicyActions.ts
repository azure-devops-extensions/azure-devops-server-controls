import { Action } from "VSS/Flux/Action";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionsHubBase, ActionCreatorBase, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";

import { VariableGroupPolicySource } from "DistributedTask/Scripts/VariableGroupPolicySource";
import * as Constants from "DistributedTask/Scripts/Constants";

import * as Build from "TFS/Build/Contracts";
import * as Events_Services from "VSS/Events/Services";

export interface IAuthorizedVariableGroupData {
    originalVariableGroupId: string;
    authorizedResources: Build.DefinitionResourceReference[];
}

export class VariableGroupPolicyActionCreator extends ActionCreatorBase {
    public initialize(): void {
        this._actions = ActionsHubManager.GetActionsHub<VariableGroupPolicyActions>(VariableGroupPolicyActions);
    }

    public static getKey(): string {
        return VariableGroupPolicyActionCreator.ActionCreatorKey;
    }

    public loadVariableGroupPolicyData(variablegroupid: string): void {
        VariableGroupPolicySource.instance().getResourceAuthorization(variablegroupid).then((authorizedResources: Build.DefinitionResourceReference[]) => {
            this._actions.loadVariableGroupPolicyData.invoke({
                originalVariableGroupId: variablegroupid,
                authorizedResources: authorizedResources
            });
            Events_Services.getService().fire(Constants.LibraryActions.ClearErrorMessage, this);
        },
            (err: any) => {
                Events_Services.getService().fire(Constants.LibraryActions.UpdateErrorMessage, this, err.message || err);
            });
    }

    public authorizeVariableGroup(variablegroupId: string, variablegroupName: string, shouldAuthorize: boolean): void {
        //  Source call to authorize/unauthorize the variablegroup
        VariableGroupPolicySource.instance().authorizeResource(variablegroupId, variablegroupName, shouldAuthorize).then((authorizedResources: Build.DefinitionResourceReference[]) => {
            this._actions.loadVariableGroupPolicyData.invoke({
                originalVariableGroupId: variablegroupId,
                authorizedResources: authorizedResources
            });
            Events_Services.getService().fire(Constants.LibraryActions.ClearErrorMessage, this);
        },
            (err: any) => {
                Events_Services.getService().fire(Constants.LibraryActions.UpdateErrorMessage, this, err.message || err);
            }
        );
    }

    public setPolicyForAllPipelinesCheck(isEnabled: boolean): void {
        this._actions.setPolicyForAllPipelinesCheck.invoke(isEnabled);
    }

    private _actions: VariableGroupPolicyActions;
    private static ActionCreatorKey = "ACTION_CREATOR_KEY_VARIABLE_GROUP_POLICY";
}

export class VariableGroupPolicyActions extends ActionsHubBase {
    public initialize(): void {
        this._loadVariableGroupPolicyData = new Action<IAuthorizedVariableGroupData>();
        this._setPolicyForAllPipelinesCheck = new Action<boolean>();
        this._setSavedState = new Action<boolean>();
    }

    public static getKey(): string {
        return VariableGroupPolicyActions.ActionsKey;
    }

    public get loadVariableGroupPolicyData(): Action<IAuthorizedVariableGroupData> {
        return this._loadVariableGroupPolicyData;
    }

    public get setPolicyForAllPipelinesCheck(): Action<boolean> {
        return this._setPolicyForAllPipelinesCheck;
    }

    public get setSavedState(): Action<boolean> {
        return this._setSavedState;
    }

    private _setPolicyForAllPipelinesCheck: Action<boolean>;
    private _setSavedState: Action<boolean>;
    private _loadVariableGroupPolicyData: Action<IAuthorizedVariableGroupData>;
    private static ActionsKey = "ACTIONS_KEY_SERVICE_ENDPOINT_POLICY";
}

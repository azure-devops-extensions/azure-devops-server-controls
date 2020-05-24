import { IResourceFieldNamePayload, IResourceFieldTypePayload, ResourcesActions } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/ResourcesActions";
import { ActionCreatorKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";


import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";

export class ResourcesActionCreator extends ActionsBase.ActionCreatorBase {
    private _actions: ResourcesActions;

    public initialize() {
        this._actions = ActionsHubManager.GetActionsHub<ResourcesActions>(ResourcesActions);
    }

    public static getKey(): string {
        return ActionCreatorKeys.Resources_ActionCreator;
    }

    public addResource(emptyActionPayload: IEmptyActionPayload): void {
        this.getActionsHub().addResource.invoke(emptyActionPayload);
    }

    public updateResourceFieldType(index: number, resourceType: string): void {
        this.getActionsHub().updateResourceFieldType.invoke({
            index: index,
            value: resourceType
        } as IResourceFieldTypePayload);
    }

    public updateResourceFieldName(index: number, resourceName: string): void {
        this.getActionsHub().updateResourceFieldName.invoke({
            index: index,
            value: resourceName
        } as IResourceFieldNamePayload);
    }

    public deleteResource(index: number): void {
        this.getActionsHub().deleteResource.invoke(index);
    }
    
    public getActionsHub(): ResourcesActions {
        return this._actions;
    }
}

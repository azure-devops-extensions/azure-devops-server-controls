import { Action } from "VSS/Flux/Action";
import { showErrorAction, clearErrorAction } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";
import { getClient, getCollectionService } from "VSS/Service";
import ProcessRestClient = require("TFS/WorkItemTracking/ProcessRestClient");
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");

export interface IWorkItemTypeAllFieldsDataLoadedPayload {
    processId: string;
    witRefName: string;
    witFieldModels: ProcessContracts.FieldModel[];
}

export var workItemTypeAllFieldsLoadedAction = new Action<IWorkItemTypeAllFieldsDataLoadedPayload>();

export module WorkItemTypeFieldsActionCreator {

    export function beginGetWorkItemTypeAllFieldsData(processId: string, witRefName: string): IPromise<ProcessContracts.FieldModel[]> {
        return getClient(ProcessRestClient.WorkItemTrackingProcessHttpClient4_1).getWorkItemTypeFields(processId, witRefName)
            .then<ProcessContracts.FieldModel[]>((workItemTypeFields: ProcessContracts.FieldModel[]) => {
                workItemTypeAllFieldsLoadedAction.invoke({
                    processId: processId,
                    witRefName: witRefName,
                    witFieldModels: workItemTypeFields
                } as IWorkItemTypeAllFieldsDataLoadedPayload);
                clearErrorAction.invoke(null);
                return workItemTypeFields;
            }, error => showErrorAction.invoke({ errorMessage: error.message }));
    }

}

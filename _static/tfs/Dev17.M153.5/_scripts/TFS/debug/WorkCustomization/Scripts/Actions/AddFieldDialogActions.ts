import { Action } from 'VSS/Flux/Action';
import { clearErrorAction, showErrorAction } from 'WorkCustomization/Scripts/Common/Actions/MessageBarActions';
import ProcessRestClient = require("TFS/WorkItemTracking/ProcessRestClient");
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import { ProcessUtils } from "WorkCustomization/Scripts/Utils/CommonUtils";
import { WorkItemTypeFieldsActionCreator, IWorkItemTypeAllFieldsDataLoadedPayload } from "WorkCustomization/Scripts/Actions/WorkItemTypeFieldsActions";

export module AddFieldDialogActionCreator {

    export function beginAddFieldToWorkItemType(field: ProcessContracts.AddProcessWorkItemTypeFieldRequest, processId: string, witRefName: string): IPromise<ProcessContracts.ProcessWorkItemTypeField> {
        return ProcessUtils.getProcessClient().addFieldToWorkItemType(field, processId, witRefName)
            .then<ProcessContracts.ProcessWorkItemTypeField>((workItemTypeField: ProcessContracts.ProcessWorkItemTypeField) => {
                // Preferably we would just update the store, but the store relies on FieldModel objects not WorkItemTypeFieldModel objects,
                // so it's best to go back to server. This is admin API so it's pretty low volume and not worth worrying about optimization.
                // We could just get the individual field if there were one, but there isn't right now.
                WorkItemTypeFieldsActionCreator.beginGetWorkItemTypeAllFieldsData(processId, witRefName);
                clearErrorAction.invoke(null);
                return workItemTypeField;
            });
    }
}

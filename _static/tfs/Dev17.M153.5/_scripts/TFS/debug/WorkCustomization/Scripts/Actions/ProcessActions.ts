import { Action } from "VSS/Flux/Action";
import { showErrorAction, clearErrorAction } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import ProcessesHttpClient = require("TFS/WorkItemTracking/ProcessRestClient");
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import * as DialogActions from "WorkCustomization/Scripts/Dialogs/Actions/DialogActions";
import { ProcessUtils } from "WorkCustomization/Scripts/Utils/CommonUtils";

export interface IEndGetProcessesActionPayload {
    processes: ProcessContracts.ProcessInfo[];
}

export var endGetProcessesWithProjectsAction = new Action<IEndGetProcessesActionPayload>();

export module ProcessesActionCreator {
    export function beginGetProcessesWithProjects(clearError: boolean = true): void {
        let client = ProcessUtils.getProcessClient();

        client.getListOfProcesses(ProcessContracts.GetProcessExpandLevel.Projects)
            .then((processes: ProcessContracts.ProcessInfo[]) => {
                endGetProcessesWithProjectsAction.invoke({ processes: processes });
                if (clearError) {
                    clearErrorAction.invoke(null);
                }
            }, error => showErrorAction.invoke({ errorMessage: error.message }));
    }
}

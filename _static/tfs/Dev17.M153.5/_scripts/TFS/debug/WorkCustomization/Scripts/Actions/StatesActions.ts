import { Action } from 'VSS/Flux/Action';
import { clearErrorAction, showErrorAction } from 'WorkCustomization/Scripts/Common/Actions/MessageBarActions';
import { ProcessUtils } from 'WorkCustomization/Scripts/Utils/CommonUtils';
import ProcessRestClient = require("TFS/WorkItemTracking/ProcessRestClient");
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");

export interface IStatesLoadedPayload {
    processId: string;
    witRefName: string;
    states: ProcessContracts.WorkItemStateResultModel[];
}

export var statesLoadedAction = new Action<IStatesLoadedPayload>();

export module StatesActionCreator {

    export function beginGetWorkItemTypeStates(processId: string, witRefName: string, errorBarId?: string): IPromise<ProcessContracts.WorkItemStateResultModel[]> {
        return ProcessUtils.getProcessClient().getStateDefinitions(processId, witRefName)
            .then<ProcessContracts.WorkItemStateResultModel[]>((states: ProcessContracts.WorkItemStateResultModel[]) => {
                statesLoadedAction.invoke({
                    processId: processId,
                    witRefName: witRefName,
                    states: states
                } as IStatesLoadedPayload);
                clearErrorAction.invoke(null);
                return states;
            }, error => showErrorAction.invoke({ errorMessage: error.message }));
    }

    export function beginCreateStateDefinition(stateModel: ProcessContracts.WorkItemStateInputModel, processId: string, witRefName: string, errorBarId?: string): IPromise<ProcessContracts.WorkItemStateResultModel> {
        return ProcessUtils.getProcessClient().createStateDefinition(stateModel, processId, witRefName)
            .then<ProcessContracts.WorkItemStateResultModel>((state: ProcessContracts.WorkItemStateResultModel) => {
                // At first glance this might appear hacky - why do we have to re-fetch all states when one simply changed?
                // The reason is because if the user action affected the order of states, the order of other states will be affected
                // and so we need to get them all again
                beginGetWorkItemTypeStates(processId, witRefName, errorBarId);
                clearErrorAction.invoke(null);
                return state;
            }, error => showErrorAction.invoke({ errorMessage: error.message }));
    }

    export function beginUpdateStateDefinition(stateModel: ProcessContracts.WorkItemStateInputModel, processId: string, witRefName: string, stateId: string, errorBarId?: string): IPromise<ProcessContracts.WorkItemStateResultModel> {
        return ProcessUtils.getProcessClient().updateStateDefinition(stateModel, processId, witRefName, stateId)
            .then<ProcessContracts.WorkItemStateResultModel>((state: ProcessContracts.WorkItemStateResultModel) => {
                // At first glance this might appear hacky - why do we have to re-fetch all states when one simply changed?
                // The reason is because if the user action affected the order of states, the order of other states will be affected
                // and so we need to get them all again
                beginGetWorkItemTypeStates(processId, witRefName, errorBarId);
                clearErrorAction.invoke(null);
                return state;
            }, error => showErrorAction.invoke({ errorMessage: error.message }));
    }

    export function beginDeleteStateDefinition(processId: string, witRefName: string, stateId: string, errorBarId?: string): IPromise<void> {
        return ProcessUtils.getProcessClient().deleteStateDefinition(processId, witRefName, stateId)
            .then<void>(() => {
                // At first glance this might appear hacky - why do we have to re-fetch all states when one simply changed?
                // The reason is because if the user action affected the order of states, the order of other states will be affected
                // and so we need to get them all again
                beginGetWorkItemTypeStates(processId, witRefName, errorBarId);
                clearErrorAction.invoke(null);
            }, error => showErrorAction.invoke({ errorMessage: error.message }));
    }

    export function beginHideStateDefinition(stateModel: ProcessContracts.HideStateModel, processId: string, witRefName: string, stateId: string, errorBarId?: string): void {
        ProcessUtils.getProcessClient().hideStateDefinition(stateModel, processId, witRefName, stateId)
            .then((state: ProcessContracts.WorkItemStateResultModel) => {
                // At first glance this might appear hacky - why do we have to re-fetch all states when one simply changed?
                // The reason is because if the user action affected the order of states, the order of other states will be affected
                // and so we need to get them all again
                beginGetWorkItemTypeStates(processId, witRefName, errorBarId);
                clearErrorAction.invoke(null);
            }, error => showErrorAction.invoke({ errorMessage: error.message }));
    }
}

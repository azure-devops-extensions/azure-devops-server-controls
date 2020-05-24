import Q = require("q");
import { Action } from "VSS/Flux/Action";
import { showErrorAction, clearErrorAction } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";
import { ProcessUtils } from "WorkCustomization/Scripts/Utils/CommonUtils";
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import ProcessesHttpClient = require("TFS/WorkItemTracking/ProcessRestClient");
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import StringUtils = require("VSS/Utils/String");

export interface IWorkItemTypePayload {
    processId: string;
}
export interface IGetWorkItemTypePayload extends IWorkItemTypePayload {
    workItemType: ProcessContracts.ProcessWorkItemType;
    hasFullData: boolean;
}
export interface IGetWorkItemTypesPayload extends IWorkItemTypePayload {
    workItemTypes: ProcessContracts.ProcessWorkItemType[];
    hasFullData: boolean;
}
export interface IUpdateWorkItemTypePayload extends IWorkItemTypePayload {
    workItemType: ProcessContracts.ProcessWorkItemType;
}

export interface IDeleteWorkItemTypePayload extends IWorkItemTypePayload {
    workItemTypeId: string;
}

export var endGetWorkItemTypeAction = new Action<IGetWorkItemTypePayload>();
export var endGetWorkItemTypesAction = new Action<IGetWorkItemTypesPayload>();
export var endCreateWorkItemTypeAction = new Action<IGetWorkItemTypePayload>();
export var endUpdateWorkItemTypeAction = new Action<IGetWorkItemTypePayload>();
export var endDeleteWorkItemTypeAction = new Action<IDeleteWorkItemTypePayload>();

export module WorkItemTypesActionCreator {
    export function beginGetWorkItemType(processId: string, workItemTypeId: string): IPromise<IGetWorkItemTypePayload> {
        let httpClient = ProcessUtils.getProcessClient();

        return httpClient.getProcessWorkItemType(
            processId,
            workItemTypeId,
            ProcessContracts.GetWorkItemTypeExpand.States + ProcessContracts.GetWorkItemTypeExpand.Layout)
            .then<IGetWorkItemTypePayload>((wit: ProcessContracts.ProcessWorkItemType) => {
                let payload: IGetWorkItemTypePayload = { processId: processId, workItemType: wit, hasFullData: true };
                endGetWorkItemTypeAction.invoke(payload);
                clearErrorAction.invoke(null);
                fixUrlIfNeeded(wit);
                return payload;
            }, error => showErrorAction.invoke({ errorMessage: error.message }));
    }

    export function beginGetWorkItemTypes(processId: string): IPromise<ProcessContracts.ProcessWorkItemType[]> {
        let httpClient = ProcessUtils.getProcessClient();
        let deferred: Q.Deferred<ProcessContracts.ProcessWorkItemType[]> = Q.defer<ProcessContracts.ProcessWorkItemType[]>();

        httpClient.getProcessWorkItemTypes(processId, ProcessContracts.GetWorkItemTypeExpand.None)
            .then((wits: ProcessContracts.ProcessWorkItemType[]) => {
                endGetWorkItemTypesAction.invoke(
                    { processId: processId, workItemTypes: wits, hasFullData: false } as IGetWorkItemTypesPayload);
                clearErrorAction.invoke(null);
                fixUrlIfNeededForAllWorkItems(wits);
                deferred.resolve(wits);
            }, error => showErrorAction.invoke({ errorMessage: error.message }));

        return deferred.promise;
    }

    export function beginCreateDerivedWorkItemType(
        processId: string, wit: ProcessContracts.ProcessWorkItemType, isDisabled: boolean, errorBarId: string): IPromise<IGetWorkItemTypePayload> {
        let createPayload: ProcessContracts.CreateProcessWorkItemTypeRequest = {
            name: wit.name,
            color: wit.color,
            icon: wit.icon,
            description: wit.description,
            inheritsFrom: wit.referenceName,
            isDisabled: isDisabled
        };

        return beginCreateWorkItemTypeCore(processId, createPayload, false, errorBarId);
    }

    export function beginCreateWorkItemType(
        name: string, description: string, color: string, icon: string, processId: string, errorBarId: string): Q.Promise<IGetWorkItemTypePayload> {

        let createPayload: ProcessContracts.CreateProcessWorkItemTypeRequest = {
            name: name,
            color: color,
            icon: icon,
            description: description,
            inheritsFrom: null,
            isDisabled: false
        };

        return Q(beginCreateWorkItemTypeCore(processId, createPayload, true, errorBarId));
    }

    function beginCreateWorkItemTypeCore(
        processId: string, createPayload: ProcessContracts.CreateProcessWorkItemTypeRequest, navigate: boolean, errorBarId: string): IPromise<IGetWorkItemTypePayload> {

        return ProcessUtils.getProcessClient().createProcessWorkItemType(createPayload, processId)
            .then<IGetWorkItemTypePayload>((wiType: ProcessContracts.ProcessWorkItemType) => {
                return ProcessUtils.getProcessClient().getProcessWorkItemType(processId, wiType.referenceName, ProcessContracts.GetWorkItemTypeExpand.States + ProcessContracts.GetWorkItemTypeExpand.Layout)
                    .then<IGetWorkItemTypePayload>((composedWorkItemType: ProcessContracts.ProcessWorkItemType) => {
                        let payload: IGetWorkItemTypePayload = { processId: processId, workItemType: composedWorkItemType, hasFullData: true };
                        endCreateWorkItemTypeAction.invoke(payload);

                        clearErrorAction.invoke(null);

                        if (navigate) {
                            UrlUtils.navigateToWorkItemType(UrlUtils.getCurrentProcessNameFromUrl(), wiType.referenceName);
                        }

                        return payload;
                    }, error => showErrorAction.invoke({ errorBarId: errorBarId, errorMessage: error.message }));
            }, error => showErrorAction.invoke({ errorBarId: errorBarId, errorMessage: error.message }));
    }

    export function beginUpdateWorkItemType(
        witRefName: string, processId: string, description: string, color: string, icon: string, isDisabled: boolean, errorBarId: string): Q.Promise<void> {
        let updatePayload: ProcessContracts.UpdateProcessWorkItemTypeRequest = {
            color: color,
            icon: icon,
            description: description,
            isDisabled: isDisabled
        };

        return Q(ProcessUtils.getProcessClient().updateProcessWorkItemType(updatePayload, processId, witRefName)
            .then<void>((wiType: ProcessContracts.ProcessWorkItemType) => {
                return ProcessUtils.getProcessClient().getProcessWorkItemType(processId, wiType.referenceName, ProcessContracts.GetWorkItemTypeExpand.States + ProcessContracts.GetWorkItemTypeExpand.Layout)
                    .then<void>((composedWorkItemType: ProcessContracts.ProcessWorkItemType) => {
                        endUpdateWorkItemTypeAction.invoke(
                            { processId: processId, workItemType: composedWorkItemType, hasFullData: true } as IGetWorkItemTypePayload);
                        clearErrorAction.invoke(null);
                    }, error => showErrorAction.invoke({ errorBarId: errorBarId, errorMessage: error.message }));
            }, error => showErrorAction.invoke({ errorBarId: errorBarId, errorMessage: error.message })));
    }

    export function beginDeleteWorkItemType(processId: string, workItemTypeId: string, errorBarId: string): IPromise<void> {
        let httpClient = ProcessUtils.getProcessClient();

        return httpClient.deleteProcessWorkItemType(processId, workItemTypeId)
            .then<void>(() => {
                endDeleteWorkItemTypeAction.invoke({ processId: processId, workItemTypeId: workItemTypeId } as IDeleteWorkItemTypePayload);
                clearErrorAction.invoke(null);

                UrlUtils.replaceHistoryPointWithProcessOverviewPage();
            }, error => showErrorAction.invoke({ errorBarId: errorBarId, errorMessage: error.message }));
    }
}

function fixUrlIfNeeded(wit: ProcessContracts.ProcessWorkItemType) {
    var currentRefName = UrlUtils.getCurrentWorkItemTypeIdFromUrl();
    if (currentRefName != null && wit != null && StringUtils.equals(wit.inherits, currentRefName, true) && !StringUtils.equals(wit.referenceName, currentRefName, true)) {
        UrlUtils.replaceCurrentWorkItemTypeId(wit.referenceName);
        window.location.href = window.location.href;
        return true;
    }
    return false;
}

function fixUrlIfNeededForAllWorkItems(wits: ProcessContracts.ProcessWorkItemType[]) {
    if (wits != null) {
        for (var i = 0; i < wits.length; i++) {
            var wit = wits[i];
            if (fixUrlIfNeeded(wit)) {
                break;
            }
        }
    }
}

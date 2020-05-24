import * as NavigationServices from "VSS/Navigation/Services";
import { NavigationActions, NavigationParameters } from "WorkCustomization/Scripts/Constants";
import { CreateProcessToMigrateProjectRequestPayload } from "WorkCustomization/Scripts/Contracts/CreateProcessToMigrateProject";
import EventsDocuments = require("VSS/Events/Document");
import * as React from 'react';
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");

export namespace UrlUtils {

    export function checkRunningDocumentsTable(ev: Event): boolean {

        var runningDocumentsTable = EventsDocuments.getRunningDocumentsTable();
        // determine if any documents have been modified and, if so, if trying to access the same tab that is currently open
        let mouseEvent:any = ev;
        if (runningDocumentsTable.isModified()
            && !(mouseEvent != null && mouseEvent.currentTarget != null && mouseEvent.srcElement != null && mouseEvent.currentTarget.URL != null && mouseEvent.srcElement != null &&
                NavigationServices.HistoryService.deserializeState(mouseEvent.currentTarget.URL)["action"] === 
                NavigationServices.HistoryService.deserializeState(mouseEvent.srcElement.href)["action"])) {
            if (!window.confirm(Resources.UnsavedChangesMessagePrompt)) {
                ev.preventDefault();
                ev.stopPropagation();
            }
        }

        return true;
    }

    export function getParameterValue(key: string): string {
        return NavigationServices.getHistoryService().getCurrentState()[key];
    }

    export function getAllProcessUrl(): string {
        return NavigationServices.getHistoryService().getFragmentActionLink(NavigationActions.AllProcesses);
    }

    export function getAllProcessesCurrentPivotUrl(): string {
        let action = NavigationActions.AllProcesses;
        if (!isProcessOverviewPage() && !isWorkItemTypeDetailsPage()) {
            action = NavigationServices.getHistoryService().getCurrentState().action || action;
        }
        return NavigationServices.getHistoryService().getFragmentActionLink(action);
    }

    export function getProcessWorkItemTypesUrl(processName: string): string {
        let data = { [NavigationParameters.ProcessName]: processName };
        return NavigationServices.getHistoryService().getFragmentActionLink(NavigationActions.ProcessWorkItemTypes, data);
    }

    export function getProcessProjectsUrl(processName: string): string {
        let data = { [NavigationParameters.ProcessName]: processName };
        return NavigationServices.getHistoryService().getFragmentActionLink(NavigationActions.ProcessProjects, data);
    }

    export function getProcessWorkItemTypeCurrentPivotUrl(processName: string): string {
        let data = { [NavigationParameters.ProcessName]: processName };
        return NavigationServices.getHistoryService().getFragmentActionLink(NavigationServices.getHistoryService().getCurrentState().action || NavigationActions.ProcessWorkItemTypes, data);
    }

    export function getWorkItemTypeLayoutUrl(processName: string, workItemTypeId: string): string {
        let data = {
            [NavigationParameters.ProcessName]: processName,
            [NavigationParameters.WorkItemTypeId]: workItemTypeId
        };
        return NavigationServices.getHistoryService().getFragmentActionLink(NavigationActions.WorkItemTypeLayout, data);
    }

    export function getWorkItemTypeCurrentPivotUrl(processName: string, workItemTypeId: string): string {
        let data = {
            [NavigationParameters.ProcessName]: processName,
            [NavigationParameters.WorkItemTypeId]: workItemTypeId
        };
        return NavigationServices.getHistoryService().getFragmentActionLink(NavigationServices.getHistoryService().getCurrentState().action || NavigationActions.WorkItemTypeLayout, data);
    }

    export function isProcessOverviewPage(): boolean {
        let action = NavigationServices.getHistoryService().getCurrentState().action;

        return action === NavigationActions.ProcessWorkItemTypes ||
            action === NavigationActions.ProcessBacklogLevels ||
            action === NavigationActions.ProcessProjects;
    }

    export function isWorkItemTypeDetailsPage(): boolean {
        let action = NavigationServices.getHistoryService().getCurrentState().action;

        return action === NavigationActions.WorkItemTypeLayout ||
            action === NavigationActions.WorkItemTypeStates ||
            action === NavigationActions.WorkItemTypeRules;
    }

    export function getCurrentProcessNameFromUrl(): string {
        return UrlUtils.getParameterValue(NavigationParameters.ProcessName);
    }

    export function getCurrentWorkItemTypeIdFromUrl(): string {
        return UrlUtils.getParameterValue(NavigationParameters.WorkItemTypeId);
    }

    export function replaceHistoryPointWithProcessOverviewPage() {
        var historyService = NavigationServices.getHistoryService();
        let data = { [NavigationParameters.ProcessName]: UrlUtils.getParameterValue(NavigationParameters.ProcessName) };
        if (data[NavigationParameters.ProcessName] != null) {
            historyService.replaceHistoryPoint(NavigationActions.ProcessWorkItemTypes, data);
        }
    }

    export function replaceHistoryPointWithWorkItemTypePage(processName: string, workItemTypeId: string) {
        let data = {
            [NavigationParameters.ProcessName]: processName,
            [NavigationParameters.WorkItemTypeId]: workItemTypeId
        };

        NavigationServices.getHistoryService().replaceHistoryPoint(NavigationActions.WorkItemTypeLayout, data);
    }

    export function replaceCurrentWorkItemTypeId(id: string) {
        const historyService = NavigationServices.getHistoryService();
        const data = historyService.getCurrentState();
        data[NavigationParameters.WorkItemTypeId] = id;
        historyService.replaceHistoryPoint(historyService.getCurrentState().action, data);
    }

    export function removeParams(params: string[]) {
        const historyService = NavigationServices.getHistoryService();
        const data = historyService.getCurrentState();

        params.forEach(paramName => {
            delete data[paramName]
        });

        historyService.replaceHistoryPoint(historyService.getCurrentState().action, data);
    }

    export function addParam(paramName: string, paramValue: string): void {
        const historyService = NavigationServices.getHistoryService();
        const data = historyService.getCurrentState();

        data[paramName] = paramValue;
        historyService.replaceHistoryPoint(historyService.getCurrentState().action, data);
    }

    export function navigateToWorkItemType(processName: string, workItemTypeId: string): void {
        window.location.href = UrlUtils.getWorkItemTypeLayoutUrl(processName, workItemTypeId);
    }

    export function navigateToProcessOverview(processName: string): void {
        window.location.href = UrlUtils.getProcessWorkItemTypesUrl(processName);
    }

    export function navigateToAllProcesses(): void {
        window.location.href = UrlUtils.getAllProcessUrl();
    }

    /**
     *  Returns the url request to create process and migrate project if any
     */
    export function getCreateProcessToMigrateProjectRequest(): CreateProcessToMigrateProjectRequestPayload {
        let project = UrlUtils.getParameterValue(NavigationParameters.WizardProjectId);
        let wit = UrlUtils.getParameterValue(NavigationParameters.WizardWitRefName);

        let data: CreateProcessToMigrateProjectRequestPayload = {
            projectId: project,
            workItemTypeId: wit,
        };
        return data;
    }
}
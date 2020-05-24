import * as BaseStore from "VSS/Flux/Store";

import WorkItemTypesActions = require("WorkCustomization/Scripts/Actions/WorkItemTypesActions");
import CollectionFieldsActions = require("WorkCustomization/Scripts/Actions/CollectionFieldsActions");
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");

import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");

import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import { getCollectionService } from "VSS/Service";
import { PageDataService } from "WorkCustomization/Scripts/WebApi/PageDataService";
import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";
import * as Interfaces from "Admin/Scripts/BacklogLevels/Interfaces";
import { ActionsHub } from "Admin/Scripts/BacklogLevels/Actions/ActionsHub";
import { updateFilterAction, IFilterUpdatePayload } from "WorkCustomization/Scripts/Common/Actions/ProcessAdminFilterActions";
import { statesLoadedAction, IStatesLoadedPayload } from "WorkCustomization/Scripts/Actions/StatesActions";
import { autobind } from "OfficeFabric/Utilities";

export interface IWorkItemTypeData {
    processId: string;
    workItemType: ProcessContracts.ProcessWorkItemType;
    hasFullData: boolean; // workItemType may only have basic info like name and ID initially
}

export class WorkItemTypesStore extends BaseStore.Store {
    private _workItemTypesByProcessId: IDictionaryStringTo<IDictionaryStringTo<IWorkItemTypeData>>;
    private _filter: string;
    private _hasLoadedWorkItemTypesForProcess: IDictionaryStringTo<boolean>;

    constructor() {
        super();

        this._workItemTypesByProcessId = {};
        this._hasLoadedWorkItemTypesForProcess = {};
        this._addListeners();
    }

    public getParentProcess(): IProcess {
        let currentProcessName: string = UrlUtils.getCurrentProcessNameFromUrl();
        let processes: IProcess[] = getCollectionService(PageDataService).getAllProcesses();

        let currentProcess = Utils_Array.first(processes, p => Utils_String.equals(p.name, currentProcessName, true));
        let parentProcess = Utils_Array.first(processes, p => Utils_String.equals(p.templateTypeId, currentProcess.parentTemplateTypeId, true));

        return parentProcess;
    }

    public getCurrentProcess(): IProcess {
        let currentProcessName: string = UrlUtils.getCurrentProcessNameFromUrl();
        let processes: IProcess[] = getCollectionService(PageDataService).getAllProcesses();

        let currentProcess = Utils_Array.first(processes, p => Utils_String.equals(p.name, currentProcessName, true));
        return currentProcess;
    }

    public getCurrentWorkItemType(): IWorkItemTypeData {
        let currentProcess = this.getCurrentProcess();
        if (currentProcess == null) {
            return null;
        }

        let currentWorkItemTypeId: string = UrlUtils.getCurrentWorkItemTypeIdFromUrl();

        return this.getWorkItemType(currentProcess.templateTypeId, currentWorkItemTypeId, true);
    }

    public static filterWorkItemTypes(workItemTypes: IWorkItemTypeData[], filter: string): IWorkItemTypeData[] {
        if (filter != null && filter != '') {
            return workItemTypes.filter(w => w.workItemType.name.toLocaleLowerCase().indexOf(filter.toLocaleLowerCase()) !== -1);
        }
        else {
            return workItemTypes;
        }
    }

    public getWorkItemTypes(processId: string): IWorkItemTypeData[] {
        let wits: IDictionaryStringTo<IWorkItemTypeData> = this._workItemTypesByProcessId[processId];
        // the right hand side here is false when all wits for a process have not been loaded, wit types can be loaded individually per process
        if (wits == null || !this._hasLoadedWorkItemTypesForProcess[processId]) {
            return null;
        }

        let result: IWorkItemTypeData[] = [];
        for (let witId in wits) {
            result.push(wits[witId]);
        }

        result = WorkItemTypesStore.filterWorkItemTypes(result, this._filter);

        return result.sort((a, b) => a.workItemType.name.localeCompare(b.workItemType.name));
    }

    public getWorkItemType(processId: string, workItemTypeId: string, considerInherits: boolean = false): IWorkItemTypeData {
        let wits: IDictionaryStringTo<IWorkItemTypeData> = this._workItemTypesByProcessId[processId];
        if (wits == null) {
            return null;
        }
        if (wits[workItemTypeId] != null) {
            return wits[workItemTypeId];
        }
        if (considerInherits) {
            for (let witId in wits) {
                if (wits[witId].workItemType.inherits === workItemTypeId) {
                    return wits[witId];
                }
            }
        }

        return null;
    }

    public addListenersToBacklogLevels(backlogActions: ActionsHub) {
        backlogActions.workItemTypeCreatedAction.addListener(this._onWorkItemTypeAddedFromBacklogLevels, this);
    }

    public removeListenersFromBacklogLevels(backlogActions: ActionsHub) {
        backlogActions.workItemTypeCreatedAction.removeListener(this._onWorkItemTypeAddedFromBacklogLevels);
    }

    private _addListeners(): void {
        WorkItemTypesActions.endCreateWorkItemTypeAction.addListener(this._onWorkItemTypeLoaded);
        WorkItemTypesActions.endUpdateWorkItemTypeAction.addListener(this._onWorkItemTypeLoaded);
        WorkItemTypesActions.endDeleteWorkItemTypeAction.addListener(this._onWorkItemTypeRemoved);
        WorkItemTypesActions.endGetWorkItemTypeAction.addListener(this._onWorkItemTypeLoaded);
        WorkItemTypesActions.endGetWorkItemTypesAction.addListener(this._onWorkItemTypesLoaded);
        CollectionFieldsActions.endDeleteFieldAction.addListener(this._onCollectionFieldDelete);
        updateFilterAction.addListener(this._onfilterChanged);
        statesLoadedAction.addListener(this._onWorkItemTypeStatesLoaded, this);
    }

    public dispose() {
        WorkItemTypesActions.endCreateWorkItemTypeAction.removeListener(this._onWorkItemTypeLoaded);
        WorkItemTypesActions.endUpdateWorkItemTypeAction.removeListener(this._onWorkItemTypeLoaded);
        WorkItemTypesActions.endDeleteWorkItemTypeAction.removeListener(this._onWorkItemTypeRemoved);
        WorkItemTypesActions.endGetWorkItemTypeAction.removeListener(this._onWorkItemTypeLoaded);
        WorkItemTypesActions.endGetWorkItemTypesAction.removeListener(this._onWorkItemTypesLoaded);
        CollectionFieldsActions.endDeleteFieldAction.removeListener(this._onCollectionFieldDelete);
        updateFilterAction.removeListener(this._onfilterChanged);
        statesLoadedAction.removeListener(this._onWorkItemTypeStatesLoaded);
    }

    @autobind
    private _onCollectionFieldDelete() {
        this._workItemTypesByProcessId = {};
        this.emitChanged();
    }

    @autobind
    private _onWorkItemTypeAddedFromBacklogLevels(payload: Interfaces.IWorkItemType) {
        this._onWorkItemTypeLoaded(
            {
                processId: payload.processId,
                workItemType:
                {
                    referenceName: payload.id,
                    name: payload.name,
                    customization: payload.customization,
                    color: payload.color,
                    description: payload.description,
                    inherits: payload.inherits,
                    isDisabled: payload.isDisabled
                } as ProcessContracts.ProcessWorkItemType,
                hasFullData: false
            } as WorkItemTypesActions.IGetWorkItemTypePayload);
    }

    @autobind
    private _onWorkItemTypeRemoved(payload: WorkItemTypesActions.IDeleteWorkItemTypePayload) {
        let workItemTypes = this._workItemTypesByProcessId[payload.processId];
        if (workItemTypes == null || !(payload.workItemTypeId in workItemTypes)) {
            return;
        }

        delete workItemTypes[payload.workItemTypeId];
        this.emitChanged();
    }

    @autobind
    private _onWorkItemTypeLoaded(payload: WorkItemTypesActions.IGetWorkItemTypePayload) {
        let workItemTypes = this._workItemTypesByProcessId[payload.processId];
        if (workItemTypes == null) {
            workItemTypes = this._workItemTypesByProcessId[payload.processId] = {};
        }

        workItemTypes[payload.workItemType.referenceName] =
            { workItemType: payload.workItemType, hasFullData: payload.hasFullData, processId: payload.processId } as IWorkItemTypeData;

        // we may be loading a replacement after a system work item type is derived, so make sure to remove original system entry from store
        if (payload.workItemType.inherits != null && workItemTypes[payload.workItemType.inherits] != null) {
            delete workItemTypes[payload.workItemType.inherits];
        }

        this.emitChanged();
    }

    @autobind
    private _onWorkItemTypesLoaded(payload: WorkItemTypesActions.IGetWorkItemTypesPayload) {
        let result: IDictionaryStringTo<IWorkItemTypeData> = {};

        // work item types loaded is for the list/nav, it's doesn't have all of the other gunk (layout, behaviors, states, etc.)
        for (let wit of payload.workItemTypes) {
            result[wit.referenceName] = { workItemType: wit, hasFullData: payload.hasFullData, processId: payload.processId } as IWorkItemTypeData;
        }

        this._workItemTypesByProcessId[payload.processId] = result;
        this._hasLoadedWorkItemTypesForProcess[payload.processId] = true;
        this.emitChanged();
    }

    @autobind
    private _onfilterChanged(payload: IFilterUpdatePayload): void {
        this._filter = payload.filterValue;
        this.emitChanged();
    }

    @autobind
    private _onWorkItemTypeStatesLoaded(arg: IStatesLoadedPayload): void {
        this.emitChanged();
    }

    public isFieldVisibleOnLayout(processId: string, witRefName: string, fieldReferenceName: string): boolean {

        if (!this._workItemTypesByProcessId[processId] || !this._workItemTypesByProcessId[processId][witRefName]) {
            return null;
        }

        const wit: IWorkItemTypeData = this._workItemTypesByProcessId[processId][witRefName];
        const layout: ProcessContracts.FormLayout = wit.workItemType.layout;

        for (var i = 0; i < layout.systemControls.length; i++) {
            let control: ProcessContracts.Control = layout.systemControls[i];
            if (control.id === fieldReferenceName) {
                return true;
            }
        }

        for (var p = 0; p < layout.pages.length; p++) {
            let page = layout.pages[p];
            for (var s = 0; s < page.sections.length; s++) {
                let section = page.sections[s];
                for (var g = 0; g < section.groups.length; g++) {
                    let group = section.groups[g];
                    for (var c = 0; c < group.controls.length; c++) {
                        let control: ProcessContracts.Control = group.controls[c];
                        if (control.id === fieldReferenceName) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;

    }
}

let StoreInstance: WorkItemTypesStore;
export function getWorkItemTypesStore(): WorkItemTypesStore {
    if (StoreInstance == null) {
        StoreInstance = new WorkItemTypesStore();
    }

    return StoreInstance;
}

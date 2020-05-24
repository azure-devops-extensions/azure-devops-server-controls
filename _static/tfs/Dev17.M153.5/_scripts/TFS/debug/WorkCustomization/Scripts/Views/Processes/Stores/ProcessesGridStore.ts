
import * as BaseStore from "VSS/Flux/Store";
import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";
import { endDeleteProcessAction, IEndDeleteProcessPayload } from "WorkCustomization/Scripts/Views/Processes/Actions/DeleteProcess";
import { endUpdateProcessAction, IEndUpdateProcessPayload } from "WorkCustomization/Scripts/Views/Processes/Actions/UpdateProcess";
import { endCreateProcessAction, IEndCreateProcessPayload } from "WorkCustomization/Scripts/Views/Processes/Actions/CreateProcess";

import { endSetEnableProcessAction, IEndSetEnableProcessPayload } from "WorkCustomization/Scripts/Views/Processes/Actions/SetEnableProcess";
import { endSetDefaultProcessAction, IEndSetDefaultProcessPayload } from "WorkCustomization/Scripts/Views/Processes/Actions/SetDefaultProcess";
import { endMigrateProjects, IEndMigrateProjectsPayload } from "WorkCustomization/Scripts/Actions/ProjectActions";
import { toggleGridExpanderAction, IToggleGridExpanderPayload } from "WorkCustomization/Scripts/Views/Processes/Actions/ToggleGridExpander";
import { getProcessesDataStore, ProcessesDataStore } from "WorkCustomization/Scripts/Stores/ProcessesDataStore";
import { endImportProcessAction, IEndImportProcessActionPayload } from "WorkCustomization/Scripts/Dialogs/Actions/ImportProcessActions";
import { endCloneProcessAction, IEndCloneProcessPayload } from "WorkCustomization/Scripts/Views/Processes/Actions/CloneProcess";
import { updateFilterAction, IFilterUpdatePayload } from "WorkCustomization/Scripts/Common/Actions/ProcessAdminFilterActions";
import { autobind } from "OfficeFabric/Utilities";

import Utils_Array = require("VSS/Utils/Array");

export class ProcessesGridStore extends BaseStore.Store {
    private _processesDataStore: ProcessesDataStore;
    private _parentProcessExpandedState: IDictionaryStringTo<boolean> = {};
    private _lastCreatedProcessTypeId: string = null;
    private _filter: string;
    
    constructor() {
        super();

        this._processesDataStore = getProcessesDataStore();
        let processes: IProcess[] = this._processesDataStore.getAllProcesses();

        for (var process of processes) {
            if (process.isSystemTemplate) {
                this._parentProcessExpandedState[process.templateTypeId] = true;
            }
        }

        this._addListeners();
    }

    public dispose(): void {
        this._removeListeners();
    }

    public static filterProcesses(processes: IProcess[], filter: string): IProcess[] {
        if (filter != null && filter != '') {
            processes = processes.filter(p => p.name.toLocaleLowerCase().indexOf(filter.toLocaleLowerCase()) !== -1 ||
                p.isSystemTemplate);
        }

        return processes;
    }

    public getAllProcesses(): IProcess[] {
        let processes = this._processesDataStore.getAllProcesses();
        return ProcessesGridStore.filterProcesses(processes, this._filter);
    }

    public isProcessExpanded(templateTypeId: string): boolean {
        return this._parentProcessExpandedState[templateTypeId];
    }

    public getLastCreatedProcessTypeId(): string {
        return this._lastCreatedProcessTypeId;
    }

    private _addListeners(): void {
        endCreateProcessAction.addListener(this._onCreate);
        endDeleteProcessAction.addListener(this._onDelete);
        endUpdateProcessAction.addListener(this._onUpdateProcess);
        toggleGridExpanderAction.addListener(this._onToggleExpander);
        endSetDefaultProcessAction.addListener(this._onSetDefault);
        endSetEnableProcessAction.addListener(this._onSetEnable);
        endMigrateProjects.addListener(this._onMigrate);
        endImportProcessAction.addListener(this._onImportProcess);
        endCloneProcessAction.addListener(this._onCloneProcess);
        updateFilterAction.addListener(this._onfilterChanged);
    }

    private _removeListeners(): void {
        endCreateProcessAction.removeListener(this._onCreate);
        endDeleteProcessAction.removeListener(this._onDelete);
        endUpdateProcessAction.removeListener(this._onUpdateProcess);
        toggleGridExpanderAction.removeListener(this._onToggleExpander);
        endSetEnableProcessAction.removeListener(this._onSetEnable);
        endSetDefaultProcessAction.removeListener(this._onSetDefault);
        endMigrateProjects.removeListener(this._onMigrate);
        endImportProcessAction.removeListener(this._onImportProcess);
        endCloneProcessAction.removeListener(this._onCloneProcess);
        updateFilterAction.removeListener(this._onfilterChanged);
    }

    @autobind
    private _onCloneProcess(payload: IEndCloneProcessPayload): void {
        this.emitChanged();
    }

    @autobind
    private _onImportProcess(payload: IEndImportProcessActionPayload) {
        this.emitChanged();
    }

    @autobind
    private _onMigrate(payload: IEndMigrateProjectsPayload) {
        this.emitChanged();
    }

    @autobind
    private _onCreate(payload: IEndCreateProcessPayload) {
        this._parentProcessExpandedState[payload.parentTypeId] = true;
        this._lastCreatedProcessTypeId = payload.processTemplateTypeId;
        this.emitChanged();
    }

    @autobind
    private _onDelete(payload: IEndDeleteProcessPayload) {
        this.emitChanged();
    }
    
    @autobind
    private _onUpdateProcess(payload: IEndUpdateProcessPayload) {
        this.emitChanged();
    }

    @autobind
    private _onToggleExpander(payload: IToggleGridExpanderPayload) {
        let value: boolean = this._parentProcessExpandedState[payload.templateTypeId];

        if (value !== null && value !== undefined) {
            this._parentProcessExpandedState[payload.templateTypeId] = !value;
            this.emitChanged();
        }
    }

    @autobind
    private _onSetDefault(payload: IEndSetDefaultProcessPayload) {
        this.emitChanged();
    }

    @autobind
    private _onSetEnable(payload: IEndSetEnableProcessPayload) {
        this.emitChanged();
    }

    @autobind
    private _onfilterChanged(payload: IFilterUpdatePayload): void {
        this._filter = payload.filterValue;
        this.emitChanged();
    }
}

var store: ProcessesGridStore;

export function getProcessesGridStore(): ProcessesGridStore {
    if (!store) {
        store = new ProcessesGridStore();
    }

    return store;
}

export function disposeStore(): void {
    store.dispose();
    store = null;
}

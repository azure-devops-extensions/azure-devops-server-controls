import * as BaseStore from "VSS/Flux/Store";
import { getCollectionService } from "VSS/Service";
import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";
import { PageDataService } from "WorkCustomization/Scripts/WebApi/PageDataService";
import { endDeleteProcessAction, IEndDeleteProcessPayload } from "WorkCustomization/Scripts/Views/Processes/Actions/DeleteProcess";
import { endUpdateProcessAction, IEndUpdateProcessPayload } from "WorkCustomization/Scripts/Views/Processes/Actions/UpdateProcess";
import { endCreateProcessAction, IEndCreateProcessPayload } from "WorkCustomization/Scripts/Views/Processes/Actions/CreateProcess";
import { endMigrateProjects, IEndMigrateProjectsPayload } from "WorkCustomization/Scripts/Actions/ProjectActions";
import { endSetEnableProcessAction, IEndSetEnableProcessPayload } from "WorkCustomization/Scripts/Views/Processes/Actions/SetEnableProcess";
import { endSetDefaultProcessAction, IEndSetDefaultProcessPayload } from "WorkCustomization/Scripts/Views/Processes/Actions/SetDefaultProcess";
import { endImportProcessAction, IEndImportProcessActionPayload } from "WorkCustomization/Scripts/Dialogs/Actions/ImportProcessActions";
import { endCloneProcessAction, IEndCloneProcessPayload } from "WorkCustomization/Scripts/Views/Processes/Actions/CloneProcess";

export interface IProcessDataStoreOptions {
    processes: IProcess[];
}

export class ProcessesDataStore extends BaseStore.Store {
    private _processes: IProcess[];

    constructor(options?: IProcessDataStoreOptions) {
        super();

        this._processes = options && options.processes ? options.processes : [];

        this._addListeners();
    }

    public dispose(): void {
        this._removeListeners();
    }

    public getAllProcesses(): IProcess[] {
        return this._processes;
    }

    public getProcessByName(name: string): IProcess {
        for (var process of this._processes) {
            if (process.name === name) {
                return process;
            }
        }
        return null;
    }

    public getProcessById(id: string): IProcess {
        for (var process of this._processes) {
            if (process.templateTypeId === id) {
                return process;
            }
        }
        return null;
    }

    private _addListeners(): void {
        endCreateProcessAction.addListener(this._onCreate, this);
        endDeleteProcessAction.addListener(this._onDelete, this);
        endUpdateProcessAction.addListener(this._onUpdateProcess, this);
        endSetDefaultProcessAction.addListener(this._onSetDefault, this);
        endSetEnableProcessAction.addListener(this._onSetEnable, this);
        endMigrateProjects.addListener(this._onMigrate, this);
        endImportProcessAction.addListener(this._onImportProcess, this);
        endCloneProcessAction.addListener(this._onCloneProcess, this);
    }

    private _removeListeners(): void {
        endCreateProcessAction.removeListener(this._onCreate);
        endDeleteProcessAction.removeListener(this._onDelete);
        endUpdateProcessAction.removeListener(this._onUpdateProcess);
        endSetEnableProcessAction.removeListener(this._onSetEnable);
        endSetDefaultProcessAction.removeListener(this._onSetDefault);
        endMigrateProjects.removeListener(this._onMigrate);
        endImportProcessAction.removeListener(this._onImportProcess);
        endCloneProcessAction.removeListener(this._onCloneProcess);
    }

    private _onImportProcess(payload: IEndImportProcessActionPayload) {
        this._processes = payload.processes;
        this.emitChanged();
    }

    private _onMigrate(payload: IEndMigrateProjectsPayload) {
        this._processes = payload.processes;
        this.emitChanged();
    }

    private _onCreate(payload: IEndCreateProcessPayload) {
        this._processes.push(payload.createdProcess);
        this._processes = this._sortProcesses();
        this.emitChanged();
    }

    private _onDelete(payload: IEndDeleteProcessPayload) {
        this._processes = payload.processes;
        this.emitChanged();
    }

    private _onUpdateProcess(payload: IEndUpdateProcessPayload) {
        this._processes = payload.processes;
        this.emitChanged();
    }

    private _onSetDefault(payload: IEndSetDefaultProcessPayload) {
        for (var process of this._processes) {
            process.isDefault = process.templateTypeId === payload.templateTypeId;
        }

        this.emitChanged();
    }

    private _onCloneProcess(payload: IEndCloneProcessPayload): void {
        this._processes.push(payload.process);
        this._processes = this._sortProcesses();
        this.emitChanged();
    }

    private _onSetEnable(payload: IEndSetEnableProcessPayload) {
        for (var process of this._processes) {
            if (process.templateTypeId === payload.templateTypeId) {
                process.isEnabled = payload.isEnabled;
            }
        }

        this.emitChanged();
    }

    private _sortProcesses(): IProcess[] {
        // since process names cannot be equal, no need to return 0 case
        return this._processes.sort((a:IProcess, b:IProcess) => { return a.name < b.name ? -1 : 1 });
    }
}

var store: ProcessesDataStore;

export function getProcessesDataStore(options?: IProcessDataStoreOptions): ProcessesDataStore {
    if (!store) {

        if (!options) {
            let processes = getCollectionService(PageDataService).getAllProcesses();
            options = { processes: processes }
        }

        store = new ProcessesDataStore(options);
    }

    return store;
}

export function disposeStore(): void {
    store.dispose();
    store = null;
}

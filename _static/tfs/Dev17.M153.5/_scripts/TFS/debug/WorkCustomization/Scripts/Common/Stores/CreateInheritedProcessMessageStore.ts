import * as BaseStore from "VSS/Flux/Store";
import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";
import { showCreateInheritedProcessAction, clearCreateInheritedProcessAction } from "WorkCustomization/Scripts/Common/Actions/CreateInheritedProcessMessageBarAction";

export class CreateInheritedProcessMessageStore extends BaseStore.Store {
    private _process: IProcess;

    constructor() {
        super();
        this._process = null;
        this._addListeners();
    }


    public get process(): IProcess {
        return this._process;
    }

    public dispose() {
        this._removeListeners();
    }

    private _addListeners(): void {
        showCreateInheritedProcessAction.addListener(this._onProcess, this);
        clearCreateInheritedProcessAction.addListener(this._onClearProcess, this);
    }

    private _removeListeners(): void {
        showCreateInheritedProcessAction.removeListener(this._onProcess);
        clearCreateInheritedProcessAction.removeListener(this._onClearProcess);
    }

    private _onProcess(process: IProcess) {
        this._process = process;
        this.emitChanged();
    }

    private _onClearProcess() {
        this._process = null;
        this.emitChanged();
    }

}
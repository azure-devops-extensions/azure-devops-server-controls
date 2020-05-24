import { Store } from "VSS/Flux/Store";
import { WorkItemStateResultModel } from "TFS/WorkItemTracking/ProcessContracts";
import { statesLoadedAction, IStatesLoadedPayload } from "WorkCustomization/Scripts/Actions/StatesActions";

export class StatesStore extends Store {
    private _statesByWitByProcess: IDictionaryStringTo<IDictionaryStringTo<WorkItemStateResultModel[]>>;
    private _statesByNameByWitByProcess: IDictionaryStringTo<IDictionaryStringTo<IDictionaryStringTo<WorkItemStateResultModel>>>;

    constructor() {
        super();
        this._statesByWitByProcess = {};
        this._statesByNameByWitByProcess = {};
        this._addListeners();
    }

    public getStates(processId: string, witRefName: string): WorkItemStateResultModel[] {
        if (!this._statesByWitByProcess[processId]) {
            return null;
        }
        return this._statesByWitByProcess[processId][witRefName] || null;
    }

    public getNameToStateDictionary(processId: string, witRefName: string): IDictionaryStringTo<WorkItemStateResultModel> {
        if (!this._statesByNameByWitByProcess[processId]) {
            return null;
        }
        return this._statesByNameByWitByProcess[processId][witRefName] || null;
    }

    public dispose(): void {
        statesLoadedAction.removeListener(this._onWorkItemTypeStatesLoaded);
    }

    private _addListeners(): void {
        statesLoadedAction.addListener(this._onWorkItemTypeStatesLoaded, this);
    }

    private _onWorkItemTypeStatesLoaded(arg: IStatesLoadedPayload): void {
        if (this._statesByWitByProcess[arg.processId] == null) {
            this._statesByWitByProcess[arg.processId] = {};
            this._statesByNameByWitByProcess[arg.processId] = {};
        };

        let filteredAndSortedStates: WorkItemStateResultModel[] = arg.states.sort((s1, s2) => s1.order - s2.order)
            .filter(s => !s.hidden);

        let nameToStateDictionary: IDictionaryStringTo<WorkItemStateResultModel> = {};
        arg.states.forEach(state => {
            nameToStateDictionary[state.name] = state;
        });

        this._statesByWitByProcess[arg.processId][arg.witRefName] = filteredAndSortedStates;
        this._statesByNameByWitByProcess[arg.processId][arg.witRefName] = nameToStateDictionary;

        this.emitChanged();
    }
}

var storeInstance: StatesStore;

export function getStatesStore(): StatesStore {
    if (storeInstance == null) {
        storeInstance = new StatesStore();
    }

    return storeInstance;
}

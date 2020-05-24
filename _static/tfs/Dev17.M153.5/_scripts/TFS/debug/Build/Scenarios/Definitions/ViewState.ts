import * as BaseViewStateStore from "Build/Scripts/Stores/BaseViewState";
import { PageLoadScenarios } from "Build/Scripts/Performance";

import * as Store from "VSS/Flux/Store";

import Utils_String = require("VSS/Utils/String");

export { viewStateUpdated } from "Build/Scripts/Stores/BaseViewState";

export class ViewStateStore extends Store.Store {
    private _baseStore: BaseViewStateStore.BaseViewStateStore;

    constructor(initialUrlState: any) {
        super();

        this._baseStore = BaseViewStateStore.getInstance(initialUrlState);

        this._baseStore.addChangedListener(() => {
            this.emitChanged();
        });
    }

    public getScenarioName(): string {
        let urlState = this._baseStore.getUrlState();

        // default scenario
        let scenarioName = PageLoadScenarios.MyDefinitions;

        let action: string = urlState.action;
        if (action) {
            if (Utils_String.ignoreCaseComparer(action, "mine") === 0) {
                scenarioName = PageLoadScenarios.MyDefinitions;
            }
            else if (Utils_String.ignoreCaseComparer(action, "alldefinitions") === 0) {
                scenarioName = PageLoadScenarios.AllDefinitions;
            }
            else if (Utils_String.ignoreCaseComparer(action, "queued") === 0) {
                scenarioName = PageLoadScenarios.Queued;
            }
            else if (Utils_String.ignoreCaseComparer(action, "allBuilds") === 0) {
                scenarioName = PageLoadScenarios.AllBuilds;
            }
        }

        return scenarioName;
    }

    public getAction(): string {
        return this._baseStore.getUrlState().action || null;
    }

    public getFolderPath(): string {
        return this._baseStore.getUrlState().path || "\\";
    }

    public getSearchText(): string {
        return this._baseStore.getUrlState().searchText;
    }
}

var _instance: ViewStateStore = null;
export function getInstance(initialUrlState?: any): ViewStateStore {
    if (!_instance) {
        _instance = new ViewStateStore(initialUrlState);
    }
    return _instance;
}

import * as BaseViewStateStore from "Build/Scripts/Stores/BaseViewState";
import {PageLoadScenarios} from "Build/Scripts/Performance";

import { DefinitionActions } from "Build.Common/Scripts/Linking";

import * as Store from "VSS/Flux/Store";

import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");

export {viewStateUpdated} from "Build/Scripts/Stores/BaseViewState";

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
        let scenarioName = PageLoadScenarios.DefinitionSummary;

        let action: string = urlState.action;
        if (action) {
            if (Utils_String.ignoreCaseComparer(action, DefinitionActions.Summary) === 0) {
                scenarioName = PageLoadScenarios.DefinitionSummary;
            }
            else if (Utils_String.ignoreCaseComparer(action, DefinitionActions.History) === 0) {
                scenarioName = PageLoadScenarios.DefinitionHistory;
            }
            else if (Utils_String.ignoreCaseComparer(action, DefinitionActions.Deleted) === 0) {
                scenarioName = PageLoadScenarios.DefinitionDeletedHistory;
            }
        }

        return scenarioName;
    }

    public getAction(): string {
        return this._baseStore.getUrlState().action || null;
    }

    public getDefinitionId(): number {
        return Utils_Number.parseInvariant(this._baseStore.getUrlState().definitionId || "0") || 0;
    }
}

var _instance: ViewStateStore = null;
export function getInstance(initialUrlState?: any): ViewStateStore {
    if (!_instance) {
        _instance = new ViewStateStore(initialUrlState);
    }
    return _instance;
}

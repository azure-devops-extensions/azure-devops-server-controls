/// <reference types="jquery" />
import { FilterValue } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import { Store } from "VSS/Flux/Store";


export class FilterStoreBase extends Store {
    protected _state: IDictionaryStringTo<FilterValue[]>;

    public getState(): IDictionaryStringTo<FilterValue[]> {
        return this._state;
    }
}

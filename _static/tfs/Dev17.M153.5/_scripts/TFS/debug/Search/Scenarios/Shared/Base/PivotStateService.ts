import * as Contributions_Contracts from "VSS/Contributions/Contracts";
import { VssService } from "VSS/Service";

export interface ICountState {
    searchtext: string;

    count: number;
}

export interface IPivotTabState {
    filtersString: string;

    sortOptions: string;

    countState: ICountState;
}

export interface IPivotTabProviderState {
    pivotTabs: {
        [id: string]: IPivotTabState
    }

    availableTabs: string[];
}

export interface IPivotStateService {
    updateState: (tabId: string, filtersString?: string, sortOptions?: string, countstate?: ICountState) => void;

    getState: (tabId: string) => IPivotTabState;


    resetFilters: (tabId: string) => void;

    resetCountState: (searchText: string) => void;

    state: IPivotTabProviderState;
}

export class PivotStateService extends VssService implements IPivotStateService {
    protected _state: IPivotTabProviderState = { pivotTabs: {}, availableTabs: [] } as IPivotTabProviderState;

    public get state(): IPivotTabProviderState {
        return this._state;
    }

    public updateState = (
        tabId: string,
        filtersString?: string,
        sortOptions?: string,
        countstate?: ICountState): void => {

        if (!this._state.pivotTabs[tabId]) {
            this._state.pivotTabs[tabId] = {} as IPivotTabState;
            this._state.availableTabs.push(tabId);
        }

        if (filtersString) {
            this._state.pivotTabs[tabId].filtersString = filtersString;
        }

        if (sortOptions) {
            this._state.pivotTabs[tabId].sortOptions = sortOptions;
        }

        if (countstate) {
            this._state.pivotTabs[tabId].countState = countstate;
        }
    }

    public getState = (tabId: string): IPivotTabState => {
        return this._state.pivotTabs[tabId];
    }

    public resetFilters = (tabId: string): void => {
        this._state.pivotTabs[tabId].filtersString = undefined;
    }

    public resetCountState = (text: string): void => {
        let tabId;
        for (let id in this._state.availableTabs) {
            tabId = this._state.availableTabs[id];
            if (this._state.pivotTabs[tabId].countState && this._state.pivotTabs[tabId].countState.searchtext !== text) {
                this._state.pivotTabs[tabId].countState = {} as ICountState;
            }
        }
    }
}
import * as VSSStore from "VSS/Flux/Store";
import { SearchProvider } from "Search/Scripts/React/Models";

export interface IResultsState {
    response: any;
    activityId: string;
    indexUnderFocus: number;
    availableWidth: number;
    entity: SearchProvider;
}

export interface IResultsErrorState {
    errors: any[];
    results: any;
    activityId: string;
    showMoreResults: boolean;
}

export class SearchResultsStore extends VSSStore.Store {
    private state: IResultsState;

    constructor() {
        super();
        this.state = this._getInitialState();
    }

    private _getInitialState(): IResultsState {
        return {
            activityId: "",
            response: {
                results: {
                    count: 0,
                    values: []
                },
                query: {}
            },
            indexUnderFocus: null
        } as IResultsState;
    }

    public resultsObtained(
        searchResponse: any,
        activityId: string,
        indexUnderFocus: number,
        availableWidth: number,
        entity: SearchProvider) {
        this.state.entity = entity;
        this.state.response = searchResponse;
        this.state.activityId = activityId;
        this.state.indexUnderFocus = indexUnderFocus;
        this.state.availableWidth = availableWidth;
        this.emitChanged();
    }

    public reset(): void {
        this.state = this._getInitialState();
        this.emitChanged();
    }

    public get fetchedResultsCount(): number {
        return this
            .items
            .length;
    }

    public get totalResultsCount(): number {
        return this
            .state
            .response
            .results
            .count;
    }

    public get items(): Array<any> {
        return this
            .state
            .response
            .results
            .values;
    }

    public set items(values: Array<any>) {
        this.state
            .response
            .results
            .values = $.extend(true, [], values);
    }

    public get query(): any {
        return this
            .state
            .response
            .query;
    }

    public get selectedIndex(): number {
        return this
            .state
            .indexUnderFocus;
    }

    public get availableWidth(): number {
        return this
            .state
            .availableWidth;
    }

    public get resultsMetadata(): IDictionaryStringTo<any> {
        let optionalResultsMeatadata: IDictionaryStringTo<any> = {};
        if (this.state.entity === SearchProvider.workItem) {
            let numberOfDigits: number,
                maxNumberOfDigitsTillNow: number = 0;
            this.state.response.results.values.forEach((item) => {
                numberOfDigits = item.flattenFields["system.id"].value.length;
                if (maxNumberOfDigitsTillNow < numberOfDigits) {
                    maxNumberOfDigitsTillNow = numberOfDigits;
                }
            });
            optionalResultsMeatadata["maxDigitsInWorkItemId"] = maxNumberOfDigitsTillNow;
        }

        return optionalResultsMeatadata;
    }

    public get activityId(): string {
        return this
            .state
            .activityId;
    }

    public get errors(): any[] {
        return this.state.response.errors;
    }
}

export class SearchResultsErrorStore extends VSSStore.Store {
    private state: IResultsErrorState;

    constructor() {
        super();
        this.state = {
            errors: [],
            activityId: "",
            results: {}
        } as IResultsErrorState;
    }
    
    public resultsObtained(response: any, errors: any[], activityId: string, showMoreResults: boolean) {
        this.state.errors = errors;
        this.state.activityId = activityId;
        this.state.results = response;
        this.state.showMoreResults = showMoreResults;
        this.emitChanged();
    }

    public reset(): void {
        this.state = {
            activityId: "",
            errors: [],
            results: {},
            showMoreResults: undefined
        };

        this.emitChanged();
    }

    public get ActivityId(): string {
        return this.state.activityId;
    }

    public get Errors(): any[] {
        return this.state.errors;
    }

    public get Response(): any[] {
        return this.state.results;
    }

    public get ShowMoreResults(): boolean {
        return this.state.showMoreResults;
    }
}
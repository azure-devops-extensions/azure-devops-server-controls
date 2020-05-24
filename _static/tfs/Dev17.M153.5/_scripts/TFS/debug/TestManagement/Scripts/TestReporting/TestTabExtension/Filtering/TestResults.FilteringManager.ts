import Common = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import { IFilter, FilterState } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";

import Contracts = require("TFS/TestManagement/Contracts");

import Utils_String = require("VSS/Utils/String");


class CustomSet<T> {
    constructor() {
        if (typeof Set === "undefined" || typeof Set.prototype.keys !== "function") {
            this._elementsMap = {};
        } else {
            this._set = new Set<T>();
        }
    }

    public forEach(callback: (i) => void) {
        if (typeof Set === "undefined" || typeof Set.prototype.keys !== "function") {
            Object.keys(this._elementsMap).forEach((item) => {
                callback(item);
            });
        } else {
            this._set.forEach((item) => {
                callback(item);
            });
        }
    }

    public add(item: T) {
        if (typeof Set === "undefined" || typeof Set.prototype.keys !== "function") {
            this._elementsMap[item.toString()] = true;
            this.length++;
        } else {
            this._set.add(item);
            this.length++;
        }
    }

    public has(item: T): boolean {
        if (typeof Set === "undefined" || typeof Set.prototype.keys !== "function") {
            return this._elementsMap[item.toString()];
        } else {
            return this._set.has(item);
        }
    }

    public length: number = 0;
    private _elementsMap: IDictionaryStringTo<boolean> = {};
    private _set: Set<T>;
}


export class TestResultsFilteringManager {

    constructor() {
        this.resetCache();
    }

    public resetCache() {
        this._cachedOwnerToTestCaseRefIds = {};
        this._cachedContainerToTestCaseRefIds = {};
        this._cachedOutcomeToTestResultIds = {};
        this._cachedTestCaseRefIdToTitle = {};
    }

    public populateCache(result: Contracts.ShallowTestCaseResult) {
        if (result.automatedTestStorage == null) {
            result.automatedTestStorage = Utils_String.empty;
        }
        if (!this._cachedContainerToTestCaseRefIds.hasOwnProperty(result.automatedTestStorage)) {
            this._cachedContainerToTestCaseRefIds[result.automatedTestStorage] = new CustomSet<number>();
        }
        this._cachedContainerToTestCaseRefIds[result.automatedTestStorage].add(result.refId);

        if (result.owner == null) {
            result.owner = Utils_String.empty;
        }
        if (!this._cachedOwnerToTestCaseRefIds.hasOwnProperty(result.owner)) {
            this._cachedOwnerToTestCaseRefIds[result.owner] = new CustomSet<number>();
        }
        this._cachedOwnerToTestCaseRefIds[result.owner].add(result.refId);

        if (result.outcome != null) {
            const outcome: number = Contracts.TestOutcome[result.outcome];
            if (outcome === Contracts.TestOutcome.Passed && result.isReRun) { // Passed on rerun results should also be shown with passed filter
                this._cacheOutcome(Common.TestResultsOutcomeFilterPivots.Filter_By_Passed, result.runId, result.id);
                this._cacheOutcome(Common.TestResultsOutcomeFilterPivots.Filter_By_PassedOnRerun, result.runId, result.id);

            } else if (Common.TestResultConstants.OTHER_OUTCOME_LIST.indexOf(outcome) > -1) {
                this._cacheOutcome(Common.TestResultsOutcomeFilterPivots.Filter_By_Others, result.runId, result.id);

            } else {
                this._cacheOutcome(result.outcome, result.runId, result.id);
            }
        }

        if (result.testCaseTitle) {
            this._cachedTestCaseRefIdToTitle[result.refId] = result.testCaseTitle.toLowerCase();
        }
    }

    public filterGroupedResults(groupedResults: Contracts.TestResultsDetails, filterState: FilterState): Contracts.TestResultsDetails {

        let filteredGroupedResults: Contracts.TestResultsDetails = {
            groupByField: groupedResults.groupByField,
            resultsForGroup: []
        };

        let filteredTestCaseRefIds = this._getTestCaseIdsForTheSelectedFilters(filterState);
        let filteredTestResultIds = this._getTestResultIdsForTheSelectedOutcomes(filterState);

        groupedResults.resultsForGroup.forEach((resultDetailsForGroup: Contracts.TestResultsDetailsForGroup) => {
            let filteredResultDetailsForGroup: Contracts.TestResultsDetailsForGroup = {
                groupByValue: resultDetailsForGroup.groupByValue,
                results: [],
                resultsCountByOutcome: resultDetailsForGroup.resultsCountByOutcome
            };
            if (resultDetailsForGroup.results && resultDetailsForGroup.results.length > 0) {
                resultDetailsForGroup.results.forEach((result: Contracts.TestCaseResult) => {
                    if (TestResultsFilteringManager._doesResultSatisfyFilter(result, filteredTestCaseRefIds, filteredTestResultIds)) {
                        filteredResultDetailsForGroup.results.push(result);
                    }
                });
            }
            filteredGroupedResults.resultsForGroup.push(filteredResultDetailsForGroup);
        });

        return filteredGroupedResults;
    }

    private _getTestCaseIdsForTheSelectedFilters(filterState: FilterState): CustomSet<number> {
        if (filterState == null
            || !(Common.FilterByFields.Owner in filterState
                || Common.FilterByFields.Container in filterState
                || Common.FilterByFields.TestCaseName in filterState)) {
            return null;
        }

        let filteredTestCaseIds: CustomSet<number> = null;

        for (let filterType in filterState) {
            let selectedFilterValues: IFilter = filterState[filterType];
            if (selectedFilterValues.values.length) {

                let testCaseIds: CustomSet<number> = null;
                switch (filterType) {
                    case Common.FilterByFields.Owner:
                        testCaseIds = new CustomSet<number>();
                        for (let filter of selectedFilterValues.values) {
                            if (this._cachedOwnerToTestCaseRefIds.hasOwnProperty(filter.toString())) {
                                this._cachedOwnerToTestCaseRefIds[filter.toString()].forEach((testCaseRefId) => {
                                    testCaseIds.add(testCaseRefId);
                                });
                            }
                        }
                        break;
                    case Common.FilterByFields.Container:
                        testCaseIds = new CustomSet<number>();
                        for (let filter of selectedFilterValues.values) {
                            if (this._cachedContainerToTestCaseRefIds.hasOwnProperty(filter.toString())) {
                                this._cachedContainerToTestCaseRefIds[filter.toString()].forEach((testCaseRefId) => {
                                    testCaseIds.add(testCaseRefId);
                                });
                            }
                        }
                        break;
                }
                filteredTestCaseIds = TestResultsFilteringManager._getIntersectionOfSets(filteredTestCaseIds, testCaseIds);
            }
        }
        if (filterState.hasOwnProperty(Common.FilterByFields.TestCaseName)) {
            let selectedSearchValues: IFilter = filterState[Common.FilterByFields.TestCaseName];
            if (selectedSearchValues.values && selectedSearchValues.values.length) {
                let searchText: string = selectedSearchValues.values[0].toString();
                filteredTestCaseIds = this._searchForText(searchText.toLowerCase(), filteredTestCaseIds);
            }
        }

        return filteredTestCaseIds;
    }

    private _searchForText(searchString: string, filteredTestCaseRefIds: CustomSet<number>): CustomSet<number> {
        let matchingRefIds: CustomSet<number> = new CustomSet<number>();
        if (filteredTestCaseRefIds == null) {
            for (let testCaseRefIdString in this._cachedTestCaseRefIdToTitle) {
                let testCaseRefId: number = parseInt(testCaseRefIdString);
                if (this._doesTestCaseContainSearchText(testCaseRefId, searchString)) {
                    matchingRefIds.add(testCaseRefId);
                }
            }
        } else {
            filteredTestCaseRefIds.forEach((testCaseRefId: number) => {
                if (this._doesTestCaseContainSearchText(testCaseRefId, searchString)) {
                    matchingRefIds.add(testCaseRefId);
                }
            });
        }
        return matchingRefIds;
    }

    private _doesTestCaseContainSearchText(testCaseRefId: number, searchString: string): boolean {
        let title: string = this._cachedTestCaseRefIdToTitle[testCaseRefId];
        return title.indexOf(searchString) >= 0;
    }

    private _getTestResultIdsForTheSelectedOutcomes(filterState: FilterState): CustomSet<string> {
        if (filterState == null || !(Common.FilterByFields.Outcome in filterState)) {
            return null;
        }

        let testResultIdsForSelectedOutcomes: CustomSet<string> = new CustomSet<string>();
        let selectedFilterValues: IFilter = filterState[Common.FilterByFields.Outcome];
        if (selectedFilterValues.values && selectedFilterValues.values.length) {
            for (let outcome of selectedFilterValues.values) {
                if (this._cachedOutcomeToTestResultIds.hasOwnProperty(outcome.toString())) {
                    this._cachedOutcomeToTestResultIds[outcome.toString()].forEach((runResultId: string) => {
                        testResultIdsForSelectedOutcomes.add(runResultId);
                    });
                }
            }
        }

        return testResultIdsForSelectedOutcomes;
    }

    private _cacheOutcome(outcomeString: string, runId: number, resultId: number) {
        if (!this._cachedOutcomeToTestResultIds.hasOwnProperty(outcomeString)) {
            this._cachedOutcomeToTestResultIds[outcomeString] = new CustomSet<string>();
        }
        this._cachedOutcomeToTestResultIds[outcomeString].add(TestResultsFilteringManager._getResultKey(runId, resultId));
    }

    private static _getResultKey(runId: number, resultId: number) {
        return Utils_String.format("{0}:{1}", runId, resultId);
    }

    private static _doesResultSatisfyFilter(result: Contracts.TestCaseResult, filteredTestCaseRefIds: CustomSet<number>, filteredTestResultIds: CustomSet<string>): boolean {
        return filteredTestCaseRefIds == null && filteredTestResultIds == null
            || filteredTestResultIds == null && filteredTestCaseRefIds.has(result.testCaseReferenceId)
            || filteredTestCaseRefIds == null && filteredTestResultIds.has(TestResultsFilteringManager._getResultKey(parseInt(result.testRun.id), result.id))
            || filteredTestCaseRefIds != null && filteredTestResultIds != null && filteredTestCaseRefIds.has(result.testCaseReferenceId) && filteredTestResultIds.has(TestResultsFilteringManager._getResultKey(parseInt(result.testRun.id), result.id));
    }

    private static _getIntersectionOfSets(set1: CustomSet<number>, set2: CustomSet<number>): CustomSet<number> {
        if (set2 == null) {
            return set1;
        }
        if (set1 == null) {
            return set2;
        }
        let resultSet = new CustomSet<number>();
        if (set2.length > set1.length) {
            set1.forEach((member: number) => {
                if (set2.has(member)) {
                    resultSet.add(member);
                }
            });
        } else {
            set2.forEach((member: number) => {
                if (set1.has(member)) {
                    resultSet.add(member);
                }
            });
        }
        return resultSet;
    }

    private _cachedOwnerToTestCaseRefIds: IDictionaryStringTo<CustomSet<number>>;
    private _cachedContainerToTestCaseRefIds: IDictionaryStringTo<CustomSet<number>>;
    private _cachedOutcomeToTestResultIds: IDictionaryNumberTo<CustomSet<string>>;
    private _cachedTestCaseRefIdToTitle: IDictionaryNumberTo<string>;
}


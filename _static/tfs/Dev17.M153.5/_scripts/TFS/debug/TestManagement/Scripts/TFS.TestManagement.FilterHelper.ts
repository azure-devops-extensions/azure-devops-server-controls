import * as Q from "q";
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TCMLite = require("TestManagement/Scripts/TFS.TestManagement.Lite");
import Navigation = require("VSS/Controls/Navigation");

import TFS_Core_Utils_LAZY_LOAD = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import TFS_OM_Identities_LAZY_LOAD = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import TFS_Identity_Image_LAZY_LOAD = require("Presentation/Scripts/TFS/TFS.IdentityImage");

import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

export class FilterHelper {

    private _testersInPlan: any[];
    private _configurationsInPlan: any[] = [];

    private _testPlanManager : any;

    private _testerFilterApplied: boolean = false;
    private _outcomeFilterApplied: boolean = false;
    private _configurationFilterApplied: boolean = false;

    private _testPointOutcomeFilter: Navigation.PivotFilter;
    private _testerFilter: Navigation.PivotFilter;
    private _configurationFilter: Navigation.PivotFilter;

    private static _instance: FilterHelper;

    constructor(testPlanManager: any, testerFilter: any, outcomeFilter: any, configurationFilter: any) {
        if (!FilterHelper._instance) {
            this._testPlanManager = testPlanManager;

            this._testerFilter = testerFilter;
            this._configurationFilter = configurationFilter;
            this._testPointOutcomeFilter = outcomeFilter;
            FilterHelper._instance = this;
        }

        return FilterHelper._instance;
    }

    public static getInstance() {
        return FilterHelper._instance;
    }

    public static clearInstance() {
        FilterHelper._instance = null;
    }

    public setFilterAppliedValues(data: any) {
        if (data.selectedOutcome && !(data.selectedOutcome === "")) {
            this._outcomeFilterApplied = true;
        }
        if (data.selectedConfiguration && !(data.selectedConfiguration === "")) {
            this._configurationFilterApplied = true;
        }
    }


    public static loadFilters(filterHelper: FilterHelper, data: any): IPromise<void>
    {
        if (filterHelper)
        {
            return filterHelper.loadFilters(data);
        }
        else
        {
            let deferred = Q.defer<void>();
            deferred.resolve(null);
            return deferred.promise;
        }
    }

    public loadFilters(data: any): IPromise<void> {
        let deferred = Q.defer<void>();
        this._testersInPlan = data.testers;
        this._configurationsInPlan = data.configurations;

        let outcomeFilterValues = this.getFilterItemsFromUniqueValues(TCMLite.TestOutcomes, "");
        if (this._testPointOutcomeFilter) {
            this._testPointOutcomeFilter.updateItems(outcomeFilterValues);
        }

        this._updateFilterSelection(this._testPointOutcomeFilter, "outcome", data.selectedOutcome, false);
        this._updateFilterSelection(this._configurationFilter, "configuration", this._getSelectedConfigurationName(data.selectedConfiguration), false);
        if (data.selectedTester) {
            VSS.using(["Presentation/Scripts/TFS/TFS.Core.Utils", "Presentation/Scripts/TFS/TFS.OM.Identities", "Presentation/Scripts/TFS/TFS.IdentityImage"],
            (TFS_Core_Utils: typeof TFS_Core_Utils_LAZY_LOAD, TFS_OM_Identities: typeof TFS_OM_Identities_LAZY_LOAD, IdentityImage: typeof TFS_Identity_Image_LAZY_LOAD) => {
                this._updateFilterSelection(this._testerFilter, "tester", TFS_OM_Identities.IdentityHelper.getUniquefiedIdentityName(<any>data.selectedTester), false);
                deferred.resolve(null);
            });
        } else {
            deferred.resolve(null);
        }
        return deferred.promise;
    }

    public updateFilterValues(testPoints: any, configurations: any) {
        
        this._updateConfigurationFilterValues(configurations);
        this._updateTesterFilterValues(testPoints);
    }

    public getOutcomeFilterValue(): string {
        let outcome: string = this._getSelectedValueInFilter(this._testPointOutcomeFilter);

        if (!outcome || outcome === this.ALL_FILTER) {
            outcome = "";
        }
        return outcome;
    }

    public getConfigurationFilterValue(): number {
        let config: string = this._getSelectedValueInFilter(this._configurationFilter);

        return this._getIdOfConfigurationInFilter(config);
    }

    public getTesterFilterValue(): string {
        let tester: string = this._getSelectedValueInFilter(this._testerFilter);

        return this._getTesterIdForDisplayName(tester);
    }

    public isFilterApplied(): boolean {
        return this._outcomeFilterApplied || this._testerFilterApplied || this._configurationFilterApplied;
    }

    public getValueOfTesterFilter() {
        let testerFilterValue: string = this._getSelectedValueInFilter(this._testerFilter);
        // If the tester filter is not applied then we pass "All" as filter.
        if (testerFilterValue === this.ALL_FILTER) {
            return testerFilterValue;
        } else {
            return this._getTesterFilterUniqueId(this.getTesterFilterValue());
        }
    }

    /**
     * Add the tester to the list if tester is not present.
     */
    public _addToTestersInPlan(tester: any) {
        // find if the entry already exists
        let existingTesterIds = $.map(this._testersInPlan, (t) => {
            return t.id;
        });

        if (!Utils_Array.contains(existingTesterIds, tester.id)) {
            this._testersInPlan.push(tester);
        }
    }

    private _getTesterFilterUniqueId(testerFilterValue: string): string {
        if (!testerFilterValue) {
            return "";
        }
        else {
            let index = Utils_Array.findIndex(this._testersInPlan, (val: any) => {
                return (Utils_String.ignoreCaseComparer(val.filterValue, testerFilterValue) === 0);
            });

            if (index >= 0) {
                return this._testersInPlan[index].id;
            }
        }
        return "";
    }

    /**
     * The function filters records so that all filered records match the values for the specified keys.
     * Filters the records based on the filter spec. The filter spec is an array of objects in the following format:
       [{
             key: key1,
             value: value1
        },
        {
             key: key2,
             value: value2
        },
       ]
     * @param records
     * @param filterSpec
     */
    public filter(records, filterSpec) {
        if (!filterSpec) {
            return records;
        }

        // Remove all filters whose value matches "All" as they do not play a role in filtering.
        let valueFilters = this._removeUnwantedFilters(filterSpec);
        if (valueFilters.length === 0) {
            return records;
        }

        let filteredItems = [],
            matchFound = true;

        // Do the actual filtering.
        $(records).each(function (index, item) {
            matchFound = true;
            // Ensure that we match the value for every key specified in the filter.
            for (let i = 0; i < valueFilters.length; i++) {
                matchFound = matchFound && item[valueFilters[i].key] === valueFilters[i].value;
                if (!matchFound) {
                    break;
                }
            }

            if (matchFound) {
                filteredItems.push(item);
            }
        });

        return filteredItems;
    }

    /**
     * Sets the given filter with the value passed in the parameter 
     */
    public _updateFilterSelection(filter, key: string, value: string, fireChange: boolean = true) {
        if (value) {
            let item = filter.getItem(value);
            if (item) {
                filter.setSelectedItem(item, fireChange);
            }
            else if (key === "tester" || key === "configuration") {
                filter.updateItems([{
                    text: value,
                    value: value,
                    selected: true
                }]);
                if (key === "tester" && value !== this.ALL_FILTER) {
                    this._testerFilterApplied = true;
                }
                else if (key === "configuration" && value !== this.ALL_FILTER) {
                    this._configurationFilterApplied = true;
                }
            }
        }
    }

    private _removeUnwantedFilters(filters) {
        let valueFilters = [];
        let that = this;
        $(filters).each(function (i, item: any) {
            if (item.value !== that.ALL_FILTER) {
                if (item.value === that.NONE_FILTER) {
                    item.value = null;
                }

                valueFilters.push(item);
            }
        });

        return valueFilters;
    }

    private getFilterItemsFromUniqueValues(values, currentFilterValue: string) {

        let filterValues = [];
        // Add "All" as the first filter value.
        filterValues.push({
            text: this.ALL_FILTER,
            value: this.ALL_FILTER,
            selected: !currentFilterValue || currentFilterValue === this.ALL_FILTER
        });

        values.sort((a: string, b: string) => {
            return Utils_String.localeIgnoreCaseComparer(a, b);
        });
        // Populate the filter item values.
        $(values).each(function (i, item) {
            filterValues.push({
                text: item,
                value: item,
                selected: (currentFilterValue && currentFilterValue === <any>item) ? true : false
            });
        });

        return filterValues;
    }

    private _getSelectedConfigurationName(selectedConfiguration: any) {
        let selectedConfigurationName: string = "";
        if (selectedConfiguration) {
            selectedConfigurationName = selectedConfiguration.name;
        }

        return selectedConfigurationName;
    }



    private _updateConfigurationFilterValues(configurations: any[]) {
        let selectedConfiguration: string = this._getSelectedValueInFilter(this._configurationFilter);

        let configFilterValues = [],
            configsMap = [],
            index: number;
        // Add "All" as the first filter value.
        configFilterValues.push({
            text: this.ALL_FILTER,
            value: this.ALL_FILTER,
            selected: !selectedConfiguration || selectedConfiguration === this.ALL_FILTER
        });
        $.each(configurations, (i, configuration) => {
            if (configsMap.indexOf(configuration.name) === -1) {
                configsMap.push(configuration.name);

                index = Utils_Array.findIndex(this._configurationsInPlan, (t: any) => {
                    return (t.id === configuration.id);
                });

                if (index < 0) {
                    this._configurationsInPlan.push({
                        id: configuration.id,
                        name: configuration.name,
                        variables: null
                    });
                }
            }
        });

        this._configurationsInPlan = this._configurationsInPlan.sort((a: any, b: any) => {
            return Utils_String.localeIgnoreCaseComparer(a.name, b.name);

        });

        // Populate the filter item values.
        for (let i = 0, length = this._configurationsInPlan.length; i < length; i++) {
            configFilterValues.push({
                text: this._configurationsInPlan[i].name,
                value: this._configurationsInPlan[i].name,
                selected: (selectedConfiguration && selectedConfiguration === this._configurationsInPlan[i].name) ? true : false,
            });
        }

        this._configurationFilter.updateItems(configFilterValues);
    }

    /**
     * Always add the currently selected item to the values.
     * Get the unique record values for the key and sort it.
     */
    private _getUniqueFilterValues(records: any[], key: string, currentFilterValue: string, defaultValues: string[]) {
        let uniqueValues = [];
        uniqueValues = uniqueValues.concat(defaultValues);
        if (currentFilterValue && currentFilterValue !== this.ALL_FILTER && $.inArray(currentFilterValue, uniqueValues) === -1) {
            uniqueValues.push(currentFilterValue);
        }

        $(records).each(function (i, record) {
            if (!Utils_Array.contains(uniqueValues, record[key])) {
                if (!record[key]) {
                    if (!Utils_Array.contains(uniqueValues, this.NONE_FILTER)) {
                        uniqueValues.push(this.NONE_FILTER);
                    }
                }
                else {
                    uniqueValues.push(record[key]);
                }
            }
        });

        return uniqueValues;
    }

    /**
     * Updates the pivot filter with possible values.
     */
    public _updateTesterFilterValues(testPoints) {

        VSS.using(["Presentation/Scripts/TFS/TFS.Core.Utils", "Presentation/Scripts/TFS/TFS.OM.Identities", "Presentation/Scripts/TFS/TFS.IdentityImage"],
            (TFS_Core_Utils: typeof TFS_Core_Utils_LAZY_LOAD, TFS_OM_Identities: typeof TFS_OM_Identities_LAZY_LOAD, IdentityImage: typeof TFS_Identity_Image_LAZY_LOAD) => {
                    let selectedTester = this._getSelectedValueInFilter(this._testerFilter),
                    testerFilterValues: string[] = [],
                    testersMap = new TFS_Core_Utils.Dictionary<string>(),
                    index: number;

                $.each(testPoints, (i, testPoint) => {
                    if (!testersMap.containsKey(testPoint["assignedTo"]) && testPoint["tester"]) {
                        testersMap.add(testPoint["assignedTo"], testPoint["tester"]);
                        testerFilterValues.push(testPoint["tester"]);

                        index = Utils_Array.findIndex(this._testersInPlan, (t: any) => {
                            return (Utils_String.ignoreCaseComparer(t.id, testPoint["assignedTo"]) === 0);
                        });

                        if (index >= 0) {
                            this._testersInPlan[index].filterValue = testPoint["tester"];
                        }
                    }
                });

                $.each(this._testersInPlan, (i, tester) => {
                    if (!testersMap.containsKey(tester.id)) {
                        if (!tester.filterValue) {
                            tester.filterValue = TFS_OM_Identities.IdentityHelper.getUniquefiedIdentityName(tester);
                        }
                        testerFilterValues.push(tester.filterValue);
                    }
                });

                testerFilterValues = this.getUniqueFilterValues([], "tester", selectedTester, testerFilterValues);
                $.each(testerFilterValues, (i: number, value: any) => {
                    if (value && value.text) {
                        let identity = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(value.text);
                        let getIdentityImage = function () {
                            return IdentityImage.identityImageElementByIdentifier(identity, null, value.title, identity.displayName);
                        };

                        value.id = value.text;
                        value.text = identity.displayName;
                        value.icon = identity.uniqueName ? getIdentityImage : null;
                    }
                });

                this._testerFilter.updateItems(testerFilterValues as any, { showItemIcons: true });
            });

    }

    /**
     * Gets unique filter values in the records for the specfied key
     */
    public getUniqueFilterValues(records: any[], key: string, currentFilterValue: string, defaultValues: string[]) {
        let uniqueValues = [];

        uniqueValues = this._getUniqueFilterValues(records, key, currentFilterValue, defaultValues);

        return this.getFilterItemsFromUniqueValues(uniqueValues, currentFilterValue);
    }

    private _getSelectedValueInFilter(filter): string {
        let selectedItem = filter.getSelectedItem();
        return !selectedItem ? null : selectedItem.id;
    }

    private _getTesterIdForDisplayName(name: string) {
        
        if (!name || name === this.ALL_FILTER) {
            return this.ALL_FILTER;
        }

        for (let i = 0, length = this._testersInPlan.length; i < length; i++) {
            if (this._testersInPlan[i].filterValue === name) {
                return this._testersInPlan[i].id;
            }
        }
    }

    public updateIsFilterApplied(selector: string, value: string, callback : any) {

        if (selector === TCMLite.FilterSelectors.tester) {
            let testerFilter: string = this.ALL_FILTER;
            if (value === this.ALL_FILTER) {
                this._testerFilterApplied = false;
            } else {
                testerFilter = this._getTesterIdForDisplayName(value);
                this._testerFilterApplied = true;
            }
            this._testPlanManager._updateFilterRegistryValues(null, null, testerFilter, callback);
        }
        if (selector === TCMLite.FilterSelectors.outcome) {
            if (value === this.ALL_FILTER) {
                this._outcomeFilterApplied = false;
            } else {
                this._outcomeFilterApplied = true;
            }
            this._testPlanManager._updateFilterRegistryValues(null, value, null, callback);
        }
        if (selector === TCMLite.FilterSelectors.configuration) {
            let configurationValue: number = -1;
            if (value === this.ALL_FILTER) {
                this._configurationFilterApplied = false;
            } else {
                configurationValue = this._getIdOfConfigurationInFilter(value);
                this._configurationFilterApplied = true;
            }
            this._testPlanManager._updateFilterRegistryValues(configurationValue, null, null, callback);
        }
    }

    private _getIdOfConfigurationInFilter(name: string): number {
        if (!name || name === this.ALL_FILTER) {
            return -1;
        }

        for (let i = 0, length = this._configurationsInPlan.length; i < length; i++) {
            if (this._configurationsInPlan[i].name === name) {
                return this._configurationsInPlan[i].id;
            }
        }
    }

    public ALL_FILTER: string = Resources.FilterItemAll;
    public NONE_FILTER: string = Resources.NoneFilterValue;
}
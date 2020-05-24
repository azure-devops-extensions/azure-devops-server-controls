import * as q from "q";

import { equals, localeIgnoreCaseComparer, format as StringFormat, empty as EmptyString } from "VSS/Utils/String";
import { BaseControl } from "VSS/Controls";
import * as CommonHelper from "TestManagement/Scripts/Scenarios/TestTabExtension/CommonHelper";

import * as BuildContracts from "TFS/Build/Contracts";
import * as TCMContracts from "TFS/TestManagement/Contracts";


import { Constants } from "TestManagement/Scripts/TFS.TestManagement.Lite";
import * as TCMConstants from "Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants";
import { TestResultsFilterBar } from "TestManagement/Scripts/TestReporting/TestTabExtension/Filtering/TestResults.FilterBar";
import { IFilterDataSource, FilterState } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import { ResultsGridView } from "TestManagement/Scripts/TestReporting/TestTabExtension/TestResults.Grid";
import { RightToolbar } from "TestManagement/Scripts/TestReporting/TestTabExtension/Controls";
import { ResultListViewModel } from "TestManagement/Scripts/TestReporting/TestTabExtension/TestResults.ResultListViewModel";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";

class FilterBarDataSource implements IFilterDataSource {
    private _resultsGridViewModel: ResultListViewModel;
    private _resultsGrid: ResultsGridView;

    constructor(resultsGrid: ResultsGridView, resultsGridViewModel: ResultListViewModel) {
        this._resultsGrid = resultsGrid;
        this._resultsGridViewModel = resultsGridViewModel;
    }

    /**
     * Gets called to get the unique list of filter items for the filter dropdown
     * @param fieldName
     */
    public getFieldValues(fieldName: string): string[] | IPromise<string[]> {
        return this._resultsGridViewModel.getTestResultsFieldValues(fieldName);
    }

    public getInitialFilterState(): FilterState {
        return CommonHelper.FilterHelper.getInitialFilterState();
    }

    /**
     * applies filters on the underlying data source
     * @param filterState
     */
    public applyFilters(filterState: FilterState) {
        this._resultsGrid.handleFilterUpdated(filterState);
    }
}

export class FilterBarProvider {
    public constructor(element: JQuery, resultsGrid: ResultsGridView, resultsViewModel: ResultListViewModel, filterMenubar: RightToolbar) {
        if (!FilterBarProvider._instance) {
            this._element = element;
            this._filterMenubar = filterMenubar;
            this._dataSource = new FilterBarDataSource(resultsGrid, resultsViewModel);
            this._resultListViewModel = resultsViewModel;;
            this._filterMenubar.setFilterActiveState(true); // Set the state as toggled by default as we are showing Failed results by default

            FilterBarProvider._instance = this;
        }
        return FilterBarProvider._instance;
    }

    /**
     * Get the singleton instance of FilterBarProvider
     */
    public static getInstance(): FilterBarProvider {
        return FilterBarProvider._instance;
    }

    /**
     * Toggles the filter bar.
     */
    public toggleFilterBar() {
        this._ensureFilterBarCreated();
        this._filterBar.toggleVisibility();
        this.updateFilterMenuItem();
        this._publishFilterClickedTelemetry();
    }

    /**
     * Shows and focuses the filter bar.
     */
    public activateFilterBar() {
        this._ensureFilterBarCreated();
        this._filterBar.showElement();
        this._filterBar.focus();
        this.updateFilterMenuItem();
    }

    private _ensureFilterBarCreated() {
        if (!this._filterBar) {
            const $filterbar = this._element.find(Constants.testManagementTestFilterBar);
            this._filterBar = <TestResultsFilterBar>BaseControl.createIn(TestResultsFilterBar, $filterbar);
            this._filterBar.bind(this._dataSource);
            this._filterBar.hideElement();
            this.bindEventsHandler();
        }
    }

    private _publishFilterClickedTelemetry() {
        TelemetryService.publishEvents(TelemetryService.featureTestTab_FilterButtonClicked, {
            "Context": this._resultListViewModel.getViewContext(),
            "filterExpanded": this._filterBar.isVisible(),
            "filterActive": this._filterBar.isFilterActive()
        });
    }

    /**
     * Couples the TestResultsFilterBar's filtering actions to the data source.
     */
    public bindEventsHandler() {
        this._filterBar.attachEvent(TestResultsFilterBar.EVENT_FILTER_CHANGED, () => {
            this.updateFilterMenuItem();
        });

        this._filterBar.attachEvent(TestResultsFilterBar.EVENT_FILTER_CLEARED, () => {
            this.updateFilterMenuItem();
        });
    }

    /**
     *  Updates the filter menu item state.
     */
    public updateFilterMenuItem() {
        if (this._filterBar && this._filterMenubar) {
            this._filterMenubar.setFilterActiveState(this._filterBar.isFilterActive());
            this._filterMenubar.setFilterExpandedState(this._filterBar.isVisible());
        }
    }

    private _element: JQuery;
    private _filterBar: TestResultsFilterBar;
    private _resultListViewModel: ResultListViewModel;
    private _dataSource: IFilterDataSource;
    private _filterMenubar: RightToolbar;
    // Singleton instance of FilterBarProvider class
    private static _instance: FilterBarProvider;
}

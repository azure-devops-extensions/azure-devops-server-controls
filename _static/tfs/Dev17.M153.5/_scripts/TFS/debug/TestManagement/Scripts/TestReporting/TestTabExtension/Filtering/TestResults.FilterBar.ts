import * as VSS from "VSS/VSS";
import { Debug } from "VSS/Diag";
import { NamedEventCollection } from "VSS/Events/Handlers";
import { BaseControl, Enhancement } from "VSS/Controls";

import * as TCMConstants from "Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants";

import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { Constants } from "TestManagement/Scripts/TFS.TestManagement.Lite";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";

import { IFilterDataSource, FilterState } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import * as TestResultsFilter_NOREQUIRE from "TestManagement/Scripts/TestReporting/TestTabExtension/Filtering/TestResultsFilter";
import * as FilterValueProvider_NOREQUIRE from "TestManagement/Scripts/TestReporting/TestTabExtension/Filtering/TestResults.FilterValueProviders";

export class TestResultsFilterBar extends BaseControl {

    public static enhancementTypeName: string = "tfs.testResults.filterbar";
    public static coreCssClass: string = "filter-bar";

    public static EVENT_FILTER_CHANGED: string = "filter-changed";
    public static EVENT_FILTER_CLEARED: string = "filter-cleared";

    private _events: NamedEventCollection<TestResultsFilterBar, any>;
    private _isFilterActive: boolean = true;
    private _dataSource: IFilterDataSource;
    private _filterHeight = 0;
    private _clearingFilters: boolean = false;
    protected _filterControl: TestResultsFilter_NOREQUIRE.TestResultsFilter;
    private _initialState: FilterState;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: TestResultsFilterBar.coreCssClass
        }, options));
    }

    /**
     * Called when the filter bar is initialized to bind it to a filter manager and the datasource for the filter.
     * @param dataSource An IFilterDataSource object used by the filters to retrieve field values from the grid.
     */
    public bind(dataSource: IFilterDataSource, initialState?: FilterState) {
        this._dataSource = dataSource;
        this._initialState = initialState;
    }

    /**
     * Shows/hides the filter bar.
     */
    public toggleVisibility() {
        if (this.isVisible()) {
            this.hideElement();
        } else {
            this.showElement();
        }
    }

    public showElement() {
        if (!this.isVisible()) {
            super.showElement();
            this.getElement().closest(Constants.testManagementTestFilterBar).prev(".controls-section").addClass("no-border-bottom");

            this.ensureFilterControlCreated();

            this._onResize();

            this.focus();
        }
    }

    /**
     * Puts focus on the filter bar.
     */
    public focus() {
        if (this._filterControl) {
            this._filterControl.focus();
        }
    }

    public hideElement() {
        if (this.isVisible()) {
            super.hideElement();
            this.getElement().closest(Constants.testManagementTestFilterBar).prev(".controls-section").removeClass("no-border-bottom");

            this._onResize();
        }
    }

    /**
     * Determins if the filter bar is currently visible or not.
     */
    public isVisible(): boolean {
        return this.getElement().is(":visible");
    }

    /**
     * Checks if some filters are applied in the filter bar
     */
    public isFilterActive(): boolean {
        return this._isFilterActive;
    }

    /**
     * Attaches an event handler to the filter bar
     */
    public attachEvent(eventName: string, handler: IEventHandler) {
        if (!this._events) {
            this._events = new NamedEventCollection();
        }

        this._events.subscribe(eventName, <any>handler);
    }

    /**
     * Detaches an event handler from the filter bar
     */
    public detachEvent(eventName: string, handler: IEventHandler) {
        if (this._events) {
            this._events.unsubscribe(eventName, <any>handler);
        }
    }

    /**
     * Get the datasource associated with this filter bar.
     */
    protected getDataSource(): IFilterDataSource {
        return this._dataSource;
    }

    /**
     * Called to initialize the contained react filter bar.
     */
    protected ensureFilterControlCreated() {
        if (this._filterControl === undefined) {
            this._filterControl = null;

            this.createFilterControl();
        }
    }

    /**
     * Called to create the contained react filter bar.
     */
    protected createFilterControl() {
        Debug.assert(this._filterControl === null, "filter control should be null before trying to create it.");

        $(window).resize(() => this._onResize());

        VSS.using(
            ["TestManagement/Scripts/TestReporting/TestTabExtension/Filtering/TestResultsFilter", "TestManagement/Scripts/TestReporting/TestTabExtension/Filtering/TestResults.FilterValueProviders"],
            (TestResultsFilter: typeof TestResultsFilter_NOREQUIRE, FilterValueProviders: typeof FilterValueProvider_NOREQUIRE) => {
                const filterSearchCriteria: TestResultsFilter_NOREQUIRE.ITestResultsFilterField[] = [
                    {
                        displayType: TestResultsFilter.TestResultsFilterFieldType.Text,
                        fieldName: Common.FilterByFields.TestCaseName,
                        placeholder: Resources.FilterByTestName,
                    },
                    {
                        displayType: TestResultsFilter.TestResultsFilterFieldType.CheckboxList,
                        fieldName: Common.FilterByFields.Container,
                        placeholder: Resources.FilterByTestFile,
                        noItemsText: Resources.FilterNoTestFile
                    },
                    {
                        displayType: TestResultsFilter.TestResultsFilterFieldType.CheckboxList,
                        fieldName: Common.FilterByFields.Owner,
                        placeholder: Resources.FilterByOwner,
                        noItemsText: Resources.FilterNoOwner
                    },
                    {
                        displayType: TestResultsFilter.TestResultsFilterFieldType.CheckboxList,
                        fieldName: Common.FilterByFields.Outcome,
                        placeholder: Resources.FilterByOutcome,
                        valueProvider: new FilterValueProviders.OutcomeFilterValueProvider(this._dataSource)
                    }
                ];

                const filterProps: TestResultsFilter_NOREQUIRE.ITestResultsFilterProps = {
                    fields: filterSearchCriteria,
                    initialFilterState: this._dataSource.getInitialFilterState(),
                    filterUpdatedCallback: (filter: FilterState) => this.onFilterUpdated(filter),
                    onRenderComplete: () => this.onFilterRendered(),
                    dataSource: this._dataSource
                };

                this._filterControl = TestResultsFilter.renderFilter(filterProps, this.getElement()[0]);
                this._filterControl.focus();
            });
    }

    /**
     * Handles events from the filter bar and sends them to the filter manager.
     */
    protected onFilterUpdated(updatedFilter: FilterState) {
        this._dataSource.applyFilters(updatedFilter);

        //check if filter is active or not
        if (!$.isEmptyObject(updatedFilter)) {
            this._isFilterActive = true;
        } else {
            this._isFilterActive = false;
        }

        this._onResize();
        this._fireFilterChanged();
    }

    protected onFilterRendered() {
        const filterBarHeight = this.getElement().height();

        // The filter bar wraps its content.  If the size differs from our cached size, resize the window so it will adjust
        // to the new size of the filter bar.
        if (filterBarHeight !== this._filterHeight) {
            this._filterHeight = filterBarHeight;
            this._onResize();
        }
    }

    public clearFilters = () => {
        if (!this._clearingFilters && this._filterControl) {
            this._clearingFilters = true;
            this._filterControl.clearFilters();
            this._clearingFilters = false;
        }
    }

    private _fireFilterChanged() {

        if (this.isFilterActive()) {
            this._fireEvent(TestResultsFilterBar.EVENT_FILTER_CHANGED);
        } else {
            this._fireEvent(TestResultsFilterBar.EVENT_FILTER_CLEARED);
        }
    }

    private _fireEvent(eventName: string, args?: any): boolean {

        if (this._events) {
            let eventBubbleCancelled: boolean = false;

            this._events.invokeHandlers(eventName, this, args, (result) => {
                if (result === false) {
                    eventBubbleCancelled = true;
                    return true;
                }
            });
            if (eventBubbleCancelled) {
                return false;
            }
        }
    }

    /**
     * Handle resize events.  The filter bar will force a resize if the filter bar height changes.
     * This is done here instead of in the TestResultsGridView because this is loaded/initialized asynchronously
     * and we don't want to load it on resize events.
     */
    private _onResize() {
        // Don't do anything if test tab is not active
        if (this._isTestTabActive()) {
            const grid = this.getElement().closest(Constants.testManagementTestFilterBar).siblings(Selectors.gridView);
            const toolbarHeight = 70; // Default Toolbar height +  Filter Message height

            if (this.isVisible()) {
                const filterBarHeight = this._element.height();
                grid.css("top", filterBarHeight + toolbarHeight);
            } else {
                // Clear the element style to use the default sizing.
                grid.css("top", toolbarHeight);
            }
        }
    }

    private _isTestTabActive(): boolean {
        return this.getElement().closest(Selectors.tabContainer).is(":visible");
    }
}

export class Selectors {
    public static gridView = ".results-section";
    public static tabContainer = ".tab-content-container";
}

Enhancement.registerEnhancement(TestResultsFilterBar, ".filter-bar");

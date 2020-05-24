import { uniqueSort } from "VSS/Utils/Array";
import { equals, localeIgnoreCaseComparer } from "VSS/Utils/String";
import { BaseControl } from "VSS/Controls";
import { Constants } from "TestManagement/Scripts/TFS.TestManagement.Lite";
import { FilterManager, IFilterDataSource } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { TagUtils } from "WorkItemTracking/Scripts/Utils/TagUtils";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { MenuBar } from "VSS/Controls/Menus";
import { TestPointsGrid } from "TestManagement/Scripts/TFS.TestManagement.TestPointsGrid";
import { TestPointToolbarItemIds } from "TestManagement/Scripts/TFS.TestManagement.MenuItem";
import { TestViewFilterBar } from "TestManagement/Scripts/TFS.TestManagement.TestViewFilterBar";

class TCMFilterManager extends FilterManager {

    private _testPointGrid: TestPointsGrid;

    constructor(dataSource: IFilterDataSource, testPointsGrid: TestPointsGrid) {
        super(dataSource);
        this._testPointGrid = testPointsGrid;
    }

    public filter(): number[] {
        // Filtering in TCM is done by index into the testpoints, not by work item id or test point id for performance reasons.
        // Specifically, there is no map between the test point ids and the data so lookups by testpoint id would be O(n), so search would be n-squared.

        // Translate the filtered indexes back to test point ids so the filter logic in the grid functions properly.
        const indexes = super.filter();
        const sourceData: any[] = this._testPointGrid.cachedTestPoints;

        indexes.forEach((rowIndex: number, itemIndex: number) => {
            indexes[itemIndex] = +sourceData[rowIndex]["testPointId"];
        });

        return indexes;
    }
}

class FilterBarDataSource implements IFilterDataSource {
    private _testPointsGrid: TestPointsGrid;

    constructor(testPointsGrid: TestPointsGrid) {
        this._testPointsGrid = testPointsGrid;
    }

    /**
     * Retrieve the name of the datasource, used in Telemetry.
     */
    public getDataSourceName(): string {
        return "TestPlans";
    }

    /**
     * Retrieve the total number of items, including items that are not yet paged.
     */
    public getItemCount(): number {
        return this._testPointsGrid.totalTestPoints;
    }

    /**
     * Retreives the ids for the rows of data.
     * Row ids for TCM are just indexes into the array, not work item ids or test points,
     * they are translated back to test point ids in the override of the filter manager.
     */
    public getIds(): number[] {
        const sourceData = this._testPointsGrid.cachedTestPoints;

        return sourceData.map((_, index) => index);
    }

    /**
     * Retrieves data for a single item with the given field name from the data provider
     */
    public getValue(id: number, fieldName: string): any {
        const sourceRow = this._testPointsGrid.cachedTestPoints[id];
        const updatedWorkItemData = this._testPointsGrid.getUpdatedWorkItemData(sourceRow.testCaseId);

        if (updatedWorkItemData && updatedWorkItemData[fieldName] !== undefined) {
            return updatedWorkItemData[fieldName];
        }

        return sourceRow[fieldName];
    }

    public getUniqueValues(fieldName: string): string[] | IPromise<string[]> {
        const values = this._testPointsGrid.cachedTestPoints.map(testPoint => testPoint[fieldName]);

        if (equals(fieldName, CoreFieldRefNames.Tags)) {
            // We need to expand and dedupe tags
            const tagFieldValues: IDictionaryStringTo<boolean> = {};

            for (const fieldValue of values) {
                const tags = TagUtils.splitAndTrimTags(fieldValue);
                for (const tag of tags) {
                    tagFieldValues[tag] = true;
                }
            }
            return uniqueSort(Object.keys(tagFieldValues), localeIgnoreCaseComparer);
        }

        return uniqueSort(values.filter(x => !!x), localeIgnoreCaseComparer);
    }

    public getVisibleColumns() {
        const visibleColumns = this._testPointsGrid._options.columns;
        return visibleColumns.map(c => c.index);
    }
}

export class FilterBarProvider {
    public constructor(element: any, testPointGrid: TestPointsGrid, pointsToolbar: MenuBar, projectName: string) {
        if (!FilterBarProvider._instance) {
            this._element = element;
            this._testPointGrid = testPointGrid;
            this._pointsToolbar = pointsToolbar;
            this._projectName = projectName;
            this._dataSource = new FilterBarDataSource(this._testPointGrid);

            this._filterManager = new TCMFilterManager(this._dataSource, this._testPointGrid);

            this._testPointGrid.setFilterBarInitialized();

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
     * Retrieves an instance of the filter manager
     */
    public getFilterManager(): FilterManager {
        return this._filterManager;
    }

    /**
     * Toggles the filter bar.
     */
    public toggleFilterBar() {
        this._ensureFilterBar();
        this._filterBar.toggle();
        this.updateFilterMenuItem();
    }

    /**
     * Shows and focuses the filter bar.
     */
    public activateFilterBar() {
        this._ensureFilterBar();
        this._filterBar.showElement();
        this._filterBar.focus();
        this.updateFilterMenuItem();
    }

    /**
     * Clears the filter bar.
     */
    public clearAndHideFilterBar() {
        this._testPointGrid.cleanUpFilterState();
        this.getFilterManager().clearFilters();

        if (this._filterBar) {
            this._filterBar.hideElement();
        }

        this.updateFilterMenuItem();
    }

    public dataUpdated() {
        // Refresh the filter manager
        this._filterManager.dataUpdated();
    }

    private _ensureFilterBar() {
        if (!this._filterBar) {
            const $filterbar = this._element.find(Constants.testManagementTestFilterBar);
            this._filterBar = <TestViewFilterBar>BaseControl.createIn(TestViewFilterBar, $filterbar);
            this._filterBar.bind(this._projectName, this._filterManager, this._dataSource);
            this._filterBar.hideElement();

            this.bindFilterManager();
        }
    }

    /**
     * Couples the filterManager's filtering actions to this grid.
     */
    public bindFilterManager() {
        this._filterManager.attachEvent(FilterManager.EVENT_FILTER_CHANGED, () => {
            this._testPointGrid.filterWorkItems(this._filterManager.filter());
            this.updateFilterMenuItem();
        });

        this._filterManager.attachEvent(FilterManager.EVENT_FILTER_CLEARED, () => {
            this._testPointGrid.restoreUnfilteredState();
            this.updateFilterMenuItem();
        });

        // Attach to the filter activate event
        this._filterManager.attachEvent(FilterManager.EVENT_FILTER_ACTIVATED, () => {
            this._testPointGrid.onFilterActivated();
        });

        this._filterManager.attachEvent(FilterManager.EVENT_FILTER_DEACTIVATED, () => {
            this._testPointGrid.onFilterDeactivated();
        });
    }

    /**
     * Updates the filter menu item state.
     */
    public updateFilterMenuItem() {
        this._pointsToolbar.updateCommandStates([
            {
                id: TestPointToolbarItemIds.toggleFilter,
                toggled: this._filterManager && this._filterManager.isActive(),
                disabled: false
            }
        ]);

        let menuItem = this._element.find(".toggle-filter-bar");
        if (this._filterManager && menuItem) {
            menuItem.attr("aria-expanded", this._filterManager.isActive());
        }
    }

    private _element: any;
    private _filterBar: TestViewFilterBar;
    private _filterManager: FilterManager;
    private _projectName: string;
    private _dataSource: IFilterDataSource;
    private _testPointGrid: TestPointsGrid;
    private _pointsToolbar: MenuBar;
    // Singleton instance of TestSuitesTree class
    private static _instance: FilterBarProvider;
}
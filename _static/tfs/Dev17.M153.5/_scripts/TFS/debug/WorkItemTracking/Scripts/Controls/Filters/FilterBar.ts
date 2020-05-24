import * as VSS from "VSS/VSS";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { BaseControl, Enhancement } from "VSS/Controls";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { Debug } from "VSS/Diag";
import { FieldFilterProvider } from "WorkItemTracking/Scripts/Filtering/FieldFilterProvider";
import { FilterManager, IFilterDataSource, FilterState } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { TagsFilterProvider } from "WorkItemTracking/Scripts/Filtering/TagsFilterProvider";
import { TextFilterProvider } from "WorkItemTracking/Scripts/Filtering/TextFilterProvider";
import { AssignedToFilterProvider } from "WorkItemTracking/Scripts/Filtering/AssignedToFilterProvider";

import * as WorkItemFilter_NOREQUIRE from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import * as FilterValueProviders_NOREQUIRE from "WorkItemTracking/Scripts/Controls/Filters/FilterValueProviders";

/**
 * JQuery based class for initializing, hosting and interacting with the React based filter control.
 */
export class FilterBar extends BaseControl {

    public static enhancementTypeName: string = "tfs.wit.filterbar";
    public static coreCssClass: string = "filter-bar";

    private _filterManager: FilterManager;
    private _projectName: string;
    private _dataSource: IFilterDataSource;
    private _filterHeight = 0;
    private _clearingFilters: boolean = false;
    protected _filterControl: WorkItemFilter_NOREQUIRE.WorkItemFilter;
    private _initialState: FilterState;

    constructor(options?: any) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: FilterBar.coreCssClass
        }, options));
    }

    /**
     * Called when the filter bar is initialized to bind it to a filter manager and the datasource for the filter.
     * @param projectName Name of the current team project.  Used for state/bug rendering
     * @param filterManager Filter manager to bind to.  Activates/Deactivates/updates filters on the manager
     * @param dataSource An IFilterDataSource object used by the filters to retrieve field values from the grid.
     */
    public bind(projectName: string, filterManager: FilterManager, dataSource: IFilterDataSource, initialState?: FilterState) {
        this._projectName = projectName;
        this._filterManager = filterManager;
        this._dataSource = dataSource;
        this._initialState = initialState;
    }

    /**
     * Called when the filter bar is no longer needed, detaches from any events it has registered.
     */
    public unbind() {
        if (this._filterControl) {
            this._filterManager.detachEvent(FilterManager.EVENT_DATA_UPDATED, this.handleDataChanged);
            this._filterManager.detachEvent(FilterManager.EVENT_FILTER_CLEARED, this.handleFilterCleared);
        }
    }

    /**
     * Shows/hides the filter bar.
     */
    public toggle() {
        if (this.isVisible()) {
            this.hideElement();
        } else {
            this.showElement();
        }
    }

    /**
     * Shows the filter bar if it is hidden and activates the filter manager.
     */
    public showElement() {
        if (!this.isVisible()) {
            super.showElement();
            this.getElement().siblings(".work-item-list").addClass("with-filter-bar");

            // hides the bottom border of the toolbar above it (if any).
            this.getElement().prev(".toolbar").addClass("no-border-bottom");

            this.ensureFilterControl();

            // Trigger resize so the UI updates and the filterbar/grid is repositioned.
            $(window).resize();

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

    /**
     * Hides the filter bar if it is currently visible and deactivates the filter manager.
     */
    public hideElement() {
        if (this.isVisible()) {
            super.hideElement();
            this.getElement().siblings(".work-item-list").removeClass("with-filter-bar");

            // shows the bottom border of the toolbar above it (if any).
            this.getElement().prev(".toolbar").removeClass("no-border-bottom");

            // Trigger resize so the UI updates and the filterbar/grid is repositioned.
            $(window).resize();
        }
    }

    /**
     * Determins if the filter bar is currently visible or not.
     */
    public isVisible(): boolean {
        return this.getElement().is(":visible");
    }

    /**
     * Retrieves the filter manager associated with this filter bar.
     */
    public getFilterManager(): FilterManager {
        return this._filterManager;
    }

    /**
     * Get the project name associated with this filter bar.
     */
    protected getProjectName(): string {
        return this._projectName;
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
    protected ensureFilterControl() {
        if (this._filterControl === undefined) {
            this._filterControl = null;

            this._filterManager.attachEvent(FilterManager.EVENT_DATA_UPDATED, this.handleDataChanged);
            this._filterManager.attachEvent(FilterManager.EVENT_FILTER_CLEARED, this.handleFilterCleared);

            this.createFilterControl();
        }
    }

    /**
     * Called to create the contained react filter bar.  Derived classes may override this to create custom filter bars.
     */
    protected createFilterControl() {
        Debug.assert(this._filterControl === null, "filter control should be null before trying to create it.");

        // Bind the filter manager to the columns
        this._filterManager.clearFilterProviders(); // just to make sure there's nothing already registered...
        this._filterManager.registerFilterProvider(TextFilterProvider.PROVIDER_TYPE, new TextFilterProvider());
        this._filterManager.registerFilterProvider(CoreFieldRefNames.WorkItemType, new FieldFilterProvider(CoreFieldRefNames.WorkItemType));
        this._filterManager.registerFilterProvider(CoreFieldRefNames.State, new FieldFilterProvider(CoreFieldRefNames.State));
        this._filterManager.registerFilterProvider(CoreFieldRefNames.AssignedTo, new AssignedToFilterProvider());
        this._filterManager.registerFilterProvider(CoreFieldRefNames.Tags, new TagsFilterProvider());
        this._filterManager.activate();

        // Asynchronously load the query filter control to avoid loading unnecessary code.
        VSS.requireModules(["WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter", "WorkItemTracking/Scripts/Controls/Filters/FilterValueProviders"])
            .spread((WorkItemFilter: typeof WorkItemFilter_NOREQUIRE, FilterValueProviders: typeof FilterValueProviders_NOREQUIRE) => {
                const filterFields: WorkItemFilter_NOREQUIRE.IWorkItemFilterField[] = [
                    {
                        displayType: WorkItemFilter.WorkItemFilterFieldType.Text,
                        fieldName: "text",
                        placeholder: Resources.FilterByKeyword
                    },
                    {
                        displayType: WorkItemFilter.WorkItemFilterFieldType.CheckboxList,
                        fieldName: CoreFieldRefNames.WorkItemType,
                        placeholder: Resources.FilterByTypes,
                        noItemsText: Resources.FilterNoTypes,
                        valueProvider: new FilterValueProviders.WorkItemTypeFilterValueProvider(this._projectName, this._dataSource)
                    },
                    {
                        displayType: WorkItemFilter.WorkItemFilterFieldType.CheckboxList,
                        fieldName: CoreFieldRefNames.AssignedTo,
                        placeholder: Resources.FilterByAssignedTo,
                        noItemsText: Resources.FilterNoAssignedTo,
                        valueProvider: new FilterValueProviders.AssignedToFilterValueProvider(this._dataSource)
                    },
                    {
                        displayType: WorkItemFilter.WorkItemFilterFieldType.CheckboxList,
                        fieldName: CoreFieldRefNames.State,
                        placeholder: Resources.FilterByStates,
                        noItemsText: Resources.FilterNoStates,
                        valueProvider: new FilterValueProviders.StateFilterValueProvider(this._projectName, this._dataSource)
                    },
                    {
                        displayType: WorkItemFilter.WorkItemFilterFieldType.CheckboxList,
                        fieldName: CoreFieldRefNames.Tags,
                        placeholder: Resources.FilterByTags,
                        noItemsText: Resources.FilterNoTags,
                        showOrAndOperators: true
                    }
                ];

                const filterProps: WorkItemFilter_NOREQUIRE.IWorkItemFilterProps = {
                    fields: filterFields,
                    filterUpdatedCallback: (filter: FilterState) => this.onFilterUpdated(filter),
                    onRenderComplete: () => this.onFilterRendered(),
                    dataSource: this._dataSource,
                    initialFilterState: this._initialState,
                    onDismissClicked: () => this.hideElement()
                };

                this._filterControl = WorkItemFilter.renderFilter(filterProps, this.getElement()[0]);
                this._filterControl.focus();
            });
    }

    /**
     * Handles events from the filter bar and sends them to the filter manager.
     */
    protected onFilterUpdated(updatedFilter: FilterState) {
        Debug.assert(!!this._filterManager, "Filter manager should not be null");
        this._filterManager.setFilters(updatedFilter);
    }

    protected onFilterRendered() {
        const filterBarHeight = this.getElement().height();

        // The filter bar wraps its content.  If the size differs from our cached size, resize the window so it will adjust 
        // to the new size of the filter bar.
        if (filterBarHeight !== this._filterHeight) {
            this._filterHeight = filterBarHeight;
            $(window).resize();
        }
    }

    private handleDataChanged = () => {
        if (this._filterControl) {
            this._filterControl.update();
        }
    };

    private handleFilterCleared = () => {
        if (!this._clearingFilters && this._filterControl) {
            this._clearingFilters = true;
            this._filterControl.clearFilters();
            this._clearingFilters = false;
        }
    };
}

Enhancement.registerEnhancement(FilterBar, ".filter-bar");

import * as VSS from "VSS/VSS";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { Debug } from "VSS/Diag";
import { FilterBar } from "WorkItemTracking/Scripts/Controls/Filters/FilterBar";
import { AssignedToFilterProvider } from "WorkItemTracking/Scripts/Filtering/AssignedToFilterProvider";
import { FieldFilterProvider } from "WorkItemTracking/Scripts/Filtering/FieldFilterProvider";
import { TagsFilterProvider } from "WorkItemTracking/Scripts/Filtering/TagsFilterProvider";
import { TextFilterProvider } from "WorkItemTracking/Scripts/Filtering/TextFilterProvider";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { FilterState } from "WorkItemTracking/Scripts/Filtering/FilterManager";

import * as WorkItemFilter_NOREQUIRE from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import * as FilterValueProviders_NOREQUIRE from "WorkItemTracking/Scripts/Controls/Filters/FilterValueProviders";

export class TestViewFilterBar extends FilterBar {

    public static enhancementTypeName: string = "tfs.testManagement.filterbar";

    public showElement() {
        if (!this.isVisible()) {
            this._element.show();
            this.getElement().closest(".test-view-filter-bar").prev(".toolbar").addClass("no-border-bottom");

            this.ensureFilterControl();

            $(window).resize();

            if (this._filterControl) {
                this._filterControl.focus();
            }
        }
    }

    public hideElement() {
        if (this.isVisible()) {
            this._element.hide();
            this.getElement().closest(".test-view-filter-bar").prev(".toolbar").removeClass("no-border-bottom");

            $(window).resize();
        }
    }

    /**
     * Override.  This creates the embedded filter which is different for Test than it is for WIT
     */
    protected createFilterControl() {
        Debug.assert(this._filterControl === null, "filter control should be null before trying to create it.");

        $(window).resize(() => this.onResize());

        // Bind the filter manager to the columns
        const filterManager = this.getFilterManager();

        filterManager.clearFilterProviders(); // just to make sure there's nothing already registered...
        filterManager.registerFilterProvider(TextFilterProvider.PROVIDER_TYPE, new TextFilterProvider());
        filterManager.registerFilterProvider(CoreFieldRefNames.State, new FieldFilterProvider(CoreFieldRefNames.State));
        filterManager.registerFilterProvider(CoreFieldRefNames.AssignedTo, new AssignedToFilterProvider());
        filterManager.registerFilterProvider(CoreFieldRefNames.Tags, new TagsFilterProvider());
        filterManager.activate();

        const projectName = this.getProjectName();
        const dataSource = this.getDataSource();

        VSS.using(
            ["WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter", "WorkItemTracking/Scripts/Controls/Filters/FilterValueProviders"],
            (WorkItemFilter: typeof WorkItemFilter_NOREQUIRE, FilterValueProviders: typeof FilterValueProviders_NOREQUIRE) => {
                const filterSearchCriteria: WorkItemFilter_NOREQUIRE.IWorkItemFilterField[] = [
                    {
                        displayType: WorkItemFilter.WorkItemFilterFieldType.Text,
                        fieldName: "text",
                        placeholder: WITResources.FilterByKeyword,
                    },
                    {
                        displayType: WorkItemFilter.WorkItemFilterFieldType.CheckboxList,
                        fieldName: CoreFieldRefNames.AssignedTo,
                        placeholder: WITResources.FilterByAssignedTo,
                        noItemsText: WITResources.FilterNoAssignedTo,
                        valueProvider: new FilterValueProviders.AssignedToFilterValueProvider(dataSource)
                    },
                    {
                        displayType: WorkItemFilter.WorkItemFilterFieldType.CheckboxList,
                        fieldName: CoreFieldRefNames.State,
                        placeholder: WITResources.FilterByStates,
                        noItemsText: WITResources.FilterNoStates,
                        valueProvider: new FilterValueProviders.StateFilterValueProvider(projectName, dataSource)
                    },
                    {
                        displayType: WorkItemFilter.WorkItemFilterFieldType.CheckboxList,
                        fieldName: CoreFieldRefNames.Tags,
                        placeholder: WITResources.FilterByTags,
                        noItemsText: WITResources.FilterNoTags,
                        showOrAndOperators: true
                    },
                ];

                const filterProps: WorkItemFilter_NOREQUIRE.IWorkItemFilterProps = {
                    fields: filterSearchCriteria,
                    filterUpdatedCallback: (filter: FilterState) => this.onFilterUpdated(filter),
                    onRenderComplete: () => this.onFilterRendered(),
                    dataSource: dataSource,
                };

                this._filterControl = WorkItemFilter.renderFilter(filterProps, this.getElement()[0]);
                this._filterControl.focus();
            });
    }

    /**
     * Handle resize events.  The filter bar will force a resize if the filter bar height changes.
     * This is done here instead of in the TestLiteView because this is loaded/initialized asynchronously
     * and we don't want to load it on resize events.
     */
    private onResize() {
        const grid = this.getElement().closest(".test-view-filter-bar").siblings(GridAreaSelectors.viewGrid);
        const toolbarHeight = 45;

        if (this.isVisible()) {
            const filterBarHeight = this._element.height();
            grid.css("top", filterBarHeight + toolbarHeight);
        }
        else {
            // Clear the element style to use the default sizing.
            grid.css("top", "");
        }
    }
}

export class GridAreaSelectors {
    public static viewGrid = ".test-view-grid-area";
    public static editGrid = ".test-edit-grid-area";
}

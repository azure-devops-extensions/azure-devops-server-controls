import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { getPageContext } from "VSS/Context";
import { Debug } from "VSS/Diag";
import { IFilter, FILTER_APPLIED_EVENT } from "VSSUI/Utilities/Filter";
import {
    AssignedToFilterValueProvider,
    StateFilterValueProvider,
    WorkItemTypeFilterValueProvider
} from "WorkItemTracking/Scripts/Controls/Filters/FilterValueProviders";
import { IWorkItemFilterField, mapToFilterState, WorkItemFilterFieldType } from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import { AssignedToFilterProvider } from "WorkItemTracking/Scripts/Filtering/AssignedToFilterProvider";
import { FieldFilterProvider } from "WorkItemTracking/Scripts/Filtering/FieldFilterProvider";
import { FilterManager, FilterState, IFilterDataSource, IFilterProvider, isFilterStateEmpty } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { TagsFilterProvider } from "WorkItemTracking/Scripts/Filtering/TagsFilterProvider";
import { TextFilterProvider } from "WorkItemTracking/Scripts/Filtering/TextFilterProvider";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { IterationPathFilterProvider } from "WorkItemTracking/Scripts/Filtering/IterationPathFilterProvider";

export class AgileFilterManager {
    /** The iteration backlog filter data source */
    private _dataSource: IFilterDataSource;
    /** The fields to filter by */
    private _fields: IWorkItemFilterField[];
    /** The iteration backlog filter manager */
    private _filterManager: FilterManager;
    /** The filter object to subscribe to */
    private _filter: IFilter;
    /** Previous filter value */
    private _previousFilterValue: FilterState;

    private _teamId: string;

    constructor(dataSource: IFilterDataSource, filterManager: FilterManager, filter: IFilter, teamId: string) {
        Debug.assertIsNotNull(dataSource, "Filter datasource should not be null");
        Debug.assertIsNotNull(filterManager, "Filter manager should not be null");
        Debug.assertIsNotNull(filter, "Filter should not be null");

        this._dataSource = dataSource;
        this._filterManager = filterManager;
        this._teamId = teamId;

        this._fields = this._constructFilterFields(this._dataSource, getPageContext().webContext.project.name);

        this._registerFilterProviders(this._filterManager);

        this._filter = filter;
        this._previousFilterValue = mapToFilterState(this._filter.getState());
        this._updateFilter();
        this._filter.subscribe(this._updateFilter, FILTER_APPLIED_EVENT); // Only update when the filter value is applied, otherwise it will be executed multiple times whenever Observable notify happen.
    }

    /**
     * The filter data source
     */
    public get dataSource(): IFilterDataSource {
        return this._dataSource;
    }

    /**
     * The filter fields
     */
    public get filterFields(): IWorkItemFilterField[] {
        return this._fields;
    }

    /**
     * The filter object
     */
    public get filter(): IFilter {
        return this._filter;
    }

    public activate(): void {
        this._filterManager.activate();
    }

    /**
     * Dispose of this filter manager
     */
    public dispose(): void {
        if (this._filter) {
            this._filter.unsubscribe(this._updateFilter);
        }
    }

    public attachOnDataUpdated(handler: () => void): void {
        this._filterManager.attachEvent(FilterManager.EVENT_DATA_UPDATED, handler);
    }

    public detachOnDataUpdated(handler: () => void): void {
        this._filterManager.detachEvent(FilterManager.EVENT_DATA_UPDATED, handler);
    }

    /**
     * Register the filter fields and activate the filter manager
     * @param filterManager The filter manager to activate
     */
    private _registerFilterProviders(filterManager: FilterManager): void {
        if (filterManager) {
            this._registerProviderIfNotRegistered(filterManager, TextFilterProvider.PROVIDER_TYPE, new TextFilterProvider());
            this._registerProviderIfNotRegistered(filterManager, CoreFieldRefNames.WorkItemType, new FieldFilterProvider(CoreFieldRefNames.WorkItemType));
            this._registerProviderIfNotRegistered(filterManager, CoreFieldRefNames.State, new FieldFilterProvider(CoreFieldRefNames.State));
            this._registerProviderIfNotRegistered(filterManager, CoreFieldRefNames.AssignedTo, new AssignedToFilterProvider());
            this._registerProviderIfNotRegistered(filterManager, CoreFieldRefNames.Tags, new TagsFilterProvider());
            this._registerProviderIfNotRegistered(filterManager, CoreFieldRefNames.IterationPath, new IterationPathFilterProvider(this._teamId))
        }
    }

    /**
     * From the datasource, construct the filter fields
     * @param dataSource The data source
     * @param projectName The project name
     */
    private _constructFilterFields(dataSource: IFilterDataSource, projectName: string): IWorkItemFilterField[] {
        if (dataSource) {
            return [
                {
                    displayType: WorkItemFilterFieldType.Text,
                    fieldName: TextFilterProvider.PROVIDER_TYPE,
                    placeholder: WITResources.FilterByKeyword
                },
                {
                    displayType: WorkItemFilterFieldType.CheckboxList,
                    fieldName: CoreFieldRefNames.WorkItemType,
                    placeholder: WITResources.FilterByTypes,
                    noItemsText: WITResources.FilterNoTypes,
                    valueProvider: new WorkItemTypeFilterValueProvider(projectName, dataSource)
                },
                {
                    displayType: WorkItemFilterFieldType.CheckboxList,
                    fieldName: CoreFieldRefNames.AssignedTo,
                    placeholder: WITResources.FilterByAssignedTo,
                    valueProvider: new AssignedToFilterValueProvider(dataSource)
                },
                {
                    displayType: WorkItemFilterFieldType.CheckboxList,
                    fieldName: CoreFieldRefNames.State,
                    placeholder: WITResources.FilterByStates,
                    noItemsText: WITResources.FilterNoStates,
                    valueProvider: new StateFilterValueProvider(projectName, dataSource)
                },
                {
                    displayType: WorkItemFilterFieldType.CheckboxList,
                    fieldName: CoreFieldRefNames.Tags,
                    placeholder: WITResources.FilterByTags,
                    noItemsText: WITResources.FilterNoTags,
                    showOrAndOperators: true
                },
                {
                    displayType: WorkItemFilterFieldType.CheckboxList,
                    fieldName: CoreFieldRefNames.IterationPath,
                    placeholder: AgileControlsResources.Filtering_Iteration_DisplayName
                }
            ];
        }

        return [];
    }

    /**
     * Update the filter.
     * Updates the filter fields in the iteration backlog filter manager
     * @param filterState The filter state
     */
    private _updateFilter = (): void => {
        if (this._filterManager) {
            const currentState: FilterState = mapToFilterState(this._filter.getState());
            if (!isFilterStateEmpty(this._previousFilterValue) || !isFilterStateEmpty(currentState)) {
                this._previousFilterValue = currentState;
                this._filterManager.setFilters(currentState);
            }
        }
    }

    private _registerProviderIfNotRegistered(filterManager: FilterManager, providerName: string, provider: IFilterProvider): void {
        if (!filterManager.getFilterProvider(providerName)) {
            filterManager.registerFilterProvider(providerName, provider);
        }
    }
}
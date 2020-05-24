import * as React from "react";
import { autobind } from "OfficeFabric/Utilities";
import * as VSS from "VSS/VSS";
import * as Context from "VSS/Context";
import * as EventsServices from "VSS/Events/Services";

import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { WorkItemFilter, WorkItemFilterFieldType, IWorkItemFilterField } from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import { FilterState, IFilterDataSource } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { IterationPathFilterValueProvider, AssignedToFilterValueProvider, WorkItemTypeFilterValueProvider, StateFilterValueProvider } from "WorkItemTracking/Scripts/Controls/Filters/FilterValueProviders";
import { TextFilterProvider } from "WorkItemTracking/Scripts/Filtering/TextFilterProvider";
import { IFilter } from "VSSUI/Utilities/Filter";

import { ItemStoreEvents } from "ScaledAgile/Scripts/Shared/Stores/ItemStoreInterface";
import { IDeliveryTimeLineActionsCreator } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Actions/DeliveryTimeLineActionsCreator";
import { DeliveryTimeLineStore } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Stores/DeliveryTimeLineStore";

export interface IPlanFilterProps {
    /*
     * The view data source
     */
    dataSource: IFilterDataSource;
    /*
     * The view store
     */
    deliveryTimeLineStore: DeliveryTimeLineStore;
    /*
     * The view action creator
     */
    actionsCreator: IDeliveryTimeLineActionsCreator;

    /*
     * The VSS filter to subscribe to, if any
     */
    filter?: IFilter;
}

export class PlanFilter extends React.Component<IPlanFilterProps> {
    private _filterControlRef: WorkItemFilter;

    public componentWillMount() {
        EventsServices.getService().attachEvent(ItemStoreEvents.ITEM_DATA_SOURCE_CHANGED, this._onDataChanged);
    }

    public componentWillUnmount() {
        EventsServices.getService().detachEvent(ItemStoreEvents.ITEM_DATA_SOURCE_CHANGED, this._onDataChanged);
        this._onDataChanged = null;
    }

    public render(): JSX.Element {
        const { dataSource, filter } = this.props;
        const pageContext = Context.getPageContext();
        const projectName = pageContext.webContext.project.name;

        // set default filter if the filter does not have a current state
        let setDefaultFilter: boolean = true;
        if (filter && !filter.statesAreEqual(filter.getState(), {})) {
            setDefaultFilter = false;
        }

        return (
            <div className="plan-filter-container" style={{ marginLeft: 20 }}>
                <WorkItemFilter
                    ref={this._resolveWorkItemFilter}
                    dataSource={dataSource}
                    fields={[
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
                        }
                    ] as IWorkItemFilterField[]}
                    filterUpdatedCallback={this._onFilterChanged}
                    setDefaultFilter={setDefaultFilter}
                    filter={filter} />
            </div>
        );
    }

    public focusFilterBar(): void {
        if (this._filterControlRef) {
            this._filterControlRef.focus();
        }
    }


    @autobind
    private _onFilterChanged(filter: FilterState) {
        this.props.actionsCreator.updateFilter(filter);
    }

    @autobind
    private _resolveWorkItemFilter(workItemFilter: WorkItemFilter) {
        this._filterControlRef = workItemFilter;
    }

    @autobind
    private _onDataChanged() {
        if (this._filterControlRef) {
            // clear our filter picklist cache and cause a rerender next time the user click on the filter picklist
            this._filterControlRef.update();
        }
    }
}

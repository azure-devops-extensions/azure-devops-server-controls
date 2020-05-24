import * as React from "react";
import { autobind, css } from "OfficeFabric/Utilities";
import * as VSSComponent from "VSS/Flux/Component";
import { IFilter } from "VSSUI/Utilities/Filter";
import { ActionsCreator } from "WorkItemsHub/Scripts/Actions/ActionsCreator";
import { WorkItemsHubStore } from "WorkItemsHub/Scripts/Stores/WorkItemsHubStore";
import { WorkItemFilter } from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import { FilterManager } from "WorkItemTracking/Scripts/Filtering/FilterManager";

export interface IWorkItemsTabFilterProps extends VSSComponent.Props {
    tabId: string;
    store: WorkItemsHubStore;
    actionsCreator: ActionsCreator;
    projectInfo: ContextIdentifier;
    className?: string;
    onDismissClicked?: () => void;
    filter: IFilter;
}

export class WorkItemsTabFilter extends VSSComponent.Component<IWorkItemsTabFilterProps, {}> {
    private _workItemFilter: WorkItemFilter;
    private _filterManager: FilterManager;

    public componentDidMount() {
        super.componentDidMount();
        this._filterManager = this.getFilterManager();
        if (this._filterManager) {
            this._filterManager.attachEvent(FilterManager.EVENT_DATA_UPDATED, this.onFilterContentChanged);
        }
    }

    public componentWillUnmount() {
        super.componentWillUnmount();
        if (this._filterManager) {
            this._filterManager.detachEvent(FilterManager.EVENT_DATA_UPDATED, this.onFilterContentChanged);
        }
    }

    public render(): JSX.Element {
        const store: WorkItemsHubStore = this.getStore();
        const tabId: string = this.props.tabId;

        if (!store.isHubDataInitialized(tabId)) {
            return null;
        }

        return (
            <div className={css("work-items-tab-filter-control", this.props.className)}>
                {this._renderFilterControl()}
            </div>
        );
    }

    /**
     * Focuses on the filter bar.
     */
    public focusFilterBar(): void {
        if (this._workItemFilter) {
            this._workItemFilter.focus();
        }
    }

    private _renderFilterControl(): JSX.Element {
        const { filter, tabId, onDismissClicked } = this.props;

        return <WorkItemFilter
            key={tabId}
            fields={this.props.store.getHubFilterFields(tabId)}
            dataSource={this.props.store.getHubFilterDataSource(tabId)}
            filter={filter}
            setDefaultFilter={false} // The work items hub handles updating the `filter` object, don't let the component do it
            ref={this._resolveWorkItemFilter}
            onDismissClicked={onDismissClicked}
        />;
    }

    @autobind
    private _resolveWorkItemFilter(filter: WorkItemFilter) {
        this._workItemFilter = filter;
    }

    @autobind
    private onFilterContentChanged() {
        if (this._workItemFilter) {
            this._workItemFilter.update();
        }
    }

    protected getState(): {} { return {}; }

    protected getStore(): WorkItemsHubStore {
        return this.props.store;
    }

    private getFilterManager(): FilterManager {
        return this.props.store.getFilterManager(this.props.tabId);
    }
}

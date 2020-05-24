import * as React from "react";

import { HubActionCreator, HubActionHub } from "Build/Scripts/CI/Actions/Hub";
import { IFilterBarItem } from "../Types";
import { AllBuildsActionCreator, getAllBuildsActionCreator } from "Build/Scenarios/CI/AllBuilds/Actions/AllBuildsActionCreator";
import { StatusFilterBarItem, StatusPickListItem } from "Build/Scenarios/CI/AllBuilds/Components/StatusFilterBarItem";
import { DefinitionFilterBarItem } from "Build/Scenarios/CI/AllBuilds/Components/DefinitionFilterBarItem";
import {
    IAllBuildsTabProps,
    IAllBuildsTabState
} from "./Tab.types";
import { BuildsGrid, getBuildKey, IBuildsGridItemType, WellKnownColumnKeys, IBuildsGridRow } from "Build/Scripts/Components/BuildsGrid";
import { GettingStarted } from "Build/Scripts/Components/GettingStarted";
import {
    IFilterData,
    FilterDefaults,
    getBuildQueryOrder,
    getBuildOrder,
    shouldApplyFilter
} from "Build/Scenarios/CI/AllBuilds/Common";
import { AllBuildsEvents } from "Build/Scenarios/CI/AllBuilds/Events/AllBuildsEventManager";
import { AllBuildsStore } from "Build/Scenarios/CI/AllBuilds/Stores/AllBuilds";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { canRetainBuild } from "Build/Scripts/Security";

import { BaseComponent, IBaseProps } from "OfficeFabric/Utilities";

import { Build, BuildQueryOrder, BuildStatus } from "TFS/Build/Contracts";

import { IPickListItem } from "VSSUI/PickList";
import { IFilterState, IFilter, FILTER_CHANGE_EVENT } from "VSSUI/Utilities/Filter";

import { getPageContext } from "VSS/Context";
import { announce } from "VSS/Utils/Accessibility";
import { format } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!Build/Scenarios/Definitions/AllBuilds/AllBuilds";
import { DefinitionPickerStore, DefinitionPickListItem } from "./Stores/Filters/DefinitionPicker";

interface IFilterInformation {
    gridLabel: string;
    sortPivotColumnNames: string[];
}

export namespace filterFields {
    export const definition = "definitionFilter";
    export const status = "statusFilter";
    export const queue = "queueFilter";
}

// Parent component for Definition's All Builds tab
export class AllBuildsTab extends React.Component<IAllBuildsTabProps, IAllBuildsTabState> {
    private _store: AllBuildsStore = null;
    private _actionCreator: AllBuildsActionCreator = null;
    private _hubActionCreator: HubActionCreator = null;
    private _hubFilter: IFilter = null;
    private _definitionPickerStore: DefinitionPickerStore;

    constructor(props: IAllBuildsTabProps) {
        super(props);

        this._definitionPickerStore = new DefinitionPickerStore();
        this._store = props.store || new AllBuildsStore({
            signalRActionCreator: props.signalRActionCreator,
            signalRActionHub: props.signalRActionHub,
            definitionPickerStore: this._definitionPickerStore
        });

        this._hubActionCreator = props.hubActionCreator;
        this._hubFilter = props.filter;
        this._actionCreator = getAllBuildsActionCreator();


        this.state = this._getState();
    }

    public render(): JSX.Element {
        document.title = BuildResources.AllBuildsPageTitle;

        let gettingStartedElement: JSX.Element = null;
        let resultsElement: JSX.Element = null;

        if (!this.state.hasDefinitions || !this.state.agents.exists) {
            gettingStartedElement = <GettingStarted projectName={getPageContext().webContext.project.name} showDefinitionHelper={!this.state.hasDefinitions} showAgentHelper={!this.state.agents.exists} />;
        }

        const filterInformation = this._getInformationBasedOnFilter();

        return <div className="definitions-allbuilds-tab">
            
            <div className="content-container">
                {gettingStartedElement}
                <BuildTableComponent
                    actionCreator={this._actionCreator}
                    builds={this.state.builds}
                    ariaLabelForGrid={filterInformation.gridLabel}
                    appliedFilter={this.state.appliedFilter}
                    sortPivotColumnNames={filterInformation.sortPivotColumnNames}
                />
            </div>
        </div>;
    }

    public componentDidMount() {
        this._hubActionCreator.addFilters(this._getFilters());
        this._store.addChangedListener(this._onStoresUpdated);
        this._store.addListener(AllBuildsEvents.ResultsAvailable, this._announce);
        this._store.fetchData(this.props.refreshDataOnMount);
        this._hubFilter.subscribe(this._onApplyFilter, FILTER_CHANGE_EVENT);
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onStoresUpdated);
        this._store.removeListener(AllBuildsEvents.ResultsAvailable, this._announce);
    }

    private _getState(): IAllBuildsTabState {
        return {
            hasDefinitions: this._store.hasDefinitions(),
            initializing: this._store.isInitializing(),
            agents: this._store.agents(),
            builds: this._store.getBuilds(),
            appliedFilter: this._store.getAppliedFilter()
        };
    }

    private _onStoresUpdated = () => {
        this.setState(this._getState());
    };

    private _announce = () => {
        announce(format(BuildResources.AllBuildsSearchResultsAvailable, this.state.builds.length));
    }

    private _onApplyFilter = (filterState: IFilterState) => {
        const statusValue = this._hubFilter.getFilterItemValue<StatusPickListItem>(filterFields.status);
        const status: BuildStatus = (statusValue && statusValue[0]) ? statusValue[0].status : BuildStatus.All;
        const definitionValue = this._hubFilter.getFilterItemValue<DefinitionPickListItem>(filterFields.definition);
        const definitionId:number = (definitionValue && definitionValue[0]) ? definitionValue[0].id : null;
        const queueValue = this._hubFilter.getFilterItemValue<IPickListItem>(filterFields.queue);
        let queue: string = (queueValue && queueValue[0]) ? queueValue[0].key : null;

        let newFilterToApply: IFilterData = {
            continuationToken: "",
            order: getBuildQueryOrder(status, getBuildOrder(this.state.appliedFilter.order)),
            status: status,
            definitionId: definitionId,
            requestedFor: null,
            queueId: queue,
            repositoryFilter: null,
            tags: null
        } as IFilterData;

        if (shouldApplyFilter(newFilterToApply, this.state.appliedFilter)) {
            this._actionCreator.getBuilds(newFilterToApply);
        }
    }

    private _getInformationBasedOnFilter(): IFilterInformation {
        let data: IFilterInformation = {} as IFilterInformation;
        switch (this.state.appliedFilter.status) {
            case BuildStatus.Completed:
                data.gridLabel = BuildResources.CompletedBuildsGridLabel;
                data.sortPivotColumnNames = [WellKnownColumnKeys.DateCompleted];
                break;
            case BuildStatus.InProgress:
                data.gridLabel = BuildResources.RunningBuildsGridLabel;
                data.sortPivotColumnNames = [WellKnownColumnKeys.DateStarted];
                break;
            case BuildStatus.NotStarted:
                data.gridLabel = BuildResources.QueuedBuildsGridLabel;
                data.sortPivotColumnNames = [WellKnownColumnKeys.DateQueued];
                break;
            default:
                data.gridLabel = BuildResources.AllBuildsGridLabel;
                data.sortPivotColumnNames = [WellKnownColumnKeys.DateQueued];
                break;
        }
        return data;
    }

    private _getFilters(): IFilterBarItem[] {
        let filters: IFilterBarItem[] = [];
        filters.push(this._getStatusFilter());
        filters.push(this._getDefinitionFilter())
        //filters.push(this._getQueueFilter());
        return filters;
    }

    private _getStatusFilter(): IFilterBarItem {
        const statusFilter: IFilterBarItem = {
            fieldName: filterFields.status,
            onRender: () => {return <StatusFilterBarItem key={filterFields.status} filterItemKey={filterFields.status} filter={this._hubFilter}/>}
        }
        return statusFilter;
    }

    private _getDefinitionFilter(): IFilterBarItem {
        const definitionFilter: IFilterBarItem = {
            fieldName: filterFields.definition,
            onRender: () => {return <DefinitionFilterBarItem key={filterFields.definition} filterItemKey={filterFields.definition} filter={this._hubFilter} definitionPickerStore={this._definitionPickerStore}/>}
        }
        return definitionFilter;
    }
    
}

interface IBuildTableProps extends IBaseProps {
    actionCreator: AllBuildsActionCreator;
    builds: Build[];
    ariaLabelForGrid: string;
    appliedFilter: IFilterData;
    sortPivotColumnNames: string[];
}

class BuildTableComponent extends BaseComponent<IBuildTableProps, {}> {
    private _buildsGrid: BuildsGrid;
    private _focusPending: boolean = false;

    constructor(props: IBuildTableProps) {
        super(props);
    }

    public render(): JSX.Element {
        if (this.props.builds.length == 0) {
            return <span className="no-builds-section">{BuildResources.NoBuildsLabel}</span>;
        }

        const filter = this.props.appliedFilter;
        const rows: IBuildsGridRow[] = this.props.builds.map((build) => {
            return {
                itemType: IBuildsGridItemType.Build,
                item: build,
                key: getBuildKey(build),
                canToggleRetained: canRetainBuild(build.definition)
            };
        });

        return <BuildsGrid
            ref={this._resolveRef('_buildsGrid')}
            ariaLabelForGrid={this.props.ariaLabelForGrid}
            rows={rows}
            columnKeysInOrder={this._getColumnKeys()}
            hasMore={!!filter.continuationToken}
            queryOrder={filter.order}
            onMoreBuildsClicked={this._onMoreBuildsClicked}
            onSortTimeClicked={this._onSortTimeClicked}
            sortPivotColumnNames={this.props.sortPivotColumnNames}
            noAutoFocus={true}
        />;
    }

    private _getColumnKeys(): string[] {
        return [
            WellKnownColumnKeys.Retain,
            WellKnownColumnKeys.Reason,
            WellKnownColumnKeys.Status,
            WellKnownColumnKeys.Name,
            WellKnownColumnKeys.DefinitionName,
            WellKnownColumnKeys.QueueName,
            WellKnownColumnKeys.Source,
            WellKnownColumnKeys.SourceVersion,
            WellKnownColumnKeys.DateQueued,
            WellKnownColumnKeys.DateStarted,
            WellKnownColumnKeys.DateCompleted,
            WellKnownColumnKeys.RequestedFor
        ];
    }

    private _onMoreBuildsClicked = () => {
        this.props.actionCreator.getBuilds(this._getFilter());
    }

    private _onSortTimeClicked = (queryOrder: BuildQueryOrder) => {
        let newFilterToApply = this._getFilter();
        newFilterToApply.order = queryOrder;
        newFilterToApply.continuationToken = "";
        this.props.actionCreator.getBuilds(newFilterToApply);
    }

    private _getFilter(): IFilterData {
        return {
            continuationToken: this.props.appliedFilter.continuationToken,
            order: this.props.appliedFilter.order,
            status: this.props.appliedFilter.status,
            definitionId: this.props.appliedFilter.definitionId,
            requestedFor: this.props.appliedFilter.requestedFor,
            queueId: this.props.appliedFilter.queueId,
            repositoryFilter: this.props.appliedFilter.repositoryFilter,
            tags: this.props.appliedFilter.tags
        } as IFilterData;
    }
}
import * as React from "react";

import { AllBuildsActionCreator, getAllBuildsActionCreator } from "Build/Scenarios/Definitions/AllBuilds/Actions/AllBuildsActionCreator";
import { BuildsGrid, getBuildKey, IBuildsGridItemType, WellKnownColumnKeys, IBuildsGridRow } from "Build/Scripts/Components/BuildsGrid";
import * as BuildStatusPicker_Async from "Build/Scripts/Components/BuildStatusPicker";
import * as BuildTagsPicker_Async from "Build/Scripts/Components/BuildTagsPicker";
import * as DefinitionSearchPicker_Async from "Build/Scripts/Components/DefinitionSearchPicker";
import { GettingStarted } from "Build/Scripts/Components/GettingStarted";
import { FilterPanel } from "Build/Scripts/Components/FilterPanel";
import { LoadingComponent } from "Build/Scripts/Components/Loader";
import * as QueuePicker_Async from "Build/Scripts/Components/QueuePicker";
import * as RepositoryPicker_Async from "Build/Scripts/Components/RepositoryPicker";
import {
    IFilterData,
    getCurrentBuildStatus,
    FilterDefaults,
    getBuildQueryOrder,
    getBuildOrder,
    getCurrentDefinitionId,
    shouldApplyFilter,
    IRepositoryFilterData,
    areRepositoryFiltersEqual,
    areTagsEqual
} from "Build/Scenarios/Definitions/AllBuilds/Common";
import { AllBuildsEvents } from "Build/Scenarios/Definitions/AllBuilds/Events/AllBuildsEventManager";
import { getAllBuildsStore, AllBuilds } from "Build/Scenarios/Definitions/AllBuilds/Stores/AllBuilds";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { canRetainBuild } from "Build/Scripts/Security";
import * as AgentExistenceStore_NO_REQUIRE from "Build/Scripts/Stores/AgentExistence";
import { IdentityPickerConstants } from "Build/Scripts/Constants";

import { BuildPermissions } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { BaseComponent, IBaseProps } from "OfficeFabric/Utilities";

import * as IdentityPickerComponent_Async from "Presentation/Scripts/TFS/Controls/Filters/Components/IdentityPickerComponent";

import { Build, BuildQueryOrder, BuildStatus } from "TFS/Build/Contracts";

import { getPageContext } from "VSS/Context";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { IEntity } from "VSS/Identities/Picker/RestClient";
import { announce } from "VSS/Utils/Accessibility";
import { format } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!Build/Scenarios/Definitions/AllBuilds/AllBuilds";

interface IFilterInformation {
    gridLabel: string;
    sortPivotColumnNames: string[];
}

export interface IControllerViewState {
    hasDefinitions: boolean;
    initializing: boolean;
    agents: AgentExistenceStore_NO_REQUIRE.IAgents;
    builds: Build[];
    appliedFilter: IFilterData;
}

export interface IControllerViewProps {
    store?: AllBuilds;
    actionCreator?: AllBuildsActionCreator;
}

// Parent component for Definition's All Builds tab
export class ControllerView extends React.Component<IControllerViewProps, IControllerViewState> {
    private _store: AllBuilds = null;
    private _actionCreator: AllBuildsActionCreator = null;

    constructor(props: IControllerViewProps) {
        super(props);

        this._store = props.store ? props.store : getAllBuildsStore();
        this._actionCreator = props.actionCreator ? props.actionCreator : getAllBuildsActionCreator();

        this.state = this._getState();
    }

    public render(): JSX.Element {
        document.title = BuildResources.AllBuildsPageTitle;

        let gettingStartedElement: JSX.Element = null;
        let resultsElement: JSX.Element = null;

        if (!this.state.agents.initialized || this.state.initializing) {
            return <LoadingComponent />;
        }

        if (!this.state.hasDefinitions || !this.state.agents.exists) {
            gettingStartedElement = <GettingStarted projectName={getPageContext().webContext.project.name} showDefinitionHelper={!this.state.hasDefinitions} showAgentHelper={!this.state.agents.exists} />;
        }

        const filterInformation = this._getInformationBasedOnFilter();

        return <div className="definitions-allbuilds-tab">
            <FilterArea
                onApplyFilter={this._onApplyFilter}
                initialSelectedStatusOption={getCurrentBuildStatus()}
                initialSelectedDefinitionId={getCurrentDefinitionId()}
            />
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
        this._store.addChangedListener(this._onStoresUpdated);
        this._store.addListener(AllBuildsEvents.ResultsAvailable, this._announce);
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onStoresUpdated);
        this._store.removeListener(AllBuildsEvents.ResultsAvailable, this._announce);
    }

    private _getState(): IControllerViewState {
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

    private _onApplyFilter = (state: IFilterState) => {
        let newFilterToApply: IFilterData = {
            continuationToken: "",
            order: getBuildQueryOrder(state.selectedStatusOption, getBuildOrder(this.state.appliedFilter.order)),
            status: state.selectedStatusOption,
            definitionId: state.selectedDefinitionId,
            requestedFor: state.selectedReqestedFor,
            queueId: state.selectedQueueId,
            repositoryFilter: state.selectedRepo,
            tags: state.selectedTags
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

const AsyncBuildStatusPicker = getAsyncLoadedComponent(
    ["Build/Scripts/Components/BuildStatusPicker"],
    (m: typeof BuildStatusPicker_Async) => m.BuildStatusPicker,
    () => <Spinner size={SpinnerSize.small} />);

const AsyncBuildTagsPicker = getAsyncLoadedComponent(
    ["Build/Scripts/Components/BuildTagsPicker"],
    (m: typeof BuildTagsPicker_Async) => m.BuildTagsPicker,
    () => <Spinner size={SpinnerSize.small} />);

const AsyncDefinitionSearchPicker = getAsyncLoadedComponent(
    ["Build/Scripts/Components/DefinitionSearchPicker"],
    (m: typeof DefinitionSearchPicker_Async) => m.DefinitionSearchPicker,
    () => <Spinner size={SpinnerSize.small} />);

const AsyncIdentityPickerComponent = getAsyncLoadedComponent(
    ["Presentation/Scripts/TFS/Controls/Filters/Components/IdentityPickerComponent"],
    (m: typeof IdentityPickerComponent_Async) => m.IdentityPickerComponent,
    () => <Spinner size={SpinnerSize.small} />);

const AsyncQueuePicker = getAsyncLoadedComponent(
    ["Build/Scripts/Components/QueuePicker"],
    (m: typeof QueuePicker_Async) => m.QueuePicker,
    () => <Spinner size={SpinnerSize.small} />);

const AsyncRepositoryPicker = getAsyncLoadedComponent(
    ["Build/Scripts/Components/RepositoryPicker"],
    (m: typeof RepositoryPicker_Async) => m.RepositoryPicker,
    () => <Spinner size={SpinnerSize.small} />);

interface IFilterAreaProps {
    onApplyFilter: (state: IFilterState) => void;
    initialSelectedStatusOption: BuildStatus;
    initialSelectedDefinitionId: number;
}

interface IFilterState {
    selectedStatusOption: BuildStatus;
    selectedDefinitionId: number;
    selectedReqestedFor: string;
    selectedQueueId: string;
    selectedRepo: IRepositoryFilterData;
    selectedTags: string[];
}

interface IFilterAreaState extends IFilterState {
    isActive: boolean;
}

class FilterArea extends React.Component<IFilterAreaProps, IFilterAreaState> {
    // status filter
    private _selectedStatusOption: BuildStatus = null;
    private _selectedDefinitionId = FilterDefaults.DefaultId;
    private _selectedRequestedFor = null;
    private _selectedQueueId = null;
    private _selectedRepo: IRepositoryFilterData = null;
    private _selectedTags: string[] = [];

    constructor(props: IFilterAreaProps) {
        super(props);

        this.state = this._getState();
    }

    public render(): JSX.Element {
        return <FilterPanel
            ariaLabel={BuildResources.AllBuildsFilterSearchAreaLabel}
            isFilterActive={this.state.isActive}
            onClear={this._onClear}>
            <AsyncBuildStatusPicker
                selectionOption={this.state.selectedStatusOption}
                onChanged={this._onStatusChanged}
            />
            <AsyncDefinitionSearchPicker
                selectedDefinitionId={this.state.selectedDefinitionId}
                definitionPickerOptionChanged={this._onDefinitionChanged}
                onClear={this._onDefinitionSelectionCleared}
            />
            <AsyncIdentityPickerComponent
                onUserInput={null}  //This isn't actually required, but the component depends on filter concept and thinks this is required...
                consumerId={IdentityPickerConstants.ConsumerId}
                placeholderText={BuildResources.RequestedForPlaceholderText}
                identityPickerSearchControlClass={"build-allbuilds-requestedfor-picker"}
                identityPickerSearchControlId={"build-allbuilds-requestedfor-picker"}
                filterKey={"user"} //This isn't actually required, but the component depends on filter concept and thinks this is required...
                filterValue={this.state.selectedReqestedFor}
                onChange={this._onRequestedForChanged}
            />
            <AsyncQueuePicker
                selectedQueueId={this.state.selectedQueueId}
                onQueueChanged={this._onQueueChanged}
                className={"build-allbuilds-queue-picker"}
            />
            <AsyncRepositoryPicker
                showPlaceholderInitially={true}
                onRepositorySelected={this._onRepositoryChanged}
                className={"build-allbuilds-repo-picker"}
                showPlaceholder={!this.state.selectedRepo}
            />
            <AsyncBuildTagsPicker
                onTagsChanged={this._onTagsChanged}
                clearTags={this._selectedTags.length == 0}
                className={"build-allbuilds-tags-picker"}
            />
        </FilterPanel>;
    }

    public componentDidMount() {
        this._selectedStatusOption = this.props.initialSelectedStatusOption;
        this._selectedDefinitionId = this.props.initialSelectedDefinitionId;
        this.setState(this._getState());
    }

    public componentDidUpdate(prevProps: IFilterAreaProps, prevState: IFilterAreaState) {
        // react to possible state changes
        let shouldApplyFilter = false;
        if (prevState.selectedStatusOption !== this.state.selectedStatusOption) {
            shouldApplyFilter = true;
        }

        if (prevState.selectedDefinitionId !== this.state.selectedDefinitionId) {
            shouldApplyFilter = true;
        }

        if (prevState.selectedReqestedFor !== this.state.selectedReqestedFor) {
            shouldApplyFilter = true;
        }

        if (prevState.selectedQueueId !== this.state.selectedQueueId) {
            shouldApplyFilter = true;
        }

        if (!areRepositoryFiltersEqual(prevState.selectedRepo, this.state.selectedRepo)) {
            shouldApplyFilter = true;
        }

        if (!areTagsEqual(prevState.selectedTags, this.state.selectedTags)) {
            shouldApplyFilter = true;
        }

        if (shouldApplyFilter) {
            this._appyFilter();
        }
    }

    public componentWillReceiveProps(nextProps: IFilterAreaProps) {
        // update state based on new props
        let shouldUpdateState: boolean = false;
        if (this.props.initialSelectedStatusOption != nextProps.initialSelectedStatusOption) {
            this._selectedStatusOption = nextProps.initialSelectedStatusOption;
            shouldUpdateState = true;
        }

        if (this.props.initialSelectedDefinitionId != nextProps.initialSelectedDefinitionId) {
            this._selectedDefinitionId = nextProps.initialSelectedDefinitionId;
            shouldUpdateState = true;
        }

        if (shouldUpdateState) {
            this.setState(this._getState());
        }
    }

    private _getState(): IFilterAreaState {
        return {
            isActive: this._isFilterActive(),
            selectedStatusOption: this._selectedStatusOption,
            selectedDefinitionId: this._selectedDefinitionId,
            selectedReqestedFor: this._selectedRequestedFor,
            selectedQueueId: this._selectedQueueId,
            selectedRepo: this._selectedRepo,
            selectedTags: this._selectedTags
        };
    }

    private _onClear = () => {
        this._selectedStatusOption = FilterDefaults.Status;
        this._selectedDefinitionId = FilterDefaults.DefaultId;
        this._selectedQueueId = null;
        this._selectedRequestedFor = null;
        this._selectedRepo = null;
        this._selectedTags = [];

        this.setState(this._getState());
    }

    private _onStatusChanged = (status: BuildStatus) => {
        this._selectedStatusOption = status;
        this.setState(this._getState());
    }

    private _onDefinitionChanged = (option: DefinitionSearchPicker_Async.IDefinitionSearchPickerOption, index: number) => {
        this._selectedDefinitionId = option.data.id;
        this.setState(this._getState());
    }

    private _onRequestedForChanged = (entity: IEntity | null) => {
        this._selectedRequestedFor = entity && entity.displayName;
        this.setState(this._getState());
    }

    private _onTagsChanged = (tags: string[]) => {
        this._selectedTags = tags || [];
        this.setState(this._getState());
    }

    private _onQueueChanged = (id: string) => {
        this._selectedQueueId = id;
        this.setState(this._getState());
    }

    private _onRepositoryChanged = (repoOption: RepositoryPicker_Async.RepoOptionType) => {
        if (repoOption) {
            this._selectedRepo = {
                id: repoOption.id,
                type: repoOption.type
            };
        }
        else {
            this._selectedRepo = null;
        }

        this.setState(this._getState());
    }

    private _onDefinitionSelectionCleared = () => {
        this._selectedDefinitionId = FilterDefaults.DefaultId;
        this.setState(this._getState());
    }

    private _appyFilter() {
        this.props.onApplyFilter({
            selectedStatusOption: this._selectedStatusOption,
            selectedDefinitionId: this._selectedDefinitionId,
            selectedReqestedFor: this._selectedRequestedFor,
            selectedQueueId: this._selectedQueueId,
            selectedRepo: this._selectedRepo,
            selectedTags: this._selectedTags
        });
    }

    private _isFilterActive(): boolean {
        return this._selectedStatusOption != FilterDefaults.Status
            || this._selectedDefinitionId != FilterDefaults.DefaultId
            || this._selectedRequestedFor != null
            || this._selectedQueueId != null
            || this._selectedRepo != null
            || this._selectedTags.length > 0;
    }
}
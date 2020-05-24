/// <reference types="jquery" />
/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import * as AgentExistenceStore_NO_REQUIRE from "Build/Scripts/Stores/AgentExistence";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { BuildsGrid, getBuildKey, IBuildsGridItemType, WellKnownColumnKeys, IBuildsGridRow } from "Build/Scripts/Components/BuildsGrid";
import * as Constants from "Build/Scripts/Constants";
import * as ComboControlComponent_NO_REQUIRE from "Build/Scripts/Components/ComboControl";
import * as IdentityControlComponent_NO_REQUIRE from "Build/Scripts/Components/IdentityControl";
import * as RepositoryPickerComponent_NOREQUIRE from "Build/Scripts/Components/RepositoryPicker";
import { canRetainBuild } from "Build/Scripts/Security";
import * as Telemetry from "Build/Scripts/Telemetry";
import { TaskAgentQueue } from "TFS/DistributedTask/Contracts";

import * as Controls_NO_REQUIRE from "VSS/Controls";
import * as ComboControls_NO_REQUIRE from "VSS/Controls/Combos";
import * as IdentityPicker_NO_REQUIRE from "VSS/Identities/Picker/Controls";

import * as Utils_String from "VSS/Utils/String";
import { delay, DelayedFunction } from "VSS/Utils/Core";

import { Store as QueuedDefinitionsStore, getStore as getQueuedDefinitionsStore } from "Build/Scenarios/Definitions/Queued/Stores/QueuedDefinitions";
import { GettingStarted } from "Build/Scripts/Components/GettingStarted";
import { IconButton } from "Build/Scripts/Components/IconButton";
import { ComboControlLoadingComponent, LoadingComponent, RepositoryPickerLoadingComponent } from "Build/Scripts/Components/Loader";
import { SourceBranchLink } from "Build/Scripts/Components/SourceBranchLink";
import { SourceVersionLink } from "Build/Scripts/Components/SourceVersionLink";
import { QueuedDefinitionsActionCreator } from "Build/Scenarios/Definitions/Queued/Actions/QueuedDefinitionsActionCreator";
import { queuedDefinitionBuildsUpdated, QueuedDefinitionBuildsUpdatedPayload, filterApplied } from "Build/Scenarios/Definitions/Queued/Actions/QueuedDefinitions";

import { IBuildFilter } from "Build.Common/Scripts/ClientContracts";
import { BuildPermissions } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { DefaultButton } from "OfficeFabric/components/Button/DefaultButton/DefaultButton";
import { BaseComponent, css, IBaseProps } from "OfficeFabric/Utilities";

import { Build, BuildDefinitionReference, BuildQueryOrder, BuildStatus, DefinitionQuality } from "TFS/Build/Contracts";

import { using } from "VSS/VSS";
import { EventService, getService as getEventService } from "VSS/Events/Services";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { getCollectionService } from "VSS/Service";
import { getPageContext } from "VSS/Context";

import "VSS/LoaderPlugins/Css!Build/Scenarios/Definitions/Queued/QueuedDefinitions";

export interface State {
    queuedOrRunningBuilds: Build[];
    completedBuilds: Build[];
    agents: AgentExistenceStore_NO_REQUIRE.IAgents;
    hasDefinitions: boolean;
    initializing: boolean;
    queueSources: TaskAgentQueue[];
    definitionSources: BuildDefinitionReference[];
}

export interface QueueTabProps {
    isMember: boolean;
}

// Parent component for Definition's Queued tab
export class ControllerView extends React.Component<QueueTabProps, State> {
    private _queuedDefinitionsStore: QueuedDefinitionsStore;

    constructor(props: QueueTabProps) {
        super(props);

        this._queuedDefinitionsStore = getQueuedDefinitionsStore();

        this.state = this._getState();

        let telemetryProperties = {};
        Telemetry.publishEvent(Telemetry.Features.QueuedTabLoaded, null, telemetryProperties);
    }

    public render(): JSX.Element {
        document.title = BuildResources.QueuedDefinitionsPageTitle;

        let showTable = this.state.hasDefinitions;
        let gettingStarted: JSX.Element = null;
        let queuedOrRunningElement: JSX.Element = null;
        let completedElement: JSX.Element = null;

        if (!this.state.agents.initialized || this.state.initializing) {
            return <LoadingComponent />;
        }

        // it doesn't matter if we set the same message if this happened to be rendered more than once
        // screen reader will announce only when text is changed
        let screenReaderMessage = Utils_String.format(BuildResources.QueuedBuildsPageScreenReaderMessage, this.state.queuedOrRunningBuilds.length, this.state.completedBuilds.length);

        if (!this.state.hasDefinitions || !this.state.agents.exists) {
            gettingStarted = <GettingStarted projectName={getPageContext().webContext.project.name} showDefinitionHelper={!this.state.hasDefinitions} showAgentHelper={!this.state.agents.exists} />;
        }

        if (showTable) {
            queuedOrRunningElement = <div className="section">
                <span className="section-title">{BuildResources.QueuedOrRunningText}</span>
                <BuildTableComponent builds={this.state.queuedOrRunningBuilds} isCompletedView={false} ariaLabelForGrid={BuildResources.QueuedOrRunningBuildsGridLabel} />
            </div>;

            completedElement = <div className="section">
                <span className="section-title">{BuildResources.RecentlyBuilt}</span>
                <BuildTableComponent builds={this.state.completedBuilds} isCompletedView={true} ariaLabelForGrid={BuildResources.CompletedBuildsGridLabel} />
            </div>;
        }

        return <div className="definitions-queued-tab">
            <FilterComponent queueSources={this.state.queueSources} definitionSources={this.state.definitionSources} isMember={this.props.isMember} />
            <span className="search-results-availabile-hint" aria-relevant="text" aria-live="polite" aria-label={screenReaderMessage}></span>
            <div className="content-container">
                {gettingStarted}
                {completedElement}
                {queuedOrRunningElement}
            </div>
        </div>;
    }

    public componentDidMount() {
        this._queuedDefinitionsStore.addChangedListener(this._onStoresUpdated);
    }

    public componentWillUnmount() {
        this._queuedDefinitionsStore.removeChangedListener(this._onStoresUpdated);
    }

    private _getState(): State {
        return {
            agents: this._queuedDefinitionsStore.agents(),
            hasDefinitions: this._queuedDefinitionsStore.hasDefinitions(),
            completedBuilds: this._queuedDefinitionsStore.getCompletedBuilds(),
            initializing: this._queuedDefinitionsStore.isInitializing(),
            queuedOrRunningBuilds: this._queuedDefinitionsStore.getQueuedOrRunningBuilds(),
            queueSources: this.props.isMember ? this._queuedDefinitionsStore.getQueues() : [],
            definitionSources: this._queuedDefinitionsStore.getDefinitions()
        };
    }

    private _onStoresUpdated = () => {
        this.setState(this._getState());
    };
}

interface BuildTableProps extends IBaseProps {
    builds: Build[];
    isCompletedView: boolean;
    ariaLabelForGrid: string;
}

interface BuildTableState {
    selectedBuilds: Build[];
}

class BuildTableComponent extends BaseComponent<BuildTableProps, BuildTableState> {
    private _buildsGrid: BuildsGrid;
    private _focusPending: boolean = false;

    constructor(props: BuildTableProps) {
        super(props);

        this.state = {
            selectedBuilds: []
        };
    }

    public render(): JSX.Element {
        if (this.props.builds.length == 0) {
            return <span>{this.props.isCompletedView ? BuildResources.NoRecentlyCompletedBuildsLabel : BuildResources.NoBuildsQueuedOrRunningLabel}</span>;
        }

        let rows: IBuildsGridRow[] = this.props.builds.map((build) => {
            return {
                itemType: IBuildsGridItemType.Build,
                item: build,
                key: getBuildKey(build),
                canToggleRetained: canRetainBuild(build.definition)
            };
        });

        // TODO (yaananth): Add paging to queued tab and send appropriate hasMore value instead of false
        return <BuildsGrid
            ref={this._resolveRef('_buildsGrid')}
            ariaLabelForGrid={this.props.ariaLabelForGrid}
            rows={rows}
            columnKeysInOrder={this._getColumnKeys()}
            hasMore={false}
            queryOrder={BuildQueryOrder.FinishTimeDescending}
            hideContributedMenuItems={!this.props.isCompletedView}
            noAutoFocus={true}
        />;
    }

    public componentDidMount() {
        queuedDefinitionBuildsUpdated.addListener(this._buildsUpdated);
        filterApplied.addListener(this._filterApplied);
    }

    public componentWillUnmount() {
        queuedDefinitionBuildsUpdated.removeListener(this._buildsUpdated);
        filterApplied.removeListener(this._filterApplied);
    }

    private _buildsUpdated = (payload: QueuedDefinitionBuildsUpdatedPayload) => {
        // make sure we focus only when we have to since this will reset the focus
        if (this._focusPending) {
            this._buildsGrid && this._buildsGrid.focusGrid();
            this._focusPending = false;
        }
    }

    private _filterApplied = () => {
        // time to focus since filter is triggered
        this._focusPending = true;
    }

    private _getColumnKeys(): string[] {
        if (this.props.isCompletedView) {
            return [
                WellKnownColumnKeys.Retain,
                WellKnownColumnKeys.Reason,
                WellKnownColumnKeys.Status,
                WellKnownColumnKeys.Name,
                WellKnownColumnKeys.DefinitionName,
                WellKnownColumnKeys.QueueName,
                WellKnownColumnKeys.Source,
                WellKnownColumnKeys.SourceVersion,
                WellKnownColumnKeys.DateCompleted,
                WellKnownColumnKeys.RequestedFor
            ];
        }
        else {
            return [
                WellKnownColumnKeys.Reason,
                WellKnownColumnKeys.Status,
                WellKnownColumnKeys.Name,
                WellKnownColumnKeys.DefinitionName,
                WellKnownColumnKeys.QueueName,
                WellKnownColumnKeys.Source,
                WellKnownColumnKeys.SourceVersion,
                WellKnownColumnKeys.DateQueued,
                WellKnownColumnKeys.RequestedFor
            ];
        }
    }
}

interface IDefinitionFilterItem {
    id: number;
    text: string;
}

export interface FilterProps {
    queueSources: TaskAgentQueue[];
    definitionSources: BuildDefinitionReference[];
    isMember: boolean;
}

export interface FilterState {
    isFilterApplied: boolean;
}

export class FilterComponent extends React.Component<FilterProps, FilterState> {
    private _repositoryPickerLoading: boolean = true;
    private _isFilterApplied: boolean = false;
    private _queuedDefinitionsActionCreator: QueuedDefinitionsActionCreator;

    private _delayedDefinitionSearchTrigger: DelayedFunction;

    // filter values stored by component, where as sources are obtained from the store
    private _definitionId: number = -1;
    private _queueId: number = -1;
    private _requestedFor: string = "";
    private _repo: RepositoryPickerComponent_NOREQUIRE.IRepoOption = null;

    constructor(props: FilterProps) {
        super(props);

        this.state = this._getState();
        this._queuedDefinitionsActionCreator = getCollectionService(QueuedDefinitionsActionCreator);
    }

    public render(): JSX.Element {
        let repositoryPickerElement: JSX.Element = null;
        let definitionPickerElement: JSX.Element = null;
        let queuePickerElement: JSX.Element = null;
        let identityPickerElement: JSX.Element = null;
        let definitionComboClass = "definition-combo-container " + (this._definitionId > 0 ? "active" : "muted");
        let identityPickerClass = "definition-combo-container last-filter " + (!!this._requestedFor ? "active" : "muted");
        let queueComboClass = "definition-combo-container " + (this._queueId > 0 ? "active" : "muted");
        let repositoryPickerClass = "repository-picker " + (!!this._repo ? "active" : "muted");

        let filterClearElement: JSX.Element = <IconButton
            className={css("bowtie-icon filter-icon button", {
                "bowtie-clear-filter": this.state.isFilterApplied,
                "bowtie-search-filter disabled": !this.state.isFilterApplied
            })}
            label={this.state.isFilterApplied ? BuildResources.ClearFiltersText : BuildResources.NoFilterAppliedText}
            onClick={this._clearFilter}
            disabled={!this.state.isFilterApplied}
            aria-disabled={!this.state.isFilterApplied}>
        </IconButton>;

        repositoryPickerElement = this.props.isMember && <AsyncRepositoryPickerControlComponent className={repositoryPickerClass} showPlaceholderInitially={true} onRepositorySelected={
            (repo) => {
                let prev = this._repo;
                if (repo) {
                    this._repo = repo;
                    if (!prev) {
                        // This is not muted any more, trigger render so that styles of the control gets updated
                        this.setState(this._getState());
                    }
                }
                else {
                    // placeholder
                    this._repo = null;
                    if (prev) {
                        // This is not active any more, trigger render so that styles of the control gets updated
                        this.setState(this._getState());
                    }
                }
            }
        } />;

        let definitionComboOptions: ComboControlComponent_NO_REQUIRE.IComboOptions = {
            id: "definition_filter_combo",
            enabled: true,
            enableFilter: true,
            autoComplete: true,
            label: BuildResources.QueuedFilterDefinitionPlaceHolder,
            placeholderText: BuildResources.QueuedFilterDefinitionPlaceHolder,
            change: (combo: ComboControls_NO_REQUIRE.Combo) => {
                let value = (combo.getText() || "").trim();
                let index = combo.getSelectedIndex();
                // we are using data source from combo instead of this.props.definitionSources since, combo's data source always represents the list of items we
                // as we have filter enabled, list's source could be different that this.props.definitionSources, hence indexes won't match
                // we cannot use text to find the item since definition names are unique per folder and also there could be drafts, making conversion complex
                let listSource = combo.getBehavior().getDataSource();
                let invalidate = false;

                if (value) {
                    if (this._delayedDefinitionSearchTrigger) {
                        this._delayedDefinitionSearchTrigger.cancel();
                    }

                    this._delayedDefinitionSearchTrigger = delay(this, 300, () => {
                        this._queuedDefinitionsActionCreator.searchDefinitions(combo.getText());
                    });

                    if (listSource.getItem(index)) {
                        let item = JSON.parse(listSource.getItem(index)) as IDefinitionFilterItem;
                        // whole text should match before selecting since we match elements with "startsWith" behavior
                        if (Utils_String.equals(value, item.text, true)) {
                            this._definitionId = item.id;
                            this._updateState();
                        }
                        else {
                            invalidate = true;
                        }
                    }
                }
                else {
                    invalidate = true;
                }

                if (invalidate) {
                    this._definitionId = -1;
                    this._updateState();
                }
            },
            source: this.props.definitionSources.map((source) => {
                let draftQualityInfo = "";
                if (source.quality === DefinitionQuality.Draft) {
                    draftQualityInfo = Utils_String.format("|{0}| ", BuildResources.DraftText);
                }

                // you would think you could store an object and handle display seperately, but nope, dropOption's getItemContents always sends string...so JSON to the rescue!
                // since we use startsWith behavior, for a definition with folder, we should append the path to the front, otherwise if user uses same definition name we would also choose the one at root path
                return JSON.stringify({ id: source.id, text: draftQualityInfo + (source.path != "\\" ? Utils_String.format("<{0}> ", source.path) : "") + source.name } as IDefinitionFilterItem);
            }),
            getItemText: (itemJson: string) => {
                let item = JSON.parse(itemJson) as IDefinitionFilterItem;
                return item.text;
            },
            dropOptions: {
                getItemContents: (itemJson: string) => {
                    let item = JSON.parse(itemJson) as IDefinitionFilterItem;
                    return item.text;
                }
            },
            compareInputToItem: (itemJson: string, textInput: string) => {
                let item = JSON.parse(itemJson) as IDefinitionFilterItem;
                // startsWith behavior
                return Utils_String.localeIgnoreCaseComparer(textInput, item.text.substr(0, textInput.length));
            }
        };
        definitionPickerElement = <div className={definitionComboClass}>{<AsyncComboControlComponent containerCssClass="definition-combo-control bowtie" options={definitionComboOptions} />}</div>;

        if (this.props.isMember) {
            const queueComboOptions: ComboControlComponent_NO_REQUIRE.IComboOptions = {
                id: "queue_filter_combo",
                enabled: true,
                label: BuildResources.QueuedFilterQueuePlaceHolder,
                placeholderText: BuildResources.QueuedFilterQueuePlaceHolder,
                change: (combo: ComboControls_NO_REQUIRE.Combo) => {
                    let queue = this.props.queueSources.filter((q) => {
                        return Utils_String.equals(q.name, combo.getText(), true);
                    });

                    let prevId = this._queueId;
                    if (queue && queue[0]) {
                        this._queueId = queue[0].id;
                        if (prevId == -1) {
                            // This is not muted any more, trigger render so that styles of the control gets updated
                            this._updateState();
                        }
                    }
                    else {
                        this._queueId = -1;
                        if (prevId != -1) {
                            // This is not active any more, trigger render so that styles of the control gets updated
                            this._updateState();
                        }
                    }
                },
                source: this.props.queueSources.map((source) => {
                    return source.name;
                })
            };
            queuePickerElement = this.props.isMember && <div className={queueComboClass}><AsyncComboControlComponent containerCssClass="definition-combo-control bowtie" options={queueComboOptions} /></div>;

            const identityPickerOptions: IdentityControlComponent_NO_REQUIRE.IdentitySearchOptions = {
                loadOnCreate: true,
                showMru: true,
                showContactCard: true,
                showMruTriangle: true,
                placeholderText: BuildResources.QueuedFilterRequestedForPlaceHolder,
                callbacks: {
                    onItemSelect: (item) => {
                        let prev = this._requestedFor;
                        this._requestedFor = item.displayName;
                        if (!prev) {
                            // This is not muted any more, trigger render so that styles of the control gets updated
                            this._updateState();
                        }
                    }
                },
                invalidInputCallBack: () => {
                    let prev = this._requestedFor;
                    this._requestedFor = null;
                    if (prev) {
                        // This is not active any more, trigger render so that styles of the control gets updated
                        this._updateState();
                    }
                },
                consumerId: Constants.IdentityPickerConstants.ConsumerId
            };
            identityPickerElement = <div className={identityPickerClass}><AsyncIdentityControlComponent containerCssClass="identity-combo-control bowtie" options={identityPickerOptions} /></div>;
        }

        const isApplyFilterDisabled = !this._canApplyFilter();

        //by repo, by def, by queue, by requested for (identity picker)
        return <div className="filter" role="search" aria-label={BuildResources.QueuedBuildsFilterSearchAreaLabel}>
            {repositoryPickerElement}
            {definitionPickerElement}
            {queuePickerElement}
            {identityPickerElement}
            <div className="queued-filter-buttons bowtie">
                <DefaultButton className="build-bowtie-cta cta" ariaLabel={BuildResources.ApplyFiltersText} disabled={isApplyFilterDisabled} aria-disabled={isApplyFilterDisabled} onClick={this._applyFilter}>{BuildResources.ApplyFiltersText}</DefaultButton>
                {filterClearElement}
            </div>
        </div>;
    }

    public componentDidMount() {
        // trigger search to prepopulate definition combo with some definitions
        this._queuedDefinitionsActionCreator.searchDefinitions("");
    }

    private _getState(): FilterState {
        return {
            isFilterApplied: this._isFilterApplied,
        };
    }

    private _updateState() {
        // clear filter if needed
        if (!this._canApplyFilter() && this.state.isFilterApplied) {
            // if the filter is already applied and now we can't apply any filter, we need to clear, this will also update the state
            this._clearFilter();
        }
        else {
            this.setState(this._getState());
        }
    }

    private _applyFilter = () => {
        this._isFilterApplied = true;

        this.setState(this._getState());

        // populate filter start with null so that we know if any of the filters are applied are not in action creator
        let buildFilter: IBuildFilter = null;
        if (this._queueId > 0) {
            buildFilter = buildFilter || {};
            buildFilter.queues = this._queueId + "";
        }

        if (this._definitionId > 0) {
            buildFilter = buildFilter || {};
            buildFilter.definitions = this._definitionId + "";
        }

        if (this._requestedFor) {
            buildFilter = buildFilter || {};
            buildFilter.requestedFor = this._requestedFor;
        }

        // We should avoid placeholder repo item
        if (this._repo) {
            buildFilter = buildFilter || {};
            buildFilter.repositoryId = this._repo.id;
            buildFilter.repositoryType = this._repo.type;
        }

        this._queuedDefinitionsActionCreator.getBuilds(buildFilter);
    }

    private _clearFilter = () => {
        this._isFilterApplied = false;
        this._repo = null;
        this._queueId = -1;
        this._definitionId = -1;
        this._requestedFor = "";

        //trigger event so that controls can clear themselves
        getEventService().fire(Constants.Events.ClearComboControlInput, this);

        this.setState(this._getState());

        this._queuedDefinitionsActionCreator.getBuilds();
    }

    private _canApplyFilter(): boolean {
        return !!this._repo || this._definitionId > -1 || this._queueId > -1 || !!this._requestedFor;
    }
}

const AsyncComboControlComponent = getAsyncLoadedComponent(
    ["Build/Scripts/Components/ComboControl"],
    (m: typeof ComboControlComponent_NO_REQUIRE) => m.Component,
    () => <ComboControlLoadingComponent />);

const AsyncIdentityControlComponent = getAsyncLoadedComponent(
    ["Build/Scripts/Components/IdentityControl"],
    (m: typeof IdentityControlComponent_NO_REQUIRE) => m.Component,
    () => <ComboControlLoadingComponent />);

const AsyncRepositoryPickerControlComponent = getAsyncLoadedComponent(
    ["Build/Scripts/Components/RepositoryPicker"],
    (m: typeof RepositoryPickerComponent_NOREQUIRE) => m.RepositoryPicker,
    () => <RepositoryPickerLoadingComponent />
);

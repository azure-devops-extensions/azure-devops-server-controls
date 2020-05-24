/// <reference types="jquery" />
/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");

import { DetailsColumn } from "Build/Scenarios/Definitions/Mine/Components/DetailsColumn";
import { IRow, getMyDefinitionsStore, MyDefinitionsStore, IStoreChangedPayload } from "Build/Scenarios/Definitions/Mine/Stores/MyDefinitions";
import { BuildDetailLink } from "Build/Scripts/Components/BuildDetailLink";
import { Component as BuildHistogram, Props as IBuildHistogramProps } from "Build/Scripts/Components/BuildHistogram";
import { BuildStatus } from "Build/Scripts/Components/BuildStatus";
import { DefinitionStatus } from "Build/Scripts/Components/DefinitionStatus";
import { GettingStarted } from "Build/Scripts/Components/GettingStarted";
import { LoadingComponent } from "Build/Scripts/Components/Loader";
import { SourceBranchLink } from "Build/Scripts/Components/SourceBranchLink";
import { SourceVersionLink } from "Build/Scripts/Components/SourceVersionLink";
import { UserActions } from "Build/Scripts/Constants";
import { getDefinitionLink } from "Build/Scripts/Linking";
import { QueryResult } from "Build/Scripts/QueryResult";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import AgentExistenceStore_NO_REQUIRE = require("Build/Scripts/Stores/AgentExistence");
import { getChangesStore, ChangesStore } from "Build/Scripts/Stores/Changes";
import { Features, publishEvent, Properties, Sources } from "Build/Scripts/Telemetry";

import { BuildReason } from "Build.Common/Scripts/BuildReason";
import { BuildLinks } from "Build.Common/Scripts/Linking";

import {
    ConstrainMode,
    DetailsListLayoutMode,
    DetailsList,
    IColumn,
    SelectionMode,
    CheckboxVisibility
} from "OfficeFabric/DetailsList";
import { Selection } from "OfficeFabric/utilities/selection/Selection";

import * as TFS_Resources_Presentation from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

import { Build, BuildDefinitionReference, Change } from "TFS/Build/Contracts";

import { getPageContext } from "VSS/Context";
import { CommonActions, getService as getEventActionService } from "VSS/Events/Action";
import { urlHelper } from "VSS/Locations";
import { first } from "VSS/Utils/Array";
import { format } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!fabric";

import "VSS/LoaderPlugins/Css!Build/Scenarios/Definitions/Mine/MyDefinitions";

namespace GridColumnKeys {
    export const Details = "details";
    export const Status = "status";
    export const TriggeredBy = "triggeredBy";
    export const History = "history";
}

enum BuildRowStatusFocus {
    Definition,
    Build
}

export interface IStores {
    myDefinitionsStore: MyDefinitionsStore;
    changesStore: ChangesStore;
}

export interface IState {
    showMyBuildsSection: boolean;
    showRecentlyBuiltSection: boolean;
    buildRows: IRow[];
    myFavoriteRows: IRow[];
    teamFavoriteRows: IRow[];
    agents: AgentExistenceStore_NO_REQUIRE.IAgents;
    hasDefinitions: boolean;
    hasMoreMyFavorites: boolean;
    hasMoreTeamFavorites: boolean;
    noAutoFocus: boolean;
}

export interface IProps {
    stores?: IStores;
}

// Parent component for Definition's Mine tab
export class ControllerView extends React.Component<IProps, IState> {
    private _myDefinitionsStore: MyDefinitionsStore;
    private _changesStore: ChangesStore;
    private _noAutoFocus: boolean = false;

    constructor(props: IProps) {
        super(props);

        this._myDefinitionsStore = (props.stores && props.stores.myDefinitionsStore) ? props.stores.myDefinitionsStore : getMyDefinitionsStore();
        this._changesStore = (props.stores && props.stores.changesStore) ? props.stores.changesStore : getChangesStore();

        this.state = this._getState();

        let telemetryProperties = {};
        telemetryProperties[Properties.MyFavoritesCount] = this.state.myFavoriteRows.length;
        telemetryProperties[Properties.TeamFavoritesCount] = this.state.teamFavoriteRows.length;
        telemetryProperties[Properties.RequestedByMeCount] = this.state.buildRows.length;
        publishEvent(Features.MineTabLoaded, null, telemetryProperties);
    }

    public render(): JSX.Element {
        document.title = BuildResources.MyDefinitionsPageTitle;

        let showSections = this.state.hasDefinitions;
        let gettingStarted: JSX.Element = null;

        if (!this.state.agents.initialized) {
            return <LoadingComponent />;
        }

        if (!this.state.hasDefinitions || !this.state.agents.exists) {
            gettingStarted = <GettingStarted projectName={getPageContext().webContext.project.name} showDefinitionHelper={!this.state.hasDefinitions} showAgentHelper={!this.state.agents.exists} />;
        }

        if (showSections && this.state.showRecentlyBuiltSection) {
            return <div>
                {gettingStarted}
                <DefinitionGridComponent title={BuildResources.RecentlyBuilt} definitionRows={this.state.buildRows} statusFocus={BuildRowStatusFocus.Build} hideSecondaryHeaders={false} moreBuildsAction={UserActions.GetMoreRecentBuilds} />
            </div>;
        }
        else if (showSections) {
            let grids: IDefinitionGridProps[] = [];

            // my favorites
            if (this.state.myFavoriteRows.length > 0) {
                grids.push({
                    title: TFS_Resources_Presentation.MyFavoritesText,
                    definitionRows: this.state.myFavoriteRows,
                    hasMore: this.state.hasMoreMyFavorites,
                    statusFocus: BuildRowStatusFocus.Definition,
                    moreBuildsAction: UserActions.GetMoreMyFavorites
                });
            }

            // team favorites
            if (this.state.teamFavoriteRows.length > 0) {
                grids.push({
                    title: TFS_Resources_Presentation.TeamFavoritesText,
                    definitionRows: this.state.teamFavoriteRows,
                    hasMore: this.state.hasMoreTeamFavorites,
                    statusFocus: BuildRowStatusFocus.Definition,
                    moreBuildsAction: UserActions.GetMoreTeamFavorites,
                    isTeamFavoriteSection: true
                });
            }

            // requested by me
            if (this.state.showMyBuildsSection) {
                grids.push({
                    title: BuildResources.RequestedByMe,
                    definitionRows: this.state.buildRows,
                    hasMore: false,
                    statusFocus: BuildRowStatusFocus.Build
                });
            }

            grids.forEach((sectionProps: IDefinitionGridProps, index: number) => {
                // focus only on the first grid on load if needed
                if (index == 0 && !this.state.noAutoFocus) {
                    sectionProps.focusOnLoad = true;
                }

                sectionProps.hideSecondaryHeaders = index > 0;
            });

            return <div>
                {gettingStarted}
                {
                    grids.map((gridProps: IDefinitionGridProps, index) => {
                        return <DefinitionGridComponent key={gridProps.title} { ...gridProps } />;
                    })
                }</div>;
        }

        return gettingStarted;
    }

    public componentDidMount() {
        this._myDefinitionsStore.addChangedListener(this._onStoresUpdated);
    }

    public componentWillUnmount() {
        this._myDefinitionsStore.removeChangedListener(this._onStoresUpdated);
    }

    private _getState(): IState {
        let buildRows = this._myDefinitionsStore.getBuildRows();
        let myFavoriteRows = this._myDefinitionsStore.getMyFavoriteDefinitionRows();
        let teamFavoriteRows = this._myDefinitionsStore.getTeamFavoriteDefinitionRows();
        let showMyBuildsSection = this._myDefinitionsStore.hasMyBuilds() && !!first(buildRows, (row: IRow) => !!row.build);
        let showRecentlyBuiltSection = !this._myDefinitionsStore.hasMyBuilds() && myFavoriteRows.length === 0 && teamFavoriteRows.length === 0;

        return {
            showMyBuildsSection: showMyBuildsSection,
            showRecentlyBuiltSection: showRecentlyBuiltSection,
            buildRows: buildRows,
            myFavoriteRows: myFavoriteRows,
            teamFavoriteRows: teamFavoriteRows,
            agents: this._myDefinitionsStore.agents(),
            hasDefinitions: this._myDefinitionsStore.hasDefinitions(),
            hasMoreMyFavorites: this._myDefinitionsStore.hasMoreMyFavoriteRows(),
            hasMoreTeamFavorites: this._myDefinitionsStore.hasMoreTeamFavoriteRows(),
            noAutoFocus: this._noAutoFocus
        };
    }

    // TODO: we don't actually want "changes" here, since there may be no differences between the previous build. we want the Change that represents the source version
    private _getChangeForBuild(build: Build): QueryResult<Change> {
        if (build) {
            var pendingChanges = this._changesStore.getChangesForBuild(build, 1);
            return {
                pending: pendingChanges.pending,
                result: pendingChanges.result[0]
            };
        }
    }

    private _onStoresUpdated = (sender: MyDefinitionsStore, payload: IStoreChangedPayload) => {
        this._noAutoFocus = !!payload && !!payload.noAutoFocus;
        this.setState(this._getState());
    }
}

interface IDefinitionGridProps {
    title: string;
    definitionRows: IRow[],
    hasMore?: boolean,
    statusFocus: BuildRowStatusFocus;
    hideSecondaryHeaders?: boolean;
    moreBuildsAction?: string;
    isTeamFavoriteSection?: boolean;
    focusOnLoad?: boolean;
}

class DefinitionGridComponent extends React.Component<IDefinitionGridProps, {}> {
    private _selection: Selection;
    private _selectedKeys: string[] = [];

    constructor(props: IDefinitionGridProps) {
        super(props);

        this._selection = new Selection();
        this._selection.setItems(this.props.definitionRows, true);
    }

    public render(): JSX.Element {
        return <DetailsList
            ariaLabelForGrid={format(BuildResources.GridArrowKeysInformationLabel, this.props.title)}
            checkButtonAriaLabel={BuildResources.CheckButtonLabel}
            items={this.props.definitionRows}
            columns={this._getColumns()}
            constrainMode={ConstrainMode.unconstrained}
            layoutMode={DetailsListLayoutMode.justified}
            className="mine-definitions-grid"
            selectionMode={SelectionMode.single}
            selection={this._selection}
            onItemInvoked={(item) => this._onItemInvoked(item)}
            {...this.props.focusOnLoad ? { initialFocusedIndex: 0 } : {} }
            checkboxVisibility={CheckboxVisibility.hidden}
        />;
    }

    public componentWillUpdate() {
        this._selectedKeys = [];
        if (this._selection.getSelectedCount() > 0) {
            // when we update grid, we should do our best effort to reselect them, else everytime we get signalr update we will loose all selections, that's bad
            this._selection.getSelection().forEach((item) => {
                this._selectedKeys.push("" + item.key);
            });
        }
    }

    public componentDidUpdate() {
        this._selectedKeys.forEach((key) => {
            this._selection.setKeySelected(key, true, true);
        });
    }

    private _getColumns(): IColumn[] {
        return [
            {
                key: GridColumnKeys.Details,
                name: this.props.title,
                fieldName: null,
                maxWidth: 600,
                minWidth: 400,
                isResizable: true,
                className: "details-column",
                onRender: (itemRow: IRow, index: number) => {
                    return <DetailsColumn item={itemRow} isTeamFavoriteSection={this.props.isTeamFavoriteSection} title={this.props.title} />;
                }
            },
            {
                key: GridColumnKeys.Status,
                name: BuildResources.BuildStatusText,
                fieldName: null,
                maxWidth: 200,
                minWidth: 100,
                isResizable: true,
                headerClassName: "status-column",
                onRender: (itemRow: IRow, index: number) => {
                    let statusElement: JSX.Element = null;
                    if (this.props.statusFocus === BuildRowStatusFocus.Definition) {
                        statusElement = <DefinitionStatus history={itemRow.history} />;
                    }
                    else {
                        statusElement = <BuildStatus build={itemRow.build} />;
                    }

                    return <div className="build-definition-entry-status single-line">
                        {statusElement}
                    </div>;
                }
            },
            {
                key: GridColumnKeys.TriggeredBy,
                name: BuildResources.TriggeredByLabel,
                fieldName: null,
                maxWidth: 600,
                minWidth: 100,
                isResizable: true,
                headerClassName: "triggered-by-column-header",
                onRender: (itemRow: IRow, index: number) => {
                    if (!itemRow.build) {
                        return <span className="single-line">{BuildResources.NoBuildsForThisDefinition}</span>;
                    }

                    return <BuildGridTriggerCellComponent className={"triggered-by-column"} build={itemRow.build} change={itemRow.change} />;
                }
            },
            {
                key: GridColumnKeys.History,
                name: BuildResources.HistoryTitle,
                fieldName: null,
                maxWidth: 200,
                minWidth: 100,
                isResizable: true,
                className: "history-column",
                onRender: (itemRow: IRow, index: number) => {
                    let histogramProps = {} as IBuildHistogramProps;

                    if (itemRow.build) {
                        histogramProps.selectedBuildId = itemRow.build.id;
                    }

                    return <BuildHistogram builds={itemRow.history} {...histogramProps} />;
                }
            }
        ] as IColumn[];
    }

    private _onItemInvoked(row: IRow) {
        if (row.build) {
            getEventActionService().performAction(CommonActions.ACTION_WINDOW_NAVIGATE, {
                url: BuildLinks.getBuildDetailLink(row.build.id)
            });
        }
        else if (row.definition && row.definition.result) {
            getEventActionService().performAction(CommonActions.ACTION_WINDOW_NAVIGATE, {
                url: getDefinitionLink(row.definition.result, row.isMyFavorite)
            });
        }
    }
}

interface BuildGridTriggerCellProps {
    build: Build;
    change: QueryResult<Change>;
    className: string;
}

class BuildGridTriggerCellComponent extends React.Component<BuildGridTriggerCellProps, any> {
    public render(): JSX.Element {
        if (this.props.change.pending) {
            return <img className={this.props.className} src={urlHelper.getVersionedContentUrl("spinner.gif")} />;
        }
        else if (!this.props.change.result) {
            return <span className={this.props.className}>
                {BuildReason.getName(this.props.build.reason, true)}
            </span>;
        }
        else {
            return <div className={this.props.className}>
                <div className="ellide-overflow">{this.props.change.result.message}</div>
                <div className="ellide-overflow"><SourceVersionLink build={this.props.build} change={this.props.change.result} /> {BuildResources.In} <SourceBranchLink build={this.props.build} /></div>
            </div>;
        }
    }
}
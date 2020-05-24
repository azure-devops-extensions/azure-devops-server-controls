import * as React from "react";

import { IFilterBarItem } from "./Types";
import * as AllDefinitionsAsync from "Build/Scenarios/CI/AllDefinitions/Tab";
import * as ActiveDefinitionsAsync from "Build/Scenarios/CI/ActiveDefinitions/Tab";
import * as AllBuildsAsync from "Build/Scenarios/CI/AllBuilds/Tab";
import {
    SignalRActionCreator,
    SignalRActionHub
} from "Build/Scripts/CI/Actions/SignalR";
import { HubActionCreator, HubActionHub } from "Build/Scripts/CI/Actions/Hub";
import { BuildsActionCreator, BuildsActionHub } from "Build/Scripts/CI/Actions/Builds";
import * as Resources from "Build/Scripts/Resources/TFS.Resources.Build";
import { showFolderSecurityDialog } from "Build/Scripts/Security";

import { BuildLinks } from "Build.Common/Scripts/Linking";

import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { autobind } from "OfficeFabric/Utilities";

import { VssIconType } from "VSSUI/Components/VssIcon/VssIcon.Props";
import { FilterBar } from "VSSUI/FilterBar";
import { IPivotBarAction, PivotBarItem } from 'VSSUI/PivotBar';
import { Hub } from "VSSUI/Hub";
import { HubHeader } from "VSSUI/HubHeader";
import {
    IVssHubViewState,
    VssHubViewState
} from "VSSPreview/Utilities/VssHubViewState";

import { NavigationView } from "VSS/Controls/Navigation";
import { Debug } from "VSS/Diag";
import { Action } from "VSS/Flux/Action";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

import { ICIViewProps, ICIViewState } from "./View.types";
import { IFilterState } from "VSSUI/Utilities/Filter";
import { IFilterBarProps } from "VSSUI/Components/FilterBar";

namespace TabKeys {
    export const ActiveDefinitions = "active";
    export const AllDefinitions = "allDefinitions";
    export const AllBuilds = "allBuilds";
}

const LoadingSpinner = () =>
    <Spinner type={SpinnerType.large} label={Resources.Loading} />;

const AsyncActiveDefinitions = getAsyncLoadedComponent(
    ["Build/Scenarios/CI/ActiveDefinitions/Tab"],
    (m: typeof ActiveDefinitionsAsync) => m.ActiveDefinitionsTab,
    LoadingSpinner);

const AsyncAllDefinitions = getAsyncLoadedComponent(
    ["Build/Scenarios/CI/AllDefinitions/Tab"],
    (m: typeof AllDefinitionsAsync) => m.AllDefinitionsTab,
    LoadingSpinner);

const AsyncAllBuilds = getAsyncLoadedComponent(
    ["Build/Scenarios/CI/AllBuilds/Tab"],
    (m: typeof AllBuildsAsync) => m.AllBuildsTab,
    LoadingSpinner);

export class CIViewContent extends React.Component<ICIViewProps, ICIViewState> {
    private static s_defaultView = TabKeys.ActiveDefinitions;

    private _hubViewState: IVssHubViewState;

    private _signalRActionCreator: SignalRActionCreator;
    private _signalRActionHub: SignalRActionHub;

    private _hubActionHub: HubActionHub;
    private _hubActionCreator: HubActionCreator;

    private _buildsActionHub: BuildsActionHub;
    private _buildsActionCreator: BuildsActionCreator;

    constructor(props: ICIViewProps) {
        super(props);

        this.state = {
            selectedView: CIViewContent.s_defaultView,
            refreshDataOnMount: false,
            additionalCommands: [],
            filterItems: []
        };

        this._hubViewState = new VssHubViewState({
            defaultPivot: CIViewContent.s_defaultView
        });

        this._hubActionHub = props.actionHub || new HubActionHub();
        this._hubActionCreator = new HubActionCreator({
            actionHub: this._hubActionHub
        });

        this._buildsActionHub = props.buildsHub || new BuildsActionHub();
        this._buildsActionCreator = new BuildsActionCreator({
            actionHub: this._buildsActionHub
        });

        this._hubViewState.selectedPivot.subscribe(this._onPivotSelected);

        this._hubActionHub.newCommandsAvailable.addListener(this._onNewCommandsAvailability);

        this._hubActionHub.newFilterItems.addListener(this._onFilterItemsChanged);

        this._signalRActionHub = props.signalRActionHub || new SignalRActionHub();

        this._signalRActionCreator = new SignalRActionCreator({
            actionHub: this._signalRActionHub
        });
    }

    public render() {
        return <div className="ci-view-content" role="main">
            <Hub
                className="ci-view-hub-content"
                hubViewState={this._hubViewState}
                commands={this._getHubCommands()}
                onRenderFilterBar={this._renderFilterBar}>
                <HubHeader
                    title={Resources.BuildsTitle}
                />
                <PivotBarItem
                    itemKey={TabKeys.ActiveDefinitions}
                    name={Resources.ActiveDefinitionsPageTitle}
                    url={this._hubViewState.createObservableUrl({ view: TabKeys.ActiveDefinitions })}>
                    <AsyncActiveDefinitions
                        hubActionCreator={this._hubActionCreator}
                        hubActionHub={this._hubActionHub}
                        signalRActionCreator={this._signalRActionCreator}
                        signalRActionHub={this._signalRActionHub}
                        buildsActionCreator={this._buildsActionCreator}
                        buildsActionHub={this._buildsActionHub}
                        refreshDataOnMount={this.state.refreshDataOnMount}
                        filter={this._hubViewState.filter}
                    />
                </PivotBarItem>
                <PivotBarItem
                    itemKey={TabKeys.AllDefinitions}
                    name={Resources.AllDefinitionsPageTitle}
                    url={this._hubViewState.createObservableUrl({ view: TabKeys.AllDefinitions })}>
                    <AsyncAllDefinitions
                        hubActionCreator={this._hubActionCreator}
                        hubActionHub={this._hubActionHub}
                        signalRActionCreator={this._signalRActionCreator}
                        signalRActionHub={this._signalRActionHub}
                        buildsActionCreator={this._buildsActionCreator}
                        buildsActionHub={this._buildsActionHub}
                        refreshDataOnMount={this.state.refreshDataOnMount}
                        filter={this._hubViewState.filter}
                    />
                </PivotBarItem>
                <PivotBarItem
                    itemKey={TabKeys.AllBuilds}
                    name={Resources.AllBuildsPageTitle}
                    url={this._hubViewState.createObservableUrl({ view: TabKeys.AllBuilds })}>
                    <AsyncAllBuilds
                        hubActionCreator={this._hubActionCreator}
                        hubActionHub={this._hubActionHub}
                        signalRActionCreator={this._signalRActionCreator}
                        signalRActionHub={this._signalRActionHub}
                        buildsActionCreator={this._buildsActionCreator}
                        buildsActionHub={this._buildsActionHub}
                        refreshDataOnMount={this.state.refreshDataOnMount}
                        filter={this._hubViewState.filter}
                    />
                </PivotBarItem>
            </Hub>
        </div>;
    }

    public componentWillUnmount() {
        this._hubActionHub.newCommandsAvailable.removeListener(this._onNewCommandsAvailability);
        this._hubActionHub.newFilterItems.removeListener(this._onFilterItemsChanged);
        this._hubViewState.selectedPivot.unsubscribe(this._onPivotSelected);
        this._signalRActionCreator.dispose();
    }

    @autobind
    private _renderFilterBar(): JSX.Element {
        if(this.state.filterItems && this.state.filterItems.length > 0) {
            return (<FilterBar className={"ci-hub-filter-control"} filter={this._hubViewState.filter}>
                {this.state.filterItems.map(x => x.onRender())}
            </FilterBar>);
        } else {
            return null;
        }
    }

    private _getHubCommands(): IPivotBarAction[] {
        return this.state.additionalCommands;
    }

    private _onNewDefinitionCommand = () => {
        this._openLinkSecurely(BuildLinks.getGettingStartedUrl());
    }

    private _onNewCommandsAvailability = (commands: IPivotBarAction[]) => {
        this.setState({
            additionalCommands: commands || []
        });
    }

    private _onFilterItemsChanged = (filterItems: IFilterBarItem[]) => {
        this.setState({
            filterItems: filterItems || []
        });
    }

    private _onPivotSelected = (view: string) => {
        this.setState({
            selectedView: view,
            refreshDataOnMount: true,
            additionalCommands: [],
            filterItems: []
        });
    }
    
    private _openLinkSecurely(link: string) {
        const openedWindow = window.open(link, "_self");
        if (openedWindow) {
            openedWindow.opener = null;
        }
    }
}
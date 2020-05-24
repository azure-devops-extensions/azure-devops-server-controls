/// <reference types="jquery" />
/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");

import { IColumn } from "OfficeFabric/DetailsList";

import { BuildsGrid, getBuildKey, IBuildsGridItemType, WellKnownColumnKeys, IBuildsGridRow } from "Build/Scripts/Components/BuildsGrid";
import * as HistoryStore from "Build/Scenarios/Definition/Deleted/Stores/History";
import * as ViewState from "Build/Scenarios/Definition/ViewState";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { canRetainBuild } from "Build/Scripts/Security";
import { SelectedTagsStore } from "Build/Scripts/Stores/Tags";

import { IBuildFilter } from "Build.Common/Scripts/ClientContracts";
import { BuildPermissions } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { Build, BuildQueryOrder } from "TFS/Build/Contracts";

export interface IState {
    filter: IBuildFilter;
    continuationToken: string;
    definitionId: number;
    builds: Build[];
    noAutoFocus?: boolean;
}

export interface IProps extends React.Props<any> {
    historyStore: HistoryStore.Store;
    tagStore: SelectedTagsStore;
}

export class ControllerView extends React.Component<IProps, IState> {
    private _viewState: ViewState.ViewStateStore = null;
    private _historyStore: HistoryStore.Store = null;
    private _tagStore: SelectedTagsStore = null;

    constructor(props: IProps) {
        super(props);

        this._viewState = ViewState.getInstance();
        this._historyStore = this.props.historyStore;
        this._tagStore = props.tagStore;

        this.state = this._getState();
    }

    public render(): JSX.Element {
        let firstKey = "";
        if (this.state.builds && this.state.builds.length > 0) {
            firstKey = getBuildKey(this.state.builds[0]);
        }

        let rows: IBuildsGridRow[] = this.state.builds.map((build) => {
            return {
                itemType: IBuildsGridItemType.Build,
                item: build,
                key: getBuildKey(build),
                canToggleRetained: canRetainBuild(build.definition)
            };
        });

        let queryOrder = BuildQueryOrder.FinishTimeDescending;
        // there is no 0 in BuildQueryOrder enum, so if condition works fine
        if (this.state.filter && this.state.filter.queryOrder) {
            queryOrder = this.state.filter.queryOrder;
        }

        return <div>
            <BuildsGrid
                ariaLabelForGrid={BuildResources.DeletedBuildsGridLabel}
                rows={rows}
                columnKeysInOrder={this._getColumnKeys()}
                hasMore={!!this.state.continuationToken}
                queryOrder={queryOrder}
                hideContributedMenuItems={true}
                singleSelectionMode={true}
                onMoreBuildsClicked={this._onMoreBuildsClicked}
                onSortTimeClicked={this._onSortFinishTimeClicked}
                noAutoFocus={this.state.noAutoFocus}
            />
        </div>;
    }

    public componentDidMount() {
        // add changed listeners
        this._viewState.addChangedListener(this._onStoresUpdated);
        this._historyStore.addChangedListener(this._onStoresUpdated);
        this._tagStore.addChangedListener(this._onTagStoreUpdated);
    }

    public componentWillUnmount() {
        // remove changed listeners
        this._viewState.removeChangedListener(this._onStoresUpdated);
        this._historyStore.removeChangedListener(this._onStoresUpdated);
        this._tagStore.removeChangedListener(this._onTagStoreUpdated);
    }

    private _getColumnKeys(): string[] {
        return [
            WellKnownColumnKeys.Reason,
            WellKnownColumnKeys.Status,
            WellKnownColumnKeys.Name,
            WellKnownColumnKeys.Source,
            WellKnownColumnKeys.SourceVersion,
            WellKnownColumnKeys.DateCompleted,
            WellKnownColumnKeys.RequestedFor
        ];
    }

    private _getState(): IState {
        let definitionId = this._viewState.getDefinitionId();

        return {
            filter: this._historyStore.getFilter(),
            continuationToken: this._historyStore.getContinuationToken(),
            definitionId: definitionId,
            builds: this._historyStore.getBuilds(definitionId)
        };
    }

    private _onMoreBuildsClicked = () => {
        let filter = this.state.filter || {};
        filter.continuationToken = this.state.continuationToken;

        // don't focus on more
        this.setState({
            filter: this.state.filter,
            continuationToken: this.state.continuationToken,
            definitionId: this.state.definitionId,
            builds: this.state.builds,
            noAutoFocus: true
        });

        this._historyStore.triggerGetBuildHistory(this.state.definitionId, filter);
    }

    private _onSortFinishTimeClicked = (queryOrder: BuildQueryOrder) => {
        let filter = this.state.filter || {};
        filter.queryOrder = queryOrder;
        filter.continuationToken = "";

        // focus on sort
        this.setState({
            filter: this.state.filter,
            continuationToken: this.state.continuationToken,
            definitionId: this.state.definitionId,
            builds: this.state.builds,
            noAutoFocus: false
        });

        this._historyStore.triggerGetBuildHistory(this.state.definitionId, filter);
    }

    private _onStoresUpdated = () => {
        this.setState(this._getState());
    }

    private _onTagStoreUpdated = () => {
        let filter = this.state.filter || {};
        filter.continuationToken = "";
        filter.tagFilters = this._tagStore.getSelectedTags().join(",");
        this._historyStore.triggerGetBuildHistory(this.state.definitionId, filter);
    }
}
import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Performance from "VSS/Performance";

import { DiscussionManager } from  "Presentation/Scripts/TFS/TFS.Discussion.OM";

import { ActionCreator } from  "VersionControl/Scenarios/ChangeDetails/Actions/ActionCreator";
import { ChangeDetailsPerfSplitScenarios } from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsTelemetry";
import { StoresHub } from  "VersionControl/Scenarios/ChangeDetails/Stores/StoresHub";
import * as ChangeDetailsUtils from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsUtils";

import * as VCSharedDiffViewer from "VersionControl/Scenarios/Shared/FileViewers/DiffViewer";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { DiffViewerOrientation } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";

export function renderTab(element: HTMLElement, props: ICompareTabProps): void {
    ReactDOM.render(
        <CompareTab {...props} />,
        element);
}

export interface ICompareTabProps {
    performanceScenario?: Performance.IScenarioDescriptor;
    storesHub: StoresHub;
    actionCreator: ActionCreator;
}

export interface ICompareTabState {
    repositoryContext: RepositoryContext;
    discussionManager: DiscussionManager;
    item: VCLegacyContracts.ItemModel;
    oversion: string;
    mversion: string;
    opath: string;
    mpath: string;
    isLoading: boolean;
    isVisible: boolean;
    orientation: DiffViewerOrientation;
}

/**
 * Controller view component for the Compare tab 
 */
export class CompareTab extends React.Component<ICompareTabProps, ICompareTabState> {
    private static readonly _diffViewerToolbarSelector = ".vc-changelist-diffviewer-toolbar";

    constructor(props: ICompareTabProps) {
        super(props);

        this.state = this._getStateFromStores();
    }

    public render(): JSX.Element {
        const isGitRepository = this.state.repositoryContext.getRepositoryType() === RepositoryType.Git;

        return (
            <VCSharedDiffViewer.DiffViewer
                isVisible={this.state.isVisible}
                hideActionsToolbar={false}
                hideVersionSelector={false}
                addViewsToolbarAfterActionsToolbar={true}
                rightAlignVersionSelectorDropDown={true}
                hideComments={true}
                disableDownloadFile={true}
                hideFileName={true}
                supportCommentStatus={isGitRepository}
                item={this._getItem()}
                mpath={this.state.mpath}
                opath={this.state.opath}
                mversion={this.state.mversion}
                oversion={this.state.oversion}
                discussionManager={this.state.discussionManager}
                repositoryContext={this.state.repositoryContext}
                orientation= {this.state.orientation}
                onError= {this._onErrorCallback}
                onLoadComplete = {this._onLoadComplete}
                onOrientationChange= {this._orientationChangeCallback}
                separateToolbarSelector={CompareTab._diffViewerToolbarSelector}
                className={"vc-changelist-details-compare"}
            />
        );
    }

    public componentDidMount(): void {
        this.props.storesHub.contextStore.addChangedListener(this._onChange);
        this.props.storesHub.userPreferencesStore.addChangedListener(this._onChange);
        this.props.storesHub.urlParametersStore.addChangedListener(this._onChange);
        this.props.storesHub.discussionManagerStore.addChangedListener(this._onChange);
        this.props.storesHub.itemDetailsStore.addChangedListener(this._onChange);

        if (this.props.performanceScenario && this.props.performanceScenario.isActive()) {
            this.props.performanceScenario.addSplitTiming(ChangeDetailsPerfSplitScenarios.CompareTabMountComplete);
        }
    }

    public componentDidUpdate(): void {
        $(CompareTab._diffViewerToolbarSelector).toggle(!!this.state.isVisible);
    }

    public componentWillUnmount(): void {
        this.props.storesHub.contextStore.removeChangedListener(this._onChange);
        this.props.storesHub.userPreferencesStore.removeChangedListener(this._onChange);
        this.props.storesHub.urlParametersStore.removeChangedListener(this._onChange);
        this.props.storesHub.discussionManagerStore.removeChangedListener(this._onChange);
        this.props.storesHub.itemDetailsStore.removeChangedListener(this._onChange);
    }

    public shouldComponentUpdate(nextProps: ICompareTabProps, nextState: ICompareTabState): boolean {
        if ((nextState.isLoading && this.state.isLoading) ||
            (!nextState.isVisible && !this.state.isVisible)) {
            return false;
        }

        return true;
    }

    private _getItem(): VCLegacyContracts.ItemModel {
        if (this.state.item && this.state.item.serverItem === this.props.storesHub.urlParametersStore.path) {
            return this.state.item;
        }

        return null;
    }

    private _onChange = (): void  => {
        this.setState(this._getStateFromStores());
    }

    private _getStateFromStores(): ICompareTabState {
        const userPreferences = this.props.storesHub.userPreferencesStore.getPreferences();
        const isLoading = this.props.storesHub.contextStore.isLoading() ||
            this.props.storesHub.userPreferencesStore.isLoading() ||
            this.props.storesHub.itemDetailsStore.isLoading();

        const itemDetails = this.props.storesHub.itemDetailsStore.currentItemDetails;
        const item: VCLegacyContracts.ItemModel = itemDetails ? itemDetails.item : null;

        // Explicitly set the first parent for diffing when we have the initial URL when navigating to a commit (History hub) from a particular file (Files hub).
        // Example URL:  http://.../commit/abc123?_a=compare&path=SomeFile.txt
        // This avoids a possible issue from Simplified vs Full History where the Simplified "P"revious commit for that file is different from the commit first parent (Bug #552222).
        // Subsequent file selections via the changelist navigator will update urlParametersStore.oversion with the correct parent commit.
        const params = this.props.storesHub.urlParametersStore;
        let opath: string = params.opath;
        let oversion: string = params.oversion;
        if (item && !(params.mpath || params.opath || params.mversion || params.oversion)) {
            oversion = this.props.storesHub.changeListStore.getPreviousVersionSpec();
            opath = ChangeDetailsUtils.getOriginalPath(this.props.storesHub.changeListStore.currentChangeList, item.serverItem);
        }

        return {
            repositoryContext: this.props.storesHub.contextStore.getRepositoryContext(),
            discussionManager: this.props.storesHub.discussionManagerStore.discussionManager,
            orientation: userPreferences ? userPreferences.diffViewerOrientation : null,
            isLoading: isLoading,
            isVisible: params.isCompareAction,
            item: item,
            mpath: params.mpath,
            opath: opath,
            mversion: params.mversion,
            oversion: oversion,
        };
    }

    // public for testing purpose
    public _onLoadComplete = (): void => {
        if (this.props.performanceScenario && this.props.performanceScenario.isActive()) {
            this.props.performanceScenario.addSplitTiming(ChangeDetailsPerfSplitScenarios.CompareTabLoadComplete);
            this.props.performanceScenario.end();
        }
    }

    private _onErrorCallback = (error: any): void => {
        this.props.actionCreator.raiseError(error);
    }

    /**
     * The diff viewer orientation can change inside the control and it will reset user preferences.
     * Since we maintain state on the page, we need to know if it changed so we can update our internal store.
     *
     * @param orientation - the new orientation
     */
    private _orientationChangeCallback = (orientation: DiffViewerOrientation): void => {
        this.props.actionCreator.userPreferenceActionCreator.updateDiffViewerOrientation(orientation);
    }
}

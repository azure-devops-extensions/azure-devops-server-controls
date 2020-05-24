import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Performance from "VSS/Performance";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { DiscussionManager } from "Presentation/Scripts/TFS/TFS.Discussion.OM";

import { ChangeDetailsPerfSplitScenarios } from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsTelemetry";
import { StoresHub } from  "VersionControl/Scenarios/ChangeDetails/Stores/StoresHub";
import { FileViewer } from "VersionControl/Scenarios/Shared/FileViewers/FileViewer";
import { ItemModel, VersionControlChangeType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { ChangeType } from "VersionControl/Scripts/TFS.VersionControl";

export function renderTab(element: HTMLElement, props: IContentsTabProps): void {
    ReactDOM.render(
        <ContentsTab {...props}/>,
        element);
}

export interface IContentsTabProps {
    performanceScenario?: Performance.IScenarioDescriptor;
    storesHub: StoresHub;
}

export interface IContentsTabState {
    tfsContext: TfsContext;
    repositoryContext: RepositoryContext;
    discussionManager: DiscussionManager;
    itemDetail: ItemModel;
    isDelete: boolean;
    isLoading: boolean;
    isVisible: boolean;
}

/**
 * Controller view component for the Contents tab
 */
export class ContentsTab extends React.Component<IContentsTabProps, IContentsTabState> {

    constructor(props: IContentsTabProps) {
        super(props);

        this.state = this._getStateFromStores();
    }

    public render(): JSX.Element {
        return (
            <FileViewer
                isVisible={this.state.isVisible}
                itemDetail={this.state.itemDetail}
                isDelete={this.state.isDelete}
                discussionManager={this.state.discussionManager}
                repositoryContext={this.state.repositoryContext}
                tfsContext={this.state.tfsContext}
                cssClass={"vc-change-details-file-viewer"}
            />
        );
    }

    public componentDidMount(): void {
        this.props.storesHub.contextStore.addChangedListener(this._onChange);
        this.props.storesHub.userPreferencesStore.addChangedListener(this._onChange);
        this.props.storesHub.urlParametersStore.addChangedListener(this._onChange);
        this.props.storesHub.discussionManagerStore.addChangedListener(this._onChange);
        this.props.storesHub.itemDetailsStore.addChangedListener(this._onChange);

        this._endPerformanceScenario();
    }

    public componentWillUnmount(): void {
        this.props.storesHub.contextStore.removeChangedListener(this._onChange);
        this.props.storesHub.userPreferencesStore.removeChangedListener(this._onChange);
        this.props.storesHub.urlParametersStore.removeChangedListener(this._onChange);
        this.props.storesHub.discussionManagerStore.removeChangedListener(this._onChange);
        this.props.storesHub.itemDetailsStore.removeChangedListener(this._onChange);
    }

    public shouldComponentUpdate(nextProps: IContentsTabProps, nextState: IContentsTabState): boolean {
        if ((nextState.isLoading && this.state.isLoading) ||
            (!nextState.isVisible && !this.state.isVisible)) {
            return false;
        }

        return true;
    }

    private _endPerformanceScenario(): void {
        if (this.props.performanceScenario && this.props.performanceScenario.isActive()) {
            this.props.performanceScenario.addSplitTiming(ChangeDetailsPerfSplitScenarios.ContentsTabLoadComplete);
            this.props.performanceScenario.end();
        }
    }

    private _onChange = (): void => {
        this.setState(this._getStateFromStores());
    }

    private _getStateFromStores(): IContentsTabState {
        const isLoading = this.props.storesHub.contextStore.isLoading() ||
            this.props.storesHub.userPreferencesStore.isLoading() ||
            this.props.storesHub.itemDetailsStore.isLoading();

        const itemDetails = this.props.storesHub.itemDetailsStore.currentItemDetails;

        const isChangeTypeDelete = itemDetails && itemDetails.change && ChangeType.hasChangeFlag(itemDetails.change.changeType, VersionControlChangeType.Delete);

        return {
            tfsContext: this.props.storesHub.contextStore.getTfsContext(),
            repositoryContext: this.props.storesHub.contextStore.getRepositoryContext(),
            discussionManager: this.props.storesHub.discussionManagerStore.discussionManager,
            itemDetail: itemDetails ? itemDetails.item : null,
            isDelete: isChangeTypeDelete,
            isLoading: isLoading,
            isVisible: this.props.storesHub.urlParametersStore.isContentsAction,
        };
    }
}

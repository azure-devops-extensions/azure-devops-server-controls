import * as React from "react";
import * as Mixins from "VersionControl/Scripts/Components/PullRequestReview/Mixins";
import * as Q from "q";
import { IconButton } from "OfficeFabric/Button";
import { DirectionalHint, TooltipHost } from "VSSUI/Tooltip";
import { autobind, css } from "OfficeFabric/Utilities";
import Controls = require("VSS/Controls");
import Utils_Array = require("VSS/Utils/Array");
import Telemetry = require("VSS/Telemetry/Services");
import Artifacts_Services = require("VSS/Artifacts/Services");

import {
    HostArtifactAdditionalData,
    IInternalLinkedArtifactDisplayData,
    ILinkedArtifactsCache,
    ViewMode,
    ZeroDataExperienceViewMode } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ILinkedArtifact } from "TFS/WorkItemTracking/ExtensionContracts";
import { ILinkedArtifactControlOptions, LinkedArtifactsControl } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Control";
import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";
import { mapWorkItemIdToLinkedArtifact } from "VersionControl/Scripts/Utils/WorkItemLinkUtils";
import { PullRequestArtifact } from "VersionControl/Scripts/PullRequestArtifact";
import { RemoveWorkItemsDialog } from "VersionControl/Scenarios/Shared/RemoveWorkItemsDialog";
import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";
import VCAddRelatedWorkItemsControl = require("VersionControl/Scripts/Controls/AddRelatedWorkItemsControl");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { IArtifactData } from "VSS/Artifacts/Services";

import "VSS/LoaderPlugins/Css!VersionControl/RelatedWorkItems";

export interface IRelatedWorkItemsSectionProps {
}

export interface IRelatedWorkItemsState {
    pullRequest: IPullRequest;
    workItems: number[];
    workItemToRemove?: number; // if null, remove all
    loading: boolean;
    isSearchVisible?: boolean;
    isConfirmDialogVisible?: boolean;
    hasPermissionToUpdateWorkItems: boolean;
}

/**
 * Controller-view for work item section state.
 */
export class RelatedWorkItemsSection extends Mixins.DiagnosticComponent<IRelatedWorkItemsSectionProps, IRelatedWorkItemsState> {
    private _workItemCache: IDictionaryStringTo<IInternalLinkedArtifactDisplayData > = {};

    constructor(props) {
        super(props);
        this.state = this._getStateFromStores();
    }

    public render(): JSX.Element {
        if (this.state.loading) {
            return <div></div>;
        }

        const hostArtifact = this._getHostArtifact();

        // render related artifacts wrapper
        return (
            <div className="vc-pullrequest-leftpane-section">
                <div className="vc-pullrequest-leftpane-section-title">
                    <div className="title-content" role="heading" aria-level={2}>{VCResources.PullRequest_RelatedArtifactsTitle}</div>
                    <div className="title-content title-action-container">
                        {
                            this.state.hasPermissionToUpdateWorkItems &&
                            [
                                <div key="remove-all-work-items" className="title-content title-action">
                                    {this._renderRemoveAllWorkItems()}
                                </div>,
                                <div key="add-more-work-items" className="title-content title-action">
                                    {this._renderAddWorkItems()}
                                </div>
                            ]
                        }
                    </div>
                </div>
                <div className="divider" />
                <div className={this._containerClassName()}>
                    {
                        this.state.isConfirmDialogVisible &&
                        <RemoveWorkItemsDialog
                            workItemToRemove={this.state.workItemToRemove}
                            okAction={this._removeWorkItems}
                            dismissAction={this._hideConfirmDialog} />
                    }

                    {
                        this.state.hasPermissionToUpdateWorkItems &&
                        <AddRelatedWorkItems
                            workItems={this.state.workItems}
                            isSearchVisible={this.state.isSearchVisible}
                            hostArtifact={hostArtifact} />
                    }

                    <LinkedArtifactsControl
                        // Minimal set of columns required, don't include state, comment etc.
                        columns={[]}
                        readOnly={!this.state.hasPermissionToUpdateWorkItems}
                        linkTypeRefNames={null}
                        tfsContext={TfsContext.getDefault()}
                        viewOptions={{
                            viewMode: ViewMode.List,
                            showGroupHeaders: false
                        }}
                        onRemoveLinkedArtifact={this._onRemoveClick}
                        zeroDataOptions={{
                            zeroDataExperienceViewMode: ZeroDataExperienceViewMode.Default,
                            message: VCResources.PullRequest_NoRelatedWorkItems
                        }}
                        linkedArtifacts={this.state.workItems.map(mapWorkItemIdToLinkedArtifact)}
                        cache={{
                            set: (key, value) => this._workItemCache[key] = value,
                            get: (key) => this._workItemCache[key],
                            invalidate: (key) => delete this._workItemCache[key]
                        }}
                        hostArtifact={{
                            id: hostArtifact.getId(),
                            tool: hostArtifact.getTool(),
                            type: hostArtifact.getType(),
                            uri: hostArtifact.getUri(),
                            additionalData: hostArtifact._data.additionalData,
                        } as IArtifactData } />
                </div>
            </div>
        );
    }

    @autobind
    private _onAddClick(): void {
        this.setState({ isSearchVisible: !this.state.isSearchVisible });
    }

    @autobind
    private _onRemoveClick(removedArtifact: ILinkedArtifact): void {
        this.setState({ 
            isConfirmDialogVisible: true,
            workItemToRemove: Number(removedArtifact.id),
        });
    }

    @autobind
    private _onRemoveAllClick(): void {
        this.setState({
            isConfirmDialogVisible: true,
            workItemToRemove: null,
        });
    }

    @autobind 
    private _removeWorkItems(): void {
        const hostArtifact = this._getHostArtifact();
        const removeAll: boolean = !this.state.workItemToRemove;

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.RELATED_WORK_ITEMS_DELETE, {
                "hostArtifactId": hostArtifact ? hostArtifact.getId() : null,
                "contextId": "pullRequestDetailsContext",
                "workItemIds": [this.state.workItemToRemove] || this.state.workItems,
                "removeAll": removeAll,
            }));

        Flux.instance().actionCreator.workItemActionCreator.removeAssociatedWorkItems(
            hostArtifact.getUri(), 
            removeAll ? this.state.workItems : [this.state.workItemToRemove]);
        this._hideConfirmDialog();
    }

    @autobind
    private _hideConfirmDialog(): void {
        this.setState({ isConfirmDialogVisible: false });
    }

    private _containerClassName(): string {
        return "vc-pullrequest-workitem-container";
    }

    private _renderAddWorkItems(): JSX.Element {
        return (
            <div className="title-content title-action">
                <button aria-label={this._labelText()} className="link-button"
                    onClick={this._onAddClick}><span className={this._iconStyle()} aria-hidden="true"></span></button>
            </div>);
    }

    private _renderRemoveAllWorkItems(): JSX.Element {
        return (
            <div className="vc-pullrequest-workitem-removeAll-tooltipHost">
                <TooltipHost
                    content={VCResources.PullRequest_RelatedArtifactsRemoveAllLabel}
                    directionalHint={DirectionalHint.bottomCenter}>
                    <IconButton
                        ariaLabel={VCResources.PullRequest_RelatedArtifactsRemoveAllLabel}
                        iconProps={{ iconName: null }}
                        disabled={!this.state.workItems || !this.state.workItems.length}
                        className={css("vc-pullrequest-workitem-removeAll-button", "bowtie-icon", "bowtie-edit-delete")}
                        onClick={this._onRemoveAllClick} />
                </TooltipHost>
            </div>);
    }

    private _getHostArtifact(): PullRequestArtifact {
        return new PullRequestArtifact({
            projectGuid: this.state.pullRequest.projectGuid,
            repositoryId: this.state.pullRequest.repositoryId,
            pullRequestId: this.state.pullRequest.pullRequestId,
            refName: this.state.pullRequest.pullRequestId,
            additionalData: {
                [HostArtifactAdditionalData.ProjectId]: this.state.pullRequest.projectGuid,
            },
        });
    }

    /**
     * Toggle visiblity depending on user selection.
     */
    private _iconStyle = (): string => {
        return "bowtie-icon " + (this.state.isSearchVisible ? "bowtie-math-minus" : "bowtie-math-plus");
    };

    private _labelText = (): string => {
        return this.state.isSearchVisible ? VCResources.PullRequest_HideWorkItemSearch : VCResources.PullRequest_RelatedWorkItemsTitle;
    };

    // TODO: Should subscribe on the top level
    public componentDidMount() {
        super.componentDidMount();

        Flux.instance().storesHub.relatedWorkItemsStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestDetailStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.permissionsStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        super.componentWillUnmount();

        Flux.instance().storesHub.relatedWorkItemsStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestDetailStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.permissionsStore.removeChangedListener(this._onChange);
    }

    @autobind
    private _onChange(): void {
        this.setState(this._getStateFromStores());
    }

    public shouldComponentUpdate(nextProps: IRelatedWorkItemsSectionProps, nextState: IRelatedWorkItemsState): boolean {
        if (nextState.loading && this.state.loading) {
            return false; // if we are still loading, don't bother to re-render
        }

        return nextState.pullRequest !== this.state.pullRequest
            || nextState.workItems !== this.state.workItems
            || nextState.isSearchVisible !== this.state.isSearchVisible
            || nextState.isConfirmDialogVisible !== this.state.isConfirmDialogVisible
            || nextState.hasPermissionToUpdateWorkItems !== this.state.hasPermissionToUpdateWorkItems;
    }

    private _getStateFromStores(): IRelatedWorkItemsState {
        return {
            pullRequest: Flux.instance().storesHub.pullRequestDetailStore.getPullRequestDetail(),
            hasPermissionToUpdateWorkItems: Flux.instance().storesHub.permissionsStore.getPermissions().updateWorkItems,
            workItems: Flux.instance().storesHub.relatedWorkItemsStore.getWorkItems().slice(0),
            loading: Flux.instance().storesHub.relatedWorkItemsStore.isLoading()
                  || Flux.instance().storesHub.pullRequestDetailStore.isLoading()
                  || Flux.instance().storesHub.permissionsStore.isLoading()
        };
    }
}

interface IAddRelatedWorkItemsProps {
    hostArtifact: Artifacts_Services.Artifact;
    isSearchVisible: boolean;
    workItems: number[];
}

class AddRelatedWorkItems extends Mixins.DiagnosticComponent<IAddRelatedWorkItemsProps, {}> {
    private _containerElement: HTMLElement;
    private _addWorkItemsControl: VCAddRelatedWorkItemsControl.AddRelatedWorkItemsControl;

    public render(): JSX.Element {
        return (<div
            className="vc-pullrequest-details-view-relatedartifacts-hostcontrol"
            ref={(d) => this._containerElement = d} />);
    }

    public componentDidMount() {
        super.componentDidMount();

        // do an initial refresh in case it is needed
        this.componentDidUpdate();
    }

    public componentDidUpdate(prevProps?: IAddRelatedWorkItemsProps) {
        super.componentDidUpdate();

        if (this._addWorkItemsControl) {
            if (prevProps && this.props.isSearchVisible !== prevProps.isSearchVisible) {
                this._addWorkItemsControl.showTextBox(this.props.isSearchVisible, true);
            }
            return; // we already set up our control, so no need to do it again
        }

        if (!this.props.hostArtifact || !this.props.hostArtifact.getId()) {
            return; // we are not ready to do setup yet
        }

        // first, set up the control
        const $element = $(this._containerElement);

        this._addWorkItemsControl =
            Controls.BaseControl.createIn(
                VCAddRelatedWorkItemsControl.AddRelatedWorkItemsControl,
                $element,
                {
                    hostArtifactId: this.props.hostArtifact.getId(),
                    onWorkItemAdd: (workItemId: number) => this._onAddWorkItem(workItemId),
                    checkWorkItemExists: (workItemId: number) => Utils_Array.contains(this.props.workItems, workItemId)
                } as VCAddRelatedWorkItemsControl.IAddRelatedWorkItemsControlOptions) as VCAddRelatedWorkItemsControl.AddRelatedWorkItemsControl;

        this._addWorkItemsControl.showTextBox(this.props.isSearchVisible, false);
    }

    public componentWillUnmount() {
        super.componentWillUnmount();

        if (this._addWorkItemsControl) {
            this._addWorkItemsControl.dispose();
            this._addWorkItemsControl = null;
        }
    }

    public shouldComponentUpdate(nextProps: IAddRelatedWorkItemsProps, nextState: {}): boolean {
        if (!this.props.hostArtifact || !this.props.hostArtifact.getId()) {
            return false; // we are not ready to do setup yet
        }

        return (!this._addWorkItemsControl
            || this.props.isSearchVisible !== nextProps.isSearchVisible);
    }

    private _onAddWorkItem(workItemId: number) {
        Flux.instance().actionCreator.workItemActionCreator.addAssociatedWorkItem(
            this.props.hostArtifact.getUri(), workItemId);
    }
}

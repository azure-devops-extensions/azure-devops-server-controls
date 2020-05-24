/// <reference types="react-dom" />

import * as React from "react";

import * as VCContracts from "TFS/VersionControl/Contracts";
import * as Telemetry from "VSS/Telemetry/Services";
import * as  Utils_String from "VSS/Utils/String";

// stores
import { IAsyncGitOperationProgressState, Progress } from "VersionControl/Scripts/Stores/AsyncGitOperation/AsyncGitOperationProgressStore";
import { AsyncRefDesignStoreInstance } from "VersionControl/Scripts/Stores/AsyncGitOperation/AsyncRefDesignStore";
import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";

import * as AsyncRefOperationActionCreator from "VersionControl/Scripts/Actions/AsyncGitOperation/AsyncRefOperationActionCreator";
import { AsyncRefOperationCreationState, AsyncRefOperationType } from "VersionControl/Scripts/Actions/AsyncGitOperationActions";
import { asyncGitOperationRealtimeNotificationReceived } from "VersionControl/Scripts/Actions/AsyncGitOperationActions";
import { AsyncGitOperationTracker, OperationCompletedProps } from "VersionControl/Scripts/Components/AsyncGitOperation/AsyncGitOperationTracker";
import { AsyncRefOperationDesigner } from "VersionControl/Scripts/Components/AsyncGitOperation/AsyncRefOperationDesigner";

import { GitObjectId } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";

import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import { Dialog, DialogType } from "OfficeFabric/Dialog";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

/**
 * Data needed to start an async ref operation.
 */
export interface IAsyncRefOperationData {
    operationType: AsyncRefOperationType;
    generatedRef: VCSpecs.IGitRefVersionSpec;
    ontoRef: VCSpecs.IGitRefVersionSpec;
}

/**
 * State for the controller view.
 */
export interface IControllerViewState {
    operationId?: number;
    operationType?: AsyncRefOperationType;
    ontoRef?: VCSpecs.IGitRefVersionSpec;
    generatedRef?: VCSpecs.IGitRefVersionSpec;
    generatedRefError?: string;
    generatedRefWarning?: string;
    progressState?: IAsyncGitOperationProgressState;
    showProgress: boolean;
    isOpen: boolean;
    title?: string;
    subTitle?: string;
    createText?: string;
}

/**
 * Props for the controller view.
 */
export interface IAsyncRefOperationControllerViewProps {
    repositoryContext: GitRepositoryContext;
    operationCompletedProps: OperationCompletedProps;
    comment?: string;
    commitId?: GitObjectId;
    pullRequest?: IPullRequest;
    simplifiedMode?: boolean;
    ciArea?: string;
}

/**
 * Telemetry data for async ref operations
 */
export interface IAsyncRefOperationTelemetry {
    changedGeneratedBranchName: boolean;
    isComplete: boolean;
    isError: boolean;
    createPullRequest: boolean;
    receivedRealtimeEvents: boolean;
    operationType: AsyncRefOperationType;
}

/**
 * The root controller view for the async ref operation experience.
 */
export class AsyncRefOperationControllerView extends React.Component<IAsyncRefOperationControllerViewProps, IControllerViewState> {
    private _receivedRealtimeEvent: boolean;
    private _collectTelemetryNoPullRequest;
    private readonly _cherryPickTemplateName: string = "cherry_pick.md";
    private readonly _revertTemplateName: string = "revert.md";

    constructor(props: IAsyncRefOperationControllerViewProps) {
        super(props);
        this.state = {
            showProgress: false,
            generatedRef: new VCSpecs.GitBranchVersionSpec(""),
            progressState: {
                progressPercent: 0,
                message: "",
                isError: false,
                isComplete: false,
            },
            isOpen: false,
        };
        this._receivedRealtimeEvent = false;
        this._collectTelemetryNoPullRequest = this._collectTelemetryAndClose.bind(this, false);
        this._onClose = this._onClose.bind(this);
    }

    public render(): JSX.Element {
        return (
            <Dialog
                modalProps={{ containerClassName: "vc-async-ref-dialog", isBlocking: true }}
                hidden={!this.state.isOpen}
                dialogContentProps={{ type: DialogType.close }}
                onDismiss={this._onClose}
                title={this.state.title}
                closeButtonAriaLabel={VCResources.AsyncRef_Dialog_Cancel}
                firstFocusableSelector={this.props.simplifiedMode ? "dialog-cancel-button" : "filtered-list-dropdown-menu"}>
                {!this.state.showProgress &&
                    <AsyncRefOperationDesigner
                        description={this.state.subTitle}
                        okText={this.state.createText}
                        onDoOperation={this._onDoOperation}
                        onClose={this._onClose}
                        ontoRef={this.state.ontoRef}
                        ontoRefChanged={this._ontoRefChanged}
                        generatedRef={this.state.generatedRef}
                        generatedRefChanged={this._generatedRefChanged}
                        generatedRefError={this.state.generatedRefError}
                        generatedRefWarning={this.state.generatedRefWarning}
                        repositoryContext={this.props.repositoryContext}
                        simplifiedMode={this.props.simplifiedMode} />}
                {this.state.showProgress &&
                    <AsyncGitOperationTracker
                        onClose={this._onClose}
                        onCreatePullRequest={this._createPullRequest}
                        progressPercent={this.state.progressState.progressPercent}
                        message={this.state.progressState.message}
                        isError={this.state.progressState.isError}
                        isComplete={this.state.progressState.isComplete}
                        newRefUrl={!this.props.simplifiedMode ? this.state.progressState.newRefUrl : null}
                        newRefName={!this.props.simplifiedMode ? this.state.progressState.newRefName : null}
                        operationCompletedProps={this.props.operationCompletedProps} />}
            </Dialog>
        );
    }

    private _onClose(): void {
        this.setState(
            { isOpen: false } as IControllerViewState,
            () => {
                if (this.state.operationId) {
                    this._collectTelemetryAndClose(false);
                }

                AsyncRefOperationActionCreator.ActionCreator.closeAsyncRefOperationExperience(AsyncRefDesignStoreInstance.getOperationId());
            });
    }

    public componentDidMount() {
        AsyncRefDesignStoreInstance.addChangedListener(this._updateDesignStateFromStore);
        Progress.addChangedListener(this._updateProgressStateFromStore);
    }

    public componentWillUnmount() {
        AsyncRefDesignStoreInstance.removeChangedListener(this._updateDesignStateFromStore);
        Progress.removeChangedListener(this._updateProgressStateFromStore);
    }

    public shouldComponentUpdate(nextProps: IAsyncRefOperationControllerViewProps, nextState: IControllerViewState): boolean {
        return !((nextState.isOpen === false) && (this.state.isOpen === false));
    }

    private _updateDesignStateFromStore = () => {

        if (AsyncRefDesignStoreInstance.getCurrentState() === AsyncRefOperationCreationState.NotDesigning) {
            // reset the experience and close the dialog
            this.setState({
                isOpen: false,
                showProgress: false,
                progressState: {
                    progressPercent: 0,
                    message: "",
                    isError: false,
                    isComplete: false,
                },
            });
        }
        else {
            this.setState(
                {
                    isOpen: AsyncRefDesignStoreInstance.getCurrentState() !== AsyncRefOperationCreationState.NotDesigning,
                    operationId: AsyncRefDesignStoreInstance.getOperationId(),
                    generatedRef: this.props.simplifiedMode ? null : AsyncRefDesignStoreInstance.getGeneratedRef(),
                    ontoRef: AsyncRefDesignStoreInstance.getOntoRef(),
                    generatedRefError: AsyncRefDesignStoreInstance.getGeneratedRefError(),
                    generatedRefWarning: AsyncRefDesignStoreInstance.getGeneratedRefWarning(),
                    showProgress: this._showProgressBasedOnCreationState(),
                    title: AsyncRefDesignStoreInstance.title,
                    subTitle: AsyncRefDesignStoreInstance.subTitle,
                    createText: AsyncRefDesignStoreInstance.createText,
                    operationType: AsyncRefDesignStoreInstance.operationType,
                },
                () => {
                    if (AsyncRefDesignStoreInstance.getCurrentState() === AsyncRefOperationCreationState.Started) {
                        asyncGitOperationRealtimeNotificationReceived.addListener(payload => {
                            if (AsyncRefDesignStoreInstance.getOperationId() === payload.operationId) {
                                this._receivedRealtimeEvent = true;
                            }
                        });
                    }
                });
        }
    }

    private _showProgressBasedOnCreationState() {
        const state = AsyncRefDesignStoreInstance.getCurrentState();
        return state === AsyncRefOperationCreationState.Started ||
            state === AsyncRefOperationCreationState.Starting;
    }

    private _updateProgressStateFromStore = () => {
        const updatedProgress = Progress.getProgressForOperation(AsyncRefDesignStoreInstance.getOperationId());
        if (this.state.progressState !== updatedProgress && this._showProgressBasedOnCreationState()) {
            this.setState({
                progressState: updatedProgress,
                showProgress: true,
            } as IControllerViewState);
        }
    }

    private _ontoRefChanged = (ontoRef: VCSpecs.IGitRefVersionSpec) => {
        AsyncRefOperationActionCreator.ActionCreator.setAsyncRefOperationOntoRef(ontoRef);
    }

    private _generatedRefChanged = (generatedRef: VCSpecs.IGitRefVersionSpec) => {
        AsyncRefOperationActionCreator.ActionCreator.setAsyncRefOperationGeneratedRef(generatedRef);
    }

    private _onDoOperation = () => {
        const source = this.props.pullRequest ?
            {
                pullRequestId: this.props.pullRequest.pullRequestId,
            } as VCContracts.GitAsyncRefOperationSource :
            {
                commitList: [{ commitId: this.props.commitId.full } as VCContracts.GitCommitRef],
            } as VCContracts.GitAsyncRefOperationSource;

        AsyncRefOperationActionCreator.ActionCreator.startOperation(
            this.props.repositoryContext as GitRepositoryContext,
            this.state.ontoRef,
            this.state.generatedRef,
            source,
            this.props.pullRequest ? this.props.pullRequest.sourceFriendlyName : this.props.commitId.short,
            this.state.operationType);
    }

    private _createPullRequest = () => {

        AsyncRefOperationActionCreator.ActionCreator.createNewPullRequest(
            this.props.repositoryContext as GitRepositoryContext,
            this.state.generatedRef.toFriendlyName(),
            this.state.ontoRef.toFriendlyName(),
            this._getPullRequestTitle(this.state.operationType),
            this._getPullRequestDescription(this.state.operationType),
        );

        this._collectTelemetryAndClose(true);
    }

    private _collectTelemetryAndClose(createPullRequest?: boolean) {

        const event = new Telemetry.TelemetryEventData(
            this.props.ciArea || CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            (this.state.operationType === AsyncRefOperationType.CherryPick) ? CustomerIntelligenceConstants.CHERRYPICK : CustomerIntelligenceConstants.REVERT,
            {
                ChangedGeneratedBranchName: !AsyncRefDesignStoreInstance.generatedRefIsDefaultName(),
                DialogOpenUntilCompleted: this.state.progressState.isComplete || this.state.progressState.isError,
                RealtimeNotificationsReceived: this._receivedRealtimeEvent,
                CreatePullRequest: createPullRequest,
                SimplifiedMode: this.props.simplifiedMode,
            });
        // Need to force immediate because one pathway redirects the browser after this function finishes
        Telemetry.publishEvent(event, true);

    }

    private _getPullRequestTitle = (operationType: AsyncRefOperationType): string => {

        if (operationType === AsyncRefOperationType.CherryPick) {
            if (this.props.pullRequest) {
                return this.props.pullRequest.title;
            }
            else {
                const firstCommentLine: string = this.props.comment ? this.props.comment.split("\n")[0] : null;
                return firstCommentLine ? firstCommentLine :
                    Utils_String.format(VCResources.CherryPick_CommitTitleFormat, this.props.commitId.short);
            }
        }
        else if (operationType === AsyncRefOperationType.Revert) {
            return this.props.pullRequest ?
                Utils_String.format(VCResources.Revert_PullRequestTitleFormat, this.props.pullRequest.title) :
                Utils_String.format(VCResources.RevertDialog_Title_Commit, this.props.commitId.short);
        }
        else {
            throw new Error("no supported operation type");
        }

    }

    private _getPullRequestDescription = (operationType: AsyncRefOperationType): string => {

        if (operationType === AsyncRefOperationType.CherryPick) {
            if (this.props.pullRequest) {
                let prAppendText = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsMentions, false) ? 
                    Utils_String.format(VCResources.CherryPick_PullRequestDescriptionAppendMentionFormat, "!" + this.props.pullRequest.pullRequestId) :
                    Utils_String.format(VCResources.CherryPick_PullRequestDescriptionAppendFormat, this.props.pullRequest.pullRequestId);
                    
                return (this.props.pullRequest.description ? this.props.pullRequest.description + "\n\n" : "") + prAppendText;
            }
            else {
                const firstCommentLine: string = this.props.comment ? this.props.comment.split("\n")[0] : null;
                // Use the first line of the original commit comment
                return (firstCommentLine ? firstCommentLine + "\n\n" : "") +
                    Utils_String.format(VCResources.CherryPick_CommitDescriptionAppendFormat, this.props.commitId.short);
            }
        }
        else if (operationType === AsyncRefOperationType.Revert) {
            if(this.props.pullRequest) {
                let prAppendText = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsMentions, false) ? 
                    Utils_String.format(VCResources.Revert_PullRequestDescriptionAppendMentionFormat, "!" + this.props.pullRequest.pullRequestId) :
                    Utils_String.format(VCResources.Revert_PullRequestTitleFormat, this.props.pullRequest.title);
                return prAppendText;
            }
            else {
                return Utils_String.format(VCResources.RevertDialog_Title_Commit, this.props.commitId.short);
            }
        }
        else {
            throw new Error("no supported operation type");
        }
    }
}

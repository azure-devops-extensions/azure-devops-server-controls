/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { ProgressIndicatorStore } from "PipelineWorkflow/Scripts/Common/Stores/ProgressIndicatorStore";
import { PipelineRelease, PipelineDefinition, PipelineDefinitionEnvironment } from "PipelineWorkflow/Scripts/Common/Types";
import { IDeploymentTriggerSelectedPayload } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseActions";
import * as ActionsCreator from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseActionsCreator";
import { ReleaseDialogContentComponent } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/ReleaseDialogContentComponent";
import * as Store from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { PrimaryButton, DefaultButton, CommandButton } from "OfficeFabric/Button";
import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import { css } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/SharedComponents/CreateRelease/ReleaseDialog";

export interface ICreateReleaseDialogProps extends Base.IProps {
    showDialog: boolean;
    definitionId: number;
    definitionName?: string;
    onQueueRelease?: (pipelineRelease: PipelineRelease) => void;
    onCloseDialog?: () => void;
    releaseDialogStore: Store.CreateReleaseStore<PipelineDefinition, PipelineDefinitionEnvironment>;
    releaseDialogActionCreator: ActionsCreator.CreateReleaseActionsCreator<PipelineDefinition, PipelineDefinitionEnvironment>;
    instanceId: string;
}

export class CreateReleaseDialog extends Base.Component<ICreateReleaseDialogProps, Store.IReleaseDialogState<PipelineDefinition>> {

    constructor(props: ICreateReleaseDialogProps) {
        super(props);
        this._initialize();
    }

    public componentWillMount() {
        this._progressStore = StoreManager.GetStore<ProgressIndicatorStore>(ProgressIndicatorStore, this._instanceId);

        this.setState(this._store.getState());

        this._store.addChangedListener(this._handleStoreChange);
        this._progressStore.addChangedListener(this._handleStoreChange);
    }

    public componentWillUnmount() {
        this._progressStore.removeChangedListener(this._handleStoreChange);
        this._store.removeChangedListener(this._handleStoreChange);

        ActionCreatorManager.DeleteActionCreator<ActionsCreator.CreateReleaseActionsCreator<PipelineDefinition, PipelineDefinitionEnvironment>>(ActionsCreator.CreateReleaseActionsCreator, this._instanceId);

        StoreManager.DeleteStore<Store.CreateReleaseStore<PipelineDefinition, PipelineDefinitionEnvironment>>(Store.CreateReleaseStore, this._instanceId);
        StoreManager.DeleteStore<ProgressIndicatorStore>(ProgressIndicatorStore, this._instanceId);
    }

    public render(): JSX.Element {
        let isQueueButtonDisabled: boolean = !this.state.canQueue || this._progressStore.hasAnyActionsInProgress();

        return (
            this.state.showDialog ?
                <Dialog
                    dialogContentProps={{
                        type: DialogType.close,
                        className: css("create-release-content", "dialog-fabric-content-subtext-overrides"),
                        subText: this._getDefinitionName()
                    }}
                    modalProps={{
                        className: css("create-release-dialog", "dialog-fabric-style-overrides"),
                        containerClassName: css("create-release-container", "dialog-fabric-container-titletext-overrides"),
                        isBlocking: true
                    }}
                    title={Resources.CreateNewReleaseText}
                    hidden={!this.state.showDialog}
                    onDismiss={() => { this._onCloseDialog(); }}
                    closeButtonAriaLabel={Resources.CloseText} >

                    {
                        !!this.state.errorMessage &&
                        <MessageBar
                            className="release-dialog-message-bar"
                            onDismiss={this._onErrorBarDismiss}
                            messageBarType={MessageBarType.error}
                            dismissButtonAriaLabel={Resources.CloseText}>
                            {this.state.errorMessage}
                        </MessageBar>
                    }

                    {
                        <ReleaseDialogContentComponent
                            instanceId={this._instanceId}
                            {...this.state}
                            descriptionCssClass="create-release-description"
                            pivotItemCssClass={css("create-release-pivot-data", "details-list-header-fabric-style-overrides")}
                            pivotCssClass={css("create-release-pivot", "pivot-fabric-style-overrides")}
                            onDescriptionChange={this._setReleaseDescription}
                            onArtifactSelectedVersionChange={this._onArtifactSelectedVersionChange}
                            onEnvironmentTriggerSelectionChange={this._onDeploymentTriggerOptionChange} />
                    }

                    <DialogFooter>
                        <PrimaryButton
                            onClick={() => { this._onQueueRelease(); }}
                            disabled={isQueueButtonDisabled}
                            ariaLabel={DTCResources.QueueLabel}
                            aria-disabled={isQueueButtonDisabled}>
                            {DTCResources.QueueLabel}
                        </PrimaryButton>
                        <DefaultButton
                            onClick={() => { this._onCloseDialog(); }}
                            ariaLabel={Resources.CancelText}>
                            {Resources.CancelText}
                        </DefaultButton>
                    </DialogFooter>

                </Dialog> : null
        );
    }

    private _onDeploymentTriggerOptionChange(environmentId: number, selectedTriggerKey: number): void {
        let payload = {
            environmentId: environmentId,
            selectedTriggerOptionKey: selectedTriggerKey
        } as IDeploymentTriggerSelectedPayload;

        this._actionsCreator.updateSelectedDeploymentTrigger(payload);
    }

    private _handleStoreChange = (): void => {
        this.setState(this._store.getState());
    }

    private _onCloseDialog(): void {
        if (this.props.onCloseDialog) {
            this.props.onCloseDialog();
        }
    }

    private _onQueueRelease(): void {
        this._actionsCreator.createRelease(this.props.onQueueRelease, this.state, null, false);

        this._publishQueueReleaseTelemetry();
    }

    private _publishQueueReleaseTelemetry() {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.CanQueueRelease] = this.state.canQueue;

        Telemetry.instance().publishEvent(Feature.QueueRelease, eventProperties);
    }

    private _onErrorBarDismiss = (): void => {
        this._actionsCreator.updateErrorMessage(Utils_String.empty);
    }

    private _setReleaseDescription = (newDescriptionValue: string): void => {
        this._actionsCreator.updateDescription(newDescriptionValue);
    }

    private _onArtifactSelectedVersionChange = (artifactIndex: number, newSelectedVersion: string): void => {
        this._actionsCreator.updateArtifactSelectedVersion(artifactIndex, newSelectedVersion);
    }

    private _getDefinitionName(): string {
        // If definition name is available take it, otherwise take it from input to the dialog input.
        return !!this.state.data ? this.state.data.name : this.props.definitionName || Utils_String.empty;
    }

    private _initialize(): void {
        this._instanceId = this.props.instanceId;
        this._onDeploymentTriggerOptionChange = this._onDeploymentTriggerOptionChange.bind(this);

        this._store = this.props.releaseDialogStore;
        this._actionsCreator = this.props.releaseDialogActionCreator;
        this._progressStore = StoreManager.GetStore<ProgressIndicatorStore>(ProgressIndicatorStore, this._instanceId);
    }

    private _actionsCreator: ActionsCreator.CreateReleaseActionsCreator<PipelineDefinition, PipelineDefinitionEnvironment>;
    private _store: Store.CreateReleaseStore<PipelineDefinition, PipelineDefinitionEnvironment>;
    private _progressStore: ProgressIndicatorStore;
    private _instanceId: string;
}
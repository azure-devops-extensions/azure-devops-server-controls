/// <reference types="react" />

import * as React from "react";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { OverlayPanelHeading } from "DistributedTaskControls/Components/OverlayPanelHeading";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { IInfoProps } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";

import { ArtifactTriggerCondition } from "PipelineWorkflow/Scripts/SharedComponents/ArtifactTriggerCondition/ArtifactTriggerCondition";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ArtifactStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactStore";
import { ArtifactTriggerStore, IArtifactTriggerViewState } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTriggerStore";
import { ArtifactTriggerActionsCreator } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTriggerActionsCreator";
import { ArtifactTriggerStrings } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTriggerStrings";
import { ArtifactTriggerUtils } from "PipelineWorkflow/Scripts/Editor/Common/ArtifactTriggerUtils";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";

import * as Utils_String from "VSS/Utils/String";

import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Toggle } from "OfficeFabric/Toggle";
import { css } from "OfficeFabric/Utilities";
import { CommandButton } from "OfficeFabric/Button";
import { PipelineArtifactTypes } from "PipelineWorkflow/Scripts/Common/Types";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTriggerView";
import { PullRequestTriggerView } from "PipelineWorkflow/Scripts/Editor/Artifact/PullRequestTriggerView";

/**
 * View containing artifact trigger view
 */
export class ArtifactTriggerView extends ComponentBase.Component<ComponentBase.IProps, IArtifactTriggerViewState> {

    public componentWillMount() {
        this._store = StoreManager.GetStore<ArtifactTriggerStore>(ArtifactTriggerStore, this.props.instanceId);
        this._artifactStore = StoreManager.GetStore<ArtifactStore>(ArtifactStore, this.props.instanceId);
        this._actionCreator = ActionCreatorManager.GetActionCreator<ArtifactTriggerActionsCreator>(ArtifactTriggerActionsCreator, this.props.instanceId);
        this.setState(this._store.getState());
    }

    public componentDidMount() {
        this._store.addChangedListener(this._onChanged);
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onChanged);
    }

    public render(): JSX.Element {
        const ariaLabelIdForCDTrigger = "overlay-panel-heading-label-" + DtcUtils.getUniqueInstanceId();
        let descriptionForCDTrigger = Utils_String.format(ArtifactTriggerStrings.getTriggerDescription(this._artifactStore.getState().type), this._artifactStore.getState().alias);


        return (
            <div className="triggers-container">
                <div className="artifact-trigger-view-container" data-first-focus-element={true}>
                    <div className="artifact-trigger-heading-container">
                        <OverlayPanelHeading label={Resources.CDTrigger} labelId={ariaLabelIdForCDTrigger}
                            description={descriptionForCDTrigger} />
                    </div>

                    <Toggle
                        checked={this.state.isToggleEnabled}
                        onText={Resources.EnabledText}
                        offText={Resources.DisabledText}
                        onChanged={this._handleToggleChange}
                        aria-labelledby={ariaLabelIdForCDTrigger} />

                    {this.state.isToggleEnabled && ArtifactTriggerUtils.supportsTriggerWithConditions(this._artifactStore.getState().type) === true ?
                        <div className="artifact-trigger-condition-container">
                            <ArtifactTriggerCondition instanceId={this._store.getInstanceId()} artifactStoreInstanceId={this._artifactStore.getInstanceId()} />
                            {this._artifactStore.getState().type === PipelineArtifactTypes.Build && this._store.hasTagsInTriggerConditions() &&
                                <div className="artifact-trigger-options-container">
                                    <div className="artifact-trigger-options-header">
                                        {Resources.ArtifactTriggerAdditionalOptionsHeader}
                                    </div>
                                    <div className="artifact-trigger-options">
                                        <BooleanInputComponent
                                            value={this.state.createReleaseOnBuildTagging}
                                            label={Resources.ArtifactTriggerCreateReleaseOnBuildTaggingCheckboxLabel}
                                            ariaLabel={Resources.ArtifactTriggerCreateReleaseOnBuildTaggingCheckboxLabel}
                                            ariaDescription={Resources.ArtifactTriggerCreateReleaseOnBuildTaggingCheckboxLabel}
                                            onValueChanged={this._onCreateReleaseOnBuildTaggingCheckboxToggle}
                                        />
                                        <InfoButton isIconFocusable={true} calloutContent={
                                            {
                                                calloutMarkdown: Resources.ArtifactTriggerAdditionalOptionsHelpText
                                            } as ICalloutContentProps}
                                        />
                                    </div>
                                </div>
                            }
                        </div> :
                        <MessageBar
                            className="artifact-trigger-disabled-message"
                            messageBarType={MessageBarType.info}>
                            {ArtifactTriggerStrings.getTriggerDisabledMessage(this._artifactStore.getState().type, this._artifactStore.getArtifactTriggerConfiguration())}
                        </MessageBar>
                    }
                </div>
                {
                    FeatureFlagUtils.isPullRequestTriggersEnabled() &&
                    ArtifactTriggerUtils.isPullRequestTriggerSupported(this._artifactStore.getState().type) &&
                    <PullRequestTriggerView instanceId={this.props.instanceId} />
                }
            </div>
        );
    }

    private _onChanged = () => {
        this.setState(this._store.getState());
    }

    private _onCreateReleaseOnBuildTaggingCheckboxToggle = (checkedState: boolean): void => {
        //Raise an action to update the checkbox toggle state
        this._actionCreator.updateCreateReleaseOnBuildTagging(checkedState);
    }

    private _handleToggleChange = (checked: boolean) => {
        //Raise an action to change the toggle state
        this._actionCreator.toggleChanged(checked);
    }

    private _artifactStore: ArtifactStore;
    private _actionCreator: ArtifactTriggerActionsCreator;
    private _store: ArtifactTriggerStore;
}
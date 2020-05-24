// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { IRadioInputControlProp, RadioInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/RadioInputComponent";
import { AccordionCustomRenderer, IAccordionCustomRendererInstanceProps } from "DistributedTaskControls/SharedControls/Accordion/AccordionCustomRenderer";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { ChoiceGroup, IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { TextField } from "OfficeFabric/TextField";

import { QueueSettingsStore, ParallelDeploymentOptions, DeployOptions } from "PipelineWorkflow/Scripts/Editor/Environment/QueueSettingsStore";
import { QueueSettingsViewStore, IQueueSettingsViewState } from "PipelineWorkflow/Scripts/Editor/Environment/QueueSettingsViewStore";
import { QueueSettingsActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/QueueSettingsActionCreator";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { PreDeploymentConditionsViewComponents } from "PipelineWorkflow/Scripts/Shared/Constants";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Environment/QueueSettingsComponent";

/**
 * Queue settings view related to an environment
 */
export class QueueSettingsComponent extends ComponentBase.Component<IAccordionCustomRendererInstanceProps, IQueueSettingsViewState> {

    constructor(props: IAccordionCustomRendererInstanceProps) {
        super(props);
        this._actionCreator = ActionCreatorManager.GetActionCreator<QueueSettingsActionCreator>(QueueSettingsActionCreator, this.props.instanceId);
        this._store = StoreManager.GetStore<QueueSettingsViewStore>(QueueSettingsViewStore, this.props.instanceId);
    }

    public componentWillMount(): void {
        this._store.addChangedListener(this._onChange);
        this.setState(this._store.getState());
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onChange);
    }

    public componentWillReceiveProps(props: IAccordionCustomRendererInstanceProps): void {
        if (this._accordianElement) {
            this._accordianElement.showContent(props.expanded);
        }
    }

    public render(): JSX.Element {
        return (
            <AccordionCustomRenderer
                ref={this._resolveRef("_accordianElement")}
                onHeaderClick={this._onHeaderClick}
                label={Resources.QueueSettingsAccordionHeading}
                initiallyExpanded={false}
                headingLevel={2}
                addSeparator={true}
                description={Resources.QueueSettingsAccordionDescription}
                bowtieIconName="bowtie-build-queue"
                showErrorDelegate={this._showErrorOnAccordion}>
                <div className="environment-queue-settings-container">
                    {this._getQueueSettingsWarningSection()}
                    <div className="parallel-deployment-container fabric-style-overrides">
                        <RadioInputComponent
                            label={Resources.NoOfParallelDeployementLabel}
                            options={this._getParallelDeploymentOptions()}
                            onValueChanged={(option: IChoiceGroupOption) => { this._onParallelDeploymentsRadioButtonChanged(option.key.toString()); }}
                            infoProps={{
                                calloutContentProps: {
                                    calloutDescription: Resources.ParallelDeploymentTypeCalloutText
                                }
                            }} />
                    </div>
                    {
                        this.state.showDeployOptions ?
                            <div className="multiple-releases-options-container">
                                <div className="parallel-releases-count-container">
                                    <TextField
                                        label={Resources.ParallelDeploymentCountLabel}
                                        value={this.state.parallelDeploymentCount.toString()}
                                        onChanged={this._onParallelDeploymentCountChanged}
                                        onGetErrorMessage={(value: string) => { return this._getErrorMessage(value); }}
                                        ariaLabel={Resources.ParallelDeploymentCountLabel}
                                    />
                                </div>
                                <div className="environment-deploy-options fabric-style-overrides">
                                    <ChoiceGroup
                                        label={Resources.DeployOptionsLabel}
                                        options={this._getDeployOptions()}
                                        onChange={this._onDeployOptionRadioButtonChanged} />
                                </div>
                            </div>
                            : null
                    }
                </div>
            </AccordionCustomRenderer>);
    }

    private _getParallelDeploymentOptions(): IChoiceGroupOption[] {
        let parallelDeploymentOptions: IChoiceGroupOption[] = [];

        parallelDeploymentOptions.push({
            key: ParallelDeploymentOptions.DefiniteParallelDeployments,
            text: Resources.SpecificParallelDeploymentLabel,
            checked: this.state.parallelDeploymentType === ParallelDeploymentOptions.DefiniteParallelDeployments
        } as IChoiceGroupOption);

        parallelDeploymentOptions.push({
            key: ParallelDeploymentOptions.UnlimitedDeployment,
            text: Resources.UnlimitedParallelDeploymentLabel,
            checked: this.state.parallelDeploymentType === ParallelDeploymentOptions.UnlimitedDeployment
        } as IChoiceGroupOption);

        return parallelDeploymentOptions;
    }

    private _getDeployOptions(): IChoiceGroupOption[] {
        let deployOptions: IChoiceGroupOption[] = [];

        deployOptions.push({
            key: DeployOptions.DeployInSequence,
            text: Resources.DeployInSequenceText,
            checked: this.state.deployOption === DeployOptions.DeployInSequence
        } as IChoiceGroupOption);

        deployOptions.push({
            key: DeployOptions.DeployOnLatest,
            text: Resources.DeployOnLatestText,
            checked: this.state.deployOption === DeployOptions.DeployOnLatest
        } as IChoiceGroupOption);

        return deployOptions;
    }

    private _onParallelDeploymentsRadioButtonChanged = (parallelDeploymentType: string): void => {
        if (parallelDeploymentType) {
            this._actionCreator.updateParallelDeploymentType(parallelDeploymentType);
        }
    }

    private _onDeployOptionRadioButtonChanged = (evt?: React.SyntheticEvent<HTMLInputElement>, selectedOption?: IChoiceGroupOption): void => {
        if (selectedOption) {
            this._actionCreator.updateDeployOptions(selectedOption.key);
        }
    }

    private _onParallelDeploymentCountChanged = (value: string): void => {
        this._actionCreator.updateParallelDeploymentCount(value);
    }

    private _onNotifyValidation(value: string) {
        this._actionCreator.updateParallelDeploymentCount(value);
    }

    private _getErrorMessage(value: string): string {
        let errorMessage: string = Utils_String.empty;
        let isValid: boolean = QueueSettingsStore.isParallelDeploymentCountValid(this.state.parallelDeploymentType, value);
        if (!isValid) {
            errorMessage = Resources.ConcurrentDeploymentCountError;
        }
        return errorMessage;
    }

    private _onChange = () => {
        this.setState(this._store.getState());
    }

    private _showErrorOnAccordion = (): boolean => {
        let showError: boolean = !this._store.isValid();
        return showError;
    }

    private _onHeaderClick = (isExpanded: boolean): void => {
        if (this.props.onHeaderClick) {
            this.props.onHeaderClick(PreDeploymentConditionsViewComponents.QueueSettingsView, isExpanded);
        }
    }

    private _getQueueSettingsWarningSection(): JSX.Element {
        if (this.state.showSettingsChangedWarning) {
            return (
                <MessageBar
                    messageBarType={MessageBarType.warning}
                    onDismiss={this._onDismissWarning}
                    className={"queue-settings-warning-bar"}
                    dismissButtonAriaLabel={DTCResources.ARIALabelDismissWarningMessage}>
                    {Resources.EnvironmentExecutionPolicyChangedWarningText}
                </MessageBar>
            );
        }

        return null;
    }

    private _onDismissWarning = (): void => {
        let state = this._store.getState();
        state.showSettingsChangedWarning = false;
        this.setState(state);
    }

    private _actionCreator: QueueSettingsActionCreator;
    private _store: QueueSettingsViewStore;
    private _accordianElement: AccordionCustomRenderer;

}

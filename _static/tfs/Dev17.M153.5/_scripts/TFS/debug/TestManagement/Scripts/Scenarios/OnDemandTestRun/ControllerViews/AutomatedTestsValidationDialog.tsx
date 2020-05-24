/// <reference types="react" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Dialog } from "OfficeFabric/Dialog";
import { DialogType, IDialogContentProps } from "OfficeFabric/components/Dialog/DialogContent.types";
import { DialogFooter } from "OfficeFabric/components/Dialog/DialogFooter";
import { IModalProps } from "OfficeFabric/Modal";
import { Link } from "OfficeFabric/Link";

import { IAutomatedTestsValidationState, AutomatedTestsValidationStore } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Stores/AutomatedTestsValidationStore";
import { HelpUrls } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Constants";
import { AutomatedTestRunActionsCreator } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Actions/AutomatedTestRunActionsCreator";
import * as TestValidationBlock from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Components/TestValidationBlock";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";

import * as Utils_String  from "VSS/Utils/String";
import * as Url from "VSS/Utils/Url";
import * as ComponentBase from "VSS/Flux/Component";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/OnDemandTestRun/ControllerViews/AutomatedTestsValidationDialog";

export interface IAutomatedTestsValidationProps extends ComponentBase.Props {
    onCloseDialog?: () => void;
    onOkClick?: () => void;
    selectedPlanName: string;
    actionsCreator?: AutomatedTestRunActionsCreator;
    store?: AutomatedTestsValidationStore;
}

export function renderDialog(element: HTMLElement, automatedTestValidationProps: IAutomatedTestsValidationProps): void {
    ReactDOM.render(<AutomatedTestValidationDialog { ...automatedTestValidationProps } />, element);
}

export function unmountDialog(element: HTMLElement): void {
    ReactDOM.unmountComponentAtNode(element);
}

export class AutomatedTestValidationDialog extends ComponentBase.Component<IAutomatedTestsValidationProps, IAutomatedTestsValidationState> {

    public componentWillMount(): void {
        this._handleStoreChange();
        this.props.store.addChangedListener(this._handleStoreChange);
    }

    public componentWillUnmount(): void {
        this.props.store.removeChangedListener(this._handleStoreChange);
    }

    public render(): JSX.Element {
        const dialogcontentProps: IDialogContentProps = {
            title: Utils_String.format(Resources.AutomatedTestRunValidationDialogTitle, this.props.selectedPlanName),
            className: "automated-test-run-validation-dialog-content",
            closeButtonAriaLabel: Resources.CloseText,
            type: DialogType.close,
            showCloseButton: true
        };
        const modalProps: IModalProps = {
            className: "automated-test-run-validation-dialog bowtie-fabric",
            containerClassName: "automated-test-run-validation-dialog-container",
            isBlocking: true
        };
        return (
            <Dialog
                dialogContentProps={dialogcontentProps}
                modalProps={modalProps}
                onDismiss={this._onCancelClick}
                hidden={false}>

                <TestValidationBlock.Component
                    progressStatus={this.state.automatedTestsDiscoverStatus}
                    validationText={Resources.IdentifyAutomatedTestsText}
                    subStatus={
                        <span>
                            {this.state.automatedTestsDiscoveredText}
                        </span>
                    }/>

                <TestValidationBlock.Component
                    progressStatus={this.state.releaseEnvironmentTestRunCapabilitiesCheckStatus}
                    validationText={Resources.ValidatingStageText}
                    subStatus = {
                        this.state.environmentValidationCompletedText ?
                        <span>
                            { this.state.environmentValidationCompletedText } &nbsp;
                            <Link
                                href={HelpUrls.learnMoreUrl}
                                target="_blank"
                                rel="noreferrer noopener">
                                {Resources.LearnMoreText}
                            </Link>
                        </span> :
                        null }
                />

                <TestValidationBlock.Component
                    progressStatus={this.state.triggeringReleaseStatus}
                    validationText={Resources.TriggeringTestRunText}
                    subStatus={this.state.triggeringReleaseStatus === TestValidationBlock.ProgressType.Failed &&
                        <span>
                            {this.state.releaseErrorMessage}
                        </span>
                    }/>
                <DialogFooter>
                    <DefaultButton
                        onClick={this._onCancelClick}>
                        {Resources.CloseText}
                    </DefaultButton>
                    <PrimaryButton
                        disabled={!this.state.viewProgressEnabled}
                        onClick={this._onViewProgressClick}>
                        {Resources.ViewProgressText}
                    </PrimaryButton>
                </DialogFooter>
            </Dialog>
        );
    }

    private _handleStoreChange = (): void => {
        this.setState(this.props.store.getState());
    }

    private _onViewProgressClick = () => {
        if (Url.isSafeProtocol(this.state.releaseUrl || Utils_String.empty)) {
            open(this.state.testRunUrl, "_blank");
        }
        if (this.props.onOkClick) {
            this.props.onOkClick();
        }
        this._closeDialog();
        TelemetryService.publishEvents(TelemetryService.featureRunAutomatedTests, {
            "ButtonClicked" : "ViewProgress"
        });
    }

    private _onCancelClick = () => {
        this._closeDialog();
        TelemetryService.publishEvents(TelemetryService.featureRunAutomatedTests, {
            "ButtonClicked": "Cancel"
        });
    }

    private _closeDialog(): void {
        if (this.props.onCloseDialog) {
            this.props.onCloseDialog();
        }
        if (this.props.actionsCreator) {
            this.props.actionsCreator.closeDialog();
        }
    }
}

/// <reference types="react" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Checkbox } from "OfficeFabric/Checkbox";
import { CopyButton } from "VSSPreview/Flux/Components/CopyButton";
import { Dialog } from "OfficeFabric/Dialog";
import { DialogType, IDialogContentProps } from "OfficeFabric/components/Dialog/DialogContent.types";
import { DialogFooter } from "OfficeFabric/components/Dialog/DialogFooter";
import { IModalProps } from "OfficeFabric/Modal";
import { Link } from "OfficeFabric/Link";

import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import TCMLite = require("TestManagement/Scripts/TFS.TestManagement.Lite");

import * as ComponentBase from "VSS/Flux/Component";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/RunWithDTRDialog/Components/RunWithDTRDialog";
import { setCookie } from "Presentation/Scripts/TFS/TFS.Core.Utils";

let TelemetryService = TCMTelemetry.TelemetryService;

export interface IRunWithDTRDialogProps extends ComponentBase.Props {
    dtrCallBack: () => void;
}

export interface IRunWithDTRDialogState extends ComponentBase.State {
    showDialog: boolean;
}

export function renderDialog(element: HTMLElement, RunWithDTRDialogProps: IRunWithDTRDialogProps): void {
    ReactDOM.render(<RunWithDTRDialog {...RunWithDTRDialogProps} />, element);
}

export class RunWithDTRDialog extends ComponentBase.Component<IRunWithDTRDialogProps, IRunWithDTRDialogState> {
    private _testRunnerDownloadLink: string;
    private _learnMoreLink: string;
    private _checkboxChecked: boolean;

    constructor(props: IRunWithDTRDialogProps) {
        super(props);
        this._checkboxChecked = false;
        this.state = { showDialog: true } as IRunWithDTRDialogState;
    }

    public render(): JSX.Element {
        this._testRunnerDownloadLink = "https://aka.ms/ATPTestRunnerDownload";
        this._learnMoreLink = "https://aka.ms/ATPTestRunnerLearnMore";

        const launchButtonClassName = "run-with-dtr-dialog-launch-btn";
        let dialogcontentProps: IDialogContentProps = {
            title: Resources.RunTestWithDTRText,
            className: "run-with-dtr-dialog-content",
            closeButtonAriaLabel: Resources.CloseText,
            type: DialogType.close,
            showCloseButton: true
        };
        let modalProps: IModalProps = {
            className: "run-with-dtr-dialog bowtie-fabric",
            containerClassName: "run-with-dtr-dialog-container",
            isBlocking: true
        };

        return (
            <Dialog
                dialogContentProps={dialogcontentProps}
                modalProps={modalProps}
                hidden={!this.state.showDialog}
                onDismiss={this._onCancelClick}
                firstFocusableSelector={launchButtonClassName}>
                <div className="run-with-dtr-dialog-info-section">
                    {Resources.TestRunnerDialogInstallationInfoText}
                    <Link
                        href={this._learnMoreLink}
                        target={"_blank"}
                        className="run-with-dtr-dialog-info-link">
                        {Resources.LearnMoreText}
                    </Link>
                </div>
                <div className="run-with-dtr-dialog-acq-section" >
                    <PrimaryButton
                        className="run-with-dtr-dialog-download-dialog"
                        text={Resources.Download}
                        onClick={this._onDownloadDTRClick}
                    />
                    <div className="run-with-dtr-dialog-acq-section-separator" >
                        |
                    </div>
                    <CopyButton
                        cssClass="run-with-dtr-dialog-acq-link-container"
                        copyTitle={Resources.TestRunnerLinkCopytoClipboardTooltip}
                        copiedTitle={Resources.TestRunnerLinkCopiedtoClipboardTooltip}
                        copyText={this._testRunnerDownloadLink}
                        copyAsHtml={false} />
                </div>
                <div className="run-with-dtr-launch-info-container" >
                    {Resources.TestRunnerLaunchInstructionsText}
                </div>
                <Checkbox className="run-with-dtr-dialog-optout-checkbox"
                        defaultChecked={false}
                        onChange={this._onCheckBoxStateChanged.bind(this)}
                        label={Resources.TestRunnerDialogCheckboxText} />
                <DialogFooter className="run-with-dtr-dialog-footer">
                    <PrimaryButton
                        onClick={this._onOkClick}
                        text={Resources.LaunchText}
                        className={launchButtonClassName} />
                    <DefaultButton
                        onClick={this._onCancelClick}
                        text={Resources.CancelText} />
                </DialogFooter>
            </Dialog>
        );
    }

    private _onCheckBoxStateChanged = (ev: React.FormEvent<HTMLElement | HTMLInputElement>, checked: boolean = false) => {
        if (checked) {
            this._checkboxChecked = true;
        }
        else {
            this._checkboxChecked = false;
        }
    }

    private _onDownloadDTRClick = () => {
        TelemetryService.publishEvents(TelemetryService.featureRunWithTestRunnerATP_DownloadClicked, {});
        window.open(this._testRunnerDownloadLink, "_blank");
    }

    /**
     * Launch DTR here.
     */
    private _onOkClick = () => {
        this._setCookieState();
        TelemetryService.publishEvents(TelemetryService.featureRunWithTestRunnerATP_LaunchClicked, {"userAgent": window.navigator.userAgent});
        this.props.dtrCallBack();
        this._closeDialog();
    }

    private _onCancelClick = () => {
        this._closeDialog();
    }

    private _closeDialog(): void {
        this.setState({ showDialog: false });
    }

    /**
     * cookie used to check for not showing this dialog again.
     */
    private _setCookieState(): void {
        if (this._checkboxChecked) {
            setCookie(TCMLite.Constants.HideDTRLaunchDialogCookieName, "true");
        }
    }
}
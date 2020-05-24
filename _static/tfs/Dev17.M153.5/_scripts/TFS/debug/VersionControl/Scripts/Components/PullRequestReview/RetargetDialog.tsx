/// <reference types="react-dom" />

import * as React from "react";

import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { GitRefDropdownSwitch } from "VersionControl/Scenarios/Shared/GitRefDropdownSwitch";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as String_Utils from "VSS/Utils/String";
import { DelayedRender, css } from "OfficeFabric/Utilities";
import { AnimationClassNames } from "OfficeFabric/Styling";
import { Label } from "OfficeFabric/Label";
import { TelemetryEventData, publishEvent } from "VSS/Telemetry/Services";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import "VSS/LoaderPlugins/Css!VersionControl/RetargetDialog";

export interface IRetargetDialogProps {
    sourceRepositoryContext: GitRepositoryContext;
    targetRepositoryContext: GitRepositoryContext;
    sourceBranchRefName: string;
    currentTargetBranchRefName: string;
    onDismiss(): void;
    onRetarget(newTargetRefName: string): void;
    autoCompleteSet: boolean;
}

export interface IRetargetDialogState {
    retargetDisabled?: boolean;
    errorString?: string;
    newTarget?: GitBranchVersionSpec;
}

export class RetargetDialog extends React.PureComponent<IRetargetDialogProps, IRetargetDialogState> {
    constructor(props, state) {
        super(props, state);

        this.state = {
            retargetDisabled: true
        };
    }

    public render(): JSX.Element {

        return (
            <Dialog
                hidden={false}
                modalProps={{
                    className: "vc-pr-retarget-dialog",
                    containerClassName: "vc-pr-retarget-dialog-container vc-dialog",
                    isBlocking: true,
                }}
                dialogContentProps={{
                    type: DialogType.close
                }}
                onDismiss={this.props.onDismiss}
                title={VCResources.PullRequest_Retarget_Title}
                closeButtonAriaLabel={VCResources.Cancel}>
                    <div className={"vc-pr-target-dialog-content"}>
                        {this._content()}
                        {this._errorMessage()}
                    </div>
                    <DialogFooter>
                        <PrimaryButton disabled={this.state.retargetDisabled} onClick={this._onRetarget}>{VCResources.Change}</PrimaryButton>
                        <DefaultButton onClick={this.props.onDismiss}>{VCResources.Cancel}</DefaultButton>
                    </DialogFooter>
            </Dialog>
        );
    }

    private _content(): JSX.Element {
        return <>
            {this.props.autoCompleteSet && this._autoCompleteWarning()}
            <Label id={"target-selector-label"} >{VCResources.PullRequest_Retarget_TargetBranchLabel}</Label>
            <GitRefDropdownSwitch
                isDrodownFullWidth={true}
                className={"vc-pr-retarget-branch-selector"}
                repositoryContext={this.props.targetRepositoryContext}
                versionSpec={this.state.newTarget}
                onSelectionChanged={this._onBranchChanged}
                viewTagsPivot={false}
                ariaLabelledBy={"target-selector-label"}
            />
        </>;
    }

    private _autoCompleteWarning(): JSX.Element {
        return <MessageBar messageBarType={MessageBarType.warning}>{VCResources.PullRequest_Retarget_AutocompleteCancelWarning}</MessageBar>;
    }

    private _errorMessage(): JSX.Element {
        if(this.state.errorString) {
            return <div aria-live={'assertive'}> 
                <DelayedRender>
                    <span className={css("vc-pr-retarget-errormessage", AnimationClassNames.slideDownIn20)} data-automation-id='error-message'>
                        { this.state.errorString }
                    </span>
                </DelayedRender>
            </div>;
        }
        else {
            return null;
        }
    }

    private _onBranchChanged = (branchSpec: GitBranchVersionSpec) => {
        let retargetDisabled: boolean = false;
        let errorString: string = undefined;

        if(!branchSpec) {
            retargetDisabled = true;
        }
        else {
            if(String_Utils.equals(branchSpec.toFullName(), this.props.currentTargetBranchRefName)) {
                retargetDisabled = true;
                errorString = String_Utils.format(VCResources.PullRequest_Retarget_AlreadyTargetedError, branchSpec.toFriendlyName());
            }
            else if(this.props.sourceRepositoryContext.getRepositoryId() === this.props.targetRepositoryContext.getRepositoryId() &&
                    String_Utils.equals(branchSpec.toFullName(), this.props.sourceBranchRefName)) {
                retargetDisabled = true;
                errorString = VCResources.PullRequest_Retarget_SameAsSourceError;
            }
            else {
                retargetDisabled = false;
            }
        }

        this.setState({
            retargetDisabled,
            errorString,
            newTarget: branchSpec
        });
    }

    private _onRetarget = ()  => {
        if(this.state.newTarget) {
            let telemEvent = new TelemetryEventData(
                CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                CustomerIntelligenceConstants.PULL_REQUEST_RETARGET_FEATURE, {});
            publishEvent(telemEvent);

            this.props.onRetarget(this.state.newTarget.toFullName());
        }
        this.props.onDismiss();
    }
}
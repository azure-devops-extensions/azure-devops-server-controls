// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { RadioInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/RadioInputComponent";
import { InputControlUtils as ControlUtils } from "DistributedTaskControls/SharedControls/InputControls/Utilities";
import { DurationInputComponent, IDuration } from "DistributedTaskControls/SharedControls/InputControls/Components/DurationInputComponent";

import { IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { IGateListOptions, IGateListOptionsErrorMessages } from "PipelineWorkflow/Scripts/Editor/Environment/Types";

import { ApprovalExecutionOrder as PipelineApprovalExecutionOrder } from "ReleaseManagement/Core/Contracts";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Environment/GateListOptionsComponent";

export interface IGateListOptionsComponentProps extends ComponentBase.IProps, IGateListOptions, IGateListOptionsErrorMessages {
    onUpdateTimeout?: (newTime: IDuration) => void;
    onUpdateSamplingIntervalTime?: (newTime: IDuration) => void;
    onUpdateMinimumSuccessfulWindow?: (newTime: IDuration) => void;
    onApprovalExecutionOrderChange?: (approvalExecutionOrder: PipelineApprovalExecutionOrder) => void;
    hideApprovalExecutionOrderOption?: boolean;
}

export namespace ApprovalExecutionOrderChoiceKeys {
    export const ApprovalBeforeGatesKey: string = "approval-before-gates";
    export const ApprovalAfterGatesSuccessfulKey: string = "approval-after-gates-success";
    export const ApprovalAfterGatesKey: string = "approval-after-gates";
}

export class GateListOptionsComponent extends ComponentBase.Component<IGateListOptionsComponentProps, ComponentBase.IStateless> {
    public render(): JSX.Element {
        return (
            <div className="gate-list-options">
                {this._getSamplingIntervalTimeOptionControl()}
                {this._getMinimumSuccessDurationOptionControl()}
                {this._getTimeoutOptionControl()}
                {this.props.hideApprovalExecutionOrderOption === true || this._getApprovalExecutionOrderOptionControl()}
            </div>
        );
    }

    private _getTimeoutOptionControl(): JSX.Element {
        const label: string = Resources.GatesTimeoutLabel;
        const helpText: string = Resources.GatesTimeoutHelp;

        return (
            <DurationInputComponent
                cssClass="gate-list-timeout-time"
                value={this.props.timeout}
                onValueChanged={this._onUpdateTimeout}
                label={label}
                errorMessage={this.props.timeoutErrorMessage}
                infoProps={ControlUtils.getCalloutInfoProps(helpText)}
                showMinute={true}
                showHour={true}
                showDay={true}
                required={false}
                inputAriaDescription={helpText}
                inputAriaLabel={Resources.AriaLabelGatesTimeoutValue}
                unitAriaLabel={Resources.AriaLabelGatesTimeoutUnit} />
        );
    }

    private _getSamplingIntervalTimeOptionControl(): JSX.Element {
        const label: string = Resources.SamplingIntervalLabel;
        const helpText: string = Resources.SamplingIntervalHelp;

        return (
            <DurationInputComponent
                cssClass="gate-list-sampling-interval-time"
                value={this.props.samplingInterval}
                onValueChanged={this._onUpdateSamplingIntervalTime}
                label={label}
                errorMessage={this.props.samplingIntervalErrorMessage}
                infoProps={ControlUtils.getCalloutInfoProps(helpText)}
                showMinute={true}
                showHour={true}
                required={false}
                inputAriaDescription={helpText}
                inputAriaLabel={Resources.AriaLabelGatesSamplingIntervalTimeValue}
                unitAriaLabel={Resources.AriaLabelGatesSamplingIntervalTimeUnit} />
        );
    }

    private _getMinimumSuccessDurationOptionControl(): JSX.Element {
        const label: string = Resources.MinimumSuccessDurationLabel;
        const helpText: string = Resources.MinimumSuccessDurationHelp;

        return (
            <DurationInputComponent
                cssClass="gate-list-success-window-time"
                value={this.props.minimumSuccessDuration}
                onValueChanged={this.onUpdateMinimumSuccessfulWindow}
                label={label}
                errorMessage={this.props.minimumSuccessDurationErrorMessage}
                infoProps={ControlUtils.getCalloutInfoProps(helpText)}
                showMinute={true}
                showHour={true}
                required={false}
                inputAriaDescription={helpText}
                inputAriaLabel={Resources.AriaLabelMinimumSuccessDurationValue}
                unitAriaLabel={Resources.AriaLabelMinimumSuccessDurationUnit} />
        );
    }

    private _getApprovalExecutionOrderOptionControl(): JSX.Element {
        return (
            <RadioInputComponent
                cssClass="gate-list-approval-execution-order"
                showOptionsVertically={true}
                label={Resources.GatesOrderForExecutionOfApprovalLabel}
                options={this._getExecutionOrderChoiceOptions()}
                onValueChanged={this._onApprovalExecutionOrderChange}
                infoProps={ControlUtils.getCalloutInfoProps(Resources.GatesOrderForExecutionOfApprovalHelp)} />
        );
    }

    private _onUpdateTimeout = (newTime: IDuration): void => {
        if (this.props.onUpdateTimeout) {
            this.props.onUpdateTimeout(newTime);
        }
    }

    private _onUpdateSamplingIntervalTime = (newTime: IDuration): void => {
        if (this.props.onUpdateSamplingIntervalTime) {
            this.props.onUpdateSamplingIntervalTime(newTime);
        }
    }

    private _onApprovalExecutionOrderChange = (choice: IChoiceGroupOption): void => {
        if (this.props.onApprovalExecutionOrderChange) {
            this.props.onApprovalExecutionOrderChange(this._getApprovalExecutionOrderFromKey(choice.key));
        }
    }

    private onUpdateMinimumSuccessfulWindow = (newTime: IDuration): void => {
        if (this.props.onUpdateMinimumSuccessfulWindow) {
            this.props.onUpdateMinimumSuccessfulWindow(newTime);
        }
    }

    private _getExecutionOrderChoiceOptions(): IChoiceGroupOption[] {
        const selectedChoiceKey: string = this._getApprovalExecutionOrderKey(this.props.approvalExecutionOrder);
        const options: { key: string, text: string }[] = [
            {
                key: ApprovalExecutionOrderChoiceKeys.ApprovalBeforeGatesKey,
                text: Resources.ApprovalBeforeGates
            },
            {
                key: ApprovalExecutionOrderChoiceKeys.ApprovalAfterGatesSuccessfulKey,
                text: Resources.ApprovalsAfterSuccessfulGates
            },
            {
                key: ApprovalExecutionOrderChoiceKeys.ApprovalAfterGatesKey,
                text: Resources.ApprovalsAfterGates
            }];

        let triggerTabOptions: IChoiceGroupOption[] = [];
        for (const option of options) {
            const isOptionChecked: boolean = Utils_String.ignoreCaseComparer(selectedChoiceKey, option.key) === 0;
            triggerTabOptions.push({ ...option, checked: isOptionChecked } as IChoiceGroupOption);
        }

        return triggerTabOptions;
    }

    private _getApprovalExecutionOrderFromKey(key: string): PipelineApprovalExecutionOrder {
        const keyLowerCase: string = !key ? Utils_String.empty : key.toLocaleLowerCase();

        switch (keyLowerCase) {
            case ApprovalExecutionOrderChoiceKeys.ApprovalBeforeGatesKey:
                return PipelineApprovalExecutionOrder.BeforeGates;
            case ApprovalExecutionOrderChoiceKeys.ApprovalAfterGatesKey:
                return PipelineApprovalExecutionOrder.AfterGatesAlways;
            case ApprovalExecutionOrderChoiceKeys.ApprovalAfterGatesSuccessfulKey:
                return PipelineApprovalExecutionOrder.AfterSuccessfulGates;
        }

        return PipelineApprovalExecutionOrder.BeforeGates;
    }

    private _getApprovalExecutionOrderKey(approvalOrder: PipelineApprovalExecutionOrder): string {
        switch (approvalOrder) {
            case PipelineApprovalExecutionOrder.BeforeGates:
                return ApprovalExecutionOrderChoiceKeys.ApprovalBeforeGatesKey;
            case PipelineApprovalExecutionOrder.AfterGatesAlways:
                return ApprovalExecutionOrderChoiceKeys.ApprovalAfterGatesKey;
            case PipelineApprovalExecutionOrder.AfterSuccessfulGates:
                return ApprovalExecutionOrderChoiceKeys.ApprovalAfterGatesSuccessfulKey;
        }

        return ApprovalExecutionOrderChoiceKeys.ApprovalAfterGatesKey;
    }
}
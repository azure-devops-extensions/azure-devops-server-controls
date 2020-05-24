// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { PermissionIndicatorSource } from "DistributedTaskControls/Common/Telemetry";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { AccordionCustomRenderer } from "DistributedTaskControls/SharedControls/Accordion/AccordionCustomRenderer";
import { DropDownInputControl, IDropDownItem } from "DistributedTaskControls/SharedControls/InputControls/Components/DropDownInputComponent";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { InputControlUtils as ControlUtils } from "DistributedTaskControls/SharedControls/InputControls/Utilities";
import * as DtcResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { Collapsible, ICollapsibleProps } from "DistributedTaskControls/SharedControls/Collapsible/Collapsible";
import { DurationInputComponent, IDuration } from "DistributedTaskControls/SharedControls/InputControls/Components/DurationInputComponent";

import { EnvironmentGatesViewStore, IEnvironmentGatesViewState } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentGatesViewStore";
import { GatesActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/GatesActionCreator";
import { GatesStore, IGatesState } from "PipelineWorkflow/Scripts/Editor/Environment/GatesStore";
import { GateListDetailsComponent } from "PipelineWorkflow/Scripts/Editor/Environment/GateListDetailsComponent";
import { IEnvironmentSubComponentProps } from "PipelineWorkflow/Scripts/Shared/Environment/Types";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { PermissionIndicator } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionIndicator";
import { ISecurityProps } from "PipelineWorkflow/Scripts/SharedComponents/Security/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";

import { css } from "OfficeFabric/Utilities";
import { IDropdownOption } from "OfficeFabric/Dropdown";
import { Toggle } from "OfficeFabric/Toggle";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Environment/EnvironmentGatesComponent";

export interface IEnvironmentDeploymentGatesComponentProps extends IEnvironmentSubComponentProps {
    expanded?: boolean;
}

export interface IEnvironmentGatesComponentProps extends IEnvironmentDeploymentGatesComponentProps {
    actionCreator: GatesActionCreator;
    store: EnvironmentGatesViewStore;
    label?: string;
    description?: string;
    helpLink?: string;
    componentName?: string;
}

export namespace EnvironmentGatesComponentConstants {
    export const DefaultHelpLink: string = "https://aka.ms/vsrmgates";
}

export class EnvironmentGatesComponent extends ComponentBase.Component<IEnvironmentGatesComponentProps, IEnvironmentGatesViewState> {
    constructor(props: IEnvironmentGatesComponentProps) {
        super(props);
        this._store = props.store;
        this._actionCreator = props.actionCreator;
        this._actionCreator.updateGateDefinitions();
    }

    public componentWillMount(): void {
        this._store.addChangedListener(this._onStoreChange);
        this._onStoreChange();
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoreChange);
    }

    public render(): JSX.Element {
        const securityProps: ISecurityProps = PermissionHelper.createEditApprovalsSecurityProps(this.props.releaseDefinitionFolderPath, this.props.releaseDefinitionId, this.props.environmentId);
        const overrideSecurityProps: ISecurityProps[] = PermissionHelper.createEditApprovalsOverrideSecurityProps(this.props.releaseDefinitionFolderPath, this.props.releaseDefinitionId, this.props.environmentId);

        const heading: string = this.props.label ? this.props.label : Resources.GatesCollapsibleHeadingText;
        const description: string = this.props.description ? this.props.description : Resources.GatesCollapsibleDescriptionText;
        const helpLink: string = this.props.helpLink || EnvironmentGatesComponentConstants.DefaultHelpLink;

        const zeroGatesClass: string = (this.state.gateItemList && this.state.gateItemList.length === 0) ? "gates-zero" : Utils_String.empty;
        const headerIcon: string = this._isGateInValid() ? "Error" : "ReleaseGate";
        const propsCss: string = this.props.cssClass ? this.props.cssClass : Utils_String.empty;

        return (
            <Collapsible
                cssClass={css("cd-environment-gates-collapsible", zeroGatesClass, propsCss)}
                label={heading}
                description={description}
                helpLink={helpLink}
                expanded={this.props.expanded}
                bowtieIconName={headerIcon}
                onRenderHeader={this._getSectionHeader}
                headingLevel={2}
                addSeparator={true}>

                <PermissionIndicator
                    securityProps={securityProps}
                    overridingSecurityProps={overrideSecurityProps}
                    message={Resources.EditEnvironmentGatesPermissionMessage}
                    hasContentBelow={true}
                    telemetrySource={PermissionIndicatorSource.pipelineTab}>

                    {(this.props.expanded && this.state.isEnabled) ? this._getGatesEnabledContent() : null}

                </PermissionIndicator>

            </Collapsible>
        );
    }

    private _isGateInValid(): boolean {
        return (this.state.isEnabled && !this.props.expanded && !this._store.isValid());
    }

    private _getSectionHeader = (props: ICollapsibleProps, defaultRender?: (props?: ICollapsibleProps) => JSX.Element | null): JSX.Element => {
        const { label } = props;
        const isExpanded: boolean = props.expanded;
        const chevronIcon: string = `chevron-${isExpanded ? "up" : "down"}-light`;
        const ariaLabel: string = isExpanded ? DtcResources.ExpandText : DtcResources.CollapseText;

        return (
            <div className="gates-section-header constrained-width">
                <div
                    tabIndex={this.state.isEnabled ? 0 : -1}
                    className={css("panel-section-sub-header", this.state.isEnabled ? Utils_String.empty : "disabled")}
                    role={this.state.isEnabled ? "button" : "heading"}
                    onClick={this._onCollapseHeaderClick}
                    onKeyDown={this._handleKeyPressOnHeader}
                    aria-label={label}
                    aria-expanded={isExpanded}
                    data-first-focus-element={true}>

                    <div className="sub-header-label">
                        <VssIcon className={css("sub-header-icon", {"gate-error-icon": this._isGateInValid()})} iconName={props.bowtieIconName} iconType={VssIconType.fabric}  />
                        <TooltipHost content={label} overflowMode={TooltipOverflowMode.Parent}>
                            {label}
                        </TooltipHost>
                    </div>
                    {
                        this.state.isEnabled && <VssIcon className="chevron" iconName={chevronIcon} iconType={VssIconType.bowtie} aria-label={ariaLabel} />
                    }
                </div>
                <div className="section-header-toggle-content">
                    <Toggle
                        className="gates-section-toggle"
                        label={Utils_String.empty}
                        checked={this.state.isEnabled}
                        onText={Resources.EnabledText}
                        offText={Resources.DisabledText}
                        onChanged={this._handleToggleChange}
                        onAriaLabel={label}
                        offAriaLabel={label} />
                </div>
            </div>
        );
    }

    private _onCollapseHeaderClick = (): void => {
        const toggledState: boolean = !this.props.expanded;
        this._callHeaderClick(toggledState);
    }

    private _handleKeyPressOnHeader = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (event.keyCode === KeyCode.SPACE || event.keyCode === KeyCode.ENTER) {
            this._onCollapseHeaderClick();
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private _callHeaderClick(toggledState: boolean): void {
        if (this.props.onHeaderClick && this.props.componentName) {
            this.props.onHeaderClick(this.props.componentName, toggledState);
        }
    }

    private _handleToggleChange = (isEnabled: boolean): void => {
        this._actionCreator.updateEnvironmentGatesState(isEnabled);
        this._callHeaderClick(isEnabled);
    }

    private _onStoreChange = () => {
        this.setState(this._store.getState());
    }

    private _getGatesEnabledContent(): JSX.Element {
        return (
            <div className="gates-enabled-content">
                {this._getStabilizationOptionControl()}
                {this._getGateListDetailsComponent()}
            </div>);
    }

    private _getStabilizationOptionControl(): JSX.Element {
        const label: string = Resources.GatesStabilizationTimeLabel;
        const helpText: string = Resources.GatesStabilizationTimeHelp;

        return (
            <DurationInputComponent
                cssClass="gates-stabilization-time"
                value={this.state.stabilizationTime}
                onValueChanged={this._onUpdateStabilizationTime}
                label={label}
                errorMessage={this.state.stabilizationTimeErrorMessage}
                infoProps={ControlUtils.getCalloutInfoProps(helpText)}
                showMinute={true}
                showHour={true}
                required={false}
                inputAriaDescription={helpText}
                inputAriaLabel={Resources.AriaLabelGatesStabilizationTimeValue}
                unitAriaLabel={Resources.AriaLabelGatesStabilizationTimeUnit} />
        );
    }

    private _onUpdateStabilizationTime = (newTime: IDuration): void => {
        this._actionCreator.updateGatesStabilizationTime(newTime);
    }

    private _getGateListDetailsComponent(): JSX.Element {
        return (
            <GateListDetailsComponent
                instanceId={this.props.instanceId}
                definitions={this.state.definitions}
                gateItemList={this.state.gateItemList}
                gateListInstanceId={this._store.gateListInstanceId}
                optionsActionCreator={this._actionCreator}
                samplingInterval={this.state.samplingInterval}
                samplingIntervalErrorMessage={this.state.samplingIntervalErrorMessage}
                minimumSuccessDuration={this.state.minimumSuccessDuration}
                minimumSuccessDurationErrorMessage={this.state.minimumSuccessDurationErrorMessage}
                timeout={this.state.timeout}
                timeoutErrorMessage={this.state.timeoutErrorMessage}
                approvalExecutionOrder={this.state.approvalExecutionOrder}
                showGateListOptions={this._store.isAnyGateEnabled()} />
        );
    }

    private _actionCreator: GatesActionCreator;
    private _store: EnvironmentGatesViewStore;
}
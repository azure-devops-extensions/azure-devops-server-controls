// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { PermissionIndicatorSource } from "DistributedTaskControls/Common/Telemetry";
import { EventConstants } from "DistributedTaskControls/Generated/DistributedTask.Constants";
import { AccordionCustomRenderer } from "DistributedTaskControls/SharedControls/Accordion/AccordionCustomRenderer";
import { InputControlUtils as ControlUtils } from "DistributedTaskControls/SharedControls/InputControls/Utilities";
import * as DtcResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { Collapsible, ICollapsibleProps } from "DistributedTaskControls/SharedControls/Collapsible/Collapsible";
import { DurationInputComponent, IDuration } from "DistributedTaskControls/SharedControls/InputControls/Components/DurationInputComponent";

import { EnvironmentAutoRedeployTriggerActionsCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentAutoRedeployTriggerActionsCreator";
import { EnvironmentAutoRedeployTriggerViewStore, IEnvironmentAutoRedeployTriggerViewSate } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentAutoRedeployTriggerViewStore";
import { IEnvironmentSubComponentProps } from "PipelineWorkflow/Scripts/Shared/Environment/Types";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { PermissionIndicator } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionIndicator";
import { ISecurityProps } from "PipelineWorkflow/Scripts/SharedComponents/Security/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { PostDeploymentConditionsViewComponents } from "PipelineWorkflow/Scripts/Shared/Constants";

import { RedeployTriggerAction } from "ReleaseManagement/Core/Constants";

import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";
import { PickList, IPickListSelection } from "VSSUI/PickList";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";

import { css } from "OfficeFabric/Utilities";
import { Checkbox } from "OfficeFabric/Checkbox";
import { IDropdownOption, Dropdown } from "OfficeFabric/Dropdown";
import { Label } from "OfficeFabric/Label";
import { SelectionMode } from "OfficeFabric/Selection";
import { Toggle } from "OfficeFabric/Toggle";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Environment/EnvironmentAutoRedeployTriggerComponent";

export interface IEnvironmentAutoRedeployTriggerComponentProps extends IEnvironmentSubComponentProps {
}

export class EnvironmentAutoRedeployTriggerComponent extends ComponentBase.Component<IEnvironmentAutoRedeployTriggerComponentProps, IEnvironmentAutoRedeployTriggerViewSate> {

    public componentWillMount(): void {
        this._store = StoreManager.GetStore(EnvironmentAutoRedeployTriggerViewStore, this.props.instanceId);
        this._actionCreator = ActionCreatorManager.GetActionCreator(EnvironmentAutoRedeployTriggerActionsCreator, this.props.instanceId);
        this._store.addChangedListener(this._onStoreChange);
        this.setState(this._store.getState());
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoreChange);
    }

    public render(): JSX.Element {
        const securityProps: ISecurityProps = PermissionHelper.createEditApprovalsSecurityProps(this.props.releaseDefinitionFolderPath, this.props.releaseDefinitionId, this.props.environmentId);
        const overrideSecurityProps: ISecurityProps[] = PermissionHelper.createEditApprovalsOverrideSecurityProps(this.props.releaseDefinitionFolderPath, this.props.releaseDefinitionId, this.props.environmentId);

        const heading: string = Resources.EnvironmentAutoRedeployTriggerHeading;
        const description: string = Resources.EnvironmentAutoRedeployTriggerDescription;

        const headerIcon: string = (this.state.isEnabled && !this.props.expanded && !this._store.isValid()) ? "status-error-outline" : "trigger-auto";

        return this.state.isVisible
            ? (
                <Collapsible
                    cssClass={css("cd-environment-auto-redeploy-trigger-collapsible", "auto-redeploy-trigger")}
                    label={heading}
                    description={description}
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

                        {(this.props.expanded && this.state.isEnabled)
                            ? this._getAutoRedeployTriggerEnabledContent()
                            : null}

                    </PermissionIndicator>

                </Collapsible>
            ) : null;
    }

    private _getSectionHeader = (props: ICollapsibleProps, defaultRender?: (props?: ICollapsibleProps) => JSX.Element | null): JSX.Element => {
        const { label } = props;
        const isExpanded: boolean = props.expanded;
        const chevronIcon: string = `chevron-${isExpanded ? "up" : "down"}-light`;
        const ariaLabel: string = isExpanded ? DtcResources.ExpandText : DtcResources.CollapseText;

        return (
            <div className="auto-redeploy-trigger-section-header constrained-width">
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
                        <VssIcon className="sub-header-icon" iconName={props.bowtieIconName} iconType={VssIconType.bowtie} />
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
                        className="auto-redeploy-trigger-section-toggle"
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
        if (this.props.onHeaderClick) {
            this.props.onHeaderClick(PostDeploymentConditionsViewComponents.EnvironmentAutoRedeployTriggerView, toggledState);
        }
    }

    private _handleToggleChange = (isEnabled: boolean): void => {
        this._actionCreator.toggleTriggers(isEnabled);
        this._callHeaderClick(isEnabled);
    }

    private _onStoreChange = () => {
        this.setState(this._store.getState());
    }

    private _getAutoRedeployTriggerEnabledContent(): JSX.Element {
        return (
            <div className="auto-redeploy-trigger-enabled-content">
                {this._getTriggerEventsOptionsControl()}
                {this._getTriggerActionOptionsControl()}
            </div>);
    }

    private _getTriggerEventsOptionsControl(): JSX.Element {
        const label: string = Resources.AutoRedeployTriggerEventsLabel;

        let options = [];
        if (FeatureFlagUtils.isRollbackTriggerEnabled()) {
            options.push({ key: EventConstants.DeploymentFailed, text: Resources.StageDeploymentFailed });
        }

        if (FeatureFlagUtils.isRedeployTriggerEnabled() && this._store.isAnyDgPhaseWithEnvironment()) {
            options.push({ key: EventConstants.DeploymentMachinesChanged, text: Resources.AutoRedeployTriggerNewTargetWithTags });
        }

        return (<div className="auto-redeploy-trigger-events">
                <Dropdown
                    className="auto-redeploy-trigger-events-dropdown"
                    placeHolder={label}
                    ariaLabel={label}
                    label={label}
                    required={true}
                    selectedKey={this.state.triggerContent.eventTypes.length > 0 ? this.state.triggerContent.eventTypes[0] : null}
                    onChanged={this._onTriggerEventChanged}
                    errorMessage={this.state.triggerContent.eventTypes.length > 0 ? undefined : DtcResources.RequiredInputErrorMessage}
                    options={options} />
            </div>
        );
    }

    private _getTriggerActionOptionsControl(): JSX.Element {
        const label: string = Resources.AutoRedeployTriggerActionLabel;

        return (<div className="auto-redeploy-trigger-action">
                <Dropdown
                    className="auto-redeploy-trigger-action-dropdown"
                    placeHolder={label}
                    ariaLabel={label}
                    label={label}
                    required={true}
                    selectedKey={this.state.triggerContent.action}
                    onChanged={this._onTriggerActionChanged}
                    errorMessage={!!this.state.triggerContent.action ? undefined : DtcResources.RequiredInputErrorMessage}
                    options={
                        [
                            { key: RedeployTriggerAction.LatestSuccessfulDeployment, text: Resources.AutoRedeployTriggerLastSuccessfulDeployAction },
                        ]
                    } />
            </div>
        );
    }

    private _onTriggerEventChanged = (option: IDropdownOption): void => {
        this._actionCreator.changeTriggerEvent(option.key.toString());
    }

    private _onTriggerEventToggled = (option: IDropdownOption): void => {
        this._actionCreator.toggleTriggerEvent(option.key.toString(), option.selected);
    }

    private _onTriggerActionChanged = (option: IDropdownOption): void => {
        this._actionCreator.changeTriggerAction(option.key.toString());
    }

    private _actionCreator: EnvironmentAutoRedeployTriggerActionsCreator;
    private _store: EnvironmentAutoRedeployTriggerViewStore;
}
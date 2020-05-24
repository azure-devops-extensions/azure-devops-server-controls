// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />

import * as React from "react";

import { TaskListActionsCreator as GateListActionsCreator } from "DistributedTaskControls/Actions/TaskListActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { ITaskDefinitionItem } from "DistributedTaskControls/Common/Types";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { TaskItem as GateItem } from "DistributedTaskControls/Components/Task/TaskItem";
import { InputControlUtils as ControlUtils } from "DistributedTaskControls/SharedControls/InputControls/Utilities";
import { IDuration } from "DistributedTaskControls/SharedControls/InputControls/Components/DurationInputComponent";
import { AccordionCustomRenderer } from "DistributedTaskControls/SharedControls/Accordion/AccordionCustomRenderer";

import { ApprovalExecutionOrder as PipelineApprovalExecutionOrder } from "ReleaseManagement/Core/Contracts";

import { GatesActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/GatesActionCreator";
import { GateDefinitionsDropdownMenu } from "PipelineWorkflow/Scripts/Editor/Environment/GateDefinitionsDropdownMenu";
import { GateListComponent } from "PipelineWorkflow/Scripts/Editor/Environment/GateListComponent";
import { GateListOptionsComponent } from "PipelineWorkflow/Scripts/Editor/Environment/GateListOptionsComponent";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { IGateListOptions, IGateListOptionsErrorMessages } from "PipelineWorkflow/Scripts/Editor/Environment/Types";

import { TaskDefinition as GateDefinition } from "TFS/DistributedTask/Contracts";

import * as Utils_String from "VSS/Utils/String";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Environment/GateListDetailsComponent";

export interface IGateListDetailsComponentProps extends ComponentBase.IProps, IGateListOptions, IGateListOptionsErrorMessages {
    optionsActionCreator: GatesActionCreator;
    definitions: GateDefinition[];
    gateItemList?: GateItem[];
    gateListInstanceId?: string;
    showGateListOptions?: boolean;
}

export interface IGateListDetailsState extends ComponentBase.IState {
    showDropdown?: boolean;
    expandedGateComponent?: string;
    hasOptionsExpanded?: boolean;
    focusedGate?: string;
}

export class GateListDetailsComponent extends ComponentBase.Component<IGateListDetailsComponentProps, IGateListDetailsState> {

    constructor(props: IGateListDetailsComponentProps) {
        super(props);
        this._optionsActionCreator = props.optionsActionCreator;
        this._gateListActionsCreator = ActionCreatorManager.GetActionCreator<GateListActionsCreator>(GateListActionsCreator, props.gateListInstanceId);
    }

    public componentWillMount(): void {
        this.setState({ showDropdown: false, expandedGateComponent: Utils_String.empty, hasOptionsExpanded: false });
    }

    public render(): JSX.Element {
        return (
            <div className="gate-list-details">
                {this._getComponentHeader()}
                {this._getGateListComponent()}
                {this._getGateListOptionsView()}
            </div>
        );
    }

    private _getComponentHeader(): JSX.Element {
        return (
            <div className="details-heading-content">
                {/* label with info button */}
                <span className="heading-info">{Resources.ApprovalGatesSectionHeading}</span>
                <InfoButton
                    cssClass="heading-info-button"
                    calloutContent={ControlUtils.getCalloutContentProps(Resources.ApprovalGatesSectionHelpText)}
                    isIconFocusable={true} />
                {/* Menu to add gate definitions */}
                <GateDefinitionsDropdownMenu
                    ref={this._resolveRef("_addDefinitionMenuReference")}
                    instanceId={this.props.instanceId}
                    definitions={this.props.definitions}
                    onGateAdd={this._onGateAdd} />
            </div>
        );
    }

    private _getGateListComponent(): JSX.Element | null {
        return ((this.props.gateItemList && this.props.gateItemList.length > 0)
            ? (
                <div className="gate-list-main-content">
                    <div className="gate-list-main-content-inner">
                        <GateListComponent
                            focusedGateKey={this._getNextKey()}
                            expandedComponent={this._getGateExpandedComponentKey()}
                            listActionsCreator={this._gateListActionsCreator}
                            gateItemList={this.props.gateItemList}
                            onGateHeaderClick={this._onGateHeaderClick} />
                    </div>
                </div>
            ) : null
        );
    }

    private _getNextKey(): string {
        return this.state.focusedGate;
    }

    private _getGateExpandedComponentKey(): string {
        if (Utils_String.ignoreCaseComparer(this._lastComponentKey, this.state.expandedGateComponent) === 0) {
            const list: GateItem[] = this.props.gateItemList;

            if (list && list.length > 0) {
                return list[list.length - 1].getKey();
            }

            return Utils_String.empty;
        }

        return this.state.expandedGateComponent;
    }

    private _getGateListOptionsView(): JSX.Element | null {
        return this.props.showGateListOptions
            ? (
                <AccordionCustomRenderer
                    cssClass={css("glo-heading", this.state.hasOptionsExpanded ? Utils_String.empty : "collapsed-options")}
                    label={Resources.EvaluationOptionsLabelText}
                    expanded={this.state.hasOptionsExpanded}
                    onHeaderClick={this._onOptionsClick}
                    showErrorDelegate={this._showErrorOnGateListOptions}
                    headingLevel={3}
                    addSectionHeaderLine={!this.state.hasOptionsExpanded}>
                    <GateListOptionsComponent
                        instanceId={this.props.instanceId}
                        timeout={this.props.timeout}
                        timeoutErrorMessage={this.props.timeoutErrorMessage}
                        onUpdateTimeout={this._onUpdateTimeout}
                        samplingInterval={this.props.samplingInterval}
                        samplingIntervalErrorMessage={this.props.samplingIntervalErrorMessage}
                        onUpdateSamplingIntervalTime={this._onUpdateSamplingInterval}
                        minimumSuccessDuration={this.props.minimumSuccessDuration}
                        onUpdateMinimumSuccessfulWindow={this._onMinimumSuccessDurationChanged}
                        minimumSuccessDurationErrorMessage={this.props.minimumSuccessDurationErrorMessage}
                        approvalExecutionOrder={this.props.approvalExecutionOrder}
                        onApprovalExecutionOrderChange={this._onApprovalExecutionOrderChange} />
                </AccordionCustomRenderer>
            ) : null;
    }

    private _onOptionsClick = (isExpanded: boolean): void => {
        this._hasOptionsExpanded = isExpanded && this.props.showGateListOptions;
        this._updateComponentState();
    }

    private _showErrorOnGateListOptions = (): boolean => {
        return !!(this.props.samplingIntervalErrorMessage || this.props.timeoutErrorMessage || this.props.minimumSuccessDurationErrorMessage);
    }

    private _onUpdateTimeout = (newTime: IDuration): void => {
        this._optionsActionCreator.updateGateListTimeout(newTime);
    }

    private _onUpdateSamplingInterval = (newTime: IDuration): void => {
        this._optionsActionCreator.updateGateListSamplingInterval(newTime);
    }

    private _onApprovalExecutionOrderChange = (newExecutionOrder: PipelineApprovalExecutionOrder): void => {
        this._optionsActionCreator.updateApprovalExecutionOrder(newExecutionOrder);
    }

    private _onMinimumSuccessDurationChanged = (newTime: IDuration): void => {
        this._optionsActionCreator.updateGateListMinimumSuccessDuration(newTime);
    }

    private _onGateAdd = (definition: GateDefinition): void => {
        this._expandedGateComponent = this._lastComponentKey;
        this._focusedGateKey = Utils_String.empty;
        this._gateListActionsCreator.addTask(definition as ITaskDefinitionItem);
        this._updateComponentState();
    }

    private _onGateHeaderClick = (gateKey: string, isExpanded: boolean, isGateDeleted: boolean): void => {
        this._expandedGateComponent = isExpanded ? gateKey : Utils_String.empty;
        this._focusedGateKey = Utils_String.empty;
        if (isGateDeleted) {
            const list: GateItem[] = this.props.gateItemList;
            const numberOfGates: number = list.length;
            if (!list || numberOfGates === 0 || ((numberOfGates - 1) === 0)) {
                if (this._addDefinitionMenuReference) {
                    this._addDefinitionMenuReference.setFocus();
                }
            }
            else {
                let gateKeyIndex = 0;
                let i = 0;
                list.forEach((g: GateItem) => {
                    if (Utils_String.ignoreCaseComparer(g.getKey(), gateKey) === 0) {
                        gateKeyIndex = i;
                    }

                    i++;
                });

                this._focusedGateKey = (gateKeyIndex === (numberOfGates - 1)) ? list[gateKeyIndex - 1].getKey() : list[gateKeyIndex + 1].getKey();
            }
        }

        this._updateComponentState();
    }

    private _updateComponentState(): void {
        this.setState({
            expandedGateComponent: this._expandedGateComponent,
            hasOptionsExpanded: this._hasOptionsExpanded,
            focusedGate: this._focusedGateKey
        });
    }

    private _hasOptionsExpanded: boolean = false;
    private _expandedGateComponent: string = Utils_String.empty;
    private _lastComponentKey: string = `gate-list-last-added-component-key-${Utils_String.generateUID()}`;
    private _optionsActionCreator: GatesActionCreator;
    private _gateListActionsCreator: GateListActionsCreator;
    private _focusedGateKey: string;
    private _addDefinitionMenuReference: GateDefinitionsDropdownMenu;
}
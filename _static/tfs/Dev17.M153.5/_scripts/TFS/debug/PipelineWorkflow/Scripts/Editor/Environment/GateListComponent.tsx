// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />

import * as React from "react";

import { TaskListActionsCreator as GateListActionsCreator } from "DistributedTaskControls/Actions/TaskListActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { TaskActionCreator as GateActionCreator } from "DistributedTaskControls/Components/Task/TaskActionsCreator";
import { TaskItem as GateItem } from "DistributedTaskControls/Components/Task/TaskItem";

import { css } from "OfficeFabric/Utilities";

import { CollapsibleGate } from "PipelineWorkflow/Scripts/Editor/Environment/CollapsibleGate";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Environment/GateListComponent";

export interface IGateListComponentProps extends ComponentBase.IProps {
    listActionsCreator: GateListActionsCreator;
    gateItemList?: GateItem[];
    expandedComponent?: string;
    focusedGateKey: string;
    onGateHeaderClick?: (gateKey: string, isExpanded: boolean, isGateDeleted: boolean) => void;
}

export class GateListComponent extends ComponentBase.Component<IGateListComponentProps, ComponentBase.IStateless> {
    constructor(props: IGateListComponentProps) {
        super(props);
        this._listActionsCreator = props.listActionsCreator;
    }

    public componentDidMount(): void {
        this.setFoucs();
    }

    public componentDidUpdate() {
        if (this._isDeleteGate)
        {
            this._isDeleteGate = false;
            this.setFoucs();
        }
    }

    public render(): JSX.Element {
        return (
            <div className="gate-list">
                {this._getGateListView()}
            </div>
        );
    }

    private setFoucs(): void {
        if (this._gateElement)
        {
            this._gateElement.focus();
        }
    }

    private _getGateListView(): JSX.Element[] {
        const gates: GateItem[] = this.props.gateItemList;
        let gateListView: JSX.Element[] = [];

        // add gate list
        if (gates && gates.length > 0) {
            const gatesLastIndex: number = gates.length - 1;
            this._gateElement = null;
            gateListView = gates.map((gate: GateItem, index: number): JSX.Element => {
                const gateKey: string = gate.getKey();
                const isExpanded: boolean = Utils_String.ignoreCaseComparer(this.props.expandedComponent, gateKey) === 0;
                const isFocusGate: boolean = Utils_String.ignoreCaseComparer(gateKey, this.props.focusedGateKey) === 0;
             
                return (
                    <CollapsibleGate
                        ref={(element) => { if (isFocusGate) { this._gateElement = element; }}}
                        key={gateKey}
                        cssClass={index === 0 ? Utils_String.empty : "collapsible-gate-other-instance"}
                        label={gate.getTask().displayName}
                        headingLevel={3}
                        expanded={isExpanded}
                        item={gate}
                        onGateDelete={this._onGateDelete}
                        onGateStateChange={this._onGateStateChange}
                        onHeaderClick={(isExpanded: boolean) => { this._onHeaderClick(gateKey, isExpanded); }}/>
                );
            });
        }

        return gateListView;
    }

    private _onGateDelete = (gateKey: string): void => {
        this._listActionsCreator.removeTask(gateKey);
        this._onHeaderClick(gateKey, false, true);
        this._isDeleteGate = true;
    }

    private _onGateStateChange = (gateKey: string, enabled: boolean): void => {
        const taskActionsCreator: GateActionCreator = ActionCreatorManager.GetActionCreator<GateActionCreator>(GateActionCreator, gateKey);
        taskActionsCreator.updateTaskState(enabled);

        this._onHeaderClick(gateKey, enabled);
    }

    private _onHeaderClick(gateKey: string, isExpanded: boolean, isGateDeleted: boolean = false): void {
        if (this.props.onGateHeaderClick) {
            this.props.onGateHeaderClick(gateKey, isExpanded, isGateDeleted);
        }
    }

    private _listActionsCreator: GateListActionsCreator;
    private _gateElement: CollapsibleGate;
    private _isDeleteGate: boolean = false;
}
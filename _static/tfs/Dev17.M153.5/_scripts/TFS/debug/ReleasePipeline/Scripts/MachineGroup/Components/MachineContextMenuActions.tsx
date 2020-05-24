/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");
import Dialogs = require("VSS/Controls/Dialogs");
import Navigation_Services = require("VSS/Navigation/Services");
import Utils_String = require("VSS/Utils/String");
import { ContextualMenuButton } from "VSSUI/ContextualMenuButton";
import { contextualMenuIcon } from "VSSPreview/OfficeFabric/Helpers";
import ContextualMenu = require("OfficeFabric/ContextualMenu");
import { Component, IProps, IState } from "DistributedTaskControls/Common/Components/Base";
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import MachineGroupActionCreator = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupActionCreator");
import ActionConfirmationDialog = require("ReleasePipeline/Scripts/Common/Components/ActionConfirmationDialog");
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import {PerfScenariosConstants} from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import { getFabricIcon } from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.Common.Utils";

export interface Props extends IProps {
    machine: Model.Machine;
    dgId: number;
}

export class MachineContextMenuActions extends Component<Props, IState> {

    protected _ellipsisButton: ContextualMenuButton;

    public render(): JSX.Element {
        return (
            <div className={"action-icon"} >
                <ContextualMenuButton 
                    ref={(c) => this._ellipsisButton = c}
                    title = {Resources.MoreActions}
                    iconProps = {getFabricIcon("More")}
                    getItems={ () => this.getMenuItems()} />
            </div>
        );
    }

    protected getMenuItems(): ContextualMenu.IContextualMenuItem[] {
        let items =
            [
                {
                    key: 'viewdetails',
                    name: Resources.OpenText,
                    iconProps: {iconName : "NavigateForward"},
                    onClick: () => {
                        this._onMachineViewDetails();
                    }
                },
                {
                    key: 'delete',
                    name: Resources.DeleteMachineGroupText,
                    iconProps: {iconName : "Delete"},
                    onClick: () => {
                        this._onMachineDelete();
                    }
                }
            ];
        return items;
    }

    private _onMachineViewDetails(): void {
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, { machineid: this.props.machine.id });
    }

    private _onMachineDelete(): void {
        let machine: Model.Machine = this.props.machine;
        let titleText = Utils_String.format(Resources.DeleteMachineConfirmationTitle, machine.name);
        let description = Resources.DeleteMachineConfirmationDescription;
        Dialogs.show(ActionConfirmationDialog.ActionConfirmationDialog,
            {
                close: () => {
                    if (this._ellipsisButton) {
                        this._ellipsisButton.focus();
                    }
                },
                okCallback: (data: any) => {
                    PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.DeleteMachineScenario);
                    MachineGroupActionCreator.ActionCreator.deleteMachine(this.props.dgId, machine.id);
                },
                title: titleText,
                description: description
            } as ActionConfirmationDialog.IActionConfirmationDialogOptions);
    }
}
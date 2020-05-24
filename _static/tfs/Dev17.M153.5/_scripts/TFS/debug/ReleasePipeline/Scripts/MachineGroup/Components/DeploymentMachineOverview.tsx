// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import Component_Base = require("VSS/Flux/Component");

import { ITag } from "OfficeFabric/components/pickers/TagPicker/TagPicker";
import {TextField} from "OfficeFabric/components/TextField/TextField";
import {Toggle} from "OfficeFabric/components/Toggle/Toggle";

import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { TagPickerComponent } from "DistributedTaskControls/Components/TagPicker";
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import DeploymentMachineActionCreator = require("ReleasePipeline/Scripts/MachineGroup/Actions/DeploymentMachineActionCreator");
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import { PerfScenariosConstants } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import { MachineReleases } from 'ReleasePipeline/Scripts/MachineGroup/Components/DeploymentTargetHistory';
import "VSS/LoaderPlugins/Css!RM:ReleasePipeline/Scripts/MachineGroup/Components/DeploymentMachineOverview";

export interface Props extends Component_Base.Props {
    mgid: number;
    machine: Model.Machine;
    allTags?: string[];
    currentTags?: string[];
    onMachineDelete?: (machine: Model.Machine) => void;
}

export interface State extends Component_Base.State {
}

export class MachineOverview extends Component_Base.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this._deploymentMachineActionCreator = DeploymentMachineActionCreator.ActionCreator;
    }

    public render(): JSX.Element {

        let callOutContent: ICalloutContentProps = {
            calloutHeader: Resources.Tags,
            calloutDescription: Resources.TargetTagsDescription
        }

        return (
            <div className="machine-overview-wrapper">
            <div className = "machine-overview-left-pane" role = "tabpanel" aria-labelledby="pivotview-header-Overview">
                <h3 className = "machine-tags-text machine-overview-text"> {Resources.Tags} <InfoButton cssClass="" 
                    calloutContent={callOutContent} isIconFocusable={true} /></h3>
                <div className = "machine-overview-tags-new" >
                    <TagPickerComponent
                        selectedItems={this.props.currentTags.map(item => ({ key: item, name: item}))}
                        items={this.props.allTags.map(item => ({ key: item, name: item}))}
                        includeUserEnteredTextInSuggestedTags={true}
                        getTagForText={(text) => { return { key: text, name: text }; }}
                        onChange={this._onTagsUpdated}
                        inputProps={{
                            "aria-label": Resources.DeploymentMachineTagPickerAriaLabel,
                            "aria-describedby": Resources.TargetTagsDescription
                        } as React.InputHTMLAttributes<HTMLInputElement>}
                    />
                </div>
                <MachineReleases mgid={this.props.mgid} machine={this.props.machine} showRecentDeployments={true} records={5}/>
            </div>
            <div className="machine-overview-right-pane">
                <h3 className="agent-name-text">{Resources.AgentVersion}</h3>
                <TextField inputClassName="agent-version-field" value={this.props.machine.deploymentMachine.agent.version} disabled={true} />
            </div>
        </div>);
    }

    private _onTagsUpdated = (currentTags: ITag[]) => {
        this._deploymentMachineActionCreator.machineTagsUpdated(currentTags);
    }

    private _onMachineDelete = () => {
        if (this.props.onMachineDelete) {
            this.props.onMachineDelete(this.props.machine);
        }
    }

    private _deploymentMachineActionCreator: DeploymentMachineActionCreator.DeploymentMachineActionCreator;
}

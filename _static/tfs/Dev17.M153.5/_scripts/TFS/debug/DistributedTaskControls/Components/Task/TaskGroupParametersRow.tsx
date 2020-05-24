/// <reference types="react" />

import * as React from "react";

import { Component, IProps, IStateless } from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { InputControlType } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { ConnectedServiceInputComponentBase } from "DistributedTaskControls/SharedControls/InputControls/Components/ConnectedServiceInputComponent";
import { ConnectedServiceComponentUtility } from "DistributedTaskControls/SharedControls/InputControls/Components/ConnectedServiceComponentUtility";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";

import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";

import * as Utils_String from "VSS/Utils/String";

export interface ITaskGroupParametersRowProps extends IProps {
    index: number;
    taskInput: DistributedTaskContracts.TaskInputDefinition;
    showEndpointsAsDropdowns: boolean;
    onTaskGroupMetaInputValueChanged: (value: string, index: number) => void;
    onTaskGroupMetaInputHelpMarkDownChanged: (value: string, index: number) => void;

    // Props required for endpoint type inputs
    inputControlInstanceId?: string;
    onTaskGroupEndpointInputOptionsChanged: (options: IDictionaryStringTo<string>, index: number) => void;
}

export class TaskGroupParametersRow extends Component<ITaskGroupParametersRowProps, IStateless>{

    public render(): JSX.Element {

        return (
            <div className={"dtc-task-group-parameter-row"}>

                <TooltipIfOverflow tooltip={this.props.taskInput.name} targetElementClassName="dtc-task-group-parameter-name">
                    <div className="dtc-task-group-parameter-name"> {this.props.taskInput.name} </div>
                </TooltipIfOverflow>

                <div className="dtc-task-group-parameter-value">

                    {this._getDefaultValueField()}

                </div>

                <div className="dtc-task-group-parameter-description">

                    <StringInputComponent
                        cssClass="task-group-parameter-description-input"
                        value={this.props.taskInput.helpMarkDown}
                        ariaLabel={Utils_String.localeFormat(Resources.ARIALabelTaskGroupConfigurationParameterDescription, this.props.taskInput.name || Utils_String.empty)}
                        onValueChanged={(newValue: string) => { this.props.onTaskGroupMetaInputHelpMarkDownChanged(newValue, this.props.index); }}
                    />

                </div>

            </div>
        );
    }

    private _getDefaultValueField(): JSX.Element {
        if (this.props.showEndpointsAsDropdowns
            && DtcUtils.getTaskInputType(this.props.taskInput) === InputControlType.INPUT_TYPE_CONNECTED_SERVICE) {
            return (
                <ConnectedServiceInputComponentBase
                    cssClass="task-group-parameter-value-endpoint"
                    value={this.props.taskInput.defaultValue}
                    ariaLabel={Utils_String.localeFormat(Resources.ARIALabelTaskGroupConfigurationParameterValue, this.props.taskInput.name || Utils_String.empty)}
                    onValueChanged={(value: string) => this.props.onTaskGroupMetaInputValueChanged(value, this.props.index)}
                    onOptionsChanged={(options: IDictionaryStringTo<string>) =>
                        this.props.onTaskGroupEndpointInputOptionsChanged
                        && this.props.onTaskGroupEndpointInputOptionsChanged(options, this.props.index)
                    }
                    hideNewButton={true}
                    options={this.props.taskInput.options}
                    properties={this.props.taskInput.properties}
                    useConnectedService={true}
                    connectedServiceType={ConnectedServiceComponentUtility.getConnectedServiceType(this.props.taskInput)}
                    authSchemes={ConnectedServiceComponentUtility.getConnectedServiceAuthSchemes(this.props.taskInput)}
                    instanceId={this.props.inputControlInstanceId} />
            );
        }
        else {
            return (
                <StringInputComponent
                    cssClass="task-group-parameter-value-input"
                    value={this.props.taskInput.defaultValue}
                    ariaLabel={Utils_String.localeFormat(Resources.ARIALabelTaskGroupConfigurationParameterValue, this.props.taskInput.name || Utils_String.empty)}
                    onValueChanged={(newValue: string) => { this.props.onTaskGroupMetaInputValueChanged(newValue, this.props.index); }}
                />);
        }
    }
}
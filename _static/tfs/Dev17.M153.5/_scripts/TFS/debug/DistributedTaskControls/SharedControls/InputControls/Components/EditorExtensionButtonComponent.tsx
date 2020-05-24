/// <reference types="react" />
import * as React from "react";

import * as TaskModels from "DistributedTasksCommon/TFS.Tasks.Models";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import * as Contributions_Contracts from "VSS/Contributions/Contracts";
import * as Contributions_Services from "VSS/Contributions/Services";
import * as Diag from "VSS/Diag";
import * as Service from "VSS/Service";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Utils_String from "VSS/Utils/String";

import { Component, IStateless } from "DistributedTaskControls/Common/Components/Base";
import { TaskStoreBase } from "DistributedTaskControls/Components/Task/TaskStoreBase";
import { InputControlType, IInputControlPropsBase, IEditorExtensionInstance, ITaskDelegates } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { ContributionSource } from "DistributedTaskControls/Sources/ContributionSource";

import { IconButton } from "OfficeFabric/Button";
import { css } from "OfficeFabric/Utilities";

import { TaskInputDefinitionBase as TaskInputDefinition } from "TFS/DistributedTaskCommon/Contracts";

import * as Telemetry from "VSS/Telemetry/Services";

export interface IEditorExtensionButtonComponentProps extends IInputControlPropsBase<string> {
    properties?: IDictionaryStringTo<any>;
    inputDefinition: TaskInputDefinition;
    taskDelegates: ITaskDelegates;
    getAllInputValues: () => {};
    onOkCallback: (value: string) => void;
}

export interface IEditorExtensionButtonComponentState {
    showButton: boolean;
}

export class EditorExtensionButtonComponent extends Component<IEditorExtensionButtonComponentProps, IEditorExtensionButtonComponentState>{

    constructor(props) {
        super(props);
        this.state = {
            showButton: false
        };

        if (!!this.props.properties) {
            this._contributionId = this.props.properties[InputControlType.INPUT_CONTROL_EDITOR_EXTENSION];
        }

    }

    public componentDidMount() {
        super.componentDidMount();
        this._componentMounted = true;

        if (!!this._contributionId) {
            ContributionSource.instance().getAllEditorExtensions().then((contributions: Contributions_Contracts.Contribution[]) => {
                let hasExtension = false;
                let filteredContributions = contributions.filter((contributionItem: Contributions_Contracts.Contribution) => {
                    return Utils_String.ignoreCaseComparer(contributionItem.id, this._contributionId) === 0;
                });
                if (filteredContributions.length > 0) {
                    hasExtension = true;
                }

                if (this._componentMounted) {
                    this.setState({
                        showButton: hasExtension
                    });
                }
            }, (error) => {
                if (this._componentMounted) {
                    this.setState({
                        showButton: false
                    });
                }
            });
        }
    }

    public componentWillUnmount(): void {
        this._componentMounted = false;
    }

    public render(): JSX.Element {
        Diag.logVerbose("[EditorExtensionButtonComponent.render]: Method called.");
        return (this.state.showButton ?
            <div className="input-control-buttons">
                <IconButton
                    className={css("input-control-icon-button", "fabric-style-overrides", "icon-button-override")}
                    iconProps={{ iconName: "More" }}
                    ariaDescription={Utils_String.localeFormat(Resources.EditorExtensionButtonAriaLabel, this.props.label)}
                    ariaLabel={Resources.InputsEditorExtensionLabel}
                    onClick={this._openDialog()} >
                </IconButton>
            </div>
            : null);
    }

    private _openDialog(): (event: React.MouseEvent<HTMLButtonElement>) => void {
        Diag.logVerbose("[EditorExtensionButtonComponent.render]: Method called.");
        return (event: React.MouseEvent<HTMLButtonElement>) => {
            const targetName = this.props.inputDefinition.name;
            const title = this.props.inputDefinition.label || Resources.InputsEditorExtensionLabel;
            const allInputValues = this.props.getAllInputValues();
            const taskDelegates = this.props.taskDelegates;
            const callback = this.props.onOkCallback;
            const originalValue: string = allInputValues[targetName];
            const contributionId: string = this._contributionId;
            SDK_Shim.VSS.getService("ms.vss-web.dialog-service").then((dialogService: IHostDialogService) => {
                let contributionInstance: IEditorExtensionInstance;

                // Telemetry for recoding OnClicks
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                    TaskModels.CustomerIntelligenceInfo.Area,
                    TaskModels.CustomerIntelligenceInfo.FeatureInputEditorExtension,
                    {
                        "extensionId": this._contributionId,
                        "TaskInputEditorExtensionClick": 1,
                        "editorType": "NewEditor"
                    }
                ));

                // Show dialog
                let dialogOptions = {
                    title: title,
                    resizable: false,
                    modal: true,
                    height: 600,
                    width: 550,
                    cancelText: Resources.CancelButtonText,
                    okText: Resources.OK,
                    getDialogResult: () => {
                        return (contributionInstance && contributionInstance.onOkClicked) ? contributionInstance.onOkClicked() : originalValue;
                    },
                    okCallback: function (result) {
                        this.modal = false;
                        callback(result);
                    },
                    close: () => {
                        // delegate to be executed when dialog is closed
                        if (contributionInstance && contributionInstance.onCloseDialog) {
                            contributionInstance.onCloseDialog();
                        }
                    },
                    defaultButton: Utils_String.empty
                };

                dialogService.openDialog(contributionId, dialogOptions, { target: targetName, inputValues: allInputValues, extensionDelegates: taskDelegates }).then((dialog: IExternalDialog) => {

                    dialog.getContributionInstance(contributionId).then((inputEditorInstance: IEditorExtensionInstance) => {
                        if (inputEditorInstance && inputEditorInstance.onOkClicked) {
                            contributionInstance = inputEditorInstance;
                            dialog.updateOkButton(true);
                        } else {
                            dialog.setTitle(Resources.ErrorWhileOpeningEditorExtension);
                            dialog.updateOkButton(false);
                        }
                    }, (error) => {
                        dialog.setTitle(Resources.ErrorWhileOpeningEditorExtension);
                        dialog.updateOkButton(false);
                    });
                });
            });
        };
    }

    private _contributionId: string;
    private _componentMounted: boolean;
}
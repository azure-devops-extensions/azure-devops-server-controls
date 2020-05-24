/// <reference types="react" />

import * as React from "react";

import { EnvironmentsCanvas, IEnvironmentsCanvasState, IEnvironmentsCanvasProps } from "PipelineWorkflow/Scripts/SharedComponents/EnvironmentsCanvas/EnvironmentsCanvas";
import { CreateReleaseEnvironmentNode, ICreateReleaseEnvironmentNodeProps } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseEnvironmentNode";
import { PipelineDefinitionEnvironment, PipelineEnvironment } from "PipelineWorkflow/Scripts/Common/Types";
import { CreateReleasePanelInstances } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/Constants";
import { IEnvironmentTrigger } from "PipelineWorkflow/Scripts/Shared/Utils/ReleaseEnvironmentUtils";
import { ReleaseEnvironmentUtils, ReleaseDialogContentConstants } from "PipelineWorkflow/Scripts/Shared/Utils/ReleaseEnvironmentUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

import { css } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseEnvironmentsCanvas";

export interface ICreateReleaseEnvironmentsCanvasProps extends IEnvironmentsCanvasProps {
    environmentTriggers: IEnvironmentTrigger[];
    onEnvironmentNodeClick: (environmentId: number) => void;
}

export interface ICreateReleaseEnvironmentsCanvasState<P extends PipelineDefinitionEnvironment | PipelineEnvironment> extends IEnvironmentsCanvasState<P> {
}

export class CreateReleaseEnvironmentsCanvas<P extends PipelineDefinitionEnvironment | PipelineEnvironment> extends EnvironmentsCanvas<P, ICreateReleaseEnvironmentsCanvasProps, ICreateReleaseEnvironmentsCanvasState<P>> {

    public render(): JSX.Element {
        return (
            <div className="create-release-environment-canvas-container">
                <div className="create-release-environment-canvas-content">
                    {
                        super.render()
                    }
                </div>
            </div>
        );
    }

    public componentDidMount(): void {
        super.componentDidMount();
        if (this.props.onDidUpdate) {
            this.props.onDidUpdate();
        }
    }

    protected getNodeElement = (key: string, environment: P): JSX.Element => {
        let environmentNodeProps: ICreateReleaseEnvironmentNodeProps;
        const trigger = this._getEnvironmentTrigger(environment.id);
        if (environment) {
            environmentNodeProps = {
                environmentId: environment.id,
                environmentName: environment.name,
                onEnvironmentNodeClick: this.props.onEnvironmentNodeClick,
                ariaLabel: environment.name,
                environmentDescription: this._getEnvironmentDescription(trigger),
                bowtieIcon: this._getEnvironmentNodeIcon(trigger),
                borderCssClass: this._getEnvironmentNodeBorderClass(trigger),
                environmentWarning: this._getWarningMessage(trigger),
                isDisabled: ReleaseEnvironmentUtils.isDeploymentTriggerManual(trigger)
            } as ICreateReleaseEnvironmentNodeProps;
        }
        return <CreateReleaseEnvironmentNode {...environmentNodeProps} />;
    }

    protected getNodeHeightHint = (environmentInstanceId: string): number => {
        return 0;
    }

    private _getEnvironmentNodeIcon(trigger: IEnvironmentTrigger): string {
        if (trigger) {
            if (trigger.selectedTriggerKey === ReleaseDialogContentConstants.EnvironmentTrigger_ManualOptionValueKey) {
                return "bowtie-trigger-user";
            } else {
                return "bowtie-trigger-approval";
            }
        }
        return Utils_String.empty;
    }

    private _getWarningMessage(trigger: IEnvironmentTrigger): string {
        if (trigger) {
            return trigger.warningMessage;
        }
        return Utils_String.empty;
    }

    private _getEnvironmentDescription(trigger: IEnvironmentTrigger): string {
        if (trigger) {
            if (trigger.selectedTriggerKey === ReleaseDialogContentConstants.EnvironmentTrigger_ManualOptionValueKey) {
                if (ReleaseEnvironmentUtils.isDeploymentTriggerManual(trigger)) {
                    return Resources.CreateReleaseManualEnvironmentNodeDescription;
                } else {
                    return Resources.CreateReleaseToggledManualEnvironmentNodeDescription;
                }
            } else {
                return Resources.CreateReleaseAutomatedEnvironmentNodeDescription;
            }
        }
        return Utils_String.empty;
    }

    private _getEnvironmentNodeBorderClass(trigger: IEnvironmentTrigger): string {
        if (trigger) {
            if (ReleaseEnvironmentUtils.isDeploymentTriggerManual(trigger)) {
                return "manual-trigger-environment-node non-clickable-environment-node";
            } else if (trigger.selectedTriggerKey === ReleaseDialogContentConstants.EnvironmentTrigger_ManualOptionValueKey) {
                return "manual-trigger-environment-node";
            } else {
                return "automated-trigger-environment-node";
            }
        }
        return Utils_String.empty;
    }

    private _getEnvironmentTrigger(environmentId: number) {
        let trigger: IEnvironmentTrigger;
        if (this.props.environmentTriggers) {
            trigger = Utils_Array.first(this.props.environmentTriggers, (trigger: IEnvironmentTrigger) => {
                return trigger.environmentId === environmentId;
            });
        }
        return trigger;
    }
}

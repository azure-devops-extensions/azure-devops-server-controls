// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as React from "react";

import { IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { AccordionCustomRenderer, IAccordionCustomRendererInstanceProps } from "DistributedTaskControls/SharedControls/Accordion/AccordionCustomRenderer";
import { RadioInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/RadioInputComponent";

import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { PermissionIndicator } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionIndicator";
import { ISecurityProps } from "PipelineWorkflow/Scripts/SharedComponents/Security/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as RMContracts from "ReleaseManagement/Core/Contracts";
import * as  RMConstants from  "ReleaseManagement/Core/Constants";

import { DeployEnvironmentsPanelActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeployEnvironmentsPanelActionCreator";
import { DeployEnvironmentsPanelActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeployEnvironmentsPanelActions";

export interface ICollapsibleDeploymentOptionSectionProps extends IAccordionCustomRendererInstanceProps {
    definitionEnvironmentId?: number;
    releaseDefinitionFolderPath?: string;
    releaseDefinitionId?: number;
    label: string;
    headingLevel: number;
    description: string;
    deploymentOption: string;
}

export class CollapsibleDeploymentOptionSection extends ComponentBase.Component<ICollapsibleDeploymentOptionSectionProps, ComponentBase.IStateless> {

    public render(): JSX.Element {
        const headerIcon: string = "bowtie-build-queue";
                
        return (
                <AccordionCustomRenderer      
                    label={this.props.label}
                    headingLevel={this.props.headingLevel}
                    addSeparator={true}
                    bowtieIconName={headerIcon}
                    description={this.props.description}
                    initiallyExpanded={this.props.expanded}>
                    
                    {this._getDeploymentOptionSectionContent()}

                </AccordionCustomRenderer>
        );   
    }

    private _getDeploymentOptionSectionContent(): JSX.Element {
        return (
                <RadioInputComponent                
                    label={Resources.DeployOptionRadioLabel}
                    options={this._getDeploymentOptions()}
                    showOptionsVertically={true}
                    onValueChanged={this._onDeploymentOptionChange} />
                );
    }

    private _getDeploymentOptions(): IChoiceGroupOption[] {
        let deploymentOptions: IChoiceGroupOption[] = [];        

        deploymentOptions.push({
            key: RMConstants.RedeploymentDeploymentGroupTargetFilter.None,
            text: Resources.DeploymentOptionTypeAllPhaseTitle,
            checked: this.props.deploymentOption === RMConstants.RedeploymentDeploymentGroupTargetFilter.None 
        } as IChoiceGroupOption);

        deploymentOptions.push({
            key: RMConstants.RedeploymentDeploymentGroupTargetFilter.FailedTargets,
            text: Resources.DeploymentOptionTypeAllPhaseWithFailedTargetsTitle,
            checked: this.props.deploymentOption === RMConstants.RedeploymentDeploymentGroupTargetFilter.FailedTargets
        } as IChoiceGroupOption);               

        return deploymentOptions;
    }

    private _onDeploymentOptionChange = (deploymentOption?: IChoiceGroupOption): void => {
        if (deploymentOption) {
            let actionCreator = ActionCreatorManager.GetActionCreator<DeployEnvironmentsPanelActionCreator>(
                DeployEnvironmentsPanelActionCreator, this.props.instanceId + DeployEnvironmentsPanelActions.SOURCE_KEY_INDIVIDUAL);
            actionCreator.updateDeploymentOption(deploymentOption.key);
        }
    }
}
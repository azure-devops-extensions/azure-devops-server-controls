// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import { Component as BaseComponent, Props as IBaseProps, State as IBaseState } from "VSS/Flux/Component";
import * as Utils_Array from "VSS/Utils/Array";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";

import { PrimaryButton } from "OfficeFabric/components/Button/PrimaryButton/PrimaryButton";
import { TextField } from "OfficeFabric/components/TextField/TextField";

import DTContracts = require("TFS/DistributedTask/Contracts");
import * as DGUtils from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.Common.Utils";
import * as MachineGroupActionCreator from "ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupActionCreator";
import * as Resources from "ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline";
import { MachineGroup as MachineGroupModel } from "ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model";
import { AddTargetGuidance } from "ReleasePipeline/Scripts/Common/Components/AddTargetGuidance";
import { DeploymentGroupReferencesList } from "ReleasePipeline/Scripts/Common/Components/DeploymentGroupReferencesList";
import { ISecurityPermissions } from 'ReleasePipeline/Scripts/MachineGroup/Stores/MachineGroupStore';
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");
import "VSS/LoaderPlugins/Css!RM:ReleasePipeline/Scripts/MachineGroup/Components/MachineGroupDetails";

export interface IMachineGroupDetailsProps extends IBaseProps {
    machineGroup?: MachineGroupModel;
    isNewDeploymentGroup?: boolean;
    updatedMgName?: string;
    updatedMgDescription?: string;
    copyScriptEnabled?: boolean;
    securityPermissions?: ISecurityPermissions;
    pool?: DTContracts.TaskAgentPoolReference;
    isPermissionSet: boolean;
    poolDGReference?: DTContracts.DeploymentGroupReference[];
    removedProjectList: string[];
    handleDeleteDeploymentGroup: (item: DTContracts.DeploymentGroupReference) => void;
    handleUndeleteDeploymentGroup: (item: DTContracts.DeploymentGroupReference) => void;
}

export interface IMachineGroupDetailsState extends IBaseState {
}

export class MachineGroupDetails extends BaseComponent<IMachineGroupDetailsProps, IMachineGroupDetailsState> {
    constructor(props: IMachineGroupDetailsProps) {
        super(props);

        this._machineGroupActionCreator = MachineGroupActionCreator.ActionCreator;
    }

    public render(): JSX.Element {
        let right : JSX.Element = null;
        let createButton : JSX.Element = null;
        let description: JSX.Element = null;
        let updatedDgName: string = this.props.updatedMgName;

        if(!this.props.isNewDeploymentGroup){
            right = <div className="machine-group-script-size-moderator">
                <AddTargetGuidance
                    resourceName={this.props.machineGroup.name}
                    resourceId={this.props.machineGroup.id}
                    resourceType={DGUtils.AddTargetGuidanceResourceTypes.DeploymentGroup}
                    copyScriptEnabled={this.props.copyScriptEnabled}
                    warningMessage={this._getWarningMessage()} />
            </div>;
        }
        else { 
            createButton = <div className="machine-group-buttons">
                <PrimaryButton
                    ariaLabel={Resources.CreateDeploymentGroup}
                    onClick={this._createMachineGroup}
                    disabled={this._isCreateButtonDisabled()} >
                    {Resources.Create}
                </PrimaryButton>
            </div>;
        }

        description = <TextField
            className="machine-group-description-section"
            multiline={true}
            label={Resources.DeploymentGroupDescription}
            value={this.props.updatedMgDescription}
            rows={6}
            maxLength={1024}
            onChanged={this._onMgDescriptionChange} />;

        return (
            <div className="machine-group-details">
                <div className = "machine-group-overview" role = "region" aria-label = {Resources.DeploymentGroupOverview}>
                    <div className = "machine-group-name-section">
                        <TextField
                            className="machine-group-name-section"
                            label={Resources.DeploymentGroupName}
                            value={updatedDgName}
                            placeholder={Resources.SpecifyMachineGroupName}
                            maxLength={128}
                            onChanged={this._onMgNameChange}
                            autoFocus={this.props.isNewDeploymentGroup} />
                    </div>
                    {description}
                    {createButton}
                    {this._agentPoolDetails()}
                    {this._sharedPoolProjectList()}
                </div>
                {right}
            </div>
        );
    }

    private _sharedPoolProjectList(): JSX.Element {
        if(!!this.props.poolDGReference && this.props.poolDGReference.length > 1) {
            return (
                <DeploymentGroupReferencesList items={this._getProjectListItems()} projectListDescription={Resources.SharedProjectListDescription} handleDeleteDeploymentGroup={this.props.handleDeleteDeploymentGroup} handleUndeleteDeploymentGroup={this.props.handleUndeleteDeploymentGroup}/>
            );
        }

        return null;
    }

    private _getProjectListItems(): any[] {
        if(!this.props.poolDGReference){
            return [];
        }
           
        let projectList = this.props.poolDGReference.filter(p=> !(p.id === this.props.machineGroup.deploymentMachineGroup.id));

        return projectList.map((dg: DTContracts.DeploymentGroupReference) => {   
            let isMarkedForDeleted = false;             
            if(!!this.props.removedProjectList){
                isMarkedForDeleted = Utils_Array.contains(this.props.removedProjectList, dg.project.name);
            }
            return {deploymentGroup: dg, isMarkedForDeleted: isMarkedForDeleted}
        });
    }    

    private _agentPoolDetails(): JSX.Element {
        let poolDetails: JSX.Element = null;
        if (!!this.props.pool)
        {
            return (
                    <div className="pool-name-section">
                        <TextField
                        className={"pool-name-textfield"}
                        label={Resources.AgentPoolLabelOnDGDetailsPage}
                        value={this.props.pool.name}
                        disabled={true} />
                        {this._agentPoolSettingsIcon(this.props.pool.id)}
                    </div>
                );
        }

        return poolDetails;
    }

    private _agentPoolSettingsIcon(poolId: number): JSX.Element {
        return (
            <div className="pool-setting-icon-wrapper">
                <a href={RMUtilsCore.UrlHelper.getDeploymentPoolUrl(poolId)} target="_blank" aria-label={Resources.ManageDeploymentPoolAriaLabel} >
                    <VssIcon iconName="Settings" iconType={VssIconType.fabric} className="pool-setting-icon" />
                    {Resources.ManageDeploymentPoolLabel}
                    <span className="bowtie-icon bowtie-navigate-external pool-setting-navigate-external" />
                </a>
            </div>);
    }

    private _onMgNameChange = (newValue: string): void => {
        this._machineGroupActionCreator.modifyMachineGroupName(newValue);
    }

    private _onMgDescriptionChange = (newValue: string): void => {
        this._machineGroupActionCreator.modifyMachineGroupDescription(newValue);
    }

    private _createMachineGroup = () => {
        let poolId: number = this.props.pool ? this.props.pool.id : 0;
        this._machineGroupActionCreator.addMachineGroup(this.props.updatedMgName, this.props.updatedMgDescription, poolId);
    }

    private _isCreateButtonDisabled(): boolean {
        return !this.props.updatedMgName || (this.props.updatedMgName.length === 0) || (/^\s*$/.test(this.props.updatedMgName));
    }

    private _getWarningMessage(): string {
        let permissions = this.props.securityPermissions || {hasDgManagePermission: false, hasDpManagePermission: false};
        if(this.props.isPermissionSet && !permissions.hasDgManagePermission) {
            return Resources.GuidanceForInsufficientPermissionsForDeploymentGroup;
        }
        if(this.props.isPermissionSet && !permissions.hasDpManagePermission) {
            return Resources.GuidanceForInsufficientPermissionsForDeploymentPool;
        }
        return null;
    }

    private _machineGroupActionCreator: MachineGroupActionCreator.MachineGroupActionCreator;
}

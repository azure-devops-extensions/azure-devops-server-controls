// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as React from "react";

import { IPickListSelection } from "VSSUI/PickList";
import * as Utils_Array from "VSS/Utils/Array"

import { TextField } from "OfficeFabric/TextField";

import DTContracts = require("TFS/DistributedTask/Contracts");
import { Component, IProps, IState } from "DistributedTaskControls/Common/Components/Base";
import { UrlUtilities } from "DistributedTaskControls/Common/UrlUtilities";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { DeploymentPoolActionCreator } from"ReleasePipeline/Scripts/DeploymentPools/Actions/DeploymentPoolActionCreator";
import { DeploymentPool as DeploymentPoolModel } from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model";
import { AddTargetGuidance } from "ReleasePipeline/Scripts/Common/Components/AddTargetGuidance";
import { DeploymentGroupReferencesList } from "ReleasePipeline/Scripts/Common/Components/DeploymentGroupReferencesList";
import * as DGUtils from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.Common.Utils";
import * as Resources from "ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline";
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");
import { TeamProjectPickList } from "DistributedTaskControls/Components/TeamProjectPickList";
import "VSS/LoaderPlugins/Css!RM:ReleasePipeline/Scripts/DeploymentPools/Components/DeploymentPoolDetails";

export interface IDeploymentPoolDetailsProps extends IProps {
    deploymentPool: DeploymentPoolModel;
    projectList: string[];
    deploymentGroupReferences?: DTContracts.DeploymentGroupReference[];
    selectedProjectList?: string[];
    removedProjectList?: string[];
    hasManagePermission?: boolean;
    updatedDeploymentPoolName?: string;
    isPermissionSet?: boolean;
    copyScriptEnabled?: boolean;
    handleDeleteDeploymentGroup: (item: DTContracts.DeploymentGroupReference) => void;
    handleUndeleteDeploymentGroup: (item: DTContracts.DeploymentGroupReference) => void;
}

export interface IDeploymentPoolDetailsState extends IState {
}

export class DeploymentPoolDetails extends Component<IDeploymentPoolDetailsProps, IDeploymentPoolDetailsState> {
    constructor(props: IDeploymentPoolDetailsProps) {
        super(props);
        this._deploymentPoolActionCreator = ActionCreatorManager.GetActionCreator<DeploymentPoolActionCreator>(DeploymentPoolActionCreator, this.props.instanceId);
    }

    public render(): JSX.Element {
        let isPoolNameFieldDisabled: boolean = !RMUtilsCore.FeatureFlagUtils.isDeploymentPoolRenameEnabled();
        let poolName: string = this.props.updatedDeploymentPoolName === undefined ? this.props.deploymentPool.name : this.props.updatedDeploymentPoolName;
        let availableProjectsToShare = this.props.projectList.filter(p=> !this.props.deploymentGroupReferences.some(dg => dg.project.name === p));
        return (
            <div className="deploymentpool-details">
                <div className="deploymentpool-details-leftpane">
                    <TextField
                        className="deployment-pool-name-section"
                        label={Resources.Name}
                        value={poolName}
                        maxLength={128}
                        disabled={isPoolNameFieldDisabled}
                        onChanged={this._onPoolNameChanged} />
                    {this._showDeploymentGroupReferences()}
                    {this._showAvailableProjects()}
                </div>
                <AddTargetGuidance
                    cssClass="deploymentpool-details-rightpane"
                    resourceName={this.props.deploymentPool.name}
                    resourceId={this.props.deploymentPool.id}
                    resourceType={DGUtils.AddTargetGuidanceResourceTypes.DeploymentPool}
                    copyScriptEnabled={this.props.copyScriptEnabled}
                    warningMessage={this._getWarningMessage()} />
            </div>
        );
    }

    private _showDeploymentGroupReferences(): JSX.Element {
        if(!!this.props.deploymentGroupReferences && this.props.deploymentGroupReferences.length > 0) {
            return (
                <DeploymentGroupReferencesList items={this._getProjectReferenceItems()} projectListDescription={Resources.DeploymentGroupReferencesDescription} handleDeleteDeploymentGroup={this.props.handleDeleteDeploymentGroup} handleUndeleteDeploymentGroup={this.props.handleUndeleteDeploymentGroup}/>
            );
        }

        return null;
    }

    private _showAvailableProjects(): JSX.Element {
        let availableProjectsToShare = this.props.projectList.filter(p=> !this.props.deploymentGroupReferences.some(dg => dg.project.name === p));
        if(availableProjectsToShare.length > 0) {
            return (
                <div>
                    <span className="available-projects-description">{Resources.DeploymentPoolProjectDescription}</span>
                    <TeamProjectPickList items={availableProjectsToShare} selectedProjectList={this.props.selectedProjectList} onSelectionChanged={this._onSelectedProjectListModified} />                        
                </div>
            );
    }
        return null;
    }
    
    private _getWarningMessage(): string {
        if(this.props.isPermissionSet && !this.props.hasManagePermission) {
            return Resources.GuidanceForInsufficientPermissionsForDeploymentPool;
        }
        return null;
    }

    private _onPoolNameChanged = (newName: string): void => {
        this._deploymentPoolActionCreator.modifyDeploymentPoolName(newName);
    }

    private _onSelectedProjectListModified = (selection: IPickListSelection): void => {
        const selectedItems = selection.selectedItems;
        var selectedProjects: string[] = [];
        for(var selectedItem of selectedItems) {
            selectedProjects.push(selectedItem);
        }
        this._deploymentPoolActionCreator.updateSelectedProjectList(selectedProjects);
    }

    private _onRemovedProjectListModified = (selection: IPickListSelection): void => {
        const selectedItems = selection.selectedItems;
        var removedProjects: string[] = [];
        for(var selectedItem of selectedItems) {
            removedProjects.push(selectedItem);
        }
        this._deploymentPoolActionCreator.updateRemovedProjectList(removedProjects);
    }

    private _getProjectReferenceItems(): any[] {
        if(!this.props.deploymentGroupReferences){
            return [];
        }
        return this.props.deploymentGroupReferences.map((dg: DTContracts.DeploymentGroupReference) => {
            let isMarkedForDeleted = Utils_Array.contains(this.props.removedProjectList, dg.project.name);
            return {deploymentGroup: dg, isMarkedForDeleted: isMarkedForDeleted}
        });
    }

    private _deploymentPoolActionCreator: DeploymentPoolActionCreator;
}
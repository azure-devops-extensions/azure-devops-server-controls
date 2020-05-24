// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as React from "react";

import Component_Base = require("VSS/Flux/Component");
import * as Utils_String from "VSS/Utils/String";
import { VssDetailsList } from "VSSUI/VssDetailsList";

import { Component, IProps, IState } from "DistributedTaskControls/Common/Components/Base";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";

import { IColumn, CheckboxVisibility, DetailsListLayoutMode, ConstrainMode } from "OfficeFabric/DetailsList";
import { IconButton, IButton } from "OfficeFabric/Button";
import { TooltipHost } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";

import DTContracts = require("TFS/DistributedTask/Contracts");
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");
import { DeploymentGroupReferenceData } from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model";

export interface Props extends Component_Base.Props {
    items: DeploymentGroupReferenceData[];
    projectListDescription:string;
    handleUndeleteDeploymentGroup: (item: DTContracts.DeploymentGroupReference) => void;
    handleDeleteDeploymentGroup: (item: DTContracts.DeploymentGroupReference) => void;
}

export interface State extends Component_Base.State {
    elementToFocus?: number;
}


export class DeploymentGroupReferencesList extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { elementToFocus: -1 };
        this._dgRefDeleteButton = new Array();
    }

    public render(): JSX.Element {
        return (
            <div className= "deployment-group-references-wrapper">
                <span className="deployment-group-reference-description">{this.props.projectListDescription}</span>
                <VssDetailsList
                    className="project-references-list"
                    items={this.props.items}
                    constrainMode={ConstrainMode.unconstrained}
                    layoutMode={DetailsListLayoutMode.justified}
                    columns={this._getColumns()}
                    ariaLabelForGrid={Resources.DeploymentPoolProjectReferences}
                    isHeaderVisible = {false}
                    onRenderItemColumn={this._onRenderCell}
                    checkboxVisibility={CheckboxVisibility.hidden}/>
            </div>
        );
    }

    public componentDidUpdate() {
        let state = this._getState();
        let index = state.elementToFocus;

        if(index != -1) {
            this._dgRefDeleteButton[index].focus();
            state.elementToFocus = -1;
            this.setState(state);
        }
    }

    private _getColumns(): IColumn[] {
    return [
        {
            key: "projectName",
            name: Resources.Name,
            fieldName: Resources.Name,
            minWidth: 250,
            maxWidth: 350
        }]
    }

    private _onRenderCell = (item: DeploymentGroupReferenceData, index: number | undefined): JSX.Element => {
        let textClassName = "project-reference-name";
        let deleteButton: JSX.Element = null;
        let dgRef = item.deploymentGroup;
        if(item.isMarkedForDeleted){
            textClassName = "project-reference-name deleted";
            deleteButton =  (<IconButton
                className = {"project-reference-delete-button"}
                componentRef={elem => this._dgRefDeleteButton[index] = elem}
                onClick={() => this._onUnDelete(item, index)}
                iconProps={{ iconName: "Undo"}}
                ariaLabel={Resources.UndoDeleteMachineGroup}/>);
        }
        else{
            deleteButton =  (<IconButton
                className = {"project-reference-delete-button"}
                componentRef={elem => this._dgRefDeleteButton[index] = elem}
                onClick={() => this._onDelete(item, index)}
                iconProps={{ iconName: "Delete" }}
                ariaLabel={Resources.DeleteMachineGroupText}/>);
        }
        return (
            <div className="project-reference-name-section">
                    <TooltipHost
                        key={dgRef.id}
                        content={Utils_String.format(Resources.ViewDeploymentGroupToolTip, dgRef.name)}
                        directionalHint= {DirectionalHint.bottomLeftEdge}>
                        <a href={RMUtilsCore.UrlHelper.getDeploymentGroupPageUrl(dgRef.id, dgRef.project.id)} target="_blank" className={textClassName} aria-label={ Utils_String.format(Resources.ViewDeploymentGroupToolTip, dgRef.name) }>{dgRef.project.name}</a>
                    </TooltipHost>
                {deleteButton}                
          </div>
        );
    }

    private _onDelete(item: DeploymentGroupReferenceData, index: number) {
        let state = this._getState();
        state.elementToFocus = index;
        this.setState(state); 
        this.props.handleDeleteDeploymentGroup(item.deploymentGroup);
    }

    private _onUnDelete(item: DeploymentGroupReferenceData, index: number) {
        let state = this._getState();
        state.elementToFocus = index;
        this.setState(state); 
        this.props.handleUndeleteDeploymentGroup(item.deploymentGroup);
    }
    
    private _getState(): State {
        return this.state || { elementToFocus: -1 };
    }

    private _dgRefDeleteButton: IButton[];
}
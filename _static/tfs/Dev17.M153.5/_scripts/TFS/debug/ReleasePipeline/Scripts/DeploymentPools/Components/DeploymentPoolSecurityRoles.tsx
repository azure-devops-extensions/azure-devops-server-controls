// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");

import Component_Base = require("VSS/Flux/Component");
import Navigation_Services = require("VSS/Navigation/Services");
import VSS_WebApi_Constants = require("VSS/WebApi/Constants");
import Utils_String = require("VSS/Utils/String");
import { RoleAssignmentControl, IRoleAssignmentProps } from "VSSPreview/Flux/Components/RoleAssignmentControl";
import { ModalDialogO, IModalDialogOptions } from "VSS/Controls/Dialogs";

import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import TFS_Host_TfsContext = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Host.TfsContext");
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");

export interface State extends Component_Base.State {
}

export interface Props extends Component_Base.Props {
    deploymentPoolId?: number
}

export interface ISecurityDialogOptions extends IModalDialogOptions {
    deploymentPoolId?: number
    name?: string
}

export class SecurityDialog extends ModalDialogO<ISecurityDialogOptions> {
    public initializeOptions(options?: ISecurityDialogOptions) {
        this._itemId = options.deploymentPoolId;
        this._name = options.name;

        super.initializeOptions($.extend({
            width: 800,
            height: 450,
            title: this._getTitle(),
            buttons: null
        }, options));
    }

    public initialize() {
        super.initialize();
        var component = ReactDOM.render(<SecurityRoles deploymentPoolId={this._itemId} />, this._element[0]) as SecurityRoles;
        this.updateOkButton(true);
    }

    public close(): void {
        ReactDOM.unmountComponentAtNode(this._element[0]);
        super.close();
    }

    private _getTitle(): string {
        if(this._name) {
            return Utils_String.localeFormat(Resources.DeploymentPoolSecurityDialogTitle, this._name);
        }
        return Resources.DeploymentPoolsSecurityDialogTitle;
    }

    private _name: string;
    private _itemId: number;
}

export class SecurityRoles extends Component_Base.Component<Props, State> {
    constructor(props: Props) {
        super(props);
    }

    public render(): JSX.Element {
        return (<div className="security-roles" ref={ (d) => this._containerElement = d } role = "region" aria-label = {Resources.Security}/>);
    }

    public componentDidMount(): void {
        this._createRoleAssignmentControl();
    }

    public componentWillUnmount(): void {
        ReactDOM.unmountComponentAtNode(this._containerElement);
    }

    private _createRoleAssignmentControl() {
        let $element = $(this._containerElement);

        var gridWidth = $element.innerWidth() - 50;
        var gridSizeSetting = {
            userCellWidth: .5 * gridWidth,
            roleCellWidth: .2 * gridWidth,
            accessCellWidth: .2 * gridWidth,
            removeCellWidth: .08 * gridWidth
        };
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var resourceId = this.props.deploymentPoolId ? this.props.deploymentPoolId.toString() : "0";
        var scopeId = scopeId = this.props.deploymentPoolId ? this._deploymentPoolRoleScopeId : this._globalDeploymentPoolRoleScopeId;
        RMUtilsCore.SecurityHelper.hasDeploymentPoolPermission(this.props.deploymentPoolId, SecurityRoles._manageRolesPermission).then((hasPermission: boolean) => {
            ReactDOM.render(
                <RoleAssignmentControl
                    serviceInstanceId={VSS_WebApi_Constants.ServiceInstanceTypes.TFS}
                    userId={tfsContext.currentIdentity.id}
                    resourceId={resourceId}
                    scopeId={scopeId}
                    manageRolesPermission={SecurityRoles._manageRolesPermission}
                    noPermissionMessage={Resources.DeploymentPoolRoleAssignmentsPermissionDeniedMessage}
                    canEdit={hasPermission}
                    canInherit={this.props.deploymentPoolId ? true : false}
                    gridSizeSetting={gridSizeSetting}
                    showAvatars={true}
                    formAvatarUrl={(id: string) => {
                        return tfsContext.getActionUrl("GetDdsAvatar", "common", {
                            id: id,
                            area: "api",
                        });
                    }}
                />,
                this._containerElement);
        });
    }

    private _containerElement: HTMLElement;

    private static _manageRolesPermission = 8;
    private _deploymentPoolRoleScopeId = "distributedtask.deploymentpoolrole";
    private _globalDeploymentPoolRoleScopeId = "distributedtask.globaldeploymentpoolrole";
}

/// <reference types="jquery" />



import ko = require("knockout");
import React = require("react");
import ReactDOM = require("react-dom");

import AdminCommon = require("Admin/Scripts/TFS.Admin.Common");
import AdminDialogs = require("Admin/Scripts/TFS.Admin.Dialogs");

import BuildAdminControls = require("Build/Scripts/Controls.Admin");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");

import DistributedTaskApi = require("TFS/DistributedTask/TaskAgentRestClient");
import TaskUtils = require("DistributedTasksCommon/TFS.Tasks.Utils");

import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Grids = require("VSS/Controls/Grids");
import Knockout_Adapters = require("VSS/Adapters/Knockout");
import Locations = require("VSS/Locations");
import Navigation = require("VSS/Controls/Navigation");
import Service = require("VSS/Service");
import { RoleAssignmentControl } from "VSSPreview/Flux/Components/RoleAssignmentControl";

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import VSS_WebApi_Constants = require("VSS/WebApi/Constants");

var domElem = Utils_UI.domElem;
var TfsContext = TFS_Host_TfsContext.TfsContext;
var AgentPoolRoleScopeId = "distributedtask.agentpoolrole";
var AgentQueueRoleScopeId = "distributedtask.agentqueuerole";
var GlobalAgentPoolRoleScopeId = "distributedtask.globalagentpoolrole";
var GlobalAgentQueueRoleScopeId = "distributedtask.globalagentqueuerole";
var ManagePermission = 8;

export enum RoleType {
    Pool = 1,
    Queue = 2
}

export class AdminRolesTab extends Navigation.NavigationViewTab {
    private _roleAssignmentControl: React.Component<any, any>;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    public initialize() {
        super.initialize();
        this._tfsContext = TfsContext.getDefault();
    }

    /**
     * Called whenever navigation occurs with this tab as the selected tab
     * @param rawState The raw/unprocessed hash/url state parameters (string key/value pairs)
     * @param parsedState Resolved state objects parsed by the view
     */
    public onNavigate(rawState: any, parsedState: any) {
        var title: string = "";
        var poolId = <number>parsedState.poolId;
        var queueId = <number>parsedState.queueId;
        var roleType = <RoleType>parsedState.roleType;
        var scopeId: string = null;
        var resourceId: string = null;
        var resourceName: string = null;
        var noPermissionsMessage: string = null;
        var canEdit: boolean = true;
        var canInherit:boolean = false;

        if (roleType === RoleType.Pool) {
            TaskUtils.SecurityHelper.hasAgentPoolPermission(poolId, ManagePermission).then((hasPermission: boolean) => {
                canEdit = hasPermission;
                canInherit = poolId ? true : false;
                resourceId = poolId ? poolId.toString() : "0";
                scopeId = poolId ? AgentPoolRoleScopeId : GlobalAgentPoolRoleScopeId;
                noPermissionsMessage = BuildResources.PoolRoleAssignmentsPermissionDeniedMessage;

                if (parsedState.pool) {
                    title = Utils_String.format(BuildResources.PoolRolesTitleFormat, parsedState.pool.name);
                    resourceName = parsedState.pool.name;
                } else {
                    title = Utils_String.format(BuildResources.PoolRolesRootTitle);
                }
                this._showRoles(resourceId, resourceName, scopeId, noPermissionsMessage, title, canEdit, canInherit);
            });
        } else if (roleType === RoleType.Queue) {
            var tfsContext = this._options.tfsContext || TfsContext.getDefault();
            TaskUtils.SecurityHelper.hasAgentQueuePermission(tfsContext.contextData.project.id, queueId, ManagePermission).then((hasPermission: boolean) => {
                canEdit = hasPermission;
                canInherit = queueId ? true : false;
                resourceId = Utils_String.format("{0}_{1}", tfsContext.contextData.project.id, queueId);
                scopeId = queueId ? AgentQueueRoleScopeId : GlobalAgentQueueRoleScopeId;
                noPermissionsMessage = BuildResources.QueueRoleAssignmentsPermissionDeniedMessage;

                if (parsedState.queue) {
                    title = Utils_String.format(BuildResources.QueueRolesTitleFormat, parsedState.queue.name);
                    resourceName = parsedState.queue.name;
                } else {
                    title = Utils_String.format(BuildResources.QueueRolesRootTitle);
                }

                this._showRoles(resourceId, resourceName, scopeId, noPermissionsMessage, title, canEdit, canInherit);
            });
        }
    }

    private _showRoles(resourceId: string, resourceName: string, scopeId: string, noPermissionsMessage: string, title: string, canEdit: boolean, canInherit: boolean): void {
        if (this._roleAssignmentControl) {
            ReactDOM.unmountComponentAtNode(this._element[0]);
            this._roleAssignmentControl = null;
        }

        var gridWidth = this._element.innerWidth() - 5;

        this._roleAssignmentControl = ReactDOM.render(
            React.createElement(
                RoleAssignmentControl, 
                { 
                    serviceInstanceId: VSS_WebApi_Constants.ServiceInstanceTypes.TFS,
                    userId: this._tfsContext.currentIdentity.id,
                    resourceId: resourceId,
                    resourceName: resourceName,
                    scopeId: scopeId,
                    manageRolesPermission: ManagePermission,
                    noPermissionMessage: noPermissionsMessage,
                    canEdit: canEdit,
                    canInherit: canInherit,
                    gridSizeSetting: {
                        userCellWidth: .3 * gridWidth,
                        roleCellWidth: .1 * gridWidth,
                        accessCellWidth: .1 * gridWidth,
                        removeCellWidth: .09 * gridWidth
                    },
                    showAvatars: true,
                    formAvatarUrl: (id: string) => {
                        return this._tfsContext.getActionUrl("GetDdsAvatar", "common", {
                            id: id,
                            area: "api",
                        } as TFS_Host_TfsContext.IRouteData);
                    }
                }),
            this._element[0]);

        this._options.navigationView.setViewTitle(title);
    }
}

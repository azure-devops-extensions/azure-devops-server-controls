import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { MessageBarType } from "OfficeFabric/MessageBar";

import { CommonConstants } from "PipelineWorkflow/Scripts/Common/Constants";
import { DefinitionsActionsCreatorKeys, MessageBarParentKeyConstants } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { DashboardsActionsHub } from "PipelineWorkflow/Scripts/Definitions/Dashboards/DashboardsActions";
import { PermissionHelper, IPermissionCollection } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";

import * as Context from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Context";

import { DashboardGroup, DashboardGroupEntry, TeamDashboardPermission } from "TFS/Dashboards/Contracts";

import * as VSSContext from "VSS/Context";
import { logError } from "VSS/Diag";
import { PermissionEvaluationBatch } from "VSS/Security/Contracts";
import { getService as getUserClaimsService, UserClaims } from "VSS/User/Services";

export class DashboardsActionsCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return DefinitionsActionsCreatorKeys.ActionCreatorKey_DashboardsActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._dashboardActions = ActionsHubManager.GetActionsHub<DashboardsActionsHub>(DashboardsActionsHub);
        this._messageHandlerActionCreator = ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);
    }

    public updateDashboardEntries(): void {
        let webContext = VSSContext.getDefaultWebContext();
        // TODO - replace it with the correct dashboard permission. We need to find out the correct token
        if (getUserClaimsService().hasClaim(UserClaims.Member) && !!webContext.team) {
            Context.serviceContext.dashboardManager().beginGetDashboardGroup(webContext.team.id, webContext.project.id)
                .then((groupResponse: DashboardGroup) => {
                    if (groupResponse && groupResponse.dashboardEntries) {
                        this._dashboardActions.updateDashboardEntries.invoke(groupResponse.dashboardEntries);
                        this._updateDashboardPermissions(groupResponse.dashboardEntries);
                    }
                },
                    (error) => {
                        // No need to show error message to the user here. If this call fails, the user will
                        // not be able to add a release definition as dashboard entry. This should not be shown 
                        // as a message on release definitions page. 
                        logError(this._getErrorMessage(error));
                    });
        }
    }

    private _updateDashboardPermissions(dashboardEntries: DashboardGroupEntry[]): void {
        if (!dashboardEntries || dashboardEntries.length === 0) {
            return;
        }

        let permissionsBatch: PermissionEvaluationBatch = {
            alwaysAllowAdministrators: true,
            evaluations: []
        };

        dashboardEntries.forEach((dashboard: DashboardGroupEntry) => {
            permissionsBatch.evaluations.push({
                securityNamespaceId: CommonConstants.SecurityNameSpaceIdForDashboards,
                token: PermissionHelper.createDashBoardToken(dashboard),
                permissions: TeamDashboardPermission.Edit,
                value: false
            });
        });

        PermissionHelper.fetchPermissions(permissionsBatch)
            .then((permissionsCollection: IPermissionCollection) => {
                this._dashboardActions.updateDashboardPermissions.invoke(permissionsCollection);
            },
                (error) => {
                    this._handleError(error);
                });
    }

    private _handleError(error: string): void {
        let errorMessage: string = this._getErrorMessage(error);
        if (errorMessage) {
            logError(errorMessage);
            this._messageHandlerActionCreator.addMessage(MessageBarParentKeyConstants.DefinitionsHubErrorMessageBarKey, errorMessage, MessageBarType.error);
        }
    }

    private _getErrorMessage(error): string {
        if (!error) {
            return null;
        }
        return error.message || error;
    }

    private _messageHandlerActionCreator: MessageHandlerActionsCreator;
    private _dashboardActions: DashboardsActionsHub;
}
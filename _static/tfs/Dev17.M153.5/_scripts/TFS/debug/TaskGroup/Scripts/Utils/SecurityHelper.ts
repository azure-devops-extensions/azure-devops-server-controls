// Copyright (c) Microsoft Corporation.  All rights reserved.

import "VSS/SDK/VSS.SDK";

import * as VSSLib from "VSS/VSS";
import * as VssContext from "VSS/Context";
import * as Dialogs from "VSS/Controls/Dialogs";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Utils_String from "VSS/Utils/String";

import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";

import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";
import { ContributionIds } from "TaskGroup/Scripts/Common/Constants";

// This is required because Spliiter.ts in not used in TFS.Admin.Security which imports Splitter.scss
import "VSS/LoaderPlugins/Css!Splitter";

export interface ISecurityOptions {
    permissionSet: string;
    separator: string;
    projectGuid: string;
}

export interface ISecurityParameters {
    resourceName: string;
    projectId: string;
    permissionSet: string;
    token: string;
}

export class SecurityOptions {
    public static getMetaTaskOptions(): ISecurityOptions {
        if (!SecurityOptions._metaTaskOptions) {
            SecurityOptions._metaTaskOptions = {
                permissionSet: "f6a4de49-dbe2-4704-86dc-f8ec1a294436",
                separator: "/",
                projectGuid: VssContext.getDefaultWebContext().project.id
            };
        }

        return SecurityOptions._metaTaskOptions;
    }

    private static _options: ISecurityOptions;
    private static _metaTaskOptions: ISecurityOptions;
}

class ExternalSecurityDialog {
    public static showDialog(options: any) {
        SDK_Shim.VSS.getService(ContributionIds.SecurityService).then((dialogService: IHostDialogService) => {
            const contributionId = ContributionIds.SecurityControl;

            // Show dialog
            const dialogOptions: IHostDialogOptions = {
                width: 780,
                height: 500,
                title: options.title,
                resizable: true,
                modal: true,
                cssClass: "admin-dialog external-admin-dialog external-dialog",
                cancelText: Resources.DialogCancelButtonText,
                urlReplacementObject: JQueryWrapper.extend({
                    useApiUrl: true,
                    permissionSet: options.params.permissionSet,
                    token: options.params.token,
                    style: "minControl"
                }, VssContext.getDefaultWebContext())
            };

            dialogService.openDialog(contributionId, dialogOptions);
        });
    }
}

export class SecurityUtils {
    public static showSecurityDialog(parameters: ISecurityParameters) {

        const token = parameters.projectId + (parameters.token ? "/" + parameters.token : "");
        const params = {
            useApiUrl: true,
            permissionSet: parameters.permissionSet,
            token: token,
            tokenDisplayValue: parameters.resourceName
        };
        if (VSS.ServiceIds && SecurityUtils.isServiceContributionEnabled()) {
            ExternalSecurityDialog.showDialog({
                params: params,
                title: Utils_String.localeFormat(Resources.PermissionsForText, parameters.resourceName)
            });
        }
        else {
            VSSLib.using(["Admin/Scripts/TFS.Admin.Security"], (_TFS_Admin_Security: any) => {
                if (!SecurityUtils._securityManager) {
                    SecurityUtils._securityManager = _TFS_Admin_Security.SecurityManager.create(parameters.permissionSet, {
                        scope: parameters.projectId
                    });
                }

                SecurityUtils._securityManager.showPermissions(parameters.token, parameters.resourceName);
            });
        }

    }

    private static isServiceContributionEnabled(): boolean {
        // Bug 1067974
        return false;
    }

    private static _securityManager;
}

export function showSecurityDialogForTaskGroup(taskGroupId: string, parentTaskGroupId: string, taskGroupName: string): void {
    let token = taskGroupId;
    const parentDefinitionId = parentTaskGroupId;
    if (parentDefinitionId && parentDefinitionId !== Utils_String.EmptyGuidString) {
        // namespaceSeparator is '/'
        token = Utils_String.format("{0}/{1}", parentDefinitionId, taskGroupId);
    }

    const parameters: ISecurityParameters = {
        resourceName: taskGroupName,
        token: token,
        projectId: VssContext.getDefaultWebContext().project.id,
        permissionSet: SecurityOptions.getMetaTaskOptions().permissionSet
    };

    SecurityUtils.showSecurityDialog(parameters);
}

export function showSecurityDialogForAllTaskGroups(): void {

    const parameters: ISecurityParameters = {
        resourceName: VssContext.getDefaultWebContext().project.name,
        token: null,
        projectId: VssContext.getDefaultWebContext().project.id,
        permissionSet: SecurityOptions.getMetaTaskOptions().permissionSet
    };

    SecurityUtils.showSecurityDialog(parameters);
}
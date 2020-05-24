import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";

import { FeatureFlagUtils} from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core";
import { AllDefinitionsContentKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { CommonConstants } from "PipelineWorkflow/Scripts/Common/Constants";
import { FolderUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/FolderUtils";
import * as SecurityDialog_TypeOnly from "ReleasePipeline/Scripts/TFS.ReleaseManagement.SecurityDialog";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { getDefaultWebContext} from "VSS/Context";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";
import * as VssContext from "VSS/Context";
import { using } from "VSS/VSS";

/**
 * Helper class which contains some utils method for security
 */
export class SecurityUtils {

    public static openFolderSecurityDialog(folderPath: string): void {
        let securityToken = SecurityUtils.createFolderPathSecurityToken(folderPath);

        let parameters = {
            resourceName: FolderUtils.getFolderDisplayName(folderPath),
            token: securityToken,
            projectId: VssContext.getDefaultWebContext().project.id,
            permissionSet: CommonConstants.SecurityNameSpaceIdForReleaseManagement,
        };

        VSS.using(["ReleasePipeline/Scripts/TFS.ReleaseManagement.SecurityDialog"], (SecurityDialog: typeof SecurityDialog_TypeOnly) => {

            return SecurityDialog.SecurityHelper.showSecurityDialog(parameters);
        });
    }

    public static openDefinitionSecurityDialog(definitionId: number, definitionName: string, folderPath: string): void {
        let securityToken = SecurityUtils.createDefinitionSecurityToken(folderPath, definitionId);

        let parameters = {
            resourceName: definitionName,
            token: securityToken,
            projectId: VssContext.getDefaultWebContext().project.id,
            permissionSet: CommonConstants.SecurityNameSpaceIdForReleaseManagement,
        };

        VSS.using(["ReleasePipeline/Scripts/TFS.ReleaseManagement.SecurityDialog"], (SecurityDialog: typeof SecurityDialog_TypeOnly) => {

            return SecurityDialog.SecurityHelper.showSecurityDialog(parameters);
        });
    }

    public static showSecurityDialog(releaseDefinitionFolderPath: string, releaseDefinitionId: number, environmentId: number, environmentName: string) {
        let webContext: WebContext = getDefaultWebContext();
        const projectId: string = webContext ? webContext.project.id : null;
        const token = SecurityUtils.createEnvironmentSecurityToken(releaseDefinitionFolderPath, releaseDefinitionId, environmentId);

        if (projectId) {
            let generatedToken = projectId + (token ? SecurityUtils._separator + token : Utils_String.empty);
            let params = {
                useApiUrl: true,
                permissionSet: SecurityUtils._permissionSet,
                token: generatedToken,
                tokenDisplayValue: environmentName
            };

            SecurityUtils._showExternalSecurityDialog({
                params: params,
                title: Utils_String.localeFormat(Resources.SecurityDialogPermissionText, environmentName)
            });
        }
    }
    
    public static getCompleteSecurityToken(token: string): string {
        // Prepending the token with projectId to construct the complete security token
        let requestContext = VssContext.getDefaultWebContext();

        return !token
        ? requestContext.project.id 
        : Utils_String.format(this._completeSecurityTokenFormat, requestContext.project.id, token);
    }

    public static getCompleteSecurityTokenForDefinition(definitionPath: string, definitionId: number): string {
        return SecurityUtils.getCompleteSecurityToken(SecurityUtils.createDefinitionSecurityToken(definitionPath, definitionId));
    }

    public static createCompleteDefinitionSecurityToken(projectId: string, releaseDefinitionFolderPath: string, releaseDefinitionId: number): string {
        return Utils_String.format(this._completeSecurityTokenFormat, projectId, SecurityUtils.createDefinitionSecurityToken(releaseDefinitionFolderPath, releaseDefinitionId));
    }

    public static createCompleteEnvironmentSecurityToken(projectId: string, releaseDefinitionFolderPath: string, releaseDefinitionId: number, environmentDefinitionId: number): string {
        return Utils_String.format(this._completeSecurityTokenFormat, projectId, SecurityUtils.createEnvironmentSecurityToken(releaseDefinitionFolderPath, releaseDefinitionId, environmentDefinitionId));
    }

    public static createFolderPathSecurityToken(folderPath: string): string {
        if (FolderUtils.isRootPath(folderPath)) {
            return Utils_String.empty;
        }

        // Folder path is of format: "\\folder1\\folder2"
        // It should be converted to: folder1/folder2 for it to be a valid token
        let securityToken = Utils_String.startsWith(folderPath, AllDefinitionsContentKeys.PathSeparator, Utils_String.ignoreCaseComparer)
                            ? folderPath.substring(1)
                            : folderPath;
        securityToken = securityToken.split(AllDefinitionsContentKeys.PathSeparator).join(SecurityUtils._separator);

        return securityToken;
    }

    public static createDefinitionSecurityToken(releaseDefinitionFolderPath: string, releaseDefinitionId: number): string {
        let securityToken;
        if (FolderUtils.isRootPath(releaseDefinitionFolderPath)) {
            securityToken = releaseDefinitionId.toString();
        } else {
            securityToken = SecurityUtils.createFolderPathSecurityToken(releaseDefinitionFolderPath) + SecurityUtils._separator + releaseDefinitionId;
        }

        return securityToken;
    }

    public static createEnvironmentSecurityToken(releaseDefinitionFolderPath: string, releaseDefinitionId: number, environmentId: number): string {
        return Utils_String.format(SecurityUtils._environmentSecurityTokenFormat, SecurityUtils.createDefinitionSecurityToken(releaseDefinitionFolderPath, releaseDefinitionId), environmentId);
    }

    private static _showExternalSecurityDialog(options: any) {
        SDK_Shim.VSS.getService(SecurityUtils._dialogServiceId).then((dialogService: IHostDialogService) => {

            // Show dialog
            let dialogOptions: IHostDialogOptions = {
                width: 800,
                height: 650,
                title: options.title,
                resizable: true,
                modal: true,
                cssClass: "admin-dialog external-admin-dialog external-dialog",
                cancelText: Resources.CancelText
            };

            let contributionConfig = JQueryWrapper.extend({ style: "minControl" }, options.params);
            dialogService.openDialog(SecurityUtils._securityControlContributionId, dialogOptions, contributionConfig);
        });
    }

    static _permissionSet: string = "c788c23e-1b46-4162-8f5e-d7585343b5de";
    static _separator: string = "/";
    static _environmentSecurityTokenFormat: string = "{0}/Environment/{1}";
    static _completeSecurityTokenFormat: string = "{0}/{1}";
    static _dialogServiceId: string = "ms.vss-web.dialog-service";
    static _securityControlContributionId: string = "ms.vss-admin-web.security-control";
}
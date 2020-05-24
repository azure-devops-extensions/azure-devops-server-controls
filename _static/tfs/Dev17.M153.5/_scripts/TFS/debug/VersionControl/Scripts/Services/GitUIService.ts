import Q = require("q");

import * as VSS from "VSS/VSS";
import * as StringUtils from "VSS/Utils/String";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import VCLazyDialog = require("VersionControl/Scripts/Controls/LazyDialog");
import _VCCreateBranchDialog = require("VersionControl/Scripts/Controls/CreateBranchDialog");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCService = require("VersionControl/Scripts/Services/Service");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import { queueModulePreload } from "VersionControl/Scripts/DeferredJobQueue";
import { calculateGitSecuredToken } from "VersionControl/Scripts/Utils/GitSecuredUtils";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import TFS_Admin_Security_NO_REQUIRE = require("Admin/Scripts/TFS.Admin.Security");

export interface ICreateBranchOptions {
    sourceRef?: VCSpecs.IGitRefVersionSpec;
    suggestedFriendlyName?: string;
    suggestedWorkItemsIds?: number[];
    suggestedProjectName?: string;
    suggestedProjectId?: string;
}

export interface ICreateBranchResult {
    createPullRequest?: boolean;
    repositoryContext?: GitRepositoryContext;
    selectedFriendlyName: string | undefined;
    cancelled?: boolean;
    newObjectId?: string;
    selectedWorkItemsIds?: number[];
    switchToBranch?: boolean;
    error?: Error;
}

export interface IGitUIService {
    createBranch(options: ICreateBranchOptions): IPromise<ICreateBranchResult>;
    navigateToBranch(branchResult: ICreateBranchResult, currentProjectName?: string): void;
    showBranchSecurityPermissions(branchName: string, projectGuid: string, repositoryPermissionSet: string): void;
}

export function getGitUIService(repositoryContext: GitRepositoryContext): IGitUIService {
    return VCService.getRepositoryService(Implementation.GitUIService, repositoryContext);
}

module Implementation {
    queueModulePreload("VersionControl/Scripts/Controls/CreateBranchDialog");

    export class GitUIService implements IGitUIService {
        constructor(private repositoryContext: GitRepositoryContext) {
        }

        public createBranch(options: ICreateBranchOptions): IPromise<ICreateBranchResult> {
            let isResolved = false;
            const dialogResult = Q.defer<ICreateBranchResult>();

            VCLazyDialog.show<_VCCreateBranchDialog.CreateBranchFromVersionSpecDialog>(
                "VersionControl/Scripts/Controls/CreateBranchDialog",
                (scriptType: typeof _VCCreateBranchDialog) => scriptType.CreateBranchFromVersionSpecDialog,
                {
                    title: VCResources.CreateBranchDialogTitle,
                    width: 560,
                    draggable: true,
                    repositoryContext: this.repositoryContext,
                    sourceVersionSpec: options.sourceRef,
                    branchName: options.suggestedFriendlyName,
                    workItemIdsToShow: options.suggestedWorkItemsIds,
                    projectName: options.suggestedProjectName,
                    projectId: options.suggestedProjectId,
                    okCallback: (createBranchParams: VCControlsCommon.CreateBranchParameters) => {
                        dialogResult.resolve(<ICreateBranchResult>{
                            selectedFriendlyName: createBranchParams.branchName,
                            newObjectId: createBranchParams.newObjectId,
                            switchToBranch: createBranchParams.switchToBranch,
                            createPullRequest: createBranchParams.createPullRequest,
                            repositoryContext: createBranchParams.repositoryContext,
                            selectedWorkItemsIds: createBranchParams.workItemIdsToLink,
                            error: createBranchParams.error
                        });
                        isResolved = true;
                    },
                    close: () =>
                        !isResolved &&
                        dialogResult.resolve({
                            selectedFriendlyName: undefined,
                            cancelled: true,
                        } as ICreateBranchResult),
                }
            );

            return dialogResult.promise;
        }

        public navigateToBranch(branchResult: ICreateBranchResult, currentProjectName?: string): void {
            if (branchResult && !branchResult.cancelled) {
                const newBranchSpec = new VCSpecs.GitBranchVersionSpec(branchResult.selectedFriendlyName);
                window.top.location.href = VersionControlUrls.getExplorerUrl(branchResult.repositoryContext, null, null, { version: newBranchSpec.toVersionString() }, currentProjectName ? { project: currentProjectName } : null);
            }
        }

        public showBranchSecurityPermissions(branchName: string, projectGuid: string, repositoryPermissionSet: string) {
            VSS.using(["Admin/Scripts/TFS.Admin.Security"], (_TFS_Admin_Security: typeof TFS_Admin_Security_NO_REQUIRE) => {

                const branchesSecurityManager = _TFS_Admin_Security.SecurityManager.create(repositoryPermissionSet, {
                    projectGuid: projectGuid
                });

                const branchSecurityToken = calculateGitSecuredToken(projectGuid, this.repositoryContext.getRepositoryId(), branchName);
                const branchFriendlyName = GitRefUtility.getRefFriendlyName(branchName);
                const title = StringUtils.format(VCResources.BranchSecurityTitleFormat, this.repositoryContext.getRepository().name, branchFriendlyName);

                branchesSecurityManager.showPermissions(branchSecurityToken, title, title, this.repositoryContext.getTfsContext());
            });
        }
    }
}

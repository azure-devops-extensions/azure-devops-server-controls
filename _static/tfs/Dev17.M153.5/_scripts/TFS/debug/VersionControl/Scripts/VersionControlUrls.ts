import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { localeIgnoreCaseComparer } from "VSS/Utils/String";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GitRepository } from "TFS/VersionControl/Contracts";
import { CommitsHubRoutes, PushesHubRoutes } from "VersionControl/Scenarios/History/HistoryPushesRoutes";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import {
    ChangeList,
    TfsChangeList,
    GitCommit,
    VersionControlChangeType,
    GitObjectType,
} from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { getFullRefNameFromBranch } from "VersionControl/Scripts/GitRefUtility";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { IQueryParameters as CreateQueryParameters } from "VersionControl/Scenarios/PullRequestCreate/Actions/PullRequestCreateActionCreator";
import { FeatureManagementService } from "VSS/FeatureManagement/Services";
import { getService } from "VSS/Service";
import { getHistoryService, HistoryService } from "VSS/Navigation/Services";
import { GitClientService } from "VersionControl/Scripts/GitClientService";
import { TfvcClientService } from "VersionControl/Scripts/TfvcClientService";
import { gitVersionStringToVersionDescriptor, tfvcVersionStringToVersionDescriptor } from "VersionControl/Scripts/VersionSpecUtils";

export const OverviewHubRoute = "overview";

export function getChangesetUrl(
    changesetId: any,
    tfsContext: TfsContext = null,
    publicUrl: boolean = false,
    reviewMode: boolean = false,
    stateParams: any = null,
    routeData: any = null,
): string {
    let parameters: string[] = [];
    let action = "changesets";

    if(changesetId) {
        parameters.push("" + changesetId);
        action = "changeset";
    }

    if (reviewMode) {
        parameters.push("review");
    }

    const controller = "versionControl";
    tfsContext = tfsContext || TfsContext.getDefault();
    routeData = {
        ...routeData || {},
        parameters,
        ...stateParams,
    };

    return publicUrl
        ? tfsContext.getPublicActionUrl(action, controller, routeData)
        : tfsContext.getActionUrl(action, controller, routeData);
}

export function getChangesetUrlForFile(
    changesetId: any,
    path: string,
    action: string,
    tfsContext?: TfsContext,
    publicUrl: boolean = false,
    reviewMode: boolean = false,
    discussionId?: number,
): string {
    const routeData = {
        _a: action,
        path,
        discussionId,
    };

    return getChangesetUrl(
        changesetId,
        tfsContext,
        publicUrl,
        reviewMode,
        null,
        routeData,
    );
}

export function getShelvesetUrl(
    shelvesetNameOrId: string,
    shelvesetOwner?: string,
    tfsContext: TfsContext = TfsContext.getDefault(),
    publicUrl: boolean = false,
    reviewMode: boolean = false,
    stateParams: any = null): string {

    const queryParams: any = {
        ...stateParams || {},
    };

    let action: string = "shelvesets";

    if (shelvesetNameOrId) {
        queryParams.ss = shelvesetNameOrId + (shelvesetOwner ? (";" + shelvesetOwner) : "");
        action = "shelveset";
    }

    if (reviewMode) {
        queryParams.parameters = "review";
    }

    return publicUrl
        ? tfsContext.getPublicActionUrl(action, "versionControl", queryParams)
        : tfsContext.getActionUrl(action, "versionControl", queryParams);
}

export function getShelvesetUrlForFile(
    shelvesetName: string,
    shelvesetOwner: string,
    path: string,
    action: string,
    tfsContext: TfsContext = null,
    publicUrl: boolean = false,
    discussionId?: number): string {
    const routeData: any = {
        path,
        discussionId,
    };

    if (action) {
        routeData._a = action;
    }

    return getShelvesetUrl(shelvesetName, shelvesetOwner, tfsContext, publicUrl, false, routeData);
}

/**
 * Returns a full or relative git action url based on the repositoryName, action and routeData.
 * @param tfsContext     : The tfsContext of this request.
 * @param repositoryName : The name of the Git repository.
 * @param action         : The action part of the url.
 * @param routeData      : The routing data if any.
 * @param getPublicUrl   : Optional parameter defaulting to false specifying whether to get the public server URL or a URL relative to the page.
 */
export function getGitActionUrl(tfsContext: TfsContext, repositoryName: string, action: string, routeData: any, getPublicUrl: boolean = false): string {
    let parameters: string[] = [];

    if (!tfsContext) {
        tfsContext = TfsContext.getDefault();
    }

    // We will pass the repository name as the "action" and "git" as the controller, which
    // results in the /_git/RepoName which we want. We'll then append the action (if any) in
    // the parameters part of the url
    if (action && localeIgnoreCaseComparer(action, "index") !== 0) {
        parameters.push(action);
    }

    if (!routeData) {
        routeData = {};
    }

    if (routeData.parameters) {
        if ($.isArray(routeData.parameters)) {
            parameters = parameters.concat(routeData.parameters);
        } else {
            parameters.push(routeData.parameters);
        }
    }

    if (parameters.length > 0) {
        routeData.parameters = parameters;
    }

    const projectName = routeData.project ? routeData.project : tfsContext.navigation.project;
    // Omit the project name if it matches the repository name (and there is no Team)
    if ((!tfsContext.navigation.team || routeData.includeTeam === false) && localeIgnoreCaseComparer(projectName, repositoryName) === 0 ){
        routeData.project = null;
    }

    if (getPublicUrl) {
        return tfsContext.getPublicActionUrl(repositoryName, "git", routeData);
    } else {
        return tfsContext.getActionUrl(repositoryName, "git", routeData);
    }
}

/**
 * Returns a full or relative git action url based on the repository, action and routeData.  Note: The repository.project
 * will take precedence over the tfsContext.navigation.project
 * @param tfsContext     : The tfsContext of this request.
 * @param repository     : The destination Git repository.
 * @param action         : The action part of the url.
 * @param routeData      : The routing data if any.
 * @param getPublicUrl   : Optional parameter defaulting to false specifying whether to get the public server URL or a URL relative to the page.
 */
export function getGitActionUrlByRepository(tfsContext: TfsContext, repository: GitRepository, action: string, routeData: any, getPublicUrl: boolean = false): string {
    // update routeData to align with destination Repository
    if (!routeData) {
        routeData = {};
    }
    if (!routeData.project && repository && repository.project && repository.project.name) {
        routeData.project = repository.project.name;
    }

    // clear the team from url if we are creating a url for a different project than the current project
    if (routeData.project && tfsContext.navigation.team && routeData.project !== tfsContext.navigation.project) {
        routeData.includeTeam = false;
    }

    const repositoryName = repository ? repository.name : null; 

    return getGitActionUrl(tfsContext, repositoryName, action, routeData, getPublicUrl);
}

export function getBranchSecurityUrl(repositoryContext: GitRepositoryContext, branchName: string) {
    return getBranchAdminUrl(repositoryContext, branchName, "security");
}

export function getBranchPolicyUrl(repositoryContext: GitRepositoryContext, branchName: string) {
    if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessPolicyBranchPoliciesHub, false)) {
        return getNewBranchPolicyAdminUrl(repositoryContext, branchName);
    }
    else {
        return getBranchAdminUrl(repositoryContext, branchName, "policy");
    }
}

/**
 * Redirect to an Admin URL for Branches,  This function may become more generic as more links to admin are created
 * @param repositoryContext
 * @param branchName
 * @param string
 */
export function getBranchAdminUrl(repositoryContext: GitRepositoryContext, branchName: string, action: string) {
    const routeData: any = {
        repositoryId: repositoryContext.getRepositoryId(),
        branchName,
    };

    if (action) {
        routeData._a = action;
    }

    return repositoryContext.getTfsContext().getActionUrl("_versioncontrol", "admin", routeData);
}

/**
 * Redirect to the new Policy Admin URL for either branch or "branch folder".
 * @param repositoryContext
 * @param branchName
*/
export function getNewBranchPolicyAdminUrl(repositoryContext: GitRepositoryContext, branchName: string) {
    const repoId: string = repositoryContext.getRepositoryId().toLowerCase().replace(/\-/g, "");
    const refName: string = getFullRefNameFromBranch(branchName);

    const scope = `${repoId}:${refName}`;

    //const isVerticalNavEnabled = getService(FeatureManagementService).isFeatureEnabled("ms.vss-tfs-web.vertical-navigation");
    //const action = isVerticalNavEnabled ? "policies" : "_policies";
    //const controller = isVerticalNavEnabled ? "adminV" : "admin";
    
     return repositoryContext.getTfsContext().getActionUrl("_policies", "admin", {})
        + "?scope="
        + encodeURIComponent(scope)
            .replace(/%3A/gi, ":")
            .replace(/%2F/gi, "/")
            .replace(/%42/gi, "*");
    
}

export function getExplorerUrl(repository: RepositoryContext, path?: string, action?: string, state?: any, routeData?: any): string {
    routeData = {
        ...routeData || {},
        ...state || {},
    };

    if (action) {
        routeData._a = action;
    }

    if (path) {
        routeData.path = path;
    }

    return repository.getRepositoryType() === RepositoryType.Git
        ? getGitActionUrlByRepository(repository.getTfsContext(), (<GitRepositoryContext>repository).getRepository(), null, routeData)
        : repository.getTfsContext().getActionUrl(null, "versionControl", routeData);
}

export function getCommitUrl(
    repositoryContext: GitRepositoryContext,
    commitId: string,
    publicUrl: boolean = false,
    reviewMode: boolean = false,
    stateParams: any = null,
    routeData: any = null): string {
    const urlParameters: string[] = [commitId];

    if (reviewMode) {
        urlParameters.push("review");
    }

    routeData = {
        ...routeData || {},
        parameters: urlParameters,
        ...stateParams || {},
    };

    return getGitActionUrlByRepository(repositoryContext.getTfsContext(), repositoryContext.getRepository(), "commit", routeData, publicUrl);
}

export function getCommitUrlForFile(
    repositoryContext: GitRepositoryContext,
    commitId: string,
    path: string,
    action: string,
    publicUrl: boolean = false,
    reviewMode: boolean = false,
    discussionId?: number,
    routeData: any = null): string {

    routeData = routeData || {};
    $.extend(routeData, {
        _a: action,
        path: path,
        discussionId: discussionId
    });

    return getCommitUrl(repositoryContext, commitId, publicUrl, reviewMode, null, routeData);
}

export function getCommitUrlUsingRepoId(repositoryId: string, projectId: string, commitId: string, tfsContext?: TfsContext): string {
    const gitRepository = <GitRepository>{
        id: repositoryId,
        name: repositoryId,
        project: {
            id: projectId
        }
    };

    const repositoryContext = new GitRepositoryContext(tfsContext, gitRepository);
    return getCommitUrl(repositoryContext, commitId, false, false, null, { project: projectId, includeTeam: false });
}

export function getCommitDetailUrl(
    repositoryContext: GitRepositoryContext,
    commitId: string,
    itemPath?: string,
    itemObjectType?: GitObjectType,
    action?: string,
    routeData?: { [refName: string]: string }): string {
    let linkHref = "";
    if (itemPath &&
        action &&
        itemObjectType === GitObjectType.Blob) {
        linkHref = this.getCommitUrlForFile(
            repositoryContext,
            commitId,
            itemPath,
            action,
            false,
            false,
            undefined, // if we pass null here, url will contain param without value like "?discussionId="
            routeData
        );
    }
    else {
        linkHref = this.getCommitUrl(
            repositoryContext,
            commitId,
            false,
            false,
            undefined,
            routeData
        );
    }
    return linkHref;
}

export function getRefUrlUsingRepoId(repositoryId: string, projectId: string, refName: string, tfsContext: TfsContext): string {
    const gitRepository = <GitRepository>{
        id: repositoryId,
        name: repositoryId,
        project: {
            id: projectId
        }
    };

    const repositoryContext = new GitRepositoryContext(tfsContext, gitRepository);
    return getExplorerUrl(repositoryContext, null, null, { version: refName }, { project: projectId, includeTeam: false });
}

export function getCommitsSearchUrl(repositoryContext: GitRepositoryContext, state: any): string {
    return getGitActionUrlByRepository(
        repositoryContext.getTfsContext(),
        (<GitRepositoryContext>repositoryContext).getRepository(),
        "commits",
        {
            parameters: CommitsHubRoutes.commitsSearchRouteParam,
            ...state,
        },
        false);
}

export function getBranchCompareUrl(repositoryContext: GitRepositoryContext, baseVersion: string, targetVersion: string) {
    return getGitActionUrlByRepository(
        repositoryContext.getTfsContext(),
        repositoryContext.getRepository(),
        "branches",
        {
            _a: "commits",
            baseVersion: baseVersion,
            targetVersion: targetVersion,
        },
        false);
}

export function getBranchHistoryUrl(repositoryContext: GitRepositoryContext, branchName: string) {
    return getGitActionUrlByRepository(repositoryContext.getTfsContext(), repositoryContext.getRepository(), CommitsHubRoutes.commitsRoute, {
        itemVersion: getBranchItemVersion(branchName),
    }, false);
}

export function getCommitHistoryUrl(repositoryContext: GitRepositoryContext, commitId: string) {
    return getGitActionUrlByRepository(
        repositoryContext.getTfsContext(),
        repositoryContext.getRepository(),
        CommitsHubRoutes.commitsRoute, {
            itemVersion: getCommitItemVersion(commitId),
        },
        false);
}

export function getBranchExplorerUrl(repositoryContext: GitRepositoryContext, branchName: string) {
    const routeData = {
        _a: "contents",
        version: getBranchItemVersion(branchName),
    };

    return getGitActionUrlByRepository(repositoryContext.getTfsContext(), repositoryContext.getRepository(), null, routeData, false);
}

export function getBranchUpdatesUrl(repositoryContext: GitRepositoryContext, branchName: string) {
    return getGitActionUrlByRepository(repositoryContext.getTfsContext(), repositoryContext.getRepository(), PushesHubRoutes.pushesRoute, {
        itemVersion: getBranchItemVersion(branchName),
    }, false);
}

export function getTagExplorerUrl(repositoryContext: GitRepositoryContext, tagName: string): string {
    return getGitActionUrlByRepository(
        repositoryContext.getTfsContext(),
        repositoryContext.getRepository(),
        null,
        {
            version: getTagItemVersion(tagName),
            _a: "contents",
        },
        false);
}

export function getTagHistoryUrl(repositoryContext: GitRepositoryContext, tagName: string): string {
    return getGitActionUrlByRepository(repositoryContext.getTfsContext(), repositoryContext.getRepository(), CommitsHubRoutes.commitsRoute, {
        itemVersion: getTagItemVersion(tagName)
    }, false);
}

export function getTagItemVersion(tagName: string): string {
    return "GT" + tagName;
}

export function getBranchItemVersion(branchName: string): string {
    return "GB" + branchName;
}

export function getCommitItemVersion(commitId: string): string {
    return "GC" + commitId;
}

export function getPushCommitsUrl(repositoryContext: GitRepositoryContext, pushId: number, refName?: string, publicUrl: boolean = false, params: any = {}) {
    return getPushUrl(repositoryContext, pushId, refName, publicUrl, {
        ...params,
        _a: "commits",
    });
}

export function getPushUrl(repositoryContext: GitRepositoryContext, pushId: number, refName?: string, publicUrl: boolean = false, params: any = {}) {
    const stateParams = {
        ...params || {},
        parameters: "" + pushId
    };

    if (refName) {
        $.extend(stateParams, { refName: refName });
    }

    return getGitActionUrlByRepository(
        repositoryContext.getTfsContext(),
        (repositoryContext as GitRepositoryContext).getRepository(),
        PushesHubRoutes.pushRoute,
        stateParams,
        publicUrl);
}

export function getRemovedCommitsInPushUrl(repositoryContext: GitRepositoryContext, pushId: number, refName?: string, publicUrl: boolean = false) {
    return getPushUrl(repositoryContext, pushId, refName, publicUrl, { _a: VersionControlActionIds.CommitsRemoved });
}

/**
 * Get the URL for downloading zipped file/folder content using the Items REST API.
 * Automatically resolves Git LFS pointers to content from LFS.
 */
export function getZippedContentUrl(
    repositoryContext: RepositoryContext,
    path: string,
    version: string): string {

    const projectId = repositoryContext.getProjectId();
    const resolveLfs = true;

    if (repositoryContext.getRepositoryType() === RepositoryType.Git) {
        const repositoryId = repositoryContext.getRepositoryId();
        const versionDescriptor = version ? gitVersionStringToVersionDescriptor(version) : null;
        const httpClient = (repositoryContext.getClient() as GitClientService).getHttpClient();
        return httpClient.getZippedContentUrl(projectId, repositoryId, path, versionDescriptor, resolveLfs);
    }
    else {
        const versionDescriptor = version ? tfvcVersionStringToVersionDescriptor(version) : null;
        const httpClient = (repositoryContext.getClient() as TfvcClientService).getHttpClient();
        return httpClient.getZippedContentUrl(projectId, path, versionDescriptor);
    }
}

/**
 * Get the URL for displaying/downloading file content using the Items REST API.
 * Automatically resolves Git LFS pointers to content from LFS.
 * @param contentOnly if true and has a safe content-type, content will be displayed in the browser, else it is downloaded
 * @param routeData override route values - primarily used for the project for TFVC paths outside the current project
 */
export function getFileContentUrl(
    repositoryContext: RepositoryContext,
    path: string,
    version: string,
    contentOnly: boolean = false,
    routeData: any = null): string {

    const download = !contentOnly;
    const projectId = repositoryContext.getProjectId();
    const resolveLfs = true;

    if (repositoryContext.getRepositoryType() === RepositoryType.Git) {
        const repositoryId = repositoryContext.getRepositoryId();
        const versionDescriptor = version ? gitVersionStringToVersionDescriptor(version) : null;
        const httpClient = (repositoryContext.getClient() as GitClientService).getHttpClient();
        return httpClient.getFileContentUrl(projectId, repositoryId, path, download, versionDescriptor, resolveLfs, routeData);
    }
    else {
        const versionDescriptor = version ? tfvcVersionStringToVersionDescriptor(version) : null;
        const httpClient = (repositoryContext.getClient() as TfvcClientService).getHttpClient();
        return httpClient.getFileContentUrl(projectId, path, download, versionDescriptor, routeData);
    }
}

export function getChangeListUrl(
    repositoryContext: RepositoryContext,
    changeList: ChangeList,
    publicUrl: boolean = false,
    reviewMode: boolean = false,
    stateParams: any = null) {
    if (repositoryContext.getRepositoryType() === RepositoryType.Git) {
        return getCommitUrl(<GitRepositoryContext>repositoryContext, (<GitCommit>changeList).commitId.full, publicUrl, reviewMode, stateParams);
    } else if ((<TfsChangeList>changeList).changesetId) {
        return getChangesetUrl((<TfsChangeList>changeList).changesetId, repositoryContext.getTfsContext(), publicUrl, reviewMode, stateParams);
    } else {
        return getShelvesetUrl(
            (<TfsChangeList>changeList).shelvesetName,
            (<TfsChangeList>changeList).owner,
            repositoryContext.getTfsContext(),
            publicUrl,
            reviewMode,
            stateParams);
    }
}

export function getCreatePullRequestUrl(
    repositoryContext: GitRepositoryContext,
    sourceBranchName: string = null,
    targetBranchName: string = null,
    publicUrl: boolean = false,
    stateParams: any = null,
    routeData: any = null,
    sourceRepositoryId: string = null,
    targetRepositoryId: string = null): string {

    //if no repository context is provided return null
    if (!repositoryContext) {
        return null;
    }
    
    const params: CreateQueryParameters = {
        sourceRef: sourceBranchName !== null ? encodeURIComponent(sourceBranchName) : null,
        targetRef: targetBranchName !== null ? encodeURIComponent(targetBranchName) : null,
        sourceRepositoryId: sourceRepositoryId !== null ? encodeURIComponent(sourceRepositoryId) : null,
        targetRepositoryId: targetRepositoryId !== null ? encodeURIComponent(targetRepositoryId) : null,
    };

    if (stateParams) {
        $.extend(params, stateParams);
    }

    routeData = routeData || {};

    const url = getGitActionUrlByRepository(repositoryContext.getTfsContext(), repositoryContext.getRepository(), "pullrequestcreate", routeData, publicUrl);
    const serializedState = HistoryService.serializeState(params);
    if (serializedState) {
        return url + "?" + serializedState;
    } else {
        return url;
    }
}

export function getPullRequestUrl(
    repositoryContext: GitRepositoryContext,
    pullRequestId: number,
    publicUrl: boolean = false,
    stateParams: any = null,
    routeData: any = null,
    action: string = null): string {

    return getPullRequestUrlByRepository(repositoryContext.getTfsContext(), repositoryContext.getRepository(), pullRequestId, publicUrl, stateParams, routeData, action);
}

export function getPullRequestUrlByRepository(
    tfsContext: TfsContext,
    repository: GitRepository,
    pullRequestId: number,
    publicUrl: boolean = false,
    stateParams: any = null,
    routeData: any = null,
    action: string = null): string {
    const urlParameters: string[] = [pullRequestId.toString()];

    routeData = {
        ...routeData || {},
        parameters: urlParameters,
        _a: "overview",
        ...stateParams,
    };

    // if no action is specified, use the default pull request action
    if (!action) {
        action = "pullrequest";
    }

    return getGitActionUrlByRepository(tfsContext, repository, action, routeData, publicUrl);
}

export function getPullRequestIterationUrl(
    repositoryContext: GitRepositoryContext,
    pullRequestId: number,
    iterationId: number): string {

    let routeData = {
        parameters: [pullRequestId.toString()],
        _a: "files",
        iteration: iterationId
    };

    if (iterationId - 1 > 0) {
        routeData = {
            ...routeData,
            base: iterationId - 1
        } as any;
    }

    return getGitActionUrlByRepository(repositoryContext.getTfsContext(), repositoryContext.getRepository(), "pullrequest", routeData, false);
}

export function getPullRequestsUrl(repositoryContext: GitRepositoryContext): string {
    return getGitActionUrlByRepository(repositoryContext.getTfsContext(), repositoryContext.getRepository(), "pullrequests", {});
}

export function getBranchesUrl(repositoryContext: GitRepositoryContext): string {
    return getGitActionUrlByRepository(repositoryContext.getTfsContext(), repositoryContext.getRepository(), "branches", { area: null });
}

export function getPullRequestUrlUsingRepoId(repositoryId: string, projectId: string, pullRequestId: number, tfsContext: TfsContext, routeData: any = null): string {
    const gitRepository = <GitRepository>{
        id: repositoryId,
        name: repositoryId,
        project: {
            id: projectId
        }
    };

    const repositoryContext = new GitRepositoryContext(tfsContext, gitRepository);
    return getPullRequestUrl(repositoryContext, pullRequestId, true, null, routeData ? routeData : { project: projectId, includeTeam: false });
}

export function getTfvcOverviewUrl(repositoryContext: RepositoryContext): string {
    return repositoryContext.getTfsContext().getActionUrl(OverviewHubRoute, "versionControl");
}
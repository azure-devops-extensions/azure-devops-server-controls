// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";
import Base_Contracts = require("Search/Scripts/Contracts/TFS.Search.Base.Contracts");
import Code_Contracts = require("Search/Scripts/Contracts/TFS.Search.Code.Contracts");
import Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Utils_String = require("VSS/Utils/String");
import VCContracts = require("TFS/VersionControl/Contracts");
import VCWebApi = require("VersionControl/Scripts/TFS.VersionControl.WebApi");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import {TfvcRepositoryContext} from "VersionControl/Scripts/TfvcRepositoryContext";
import Search_Custom = require("Search/Scripts/Providers/Code/TFS.Search.Code.Custom");

/**
* Utility class for Code.
*/
export class CodeUtils {
    public static TfvcPathRoot = "$/";

    public static getHitsByFieldName(result: Code_Contracts.CodeResult, field: string): Base_Contracts.IHit[] {
        var hits: Base_Contracts.IHit[] = new Array<Base_Contracts.IHit>(),
            matches: Base_Contracts.Matches[] = result.matches;

        if (matches && matches[field]) {
            hits = matches[field];
        }

        return hits;
    }

    /**
     * This function gets the type of repo(Git/Tfvc) from the repo name.
     * Similiar to the implemetation in the following path:
     * path: Tfs/Service/WebAccess/Widgets/Scripts/TFS.Widget.Utilities.ts
     * @param repoName
     */
    public static getRepoType(repoName: string): Base_Contracts.VersionControlType {
        return (repoName.indexOf(CodeUtils.TfvcPathRoot) == 0) ?
            Base_Contracts.VersionControlType.Tfvc :
            Base_Contracts.VersionControlType.Git;
    }

    /**
    * It helps download the SD (Custom VCType) file.
    */
    public static getOfflineFileDownloadUrl(
        selectedResult: Code_Contracts.CodeResult,
        contentsOnly?: boolean): string {

        contentsOnly = contentsOnly || false;
        var data = {
            "projectName": selectedResult.project,
            "branchName": selectedResult.branch,
            "filePath": selectedResult.path,
            "fileName": selectedResult.fileName,
            "repositoryName": selectedResult.repository,
            "contentId": selectedResult.contentId,
            "contentsOnly": contentsOnly
        };

        var customVC = new Search_Custom.Custom();

        return customVC.getContentDownloadUrl(data);
    }

    /**
    * It constructs the Repository Context from a Code Result for both Git & Tfvc.
    */
    public static getRepositoryContextForResult(result: Code_Contracts.CodeResult, success: any, failure: any): void {
        // Impersonate collection context so that VC and Git APIs won't throw us out when
        // search/file preview's are triggered from the account context
        var rootRequestPath = Context.SearchContext.getRootRequestPath(result.collection);

        // Storing tfscontext in a temporary variable as we need to edit the tfscontext
        // if we are at account level to get files and commits or when we are selecting 
        // a result that belongs to a proj/team different from the project context we are in
        var projectCollectionTfsContext: any = $.extend(true, {}, Context.SearchContext.getTfsContext(result.collection));

        if (projectCollectionTfsContext.navigation.project != result.project) {
            projectCollectionTfsContext.navigation.project = result.project;
            projectCollectionTfsContext.navigation.team = null;
        }

        var repositoryContext: any;
        switch (result.vcType) {
            case Base_Contracts.VersionControlType.Git:
                // Populate GitRepository to construct GitRepositoryContext from repoId and repoName and avoid http call
                if (result.repositoryId) {
                    var gitRepo: VCContracts.GitRepository = <VCContracts.GitRepository>{
                        _links: null,
                        id: result.repositoryId,
                        name: result.repository,
                        defaultBranch: "",
                        project: { name: result.project },
                        remoteUrl: "",
                        url: ""
                    }

                    repositoryContext = GitRepositoryContext.create(gitRepo, projectCollectionTfsContext);
                    success(repositoryContext);
                }
                else {
                    // When repoID is not available fallback on the http call to fetch repo data
                    var httpClient: VCWebApi.GitHttpClient = new VCWebApi.GitHttpClient(rootRequestPath);
                    httpClient.beginGetRepository(result.project, result.repository).then(
                        (repository) => {
                            success(GitRepositoryContext.create(repository, projectCollectionTfsContext));
                        },
                        (error) => {
                            failure(error);
                        });
                }

                break;
            case Base_Contracts.VersionControlType.Tfvc:
                success(TfvcRepositoryContext.create(projectCollectionTfsContext));
                break;
            default:
                failure();
                break;
        }
    }

    /**
    * Constructs file contents url which takes the use into code hub
    */
    public static constructLinkToContent(result: Code_Contracts.ICodeResult): string {
        var resultantURLToCodeHubContent: string;

        var collectionContext = Context.SearchContext.getTfsContext(result.collection);

        if (result.vcType === Base_Contracts.VersionControlType.Tfvc) {
            resultantURLToCodeHubContent = collectionContext.navigation.serviceHost.uri
                + encodeURIComponent(result.project) + "/_versionControl" + "#path="
                + encodeURIComponent(result.path.split("\\").join("/")) + "&version="
                + encodeURIComponent(result.branch) + "&_a=contents";
        }
        else if (result.vcType === Base_Contracts.VersionControlType.Git) {
            resultantURLToCodeHubContent = collectionContext.navigation.serviceHost.uri
                + encodeURIComponent(result.project) + "/_git/"
                + encodeURIComponent(result.repository) + "#path="
                + encodeURIComponent(result.path.split("\\").join("/")) + "&version="
                + encodeURIComponent(result.branch) + "&_a=contents";
        }

        return resultantURLToCodeHubContent;
    }
}

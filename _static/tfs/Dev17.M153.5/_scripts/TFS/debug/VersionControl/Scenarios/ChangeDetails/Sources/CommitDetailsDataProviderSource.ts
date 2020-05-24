import * as Q from "q";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { GitCommit, TypeInfo } from "TFS/VersionControl/Contracts";
import Context = require("VSS/Context");
import { Contribution } from "VSS/Contributions/Contracts";
import { WebPageDataService } from "VSS/Contributions/Services";
import { ContractSerializer } from "VSS/Serialization";
import * as VSS_Service from "VSS/Service";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";

import {
    ICommitDetailsPageData,
    ICommitDetailsReadPageData,
} from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import * as Constants from "VersionControl/Scenarios/Shared/Constants";
import {
    TypeInfo as LegacyTypeInfo,
    ItemModel,
    ChangeList,
    GitChange,
    GitCommit as LegacyGitCommit
} from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";

import * as GitItemUtils from "VersionControl/Scripts/GitItemUtils";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";


export interface IPageDataService {
    getPageData<T>(key: string, contractMetadata?: any);
    ensureDataProvidersResolved(contributions: Contribution[], refreshIfExpired?: boolean, properties?: any): IPromise<any>;
}

/**
 * Source of Data Provider for Commit Details
 */
export class CommitDetailsDataProviderSource {
    constructor(private _webPageDataService?: IPageDataService) {
        if (!this._webPageDataService) {
            this._webPageDataService = VSS_Service.getService(WebPageDataService) as IPageDataService;
        }
    }

    /**
     * Returns the commit details page data
     */
    public getCommitDetailsPageData(repositoryContext: RepositoryContext): IPromise<ICommitDetailsPageData> {
        const deferred = Q.defer<ICommitDetailsPageData>();

        let pageData = this._webPageDataService.getPageData<ICommitDetailsReadPageData>(Constants.CommitDetailsDataProviderId);
        if (pageData && pageData.commitDetails) {
            pageData = this._deserializeCommitDetailsPageData(pageData);
            deferred.resolve(pageData);
        } else {
            const properties = this._getDataProviderProperties(repositoryContext);

            this._webPageDataService.ensureDataProvidersResolved([
                {
                    id: Constants.CommitDetailsDataProviderId,
                    properties: {
                        serviceInstanceType: ServiceInstanceTypes.TFS
                    }
                } as Contribution],
                true,
                properties,
            ).then(
                () => {
                    pageData = this._webPageDataService.getPageData<any>(Constants.CommitDetailsDataProviderId);
                    if (pageData && pageData.commitDetails) {
                        pageData = this._deserializeCommitDetailsPageData(pageData);
                        deferred.resolve(pageData);
                    } else {
                        let error = new Error(VCResources.CommitIdNotFound_Error);
                        deferred.reject(error);
                    }
                },
                (error: Error) => {
                    deferred.reject(error);
                });
        }
        
        return deferred.promise;
    }

    private _getDataProviderProperties(repositoryContext: RepositoryContext): any {

        const defaultContextData: WebContext = Context.getDefaultWebContext();
        const currentTfsContext = new TfsContext(defaultContextData);
        const navigation = currentTfsContext.navigation;

        return {
            "repoName": repositoryContext.getRepository().name,
            "commitVersion": navigation.currentParameters
        };
    }

    private _deserializeCommitDetailsPageData(commitDetailsReadPageData: ICommitDetailsReadPageData): ICommitDetailsPageData {
        let commitDetailsPageData: ICommitDetailsPageData = {} as ICommitDetailsPageData;
        if (commitDetailsReadPageData.commitDetails) {
            const commit = ContractSerializer.deserialize(
                commitDetailsReadPageData.commitDetails,
                TypeInfo.GitCommit) as GitCommit;

            commitDetailsPageData.commitDetails = GitItemUtils.gitCommitRefToLegacyChangeList(commit) as LegacyGitCommit;
        }

        if (commitDetailsReadPageData.selectedItemDetails) {
            commitDetailsPageData.selectedItemDetails = ContractSerializer.deserialize(
                commitDetailsReadPageData.selectedItemDetails,
                LegacyTypeInfo.ItemModel) as ItemModel;
        }

        if (commitDetailsReadPageData.diffParentDetails && commitDetailsReadPageData.diffParentDetails.diffParent) {
            commitDetailsPageData.diffParentDetails = commitDetailsReadPageData.diffParentDetails;
            commitDetailsPageData.diffParentDetails.diffParent = ContractSerializer.deserialize(
                commitDetailsReadPageData.diffParentDetails.diffParent,
                LegacyTypeInfo.GitCommit) as LegacyGitCommit;
        }

        // AllChangesInclude default value assuming to be true
        commitDetailsPageData.commitDetails.allChangesIncluded = true;

        // However, if allChangesIncluded value is present then assigning that value instead
        if (commitDetailsReadPageData.hasOwnProperty("allChangesIncluded")) {
            commitDetailsPageData.commitDetails.allChangesIncluded = commitDetailsReadPageData.allChangesIncluded;
        }

        return commitDetailsPageData;
    }
}

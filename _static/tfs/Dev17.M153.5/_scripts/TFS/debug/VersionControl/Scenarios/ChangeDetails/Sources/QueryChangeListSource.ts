import * as Q from "q";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";

import * as Constants from "VersionControl/Scenarios/Shared/Constants";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

import Context = require("VSS/Context");
import { ContributionsHttpClient } from "VSS/Contributions/RestClient";
import { WebPageDataService } from "VSS/Contributions/Services";
import { ContractSerializer } from "VSS/Serialization";
import * as VSS_Service from "VSS/Service";
import Utils_String = require("VSS/Utils/String");
import { Uri } from "VSS/Utils/Url";

export interface tfvcChangeDetailsPageData {
    tfvcChangeDetails: VCLegacyContracts.TfsChangeList;
}

export class QueryChangeListSource {
    constructor() {
    }

    private _contributionClient: ContributionsHttpClient = null;

    private _getDataProviderQuery(tfvcSetIdString: string, tfvcSet: string): DataProviderQuery {

        const query: DataProviderQuery = {
            context: {
                properties: {
                },
            },
            contributionIds: [Constants.TfvcDetailsDataProviderId],
        };

        query.context.properties[tfvcSetIdString] = tfvcSet;

        return query;
    }

    private _getContributionClient(repositoryContext: RepositoryContext): ContributionsHttpClient {
        if (!this._contributionClient) {
            this._contributionClient = ProjectCollection.getConnection(
                repositoryContext.getTfsContext()).getHttpClient(ContributionsHttpClient);
        }
        return this._contributionClient;
    }

    public getCurrentChangeList(repositoryContext: RepositoryContext): IPromise<VCLegacyContracts.TfsChangeList> {
        const deferred = Q.defer<VCLegacyContracts.TfsChangeList>();
        let tfvcChangeDetailsPageData = VSS_Service.getService(WebPageDataService).getPageData<tfvcChangeDetailsPageData>(Constants.TfvcDetailsDataProviderId);
        if (tfvcChangeDetailsPageData && tfvcChangeDetailsPageData.tfvcChangeDetails) {
            const currentChangeList = ContractSerializer.deserialize(tfvcChangeDetailsPageData.tfvcChangeDetails, VCLegacyContracts.TypeInfo.ChangeList);
            deferred.resolve(currentChangeList as VCLegacyContracts.TfsChangeList);
        } else {
            const contributionClient: ContributionsHttpClient = this._getContributionClient(repositoryContext);

            let query: DataProviderQuery = null;
            let errorMsg: string = null;
            const navigationContext = Context.getPageContext().navigation;

            if (navigationContext.commandName == "Tfvc.changeset") {
                const changesetId = Context.getPageContext().navigation.currentParameters;
                query = this._getDataProviderQuery("changeset", changesetId);
                errorMsg = Utils_String.format(VCResources.ChangesetNotFound_Error, changesetId);
            } else {
                const uri = new Uri(location.href);
                const shelvesetId = uri.queryParameters.length > 0
                    ? uri.queryParameters[0] && uri.queryParameters[0].value
                    : undefined;

                query = this._getDataProviderQuery("shelveset", shelvesetId);
                errorMsg = Utils_String.format(VCResources.ShelvesetNotFound_Error, shelvesetId);
            }

            contributionClient.queryDataProviders(query, "project", repositoryContext.getProjectId())
                .then<void>((contributionDataResult: DataProviderResult) => {
                    tfvcChangeDetailsPageData = <tfvcChangeDetailsPageData>(contributionDataResult.data[Constants.TfvcDetailsDataProviderId]);
                    if (tfvcChangeDetailsPageData && tfvcChangeDetailsPageData.tfvcChangeDetails) {
                        const currentChangeList = ContractSerializer.deserialize(tfvcChangeDetailsPageData.tfvcChangeDetails, VCLegacyContracts.TypeInfo.ChangeList);
                        deferred.resolve(currentChangeList as VCLegacyContracts.TfsChangeList);
                    } else {
                        let error = new Error(errorMsg);
                        deferred.reject(error);
                    }
                },
                (error: Error) => {
                    deferred.reject(error);
                });
        }
        return deferred.promise;
    }

    /**
     * Overriding the values for testing purpose
     * @param contributionClient
     */
    public setupMockContributionClient(
        contributionClient: ContributionsHttpClient) {
        this._contributionClient = contributionClient;
    }
}

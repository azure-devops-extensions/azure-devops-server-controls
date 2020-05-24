import * as Q from "q";
import { WebPageDataService } from "VSS/Contributions/Services";
import { Contribution } from "VSS/Contributions/Contracts";
import * as LocalPageData from "VSS/Contributions/LocalPageData";
import { ContractSerializer } from "VSS/Serialization";
import * as Performance from "VSS/Performance";
import * as VSS_Service from "VSS/Service";
import * as Settings_RestClient from "VSS/Settings/RestClient";
import { GitRefUpdate } from "TFS/VersionControl/Contracts";
import { GitClientService } from "VersionControl/Scripts/GitClientService";
import * as GitRefService from "VersionControl/Scripts/Services/GitRefService";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import { GitTagVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { GitTag, TypeInfo } from "VersionControl/Scenarios/History/GitHistory/GitCommitExtendedContracts";
import { TagsPageResults, GitTagsDataProviderArguments } from "VersionControl/Scenarios/Tags/TagsPage/Actions/ActionsHub";
import * as Constants from "VersionControl/Scenarios/Shared/Constants";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";

export interface IPageDataService {
    getPageData<T>(key: string, contractMetadata?: any);
    ensureDataProvidersResolved(contributions: Contribution[], refreshIfExpired?: boolean, properties?: any): IPromise<any>;
}

const tagsDataProvider: string = "ms.vss-code-web.git-tags-data-provider";

export class TagsPageSource {
    private _perfScenarioManager = Performance.getScenarioManager() as Performance.IScenarioManager;
    private _gitClient: GitClientService = null;
    
    constructor(
        private repositoryContext: GitRepositoryContext,
        private _webPageDataService?: IPageDataService,
    ) {
        if (!this._webPageDataService) {
            this._webPageDataService = VSS_Service.getService(WebPageDataService) as IPageDataService;
        }

        this._gitClient = repositoryContext.getClient() as GitClientService;
    }

    public getTagsFromJsonIsland(): TagsPageResults {
        const scenario = this._perfScenarioManager.startScenario("VersionControl", "TagsPageDataProvider.getTagsFromJsonIsland");
        const tagsDetails: TagsPageResults =
            this._webPageDataService.getPageData<any>(tagsDataProvider);

        this._getDeserializedTags(tagsDetails);
        scenario.end();

        return tagsDetails;
    }

    public setCompareTags = (compareTagBase: string): IPromise<void> => {
        const settingsClient = VSS_Service.getClient(Settings_RestClient.SettingsHttpClient, undefined, undefined, undefined, { showProgressIndicator: false });
        const entries: IDictionaryStringTo<string> = {};
        entries["Tags.Compare.Base"] = compareTagBase;
        return settingsClient.setEntriesForScope(entries, "me", "Repository", this.repositoryContext.getRepositoryId());
    }

    public getTagsFromDataProvider(gitTagsDataProviderArgs: GitTagsDataProviderArguments): IPromise<TagsPageResults> {
        const scenario = this._perfScenarioManager
            .startScenario("VersionControl", "TagsPageDataProvider.getTagsFromDataProvider");
        const deferred = Q.defer<TagsPageResults>();

        if (this.repositoryContext === null) {
            deferred.resolve(null);
        }
        else {
            const properties = {
                "repositoryName": this.repositoryContext.getRepository().name,
                "gitTagsDataProviderArguments": gitTagsDataProviderArgs,
            };
            this._webPageDataService.ensureDataProvidersResolved([
                {
                    id: tagsDataProvider,
                    properties: {
                        serviceInstanceType: ServiceInstanceTypes.TFS
                    }
                } as Contribution],
                true,
                properties,
            ).then(
                () => {
                    const data = this._webPageDataService.getPageData<any>(tagsDataProvider);

                    if (data) {
                        const tagsPageResults: TagsPageResults = <TagsPageResults>data;
                        this._getDeserializedTags(tagsPageResults);
                        deferred.resolve(tagsPageResults);
                    } else {
                        const dataProviderResult = LocalPageData.getDataProviderResults();
                        const fetchError: Error = this._getFetchErrorIfAny(dataProviderResult);

                        if (!!fetchError) {
                            deferred.reject(fetchError);
                        } else {
                            // Empty state returned from server
                            deferred.resolve(<TagsPageResults>{});
                        }
                    }
                },
                (error: Error) => {
                    scenario.end();
                    // Error occurred suring fetch, network call or browser issue
                    deferred.reject(error);
                });
        }

        return deferred.promise;
    }

    public deleteTag(tagName: string): IPromise<GitRefUpdate> {
        const refFriendlyName = GitRefUtility.getRefFriendlyName(tagName);
        const deleteOptions = {
            refToDelete: new GitTagVersionSpec(refFriendlyName)
        } as GitRefService.IDeleteRefOptions;

        return GitRefService.getGitRefService(this.repositoryContext).deleteRef(deleteOptions);
    }

    private _getFetchErrorIfAny(contributionDataResult: DataProviderResult): Error {
        let fetchError: Error = null;
        const providersArray = contributionDataResult.resolvedProviders;
        if (!!providersArray) {
            $.each(providersArray, (index: number, provider: ResolvedDataProvider) => {
                if (provider.id === tagsDataProvider && !!provider.error) {
                    fetchError = new Error();
                    fetchError.message = provider.error;
                    return;
                }
            });
        }

        return fetchError;
    }

    private _getDeserializedTags(queryData: TagsPageResults): void {
        if (queryData) {
            if (queryData.tags) {
                queryData.tags = ContractSerializer.deserialize(queryData.tags, TypeInfo.GitTag);
            }
        }
    }
}
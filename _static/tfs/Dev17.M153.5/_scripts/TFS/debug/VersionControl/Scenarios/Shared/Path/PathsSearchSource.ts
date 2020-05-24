import * as Performance from "VSS/Performance";
import { SearchCore, SearchAdapter } from "VSS/Search";
import * as Utils_String from "VSS/Utils/String";

import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { GitHttpClient } from "TFS/VersionControl/GitRestClient";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { GitRepository } from "TFS/VersionControl/Contracts";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { PathSearchResultItem, PathSearchResult } from  "VersionControl/Scenarios/Shared/Path/PathSearchResult";
import { gitVersionStringToVersionDescriptor } from "VersionControl/Scripts/VersionSpecUtils";
import { InFolderSearchStrategy, GlobalSearchStrategy, createSearchablePathObjects } from  "VersionControl/Scenarios/Shared/Path/PathSearchStrategies";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

const maxGlobalResults = 20;
const perfScenarioManager = Performance.getScenarioManager() as Performance.IScenarioManager;
const gitFilePathsMaxCountExceededException = "GitFilePathsMaxCountExceededException";

export interface IPathsSearchSource {
    getInFolderSearchResults(text: string, version: string): IPromise<PathSearchResult>;
    getGlobalSearchResults(text: string, version: string): IPromise<PathSearchResult>;
}

/**
 * A source of data for the file paths.
 */
export class PathsSearchSource implements IPathsSearchSource {
    private _httpClient: GitHttpClient;
    private _repositoryContext: RepositoryContext;
    private _version: string;
    private _setData: IPromise<void>;
    private _inFolderSearch: SearchCore<PathSearchResultItem>;
    private _globalSearch: SearchCore<PathSearchResultItem>;

    constructor(repositoryContext: RepositoryContext) {
        this._repositoryContext = repositoryContext;
        this._httpClient = ProjectCollection.getDefaultConnection().getHttpClient<GitHttpClient>(GitHttpClient);

        // search Cores
        const searchAdapter = new NoTranformSearchAdapter();

        this._inFolderSearch = new SearchCore(new InFolderSearchStrategy(), searchAdapter);
        this._globalSearch = new SearchCore(new GlobalSearchStrategy(maxGlobalResults), searchAdapter);
    }

    public getInFolderSearchResults(text: string, version: string): IPromise<PathSearchResult> {
        return this._fetchAndSetData(version).then(() => {
            const searchResults = this._inFolderSearch.beginSearch(text);
            return {
                searchText: text,
                results: searchResults
            }
        });
    }

    public getGlobalSearchResults(text: string, version: string): IPromise<PathSearchResult> {
        return this._fetchAndSetData(version).then(() => {
            const scenario = this._startSearchPerformanceScenario("global", text, this._globalSearch.getStrategy().getIndexedItemsCount());
            const searchResults = this._globalSearch.beginSearch(text);
            scenario.end();
            return { searchText: text, results: searchResults };
        });
    }

    private _fetchAndSetData(version: string): IPromise<void> {
        if (!this._setData || version !== this._version) {
            this._version = version;
            this._setData = this._getFilePaths().then((paths) => {
                this._resetSearchCoresStore(paths);
                return null;
            }, (error: TfsError) => {
                let errorMessage = error.message;
                if (parseInt(error.status) === 403 &&
                    Utils_String.equals(error.serverError.typeKey, gitFilePathsMaxCountExceededException, true)) {
                    errorMessage = VCResources.PathSearch_ErrorMessageRepositoryTooLarge;
                }
                throw new Error(errorMessage);
            });
        }

        return this._setData;
    }

    private _resetSearchCoresStore(paths: string[]): void {
        const searchablePaths = createSearchablePathObjects(paths);
        this._inFolderSearch.clearStrategyStore();
        this._globalSearch.clearStrategyStore();
        this._inFolderSearch.addItems(searchablePaths);
        this._globalSearch.addItems(searchablePaths);
    }

    private _getFilePaths(): IPromise<string[]> {
        const versionDescriptor = gitVersionStringToVersionDescriptor(this._version);
        const scenario = perfScenarioManager.startScenario(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, "PathsSearchSource.getFilePaths");
        const repository = this._repositoryContext.getRepository() as GitRepository;
        return this._httpClient.getFilePaths(
            repository.project.id,
            repository.id,
            undefined,
            versionDescriptor
        ).then((filePathCollection) => {
            const paths = filePathCollection.paths || [];

            scenario.addData({
                repositoryId: repository.id,
                repositoryType: RepositoryType[this._repositoryContext.getRepositoryType()],
                version: versionDescriptor,
                pathCount: paths.length
            });
            scenario.end();

            return paths;
        });
    }

    private _startSearchPerformanceScenario(searchType: string, query: string, dataSetSize: number): Performance.IScenarioDescriptor {
        const scenario = perfScenarioManager.startScenario(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, "PathsSearchSource.searchPath");
        scenario.addData({
            repositoryId: this._repositoryContext.getRepositoryId(),
            repositoryType: RepositoryType[this._repositoryContext.getRepositoryType()],
            searchType: searchType,
            queryLength: query.length,
            totalPaths: dataSetSize
        });
        return scenario;
    }
}

/**
 * Search adapter to not apply any transformation on the search results
 */
class NoTranformSearchAdapter extends SearchAdapter<PathSearchResultItem> {
    /**
     * override handle results to no op
     */
    public handleResults(results: PathSearchResultItem[], finished: boolean, query: string) {
    }

    /**
     * assume the data is already provided in strategy or added through search core
     */
    public isDataSetComplete(): boolean {
        return true;
    }
}

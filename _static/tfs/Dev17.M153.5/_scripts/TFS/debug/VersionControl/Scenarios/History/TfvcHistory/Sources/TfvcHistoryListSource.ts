import * as Q from "q";
import { ContributionsHttpClient } from "VSS/Contributions/RestClient";
import { ContractSerializer } from "VSS/Serialization";
import * as Utils_String from "VSS/Utils/String";
import * as VSS_Service from "VSS/Service";
import { WebPageDataService } from "VSS/Contributions/Services";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { ChangeListSearchCriteria } from "TFS/VersionControl/Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { TfvcChangeListItems } from "VersionControl/Scenarios/History/TfvcHistory/TfvcInterfaces"
import { HistoryQueryResults, ChangeList, HistoryEntry, TypeInfo, TfsChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { TfvcClientService } from "VersionControl/Scripts/TfvcClientService";

export interface IChangeSetsPageData {
    changesets: HistoryQueryResults;
    searchcriteria: ChangeListSearchCriteria;
}

export interface IShelveSetsPageData {
    shelvesets: TfsChangeList[];
}

export class TfvcHistoryListSource {
    private static CONTRIBUTION_ID = "ms.vss-code-web.tfvc-list-view-data-provider";

    private _contributionClient: ContributionsHttpClient;
    private _tfvcClient: TfvcClientService = null;
    private _webPageDataService: WebPageDataService;

    constructor(private _repositoryContext: RepositoryContext) {
        this._contributionClient = ProjectCollection.getConnection(this._repositoryContext.getTfsContext()).getHttpClient(ContributionsHttpClient);
        this._tfvcClient = <TfvcClientService>this._repositoryContext.getClient();
        this._webPageDataService = VSS_Service.getService(WebPageDataService);
    }

    public getChangeSetsDataFromJsonIsland(): IChangeSetsPageData {
        const pageData = this._webPageDataService.getPageData<IChangeSetsPageData>(TfvcHistoryListSource.CONTRIBUTION_ID);
        if (pageData) {
            const changeListItems: HistoryQueryResults = this._getDeserializedChangeSets(pageData.changesets);
            const changeListSearchCriteria = pageData.searchcriteria;
            return {
                changesets: changeListItems,
                searchcriteria: changeListSearchCriteria,
            };
        }

        return null;
    }

    public getShelveSetsFromJsonIsland(): TfvcChangeListItems {
        const pageData = this._webPageDataService.getPageData<IShelveSetsPageData>(TfvcHistoryListSource.CONTRIBUTION_ID);
        const shelveSetsPayload: TfvcChangeListItems = this._getDeserializedShelveSets(pageData.shelvesets);
        return shelveSetsPayload;
    }

    public getChangeSets(searchCriteria: ChangeListSearchCriteria): IPromise<HistoryQueryResults> {
        return Q.Promise<HistoryQueryResults>((resolve, reject) => {
            this._tfvcClient.beginGetHistory(this._repositoryContext, searchCriteria, (resultModel: HistoryQueryResults) => {
                const changeSets = this._getDeserializedChangeSets(resultModel);
                resolve(changeSets);
            }, (error: Error) => {
                reject(error);
            })
        });
    }

    public getShelveSets(author: string): IPromise<TfvcChangeListItems> {
        return Q.Promise<TfvcChangeListItems>((resolve, reject) =>
            this._tfvcClient.beginGetShelvesets(author, (resultModel: TfsChangeList[]) => {
                const shelveSets = this._getDeserializedShelveSets(resultModel);
                resolve(shelveSets);
            }, (error: Error) => {
                reject(error);
            }));
    }

    // called to get the complete changeset/ shelveset to display full message
    public getFullChangeItem(version: string): IPromise<ChangeList> {
        return Q.Promise((resolve, reject) =>
            this._tfvcClient.beginGetChangeList(this._repositoryContext, version, 0, resolve, (error: Error) => {
                reject(error);
            }));
    }

    private _getDeserializedChangeSets(historyResults: HistoryQueryResults): HistoryQueryResults {
        if (!historyResults) {
            return;
        }

        return (ContractSerializer.deserialize(historyResults, TypeInfo.HistoryQueryResults));
    }

    private _getDeserializedShelveSets(shelvesets: TfsChangeList[]): TfvcChangeListItems {
        if (!shelvesets) {
            return;
        }

        const shelvesetsHistoryPayload: TfvcChangeListItems = {} as TfvcChangeListItems;
        const changeLists = ContractSerializer.deserialize(shelvesets, TypeInfo.ChangeList);
        shelvesetsHistoryPayload.tfvcHistoryItems = this._convertchangeListToHistoryEnty(changeLists);
        shelvesetsHistoryPayload.hasMoreUpdates = false;

        return shelvesetsHistoryPayload;
    }

    private _convertchangeListToHistoryEnty(shelveSets: ChangeList[]): HistoryEntry[] {
        const historyEntries: HistoryEntry[] = [];
        $.each(shelveSets, (index: number, shelveSet: ChangeList) => {
            const historyEntry = {} as HistoryEntry;
            historyEntry.changeList = shelveSet;
            historyEntry.itemChangeType = null;
            historyEntry.serverItem = null;

            historyEntries.push(historyEntry);
        });
        return historyEntries;
    }
}
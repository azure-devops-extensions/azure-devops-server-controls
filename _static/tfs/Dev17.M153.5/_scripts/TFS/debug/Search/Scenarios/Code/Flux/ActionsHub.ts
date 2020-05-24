import { Action } from "VSS/Flux/Action";
import * as _BaseActionsHub from "Search/Scenarios/Shared/Base/ActionsHub";
import * as _CodeContracts from "Search/Scenarios/WebApi/Code.Contracts";
import * as _VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as _VCRepositoryContext from "VersionControl/Scripts/RepositoryContext";
import * as _VCFileViewer from "VersionControl/Scripts/Controls/FileViewer";

export namespace TreeItemAction {
    export const treeItemAction = "treeItemAction";
}

export interface ContextRetrievedPayload {
    item: _CodeContracts.CodeResult;

    repositoryContext: _VCRepositoryContext.RepositoryContext;

    serverItem: _VCLegacyContracts.ItemModel;

    latestServerItem: _VCLegacyContracts.ItemModel;
}

export interface ContextRetrievalFailedPayload {
    error: any;
}

export interface PathSourceParams {
    project: string;

    repositoryName: string;

    versionString: string;

    repositoryId?: string;

}

export interface ItemRetrievedPayload {
    requestedPath: string;

    pathSourceParams: PathSourceParams;

    allRetrievedItems: _VCLegacyContracts.ItemModel[];
}

export interface FilePathsRetrievedPayload {
    requestedPath: string;

    pathSourceParams: PathSourceParams;

    paths: string[];
}


export interface ActiveTabChangedPayload {
    activeTabKey: string;

    changeOnNavigation?: boolean;
}

export interface KnowItemsFetchedPayload extends ItemRetrievedPayload {
}

export interface InitialItemsRetrievedPayload extends ItemRetrievedPayload {
}

export interface KnownFilePathsFetchedPayload extends FilePathsRetrievedPayload {
}

export interface FileContentRetrievedPayload {
    item: _CodeContracts.CodeResult;

    fileContent: _VCLegacyContracts.FileContent;
}

export interface FileContentRetrievalFailedPayload {
    error: any;
}

export interface CursorPositionChangePayload {
    cursorPosition: _VCFileViewer.FileViewerSelection
}

export interface DiffLinesChangedPayload {
    diffLines: number[]
}

export interface CompareVersionPickedPayload {
    version: string;

    isOriginalSide: boolean
}

export interface TenantResultsLoadedPayload {
    response: _CodeContracts.CodeQueryResponse;
}

export interface TenantQueryFailedPayload {
    error: any;

    query: _CodeContracts.SearchQuery;
}

export interface TenantQueryStartedPayload {
    query: _CodeContracts.SearchQuery;
}

export interface RendererFetchedPayload {
    isRendererPresent: boolean;

    item: _CodeContracts.CodeResult;
}

export interface RepositoryContextRetrievedPayload {
    repositoryContext: _VCRepositoryContext.RepositoryContext;

    project: string;

    repositoryName: string;
}

export interface RepositoryContextRetrievalFailedPayload {
    project: string;

    repositoryName: string;

    error: any;
}

export interface FilePathsRetrievalFailedPayload {
    project: string;

    repositoryName: string;
}

export class ActionsHub extends _BaseActionsHub.ActionsHub<_CodeContracts.SearchQuery, _CodeContracts.CodeQueryResponse, _CodeContracts.CodeResult> {
    public contextRetrieved = new Action<ContextRetrievedPayload>();
    public contextRetrievalStarted = new Action();
    public initialItemsRetrieved = new Action<InitialItemsRetrievedPayload>();
    public itemRetrieved = new Action<ItemRetrievedPayload>();
    public itemRetrievalFailed = new Action();
    public knowItemsFetched = new Action<KnowItemsFetchedPayload>();
    public treeItemCollapsed = new Action<string>(TreeItemAction.treeItemAction);
    public treeItemExpanding = new Action<string>(TreeItemAction.treeItemAction);
    public treeItemExpanded = new Action<string>(TreeItemAction.treeItemAction);
    public treePathUpdated = new Action<string>(TreeItemAction.treeItemAction);
    public treeRefreshed = new Action(TreeItemAction.treeItemAction);
    public fileContentRetrievalStarted = new Action();
    public fileContentRetrieved = new Action<FileContentRetrievedPayload>();
    public nextHitNavigated = new Action();
    public prevHitNavigated = new Action();
    public cursorPositionChanged = new Action<CursorPositionChangePayload>();
    public diffLinesChanged = new Action<DiffLinesChangedPayload>();
    public compareVersionPicked = new Action<CompareVersionPickedPayload>();
    public nextCompareHitNavigated = new Action();
    public prevCompareHitNavigated = new Action();
    public compareViewToggled = new Action();
    public filePathsRetrieved = new Action<FilePathsRetrievedPayload>();
    public filePathsRetrievalFailed = new Action<FilePathsRetrievalFailedPayload>();
    public knownFilePathsFetched = new Action<KnownFilePathsFetchedPayload>();
    public treeSearchTextChanged = new Action<string>(TreeItemAction.treeItemAction);
    public treeDropdownDismissed = new Action(TreeItemAction.treeItemAction);
    public treeDropdownInvoked = new Action(TreeItemAction.treeItemAction);
    public treeItemNavigated = new Action<boolean>(TreeItemAction.treeItemAction);
    public activeTabChanged = new Action<ActiveTabChangedPayload>();
    public helpDropdownVisibilityChanged = new Action<boolean>();
    public fullScreenToggled = new Action<boolean>();
    public fileContentRetrievalFailed = new Action<FileContentRetrievalFailedPayload>();
    public contextRetrievalFailed = new Action<ContextRetrievalFailedPayload>();
    public crossAccountMenuDismissed = new Action();
    public tenantQueryStarted = new Action<TenantQueryStartedPayload>();
    public crossAccountMenuToggled = new Action();
    public tenantResultsLoaded = new Action<TenantResultsLoadedPayload>();
    public tenantQueryFailed = new Action<TenantQueryFailedPayload>();
    public contentRendererFetched = new Action<RendererFetchedPayload>();
    public repositoryContextRetrieved = new Action<RepositoryContextRetrievedPayload>();
    public repositoryContextRetrievalFailed = new Action<RepositoryContextRetrievalFailedPayload>();
    public knownRepositoryContextRetrieved = new Action<RepositoryContextRetrievedPayload>();
}
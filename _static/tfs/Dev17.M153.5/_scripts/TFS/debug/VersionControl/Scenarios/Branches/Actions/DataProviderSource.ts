import { BuildArtifact } from "Build.Common/Scripts/BuildArtifacts";
import { LinkingUtilities } from "VSS/Artifacts/Services";
import {DataProviderQuery}  from "VSS/Contributions/Contracts";
import { WebPageDataService } from "VSS/Contributions/Services";
import * as Contribution_Services from "VSS/Contributions/Services";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as Performance from "VSS/Performance";
import * as Serialization from "VSS/Serialization";
import * as UserClaimsService from "VSS/User/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as VSS_Service from "VSS/Service";
import Settings_RestClient = require("VSS/Settings/RestClient");
import * as Utils_Array from "VSS/Utils/Array";
import * as String from "VSS/Utils/String";
import {
    GitRef,
    GitQueryBranchStatsCriteria,
    GitVersionDescriptor,
    GitVersionType,
    GitRefFavorite,
    TypeInfo,
    GitCommitRef,
    GitPullRequest,
    GitStatus
} from "TFS/VersionControl/Contracts";
import {ProjectCollection} from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as PolicyService from "Policy/Scripts/TFS.Policy.ClientServices";
import {PolicyConfiguration} from  "Policy/Scripts/Generated/TFS.Policy.Contracts";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as Q from "q";
import {MyBranchesUpdate} from "VersionControl/Scenarios/Branches/Stores/BranchesTreeStore";
import { CompareBranch, CompareBranchUpdate } from "VersionControl/Scenarios/Branches/Stores/CompareBranchStore";
import * as KeyValue from "Presentation/Scripts/TFS/Stores/DictionaryStore";
import {StaleBranchesUpdate} from "VersionControl/Scenarios/Branches/Stores/StaleBranchesStore";
import {SelectionObject} from "VersionControl/Scenarios/Branches/Stores/TabSelectionStore";
import * as SmartTree from "Presentation/Scripts/TFS/Stores/TreeStore";
import * as BranchActions from "VersionControl/Scenarios/Branches/Actions/BranchesActions";
import { readCompareBranchLocally, saveCompareBranchLocally } from "VersionControl/Scenarios/Branches/Actions/CompareBranchLocalStorageSource";
import * as GitClientSource from "VersionControl/Scenarios/Branches/Actions/GitClientSource";
import * as Message from "VersionControl/Scenarios/Branches/Actions/Message";
import * as Branches from "VersionControl/Scenarios/Branches/Stores/BranchesStore";
import { BranchPermissions } from "VersionControl/Scenarios/Branches/Stores/BranchPermissionsStore";
import { AggregateState } from "VersionControl/Scenarios/Branches/Stores/StoresHub";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import * as BranchResources from "VersionControl/Scripts/Resources/TFS.Resources.Branches";
import { GitRefPolicyScope } from "VersionControl/Scenarios/Shared/Policy/GitRefPolicyScope";
import {convertArtifactUriToPublicUrl} from "VersionControl/Scripts/Utils/Build";

let _webPageDataService: WebPageDataService = VSS_Service.getService(Contribution_Services.WebPageDataService);
let _extensionService: Contribution_Services.ExtensionService = VSS_Service.getService(Contribution_Services.ExtensionService) as Contribution_Services.ExtensionService;
const _perfScenarioManager = Performance.getScenarioManager() as Performance.IScenarioManager;
let _initializedAllBranches = false;
let _initializedMyBranches = false;
let _loadCompareBranchPromise: IPromise<GitRef>;
let _initializedStaleBranches = false;
let _initialized = false;
let _gitRepoContext: GitRepositoryContext = null;
let _getAggregateState = () => ({} as AggregateState);
let _lastFilter: string = null;
let _demandLoading: boolean = true;
let _allBranchesTotal: number = null;
let _policyService: PolicyService.PolicyClientService = null;

const _allBranchesContributionId: string = "ms.vss-code-web.all-branches-data-provider";
const _myBranchesContributionId: string = "ms.vss-code-web.my-branches-data-provider";
const _staleBranchesContributionId: string = "ms.vss-code-web.stale-branches-data-provider";

export function reset(): void {
    _initialized = false;
    _initializedAllBranches = false;
    _initializedMyBranches = false;
    _initializedStaleBranches = false;
}

/**
* Initialize the branches scenario.
*/
export function initialize(repoContext: GitRepositoryContext, all: boolean, getAggregateState: () => AggregateState): IPromise<{}> {
    if (_initialized) {
        return Q(undefined);
    }

    const promises: IPromise<any>[] = [];
    const scenario = _perfScenarioManager.startScenario("VersionControl", "BranchActions.initialize");

    _gitRepoContext = repoContext;
    _getAggregateState = getAggregateState;

    const pageData = _webPageDataService.getPageData<any>(_myBranchesContributionId) || {};

    const favorites: GitRefFavorite[] = Serialization.ContractSerializer.deserialize(pageData["Git.Branches.Favorites"], TypeInfo.GitRefFavorite) || [];
    BranchActions.InitializeFavorites.invoke(favorites);

    const createdBranches: GitRef[] = Serialization.ContractSerializer.deserialize(pageData["Git.Branches.UserCreated"], TypeInfo.GitRef) || [];
    BranchActions.InitializeCreatedBranches.invoke(createdBranches);
    
    //My is always returned from the JSON island
    initializeMyBranches();

    //If initializing for the first time with All, we should have both All and Mine in the page JSON island.
    // Else, if Mine, then it's just Mine and All are lazy loaded when needed.
    if (all) {

        Message.Creators.showInfoNoAction(
            BranchResources.BranchesLoading,
            "status-progress",
            Message.LOADING_BRANCHES_MESSAGE_NUM
        );

        _demandLoading = Serialization.ContractSerializer.deserialize(pageData["Git.Branches.All.FetchData"], String as any) ? true : false;
        BranchActions.AllBranchesDemandLoading.invoke(_demandLoading);
        _allBranchesTotal = Serialization.ContractSerializer.deserialize(pageData["Git.Branches.All.Total"], Number as any) || null;

        if (Serialization.ContractSerializer.deserialize(pageData["Git.Branches.Folder.HasMore"], String as any)) {
            BranchActions.AllBranchesHasMore.invoke(true);
        }

        promises.push(_loadCompareBranchPromise.then(compareBranch =>
            readBranchesContributionResult(pageData, "Git.Branches.All", compareBranch)));
        _initializedAllBranches = true;

        Message.Creators.dismissMessage(Message.LOADING_BRANCHES_MESSAGE_NUM);
    }

    _initialized = true;

    scenario.end();

    return Q.all(promises);
}

export function getPolicyClient(): PolicyService.PolicyClientService {
    if (!_policyService) {
        _policyService = TFS_OM_Common.ProjectCollection.getConnection(_gitRepoContext.getTfsContext()).getService(PolicyService.PolicyClientService);;
    }
    return _policyService;
}

export function testOverride(webPageDataService: WebPageDataService, gitRepoContext?: GitRepositoryContext) {
    _webPageDataService = webPageDataService;
    _gitRepoContext = gitRepoContext;

    //Reset Testing State
    _initializedAllBranches = false;
    _initializedMyBranches = false;
    _initializedStaleBranches = false;
    _initialized = false;
}

/**
 *  Fixes Ref build urls
 */
function fixRefBuildUrl(refs: GitRef[]) {
    for (const ref of refs) {
        if (ref.statuses && ref.statuses.length > 0) {
            convertArtifactUriToPublicUrl(ref.statuses, _gitRepoContext);
        }
    }
}

/**
 * Looks up the compare and default branch from pagedata
 */
function loadCompareBranch(pageData: any, defaultBranch: GitRef): IPromise<GitRef> {
    const compareBranch: GitRef = Serialization.ContractSerializer.deserialize(pageData["Git.Branches.Compare"], TypeInfo.GitRef) || null;
    if (compareBranch) {
        return Q(compareBranch);
    }

    const compareBranchName: string = pageData["Git.Branches.CompareName"] || null;
    if (compareBranchName && defaultBranch) {
        // If the compareBranch Ref is null but the compareName isn't, reset the compare branch to the default branch
        Message.Creators.showWarningWithClear(String.format(BranchResources.CompareBranchReset, compareBranchName, GitRefUtility.getRefFriendlyName(defaultBranch.name)));
        setCompareBranchCall(_gitRepoContext, defaultBranch.name).then<void>(() => { /* no-op on success */ }, (error: Error) => {
            Message.Creators.showErrorWithClear(error.message);
        });

        return Q(defaultBranch);
    } else {
        const localCompareBranch = readCompareBranchLocally(_gitRepoContext.getRepositoryId());
        if (!localCompareBranch || defaultBranch && localCompareBranch === defaultBranch.name) {
            return Q(defaultBranch);
        } else {
            return fetchRef(localCompareBranch);
        }
    }
}

function fetchRef(refName: string): IPromise<GitRef> {
    const gitClient = _gitRepoContext.getGitClient();
    return Q.Promise((resolve, reject) =>
        gitClient.beginGetGitRef(_gitRepoContext.getRepository(), refName, refs => resolve(refs[0]), reject));
}

export function initializeMyBranches() {
    if (!_initializedMyBranches) {

        // My branch information should always be available in the page JSON island.
        const pageData = _webPageDataService.getPageData<any>(_myBranchesContributionId) || {};
        const myBranches: GitRef[] = Serialization.ContractSerializer.deserialize(pageData["Git.Branches.Mine"], TypeInfo.GitRef) || [];
        fixRefBuildUrl(myBranches);

        const defaultBranch: GitRef = Serialization.ContractSerializer.deserialize(pageData["Git.Branches.Default"], TypeInfo.GitRef) || null;
        if (defaultBranch) {
            fixRefBuildUrl([defaultBranch]);
            BranchActions.InitializeDefaultBranch.invoke(defaultBranch);
        }

        _loadCompareBranchPromise = loadCompareBranch(pageData, defaultBranch);
        _loadCompareBranchPromise.then(compareBranch => {
            if (compareBranch) {
                fixRefBuildUrl([compareBranch]);
                let isMine: boolean = false;
                if ((myBranches.filter(ref => ref.name === compareBranch.name).length === 1)
                    && (!defaultBranch
                        || String.ignoreCaseComparer(defaultBranch.name, compareBranch.name) !== 0)) {
                    isMine = true;
                }
                BranchActions.InitializeCompareBranch.invoke({ref: compareBranch, isMine} as CompareBranch);
            }

            //Load PR, Commits, and ahead/behind info
            readContributionResult(pageData, myBranches, compareBranch || defaultBranch);
        });

        BranchActions.InitializeMyBranches.invoke(myBranches);

        _initializedMyBranches = true;
    }
}

export function setCompareBranchCall(repoContext: GitRepositoryContext, compareBranchName: string): IPromise<void> {
    const { permissions } = _getAggregateState();
    if (permissions.setCompareBranch) {
        const settingsClient = VSS_Service.getClient(Settings_RestClient.SettingsHttpClient, undefined, undefined, undefined, { showProgressIndicator: false });
        const entries: IDictionaryStringTo<any> = {};
        entries["Branches.Compare"] = compareBranchName;
        return settingsClient.setEntriesForScope(entries, "me", "Repository", repoContext.getRepositoryId());
    } else {
        saveCompareBranchLocally(repoContext.getRepositoryId(), compareBranchName);
        return Q(undefined);
    }
}

export function setCompareBranch(repoContext: GitRepositoryContext,
    newCompareBranch: GitRef,
    newCompareIsMine: boolean,
    oldCompareBranch: GitRef,
    oldCompareIsMine: boolean,
    oldCompareIsDefault: boolean,
        commitMetadata: GitCommitRef[]): IPromise<void> {
    return setCompareBranchCall(repoContext, newCompareBranch.name).then<void>(() => {
        BranchActions.SetCompareBranch.invoke(
        {
            newCompareBranch,
            newCompareIsMine,
            oldCompareBranch,
            oldCompareIsMine,
            oldCompareIsDefault
            } as CompareBranchUpdate);
        BranchActions.RemoveAllBranchStats.invoke(newCompareBranch.name);
        computeAheadBehind(newCompareBranch, commitMetadata);
    }, (error: Error) => {
        Message.Creators.showErrorWithClear(error.message);
    });
}

export function refreshMyBranches(currentBranchNames: string[]): IPromise<void> {
    const properties = {
        "repositoryName": _gitRepoContext.getRepository().name,
        "mineRefresh": true
    };

    return _webPageDataService.getDataAsync(_myBranchesContributionId, null, properties)
        .then(data => {
            data = data || {};

            //Get my branches
            const myBranches: GitRef[] = Serialization.ContractSerializer.deserialize(data["Git.Branches.Mine"], TypeInfo.GitRef) || [];
            fixRefBuildUrl(myBranches);

            //Load PR, Commits, and ahead/behind info
            const compareBranch = getEffectiveCompareBranch();
            readContributionResult(data, myBranches, compareBranch);

            //Make sure the compare state is correct in my Branches
            let includeCompareBranch: boolean = false;
            if (compareBranch) {
                if (myBranches.filter(r => r.name === compareBranch.name).length == 1) {
                    includeCompareBranch = true;
                }
            }

            //Remove branches from mine, that have been removed
            const newBranchNames: string[] = myBranches.map(branch => GitRefUtility.getRefFriendlyName(branch.name));
            const branchNamesToRemove: string[] = Utils_Array.subtract(currentBranchNames, newBranchNames);

            //Add branches to mine, that have been added
            const oldBranchRefs = currentBranchNames.map(item => {
                return { name: item } as GitRef;
            });
            const branchRefsToAdd: GitRef[] = Utils_Array.subtract(myBranches, oldBranchRefs, (item1, item2) => {
                return String.ignoreCaseComparer(GitRefUtility.getRefFriendlyName(item1.name), GitRefUtility.getRefFriendlyName(item2.name));
            });
            BranchActions.MyBranchesChanged.invoke({
                branchesToAdd: branchRefsToAdd,
                branchNamesToRemove: branchNamesToRemove,
                compareBranch: compareBranch,
                compareBranchIsMine: includeCompareBranch
            } as MyBranchesUpdate);
        })
        .catch(error => Message.Creators.showErrorWithClear(error.message));
}

export function initializeAllBranches(): IPromise<void> {

    if (!_initializedAllBranches) {

        Message.Creators.showInfoNoAction(
            BranchResources.BranchesLoading,
            "status-progress",
            Message.LOADING_BRANCHES_MESSAGE_NUM
        );

        const extensionService = VSS_Service.getService(Contribution_Services.ExtensionService);
        const contributionService = VSS_Service.getService(Contribution_Services.WebPageDataService);

        // Lazy load All branch information from the data provider since this is a large amount of data that should not come down with the page unless requested.
        return extensionService.getContribution(_allBranchesContributionId).then<void>(() => {
            const pageData = contributionService.getPageData<any>(_allBranchesContributionId) || {};
            _demandLoading = Serialization.ContractSerializer.deserialize(pageData["Git.Branches.All.FetchData"], String as any) ? true : false;
            BranchActions.AllBranchesDemandLoading.invoke(_demandLoading);
            _allBranchesTotal = Serialization.ContractSerializer.deserialize(pageData["Git.Branches.All.Total"], Number as any) || null;

            if (Serialization.ContractSerializer.deserialize(pageData["Git.Branches.Folder.HasMore"], String as any)) {
                BranchActions.AllBranchesHasMore.invoke(true);
            }

            readBranchesContributionResult(pageData, "Git.Branches.All", getEffectiveCompareBranch());
            _initializedAllBranches = true;

            Message.Creators.dismissMessage(Message.LOADING_BRANCHES_MESSAGE_NUM);

        });
    }
    return Q<void>(null);
}

/**
 * Read stale data from JSON island
 */
function populateStaleData(pageData: any) {

    // Read full Result
    readBranchesContributionResult(pageData, "Git.Branches.Stale", getEffectiveCompareBranch());

    // Clear loading message
    Message.Creators.dismissMessage(Message.LOADING_BRANCHES_MESSAGE_NUM);

    // If no results show no branches messages  
    if (!Serialization.ContractSerializer.deserialize(pageData["Git.Branches.Stale"], TypeInfo.GitRef)) {
        Message.Creators.showNoBranchesMessage(BranchResources.NoStaleBranches);
    }
}

/**
 * Look up JSON island and read stale data
 * request stale contribution if necessary
 */
export function initializeStaleBranches(): IPromise<void> {

    if (!_initializedStaleBranches) {

        _initializedStaleBranches = true;

        Message.Creators.showInfoNoAction(
            BranchResources.BranchesLoading,
            "status-progress",
            Message.LOADING_BRANCHES_MESSAGE_NUM
        );

        let pageData = _webPageDataService.getPageData<any>(_myBranchesContributionId) || {};

        //Check if stale data came down with data island
        if (Serialization.ContractSerializer.deserialize(pageData["Git.Branches.Stale"], TypeInfo.GitRef)) {
            populateStaleData(pageData);
        }
        else {
            // Stale data is lazy loaded since this wasn't the landing tab
            return _extensionService.getContribution(_staleBranchesContributionId).then<void>(() => {
                pageData = _webPageDataService.getPageData<any>(_staleBranchesContributionId) || {};
                populateStaleData(pageData);
            });
        }
    }
    return Q<void>(null);
}

export function getMoreStaleBranches(stalePage: number): IPromise<void> {
    BranchActions.StaleBranchesLoading.invoke(true);

    const properties = {
        "repositoryName": _gitRepoContext.getRepository().name,
        "stalePage": stalePage
    };

    return _webPageDataService.getDataAsync(_staleBranchesContributionId, null, properties)
        .then(data => populateStaleData(data || {}))
        .catch(error => Message.Creators.showErrorWithClear(error.message));
}

export function getAllFolderNodes(folderName: string, folderPage: number): IPromise<boolean> {
    const properties = {
        "HasMoreFolder": folderName,
        "repositoryName": _gitRepoContext.getRepository().name,
        "folderPage": folderPage
    };

    return _webPageDataService.getDataAsync(_allBranchesContributionId, null, properties)
        .then(data => {
            readBranchesContributionResult(data || {}, "Git.Branches.Folder", getEffectiveCompareBranch());
            return Serialization.ContractSerializer.deserialize(data["Git.Branches.Folder.HasMore"], String as any) ? true : false;
        })
        .catch(error => {
            Message.Creators.showErrorWithClear(error.message);
            return false;
        });
}

function readBranchesContributionResult(pageData: any, gitRefString: string, compareBranch: GitRef) {
    const branches: GitRef[] = Serialization.ContractSerializer.deserialize(pageData[gitRefString], TypeInfo.GitRef) || [];
    fixRefBuildUrl(branches);

    readContributionResult(pageData, branches, compareBranch);
    switch (gitRefString)
    {
        case "Git.Branches.Stale":
            // Check for Has More and send Stale Branch Update
            const hasMore: boolean = Serialization.ContractSerializer.deserialize(pageData["Git.Branches.Stale.HasMore"], Boolean as any) || false;
            BranchActions.InitializeStaleBranches.invoke({
                refs: branches,
                hasMore
            } as StaleBranchesUpdate);
            break;
        case "Git.Branches.All":
        case "Git.Branches.Folder":
            BranchActions.InitializeAllBranches.invoke(branches);
            break;
        default:
            Message.Creators.showErrorWithClear(BranchResources.UnknownDataProvider);
    }
}

function readContributionResult(pageData: any, refs: GitRef[], compareBranch: GitRef) {
    const commitMetadata: GitCommitRef[] = Serialization.ContractSerializer.deserialize(pageData["Git.Branches.Metadata"], TypeInfo.GitCommitRef) || [];
    BranchActions.InitializeCommitMetaData.invoke(commitMetadata);

    const gitPullRequest: GitPullRequest[] = Serialization.ContractSerializer.deserialize(pageData["Git.Branches.PullRequests"], TypeInfo.GitPullRequest) || [];
    BranchActions.InitializeGitPullRequest.invoke(gitPullRequest);

    if (compareBranch) {
        computeAheadBehind(compareBranch, commitMetadata);
    }

    if (UserClaimsService.getService().hasClaim(UserClaimsService.UserClaims.Member)) {

        const branchesWithPolicies: GitRef[] = Serialization.ContractSerializer.deserialize(pageData["Git.Branches.Policies"], TypeInfo.GitRef) || [];
        const scopes: GitRefPolicyScope[] = [];
        const repositoryId = _gitRepoContext.getRepositoryId();

        $.each(branchesWithPolicies, (i: number, branchWithPolicy: GitRef) => {
            if (branchWithPolicy && branchWithPolicy.name) { 
                scopes.push(new GitRefPolicyScope(repositoryId, branchWithPolicy.name, "Exact"));
            }
        });

        BranchActions.InitializeBranchPolicies.invoke(scopes);
    }
}

function computeAheadBehind(compareBranch: GitRef, commitMetadata: GitCommitRef[]) {
    if (compareBranch) {
        const targetCommits: GitVersionDescriptor[] = commitMetadata.map(commit => {
            return {
                version: commit.commitId,
                versionType: GitVersionType.Commit
            } as GitVersionDescriptor
        });

        const baseCommit: GitVersionDescriptor = {
            version: compareBranch.objectId,
            versionType: GitVersionType.Commit
        } as GitVersionDescriptor;

        GitClientSource.getGitHttpClient().getBranchStatsBatch(
            {
                baseCommit: baseCommit,
                targetCommits: targetCommits
            } as GitQueryBranchStatsCriteria,
            _gitRepoContext.getRepository().id,
            _gitRepoContext.getRepository().project.id
        ).then(results => {
            BranchActions.AddBranchStats.invoke(results);
        });
    }
}

/**
 * Loads a filtered tree if filterd text has been entered
 */
export function filterBranch(filterText: string, allBranches: KeyValue.DictionaryStore<Branches.GitRefWithState>, filterTreeStore: SmartTree.TreeStore, tabTree: SmartTree.TreeStore, filterStoreText: string, currentAction: string, compareBranch: GitRef) {

    if (filterText && (String.ignoreCaseComparer(filterStoreText, filterText) !== 0)) {

        const scenario = _perfScenarioManager.startScenario("VersionControl", "BranchActions.filterBranch");

        Message.Creators.dismissMessage(Message.FILTER_MESSAGE_NUM);
        Message.Creators.showInfoNoAction(
            BranchResources.BranchesLoading,
            "status-progress",
            Message.FILTER_MESSAGE_NUM
        );

        //update the latest filter
        _lastFilter = filterText;

        let filteredBranches: GitRef[] = null;

        if (_demandLoading) {
            //Server Side Filtering
            scenario.addData({
                filter: filterText,
                totalBranches: _allBranchesTotal,
                process: "server"
            });

            const properties = {
                "filterString": filterText,
                "repositoryName": _gitRepoContext.getRepository().name,
            };

            _webPageDataService.getDataAsync(_allBranchesContributionId, null, properties)
                .then(data => {
                    //Enusure the result matches the latest request
                    if (filterText !== _lastFilter) {
                        return;
                    }

                    data = data || {};
                    const totalMatches: number = data["Git.Branches.Filter.Count"] || -1;

                    //Get the set of branches matching the filter
                    filteredBranches = Serialization.ContractSerializer.deserialize(data["Git.Branches.Filter"], TypeInfo.GitRef) || [];
                    fixRefBuildUrl(filteredBranches);

                    //Make sure any newly loaded branches exist in the branches store
                    BranchActions.InitializeFilterBranches.invoke(filteredBranches);

                    //Read Contribution result
                    readContributionResult(data, filteredBranches, compareBranch);

                    //Display Filter
                    displayFilter(filterText, allBranches, filterTreeStore, tabTree, currentAction, filteredBranches, _allBranchesTotal, totalMatches, compareBranch);
                })
            .catch(error => Message.Creators.showErrorWithClear(error.message));
        }
        else {
            //Perform client side filtering on branches
            scenario.addData({
                filter: filterText,
                totalBranches: allBranches.getAll().length,
                process: "client"
            });

            const filter = ref => {
                return String.caseInsensitiveContains(GitRefUtility.getRefFriendlyName(ref.gitRef.name), filterText);
            }
            const filteredStatusBranches: Branches.GitRefWithState[] = allBranches.getAll().filter(filter);
            filteredBranches = filteredStatusBranches.map(ref => { return ref.gitRef });
            
            //Display Filter
            displayFilter(filterText, allBranches, filterTreeStore, tabTree, currentAction, filteredBranches, allBranches.getAll().length, -1, compareBranch);
        }
        scenario.end();
    }
    else {
        if (!filterText && String.ignoreCaseComparer("all", currentAction) === 0) {
                
            //Nothing to filter revert to tree for the tab
            resetFilter();

            //Make sure all branches have loaded
            initializeAllBranches().then(() => {
                BranchActions.TabSelection.invoke({
                    selection: "all",
                    branchesStore: tabTree, 
                    folderCollapsedAction: BranchActions.AllFolderCollapsed, 
                    folderExpandedAction: BranchActions.AllFolderExpanded,
                    displayFlat: false,
                } as SelectionObject);
            });
        }
    }
}

function displayFilter(filterText: string, allBranches: KeyValue.DictionaryStore<Branches.GitRefWithState>, filterTreeStore: SmartTree.TreeStore, allTree: SmartTree.TreeStore, currentAction: string, filteredBranches: GitRef[], totalRows: number, totalMatches: number, compareBranch: GitRef) {

    BranchActions.SetFilter.invoke(filterText);

    //Make sure we're on the All Tab
    if (String.ignoreCaseComparer("all", currentAction) !== 0) {
        Navigation_Services.getHistoryService().addHistoryPoint("all", {});
    }
   
    //Kick off Filtered View
    BranchActions.TabSelection.invoke({
        selection: "filter_" + filterText, 
        branchesStore: filterTreeStore, 
        folderCollapsedAction: BranchActions.FilterFolderCollapsed, 
        folderExpandedAction: BranchActions.FilterFolderExpanded,
        displayFlat: false,
    } as SelectionObject);

    //Load Filtered Tree
    BranchActions.InitializeFilterTree.invoke(filteredBranches);

    //Set Message
    const cancelDeletedBranches = () => filterBranch(filterText, allBranches, filterTreeStore, allTree, "", currentAction, compareBranch);
    showFilterMessage(totalRows, filteredBranches.length, filterText, totalMatches, allTree, cancelDeletedBranches);
}

export function resetFilter() {
    BranchActions.SetFilter.invoke("");
    Message.Creators.dismissMessage(Message.FILTER_MESSAGE_NUM);
}

function showFilterMessage(
    totalBranches: number,
    showMatches: number,
    filter: string,
    totalMatches: number,
    allTree: SmartTree.TreeStore,
    cancelDeletedBranchesSearch: () => void,
) {
    let message;
    if (showMatches === 0) {
        message = String.format(BranchResources.FilterNoMatchesText, filter);
    }
    else if (totalMatches !== -1) {
        message = String.format(BranchResources.FilterMatchesLimitedText, showMatches, filter);
    }
    else {
        if (showMatches === 1) {
            message = String.format(BranchResources.FilterMatchText, showMatches, filter);
        }
        else {
            message = String.format(BranchResources.FilterMatchesText, showMatches, filter);
        }
    }

    Message.Creators.showInfo({
        key: Message.FILTER_MESSAGE_NUM,
        text: message,
        actionLabel: BranchResources.SearchForExactMatch,
        actionCallback: () => {
            Message.Creators.dismissMessage(Message.FILTER_MESSAGE_NUM);
            GitClientSource.searchForDeletedBranch(_gitRepoContext, filter, cancelDeletedBranchesSearch);
        },
    });
}

function getEffectiveCompareBranch(): GitRef {
    const aggregateState = _getAggregateState();
    return aggregateState.compareBranch && aggregateState.compareBranch.ref ||
        aggregateState.defaultBranch;
}

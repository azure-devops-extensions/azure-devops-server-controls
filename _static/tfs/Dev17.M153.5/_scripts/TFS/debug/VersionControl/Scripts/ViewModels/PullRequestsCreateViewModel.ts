import ko = require("knockout");
import Q = require("q");

import Performance = require("VSS/Performance");
import Utils_String = require("VSS/Utils/String");

import Navigation_Services = require("VSS/Navigation/Services");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import VCContracts = require("TFS/VersionControl/Contracts");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import VCViewModel = require("VersionControl/Scripts/TFS.VersionControl.ViewModel");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCPullRequestsControls = require("VersionControl/Scripts/Controls/PullRequest");
import VCPullRequestCreateEditControlViewModel = require("VersionControl/Scripts/ViewModels/PullRequestCreateEditControlViewModel");
import VCPullRequestNotificationControlViewModel = require("VersionControl/Scripts/ViewModels/PullRequestNotificationControlViewModel");
import VCPullRequestCreateViewViewModel = require("VersionControl/Scripts/ViewModels/PullRequestCreateViewViewModel");
import VCCommentParser = require("VersionControl/Scripts/CommentParser");

import VSS_Service = require("VSS/Service");
import Contribution_Services = require("VSS/Contributions/Services");

export class CreateViewModel extends VCViewModel.VersionControlViewModel {
    public static DEFAULT_MAX_HISTORY_ITEMS_COUNT = 100;
    public static DEFAULT_MAX_NUM_WORK_ITEMS_TO_LINK = 200;
    public static MAX_DESCRIPTION_LENGTH = 4000;

    public notificationViewModel: VCPullRequestNotificationControlViewModel.NotificationViewModel;
    public createEditControlViewModel: VCPullRequestCreateEditControlViewModel.CreateEditControlViewModel;

    public existingPullRequestID;
    public dataIslandSourceRef: string;
    public dataIslandTargetRef: string;
    public historyList: VCLegacyContracts.HistoryQueryResults;

    public changeListModel: any;

    public defaultTitle: string;
    public defaultDescription: string;

    public changeModelAvailable: KnockoutObservable<boolean>;

    public sourceBranchName: KnockoutObservable<string>;
    public targetBranchName: KnockoutObservable<string>;

    public hasSourceAndTargetBranches: KnockoutComputed<boolean>;

    public serverValidationComplete: KnockoutObservable<boolean>;

    /**
     * Flag indicating that the pull request creation has completed.
     */
    public pullRequestCreationCompleted: KnockoutObservable<boolean> = ko.observable(false);

    public canCreatePullRequest: boolean = false;

    public switchBranch: () => void;

    private _scenarioManager: Performance.IScenarioManager = Performance.getScenarioManager();
    private _hasUnusedJsonIslandData;

    private static DATA_ISLAND_CONTRIBUTION_ID = "ms.vss-code-web.pull-request-create-data-provider";
    private static DATA_ISLAND_PREFIX = "pullrequestcreate";
    private static DATA_ISLAND_EXISTING_PR_SUFFIX = "ActivePullRequest";
    private static DATA_ISLAND_SOURCE_REF_SUFFIX = "sourceRef";
    private static DATA_ISLAND_TARGET_REF_SUFFIX = "targetRef";

    constructor(repositoryContext: RepositoryContext, parent: VCPullRequestCreateViewViewModel.ViewViewModel) {
        super(repositoryContext, parent);
        this.notificationViewModel = new VCPullRequestNotificationControlViewModel.NotificationViewModel();
        this.createEditControlViewModel = new VCPullRequestCreateEditControlViewModel.CreateEditControlViewModel(repositoryContext, {
            canModifyReviewers: true,
            ok: () => {
                if (this.options && this.options.ok){
                    this.options.ok();
                }
                this._createPullRequest();
            },
            okButtonCaption: VCResources.PullRequest_CreatePullRequestButtonCaption,
            createMode: (parent.options.vcUserPreferences && parent.options.vcUserPreferences.codeReviewCreateMode) ? parent.options.vcUserPreferences.codeReviewCreateMode : VCWebAccessContracts.CodeReviewCreateMode.Advanced
        });

        this.changeModelAvailable = ko.observable(false);

        this.sourceBranchName = <KnockoutObservable<string>>ko.observable();
        this.targetBranchName = <KnockoutObservable<string>>ko.observable();

        this.serverValidationComplete = ko.observable(false);

        this.hasSourceAndTargetBranches = ko.computed(this._computeHasSourceAndTargetBranches, this);

        this.switchBranch = () => {
            this._switchBranch();
        };

        this.createEditControlViewModel.hasFetchedWorkItems(false);
        parent.workItemIds.subscribe(values => {
            if (values != null) {
                this.createEditControlViewModel.hasFetchedWorkItems(true);

                const workItemExceededText: string = values.length > CreateViewModel.DEFAULT_MAX_NUM_WORK_ITEMS_TO_LINK ?
                    Utils_String.format(VCResources.PullRequest_NumWorkItemsLimitExceeded, CreateViewModel.DEFAULT_MAX_NUM_WORK_ITEMS_TO_LINK) : "";
                this.createEditControlViewModel.workItemsExceededText(workItemExceededText);
            }
            else {
                this.createEditControlViewModel.hasFetchedWorkItems(false);
                this.createEditControlViewModel.workItemsExceededText("");
            }
        });

        this._hasUnusedJsonIslandData = true;
        this._processDataIsland();
    }

    public setSourceBranchName(sourceBranchName: string): Q.Promise<any> {
        return this.setBranchNamesWithPromise(sourceBranchName, this.targetBranchName());
    }

    public setTargetBranchName(targetBranchName: string): Q.Promise<any> {
        return this.setBranchNamesWithPromise(this.sourceBranchName(), targetBranchName);
    }

    public setBranchNamesWithPromise(sourceBranchName: string, targetBranchName: string, force: boolean = false): Q.Promise<any> {
        let anyBranchChanged: boolean = false;

        if (this.sourceBranchName() !== sourceBranchName) {
            this.sourceBranchName(sourceBranchName);
            anyBranchChanged = true;
        }

        if (this.targetBranchName() !== targetBranchName) {
            this.targetBranchName(targetBranchName);
            anyBranchChanged = true;
        }
        
        if (!force && !anyBranchChanged) {
            return Q.resolve(true);
        }

        let scenario = this._scenarioManager.startScenario(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.PULL_REQUEST_BRANCH_SELECTION_FEATURE);

        return this._beginServerValidation()
            .then((results) => {
                scenario.end();
                scenario = null;
            })
            .fail((reason) => {
                scenario.end();
                scenario = null;
            });
    }

    public newPullRequest(sourceBranch: string, targetBranch: string): void {
        const createState = {};

        if (sourceBranch) {
            $.extend(createState, {
                sourceRef: encodeURIComponent(sourceBranch)
            });
        }

        if (targetBranch) {
            $.extend(createState, {
                targetRef: encodeURIComponent(targetBranch)
            });
        }

        Navigation_Services.getHistoryService().addHistoryPoint(null, createState, null, false);
    }

    private _beginServerValidation(): Q.Promise<any> {
        let promise: Q.Promise<any>;

        this.notificationViewModel.clear();
        this.changeModelAvailable(false);
        this.serverValidationComplete(false);
        this.canCreatePullRequest = false;

        if (this.hasSourceAndTargetBranches()) {
            const deferredServerCallList = [Q.defer<Object>(), Q.defer<Object>()];

            const targetBranchName: string = this.targetBranchName();
            const sourceBranchName: string = this.sourceBranchName();

            const targetBranchVersionString: string = new VCSpecs.GitBranchVersionSpec(targetBranchName).toVersionString();
            const sourceBranchVersionString: string = new VCSpecs.GitBranchVersionSpec(sourceBranchName).toVersionString();

            if (this._hasUnusedJsonIslandData && this.existingPullRequestID) {
                this._hasUnusedJsonIslandData = false;
                this._getPullRequestCallback(this.existingPullRequestID,
                    sourceBranchVersionString, targetBranchVersionString,
                    true,
                    deferredServerCallList);
            }
            else {
                this.repositoryContext.getClient().beginGetPullRequests(this.repositoryContext,
                    VCContracts.PullRequestStatus.Active,
                    null,
                    null,
                    this.sourceBranchName(), this.targetBranchName(),
                    null, null,
                    (resultPullRequests: VCContracts.GitPullRequest[]) => {
                        const existingPullRequestID: number = resultPullRequests.length > 0 ? resultPullRequests[0].pullRequestId : -1;
                        this._getPullRequestCallback(existingPullRequestID,
                            sourceBranchVersionString, targetBranchVersionString,
                            this._isInitialSourceAndTargetBranches(),
                            deferredServerCallList);
                    }, (error: any) => {
                        deferredServerCallList[0].reject(error);
                        this.serverValidationComplete(true);
                        this._handleError(error);
                    });
            }

            (<GitRepositoryContext>this.repositoryContext).getGitClient().beginGetCommitFileDiff(
                this.repositoryContext,
                targetBranchVersionString, sourceBranchVersionString,
                VCPullRequestsControls.MAX_CHANGES_TO_FETCH, 0, (changeList) => {
                    //if either the target or source branches changed while the fileDiff call was being made, we no longer care about the results
                    if (this.targetBranchName() === targetBranchName && this.sourceBranchName() === sourceBranchName) {
                        this._commitDiffsCallback(changeList, sourceBranchVersionString, deferredServerCallList);
                    }
                }, (error: any) => { deferredServerCallList[1].reject(error); this._handleError(error); });

            promise = Q.allSettled($.map(deferredServerCallList, dsc => dsc.promise));
        }
        else {
            promise = Q.resolve(null);
        }

        return promise;
    }

    private _isInitialSourceAndTargetBranches(): boolean {
        return this.targetBranchName() == decodeURIComponent(this.dataIslandTargetRef)
            && this.sourceBranchName() == decodeURIComponent(this.dataIslandSourceRef);
    }

    private _processDataIsland(): void {
        const webPageDataService = VSS_Service.getService(Contribution_Services.WebPageDataService);
        const pageData = webPageDataService.getPageData<any>(CreateViewModel.DATA_ISLAND_CONTRIBUTION_ID) || {};
        this.dataIslandSourceRef = pageData[CreateViewModel.DATA_ISLAND_PREFIX + "." + CreateViewModel.DATA_ISLAND_SOURCE_REF_SUFFIX];
        this.dataIslandTargetRef = pageData[CreateViewModel.DATA_ISLAND_PREFIX + "." + CreateViewModel.DATA_ISLAND_TARGET_REF_SUFFIX];
        
        if (this.dataIslandSourceRef && this.dataIslandTargetRef) {
            this.existingPullRequestID = pageData[CreateViewModel.DATA_ISLAND_PREFIX + "." +
                this.dataIslandSourceRef + "." + this.dataIslandTargetRef + "." + CreateViewModel.DATA_ISLAND_EXISTING_PR_SUFFIX];
        }
    }

    private _getPullRequestCallback(
        existingPullRequestID: number,
        sourceBranchVersionString: string,
        targetBranchVersionString: string,
        useInputTitleAndDescription: boolean,
        deferredServerCallList): void {
        if (existingPullRequestID < 0) {
            const sourceBranchName = this.sourceBranchName();
            const targetBranchName = this.targetBranchName();
            (<GitRepositoryContext>this.repositoryContext).getGitClient().beginGetHistory(
                this.repositoryContext, <VCContracts.ChangeListSearchCriteria>{
                    top: CreateViewModel.DEFAULT_MAX_HISTORY_ITEMS_COUNT,
                    itemVersion: targetBranchVersionString,
                    compareVersion: sourceBranchVersionString,
                }, (historyList: VCLegacyContracts.HistoryQueryResults) => {
                    if (sourceBranchName != this.sourceBranchName() ||
                        targetBranchName != this.targetBranchName()) {
                        //Source or target has changed. We no longer care about these results so throw them out.
                        deferredServerCallList[0].resolve(true);
                        return;
                    }
                    this._historyQueryCallback(historyList, useInputTitleAndDescription, deferredServerCallList);
                }, (error: any) => { deferredServerCallList[0].reject(error); this.serverValidationComplete(true); this._handleError(error); });
        }
        else {
            this._showExistingPullRequestNotification(existingPullRequestID);
            deferredServerCallList[0].resolve(true);
            this.serverValidationComplete(true);
        }
    }

    private _historyQueryCallback(historyList: VCLegacyContracts.HistoryQueryResults, useInputTitleAndDescription: boolean, deferredServerCallList): void {
        this.historyList = historyList;
        if (!historyList.results.length) {

            const unpopulatedCount: number = (<VCLegacyContracts.GitHistoryQueryResults>historyList).unpopulatedCount;
            const uncalculatedCount: number = (<VCLegacyContracts.GitHistoryQueryResults>historyList).unprocessedCount;

            this._showNoChangesToMergeNotification(unpopulatedCount > 0 || uncalculatedCount > 0);
            deferredServerCallList[0].resolve(true);
        }
        else {
            this.canCreatePullRequest = true;
            this._computeDefaultTitleAndDescription(historyList, useInputTitleAndDescription, deferredServerCallList);
        }

        this.serverValidationComplete(true);
    }

    private _commitDiffsCallback(changeList, sourceBranchVersionString, deferredServerCallList): void {
        this.changeListModel = changeList;
        this.changeListModel.version = sourceBranchVersionString;
        this.changeModelAvailable(true);
        deferredServerCallList[1].resolve(true);
    }

    private _switchBranch(): void {
        this.newPullRequest(this.targetBranchName(), this.sourceBranchName());
    }

    private _createPullRequest(): void {
        const workItemsToLink = (<VCPullRequestCreateViewViewModel.ViewViewModel>this.parent).getWorkItemIds();
        workItemsToLink.splice(CreateViewModel.DEFAULT_MAX_NUM_WORK_ITEMS_TO_LINK);

        const workItemResourceRefs = workItemsToLink.map(item => <VSS_Common_Contracts.ResourceRef>{ id: item.toString(), url: null });

        this.createEditControlViewModel.actionsButtonDisabled(true);
    }

    private _computeDefaultTitleAndDescription(history: VCLegacyContracts.HistoryQueryResults, useInputTitleAndDescription: boolean, deferredServerCallList): void {
        let title: string;
        let description: string;

        if (useInputTitleAndDescription) {
            [title, description] = this._getInputTitleAndDescription();
        }

        let waitForFullCommitComment = false;
        if (history) {
            if (!title) {
                if (history.results.length === 1) {
                    title = VCCommentParser.Parser.getShortComment(history.results[0].changeList.comment);
                }
            }
            if (!description) {
                description = "";
                if (history.results.length === 1) {
                    const changeList = history.results[0].changeList;
                    if (changeList.commentTruncated) {
                        waitForFullCommitComment = true;
                        this.repositoryContext.getClient().beginGetChangeList(this.repositoryContext, changeList.version, 0, (fullChangeList) => {
                            changeList.comment = fullChangeList.comment;
                            changeList.commentTruncated = false;
                            this.defaultDescription = changeList.comment.slice(0, CreateViewModel.MAX_DESCRIPTION_LENGTH);
                            this.createEditControlViewModel.description(this.defaultDescription);
                            deferredServerCallList[0].resolve(true);
                        });
                    }
                    else {
                        description = changeList.comment;
                    }
                }
            }
        }
        this.defaultTitle = title;
        this.defaultDescription = description;
        this.createEditControlViewModel.title(title);
        this.createEditControlViewModel.description(description);
        if (!waitForFullCommitComment) {
            deferredServerCallList[0].resolve(true);
        }
    }

    private _getInputTitleAndDescription(): [string, string] {
        const genRefName: string = sessionStorage.getItem("TFS-PR-GENREF");
        const ontoRefName: string = sessionStorage.getItem("TFS-PR-ONTOREF");
        const inputTitle = sessionStorage.getItem("TFS-PR-TITLE");
        const inputDescription = sessionStorage.getItem("TFS-PR-DESC");

        if (genRefName == this.sourceBranchName() && ontoRefName == this.targetBranchName() && inputTitle && inputDescription) {
            return [inputTitle, inputDescription];
        }

        //fallback for compatibility
        return this._getUrlTitleAndDescription(window.location.href);
    }

    private _getUrlTitleAndDescription(uri: string): [string, string] {
        let title: string = null;
        let description: string = null;

        const queryString = uri.split('?')[1];

        if (queryString) {
            const queryParams: string[] = queryString.split('&');
            for (let i: number = 0; i < queryParams.length; ++i) {
                const item: string[] = queryParams[i].split('=');
                const key: string = item[0];
                const value: string = decodeURIComponent(item[1]);
                if (key === "title") {
                    title = value;
                }
                else if (key === "desc") {
                    description = value;
                }
            }
        }

        return [title, description];
    }

    private _computeHasSourceAndTargetBranches(): boolean {
        if (this.sourceBranchName() && this.targetBranchName()) {
            return true;
        }

        return false;
    }

    private _showNoChangesToMergeNotification(isHistoryUncalculated: boolean): void {
        this.notificationViewModel.clear();

        if (isHistoryUncalculated) {
            this.notificationViewModel.addNotification(VCResources.PullRequest_NoCommitsToMergeDueToUnCalculatedHistoryNotification);
        }
        else {
            this.notificationViewModel.addNotification(VCResources.PullRequest_NoCommitsToMergeNotification);
        }
    }

    private _showExistingPullRequestNotification(pullRequestID: number): void {
        this.notificationViewModel.clear();
        this.notificationViewModel.addNotificationWithLink(VCResources.PullRequest_AnActivePullRequestExistNotification,
            Utils_String.format(VCResources.PullRequest_AnActivePullRequestExistLink, pullRequestID),
            () => {
                window.location.href = VersionControlUrls.getPullRequestUrl(<GitRepositoryContext>this.repositoryContext, pullRequestID);
            });
    }

    private _handleError(error): void {
        this.notificationViewModel.clear();

        if (typeof error === "string") {
            this.notificationViewModel.addError(error);
        }
        else {
            this.notificationViewModel.addError(error.message);
        }
    }
}

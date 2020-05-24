import Q = require("q");

import * as VSS from "VSS/VSS";
import * as Diag from "VSS/Diag";
import * as Service from "VSS/Service";
import * as Contributions_Services from "VSS/Contributions/Services";
import * as Performance from "VSS/Performance";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";
import * as Artifacts_Constants from "VSS/Artifacts/Constants";
import { LinkingUtilities } from "VSS/Artifacts/Services";
import * as FeatureAvailability_Services from "VSS/FeatureAvailability/Services";
import * as Telemetry from "VSS/Telemetry/Services";
import * as ServerConstants from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import { FollowsService, ArtifactSubscription } from "Notifications/Services";
import * as FollowsRestClient from "Notifications/RestClient";
import { ArtifactFilter, SubscriptionQuery, SubscriptionQueryCondition, SubscriptionQueryFlags, NotificationSubscription } from "Notifications/Contracts";
import * as TFS_WorkItemTracking_RestClient from "TFS/WorkItemTracking/RestClient";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { ActionsHub } from "MyExperiences/Scenarios/MyWork/Actions/ActionsHub";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";
import * as CustomerIntelligenceConstants from "MyExperiences/Scripts/CustomerIntelligenceConstants";
import * as MyWorkContracts from "MyExperiences/Scenarios/MyWork/Contracts";
import { ProgressAnnouncer } from "VSS/Utils/Accessibility";
import { IHubHeaderProps, IOrganizationInfoAndCollectionsPickerSectionProps } from "MyExperiences/Scenarios/Shared/Models";
import { isOrgAccountSelectorEnabled } from "MyExperiences/Scenarios/Shared/OrgAccountSelectorFeatureAvailabilityCheckHelper";
import { SettingsService } from "MyExperiences/Scenarios/Shared/SettingsService";
import * as UrlUtils from "MyExperiences/Scenarios/MyWork/UrlUtils";
import * as ErrorUtils from "MyExperiences/Scenarios/MyWork/ErrorUtils";
import { WorkItemStateColorsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateColorsProvider";
import { IdentityHelper } from "Presentation/Scripts/TFS/TFS.OM.Identities";


export class ActionsCreator {
    protected _actionsHub: ActionsHub;

    private _assignedToMe_fetched = false;
    private _followedByMe_fetched = false;
    private _recentActivity_fetched = false;
    private _recentMentions_fetched = false;
    private _restClient: TFS_WorkItemTracking_RestClient.WorkItemTrackingHttpClient;
    private _workItemStateDefaultColor = WorkItemStateColorsProvider.DEFAULT_STATE_COLOR;
    private _perfScenarioManager: Performance.IScenarioManager;

    // For TTI performance
    private _initialLoad = true;

    constructor(actionsHub: ActionsHub) {
        this._actionsHub = actionsHub;
        this._restClient = Service.getClient<TFS_WorkItemTracking_RestClient.WorkItemTrackingHttpClient>(TFS_WorkItemTracking_RestClient.WorkItemTrackingHttpClient);
        this._perfScenarioManager = Performance.getScenarioManager();
    }

    public initialize() {
        this._initializeHubHeaderProps();
        this._initializeFollowedWorkItemIds();
        this._initializeWorkItemSearchData();
    }

    /**
     * Called whenever the user switches pivots
     *
     * @param pivot - The ID for the pivot selected (GUID)
     */
    public pivotSwtiched(pivot: string) {
        this._pivotSwitched(pivot);
    }

    /**
     * Called whenever the user switches pivot
     *
     * @param pivot - The ID for the pivot selected (GUID)
     */
    public switchPivot(pivot: string) {
        this._actionsHub.switchPivot.invoke(pivot);
        this._pivotSwitched(pivot);
    }

    /**
     * Called whenever the user clicks on a workItem to follow
     *
     * @param id - workItemId
     */
    public followWorkItem(id: number) {
        this._followWorkItem(id);
    }

    /**
     * Called whenever the user clicks on a workItem to unfollow
     *
     * @param id - workItemId
     */
    public unfollowWorkItem(id: number) {
        this._unfollowWorkItem(id);
    }

    /**
     * Called whenever OrganizationInfoAndCollectionsPickerSectionProps of the hub header is updated
     * @param props
     */
    public updateHeaderOrganizationInfoAndCollectionPickerProps(props: IOrganizationInfoAndCollectionsPickerSectionProps): void {
        this._actionsHub.updateHeaderOrganizationInfoAndCollectionPickerProps.invoke(props);
    }

    public collectionNavigationFailed(): void {
        this._actionsHub.showPageLevelError.invoke(MyExperiencesResources.AccountSwitcher_CollectionNavigationError);
    }

    /**
     * (Internal) business logic for pivot switched action
     * Note: This method returns a promise for testing purposes only
     * @param pivot
     */
    protected _pivotSwitched(pivot: string): IPromise<void> {

        // Save Sticky Pivot
        this._savePivot(pivot);

        if (Utils_String.equals(pivot, MyWorkContracts.MyWorkPivotKeys.AssignedToMePivotKey, true)) {
            return this._getAssignedToMePromise();
        } else if (Utils_String.equals(pivot, MyWorkContracts.MyWorkPivotKeys.FollowedPivotKey, true)) {
            return this._getFollowedByMePromise();
        } else if (Utils_String.equals(pivot, MyWorkContracts.MyWorkPivotKeys.RecentActivityPivotKey, true)) {
            return this._getRecentActivityPromise();
        } else if (Utils_String.equals(pivot, MyWorkContracts.MyWorkPivotKeys.MentionedPivotKey, true)) {
            return this._getRecentMentionsPromise();
        }

        return Q<void>(null);
    }

    protected _followWorkItem(id: number): IPromise<void> {
        let scenario = this._perfScenarioManager.startScenario(MyWorkContracts.Constants.Area, "FollowWorkItem");
        this._actionsHub.beginFollowWorkItem.invoke(id);

        let followsService = Service.getService(FollowsService);
        let artifact = {
            artifactId: id.toString(),
            artifactType: WITConstants.FollowsConstants.ArtifactType,
            subscriptionId: 0
        };
        return followsService.followArtifact(this._getArtifactSubscriptionForFollows(id)).then(
            (artifact) => {
                scenario.end();
                this._actionsHub.endFollowWorkItem.invoke(id);
                return null;
            },
            (reason: Error) => {
                scenario.end();
                this._actionsHub.showPageLevelError.invoke(MyExperiencesResources.MyWork_ErrorMessage_FailedToFollowUnfollow);
                ErrorUtils.publishError("FailedToFollowException", reason);
            }
        );
    }

    protected _unfollowWorkItem(id: number): IPromise<void> {
        let scenario = this._perfScenarioManager.startScenario(MyWorkContracts.Constants.Area, "UnfollowWorkItem");
        this._actionsHub.beginUnfollowWorkItem.invoke(id);

        let followsService = Service.getService(FollowsService);
        return followsService.unfollowArtifact(this._getArtifactSubscriptionForFollows(id)).then(
            (artifact) => {
                scenario.end();
                this._actionsHub.endUnfollowWorkItem.invoke(id);
                return null;
            },
            (reason: Error) => {
                scenario.end();
                this._actionsHub.showPageLevelError.invoke(MyExperiencesResources.MyWork_ErrorMessage_FailedToFollowUnfollow);
                ErrorUtils.publishError("FailedToUnfollowException", reason);
            }
        );
    }

    private _getArtifactSubscriptionForFollows(id: number): ArtifactSubscription {
        return <ArtifactSubscription> {
            artifactId: id.toString(),
            artifactType: Artifacts_Constants.ArtifactTypeNames.WorkItem,
            subscriptionId: 0
        };
    }

    /**
     * This method returns an IPromise for testing purposes only
     */
    protected _initializeFollowedWorkItemIds(): IPromise<void> {
        let scenario = this._perfScenarioManager.startScenario(MyWorkContracts.Constants.Area, "Initialize.getFollowedWorkItemIds");
        return this._getFollowedWorkItemIds().then(
            (ids) => {
                scenario.end();
                ids = ids || [];
                this._actionsHub.initializeFollowedWorkItemIds.invoke(ids);
                return null;
            },
            (reason: Error) => {
                scenario.end();
                this._actionsHub.showPageLevelError.invoke(MyExperiencesResources.MyWork_ErrorMessage_FailedToGetFollowedIds);
                this._actionsHub.disableFollowsFeature.invoke(null);
                ErrorUtils.publishError("FailedToGetUsersFollowedIdsException", reason);
            }
        );
    }

    /**
     * Helper to get workitem state and type colors and invoke colors available actions
     */
    private _getColorsAndInvokeAction(pivot: string, data: MyWorkContracts.IMyWorkGroupData) {
        // WorkItem state colors
        this._getStateColorsForPivot(pivot, data).then(
            (payload: MyWorkContracts.IStateColors) => {
                this._actionsHub.workItemStateColorsAvailable.invoke(payload);
            },
            (reason: Error) => {
                ErrorUtils.publishError("FailedToGetStateColorsException", reason);
            }
        );
    }

    /**
     * Helper to invoke data available action and get colors
     * Group for telemetry purposes
     */
    private _processGroupData(pivot: string, data: MyWorkContracts.IMyWorkGroupData, group: string) {
        this._actionsHub.groupDataAvailable.invoke(data);
        this._getColorsAndInvokeAction(pivot, data);

        if (this._initialLoad) {
            // Set to false to prevent recording more than once (assigned to me pivot)
            this._initialLoad = false;
            this._perfScenarioManager.recordPageLoadScenario("WITX", "Account.WorkHub.Load");
        }
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.AREAS.MyExperiences,
            CustomerIntelligenceConstants.FEATURES.MYWORK_GROUPDATA_LOADED,
            {
                [CustomerIntelligenceConstants.PROPERTIES.GROUP]: group,
                [CustomerIntelligenceConstants.PROPERTIES.NUM_ITEMS]: data.groupData ? data.groupData.length : -1,
                [CustomerIntelligenceConstants.PROPERTIES.NUM_PROJECTS]: data.groupData ? Utils_Array.unique(data.groupData.map(d => d.teamProject.name), Utils_String.localeIgnoreCaseComparer).length : -1
            })
        );
    }

    // Helper to invoke appropriate actions and publish error to telemetry
    private _handleError(exception: string, reason: Error, groupData: MyWorkContracts.IMyWorkGroupData) {
        this._actionsHub.showPageLevelError.invoke(MyExperiencesResources.MyWork_ErrorMessage_FailedToLoadData);
        this._actionsHub.groupDataAvailable.invoke(groupData);
        ErrorUtils.publishError(exception, reason);
    }

    private _getRecentMentionsPromise(): IPromise<void> {
        if (!this._recentMentions_fetched) {
            this._recentMentions_fetched = true;
            this._perfScenarioManager.split("MyWork.ActionCreator.GetRecentMentions");
            const scenario = this._perfScenarioManager.startScenario(MyWorkContracts.Constants.Area, "GetRecentMentions");
            const recentMentionsPromise = this._getMentionedPivotData().then(
                (data: MyWorkContracts.IMyWorkGroupData) => {
                    scenario.end();
                    this._processGroupData(MyWorkContracts.MyWorkPivotKeys.MentionedPivotKey, data, "Mentioned");
                    return null;
                },
                (reason: Error) => {
                    scenario.end();
                    this._handleError("MentionedPivotFailedToLoadException", reason,
                        {
                            pivotKey: MyWorkContracts.MyWorkPivotKeys.MentionedPivotKey,
                            groupState: MyWorkContracts.IGroupState.Error
                        });
                    return null;
                }
            );
            // Accessible loading experience
            ProgressAnnouncer.forPromise(recentMentionsPromise, {
                announceStartMessage: MyExperiencesResources.MyWork_Loading_MentionedStart,
                announceEndMessage: MyExperiencesResources.MyWork_Loading_PivotChangeEnd,
                announceErrorMessage: MyExperiencesResources.MyWork_Loading_PivotChangeError
            });

            return recentMentionsPromise;
        }
        return Q<void>(null);
    }

    private _getRecentActivityPromise(): IPromise<void> {
        if (!this._recentActivity_fetched) {
            this._recentActivity_fetched = true;
            this._perfScenarioManager.split("MyWork.ActionCreator.GetMyRecentActivity");
            let scenario = this._perfScenarioManager.startScenario(MyWorkContracts.Constants.Area, "GetMyRecentActivity");
            const recentActivityPromise = this._getMyRecentActivityPivotData().then(
                (data: MyWorkContracts.IMyWorkGroupData) => {
                    scenario.end();
                    this._processGroupData(MyWorkContracts.MyWorkPivotKeys.RecentActivityPivotKey, data, "RecentActivity");
                    return null;
                },
                (reason: Error) => {
                    scenario.end();
                    this._handleError("RecentActivityPivotFailedToLoadException", reason,
                        {
                            pivotKey: MyWorkContracts.MyWorkPivotKeys.RecentActivityPivotKey,
                            groupState: MyWorkContracts.IGroupState.Error
                        });
                    return null;
                }
            );
            // Accessible loading experience
            ProgressAnnouncer.forPromise(recentActivityPromise, {
                announceStartMessage: MyExperiencesResources.MyWork_Loading_MyActivityStart,
                announceEndMessage: MyExperiencesResources.MyWork_Loading_PivotChangeEnd,
                announceErrorMessage: MyExperiencesResources.MyWork_Loading_PivotChangeError
            });
            return recentActivityPromise;
        }
        return Q<void>(null);
    }

    private _getFollowedByMePromise(): IPromise<void> {
        if (!this._followedByMe_fetched) {
            this._followedByMe_fetched = true;
            this._perfScenarioManager.split("MyWork.ActionCreator.GetFollowedByMePivotData");
            let scenario = this._perfScenarioManager.startScenario(MyWorkContracts.Constants.Area, "GetFollowedByMePivotData");
            const followedPromise = this._getFollowedByMePivotData().then(
                (data: MyWorkContracts.IMyWorkGroupData) => {
                    scenario.end();
                    this._processGroupData(MyWorkContracts.MyWorkPivotKeys.FollowedPivotKey, data, "Followed");
                    return null;
                },
                (reason: Error) => {
                    scenario.end();
                    this._handleError("FollowedPivotFailedToLoadException", reason,
                        {
                            pivotKey: MyWorkContracts.MyWorkPivotKeys.FollowedPivotKey,
                            groupState: MyWorkContracts.IGroupState.Error
                        });
                    return null;
                }
            );
            // Accessible loading experience
            ProgressAnnouncer.forPromise(followedPromise, {
                announceStartMessage: MyExperiencesResources.MyWork_Loading_FollowingStart,
                announceEndMessage: MyExperiencesResources.MyWork_Loading_PivotChangeEnd,
                announceErrorMessage: MyExperiencesResources.MyWork_Loading_PivotChangeError
            });
            return followedPromise;
        }
        return Q<void>(null);
    }

    private _getAssignedToMePromise(): IPromise<void> {
        if (!this._assignedToMe_fetched) {
            this._assignedToMe_fetched = true;
            this._perfScenarioManager.split("MyWork.ActionCreator.GetAssignedToMePivotData");
            let scenario = this._perfScenarioManager.startScenario(MyWorkContracts.Constants.Area, "GetAssignedToMePivotData");

            let assignedToMe_doing = this._getAssignedToMePivotData(MyWorkContracts.QueryOption.Doing).then(
                (data: MyWorkContracts.IMyWorkGroupData) => {
                    this._perfScenarioManager.split("MyWork.ActionCreator.GetMyRecentActivity.Doing");
                    this._processGroupData(MyWorkContracts.MyWorkPivotKeys.AssignedToMePivotKey, data, "Doing")
                },
                (reason: Error) => {
                    this._handleError("AssignedToMePivotDoingFailedToLoadException", reason,
                        {
                            pivotKey: MyWorkContracts.MyWorkPivotKeys.AssignedToMePivotKey,
                            groupState: MyWorkContracts.IGroupState.Error,
                            groupName: MyExperiencesResources.MyWork_GroupLabel_Doing
                        });
                }
            );
            let assignedToMe_done = this._getAssignedToMePivotData(MyWorkContracts.QueryOption.Done).then(
                (data: MyWorkContracts.IMyWorkGroupData) => {
                    this._perfScenarioManager.split("MyWork.ActionCreator.GetMyRecentActivity.Done");
                    this._processGroupData(MyWorkContracts.MyWorkPivotKeys.AssignedToMePivotKey, data, "Done")
                },
                (reason: Error) => {
                    this._handleError("AssignedToMePivotDoneFailedToLoadException", reason,
                        {
                            pivotKey: MyWorkContracts.MyWorkPivotKeys.AssignedToMePivotKey,
                            groupState: MyWorkContracts.IGroupState.Error,
                            groupName: MyExperiencesResources.MyWork_GroupLabel_Done
                        });
                }
            );
            let endScenarioAndReturn = () => {
                scenario.end();
                return null;
            };

            // Once all promises are resolved, end scenario and return
            const assignedToMePromise = Q.all([assignedToMe_doing, assignedToMe_done]).then(
                endScenarioAndReturn, // Success
                endScenarioAndReturn  // Error
            );
            // Accessible loading experience
            ProgressAnnouncer.forPromise(assignedToMePromise, {
                announceStartMessage: MyExperiencesResources.MyWork_Loading_AssignedToMeStart,
                announceEndMessage: MyExperiencesResources.MyWork_Loading_PivotChangeEnd,
                announceErrorMessage: MyExperiencesResources.MyWork_Loading_PivotChangeError
            });
            return assignedToMePromise;
        }
        return Q<void>(null);
    }

    private _initializeWorkItemSearchData() {
        let invokeSearchAvailable = () => {
            VSS.using(["Search/Scripts/Common/TFS.Search.Constants"], (SearchConstants) => {
                this._actionsHub.workItemSearchUrlAvailable.invoke({
                    isSearchEnabled: true,
                    getUrl: UrlUtils.getGlobalWorkItemSearchUrlHelper(SearchConstants)
                });
            });
        };

        let disableSearch = () => {
            this._actionsHub.workItemSearchUrlAvailable.invoke({ isSearchEnabled: false });
        };

        if (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchWorkItem)) {
            invokeSearchAvailable();
        }
        else {
            Service.getService(Contributions_Services.ExtensionService)
                .getContributions(["ms.vss-search-platform.entity-type-collection"], false, true)
                .then((contributions: IExtensionContribution[]) => {
                    var isWorkItemSearchContributionAvailable = contributions
                        .map((contribution, index) => {
                            return contribution.id.toLowerCase();
                        }).indexOf("ms.vss-workitem-search.workitem-entity-type") !== -1;

                    if (isWorkItemSearchContributionAvailable) {
                        invokeSearchAvailable();
                    }
                    else {
                        disableSearch();
                    }
                }, () => {
                    disableSearch();
                    // Eat the error so we don't get an Unhandled QRejection
                });
        }
    }

    private _getStateColorsForPivot(pivot: string, data: MyWorkContracts.IMyWorkGroupData): IPromise<MyWorkContracts.IStateColors> {
        if (data) {
            let projects: string[] = data.groupData.map(x => x.teamProject.name);

            let dataProvider = WorkItemStateColorsProvider.getInstance();
            let projectsToFetch = projects.filter(x => !dataProvider.isPopulated(x));

            return dataProvider.ensureColorsArePopulated(projectsToFetch).then(
                () => {
                    let colors: IDictionaryNumberTo<string> = {};
                    for (let item of data.groupData) {
                        colors[item.id] = dataProvider.getColor(item.teamProject.name, item.workItemType, item.state);
                    }
                    return {
                        pivot: pivot,
                        colors: colors
                    };
                },
                (error: Error) => {
                    ErrorUtils.publishError("AccountHome (MyWork) - State colors could not be populated", error);
                }
            );
        }
    }
  
    private _getFollowedWorkItemIds(): IPromise<number[]> {
        let notificationsHttpClient = Service.getClient(FollowsRestClient.NotificationHttpClient);
        let wif: ArtifactFilter = { artifactId: undefined, artifactType: WITConstants.FollowsConstants.ArtifactType, artifactUri: undefined, type: "Artifact", eventType: undefined };

        // Use profile service to get id
        let wic: SubscriptionQueryCondition = { subscriptionId: undefined, filter: wif, scope: undefined, subscriberId: TFS_Host_TfsContext.TfsContext.getDefault().currentIdentity.id, flags: null };
        let subQuery: SubscriptionQuery = { conditions: [wic], queryFlags: SubscriptionQueryFlags.None };

        return notificationsHttpClient.querySubscriptions(subQuery).then(
            (subscriptions: NotificationSubscription[]) => {
                let ids = [];
                subscriptions.forEach((subscription: NotificationSubscription) => {
                    let id = parseInt(LinkingUtilities.decodeUri((<ArtifactFilter>subscription.filter).artifactUri).id);
                    ids.push(id);
                });
                return ids;
            });
    }

    /**
     * Get assigned to me pivot data for desired group
     * @param queryOption Option to specify whether to get doing or done data
     */
    private _getAssignedToMePivotData(queryOption: MyWorkContracts.QueryOption): IPromise<MyWorkContracts.IMyWorkGroupData> {

        let groupName = "";
        if (queryOption === MyWorkContracts.QueryOption.Doing) {
            groupName = MyExperiencesResources.MyWork_GroupLabel_Doing;
        }
        else if (queryOption === MyWorkContracts.QueryOption.Done) {
            groupName = MyExperiencesResources.MyWork_GroupLabel_Done;
        }
        else {
            // Unexpected query option is passed here. So assert fail and return empty experience
            Diag.Debug.fail("'getAssignedToMePivotData' unexpected query option");
            return Q({
                pivotKey: MyWorkContracts.MyWorkPivotKeys.AssignedToMePivotKey,
                groupState: MyWorkContracts.IGroupState.Empty,
                groupName: "",
                groupData: []
            });
        }

        return (<any>this._restClient).getAccountMyWorkData(queryOption).then(
            (result: MyWorkContracts.AccountMyWorkResult) => {
                let items = result.workItemDetails;
                return {
                    pivotKey: MyWorkContracts.MyWorkPivotKeys.AssignedToMePivotKey,
                    groupState: (items && items.length > 0) ? MyWorkContracts.IGroupState.Loaded : MyWorkContracts.IGroupState.Empty,
                    groupName: groupName,
                    groupData: this._getWorkItemDetails(items, false),
                    querySizeLimitExceeded: result.querySizeLimitExceeded
                };
            }
        );
    }

    private _getFollowedByMePivotData(): IPromise<MyWorkContracts.IMyWorkGroupData> {
        return (<any>this._restClient).getAccountMyWorkData(MyWorkContracts.QueryOption.Followed).then(
            (result: MyWorkContracts.AccountMyWorkResult) => {
                let items = result.workItemDetails;
                return <MyWorkContracts.IMyWorkGroupData>{
                    pivotKey: MyWorkContracts.MyWorkPivotKeys.FollowedPivotKey,
                    groupState: (items && items.length > 0) ? MyWorkContracts.IGroupState.Loaded : MyWorkContracts.IGroupState.Empty,
                    groupData: this._getWorkItemDetails(items, true),
                    querySizeLimitExceeded: result.querySizeLimitExceeded
                };
            }
        );
    }

    private _getMyRecentActivityPivotData(): IPromise<MyWorkContracts.IMyWorkGroupData> {
        return (<any>this._restClient).getRecentActivityData().then(
            (items: MyWorkContracts.AccountRecentActivityWorkItemModel[]) => {
                if (items) {
                    items.sort((a, b) => b.activityDate.getTime() - a.activityDate.getTime());
                }
                return <MyWorkContracts.IMyWorkGroupData>{
                    pivotKey: MyWorkContracts.MyWorkPivotKeys.RecentActivityPivotKey,
                    groupState: (items && items.length > 0) ? MyWorkContracts.IGroupState.Loaded : MyWorkContracts.IGroupState.Empty,
                    groupData: this._getWorkItemDetailsForRecentActivity(items)
                };
            }
        );
    }

    private _getMentionedPivotData(): IPromise<MyWorkContracts.IMyWorkGroupData> {
        return (<any>this._restClient).getRecentMentions().then(
            (items: MyWorkContracts.AccountRecentMentionWorkItemModel[]) => {
                return <MyWorkContracts.IMyWorkGroupData>{
                    pivotKey: MyWorkContracts.MyWorkPivotKeys.MentionedPivotKey,
                    groupState: (items && items.length > 0) ? MyWorkContracts.IGroupState.Loaded : MyWorkContracts.IGroupState.Empty,
                    groupData: this._getWorkItemDetailsForRecentMentions(items)
                };
            }
        );
    }

    private _getWorkItemDetailsForRecentMentions(items: MyWorkContracts.AccountRecentMentionWorkItemModel[]): MyWorkContracts.IWorkItemDetails[] {
        const pivotData: MyWorkContracts.IWorkItemDetails[] = [];
        if (items && items.length > 0) {
            for (const item of items) {
                pivotData.push({
                    id: item.id,
                    identity: this._getIdentity(item),
                    state: item.state,
                    lastMentionedDate: item.mentionedDateField,
                    friendlyDateString: "",
                    stateColor: this._workItemStateDefaultColor,
                    teamProject: {
                        name: item.teamProject,
                        url: UrlUtils.getProjectUrl(item.teamProject)
                    },
                    title: item.title,
                    workItemType: item.workItemType,
                    url: UrlUtils.getWorkItemEditUrl(item.teamProject, item.id),
                    followed: MyWorkContracts.IFollowedState.Unfollowed,
                    format: MyWorkContracts.WorkItemFormatType.Mentioned
                });
            }
        }
        return pivotData;
    }

    private _getWorkItemDetails(items: MyWorkContracts.AccountWorkWorkItemModel[], needIdentityDetail: boolean): MyWorkContracts.IWorkItemDetails[] {
        let pivotData: MyWorkContracts.IWorkItemDetails[] = [];
        if (items && items.length > 0) {
            for (let item of items) {
                let data: MyWorkContracts.IWorkItemDetails = {
                    id: item.id,
                    state: item.state,
                    lastUpdatedDate: item.changedDate,
                    friendlyDateString: "",
                    stateColor: this._workItemStateDefaultColor,
                    teamProject: {
                        name: item.teamProject,
                        url: UrlUtils.getProjectUrl(item.teamProject)
                    },
                    title: item.title,
                    workItemType: item.workItemType,
                    url: UrlUtils.getWorkItemEditUrl(item.teamProject, item.id),
                    followed: MyWorkContracts.IFollowedState.Unfollowed,
                    format: MyWorkContracts.WorkItemFormatType.Regular,
                    identity: null
                }

                if(needIdentityDetail) {
                    data.identity = this._getIdentity(item);
                }

                pivotData.push(data);
            }
        }
        return pivotData;
    }

    private _getWorkItemDetailsForRecentActivity(items: MyWorkContracts.AccountRecentActivityWorkItemModel[]): MyWorkContracts.IWorkItemDetails[] {
        let pivotData: MyWorkContracts.IWorkItemDetails[] = [];
        if (items && items.length > 0) {
            for (let item of items) {
                pivotData.push({
                    id: item.id,
                    identity: this._getIdentity(item),
                    state: item.state,
                    lastUpdatedDate: item.changedDate,
                    friendlyDateString: "",
                    activityDate: item.activityDate,
                    activityType: item.activityType,
                    stateColor: this._workItemStateDefaultColor,
                    teamProject: {
                        name: item.teamProject,
                        url: UrlUtils.getProjectUrl(item.teamProject)
                    },
                    title: item.title,
                    workItemType: item.workItemType,
                    url: UrlUtils.getWorkItemEditUrl(item.teamProject, item.id),
                    followed: MyWorkContracts.IFollowedState.Unfollowed,
                    format: MyWorkContracts.WorkItemFormatType.RecentActivity
                });
            }
        }
        return pivotData;
    }

    /**
     * Saves pivot to local settings to support sticky behavior
     * @param pivot
     */
    private _savePivot(pivot: string): void {
        Service.getLocalService(SettingsService).savePivot(pivot);
    }

     /**
     * get identity object from item's AssignTo name
     * @param item
     */
    private _getIdentity(item: MyWorkContracts.AccountWorkWorkItemModel
        | MyWorkContracts.AccountRecentActivityWorkItemModel
        | MyWorkContracts.AccountRecentMentionWorkItemModel): MyWorkContracts.IMyWorkIdentity {
        const identity = IdentityHelper.parseUniquefiedIdentityName(item.assignedTo);
        return {
            imageUrl: UrlUtils.getIdentityImageUrl(item.assignedTo),
            uniquefiedName: item.assignedTo || MyExperiencesResources.MyWork_WorkItem_Unassigned,
            displayName: (identity && identity.displayName) || MyExperiencesResources.MyWork_WorkItem_Unassigned
        };
    };

    private _initializeHubHeaderProps(): void {
        this._actionsHub.loadHeaderProps.invoke(_getHeaderProps());
    }
}

function _getHeaderProps(): IHubHeaderProps {
    const headerProps: IHubHeaderProps = {
        title: MyExperiencesResources.MyWork_Title,
        filter: {
            watermark: MyExperiencesResources.MyWork_Filter_Watermark,
        },
        isOrganizationInfoAndCollectionPickerEnabled: isOrgAccountSelectorEnabled()
    };

    return headerProps;
}

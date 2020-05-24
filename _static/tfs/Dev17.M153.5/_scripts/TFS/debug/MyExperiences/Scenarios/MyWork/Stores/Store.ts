import * as VSSStore from  "VSS/Flux/Store";
import * as Diag from "VSS/Diag";
import Utils_Date = require("VSS/Utils/Date");
import * as Utils_String from "VSS/Utils/String";
import * as Telemetry from "VSS/Telemetry/Services";

import * as MyWorkContracts from "MyExperiences/Scenarios/MyWork/Contracts";
import * as CustomerIntelligenceConstants from "MyExperiences/Scripts/CustomerIntelligenceConstants";
import { ActionsHub } from "MyExperiences/Scenarios/MyWork/Actions/ActionsHub";
import { HubActions } from "MyExperiences/Scenarios/Shared/Actions";
import { IHubHeaderProps, IOrganizationInfoAndCollectionsPickerSectionProps } from "MyExperiences/Scenarios/Shared/Models";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";

export class Store extends VSSStore.Store {

    private _actionHub: ActionsHub;
    private _followedWorkItemsLookup: IDictionaryNumberTo<MyWorkContracts.IFollowedState> = {};
    private _activeAssignedToMe: MyWorkContracts.IMyWorkGroupData;
    private _completeAssignedToMe: MyWorkContracts.IMyWorkGroupData;
    private _followedByMe: MyWorkContracts.IMyWorkGroupData;
    private _recentActivity: MyWorkContracts.IMyWorkGroupData;
    private _recentMentions: MyWorkContracts.IMyWorkGroupData;
    private _workItems: IDictionaryNumberTo<MyWorkContracts.IWorkItemDetails> = {};
    private _error: string;
    private _followsDisabled: boolean;
    private _filter: string;
    private _globalSearchData: MyWorkContracts.IGlobalWorkItemSearchDetails;
    private _headerProps: IHubHeaderProps;
    private _selectedKey: string; // Selected pivot key

    constructor(actionHub: ActionsHub) {
        super();
        this._actionHub = actionHub;

        // Attach listeners
        this._actionHub.initializeFollowedWorkItemIds.addListener(this._initializeFollowedWorkItemIds.bind(this));
        this._actionHub.beginFollowWorkItem.addListener(this._beginFollowWorkItem.bind(this));
        this._actionHub.endFollowWorkItem.addListener(this._endFollowWorkItem.bind(this));
        this._actionHub.beginUnfollowWorkItem.addListener(this._beginUnfollowWorkItem.bind(this));
        this._actionHub.endUnfollowWorkItem.addListener(this._endUnfollowWorkItem.bind(this));
        this._actionHub.groupDataAvailable.addListener(this._pivotDataAvailable.bind(this));
        this._actionHub.workItemStateColorsAvailable.addListener(this._stateColorsAvailable.bind(this));
        this._actionHub.showPageLevelError.addListener(this._showPageLevelError.bind(this));
        this._actionHub.disableFollowsFeature.addListener(this._disableFollows.bind(this));
        this._actionHub.workItemSearchUrlAvailable.addListener(this._workItemSearchUrlAvailable.bind(this));
        this._actionHub.switchPivot.addListener(this._switchPivotHandler.bind(this));
        this._actionHub.loadHeaderProps.addListener(this._loadHeaderPropsHandler.bind(this));
        this._actionHub.updateHeaderOrganizationInfoAndCollectionPickerProps
            .addListener(this._updateHeaderOrganizationInfoAndCollectionPickerPropsHandler.bind(this));
        HubActions.HubFilterAction.addListener(this._filterChanged.bind(this));
    }

    public get state(): MyWorkContracts.IMyWorkComponentState {
        return <MyWorkContracts.IMyWorkComponentState>{
            selectedKey: this._selectedKey,
            assignedToMe: {
                active: this._getActiveAssignedToMe(),
                complete: this._getCompleteAssignedToMe()
            },
            followedByMe: this._getFollowedByMe(),
            filter: this._filter,
            globalWorkItemSearchDetails: this._globalSearchData,
            recentActivity: this._getRecentActivity(),
            error: this._error,
            followsDisabled: this._followsDisabled,
            recentMentions: this._getRecentMentions(),
            headerProps: this._headerProps
        };
    }

    private _workItemSearchUrlAvailable(data: MyWorkContracts.IGlobalWorkItemSearchDetails) {
        this._globalSearchData = data;
        this.emitChanged();
    }

    private _switchPivotHandler(pivotKey: string) {
        this._selectedKey = pivotKey;
        this.emitChanged();
    }

    private _loadHeaderPropsHandler(headerProps: IHubHeaderProps) {
        this._headerProps = headerProps;
        this.emitChanged();
    }

    private _updateHeaderOrganizationInfoAndCollectionPickerPropsHandler(props: IOrganizationInfoAndCollectionsPickerSectionProps) {
        if (this._headerProps) {
            this._headerProps.organizationInfoAndCollectionPickerProps = props;
            this.emitChanged();
        }
    }

    private _filterChanged(filter: string) {
        if (!this._filter && filter) {
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.AREAS.MyExperiences,
                CustomerIntelligenceConstants.FEATURES.MYWORK_FILTERED,
                {})
            );
        }
        this._filter = filter.trim();
        this.emitChanged();
    }

    private _disableFollows() {
        this._followsDisabled = true;
        this.emitChanged();
    }

    private _showPageLevelError(error: string) {
        this._error = error;
        this.emitChanged();
    }

    private _stateColorsAvailable(payload: MyWorkContracts.IStateColors): void {
        let data = this._getPivotData(payload.pivot);
        for (let workItemDetails of data) {
            for (let item of workItemDetails) {
                item.stateColor = payload.colors[item.id] || item.stateColor;
            }
        }
        this.emitChanged();
    }

    private _getPivotData(pivot: string): MyWorkContracts.IWorkItemDetails[][] {
        switch (pivot) {
            case MyWorkContracts.MyWorkPivotKeys.AssignedToMePivotKey:
                let result: MyWorkContracts.IWorkItemDetails[][] = [];
                if (this._activeAssignedToMe) {
                    result.push(this._activeAssignedToMe.groupData);
                }
                if (this._completeAssignedToMe) {
                    result.push(this._completeAssignedToMe.groupData);
                }
                return result;
            case MyWorkContracts.MyWorkPivotKeys.FollowedPivotKey:
                return [this._followedByMe.groupData];
            case MyWorkContracts.MyWorkPivotKeys.RecentActivityPivotKey:
                return [this._recentActivity.groupData];
            case MyWorkContracts.MyWorkPivotKeys.MentionedPivotKey:
                return [this._recentMentions.groupData];
            default:
                Diag.Debug.fail("Unexpected pivot encountered for state colors - " + pivot);
                return [];
        }
    }

    private _getFollowedWorkItemIds(): string[] {
        return Object.keys(this._followedWorkItemsLookup);
    }

    private _getActiveAssignedToMe(): MyWorkContracts.IMyWorkGroupData {
        if (this._activeAssignedToMe) {
            return this._getProcessedGroupData(this._activeAssignedToMe);
        }
        return {
            pivotKey: MyWorkContracts.MyWorkPivotKeys.AssignedToMePivotKey,
            groupState: MyWorkContracts.IGroupState.Loading,
            groupData: []
        };
    }

    private _getCompleteAssignedToMe(): MyWorkContracts.IMyWorkGroupData {
        if (this._completeAssignedToMe) {
            return this._getProcessedGroupData(this._completeAssignedToMe);
        }
        return {
            pivotKey: MyWorkContracts.MyWorkPivotKeys.AssignedToMePivotKey,
            groupState: MyWorkContracts.IGroupState.Loading,
            groupData: []
        };
    }

    private _getFollowedByMe(): MyWorkContracts.IMyWorkGroupData {
        if (this._followedByMe) {
            return this._getProcessedGroupData(this._followedByMe);
        }
        return {
            pivotKey: MyWorkContracts.MyWorkPivotKeys.FollowedPivotKey,
            groupState: MyWorkContracts.IGroupState.Loading,
            groupData: []
        };
    }

    private _itemMatches(item: MyWorkContracts.IWorkItemDetails): boolean {
        if (!this._filter ||
            Utils_String.caseInsensitiveContains(item.title, this._filter) ||
            Utils_String.caseInsensitiveContains(item.state, this._filter) ||
            Utils_String.caseInsensitiveContains(item.workItemType, this._filter) ||
            (item.identity && Utils_String.caseInsensitiveContains(item.identity.uniquefiedName, this._filter)) ||
            Utils_String.caseInsensitiveContains(item.teamProject.name, this._filter) ||
            Utils_String.caseInsensitiveContains(item.id.toString(10), this._filter)) {
            return true;
        }
        return false;
    }

    private _getRecentActivity(): MyWorkContracts.IMyWorkGroupData {
        if (this._recentActivity) {
            return this._getProcessedGroupData(this._recentActivity);
        }
        return {
            pivotKey: MyWorkContracts.MyWorkPivotKeys.RecentActivityPivotKey,
            groupState: MyWorkContracts.IGroupState.Loading,
            groupData: []
        };
    }

    private _getRecentMentions(): MyWorkContracts.IMyWorkGroupData {
        if (this._recentMentions) {
            return this._getProcessedGroupData(this._recentMentions);
        }
        return {
            pivotKey: MyWorkContracts.MyWorkPivotKeys.MentionedPivotKey,
            groupState: MyWorkContracts.IGroupState.Loading,
            groupData: []
        };
    }

    private _getProcessedGroupData(data: MyWorkContracts.IMyWorkGroupData): MyWorkContracts.IMyWorkGroupData {
        if (data.groupData) {
            var items: MyWorkContracts.IWorkItemDetails[] = [];
            for (let item of data.groupData) {
                if (!this._itemMatches(item)) {
                    continue;
                }

                // Update date string to stay consistent across pivots
                item.friendlyDateString = this._getFriendlyDateString(item);

                // Update followed status in case it changed
                if (this._followedWorkItemsLookup.hasOwnProperty(item.id.toString())) {
                    item.followed = this._followedWorkItemsLookup[item.id];
                } else {
                    item.followed = MyWorkContracts.IFollowedState.Unfollowed;
                }

                items.push(item);
            }

            // We don't want to modify the original
            return {
                pivotKey: data.pivotKey,
                groupName: data.groupName,
                groupState: data.groupState,
                groupData: items,
                querySizeLimitExceeded: data.querySizeLimitExceeded,
                error: data.error
            };
        }
        return data;
    }

    private _getFriendlyDateString(item: MyWorkContracts.IWorkItemDetails): string {
        if (item.format === MyWorkContracts.WorkItemFormatType.RecentActivity) {
            return Utils_Date.friendly(item.activityDate);
        }
        if (item.format === MyWorkContracts.WorkItemFormatType.Mentioned) {
            return Utils_Date.friendly(item.lastMentionedDate);
        }

        return Utils_Date.friendly(item.lastUpdatedDate);
    }

    private _initializeFollowedWorkItemIds(ids: number[]) {
        Diag.Debug.assertIsArray(ids, "Expected ids to be an array");

        for (let id of ids) {
            this._followedWorkItemsLookup[id] = MyWorkContracts.IFollowedState.Followed;
        }

        this.emitChanged();
    }

    private _endFollowWorkItem = (id: number): void => {
        Diag.Debug.assert($.isNumeric(id) && id > 0, "WorkItemId must be a number");
        Diag.Debug.assert(!(this._followedWorkItemsLookup[id] === MyWorkContracts.IFollowedState.Followed), "We are trying to follow a workItem that is already followed");

        this._followedWorkItemsLookup[id] = MyWorkContracts.IFollowedState.Followed;
        this.emitChanged();
    }

    private _endUnfollowWorkItem = (id: number): void => {
        Diag.Debug.assert($.isNumeric(id) && id > 0, "WorkItemId must be a number");
        Diag.Debug.assert(!(this._followedWorkItemsLookup[id] === MyWorkContracts.IFollowedState.Unfollowed), "We are trying to unfollow a workItem that is already unfollowed");

        this._followedWorkItemsLookup[id] = MyWorkContracts.IFollowedState.Unfollowed;
        this.emitChanged();
    }

    private _beginFollowWorkItem = (id: number): void => {
        Diag.Debug.assert($.isNumeric(id) && id > 0, "WorkItemId must be a number");

        if (this._followedByMe &&
            (this._followedByMe.groupState === MyWorkContracts.IGroupState.Loaded ||
                this._followedByMe.groupState === MyWorkContracts.IGroupState.Empty) &&
            this._workItems[id] &&
            this._followedWorkItemsLookup[id] == null) {
            // Item was not originally followed and will need to be added to the followed items list
            this._followedByMe.groupData.push(this._workItems[id]);
            this._followedByMe.groupData.sort((item1: MyWorkContracts.IWorkItemDetails, item2: MyWorkContracts.IWorkItemDetails) => {
                return item2.lastUpdatedDate.valueOf() - item1.lastUpdatedDate.valueOf();
            });
            this._followedByMe.groupState = MyWorkContracts.IGroupState.Loaded;
        }
        this._followedWorkItemsLookup[id] = MyWorkContracts.IFollowedState.Following;
        this.emitChanged();
    }

    private _beginUnfollowWorkItem = (id: number): void => {
        Diag.Debug.assert($.isNumeric(id) && id > 0, "WorkItemId must be a number");

        this._followedWorkItemsLookup[id] = MyWorkContracts.IFollowedState.Unfollowing;
        this.emitChanged();
    }

    private _pivotDataAvailable = (data: MyWorkContracts.IMyWorkGroupData): void => {
        Diag.Debug.assert(!!data, "PivotData cannot be null or undefined");

        if (data.groupData) {
            for (var item of data.groupData) {
                this._workItems[item.id] = item;
            }
        }

        switch (data.pivotKey) {
            case MyWorkContracts.MyWorkPivotKeys.AssignedToMePivotKey:
                let groupname = data.groupName;
                if (!groupname) {
                    Diag.Debug.fail("Expected assigned to me pivot to have groups");
                }
                if (Utils_String.equals(groupname, MyExperiencesResources.MyWork_GroupLabel_Doing, true)) {
                    Diag.Debug.assert(!this._activeAssignedToMe, "Expected group not to be empty - " + groupname);
                    this._activeAssignedToMe = data;
                }
                else if (Utils_String.equals(groupname, MyExperiencesResources.MyWork_GroupLabel_Done, true)) {
                    Diag.Debug.assert(!this._completeAssignedToMe, "Expected group not to be empty - " + groupname);
                    this._completeAssignedToMe = data;
                }
                break;
            case MyWorkContracts.MyWorkPivotKeys.FollowedPivotKey:
                Diag.Debug.assert(!this._followedByMe, "Expected 'followed by me' pivotdata not to be empty");
                this._followedByMe = data;
                break;
            case MyWorkContracts.MyWorkPivotKeys.RecentActivityPivotKey:
                Diag.Debug.assert(!this._recentActivity, "Expected 'recent activity' pivotdata not to be empty");
                this._recentActivity = data;
                break;
            case MyWorkContracts.MyWorkPivotKeys.MentionedPivotKey:
                Diag.Debug.assert(!this._recentMentions, "Expected 'recent mentions' pivotdata not to be empty");
                this._recentMentions = data;
                break;
            default:
                Diag.Debug.fail("Unexpected pivot encountered - " + data.pivotKey);
                break;
        }

        this.emitChanged();
    }
}

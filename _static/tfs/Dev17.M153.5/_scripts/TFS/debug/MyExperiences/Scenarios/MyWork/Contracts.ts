/**
 * @file Contains interfaces shared across MyWork controls. Not for external usage
 */

import { QueryOption, AccountMyWorkResult, AccountWorkWorkItemModel, AccountRecentActivityWorkItemModel, WorkItemRecentActivityType, AccountRecentMentionWorkItemModel } from "TFS/WorkItemTracking/Contracts";
import { IHubHeaderProps } from "MyExperiences/Scenarios/Shared/Models";

export { QueryOption, AccountMyWorkResult, AccountWorkWorkItemModel, AccountRecentActivityWorkItemModel, WorkItemRecentActivityType, AccountRecentMentionWorkItemModel };

export namespace MyWorkPivotKeys {
    export const AssignedToMePivotKey: string = "2F4206C6-1146-4FCA-8216-3EC3133ED1C9";
    export const FollowedPivotKey: string = "A9A1D2D3-D39A-488D-A94F-4036EBB84E6D";
    export const MentionedPivotKey: string = "E1BA40A7-88BF-46E3-8679-0E53E7D8380D";
    export const RecentActivityPivotKey: string = "5977B9CA-221A-4054-921E-9982866DFB6F";
}

export namespace Constants {
    export const Area = "AccountHomeMyWork";
}

export enum IFollowedState {
    Followed,
    Unfollowed,
    Following,
    Unfollowing
}

/**
 * The state for a single group in the MyWork AccountHomePages
 * EX: The 'doing' group on the MyWork Assigned To Me Pivot
 */
export enum IGroupState {
    Loading,
    Loaded,
    Empty,
    Error
}

/**
 * Format of the workitem payload
 */
export enum WorkItemFormatType {
    /** Used by AssignedTo and following */
    Regular,
    /** Used by My Activity */
    RecentActivity,
    /** Used by @mentioned */
    Mentioned
}

export interface IGlobalWorkItemSearchDetails {
    isSearchEnabled: boolean;
    getUrl?: (searchFilter: string) => string;
}

export interface IMyWorkComponentState {
    /** Selected pivot key */
    selectedKey: string;

    /** HubHeader properties */
    headerProps: IHubHeaderProps;

    /** Data for the assigned to me pivot */
    assignedToMe?: {
        active: IMyWorkGroupData,
        complete: IMyWorkGroupData
    };

    /** Followed by me pivot data */
    followedByMe?: IMyWorkGroupData;

    /** filter string */
    filter?: string

    /** returns Global Work Item Search details*/
    globalWorkItemSearchDetails?: IGlobalWorkItemSearchDetails;

    /** Recent Activity pivot data */
    recentActivity?: IMyWorkGroupData;

    /** Page Level Error Message */
    error?: string;

    /** True if we should treat follows as disabled */
    followsDisabled?: boolean;

    /** @mentioned pivot data */
    recentMentions?: IMyWorkGroupData;
}

export interface IMyWorkGroupData {
    /** Pivot that the group belongs to */
    pivotKey: string;

    /** The state of the group */
    groupState: IGroupState;

    /** WorkItem for this pivot */
    groupData?: IWorkItemDetails[];

    /** Indicates if the group data is limited */
    querySizeLimitExceeded?: boolean;

    /** Optional group name for workItem data */
    groupName?: string;

    /** Group Level Error Message */
    error?: string | JSX.Element;
}

export interface IMyWorkProject {
    /** Name of the project */
    name: string;

    /** Project url */
    url: string;
}

export interface IMyWorkIdentity {
    /** Uniquified identity */
    uniquefiedName: string;

    /** Image url */
    imageUrl: string;

    /** Display Name */
    displayName: string;
}

export interface IStateColors {
    /** Pivot guid */
    pivot: string;

    /** Colors object */
    colors: IDictionaryNumberTo<string>;
}

export interface IWorkItemDetails {
    /** WorkItemId */
    id: number;

    /** WorkItemType */
    workItemType: string;

    /** Uniquified identity */
    identity: IMyWorkIdentity;

    /** Title for this workItem */
    title: string;

    /** Team project name this workitem belongs to */
    teamProject: IMyWorkProject;

    /** Friendly string representation for LastUpdated/LastViewed/LastMentionedDate */
    friendlyDateString: string;

    /** Current workItem state */
    state: string;

    /** Current workItem state color */
    stateColor: string;
    
    /** Url to Edit the Work Item */
    url: string;

    /** State indicating if a workItem is being followed */
    followed: IFollowedState;

    /** Format of the workitem payload */
    format: WorkItemFormatType;

    /** WorkItem last updated date */
    lastUpdatedDate?: Date;

    /** User last mentioned date */
    lastMentionedDate?: Date;

    /** Activity date for recent activity data */
    activityDate?: Date;

    /** Activity type for recent activity data */
    activityType?: WorkItemRecentActivityType;
}
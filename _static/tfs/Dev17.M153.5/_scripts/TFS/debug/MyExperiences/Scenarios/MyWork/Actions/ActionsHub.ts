import { IMyWorkGroupData, IStateColors, IGlobalWorkItemSearchDetails } from "MyExperiences/Scenarios/MyWork/Contracts";
import { IHubHeaderProps, IOrganizationInfoAndCollectionsPickerSectionProps } from "MyExperiences/Scenarios/Shared/Models";
import { Action } from "VSS/Flux/Action";

export class ActionsHub {
    private _createAction<T>(): Action<T> {
        return new Action<T>();
    }

    /**
     * Pivot data available action.
     */
    public groupDataAvailable = this._createAction<IMyWorkGroupData>();

    /**
     * Action to show state colors.
     */
    public workItemStateColorsAvailable = this._createAction<IStateColors>();

    /**
     * Begin following a workItem.
     */
    public beginFollowWorkItem = this._createAction<number>();

    /**
     * End following a workItem.
     */
    public endFollowWorkItem = this._createAction<number>();

    /**
     * Begin unfollowing a workItem.
     */
    public beginUnfollowWorkItem = this._createAction<number>();

    /**
     * End unfollowing a workItem.
     */
    public endUnfollowWorkItem = this._createAction<number>();

    /**
     * This action is to initialize followed workitemIds.
     * We will use these ids across all the tabs to determine if a workitem is followed
     */
    public initializeFollowedWorkItemIds = this._createAction<number[]>();

    /**
     * This is used when we fail to retrieve the followed work item ids
     * We will fall back to the follows not configured experience
     */
    public disableFollowsFeature = this._createAction<any>();

    /**
     * Invoked when an error is encountered and should be displayed at the page level
     */
    public showPageLevelError = this._createAction<string>();

    /**
     * Invoked when we have the constants needed to generate the work item search url
     */
    public workItemSearchUrlAvailable = this._createAction<IGlobalWorkItemSearchDetails>();

    /**
     * Invoked when a pivot is selected
     */
    public switchPivot = this._createAction<string>();

    /**
     * Invoked when hubHeader props is loaded
     */
    public loadHeaderProps = this._createAction<IHubHeaderProps>();

    /**
     * Invoked when organizationInfoAndCollectionPickerProps of HubHeaderProps is updated
     */
    public updateHeaderOrganizationInfoAndCollectionPickerProps = this._createAction<IOrganizationInfoAndCollectionsPickerSectionProps>();
}
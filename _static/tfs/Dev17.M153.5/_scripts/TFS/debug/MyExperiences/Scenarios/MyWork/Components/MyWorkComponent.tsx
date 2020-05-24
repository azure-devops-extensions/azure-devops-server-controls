/// <reference types="react" />
/// <reference types="react-dom" />

/// <amd-dependency path='VSS/LoaderPlugins/Css!fabric' />
import "VSS/LoaderPlugins/Css!MyExperiences/Scenarios/Shared/Components/HubViewComponent";
import "VSS/LoaderPlugins/Css!MyExperiences/Scenarios/MyWork/Components/MyWorkComponent";

import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Telemetry from "VSS/Telemetry/Services";
import * as Utils_String from "VSS/Utils/String";
import { Link } from "OfficeFabric/Link";
import { Fabric } from "OfficeFabric/Fabric";
import { autobind } from "OfficeFabric/Utilities";

import * as HubModels from "MyExperiences/Scenarios/Shared/Models";
import { HubHeader } from "MyExperiences/Scenarios/Shared/Components/HubHeader";
import { HubSpinner, Alignment } from "MyExperiences/Scenarios/Shared/Components/HubSpinner";
import { HubAlert } from "MyExperiences/Scenarios/Shared/Components/HubAlert";
import { HubGroupAlert } from "MyExperiences/Scenarios/Shared/Components/HubGroupAlert";
import { isOrgAccountSelectorEnabled } from "MyExperiences/Scenarios/Shared/OrgAccountSelectorFeatureAvailabilityCheckHelper";
import { OrgInfoAndCollectionsPickerFluxAsync } from "MyExperiences/Scenarios/Shared/OrgInfoAndCollectionsPickerFluxAsync";

import * as ZeroData from "Presentation/Scripts/TFS/Components/ZeroData";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";
import * as WitZeroDataResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking.ZeroData";
import * as WorkItemTrackingZeroDataUtils from "WorkItemTracking/Scripts/Utils/WorkItemTrackingZeroDataUtils";
import * as CustomerIntelligenceConstants from "MyExperiences/Scripts/CustomerIntelligenceConstants";

import * as Pivot from "MyExperiences/Scenarios/MyWork/Components/Pivot";
import * as Store from "MyExperiences/Scenarios/MyWork/Stores/Store";
import * as Grid from "MyExperiences/Scenarios/MyWork/Components/WorkItemGrid";
import { ActionsCreator } from "MyExperiences/Scenarios/MyWork/Actions/ActionsCreator";
import * as MyWorkContracts from "MyExperiences/Scenarios/MyWork/Contracts";
import * as UrlUtils from "MyExperiences/Scenarios/MyWork/UrlUtils";
import * as Alerts from "MyExperiences/Scenarios/Shared/Alerts";

export interface IWorkComponentProps {
    /**
     * The store
     */
    store: Store.Store;

    /**
     * The action creator which holds the state associated with project creation
     */
    actionsCreator: ActionsCreator;

    /**
     * To show recent activity pivot or not
     */
    isRecentActivityEnabled: boolean;

    /**
     * To show @mentioned pivot or not
     */
    isMentionedPivotEnabled: boolean;

    /**
     * True if follows is enabled, False otherwise
     */
    isFollowsEnabled?: boolean;

    /**
     * Sticky Pivot
     */
    initialPivot?: string;

    /**
     * Indicate whether the current device is mobile
     */
    isMobile: boolean;
}

const pivotKeyToName: IDictionaryStringTo<string> = {
    [MyWorkContracts.MyWorkPivotKeys.AssignedToMePivotKey]: "AssignedToMePivot",
    [MyWorkContracts.MyWorkPivotKeys.FollowedPivotKey]: "FollowedPivot",
    [MyWorkContracts.MyWorkPivotKeys.MentionedPivotKey]: "MentionedPivotKey",
    [MyWorkContracts.MyWorkPivotKeys.RecentActivityPivotKey]: "RecentActivityPivotKey"
};

export class MyWorkComponent extends React.Component<IWorkComponentProps, MyWorkContracts.IMyWorkComponentState> {
    private _pivotRef: Pivot.Pivot;
    private _orgInfoAndCollectionsPickerFluxAsync: OrgInfoAndCollectionsPickerFluxAsync;
    private _isOrgAccountSelectorEnabled: boolean;

    constructor(props: IWorkComponentProps) {
        super(props);
        this.props.actionsCreator.initialize();

        this._isOrgAccountSelectorEnabled = isOrgAccountSelectorEnabled();
        if (this._isOrgAccountSelectorEnabled) {
            this._orgInfoAndCollectionsPickerFluxAsync = new OrgInfoAndCollectionsPickerFluxAsync({
                onHeaderOrganizationInfoAndCollectionPickerPropsUpdate: this._onHeaderOrganizationInfoAndCollectionPickerPropsUpdate,
                onCollectionNavigationFailed: this._onCollectionNavigationFailed
            });
            this._orgInfoAndCollectionsPickerFluxAsync.initializeOrgInfoAndCollectionsPickerFlux();
        }

        this.state = this.props.store.state;
        const initialPivot = this._getInitialPivot();
        this.props.actionsCreator.pivotSwtiched(initialPivot ? initialPivot : MyWorkContracts.MyWorkPivotKeys.AssignedToMePivotKey);
    }

    public componentDidMount(): void {
        const initialPivotKey = this._getInitialPivot();
        if (this._pivotRef) {
            this._pivotRef.scrollIntoView(initialPivotKey);
        }
        this.props.store.addChangedListener(this._onStoreChanged);
        if (this._isOrgAccountSelectorEnabled) {
            this._orgInfoAndCollectionsPickerFluxAsync.registerStoresChangedListeners();
        }

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.AREAS.MyExperiences,
            CustomerIntelligenceConstants.FEATURES.MYWORKCOMPONENT_MOUNTED,
            {
                [CustomerIntelligenceConstants.PROPERTIES.INITIAL_PIVOT]: initialPivotKey,
                [CustomerIntelligenceConstants.PROPERTIES.PIVOT_NAME]: pivotKeyToName[initialPivotKey],
                [CustomerIntelligenceConstants.PROPERTIES.MOBILE]: this.props.isMobile
            })
        );
    }

    public componentWillUnmount(): void {
        this.props.store.removeChangedListener(this._onStoreChanged);

        if (this._orgInfoAndCollectionsPickerFluxAsync) {
            this._orgInfoAndCollectionsPickerFluxAsync.unregisterStoresChangedListeners();
        }
    }

    @autobind
    private _onHeaderOrganizationInfoAndCollectionPickerPropsUpdate(props: HubModels.IOrganizationInfoAndCollectionsPickerSectionProps): void {
        this.props.actionsCreator.updateHeaderOrganizationInfoAndCollectionPickerProps(props);
    }

    @autobind
    private _onCollectionNavigationFailed(): void {
        setTimeout(() => this.props.actionsCreator.collectionNavigationFailed(), 0);
    }

    private _onStoreChanged = (): void => {
        this.setState(this.props.store.state);
    }

    public render(): JSX.Element {
        const selectedPivot = this.state.selectedKey || this._getInitialPivot() || MyWorkContracts.MyWorkPivotKeys.AssignedToMePivotKey;
        const pivotProps: Pivot.IPivotProps = {
            pivotOptions: {
                selectedKey: selectedPivot,
                onLinkClick: (item) => {
                    Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                        CustomerIntelligenceConstants.AREAS.MyExperiences,
                        CustomerIntelligenceConstants.FEATURES.MYWORK_SWITCHPIVOT,
                        {
                            [CustomerIntelligenceConstants.PROPERTIES.PIVOT]: item.props.itemKey,
                            [CustomerIntelligenceConstants.PROPERTIES.PIVOT_NAME]: pivotKeyToName[item.props.itemKey],
                            [CustomerIntelligenceConstants.PROPERTIES.MOBILE]: this.props.isMobile
                        })
                    );

                    this.props.actionsCreator.switchPivot(item.props.itemKey);
                }
            },
            pivots: [
                {
                    linkText: MyExperiencesResources.MyWork_Pivot_AssignedToMe,
                    itemKey: MyWorkContracts.MyWorkPivotKeys.AssignedToMePivotKey,
                    pivotContent: this._getAssignedToMeContent()
                },
                {
                    linkText: MyExperiencesResources.MyWork_Pivot_Followed,
                    itemKey: MyWorkContracts.MyWorkPivotKeys.FollowedPivotKey,
                    pivotContent: (
                        <div className="hub-groups">
                            {this._getFollowedContent()}
                        </div>
                    )
                }
            ]
        };

        if (this.props.isMentionedPivotEnabled) {
            pivotProps.pivots.push({
                linkText: MyExperiencesResources.MyWork_Pivot_Mentioned,
                itemKey: MyWorkContracts.MyWorkPivotKeys.MentionedPivotKey,
                pivotContent: (
                    <div className="hub-groups">
                        {this._getMentionedPivotContent()}
                    </div>
                )
            });
        }

        if (this.props.isRecentActivityEnabled) {
            pivotProps.pivots.push({
                linkText: MyExperiencesResources.MyWork_Pivot_RecentActivity,
                itemKey: MyWorkContracts.MyWorkPivotKeys.RecentActivityPivotKey,
                pivotContent: (
                    <div className="hub-groups">
                        {this._getRecentActivityContent()}
                    </div>
                )
            });
        }

        return (
            <Fabric className="hub-view-component my-work-component bowtie-fabric">
                {this.state.error ? <HubAlert>{Alerts.createReloadPromptAlertMessage(this.state.error)}</HubAlert> : null}
                <div className="hub-view-content">
                    {!this.props.isMobile && <HubHeader {...this.state.headerProps} />}
                    <Pivot.Pivot {...pivotProps} ref={this._storePivotRef} />
                </div>
            </Fabric>
        );
    }

    @autobind
    private _storePivotRef(pivot: Pivot.Pivot): void {
        this._pivotRef = pivot;
    }

    private _getGroupContent(data: MyWorkContracts.IMyWorkGroupData, limitMessage?: string, label?: string): JSX.Element {
        if (data.groupState === MyWorkContracts.IGroupState.Loading) {
            return (
                <div className="hub-group">
                    {label ? <div className="title">{label}</div> : null}
                    <HubSpinner alignment={Alignment.center} />
                </div>
            );
        }
        else if (data.groupState === MyWorkContracts.IGroupState.Error) {
            if (data.error) {
                return <HubGroupAlert>{data.error}</HubGroupAlert>;
            }
            // Group errored out, but there's no group level error to display
            return null;
        }
        else if (data.groupState === MyWorkContracts.IGroupState.Loaded) {
            var items: MyWorkContracts.IWorkItemDetails[] = data.groupData || [];
            var gridProps: Grid.IWorkItemGridProps = {
                actionsCreator: this.props.actionsCreator,
                workItems: items,
                isFollowsEnabled: this.props.isFollowsEnabled && !this.state.followsDisabled,
                isMobile: this.props.isMobile
            };

            return (
                <div className="hub-group">
                    {label && (items.length > 0 || this.state.filter) ? <div className="title ms-font-m">{label}</div> : null}
                    <Grid.WorkItemGrid {...gridProps} />
                    {data.querySizeLimitExceeded && limitMessage ? this._getLimitMessageContent(limitMessage) : null}
                    {this._getFilterMessageContent(items && items.length > 0)}
                </div>
            );
        }
        else {
            return null;
        }
    }

    private _getLimitMessageContent(limitMessage: string): JSX.Element {
        return <div className="ms-font-m">{limitMessage}</div>
    }

    private _getSearchAllContent(): JSX.Element {
        if (this.state.globalWorkItemSearchDetails && this.state.globalWorkItemSearchDetails.isSearchEnabled) {
            return (
                <Link
                    className="ms-font-m"
                    href={this.state.globalWorkItemSearchDetails.getUrl(this.state.filter)}
                    onClick={() => {
                        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                            CustomerIntelligenceConstants.AREAS.MyExperiences,
                            CustomerIntelligenceConstants.FEATURES.MYWORK_SEARCHALL,
                            {} //   We are not including the filter state as it might contain EUII data.
                        ));
                    }}>
                    {MyExperiencesResources.MyWork_Filter_SearchAll}
                </Link>
            );
        }
        else {
            return null;
        }
    }

    private _getFilterMessageContent(hasResults: boolean): JSX.Element {
        if (this.state.filter) {
            if (hasResults) {
                return this._getSearchAllContent();
            }
            else {
                return (
                    <div className="ms-font-m">
                        {MyExperiencesResources.MyWork_Filter_NoResults + " "}
                        {this._getSearchAllContent()}
                    </div>
                );
            }
        }
        else {
            return null;
        }
    }

    private _getAssignedToMeContent(): JSX.Element {
        if (this.state.assignedToMe.active.groupState === MyWorkContracts.IGroupState.Loading ||
            (this.state.assignedToMe.active.groupState === MyWorkContracts.IGroupState.Empty &&
                this.state.assignedToMe.complete.groupState === MyWorkContracts.IGroupState.Loading)) {
            // Active Group is still Loading or Active Group is Empty and Completed Group is still Loading
            return (
                <div className="hub-groups">
                    <HubSpinner alignment={Alignment.center} />
                </div>
            );
        }
        else if (this.state.assignedToMe.active.groupState === MyWorkContracts.IGroupState.Empty &&
            this.state.assignedToMe.complete.groupState === MyWorkContracts.IGroupState.Empty) {

            const infoLink = this._getZeroDataInfoLink(
                WitZeroDataResources.ZeroData_WorkItems_LinkText,
                WitZeroDataResources.ZeroData_AssignedToMe_SecondaryMessageLinkUrl);

            return <div className="hub-groups">{WorkItemTrackingZeroDataUtils.createForAssignedToMe(infoLink)}</div>;
        }
        else {
            return (
                <div className="hub-groups">
                    {this._getGroupContent(this.state.assignedToMe.active, MyExperiencesResources.MyWork_LimitMessage_AssignedToMe, MyExperiencesResources.MyWork_GroupLabel_Doing)}
                    {this._getGroupContent(this.state.assignedToMe.complete, MyExperiencesResources.MyWork_LimitMessage_AssignedToMe, MyExperiencesResources.MyWork_GroupLabel_Done)}
                </div>
            );
        }
    }

    private _getFollowedContent(): JSX.Element {
        if (!this.props.isFollowsEnabled) {
            return <div className="hub-groups">{WorkItemTrackingZeroDataUtils.createForFollowingNotconfigured()}</div>;
        }
        else if (this.state.followedByMe.groupState === MyWorkContracts.IGroupState.Empty) {
            return <div className="hub-groups">{WorkItemTrackingZeroDataUtils.createForFollowing()}</div>;
        }
        else {
            return this._getGroupContent(this.state.followedByMe, MyExperiencesResources.MyWork_LimitMessage_Followed);
        }
    }

    private _getRecentActivityContent(): JSX.Element {
        if (!this.props.isRecentActivityEnabled) {
            return null;
        }
        else if (this.state.recentActivity.groupState === MyWorkContracts.IGroupState.Empty) {
            const infoLink = this._getZeroDataInfoLink(
                WitZeroDataResources.ZeroData_WorkItems_LinkText,
                WitZeroDataResources.ZeroData_MyActivity_SecondaryMessageLinkUrl);

            return <div className="hub-groups">{WorkItemTrackingZeroDataUtils.createForMyActivity(infoLink)}</div>;
        }
        else {
            return this._getGroupContent(this.state.recentActivity);
        }
    }

    private _getMentionedPivotContent(): JSX.Element {
        if (this.state.recentMentions.groupState === MyWorkContracts.IGroupState.Empty) {
            return <div className="hub-groups">
                {WorkItemTrackingZeroDataUtils.createForMentioned()}
            </div>;
        }

        return this._getGroupContent(this.state.recentMentions);
    }

    /**
     * Get zero data info link. If search is enabled, link to workitem global search else link to fwlink
     * @param linkText
     * @param fwlink
     */
    private _getZeroDataInfoLink(text: string, link: string): ZeroData.ILink {
        let linkText = Utils_String.empty;
        let href = Utils_String.empty;

        // Search modules are delay loaded on demand. 
        // If searchDetails object is undefined, return empty values. We re-render when search modules are loaded
        if (this.state.globalWorkItemSearchDetails) {
            let isSearchEnabled = this.state.globalWorkItemSearchDetails.isSearchEnabled;
            linkText = isSearchEnabled ? WitZeroDataResources.ZeroData_GlobalSearch_LinkText : text;
            href = isSearchEnabled ? this.state.globalWorkItemSearchDetails.getUrl(null) : link;
        }

        return {
            linkText: linkText,
            href: href
        };
    }

    private _getInitialPivot(): string {
        // Switch back to AssignedToMePivot, if the initialPivot was saved as MentionedPivot, but the FF was later turned OFF.
        const initialPivot = (this.props.initialPivot === MyWorkContracts.MyWorkPivotKeys.MentionedPivotKey && !this.props.isMentionedPivotEnabled) ?
            MyWorkContracts.MyWorkPivotKeys.AssignedToMePivotKey : this.props.initialPivot;
        return initialPivot;
    }
}

// CSS
import "VSS/LoaderPlugins/Css!Notifications";

// React
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ComponentBase from "VSS/Flux/Component";

//OfficeFabric
import { CommandBar } from "OfficeFabric/CommandBar";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { DetailsRow, IDetailsRowProps } from "OfficeFabric/components/DetailsList/DetailsRow";
import { ImageFit } from "OfficeFabric/components/Image/Image.types";
import * as DetailsList from "OfficeFabric/DetailsList";
import { IGroup, IGroupDividerProps } from "OfficeFabric/GroupedList";
import { Toggle } from "OfficeFabric/Toggle";
import { TooltipHost } from "OfficeFabric/Tooltip";
import { css } from "OfficeFabric/Utilities";
import { IObjectWithKey, SelectionMode } from "OfficeFabric/utilities/selection/interfaces";
import { Selection } from "OfficeFabric/utilities/selection/Selection";

// VSS
import * as Context from "VSS/Context";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_Date from "VSS/Utils/Date";
import * as UtilsString from "VSS/Utils/String";
import * as Utils_Url from "VSS/Utils/Url";
import { VssDetailsList, VssDetailsListGroupHeader, VssDetailsListRowStyle, VssDetailsListTitleCell } from 'VSSUI/VssDetailsList';
import { VssIcon, VssIconType } from "VSSUI/VssIcon";

// Notifications
import * as NotificationContracts from "Notifications/Contracts";
import * as SubscriptionActions from "NotificationsUI/Scripts/Actions/SubscriptionActions";
import { Component as IdentityPickerComponent} from "NotificationsUI/Scripts/Components/IdentityPicker";
import * as NotificationResources from "NotificationsUI/Scripts/Resources/VSS.Resources.NotificationsUI";
import * as SubscriptionStore from "NotificationsUI/Scripts/Stores/SubscriptionStore";
import { SubscriptionsPayload } from "NotificationsUI/Scripts/UIContracts";

import NotifResources = require("NotificationsUI/Scripts/Resources/VSS.Resources.NotificationsUI");

export interface ISubscriptionsOverviewHubComponentProps extends ComponentBase.Props {
    subscriptionsStore: SubscriptionStore.SubscriptionStore;
    actionsColumnKey?: string;
    hasGroups?: boolean;
    hideNotifiesColumn?: boolean;
    showIdentitySelector?: boolean;
    initialSelectedSubscriptionId?: string;
    identityPickerDefaultId?: string;
    initialSelectedSubscriptionPublisher?: string;
    myHub?: boolean;
    preventOptInOut?: boolean;
    showEmptyMessage?: boolean;
    isAdminHub?: boolean;
    data?: SubscriptionsPayload;
}

export class SubscriptionsOverviewHubComponent extends ComponentBase.Component<ISubscriptionsOverviewHubComponentProps, ComponentBase.State> {

    static artifactFilterType: string = "Artifact";
    static serviceHooksChannelType: string = "ServiceHooks";
    private _subscriptions: NotificationContracts.NotificationSubscription[];
    private _enableDiagnostics: boolean;
    private _selection: Selection;

    constructor(props) {
        super(props);
        this._selection = new Selection();
    }

    public render(): JSX.Element {
      
        // to align with immutable behavior
        this._subscriptions = [...this.props.subscriptionsStore.getSubscriptions()];

        var pageUri = new Utils_Url.Uri(window.location.href);
        var diagnostics = pageUri.getQueryParam("diagnostics");

        this._enableDiagnostics = diagnostics && diagnostics.toLocaleLowerCase() === "true";

        let identityPicker: JSX.Element;
        if (this.props.showIdentitySelector) {
            identityPicker = <div className="search-container">
                <IdentityPickerComponent consumerId="C3D14A44-0495-4817-8947-A287AF34C92B" defaultSubscriberId={this.props.identityPickerDefaultId} cssClass="identity-picker-container"/>
            </div>
        }

        let component: JSX.Element;
        if (this._subscriptions.length > 0) {
            component = <VssDetailsList
                className="subscriptions-list"
                key= { "active-subscriptions" }
                hideGroupExpansion={ true }
                items={ this._subscriptions }
                isHeaderVisible = { true }
                layoutMode = { DetailsList.DetailsListLayoutMode.justified }
                constrainMode = { DetailsList.ConstrainMode.unconstrained }
                columns={ this._getSubscriptionColumns() }
                selectionMode={ SelectionMode.single  }
                selection={ this._selection }
                onRenderItemColumn={ Utils_Core.delegate(this, this._onRenderNotificationColumns) }
                shouldDisplayActions = { (subscription) => { return true } }
                getMenuItems={ (subscription: NotificationContracts.NotificationSubscription) => this._getMenuItems(subscription, this._enableDiagnostics) }
                actionsColumnKey={ this.props.actionsColumnKey }
                groups={ this.props.hasGroups ? this._getGroupsByCategory() : null }
                groupProps={  {
                    onRenderHeader: this._onRenderHeader
                } }
                rowStyle={ VssDetailsListRowStyle.twoLine }
                allocateSpaceForActionsButtonWhileHidden= { true }
                onRenderRow={ this._onRenderRow }
                />
        }
        else
        {
            if (!this.props.showEmptyMessage) {
                 component = <div className="subscribers-tab-secondary-title">{ NotificationResources.SubscriberTabSecondaryTitle }</div>;
            }
        }

        return <div>
            { identityPicker }
            <div className="subscription-list-container">
                <div>
                    <div className="no-subscriptions-message" style={ { display: this._subscriptions.length === 0 && this.props.showEmptyMessage ? undefined : "none" } }>
                        <span>{ NotificationResources.NoSubscriptionsLabel }</span>
                    </div>
                    {component}
                </div>
            </div>
        </div>;
    }

    public componentDidMount() {
        this._selection.setItems(this._subscriptions as IObjectWithKey[], true);
        this._setInitialSelection();
    }

    public componentDidUpdate(): void {
        this._setInitialSelection();
    }

    private _setInitialSelection() {
        const initialSubId = this.props.initialSelectedSubscriptionId;
        const initialpubId = this.props.initialSelectedSubscriptionPublisher;

        if (initialSubId && initialpubId) {
            for (let i = 0; i < this._subscriptions.length; i++) {
                const subs = this._subscriptions[i];

                if (subs.id === initialSubId) {
                    const publisher = this.props.subscriptionsStore.getPublisherForSubscription(subs);

                    if (publisher && publisher.id === initialpubId) {
                        this._selection.setIndexSelected(i, true, true);
                    }                    
                }
            }
        }
    }

    private _onRenderRow = (props: IDetailsRowProps): JSX.Element => {
        let subscription: NotificationContracts.NotificationSubscription = props.item;

        // to avoid opted-out subscriptions in admin hub being greyed out
        const disabled = !this.props.subscriptionsStore.isSubscriptionEnabled(subscription) || 
            (!this.props.isAdminHub && this.props.subscriptionsStore.isSharedSubscription(subscription) && !this.props.subscriptionsStore.isUserOptedIn(subscription));

        if(disabled) {
            props.className = css('is-disabled', props.className);
        }
        return <DetailsRow {...props} />
    }


    private _onRenderNotificationColumns(item, index, column) {
        if (column.key === 'desc') {
            return item.description;
        } else if (column.key === 'subscriber') {
            return this.props.data.subscriber.displayName;
        }

        return item[column.key];
    }

    private _getMenuItems(subscription: NotificationContracts.NotificationSubscription, enableDiagnostics: boolean): IContextualMenuItem[] {
        const items: IContextualMenuItem[] = [];
        var enableActionName: string = this.props.subscriptionsStore.isSubscriptionEnabled(subscription) ? NotificationResources.Disable : NotificationResources.Enable;
        var subscriptionPermissions: NotificationContracts.SubscriptionPermissions = subscription.permissions;
        var userHasEditPermission: boolean = ((subscriptionPermissions & NotificationContracts.SubscriptionPermissions.Edit) === NotificationContracts.SubscriptionPermissions.Edit)
        let isContributed: boolean = ((subscription.flags & NotificationContracts.SubscriptionFlags.ContributedSubscription) === NotificationContracts.SubscriptionFlags.ContributedSubscription);
        let isGroupSubscription: boolean = this.props.subscriptionsStore.isSharedSubscription(subscription);
        let currentSubscriber = this.props.subscriptionsStore.getCurrentSubscriber();
        let addEditDeleteOption = (userHasEditPermission && !isContributed && (currentSubscriber && currentSubscriber.id === subscription.subscriber.id));
        var editActionName: string = addEditDeleteOption ? NotificationResources.EditAction : NotificationResources.ViewAction;
        var userHasViewPermission = ((subscriptionPermissions & NotificationContracts.SubscriptionPermissions.View) === NotificationContracts.SubscriptionPermissions.View);
        let isArtifactSubscription = subscription.filter.type === SubscriptionsOverviewHubComponent.artifactFilterType;
        let isUserOptedIn = this.props.subscriptionsStore.isUserOptedIn(subscription);
        let optoutActionName = isUserOptedIn ? NotificationResources.OptoutButtonText : NotificationResources.OptInButtonText;
        let isDefaultSubscriptionsView = this.props.subscriptionsStore.isDefaultSubscriptionsView();

        let iconName = (addEditDeleteOption) ? "bowtie-icon bowtie-edit-outline" : "bowtie-icon bowtie-arrow-open";
        items.push({
            key: "viewedit",
            name: editActionName,
            disabled: !userHasViewPermission || isArtifactSubscription,
            className: "list-menu-item",
            onClick: (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                let subscriptionKey: SubscriptionActions.NotificationSubscriptionKey =
                    {
                        subscriptionId: subscription.id,
                        publisherId: this.props.subscriptionsStore.getPublisherForSubscription(subscription).id
                    };
                if (addEditDeleteOption) {
                    SubscriptionActions.Creator.editSubscription(subscriptionKey);
                } else {
                    SubscriptionActions.Creator.openSubscription(subscriptionKey);
                }
            }
        });

        if (enableDiagnostics)
        {
            var diagnostics: NotificationContracts.SubscriptionDiagnostics = subscription.diagnostics;
            var showEnable = true;

            if (diagnostics &&
                diagnostics.deliveryTracing && diagnostics.deliveryTracing.enabled &&
                diagnostics.evaluationTracing && diagnostics.evaluationTracing.enabled)
            {
                showEnable = false;
            }

            var enableDiagnosticsName: string = showEnable ? NotificationResources.EnableDiagnostics :  NotificationResources.DisableDiagnostics;
            
            items.push({
                key: "disableEnableDiagnostics",
                name: enableDiagnosticsName,
                disabled: false,
                className: "list-menu-item",
                onClick: (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                    var diagnosticChange: SubscriptionActions.SubscriptionDiagnosticsChange = {
                        subscription: subscription,
                        enabled: showEnable
                    };
                    SubscriptionActions.Creator.toggleSubscriptionDiagnosticsEnabled(diagnosticChange);
                }
            });
        }


        if (this.props.isAdminHub && (isDefaultSubscriptionsView ||  (!isContributed && currentSubscriber && currentSubscriber.id === subscription.subscriber.id))) {
            items.push({
                key: "disableEnable",
                name: enableActionName,
                disabled: false,
                className: "list-menu-item",
                onClick: (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                    SubscriptionActions.Creator.toggleSubscriptionEnabled(subscription);
                }
            });
        }

        if (this.props.isAdminHub && !isDefaultSubscriptionsView && isGroupSubscription && (!this.props.subscriptionsStore.isSubscriberProjectCollectionValidUsers(subscription) || isContributed) && (currentSubscriber && currentSubscriber.id !== subscription.subscriber.id)) {
            items.push({
                key: "optout",
                name: optoutActionName,
                disabled: false,
                className: "list-menu-item",
                onClick: (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                    var change: SubscriptionActions.SubscriptionOptOutChange = {
                        subscription: subscription, newValue: isUserOptedIn
                    };
                    SubscriptionActions.Creator.changeSubscriptionOptOut(change);
                }
            });
        }

        if (addEditDeleteOption) {
            items.push({
                key: "delete",
                name: NotificationResources.DeleteAction,
                className: "list-menu-item",
                iconProps: { className: "bowtie-icon bowtie-edit-delete" },
                onClick: (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                    SubscriptionActions.Creator.deleteSubscription(subscription);
                }
            });
        }
        return items;
    }

    private _getGroupsByCategory(): IGroup[] {
        const groups: IGroup[] = [];

        let category: NotificationContracts.NotificationEventTypeCategory = null;
        let categoryGroup: IGroup = null;
        this.props.subscriptionsStore.sortSubscriptions(this._subscriptions);
        if (!this._subscriptions) {
            return groups;
        }

        var categoryCount: number = 0;
        for (let i = 0; i < this._subscriptions.length; i++) {
            var eventType = this.props.subscriptionsStore.getEventType(this._subscriptions[i]);
            if (!eventType || !eventType.category) {
                continue;
            }
            const currentCategory = eventType.category;
            const isShared = this.props.subscriptionsStore.isSharedSubscription(this._subscriptions[i]);
            const disabled = !this.props.subscriptionsStore.isSubscriptionEnabled(this._subscriptions[i]) || (isShared && !this.props.subscriptionsStore.isUserOptedIn(this._subscriptions[i]));

            if (category && currentCategory.id === category.id) {
                categoryGroup.count++;
                if (!disabled) {
                    categoryCount++;
                }
            }
            else {
                if (categoryGroup) {
                    categoryGroup.data = categoryCount;
                    groups.push(categoryGroup);
                    categoryCount = 0;
                }

                if (!disabled) {
                    categoryCount++;
                }

                category = currentCategory;
                categoryGroup = {
                    key: category.id,
                    name: category.name,
                    count: 1,
                    startIndex: categoryGroup ? (categoryGroup.startIndex + categoryGroup.count) : i,
                };
            }
        }

        if (categoryGroup) {
            categoryGroup.data = categoryCount;
            groups.push(categoryGroup);
        }

        return groups;
    }

    /**
     * Custom render method for group headers.
     */
    private _onRenderHeader = (props: IGroupDividerProps): JSX.Element => {
        return <VssDetailsListGroupHeader text={props.group.name} />;
    }

    private _getSubscriptionColumns(): DetailsList.IColumn[] {
        let columns: DetailsList.IColumn[] = [];

        columns.push({
            key: "desc",
            name: NotifResources.Description,
            fieldName: null,
            isResizable: true,
            minWidth: 500,
            maxWidth: 800,
            onRender: (subscription: NotificationContracts.NotificationSubscription, index: number, column: DetailsList.IColumn) => {
                const disabled = !this.props.subscriptionsStore.isSubscriptionEnabled(subscription);
                const isContributedSubscription = this.props.subscriptionsStore.isContributedSubscription(subscription);
                const isServiceHooksSubscription = subscription.channel.type === SubscriptionsOverviewHubComponent.serviceHooksChannelType;
                const isArtifactSubscription = subscription.filter.type === SubscriptionsOverviewHubComponent.artifactFilterType;

                const hasEditPermission = (subscription.permissions & NotificationContracts.SubscriptionPermissions.Edit) === NotificationContracts.SubscriptionPermissions.Edit;
                const currentSubscriber = this.props.subscriptionsStore.getCurrentSubscriber();
                const canEdit = hasEditPermission && !isContributedSubscription && currentSubscriber && currentSubscriber.id === subscription.subscriber.id;
                let description = subscription.description;

                // check if the user does not have permissions to the subscription, set the description to [private]
                if ((subscription.permissions | NotificationContracts.SubscriptionPermissions.None) === NotificationContracts.SubscriptionPermissions.None) {
                    description = NotifResources.NoPermissionDescription;
                }


                const eventType: NotificationContracts.NotificationEventType = this.props.subscriptionsStore.getEventType(subscription);
                let iconProps = undefined;
                if (eventType && typeof eventType.icon === "string") {
                    if (eventType.icon.match(/^https?:\/\//)) {
                        iconProps = {
                            iconType: VssIconType.image,
                            imageProps: {
                                src: eventType.icon,
                                imageFit: ImageFit.contain
                            }
                        }

                    }
                    else {
                        iconProps = {
                            iconName: eventType.icon,
                            iconType: VssIconType.bowtie,
                        }
                    }
                }
                else {
                    iconProps = {
                        iconName: 'bowtie-trigger',
                        iconType: VssIconType.bowtie, 
                    }
                }

                return <VssDetailsListTitleCell
                    primaryAction={ () => {
                        let subscriptionKey: SubscriptionActions.NotificationSubscriptionKey =
                            {
                                subscriptionId: subscription.id,
                                publisherId: this.props.subscriptionsStore.getPublisherForSubscription(subscription).id
                            };
                        if (canEdit) {
                            SubscriptionActions.Creator.editSubscription(subscriptionKey);
                        }
                        else {
                            SubscriptionActions.Creator.openSubscription(subscriptionKey);
                        }
                    } }
                    indicators={[
                        {
                            getItemIndicator: () => {
                                if (isContributedSubscription) {
                                    return {
                                        title: NotificationResources.DefaultSubscriptionTitle,
                                        iconProps: {
                                            iconName: 'Globe',
                                            iconType: VssIconType.fabric,
                                            ariaLabel: NotificationResources.DefaultSubscriptionTitle
                                        }
                                    };
                                }
                                return;
                            }
                        }
                    ]}
                    primaryText={ description }
                    onRenderSecondaryText={
                        () => {
                            let isShared = this.props.subscriptionsStore.isSharedSubscription(subscription);
                            // for personal subscriptions with default email address
                            let detailedDescription = this._getDetailedDescription(subscription, eventType, isShared, isContributedSubscription);

                            let ownerElement: JSX.Element;
                            let lastModifiedTime = (subscription.modifiedDate) ? Utils_Date.friendly(subscription.modifiedDate) : UtilsString.empty;
                            if (subscription.lastModifiedBy && subscription.lastModifiedBy.displayName) {
                                const ownerName = subscription.lastModifiedBy.displayName;
                                const ownerImageUrl = Context.getPageContext().webContext.collection.uri + "_api/_common/identityImage?id=" + subscription.lastModifiedBy.id;
                                const lastModifiedBy = (subscription.lastModifiedBy.id === this.props.subscriptionsStore.getCurrentSubscriber().id && !this.props.isAdminHub) ? NotificationResources.ModifiedByYouText : subscription.lastModifiedBy.displayName;
                                ownerElement = (
                                    <span title={ownerName} aria-label={ownerName}>
                                        <img className="owner-icon identity-picture x-small" alt="" src={ownerImageUrl} />{lastModifiedBy}
                                    </span>
                                );
                                detailedDescription = detailedDescription + (UtilsString.format(NotificationResources.ModifiedDescriptionText, lastModifiedTime));
                            }

                            return (
                                <span >
                                    { detailedDescription } { ownerElement }
                                </span>
                            );
                        }
                    }
                    iconProps={ iconProps }
                    />
            }
        });

        columns.push({
            key: "eventType",
            name: NotifResources.TypeColumnHeader,
            fieldName: null,
            isResizable: true,
            minWidth: 150,
            maxWidth: 200,
            onRender: (subscription: NotificationContracts.NotificationSubscription, index: number, column: DetailsList.IColumn) => {
                const eventType = this.props.subscriptionsStore.getEventType(subscription);
                let scope: string;
                if (this.props.subscriptionsStore.doesSubscriptionEventTypeSupportProjectScope(subscription)) {
                    let scopeName = this.props.subscriptionsStore.getScopeName(subscription);
                    if (scopeName && scopeName !== UtilsString.empty) {
                        scope = UtilsString.format(NotificationResources.SpecificScopeFormat, scopeName);
                    }
                    else {
                        scope = NotificationResources.AllProjectsScopeText;
                    }
                }

                if (eventType) {
                    return <VssDetailsListTitleCell
                        primaryText={ eventType.name }
                        secondaryText={ scope } />;
                }

                else {
                    return <span className="subscription-event-type"></span>;
                }
            }
        });

        if (!this.props.hideNotifiesColumn) {
            columns.push({
                key: "subscriber",
                name: NotifResources.NotifiesColumnHeader,
                fieldName: null,
                isResizable: true,
                minWidth: 200,
                maxWidth: 400,
                onRender: (subscription: NotificationContracts.NotificationSubscription, index: number, column: DetailsList.IColumn) => {
                    const subscriber = subscription.subscriber;
                    let imageUrl: string;

                    const isShared = this.props.subscriptionsStore.isSharedSubscription(subscription);
                    const isContributedSubscription = this.props.subscriptionsStore.isContributedSubscription(subscription);
                    const notifiesText = this._getNotifiesFirstLineText(subscription, isShared, isContributedSubscription);
                    if (!isShared || isContributedSubscription) {
                        imageUrl = Context.getPageContext().webContext.collection.uri + "_api/_common/identityImage?id=" + this.props.subscriptionsStore.getCurrentSubscriber().id;
                    }
                    else {
                        imageUrl = Context.getPageContext().webContext.collection.uri + "_api/_common/identityImage?id=" + subscriber.id;
                    }

                    return <VssDetailsListTitleCell
                        onRenderPrimaryText={ () => {
                            return (
                                <div title={notifiesText} aria-label={notifiesText}>
                                    <img className="subscriber-icon identity-picture x-small" src={imageUrl} />
                                    {notifiesText}
                                </div>
                            );
                        } }
                        secondaryText={ this._getNotifiesSecondLineText(subscription, isShared, isContributedSubscription) } />;
                },
            });
        }

        if (!this.props.isAdminHub) {
            columns.push({
                key: "state",
                fieldName: null,
                name: NotificationResources.StateColumnHeaderText,
                minWidth: 100,
                maxWidth: 100,
                onRender: (subscription: NotificationContracts.NotificationSubscription, index: number, column: DetailsList.IColumn) => {
                    const subscriptionsStore = this.props.subscriptionsStore;
                    let contents: JSX.Element;
                    // true if subscription is owned by the entity we're administering
                    const isOwnSubscription = subscription.subscriber.id === subscriptionsStore.getCurrentSubscriber().id;
                    // has permission to edit the subscription
                    const hasEditPermission = ((subscription.permissions & NotificationContracts.SubscriptionPermissions.Edit) === NotificationContracts.SubscriptionPermissions.Edit);
                    const isEnabled = this.props.subscriptionsStore.isSubscriptionEnabled(subscription);
                    let isOptedIn = !subscriptionsStore.isSharedSubscription(subscription) || subscriptionsStore.isUserOptedIn(subscription);

                    // toggle can either enable/disable the subscription, or opt-in/out of it
                    // make it an opt-in toggle if the user is opted out, for backwards compat where before users could
                    // opt out of subscriptions that they can't now
                    const isOptInToggle = !isOwnSubscription || !isOptedIn;
                    // disable toggle if user doesn't have the rights to use it
                    let enableToggle = isOptInToggle ? subscriptionsStore.hasManagePermission() : hasEditPermission;
                    if (!isEnabled && !isOwnSubscription) {
                        // if the subscription is disabled at a higher level, don't let this user re-enable
                        enableToggle = false;
                    }

                    if (isOptInToggle && !isOwnSubscription) {
                        const subscriber = this.props.subscriptionsStore.getNotificationSubscriber(subscription.subscriber.id);
                        if ((subscription.channel as NotificationContracts.SubscriptionChannelWithAddress).useCustomAddress
                            || (subscription.channel.type !== "User" && subscriber && subscriber.deliveryPreference !== NotificationContracts.NotificationSubscriberDeliveryPreference.EachMember)) {
                            // in these cases opting out doesn't make sense, because the notification isn't being delivered directly to the user
                            enableToggle = false;
                            isOptedIn = true; // even if you're opted out, the emails are sent to the custom address
                        }
                    }

                    // Show user opt in/out toggle if not prevented 
                    if (!this.props.preventOptInOut) {
                        const toggleChecked = isOptInToggle ? isOptedIn : subscription.status >= 0;
                        let toggleLabel: string;
                        if (isOptInToggle) {
                            if (subscriptionsStore.getCommonViewData().subscriberIdentity.isContainer) {
                                toggleLabel = toggleChecked ? NotificationResources.SubscriptionTeamOptedIn : NotificationResources.SubscriptionTeamOptedOut;
                            }
                            else {
                                toggleLabel = toggleChecked ? NotificationResources.SubscriptionOptedIn : NotificationResources.SubscriptionOptedOut;
                            }
                        }
                        else {
                            toggleLabel = toggleChecked ? NotificationResources.SubscriptionEnabled : NotificationResources.SubscriptionDisabled;
                        }
                        contents = (
                            <Toggle
                                label={null}
                                aria-label={toggleLabel}
                                checked={toggleChecked}
                                disabled={!enableToggle}
                                onChanged={(checked: boolean) => {
                                    if (isOptInToggle) {
                                        const change: SubscriptionActions.SubscriptionOptOutChange = {
                                            subscription: subscription,
                                            newValue: !checked,
                                            skipWarn: true,
                                        };
                                        SubscriptionActions.Creator.changeSubscriptionOptOut(change);
                                    }
                                    else {
                                        SubscriptionActions.Creator.toggleSubscriptionEnabled(subscription);
                                    }
                                }}
                            />
                        );
                        if (enableToggle) {
                            // tooltips on disabled toggles don't work well at all in Edge or Chrome
                            // Related Chrome bug dates from 2012 https://bugs.chromium.org/p/chromium/issues/detail?id=120132
                            contents = <TooltipHost content={toggleLabel}>{contents}</TooltipHost>;
                        }
                    }
                    return (
                        <span className="toggle-container">
                            {contents}
                        </span>
                    );
                },
            });
        }

        return columns;
    }

    private _getNotifiesFirstLineText(subscription: NotificationContracts.NotificationSubscription, isShared: boolean, isContributedSubscription: boolean): string {
        let notifiesText = "";
        // personal subscription 
        if (!isShared) {
            notifiesText = subscription.subscriber.displayName;
        }
        else {
            // group subscriptions
            if (!isContributedSubscription) {
                let teamName = subscription.subscriber.displayName;
                // remove the scope from the team name Ex Project1\Project1 Team will be display as "Project1 Team"
                teamName = teamName.slice(teamName.lastIndexOf('\\') + 1);
                notifiesText = teamName;
            }
            else {
                // default subscriptions
                let teamName = this.props.subscriptionsStore.getCurrentSubscriber().displayName;
                // remove the scope from the team name Ex Project1\Project1 Team will be display as "Project1 Team"
                teamName = teamName.slice(teamName.lastIndexOf('\\') + 1);
                notifiesText = teamName;
            }
        }
        return notifiesText;
    }

    private _getNotifiesSecondLineText(subscription: NotificationContracts.NotificationSubscription, isShared: boolean, isContributedSubscription: boolean): string {
        let notifiesText = "";
        // personal subscription 
        if (!isShared) {
            // if alernate email or soap
            if (subscription.channel.hasOwnProperty("address")) {
                notifiesText = this._getChannelWithAddressNotifiesText(subscription);
            }
        }
        else if (isContributedSubscription) {
            // contributed subscription
            notifiesText = this._getSubscriberDeliveryPreferenceText();
        }
        else {
            // group subscriptions
            if (subscription.filter.type === ActorFilterType) {
                // Role based subscriptions
                notifiesText = UtilsString.format(NotificationResources.NotifiesSomeTeamMembersTextFormat, this._getIncludedRoles(subscription));
            }
            else {
                // for path subscriptions
                if (subscription.channel.hasOwnProperty("address")) {
                    // if email alias or soap
                    notifiesText = this._getChannelWithAddressNotifiesText(subscription);
                }
                else {
                    if (subscription.channel.type === GroupChannelType) {
                        // notifies a group
                        const isOwnSubscription = subscription.subscriber.id === this.props.subscriptionsStore.getCurrentSubscriber().id;
                        if (isOwnSubscription) {
                            notifiesText = this._getSubscriberDeliveryPreferenceText();
                        }
                        else {
                            // notifies a parent group, try to get its delivery preferences
                            const subscriber = this.props.subscriptionsStore.getNotificationSubscriber(subscription.subscriber.id);
                            // if subscriber isn't found (which should only happen in compat scenarios), this will
                            // return the delivery preferences for the current subscriber, which aligns with the old
                            // behavior
                            notifiesText = this._getSubscriberDeliveryPreferenceText(subscriber);
                        }
                    }
                    else {
                        // path group expansion
                        notifiesText = NotificationResources.NotifiesAllTeamMembersTextFormat;
                    }
                }
            }
        }
        
        return notifiesText;
    }

    private _getSubscriberDeliveryPreferenceText(notificationSubscriber: NotificationContracts.NotificationSubscriber = this.props.subscriptionsStore.getNotificationSubscriber()): string {
        if (notificationSubscriber && notificationSubscriber.deliveryPreference) {
            switch (notificationSubscriber.deliveryPreference) {
                case NotificationContracts.NotificationSubscriberDeliveryPreference.EachMember: return NotificationResources.NotifiesAllTeamMembersTextFormat;
                case NotificationContracts.NotificationSubscriberDeliveryPreference.NoDelivery: return NotificationResources.NoDeliveryLabelText;
                case NotificationContracts.NotificationSubscriberDeliveryPreference.PreferredEmailAddress: return notificationSubscriber.preferredEmailAddress;
                default: return NotificationResources.NotSetTeamDeliveryPreferenceText;
            };
        }
        return NotificationResources.NotSetTeamDeliveryPreferenceText;
    }

    private _getIncludedRoles(subscription: NotificationContracts.NotificationSubscription): string {
        let roles = "";
        let eventType: NotificationContracts.NotificationEventType = this.props.subscriptionsStore.getEventType(subscription);
        for (let role in subscription.filter["inclusions"]) {
            for (let index in eventType.roles) {
                if (eventType.roles[index].id === subscription.filter["inclusions"][role]) {
                    if (roles === "") {
                        roles = roles.concat(eventType.roles[index].name);
                    }
                    else {
                        roles = roles.concat(UtilsString.format(", {0}", eventType.roles[index].name));
                    }
                }
            }
        }
        return roles;
    }

    private _getChannelWithAddressNotifiesText(subscription: NotificationContracts.NotificationSubscription): string {
        if (subscription.channel.type === SoapChannelType) {
            return UtilsString.format(NotificationResources.NotifiedSoapTextFormat, subscription.channel["address"]);
        }
        else {
            return UtilsString.format(NotificationResources.NotifiedCustomEmailTextFormat, subscription.channel["address"]);
        }
    }

    private _getDetailedDescription(subscription: NotificationContracts.NotificationSubscription, eventType: NotificationContracts.NotificationEventType, isShared: boolean, contributedSubscription: boolean): string {
        let detailedDescription = "";
        // for contributed subscriptions
        if (contributedSubscription) {
            if (subscription.extendedProperties) {
                if (this.props.myHub) {
                    detailedDescription = subscription.extendedProperties["user"] ? subscription.extendedProperties["user"] : subscription.description;
                }
                else {
                    detailedDescription = subscription.extendedProperties["team"] ? subscription.extendedProperties["team"] : subscription.description;
                }
            }
            else {
                detailedDescription = subscription.description;
            }
        }

        return detailedDescription;

    }
}

export const EmailChannelType = "EmailHtml";
export const EmailPlainTextChannelType = "EmailPlainText";
export const SoapChannelType = "Soap";
export const GroupChannelType = "Group";
export const UserChannelType = "User";
export const ActorFilterType = "Actor";

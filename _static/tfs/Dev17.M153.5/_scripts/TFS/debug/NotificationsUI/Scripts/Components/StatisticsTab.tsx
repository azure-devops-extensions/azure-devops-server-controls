/// <reference types="react" />
/// <reference types="react-dom" />

// CSS
import "VSS/LoaderPlugins/Css!Notifications";

// React
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ComponentBase from "VSS/Flux/Component";

// VSS
import * as ContributionServices from "VSS/Contributions/Services";
import * as Context from "VSS/Context";
import * as Performance from "VSS/Performance";
import * as SDK from "VSS/SDK/Shim";
import * as Service from "VSS/Service";
import * as UtilsString from "VSS/Utils/String";
import * as VSS from "VSS/VSS";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_Number from "VSS/Utils/Number";
import { VssDetailsList, VssDetailsListTitleCell, VssDetailsListRowStyle } from 'VSSUI/VssDetailsList';

// Notifications
import * as NotificationContracts from "Notifications/Contracts";
import * as NotificationResources from "NotificationsUI/Scripts/Resources/VSS.Resources.NotificationsUI";
import * as SubscriptionActions from "NotificationsUI/Scripts/Actions/SubscriptionActions";

import * as DetailsList from "OfficeFabric/DetailsList";
import { SelectionMode } from "OfficeFabric/utilities/selection/interfaces";
import { Selection } from "OfficeFabric/utilities/selection/Selection";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner"
import NotifResources = require("NotificationsUI/Scripts/Resources/VSS.Resources.NotificationsUI");

// Notification Statistics
import { NotificationStatisticTiles } from "NotificationsUI/Scripts/NotificationStatisticConsumer";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

export class StatisticsTab extends ComponentBase.Component<any, ComponentBase.State> {

    static serviceHooksChannelType: string = "ServiceHooks";
    static artifactFilterType: string = "Artifact";
    static emailHtmlChannelType: string = "EmailHtml";
    static emailPainTextChannelType: string = "EmailPlainText";

    constructor(props: ComponentBase.Props) {
        super(props);
    }

    public render(): JSX.Element {
        if (this.props.data.statistics) {
            const notificationRollup = this.props.data.statistics[NotificationContracts.NotificationStatisticType.Notifications] || [];
            const notificationHitCount = notificationRollup && notificationRollup.length > 0 ? Utils_Number.formatAbbreviatedNumber(notificationRollup[0].hitCount) : 0;

            const eventsRollup = this.props.data.statistics[NotificationContracts.NotificationStatisticType.Events] || [];
            const eventsHitCount = eventsRollup && eventsRollup.length > 0 ? Utils_Number.formatAbbreviatedNumber(eventsRollup[0].hitCount) : 0;

            let tiles = null;
            if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.NotificationsWebTileStatistic)) {
                tiles = <NotificationStatisticTiles subscriptionStore={this.props.subscriptionsStore} />;
            }

            return <div>
                <div>{tiles}</div>
                <div>
                    <div className="statistic-data notification-statistics">
                        <div className="title-container">{NotifResources.MostActiveSubscriptions}</div>
                        <VssDetailsList
                            key={"active-subscriptions"}
                            items={this.props.data.statistics[NotificationContracts.NotificationStatisticType.NotificationBySubscription] || []}
                            isHeaderVisible={true}
                            layoutMode={DetailsList.DetailsListLayoutMode.justified}
                            constrainMode={DetailsList.ConstrainMode.unconstrained}
                            columns={this._getSubscriptionColumns()}
                            shouldDisplayActions={(subscription) => { return true }}
                            getMenuItems={(item) => this._getMenuItems(item)}
                            actionsColumnKey={"desc"}
                            selectionMode={SelectionMode.single}
                            onRenderItemColumn={Utils_Core.delegate(this, this._onRenderNotificationColumns)}
                            onItemInvoked={(item) => {
                                const subscription = this.props.data.subscriptions[this.props.subscriptionsStore.getDefaultServiceInstanceType()][item.path];
                                const isContributedSubscription = this.props.subscriptionsStore.isContributedSubscription(subscription);
                                const isServiceHooksSubscription = (subscription.channel.type === StatisticsTab.serviceHooksChannelType);

                                if (!isServiceHooksSubscription) {
                                    const subscriptionKey: SubscriptionActions.NotificationSubscriptionKey = {
                                        subscriptionId: subscription.id,
                                        publisherId: this.props.subscriptionsStore.getPublisherForSubscription(subscription).id
                                    };

                                    if (isContributedSubscription) {
                                        SubscriptionActions.Creator.openSubscription(subscriptionKey);
                                    } else {
                                        SubscriptionActions.Creator.editSubscription(subscriptionKey);
                                    }
                                }
                            }}
                        />
                    </div>
                    <div className="statistic-data notification-statistics">
                        <div className="title-container">{NotifResources.TopEventInitiators}</div>
                        <VssDetailsList
                            key={"event-data"}
                            items={this.props.data.statistics[NotificationContracts.NotificationStatisticType.EventsByEventTypePerUser] || []}
                            isHeaderVisible={true}
                            layoutMode={DetailsList.DetailsListLayoutMode.justified}
                            constrainMode={DetailsList.ConstrainMode.unconstrained}
                            columns={this._getEventColumns()}
                            selectionMode={SelectionMode.single}
                            onRenderItemColumn={Utils_Core.delegate(this, this._onRenderEventColumns)}
                        />
                    </div>
                </div>
            </div>;
        } else {
            return <Spinner className="notifications-admin-spinner" size={SpinnerSize.large} />;
        }
    }

    public componentDidMount(): void {

    }

    private _onRenderNotificationColumns(item, index, column) {
        var subscription = this.props.data.subscriptions[this.props.subscriptionsStore.getDefaultServiceInstanceType()][item.path];
        if (column.key === 'count') {
            return UtilsString.numberToString(item.hitCount, true, "N0");
        } else if (column.key === 'channel') {
            return this._getChannelDisplayName(subscription.channel.type);
        } else if (column.key === 'eventtype') {
            var eventType = this.props.data.eventTypes[subscription.filter.eventType];
            return eventType ? eventType.name : subscription.filter.eventType;
        }

        return item[column.key];
    }

    private _onRenderEventColumns(item, index, column) {
        var notificationEvent = this.props.data.events[item.path];
        if (column.key === 'count') {
            return UtilsString.numberToString(item.hitCount, true, "N0");
        } else if (column.key === 'eventtype') {
            return notificationEvent.name || notificationEvent.id;
        }

        return item[column.key];
    }

    private _getChannelDisplayName(channel: string): string {
        if (channel === StatisticsTab.emailHtmlChannelType || channel === StatisticsTab.emailPainTextChannelType) {
            return NotifResources.EmailChannel;
        }
        else if (channel === StatisticsTab.serviceHooksChannelType) {
            return NotifResources.ServiceHooksChannel;
        }

        return channel;
    }

    private _getSubscriptionColumns(): DetailsList.IColumn[] {
        let columns: DetailsList.IColumn[] = [];

        columns.push({
            key: "desc",
            name: NotifResources.Description,
            fieldName: null,
            isResizable: false,
            minWidth: 450,
            maxWidth: 600,
            className: "subscription-description",
            onRender: ((item) => {
                var subscription = this.props.data.subscriptions[this.props.subscriptionsStore.getDefaultServiceInstanceType()][item.path];
                const disabled = !this.props.subscriptionsStore.isSubscriptionEnabled(subscription);
                let isContributedSubscription = this.props.subscriptionsStore.isContributedSubscription(subscription);
                let isServiceHooksSubscription = (subscription.channel.type === StatisticsTab.serviceHooksChannelType);

                let descriptionElement: JSX.Element;
                let subsId = UtilsString.format(NotificationResources.SubscriptionDescriptionId, subscription.id);
                let description = subscription.description;
                // check if the user does not have permissions to the subscription, set the description to [private]
                if ((subscription.permissions | NotificationContracts.SubscriptionPermissions.None) === NotificationContracts.SubscriptionPermissions.None) {
                    description = NotificationResources.NoPermissionDescription;
                }
                if (!isContributedSubscription && !isServiceHooksSubscription) {
                    descriptionElement = <span>{description}<span className="subscription-id">{subsId}</span></span>;
                }
                else {
                    descriptionElement = <span>{description}</span>;
                }

                // adding anchor element excluding service hooks 
                if (!isServiceHooksSubscription) {
                    descriptionElement = <a href="#"
                        onClick={() => {
                            const subscriptionKey: SubscriptionActions.NotificationSubscriptionKey = {
                                subscriptionId: subscription.id,
                                publisherId: this.props.subscriptionsStore.getPublisherForSubscription(subscription).id
                            };

                            if (isContributedSubscription) {
                                SubscriptionActions.Creator.openSubscription(subscriptionKey);
                            } else {
                                SubscriptionActions.Creator.editSubscription(subscriptionKey);
                            }
                        }}
                        className={"description-container" + (disabled ? " subscription-disabled" : "")}>{descriptionElement}</a>;
                } else {
                    descriptionElement = <span className={"description-container" + (disabled ? " subscription-disabled" : "")}>{descriptionElement}</span>;
                }
                return descriptionElement;
            })
        });

        columns.push({
            key: "count",
            name: NotifResources.Notifications,
            fieldName: null,
            isResizable: false,
            minWidth: 90,
            maxWidth: 90
        });

        columns.push({
            key: "eventtype",
            name: NotifResources.EventType,
            fieldName: null,
            isResizable: false,
            minWidth: 400,
            maxWidth: 400
        });

        columns.push({
            key: "channel",
            name: NotifResources.Channel,
            fieldName: null,
            isResizable: false,
            minWidth: 90,
            maxWidth: 90
        });

        columns.push({
            key: "identity",
            name: NotifResources.Subscriber,
            fieldName: null,
            isResizable: true,
            minWidth: 200,
            maxWidth: 200,
            onRender: ((item) => {
                var subscription = this.props.data.subscriptions[this.props.subscriptionsStore.getDefaultServiceInstanceType()][item.path];
                let imageUrl = Context.getPageContext().webContext.collection.uri + "_api/_common/identityImage?id=" + subscription.subscriber.id;
                const userTip = `${subscription.subscriber.displayName}`;
                return <div title={userTip} aria-label={userTip}>
                    <span><img className="subscriber-icon identity-picture x-small" src={imageUrl} /></span><span className="subscriber-column">{subscription.subscriber.displayName}</span></div>;
            })
        });

        return columns;
    }

    private _getEventColumns(): DetailsList.IColumn[] {
        let columns: DetailsList.IColumn[] = [];

        columns.push({
            key: "identity",
            name: NotifResources.UserOrGroup,
            fieldName: null,
            isResizable: true,
            minWidth: 280,
            maxWidth: 300,
            onRender: ((item) => {
                var user = item.user;
                let imageUrl = Context.getPageContext().webContext.collection.uri + "_api/_common/identityImage?id=" + user.id;
                const userTip = `${user.displayName}`;
                return <div title={userTip} aria-label={userTip}>
                    <span><img className="subscriber-icon identity-picture x-small" src={imageUrl} /></span><span className="subscriber-column">{user.displayName}</span></div>;
            })
        });

        columns.push({
            key: "eventtype",
            name: NotifResources.EventType,
            fieldName: null,
            isResizable: false,
            minWidth: 450,
            maxWidth: 450
        });

        columns.push({
            key: "count",
            name: NotifResources.Events,
            fieldName: null,
            isResizable: false,
            minWidth: 80,
            maxWidth: 80
        });

        return columns;
    }

    private _getMenuItems(item): IContextualMenuItem[] {
        let subscription = this.props.data.subscriptions[this.props.subscriptionsStore.getDefaultServiceInstanceType()][item.path];
        const items: IContextualMenuItem[] = [];
        var enableActionName: string = this.props.subscriptionsStore.isSubscriptionEnabled(subscription) ? NotificationResources.Disable : NotificationResources.Enable;
        var subscriptionPermissions: NotificationContracts.SubscriptionPermissions = subscription.permissions;
        var userHasEditPermission: boolean = ((subscriptionPermissions & NotificationContracts.SubscriptionPermissions.Edit) === NotificationContracts.SubscriptionPermissions.Edit)
        let isContributed: boolean = ((subscription.flags & NotificationContracts.SubscriptionFlags.ContributedSubscription) === NotificationContracts.SubscriptionFlags.ContributedSubscription);
        let isGroupSubscription: boolean = this.props.subscriptionsStore.isSharedSubscription(subscription);
        var editActionName: string = userHasEditPermission && !isContributed ? NotificationResources.EditAction : NotificationResources.ViewAction;
        var userHasViewPermission = ((subscriptionPermissions & NotificationContracts.SubscriptionPermissions.View) === NotificationContracts.SubscriptionPermissions.View);
        let isArtifactSubscription = (subscription.filter.type === StatisticsTab.artifactFilterType);

        if (subscription.channel.type !== StatisticsTab.serviceHooksChannelType) {
            items.push({
                key: "viewedit",
                name: editActionName,
                disabled: !userHasViewPermission || isArtifactSubscription,
                className: "list-menu-item",
                onClick: (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                    let subscriptionKey: SubscriptionActions.NotificationSubscriptionKey =
                        {
                            subscriptionId: subscription.id
                        };
                    if (userHasEditPermission && !isContributed) {
                        SubscriptionActions.Creator.editSubscription(subscriptionKey);
                    } else {
                        SubscriptionActions.Creator.openSubscription(subscriptionKey);
                    }
                }
            });
        }

        items.push({
            key: "disableEnable",
            name: enableActionName,
            disabled: false,
            className: "list-menu-item",
            onClick: (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                SubscriptionActions.Creator.toggleSubscriptionEnabled(subscription);
            }
        });

        if (userHasEditPermission && !isContributed) {
            items.push({
                key: "delete",
                name: NotificationResources.DeleteAction,
                className: "list-menu-item",
                onClick: (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                    SubscriptionActions.Creator.deleteSubscription(subscription);
                }
            });
        }
        return items;
    }
}
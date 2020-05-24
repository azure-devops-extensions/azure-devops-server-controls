import * as Navigation_Services from "VSS/Navigation/Services";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ActionsHub } from "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";
import { BuildStatusActionCreator } from "VersionControl/Scenarios/ChangeDetails/Actions/BuildStatusActionCreator";
import { ChangeListActionCreator } from "VersionControl/Scenarios/ChangeDetails/Actions/ChangeListActionCreator";
import { DiscussionManagerActionCreator } from "VersionControl/Scenarios/ChangeDetails/Actions/DiscussionManagerActionCreator";
import { ItemDetailsActionCreator } from "VersionControl/Scenarios/ChangeDetails/Actions/ItemDetailsActionCreator";
import { NavigationStateActionCreator } from "VersionControl/Scenarios/ChangeDetails/Actions/NavigationStateActionCreator";
import { UserPreferenceActionCreator } from "VersionControl/Scenarios/ChangeDetails/Actions/UserPreferenceActionCreator";
import { WorkItemsActionCreator } from "VersionControl/Scenarios/ChangeDetails/Actions/WorkItemsActionCreator";
import * as ChangeDetailsTelemetry from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsTelemetry";
import { ChangeListViewSource } from "VersionControl/Scenarios/ChangeDetails/Sources/ChangeListViewSource";
import { StoresHub } from "VersionControl/Scenarios/ChangeDetails/Stores/StoresHub";
import { Notification } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { CustomerIntelligenceData, CustomerIntelligenceProperty } from "VersionControl/Scripts/CustomerIntelligenceData";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { getExplorerUrl } from "VersionControl/Scripts/VersionControlUrls";

export interface ActionCreators {
    changeListActionCreator?: ChangeListActionCreator;
    discussionManagerActionCreator?: DiscussionManagerActionCreator;
    workItemsActionCreator?: WorkItemsActionCreator;
    navigationStateActionCreator?: NavigationStateActionCreator;
    userPreferenceActionCreator?: UserPreferenceActionCreator;
    itemDetailsActionCreator?: ItemDetailsActionCreator;
}

/**
 * The entry point to trigger actions in the change details page.
 */
export class ActionCreator {
    protected  _actionCreators: ActionCreators = {};

    constructor(
        protected _actionsHub: ActionsHub,
        protected _storesHub: StoresHub,
        protected _tfsContext: TfsContext,
        protected _repositoryContext: RepositoryContext,
        protected _changeListViewSource: ChangeListViewSource,
    ) { }

    /**
     * Initializes the ActionCreator
     */
    public initialize(): void {
        // Now that we have context, fire a context udpate event
        this._actionsHub.contextUpdated.invoke({
            tfsContext: this._tfsContext,
            repositoryContext: this._repositoryContext,
        });
    }

    /**
     * Returns the ChangeListActionCreator object
     */
    public get changeListActionCreator(): ChangeListActionCreator {
        if (!this._actionCreators.changeListActionCreator) {
            this._actionCreators.changeListActionCreator = new ChangeListActionCreator(this._actionsHub, this._storesHub, this._repositoryContext);
        }

        return this._actionCreators.changeListActionCreator;
    }

    /**
     * Returns the ChangeListViewSource object
     */
    public get changeListViewSource(): ChangeListViewSource {
        return this._changeListViewSource;
    }

    public get discussionManagerActionCreator(): DiscussionManagerActionCreator {
        if (!this._actionCreators.discussionManagerActionCreator) {
            this._actionCreators.discussionManagerActionCreator = new DiscussionManagerActionCreator(this._actionsHub, this._storesHub, this._tfsContext, this._repositoryContext);
        }

        return this._actionCreators.discussionManagerActionCreator;
    }

    public get navigationStateActionCreator(): NavigationStateActionCreator {
        if (!this._actionCreators.navigationStateActionCreator) {
            this._actionCreators.navigationStateActionCreator = new NavigationStateActionCreator(this._actionsHub, this._storesHub, this.setFullScreen);
        }

        return this._actionCreators.navigationStateActionCreator;
    }

    /**
     * Returns the WorkItemsActionCreator object
     */
    public get workItemsActionCreator(): WorkItemsActionCreator {
        if (!this._actionCreators.workItemsActionCreator) {
            this._actionCreators.workItemsActionCreator = new WorkItemsActionCreator(this._actionsHub, this._repositoryContext);
        }

        return this._actionCreators.workItemsActionCreator;
    }

    /**
     * Returns the ItemDetailsActionCreator object
     */
    public get itemDetailsActionCreator(): ItemDetailsActionCreator {
        if (!this._actionCreators.itemDetailsActionCreator) {
            this._actionCreators.itemDetailsActionCreator = new ItemDetailsActionCreator(this._actionsHub, this._storesHub, this._repositoryContext);
        }

        return this._actionCreators.itemDetailsActionCreator;
    }

    /**
     * Returns the UserPreferenceActionCreator object
     */
    public get userPreferenceActionCreator(): UserPreferenceActionCreator {
        if (!this._actionCreators.userPreferenceActionCreator) {
            this._actionCreators.userPreferenceActionCreator = new UserPreferenceActionCreator(this._actionsHub, this._storesHub, this._repositoryContext);
        }

        return this._actionCreators.userPreferenceActionCreator;
    }

    /**
     * Toggles the fullScreen Mode of the page and fires an action if necessary
     * @param source optional parameter containing the source of the action like compare, contents, summary.
     */
    public toggleFullScreen = (customerIntelligenceData?: CustomerIntelligenceData, source?: string): void => {
        const isFullScreen = !this._storesHub.urlParametersStore.isFullScreen;

        const state = { fullScreen: isFullScreen };
        Navigation_Services.getHistoryService().addHistoryPoint(null, state);

        const ciData = ChangeDetailsTelemetry.getCustomerIntelligenceData(customerIntelligenceData);

        if (!source) {
            source = this._storesHub.urlParametersStore.currentAction;
            if (this._storesHub.urlParametersStore.isDiffParentAction) {
                source = VersionControlActionIds.DiffParent;
            }
        }

        const fullScreenState = isFullScreen ?
            ChangeDetailsTelemetry.ChangeDetailsTelemetryPropertyValues.fullScreenStateOn :
            ChangeDetailsTelemetry.ChangeDetailsTelemetryPropertyValues.fullScreenStateOff;

        ciData.publish(
            ChangeDetailsTelemetry.ChangeDetailsTelemetryFeatures.fullScreen,
            false,
            source,
            false,
            [
                {
                    name: ChangeDetailsTelemetry.ChangeDetailsTelemetryProperties.fullScreenState,
                    value: fullScreenState,
                },
            ]
        );

    }

    /**
     * Used to dismiss notification in the UI.
     */
    public dismissNotification(notification: Notification): void {
        this._actionsHub.notificationsFlushed.invoke(notification);
    }

    /**
     * Raise an application error. This could be a typical JS error or some text.
     */
    public raiseError(error: Error): void {
        this._actionsHub.errorRaised.invoke(error);
    }

    public setFullScreen = (isFullScreen: boolean): void => {
        if (this._changeListViewSource) {
            this._changeListViewSource.setFullScreen(isFullScreen, true);
        }
    }
}

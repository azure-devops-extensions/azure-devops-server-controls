import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

import { IItem } from "ScaledAgile/Scripts/Shared/Models/IItem";

import { TeamFieldValue } from "TFS/Work/Contracts";
import { IDeliveryTimeLineActionsCreator } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Actions/DeliveryTimeLineActionsCreator";
import { DeliveryTimeLineStore } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Stores/DeliveryTimeLineStore";
import { ITeam } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { ItemStore } from "ScaledAgile/Scripts/Shared/Stores/ItemStore";
import { ItemStoreEvents, IItemUpdateEventArgs } from "ScaledAgile/Scripts/Shared/Stores/ItemStoreInterface";
import { IMessageLink } from "ScaledAgile/Scripts/Shared/Models/PageInterfaces";
import { Message } from "ScaledAgile/Scripts/Shared/Models/PageImplementations";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import ScaledAgileResources = require("ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { MessageBarType } from "OfficeFabric/MessageBar";

import { ClassificationPathUtils, AgileProjectMapping } from "Agile/Scripts/Common/Agile";

/**
 * Evaluates membership of a work item for the current teams and intervals. Checks team field values, work item types, and states. 
 */
export class DeliveryTimeLineMembershipEvaluator {
    private _actionsCreator: IDeliveryTimeLineActionsCreator;
    private _itemStore: ItemStore;
    private _deliveryTimeLineStore: DeliveryTimeLineStore;

    private _itemChangeHandler: (sender: ItemStore, changedItem: IItem) => void;

    constructor(
        actionsCreator: IDeliveryTimeLineActionsCreator,
        itemStore: ItemStore,
        deliveryTimeLineStore: DeliveryTimeLineStore) {
        this._actionsCreator = actionsCreator;
        this._itemStore = itemStore;
        this._deliveryTimeLineStore = deliveryTimeLineStore;

        this._addEventHandler();
    }

    public dispose() {
        if (this._itemChangeHandler) {
            this._itemStore.removeListener(ItemStoreEvents.ITEM_CHANGED, this._itemChangeHandler);
            this._itemChangeHandler = null;
        }
        this._deliveryTimeLineStore = null;
        this._actionsCreator = null;
        this._itemStore = null;
    }

    protected _addEventHandler() {
        this._itemChangeHandler = this._handleItemChange.bind(this);
        this._itemStore.addListener(ItemStoreEvents.ITEM_CHANGED, this._itemChangeHandler);
    }

    private _handleItemChange(sender: ItemStore, args: IItemUpdateEventArgs) {
        if (args.isExternal) {
            this._checkForOwnershipChange(args.item, args.isItemOnPlan);
        }
    }

    // made public for testing purposes, returns action link to edit work item for a given work item id
    public _getWorkItemIdActionUrl(workItemId: number) {
        let tfsContext = TfsContext.getDefault();
        return tfsContext.getActionUrl("edit", "workItems", {
            parameters: [workItemId]
        });
    }

    protected _checkForOwnershipChange(item: IItem, isItemOnPlan?: boolean) {
        // Check if work item type type, team field values, and state match any team in the delivery timeline plan. 
        // Note: this evaluator does not consider iterations for team membership (in contrast to other evaluators in Agile),
        // all iterations for a team are considered to belonging to a plan, they just might not be in the view, yet.
        const workItemTypeName = item.getFieldValue(CoreFieldRefNames.WorkItemType);
        const workItemStateName = item.getFieldValue(CoreFieldRefNames.State);
        const iterationPath = item.getFieldValue(CoreFieldRefNames.IterationPath);

        const teams = this._getTeams();

        let teamsOnCurrentPlan: string[] = [];

        for (let team of teams) {
            if (team.hasError()) {
                // Skip membership check for a team in error state such as invalid category reference name
                continue;
            }

            const teamFieldRefName = team.teamFieldName;
            const teamFieldValue = item.getFieldValue(teamFieldRefName);

            const ownedByTeam = this._isOwnedByTeam(team.projectId, teamFieldValue, teamFieldRefName, team.teamFieldValues);
            const typeMatches = this._typeMatches(workItemTypeName, team.backlog.workItemTypes);
            const stateMatches = this._stateMatches(workItemStateName, team.backlog.workItemStates);

            if (ownedByTeam && typeMatches && stateMatches) {
                teamsOnCurrentPlan.push(team.key);
            }
        }

        // If the item is changed to areas outside of the plan and it's originally from current plan, we show a warning message
        // For the changes towards external items, or add new item to current plan whose type is not supported, we just remove the item from itemStore.
        if (teamsOnCurrentPlan.length === 0) {
            if (isItemOnPlan) {
                // get edit url for work item id
                const actionUrl = this._getWorkItemIdActionUrl(item.getFieldValue(CoreFieldRefNames.Id));
                const link: IMessageLink = {
                    href: actionUrl,
                    text: ScaledAgileResources.ItemRemovedEditNow,
                    additionalProps: { target: "_blank", rel: "noopener noreferrer" }
                };

                const messageText = Utils_String.format(ScaledAgileResources.ItemRemoved, item.getFieldValue(CoreFieldRefNames.Title));
                this._actionsCreator.removeItem(item, new Message(MessageBarType.info, messageText, /* closeable: */ true, link));
            } else {
                this._actionsCreator.removeItem(item);
            }
        }
        else if (teamsOnCurrentPlan.length > 0) {
            this._actionsCreator.moveItemToTeamsAndInterval(item, teamsOnCurrentPlan, iterationPath);
        }
    }

    protected _isOwnedByTeam(projectId: string, fieldValue: string, teamFieldRefName: string, teamFieldValues: TeamFieldValue[]): boolean {
        return teamFieldValues instanceof Array
            && teamFieldValues.some(
                teamFieldValue => ClassificationPathUtils.isClassificationPathEqualOrUnderRelative(
                    this._getProjectNames(projectId), fieldValue, teamFieldValue.value, teamFieldValue.includeChildren));
    }

    protected _getProjectNames(projectId: string): string[] {
        return AgileProjectMapping.getInstance().getProjectNames(projectId);
    }

    protected _getTeams(): ITeam[] {
        let storeData = this._deliveryTimeLineStore.getValue();
        return storeData && storeData.teams || [];
    }

    private _typeMatches(workItemTypeName: string, teamWorkItemTypeNames: string[]): boolean {
        return Utils_Array.contains(teamWorkItemTypeNames, workItemTypeName, Utils_String.localeIgnoreCaseComparer);
    }

    private _stateMatches(workItemStateName: string, backlogWorkItemStates: string[]): boolean {
        return Utils_Array.contains(backlogWorkItemStates, workItemStateName, Utils_String.ignoreCaseComparer);
    }
}

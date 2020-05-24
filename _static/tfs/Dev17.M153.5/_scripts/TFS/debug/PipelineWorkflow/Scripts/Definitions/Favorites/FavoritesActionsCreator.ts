import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { Actions as ItemSelectorActions } from "DistributedTaskControls/Actions/ItemSelectorActions";
import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { Item } from "DistributedTaskControls/Common/Item";

import { Favorite } from "Favorites/Contracts";

import { MessageBarType } from "OfficeFabric/MessageBar";

import { DefinitionsActionsCreatorKeys, MessageBarParentKeyConstants } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { DefinitionsSource } from "PipelineWorkflow/Scripts/Definitions/DefinitionsSource";
import { FavoritesActionsHub } from "PipelineWorkflow/Scripts/Definitions/Favorites/FavoritesActions";
import { DefinitionsHubTelemetry } from "PipelineWorkflow/Scripts/Definitions/Utils/TelemetryUtils";

import { logError } from "VSS/Diag";

export class FavoritesActionsCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return DefinitionsActionsCreatorKeys.ActionCreatorKey_FavoritesActionsCreator;
    }

    public initialize(instanceId?: string): void {
        this._favoritesActionsHub = ActionsHubManager.GetActionsHub<FavoritesActionsHub>(FavoritesActionsHub);
        this._itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions);
        this._messageHandlerActionCreator = ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);
    }

    public addFavorite(id: number, name: string, activeLeftPanelItem?: Item): void {
        DefinitionsSource.instance().createFavorite(id, name).then((favorite: Favorite) => {
            DefinitionsHubTelemetry.DefinitionFavoritedSuccessfully();
            this._favoritesActionsHub.addFavorite.invoke(favorite);
            if (activeLeftPanelItem) {
                this._itemSelectorActions.clearSelection.invoke({});
                this._itemSelectorActions.selectItem.invoke({ data: activeLeftPanelItem });
            }
        },
            (error) => {
                DefinitionsHubTelemetry.DefinitionFavoritedFailed();
                this._handleError(error);
            });
    }

    public removeFavorite(favoriteId: string, definitionId: number, activeLeftPanelItem?: Item): void {
        DefinitionsSource.instance().deleteFavorite(favoriteId, definitionId).then(() => {
            DefinitionsHubTelemetry.DefinitionUnFavoritedSuccessfully();
            this._favoritesActionsHub.removeFavorite.invoke({
                definitionId: definitionId,
                favoriteId: favoriteId
            });
            if (activeLeftPanelItem) {
                this._itemSelectorActions.clearSelection.invoke({});
                this._itemSelectorActions.selectItem.invoke({ data: activeLeftPanelItem });
            }
        },
            (error) => {
                DefinitionsHubTelemetry.DefinitionUnFavoritedFailed();
                this._handleError(error);
            });
    }

    public completeFavoriteAddition(definitionId: number): void {
        this._favoritesActionsHub.completeFavoriteAddition.invoke(definitionId);
    }

    private _handleError(error: string): void {
        let errorMessage: string = this._getErrorMessage(error);
        if (errorMessage) {
            logError(errorMessage);
            this._messageHandlerActionCreator.addMessage(MessageBarParentKeyConstants.DefinitionsHubErrorMessageBarKey, errorMessage, MessageBarType.error);
        }
    }

    private _getErrorMessage(error): string {
        if (!error) {
            return null;
        }
        return error.message || error;
    }

    private _messageHandlerActionCreator: MessageHandlerActionsCreator;
    private _favoritesActionsHub: FavoritesActionsHub;
    private _itemSelectorActions: ItemSelectorActions;
}
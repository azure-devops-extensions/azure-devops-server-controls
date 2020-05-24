
import Store_Base = require("VSS/Flux/Store");

import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";

import { IViewBounds } from "ScaledAgile/Scripts/Main/Models/ViewsInterfaces";
import { ItemStore } from "ScaledAgile/Scripts/Shared/Stores/ItemStore";
import { DeliveryTimeLineActions } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Actions/DeliveryTimeLineActions";
import {
    IDeliveryTimeLineStoreWorldStateProvider,
    IDragDropParams, IDragSourceParams, IDeliveryTimeLineViewData, ISortUpdateParams,
    ISetItemsInIntervalParams, ISetTeamsParams, IDeliveryTimeLineStoreData,
    ISetTeamStateColorProviderParams
} from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { DeliveryTimeLineData } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineImplementations";
import { ICardRenderingOptions, IAdditionalField, IdentityPickerRenderingOption } from "ScaledAgile/Scripts/Shared/Card/Models/ICardSettings";

import Utils_Array = require("VSS/Utils/Array");

/**
 * Delivery Time Line Store
 */
export class DeliveryTimeLineStore extends Store_Base.Store implements IDeliveryTimeLineStoreWorldStateProvider {
    private _isDisposed: boolean;

    private _value: IDeliveryTimeLineStoreData;
    private _actions: DeliveryTimeLineActions;
    private _itemStore: ItemStore;
    private _itemChangeHandler: () => void;

    private _initializeHandler: (data: IDeliveryTimeLineViewData) => void;
    private _viewportChangedHandler: (data: IDeliveryTimeLineStoreData) => void;
    private _receivedTeamDataHandler: (data: ISetTeamsParams) => void;
    private _loadingMoreItemsHandler: (data: ISetItemsInIntervalParams) => void;
    private _itemDragStartHandler: (data: IDragSourceParams) => void;
    private _itemDropHandler: (data: IDragDropParams) => void;
    private _itemSortUpdateHandler: (data: ISortUpdateParams) => void;
    private _receivedTeamStateColorsProviderHandler: (data: ISetTeamStateColorProviderParams) => void;
    private _cardRenderingOptionsChangedHandler: (data: ICardRenderingOptions) => void;

    constructor(actions: DeliveryTimeLineActions, itemStore: ItemStore, viewport: IViewBounds) {
        if (!viewport) {
            throw new Error("viewport must be defined");
        }

        super();

        this._isDisposed = false;

        this._value = new DeliveryTimeLineData(viewport.width, viewport.height); //We always have at least an empty value, never null
        this._actions = actions;
        this._itemStore = itemStore;

        this._addActionListeners();
    }

    public dispose() {
        this._isDisposed = true;

        this._removeActionListeners();

        this._value = null;
        this._actions = null;
        this._itemStore = null;
    }

    public getValue(): IDeliveryTimeLineStoreData {
        return this._value;
    }

    /**
     * See IDeliveryTimeLineStoreWorldStateProvider.isDisposed
     */
    public isDisposed(): boolean {
        return this._isDisposed;
    }

    /**
     * @returns Returns true if the data has filter applied
     */
    public isFiltering(): boolean {
        return this._itemStore ? this._itemStore.isFiltering() : false;
    }

    /**
     * Act like a "reducer" but has all functions directly into the store
     */
    private _addActionListeners() {
        this._initializeHandler = (data: IDeliveryTimeLineViewData) => this.onChange(data);
        this._actions.initialize.addListener(this._initializeHandler);

        this._viewportChangedHandler = (data: IDeliveryTimeLineStoreData) => this._viewportChanged(data);
        this._actions.viewportChanged.addListener(this._viewportChangedHandler);

        this._receivedTeamDataHandler = (data: ISetTeamsParams) => this._receivedData(data);
        this._actions.receivedTeamData.addListener(this._receivedTeamDataHandler);

        this._loadingMoreItemsHandler = (data: ISetItemsInIntervalParams) => this._loadingMoreItems(data);
        this._actions.loadingMoreItems.addListener(this._loadingMoreItemsHandler);

        this._itemDragStartHandler = (data: IDragSourceParams) => this._dragStartHandler(data);
        this._actions.itemDragStart.addListener(this._itemDragStartHandler);

        this._itemDropHandler = (data: IDragDropParams) => this._dropHandler(data);
        this._actions.itemDrop.addListener(this._itemDropHandler);

        this._itemSortUpdateHandler = (data: ISortUpdateParams) => this._sortUpdateHandler(data);
        this._actions.itemSortUpdate.addListener(this._itemSortUpdateHandler);

        this._receivedTeamStateColorsProviderHandler = (data: ISetTeamStateColorProviderParams) => this._setTeamColorsProvider(data);
        this._actions.receivedTeamStateColorsProvider.addListener(this._receivedTeamStateColorsProviderHandler);

        this._cardRenderingOptionsChangedHandler = (data: ICardRenderingOptions) => this._onCardRenderingOptionsChanged(data);
        this._actions.cardRenderingOptionsChanged.addListener(this._cardRenderingOptionsChangedHandler);

        // Listen to item changes
        if (this._itemStore) {
            this._itemChangeHandler = this._handleItemChange.bind(this);
            this._itemStore.addChangedListener(this._itemChangeHandler);
        }
    }

    private _removeActionListeners() {
        if (this._initializeHandler) {
            this._actions.initialize.removeListener(this._initializeHandler);
            this._initializeHandler = null;
        }

        if (this._viewportChangedHandler) {
            this._actions.viewportChanged.removeListener(this._viewportChangedHandler);
            this._viewportChangedHandler = null;
        }

        if (this._receivedTeamDataHandler) {
            this._actions.receivedTeamData.removeListener(this._receivedTeamDataHandler);
            this._receivedTeamDataHandler = null;
        }

        if (this._loadingMoreItemsHandler) {
            this._actions.loadingMoreItems.removeListener(this._loadingMoreItemsHandler);
            this._loadingMoreItemsHandler = null;
        }

        if (this._itemDragStartHandler) {
            this._actions.itemDragStart.removeListener(this._itemDragStartHandler);
            this._itemDragStartHandler = null;
        }

        if (this._itemDropHandler) {
            this._actions.itemDrop.removeListener(this._itemDropHandler);
            this._itemDropHandler = null;
        }

        if (this._receivedTeamStateColorsProviderHandler) {
            this._actions.receivedTeamStateColorsProvider.removeListener(this._receivedTeamStateColorsProviderHandler);
            this._receivedTeamStateColorsProviderHandler = null;
        }

        if (this._cardRenderingOptionsChangedHandler) {
            this._actions.cardRenderingOptionsChanged.removeListener(this._cardRenderingOptionsChangedHandler);
            this._cardRenderingOptionsChangedHandler = null;
        }

        if (this._itemChangeHandler) {
            this._itemStore.removeChangedListener(this._itemChangeHandler);
            this._itemChangeHandler = null;
        }
    }

    protected _handleItemChange() {
        const itemStoreValue = this._itemStore.getValue();
        this._value.isFiltered = this.isFiltering();

        // Ensure that all items in all intervals represent the new object from the item store.
        const itemsById = itemStoreValue.itemMap;

        let itemsUpdated = false;

        if (this._value && this._value.teams) {
            for (let team of this._value.teams) {
                for (let interval of team.intervals) {
                    if (interval.items && interval.items.length > 0) {
                        const hasAnyItemChanged = interval.items.some(item => item && item !== itemsById[item.id]);
                        if (hasAnyItemChanged) {
                            let updatedItems = interval.items.map(i => i.id && itemsById[i.id]).filter(x => !!x);
                            let removedItems = Utils_Array.subtract(interval.items, updatedItems, (a, b) => a.id - b.id).map(x => x.id);
                            interval.items = updatedItems;
                            if (removedItems.length > 0) {
                                interval.unpagedItems = interval.unpagedItems.filter(item => !Utils_Array.contains(removedItems, item.id));
                            }
                            itemsUpdated = true;
                        }
                    }
                }
            }
        }

        if (itemsUpdated) {
            this.emitChanged();
        }

    }

    private onChange(data: IDeliveryTimeLineStoreData): void {
        this._checkIfDisposed();

        if (data) {
            this._value = data;
            this._updateVisibleFields(data);
            this.emitChanged();
        } else {
            throw new Error("Data cannot be nulled");
        }
    }

    private _updateVisibleFields(data: IDeliveryTimeLineStoreData) {
        const cardSettings = data.cardSettings;
        const dataSource = this._itemStore.getDataSource();
        if (cardSettings && dataSource) {
            let visibleFields: string[] = [CoreFieldRefNames.Title, CoreFieldRefNames.WorkItemType];
            if (cardSettings.showId) {
                visibleFields.push(CoreFieldRefNames.Id);
            }
            if (cardSettings.showAssignedTo && cardSettings.assignedToRenderingOption !== IdentityPickerRenderingOption.AvatarOnly) {
                visibleFields.push(CoreFieldRefNames.AssignedTo);
            }
            if (cardSettings.showState) {
                visibleFields.push(CoreFieldRefNames.State);
            }
            if (cardSettings.showTags) {
                visibleFields.push(CoreFieldRefNames.Tags);
            }
            if (cardSettings.additionalFields) {
                cardSettings.additionalFields.forEach((field: IAdditionalField) => {
                    visibleFields.push(field.referenceName);
                });
            }

            dataSource.updateVisibleFields(visibleFields);
        }
    }

    /**
     * Take the changed value into the store
     * @param {IDeliveryTimeLineStoreData} changedPayLoad - Data that has been calculated about the viewport
     */
    private _viewportChanged(changedPayLoad: IDeliveryTimeLineStoreData) {
        this._checkIfDisposed();

        let currentViewValues = this._value;
        currentViewValues.viewportTop = changedPayLoad.viewportTop;
        currentViewValues.viewportLeft = changedPayLoad.viewportLeft;
        currentViewValues.worldWidth = changedPayLoad.worldWidth;
        currentViewValues.worldHeight = changedPayLoad.worldHeight;
        currentViewValues.viewportWidth = changedPayLoad.viewportWidth;
        currentViewValues.viewportHeight = changedPayLoad.viewportHeight;
        currentViewValues.worldStartDate = changedPayLoad.worldStartDate;
        currentViewValues.worldEndDate = changedPayLoad.worldEndDate;
        currentViewValues.calendarMonths = changedPayLoad.calendarMonths;
        currentViewValues.todayMarkerPosition = changedPayLoad.todayMarkerPosition;
        currentViewValues.zoomLevelInPixelPerDay = changedPayLoad.zoomLevelInPixelPerDay;
        currentViewValues.focusElement = changedPayLoad.focusElement;
        this.emitChanged();
    }

    private _receivedData(e: ISetTeamsParams) {
        this._checkIfDisposed();

        this._value.teams = e.teams;
        this.emitChanged();
    }

    /**
     * Loads the given items and flags if additional items are pending load.
     * @param {ISetItemsInIntervalParams} intervalChange - Items and flags
     */
    private _loadingMoreItems(intervalChange: ISetItemsInIntervalParams): void {
        this._checkIfDisposed();

        if (intervalChange.items != null) {
            intervalChange.interval.addItems(intervalChange.items);
        }
        if (intervalChange.worldHeight) {
            this._value.worldHeight = intervalChange.worldHeight;
        }
        intervalChange.interval.isWaitingForItems = intervalChange.isWaitingForItems;
        this.emitChanged();
    }

    /**
     * Do nothing else than notifying the UI
     * @param {IDragDropParams} payload 
     */
    private _dropHandler(payload: IDragDropParams) {
        this._checkIfDisposed();
        this.emitChanged();
    }

    /**
     * Do nothing else than notifying the UI
     * @param {IDragSourceParams} payload 
     */
    private _dragStartHandler(payload: IDragSourceParams) {
        this._checkIfDisposed();
        this.emitChanged();
    }

    /**
     * Sets the state colors provider for the correct teams
     * @param {ISetTeamStateColorProviderParams} payload Project id and state colors provider
     */
    private _setTeamColorsProvider(payload: ISetTeamStateColorProviderParams) {
        this._checkIfDisposed();

        let projectId = payload.projectId;
        let value = this._value;
        let shouldEmitChanged = false;
        if (value.teams) {
            let teams = value.teams;
            for (let i = 0, len = teams.length; i < len; i++) {
                if (teams[i].projectId === projectId) {
                    teams[i].workItemStateColorsProvider = payload.stateColorsProvider;
                    shouldEmitChanged = true;
                }
            }
        }
        if (shouldEmitChanged) {
            this.emitChanged();
        }
    }

    /**
     * Sets the card rendering options
     * @param {ICardRenderingOptions} cardRenderingOptions card rendering options
     */
    private _onCardRenderingOptionsChanged(cardRenderingOptions: ICardRenderingOptions) {
        this._checkIfDisposed();

        let value = this._value;
        value.cardRenderingOptions = cardRenderingOptions;
        this.emitChanged();
    }

    /**
     * Sets new index of the sorted item for the correct team with correct category.
     * @param {ISortUpdateParams} payload 
     */
    private _sortUpdateHandler(payload: ISortUpdateParams) {
        this._checkIfDisposed();
        let value = this._value;
        if (value.teams) {
            let allTeams = value.teams;
            for (let i = 0, len = allTeams.length; i < len; i++) {
                let team = allTeams[i];
                // if found the team to update
                if (team.id === payload.sourceTeam.id && team.backlog.categoryReferenceName === payload.sourceTeam.backlog.categoryReferenceName) {
                    let intervals = team.intervals;
                    if (intervals) {
                        for (let j = 0, jlen = intervals.length; j < jlen; j++) {
                            if (intervals[j].id === payload.sourceInterval.id) {
                                intervals[j] = payload.sourceInterval;
                                this.emitChanged();
                                break;
                            }
                        }
                    }
                    break;
                }
            }
        }
    }

    private _checkIfDisposed() {
        if (this._isDisposed) {
            throw Error("DeliveryTimeLineStore is disposed");
        }
    }
}

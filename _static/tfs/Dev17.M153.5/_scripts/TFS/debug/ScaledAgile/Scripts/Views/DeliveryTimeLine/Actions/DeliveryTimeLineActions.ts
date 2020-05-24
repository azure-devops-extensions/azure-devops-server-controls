import Action_Base = require("VSS/Flux/Action");
import {
    IDragDropParams, ISortUpdateParams,
    ISetItemsInIntervalParams, ISetTeamsParams, IDeliveryTimeLineStoreData, IZoomLevelParams,
    ISetTeamStateColorProviderParams, IMoveItemParams, ICollapseTeamParams
} from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { ICardRenderingOptions } from "ScaledAgile/Scripts/Shared/Card/Models/ICardSettings";

/**
 * DeliveryTimeLine specific actions
 */
export class DeliveryTimeLineActions {
    /**
    * Initialize the views
    */
    public initialize: Action_Base.Action<IDeliveryTimeLineStoreData>;

    /**
     * Indicate that the information in the time line view port has changed.
     * @type {IDeliveryTimeLineStoreData} - Contains the teams, months, intervals, the top X items and the remaining ids
     */
    public viewportChanged: Action_Base.Action<IDeliveryTimeLineStoreData>;

    /**
     * Viewport changed with more data from the server.
     * @type {ISetTeamsParams} - Dictionary of teams that should replace the existing teams in the view
     */
    public receivedTeamData: Action_Base.Action<ISetTeamsParams>;

    /**
     * Response to indicate that the data is getting loaded. This is called at the beginning of the request and
     * at the end of it (when new data arrived).
     */
    public loadingMoreItems: Action_Base.Action<ISetItemsInIntervalParams>;

    /**
     * Change the zoom for the view
     */
    public zoomLevelChanged: Action_Base.Action<IZoomLevelParams>;

    /**
     * Action on drag start of an item.
     */
    public itemDragStart: Action_Base.Action<ISortUpdateParams>;

    /**
     * Action on item drop.
     */
    public itemDrop: Action_Base.Action<IDragDropParams>;

    /**
     * Action after item sort has updated.
     */
    public itemSortUpdate: Action_Base.Action<ISortUpdateParams>;

    /**
     * Action on received team state colors provider
     */
    public receivedTeamStateColorsProvider: Action_Base.Action<ISetTeamStateColorProviderParams>;

    /**
     * Action on card rendering options changes
     */
    public cardRenderingOptionsChanged: Action_Base.Action<ICardRenderingOptions>;

    /**
     * Occurs on a successful or a failed move of a card between two iterations
     */
    public moveItemBetweenIntervals: Action_Base.Action<IMoveItemParams>;

    /**
     * Occurs on a successful or a failed move of a card inside the same interval
     */
    public reorderItemInsideInterval: Action_Base.Action<IMoveItemParams>;

    /**
     * Click collapse or uncollapse
     */
    public collapseTeam: Action_Base.Action<ICollapseTeamParams>;

    constructor() {
        this.initialize = new Action_Base.Action<IDeliveryTimeLineStoreData>();
        this.viewportChanged = new Action_Base.Action<IDeliveryTimeLineStoreData>();
        this.receivedTeamData = new Action_Base.Action<ISetTeamsParams>();
        this.loadingMoreItems = new Action_Base.Action<ISetItemsInIntervalParams>();
        this.zoomLevelChanged = new Action_Base.Action<IZoomLevelParams>();
        this.itemDragStart = new Action_Base.Action<ISortUpdateParams>();
        this.itemDrop = new Action_Base.Action<IDragDropParams>();
        this.itemSortUpdate = new Action_Base.Action<ISortUpdateParams>();
        this.receivedTeamStateColorsProvider = new Action_Base.Action<ISetTeamStateColorProviderParams>();
        this.cardRenderingOptionsChanged = new Action_Base.Action<ICardRenderingOptions>();
        this.moveItemBetweenIntervals = new Action_Base.Action<IMoveItemParams>();
        this.reorderItemInsideInterval = new Action_Base.Action<IMoveItemParams>();
        this.collapseTeam = new Action_Base.Action<ICollapseTeamParams>();
        this.zoomLevelChanged = new Action_Base.Action<IZoomLevelParams>();
    }
}

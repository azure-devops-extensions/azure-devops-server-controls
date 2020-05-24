import Action_Base = require("VSS/Flux/Action");
import { IViewsStoreData } from "ScaledAgile/Scripts/Main/Models/ViewsInterfaces";

/**
 * Views actions are action that manage the right content view as well as the collection of views that the owner has
 */
export class ViewsActions {
    /**
     * Initialize the views for Scaled Agile page
     */
    public initialize: Action_Base.Action<IViewsStoreData>;

    constructor() {
        this.initialize = new Action_Base.Action<IViewsStoreData>();
    }
}

import Store_Base = require("VSS/Flux/Store");
import { IViewsStoreData } from "ScaledAgile/Scripts/Main/Models/ViewsInterfaces";
import { ViewsActions } from "ScaledAgile/Scripts/Main/Actions/ViewsActions";

export interface IViewsStore {
    getValue(): IViewsStoreData;
    addChangedListener(handler: IEventHandler): void;
    removeChangedListener(handler: IEventHandler): void;
}

/**
 * Contains information about the views only
 */
export class ViewsStore extends Store_Base.Store implements IViewsStore {
    private _storeData: IViewsStoreData = { view: null };
    private _actions: ViewsActions;
    private _initializeListener: (data: IViewsStoreData) => void;

    constructor(actions: ViewsActions) {
        super(); // Name must be null to have a new instance of the store
        this._actions = actions;
        this._addViewActionListeners();
    }

    /**
     * Cleanup the handlers
     */
    public dispose() {
        this._removeViewActionListeners();
    }

    public getValue(): IViewsStoreData {
        return this._storeData;
    }

    /**
     * The store acts as a "reducer" and will change the store with methods registered to specific actions
     */
    private _addViewActionListeners() {
        this._initializeListener = (data: IViewsStoreData) => this._onChange(data);
        this._actions.initialize.addListener(this._initializeListener);
    }

    private _removeViewActionListeners() {
        if (this._initializeListener) {
            this._actions.initialize.removeListener(this._initializeListener);
            this._initializeListener = null;
        }
    }

    private _onChange(data: IViewsStoreData): void {
        this._storeData = data;
        this.emitChanged();
    }
}

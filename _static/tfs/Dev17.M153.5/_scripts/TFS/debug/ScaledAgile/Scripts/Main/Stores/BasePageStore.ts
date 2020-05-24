
import { IMessage, PageLoadingState, IStateChangeParams } from "ScaledAgile/Scripts/Shared/Models/PageInterfaces";
import { PageActions } from "ScaledAgile/Scripts/Shared/Actions/PageActions";
import { Store } from "VSS/Flux/Store";

export interface BasePageStoreData {
    /**
     * Indicator about the loading state of the page
     */
    pageLoadingState: PageLoadingState;
    /**
     * Collection of all the active messages
     */
    messages: IMessage[];
}

export class BasePageStore extends Store {
    private _pageActions: PageActions;
    private _value: BasePageStoreData;

    constructor(pageActions: PageActions) {
        super();
        this._pageActions = pageActions;
        this._addPageActionListeners();
        this._value = {
            pageLoadingState: PageLoadingState.None,
            messages: []
        };
    }

    public dispose() {
        this._removePageActionListeners();
    }

    public getValue(): BasePageStoreData {
        return this._value;
    }

    private _addPageActionListeners() {
        this._pageActions.setPageLoadingState.addListener(this._setPageLoadingState);
        this._pageActions.setPageLoadingStateWithMessage.addListener(this._setPageLoadingStateWithMessage);
        this._pageActions.setPageMessage.addListener(this._setPageMessage);
        this._pageActions.clearPageMessage.addListener(this._clearPageMessage);
    }

    private _removePageActionListeners() {
        this._pageActions.setPageLoadingState.removeListener(this._setPageLoadingState);
        this._pageActions.setPageLoadingStateWithMessage.removeListener(this._setPageLoadingStateWithMessage);
        this._pageActions.setPageMessage.removeListener(this._setPageMessage);
        this._pageActions.clearPageMessage.removeListener(this._clearPageMessage);
    }

    /**
     * Set the state and emit change
     * @param {PageLoadingState} state - The page loading state to be applied
     */
    private _setPageLoadingState = (state: PageLoadingState) => {
        this._value.pageLoadingState = state;
        this.emitChanged();
    };

    /**
     * Set the state + the message. Used when changing the state into something that need the user to know a reason
     * @param {IStateChangeParams} stateChange - Contains the state and the message to display (warning or error)
     */
    private _setPageLoadingStateWithMessage = (stateChange: IStateChangeParams) => {
        this._value.pageLoadingState = stateChange.state;
        if (stateChange && stateChange.message) {
            this._setPageMessage(stateChange.message);
        }
        else {
            this.emitChanged();
        }
    };

    /**
     * Set a page level message.
     * @param {IMessage} message the message to set
     */
    private _setPageMessage = (message: IMessage) => {
        if (message) {
            // Prevent duplicate messages from being added...
            for (let i = 0, len = this._value.messages.length; i < len; i++) {
                if (this._value.messages[i].message === message.message) {
                    return false;
                }
            }
            this._value.messages.push(message);
            this._value.messages = this._value.messages.slice();
            this.emitChanged();
        }
    };

    /**
     * Clears a page level message by id.
     * @param {string} id the id of the message
     */
    private _clearPageMessage = (id: string) => {
        const messages = this._value.messages;
        for (let i = 0, len = messages.length; i < len; i++) {
            if (messages[i].id === id) {
                messages.splice(i, 1);
                this._value.messages = messages.slice();
                this.emitChanged();
                break;
            }
        }
    };
}

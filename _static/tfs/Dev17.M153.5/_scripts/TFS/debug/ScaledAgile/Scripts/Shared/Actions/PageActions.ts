import Action_Base = require("VSS/Flux/Action");

import { IMessage } from "ScaledAgile/Scripts/Shared/Models/PageInterfaces";
import { PageLoadingState, IStateChangeParams } from "ScaledAgile/Scripts/Shared/Models/PageInterfaces";

/**
 * Page specific actions.
 *
 * Allow to set a warning or error message at the page level as well as specifing a loading state of the data.
 */
export class PageActions {
    /**
     * Set a message to the page. This allow to set a message without changing the state. For example a warning message
     * that doesn't need to set the whole page in a failure state.
     */
    public setPageMessage: Action_Base.Action<IMessage>;

    /**
     * Clears a message from the page
     */
    public clearPageMessage: Action_Base.Action<string>;

    /**
     * Set page loading state (without message). Used to set a successful state like data loaded
     */
    public setPageLoadingState: Action_Base.Action<PageLoadingState>;

    /**
     * Set the page state with a message. Used when in error to set fail state + reason.
     */
    public setPageLoadingStateWithMessage: Action_Base.Action<IStateChangeParams>;

    /**
     * Instantiate all actions
     */
    constructor() {
        this.setPageLoadingState = new Action_Base.Action<PageLoadingState>();
        this.setPageLoadingStateWithMessage = new Action_Base.Action<IStateChangeParams>();
        this.setPageMessage = new Action_Base.Action<IMessage>();
        this.clearPageMessage = new Action_Base.Action<string>();
    }
}
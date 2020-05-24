/**
 * Indicate at what state of loading progress we are
 */
import { MessageBarType } from "OfficeFabric/MessageBar";
import { ILinkProps } from "OfficeFabric/Link";

export enum PageLoadingState {
    /**
     * This should never be set. It's there to allow us to figure out that no state got set.
     */
    None = 0,
    /**
     * This is happening when the page is created and the data is loading. It makes the with a white curtain.
     * Every time we are switching views we are going back to initial state.
     */
    Initial = 1,
    /**
     * This is when the page is having a part of the information to display, but not everything. This
     * loading state can be skipped if the view doesn't have a partial loading. We remove the curtain in that
     * state to give the impression to the user that we have loaded everything.
     */
    WithMinimumData = 2,
    /**
     * All the page is loaded
     */
    FullyLoaded = 3,
    /**
     * From any state, we can go in failure. The fail state indicate that something is wrong with the UI. Being in fail
     * make the UI without the white curtain to allow the user to see the feedback message.
     */
    Fail = 4,
}

export interface IMessageLink {
    text: string;
    href: string;
    additionalProps?: ILinkProps;
}

/**
 * Representation of a message, with the message content and if the message should be dismissable or not
 */
export interface IMessage {
    /**
     * Id of the message (unique identifier to be used to dismiss the message)
     */
    id: string;

    /**
     * Type of message (error, warning, ...)
     */
    messageType: MessageBarType;

    /**
     * Message that will be displayed to the user
     */
    message: string;

    link?: IMessageLink;

    closeable: boolean;
}

/**
 * Action use this interface to set a state change in the store.
 */
export interface IStateChangeParams {
    /**
     * This is required and indicate the current state of the page
     */
    state: PageLoadingState;

    /**
     * Message to be displayed when the state needs some feedback to the user (like when in error)
     */
    message?: IMessage;
}

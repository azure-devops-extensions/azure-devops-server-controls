/// <reference types="jquery" />

import Controls = require("VSS/Controls");
import Utils_String = require("VSS/Utils/String");

export interface IToastMessageOptions {
    /**
     * Removes the toast message after given amount of time
     */
    removeMessageAfterMilliseconds: number;

    /**
     * Time to use for fading in and fading out the toast message
     */
    fadeOutDurationInMilliseconds: number;

    /**
     * Duration for which toast message sits idle after transistion animation before starting to fade out
     */
    idleMessageInMilliseconds: number;
}

export interface IToastMessage {
    /**
     * Notify the toast to display the given toast message
     * @param message - message that appears in bottom center of dashboard
     */
    notify: (message: string) => void;
}

/**
 * Displays a toast message in the bottom approximately centered in visible area of dashboard for specified time and then disappears
 * When more messages come in, previous message disappears and new message is displayed
 */
export class ToastMessage extends Controls.Control<IToastMessageOptions> implements IToastMessage {
    public static CssClass_ToastMessageContainer: string = "toast-message-container";
    public static CssClass_ToastMessage: string = "toast-message";
    public static CssClass_ToastMessageTransistion: string = "toast-message-transistion";
    public static CssClass_ToastMessageAnimation_MoveToast: string = "move-toast";
    public static CssClass_ToastMessageAnimation_FadeIn: string = "fade-in";

    private operationName: string = "dashboard-toast-message";
    private removeMessageAfterMilliseconds: number = 2000;
    private fadeOutDurationInMilliseconds: number = 500;
    private idleMessageInMilliseconds: number = 500;

    private container: JQuery;
    private previousMessage: JQuery;

    constructor(options: IToastMessageOptions) {
        super(options);

        this.removeMessageAfterMilliseconds = this._getRemoveMessageAfterMilliseconds(options);
        this.fadeOutDurationInMilliseconds = this._getFadeOutDurationInMilliseconds(options);
        this.idleMessageInMilliseconds = this._getIdleMessageInMilliseconds(options, this.removeMessageAfterMilliseconds);
    }

    /**
     * Initializes how long it takes to remove toast message (in milliseconds)
     * @param options
     * @returns {number}
     */
    public _getRemoveMessageAfterMilliseconds(options: IToastMessageOptions): number {
        if (options
            && options.removeMessageAfterMilliseconds
            && options.removeMessageAfterMilliseconds > 0) {
            return options.removeMessageAfterMilliseconds;
        }
        return this.removeMessageAfterMilliseconds;
    }

    /**
     * Initializes how long it takes to fade out toast message (in milliseconds)
     * Valid when they are greater than 0 
     * and idle time for message is less than or equal to time after which it will be removed
     * @param options
     * @returns {number}
     */
    public _getFadeOutDurationInMilliseconds(options: IToastMessageOptions): number {
        if (options
            && options.fadeOutDurationInMilliseconds
            && options.fadeOutDurationInMilliseconds > 0) {
            return options.fadeOutDurationInMilliseconds;
        }
        return this.fadeOutDurationInMilliseconds;
    }

    /**
     * Initializes how long toast message sits idle after transistion animation completes before starting to fade out (in milliseconds)
     * Idle time for message must be less than or equal to time after which message will be removed
     * @param options
     * @returns {number}
     */
    public _getIdleMessageInMilliseconds(options: IToastMessageOptions, removeMessageAfterMilliseconds: number): number {
        if (options
            && options.idleMessageInMilliseconds
            && options.idleMessageInMilliseconds > 0
            && options.idleMessageInMilliseconds <= removeMessageAfterMilliseconds) {
            return options.idleMessageInMilliseconds;
        }
        return Math.min(this.idleMessageInMilliseconds, removeMessageAfterMilliseconds);
    }

    public initialize() {
        super.initialize();

        this.container = $("<div/>")
            .addClass(ToastMessage.CssClass_ToastMessageContainer)
            .appendTo(this.getElement());
    }

    /**
     * Displays the given toast message
     * @param message - message that appears in bottom center of dashboard
     */
    public notify(message: string): void {
        if (this.previousMessage) {
            //If there is a previous message still being displayed, cancel the delayed fadeOut and then fadeOut immediately in 0.5s (or specified time)
            //Then remove previous message and add the new one
            this.cancelDelayedFunction(this.operationName);
            this.previousMessage.fadeOut(this.fadeOutDurationInMilliseconds, () => {
                this.previousMessage.remove();
                this.addMessage(message);
            });
        }
        else {
            this.addMessage(message);
        }
    }

    /**
     * Add the message to toast container and add class to start css animation (transistion from bottom to top of container as message fadesIn)
     * @param message - message that appears in bottom center of dashboard
     */
    private addMessage(message: string): void {
        var animation: string = this.getAnimation();
        var messageContainer: JQuery = $("<div/>")
            .addClass(ToastMessage.CssClass_ToastMessage)
            .html(message)
            .appendTo(this.container)
            .addClass(ToastMessage.CssClass_ToastMessageTransistion)
            .css("animation", animation);

        this.previousMessage = messageContainer;
        this.delayRemovingMessage(messageContainer);
    }

    /**
     * Gets the transistion (fadesIn while moving up) animation for toast message
     */
    private getAnimation(): string {
        //Toast message takes 1.5s (animationDuration) to fadeIn while moving up
        var animationDuration: number = this.removeMessageAfterMilliseconds - this.idleMessageInMilliseconds;
        var animation: string = Utils_String.format("{0}ms ease 0s {1}, {0}ms ease 0s {2}",
            animationDuration,
            ToastMessage.CssClass_ToastMessageAnimation_MoveToast,
            ToastMessage.CssClass_ToastMessageAnimation_FadeIn);
        return animation;
    }

    /**
     * Remove the toast message after 0.5s (or specified time)
     * @param messageContainer - message to be removed
     */
    private delayRemovingMessage(messageContainer: JQuery): void {
        //After animation completes, Toast message stays there for 0.5s and fadesOut starts in 0.5s (since total delay is 2s and animation took 1.5s)
        //So toast message appears and disappears in 2.5s if not interrupted
        this.delayExecute(this.operationName, this.removeMessageAfterMilliseconds, false, () => {
            this.removeMessage(messageContainer);
        });
    }

    /**
     * Fade out the message in 0.5s (or specified time) and remove it
     * @param messageContainer
     */
    private removeMessage(messageContainer: JQuery): void {
        messageContainer.fadeOut(this.fadeOutDurationInMilliseconds, () => {
            messageContainer.remove();
        });
    }
}

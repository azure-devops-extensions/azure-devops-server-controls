
import Diag = require("VSS/Diag");
import Utils_Core = require("VSS/Utils/Core");

/**
 * Maximum number of messages to have in the containers that announce() uses.
 */
const MaxAnnounceChildren = 1;
/**
 * Maximum number of containers for announce() to have per assertiveness level.
 */
const MaxAnnounceContainers = 10;

/**
 * ID of the container for the announce() containers.
 */
const ParentContainerId = 'utils-accessibility-announce'

/**
 * Default number of milliseconds to wait before announcing the start of an operation.
 */
const DefaultAnnounceDelay = 1000;

let nextId = 0;

/**
 * Gets the parent container for all the announce containers.
 */
function getAnnounceContainer(): HTMLElement {
    let container = document.getElementById(ParentContainerId);
    if (!container) {
        container = document.createElement("div");
        container.id = ParentContainerId;
        container.classList.add("visually-hidden");
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Causes screen readers to read the given message.
 * @param message
 * @param assertive if true, the screen reader will read the announcement immediately, instead of waiting for "the next graceful opportunity"
 */
export function announce(message: string, assertive = false) {
    if (!message) {
        return;
    }
    const assertiveness = assertive ? "assertive" : "polite";
    const parentContainer = getAnnounceContainer();
    const containerList = parentContainer.getElementsByClassName(assertiveness);

    let container = <HTMLElement>(containerList.length > 0 ? containerList[containerList.length - 1] : null);

    if (!container || container.childElementCount >= MaxAnnounceChildren) {
        container = document.createElement("div");
        container.id = ParentContainerId + nextId++;
        container.setAttribute("aria-live", assertiveness);
        container.classList.add(assertiveness);
        container.setAttribute("aria-relevant", "additions");
        parentContainer.appendChild(container);
        // getElementsByClassName() returns a live list so the new container is already in this list
        if (containerList.length > MaxAnnounceContainers) {
            // remove old containers
            parentContainer.removeChild(containerList[0]);
        }
        Utils_Core.delay(this, 10, () => {
            // live regions get announced on update not create, so wait a bit and then update
            announce(message, assertive);
        });
    }
    else {
        Diag.log(Diag.LogVerbosity.Info, `announce (${assertiveness}): ${message}`);

        const child = document.createElement("p");
        child.textContent = message;
        container.appendChild(child);
        // toggling the visibility like this seems to help Edge
        container.style.visibility = 'hidden';
        container.style.visibility = 'visible';
    }
}

export interface MultiProgressAnnouncerOptions {
    /**
     * The amount of time to wait after the operation has begun before announcing the start (in
     * milliseconds).
     */
    announceStartDelay?: number;
    /**
     * The amount of time to wait after the operation has completed before announcing completion (in
     * milliseconds).
     */
    announceEndDelay?: number;
    /**
     * The message to announce to the user at the start of the operation.
     */
    announceStartMessage: string;
    /**
     * The message to announce to the user at the end of the operation.
     */
    announceEndMessage: string;
    /**
     * Function that the ProgressAnnouncer can call to get the number of currently active operations.
     */
    getActiveCount: () => number;
}


enum MultiProgressAnnouncerState {
    Idle,
    WaitingForStartAnnouncement,
    Running,
    WaitingForEndAnnouncement
}

/**
 * Class for announcing, through a screen reader, when an operation, composed of multiple
 * suboperations, begins and ends. Supports a delay before the starting announcement to keep quick
 * operations from being announced, and delays before the ending announcment in case the operation
 * wasn't actually quite over, or a new one starts.
 *
 * To use, create a MultiProgressAnnouncer, and then whenever the number of active operations has
 * potentially changed, call .update().
 */
export class MultiProgressAnnouncer {
    private _state = MultiProgressAnnouncerState.Idle;
    private _options: MultiProgressAnnouncerOptions;
    private _announceDelay: Utils_Core.DelayedFunction;

    public constructor(options: MultiProgressAnnouncerOptions) {
        this._options = options;
    }

    /**
     * Call this when the number of active operations may have changed. ProgressAnnouncer will
     * then make appropriate announcements.
     */
    public update() {
        const activeCount = this._options.getActiveCount();
        
        switch (this._state) {
            case MultiProgressAnnouncerState.Idle:
                if (activeCount > 0) {
                    this._startAnnounceTimer(this._options.announceStartDelay, this._options.announceStartMessage, MultiProgressAnnouncerState.Running);
                    this._state = MultiProgressAnnouncerState.WaitingForStartAnnouncement;
                }
                break;
            case MultiProgressAnnouncerState.WaitingForStartAnnouncement:
                if (activeCount === 0) {
                    this._cancelAnnounceTimer();
                    this._state = MultiProgressAnnouncerState.Idle;
                }
                break;
            case MultiProgressAnnouncerState.Running:
                if (activeCount === 0) {
                    this._startAnnounceTimer(this._options.announceEndDelay, this._options.announceEndMessage, MultiProgressAnnouncerState.Idle);
                    this._state = MultiProgressAnnouncerState.WaitingForEndAnnouncement;
                }
                break;
            case MultiProgressAnnouncerState.WaitingForEndAnnouncement:
                if (activeCount > 0) {
                    this._cancelAnnounceTimer();
                    this._state = MultiProgressAnnouncerState.Running;
                }
                break;
        }
    }

    private _startAnnounceTimer(delay: number, message: string, targetState: MultiProgressAnnouncerState) {
        if (this._announceDelay) {
            this._cancelAnnounceTimer();
        }
        this._announceDelay = Utils_Core.delay(this, delay !== undefined ? delay : DefaultAnnounceDelay, () => {
            announce(message);
            this._state = targetState;
            this._announceDelay = null;
        });
    }

    private _cancelAnnounceTimer() {
        this._announceDelay.cancel();
        this._announceDelay = null;
    }
}

export interface ProgressAnnouncerOptions {
    /**
     * The amount of time to wait after the operation has begun before announcing the start (in
     * milliseconds).
     */
    announceStartDelay?: number;
    /**
     * The message to announce to the user at the start of the operation. Leave blank or undefined
     * for no announcement.
     */
    announceStartMessage?: string;
    /**
     * The message to announce to the user at the end of the operation. Leave blank or undefined
     * for no announcement.
     */
    announceEndMessage?: string;
    /**
     * The message to announce to the user if the operation fails. Leave blank or undefined for no
     * announcement.
     */
    announceErrorMessage?: string;
    /**
     * Always announce the end message.
     */
    alwaysAnnounceEnd?: boolean;
}

/**
 * Class for announcing, through a screen reader, when a single operation begins and ends. Supports
 * a delay before the starting announcement so that quick operations don't trigger announcements.
 *
 * To use, create a ProgressAnnouncer, and call completed()
 */
export class ProgressAnnouncer {
    private _options: ProgressAnnouncerOptions;
    private _announceDelay: Utils_Core.DelayedFunction;
    private _startAnnounced = false;
    private _completed = false;

    public constructor(options: ProgressAnnouncerOptions) {
        this._options = options;
        this._start();
    }

    /**
     * Create a ProgressAnnouncer for a promise that will announce promise start and completion/rejection.
     * @param promise
     * @param options
     */
    public static forPromise<T>(promise: IPromise<T>, options: ProgressAnnouncerOptions) {
        const announcer = new ProgressAnnouncer(options);
        promise.then(() => {
            announcer.announceCompleted();
        }, () => {
            announcer.announceError();
        });
    }

    private _start() {
        this._announceDelay = Utils_Core.delay(this, this._options.announceStartDelay !== undefined ? this._options.announceStartDelay : DefaultAnnounceDelay, () => {
            announce(this._options.announceStartMessage);
            this._startAnnounced = true;
        });
    }

    /**
     * Call this method when the operation has completed. This will cause the end message to be
     * announced if the start message was announced or if alwaysAnnounceEnd is set to true.
     */
    public announceCompleted() {
        if (!this._completed) {
            this._completed = true;

            if (this._startAnnounced || this._options.alwaysAnnounceEnd) {
                announce(this._options.announceEndMessage);
            }

            if (!this._startAnnounced) {
                this._announceDelay.cancel();
            }
        }
    }

    /**
     * Call this method if the operation completes with an error. This will cause the error message
     * to be announced regardless of whether or not the start message was announced.
     */
    public announceError() {
        if (!this._completed) {
            this._completed = true;
            announce(this._options.announceErrorMessage);
            if (!this._startAnnounced) {
                this._announceDelay.cancel();
            }
        }
    }
}

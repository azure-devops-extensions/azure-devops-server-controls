/// <reference types="jquery" />

import Utils_Core = require("VSS/Utils/Core");
import VSS = require("VSS/VSS");

/**
 * A function that is invoked repeatedly on a timer
 */
export class RefreshFunction<T> {
    private _delay: number;
    private _refreshFunction: (arg: T) => IPromise<boolean>;
    private _delayedFunction: Utils_Core.DelayedFunction;
    private _canceled: boolean = false;

    /**
     * Create a new RefreshFunction
     * @param refreshFunction The function that will be called after the delay. Returns true if the timer should restart
     * @param delay The delay, in milliseconds
     */
    constructor(refreshFunction: (arg: T) => IPromise<boolean>, delay: number = 10000) {
        this._refreshFunction = refreshFunction;
        this._delay = delay;
    }

    /**
     * Start the timer
     * @param arg The argument to pass to the function
     */
    public start(arg: T): void {
        this._canceled = false;
        this._start(arg);
    }

    private _start(arg: T): void {
        this._delayedFunction = Utils_Core.delay(this, this._delay, () => {
            this._delayedFunction.cancel();
            delete this._delayedFunction;

            this._refreshFunction(arg)
                .then((keepGoing: boolean) => {
                    if (!this._canceled && keepGoing) {
                        // keep going
                        this._start(arg);
                    }
                });
        });
    }

    /**
     * Cancels the timer.
     */
    public cancel(): void {
        this._canceled = true;
        if (!!this._delayedFunction) {
            this._delayedFunction.cancel();
            delete this._delayedFunction;
        }
    }
}

/**
 * Exposes a state value and a change id
 */
export interface IncrementalState<T> {
    /**
     * The change id
     */
    lastChangeId: number;

    /**
     * The state value
     */
    value: T;
}

/**
 * A specialization of RefreshFunction for IncrementalState values
 */
export class IncrementalRefreshFunction<T> extends RefreshFunction<IncrementalState<T>> {
    constructor(refreshFunction: (arg: IncrementalState<T>) => IPromise<boolean>) {
        super(refreshFunction);
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Refresh", exports);

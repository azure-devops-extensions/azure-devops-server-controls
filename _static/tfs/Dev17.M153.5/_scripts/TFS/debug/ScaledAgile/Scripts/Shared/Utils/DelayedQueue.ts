
/**
 * Allow to add payload for a specific time before a method got called with the queue.
 *
 * This allow to add multiple payload, get a method to merge them into 1 call to an expensive operation.
 *
 * Used at this moment for movement to send 1 payload instead of multiple which was a scenario that occurred
 * often when dragging (horizontal + vertival movement).
 */
export class DelayedQueue<T> {
    /**
     * The queue of T that is added on call, and removed when the method is invoked
     */
    private _queue: T[];

    /**
     * Number of millisecond to wait before invoking the method with all the payload queued
     */
    private _delayMillisecond: number;

    /**
     * Method to call when the timer is ready to send all the payload
     * @param {T[]} queueData - List of T (payload)
     */
    private _method: (queueData: T[]) => void;

    /**
     * Timer instance
     */
    private _timerId: number;

    /**
     * Starting time of the timer. Used in case the timer doesn't get a chance to trigger.
     */
    private _startingTime: number;

    /**
     * Create a new DelayedQueue that has a method to be called when the timer is ready.
     * @param {Method} method - Method to be called with the queued payload
     * @param {number} delayMillisecond - Delay before calling the method.
     */
    constructor(method: (queueData: T[]) => void, delayMillisecond: number = 50) {
        this._delayMillisecond = delayMillisecond;
        this._method = method;
        this._queue = [];
    }

    /**
     * Add a payload in the queue to be executed by the method
     * @param {T} payloadToQueue - Payload to add in the queue
     */
    public add(payloadToQueue: T): void {
        this._queue.push(payloadToQueue);
        this._startTimer();
    }

    /**
     * End the queue. This should not be called outside this library, except in the
     * extrem case that we want to execute before the end of the queue. This is rare since
     * the queue should always be very small in time (for example, the default if 50ms).
     */
    public end(): void {
        if (this._timerId != null) {
            this._cleanTimer();
        }
    }

    /**
     * Delete the queue, clear the timer to be available to create a new one on next add.
     */
    private _cleanTimer(): void {
        this._queue = [];
        window.clearInterval(this._timerId);
        this._timerId = null;
        this._startingTime = null;
    }

    /**
     * Start a timer if this one doesn't exist. This is done when adding element in the queue
     * if a timer didn't started yet
     */
    private _startTimer(): void {
        if (this._timerId) {
            //Timer is already defined and waiting to be trigged after x millisecond.
            //We look to see if we have passed the x millisecond and that the timer didn't get trigged.
            if (this._startingTime != null) {
                const diff = window.performance.now() - this._startingTime;
                //This occur with very high intensive task that doesn't allow the timer to execute its task. We still give a 10% space to breath.
                if (diff >= this._delayMillisecond * 1.1) {
                    this._execute();
                }
            }
        } else {
            //Time didn't exist, we create a new one as well as taking the exact time we create this one to manually
            //trigger after the x millisecond threshold if the timer cannot be trigged. Use setInterval to ensure a forced
            //calls after x ms. setTimeout was adding the time to the executed method.
            this._timerId = window.setInterval(() => {
                this._execute();
            }, this._delayMillisecond);
            this._startingTime = window.performance.now();
        }
    }

    /**
     * Reset the timer and execute the method. The queue of payload is reduced and passed to the method.
     */
    private _execute(): void {
        let copy = this._queue.slice();
        this._cleanTimer(); //Before the method to be sure that we are starting the timer as soon as possible without being dependend of the time of the method to execute
        this._method(copy);
    }
}
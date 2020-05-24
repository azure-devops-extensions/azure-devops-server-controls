import Utils_Array = require("VSS/Utils/Array");

/**
* Represents a collection of named events that event listeners can attach to
*/
export class NamedEventCollection<TSender, TEventArgs> {

    private _namedHandlers: IDictionaryStringTo<EventHandlerList<TSender, TEventArgs>> = {};

    /**
    * Adds an event handler to the list of handlers for the given event
    *
    * @param eventName the name of the event to subscribe to
    * @param handler Event handler method to register
    */
    public subscribe(eventName: string, handler: IFunctionPPR<TSender, TEventArgs, void>) {
        this._getOrCreateHandlerList(eventName).subscribe(handler);
    }
    
    /**
    * Removes an event handler from the list of handlers for the given event
    *
    * @param eventName The name of the event to unsubscribe to
    * @param handler Event handler method to remove
    */
    public unsubscribe(eventName: string, handler: IFunctionPPR<TSender, TEventArgs, void>) {
        this._getOrCreateHandlerList(eventName).unsubscribe(handler);
    }

    /**
    * Invoke the handlers that have subscribed to this event
    *
    * @param eventName Name of the event whose handlers to invoke
    * @param sender The source that is triggering the event
    * @param eventArgs Event-specific arguments
    * @param handlerResultFilter Optional callback method to be able to break out of the handler invocation loop based on the return value of a handler. The filter should return true to break out of the loop.
    */
    public invokeHandlers(eventName: string, sender?: TSender, eventArgs?: TEventArgs, handlerResultFilter?: (result: any) => boolean) {
        var handlerList = this._namedHandlers[(eventName || "").toUpperCase()];
        if (handlerList) {
            handlerList.invokeHandlers(sender, eventArgs, handlerResultFilter);
        }
    }

    /**
     * Unsubscribes all event handlers
     */
    public unsubscribeAll() {
        this._namedHandlers = {};
    }

    /**
     * Returns true if there is at least one subscriber in this event collection.
     */
    public hasSubscribers(): boolean {
        for (let eventName in this._namedHandlers) {
            if (this._namedHandlers[eventName].getHandlers().length > 0) {
                return true;
            }
        }
        return false;
    }

    private _getOrCreateHandlerList(eventName: string): EventHandlerList<TSender, TEventArgs> {
        var handlers = this._namedHandlers[(eventName || "").toUpperCase()];
        if (!handlers) {
            handlers = new EventHandlerList();
            this._namedHandlers[(eventName || "").toUpperCase()] = handlers;
        }
        return handlers;
    }
}

/**
* Represents a specific event that event listeners can attach to
*/
export class Event<TSender, TEventArgs> {

    private _handlers: EventHandlerList<TSender, TEventArgs>;

    /**
    * The list of handlers for this event
    */
    public getHandlers(): EventHandlerList<TSender, TEventArgs> {
        if (!this._handlers) {
            this._handlers = new EventHandlerList();
        }
        return this._handlers;
    }

    /**
    * Invoke the handlers that have subscribed to this event
    *
    * @param sender The source that is triggering the event
    * @param eventArgs Event-specific arguments
    * @param handlerResultFilter Optional callback method to be able to break out of the handler invocation loop based on the return value of a handler. The filter should return true to break out of the loop.
    */
    public invokeHandlers(sender: TSender, eventArgs: TEventArgs, handlerResultFilter?: (result: any) => boolean) {
        if (this._handlers) {
            this._handlers.invokeHandlers(sender, eventArgs, handlerResultFilter);
        }
    }
}

/**
* A list of event handlers
*/
export class EventHandlerList<TSender, TEventArgs> {

    private _handlers: IFunctionPPR<TSender, TEventArgs, any>[];
    
    /**
    * Creates a new event handler list
    *
    * @param handlers Optional initial list of handlers
    */
    constructor(handlers?: IFunctionPPR<TSender, TEventArgs, any>[]) {
        this._handlers = handlers;
    }

    /**
    * Adds an event handler to the list
    *
    * @param handler Event handler method to register
    */
    public subscribe(handler: IFunctionPPR<TSender, TEventArgs, any>) {
        if (!this._handlers) {
            this._handlers = [];
        }
        if (handler) {
            this._handlers.push(handler);
        }
    }
    
    /**
    * Removes an event handler from the list
    *
    * @param handler Event handler method to remove
    */
    public unsubscribe(handler: IFunctionPPR<TSender, TEventArgs, any>) {
        if (this._handlers) {
            this._handlers = this._handlers.filter(h => h !== handler);
        }
    }

    /**
    * Get the underlying list of handlers
    */
    public getHandlers(): IFunctionPPR<TSender, TEventArgs, any>[] {
        return this._handlers || [];
    }

    /**
    * Invoke the subscribed event handlers
    *
    * @param sender The source that is triggering the event
    * @param eventArgs Event-specific arguments
    * @param handlerResultFilter Optional callback method to be able to break out of the handler invocation loop based on the return value of a handler. The filter should return true to break out of the loop.
    */
    public invokeHandlers(sender?: TSender, eventArgs?: TEventArgs, handlerResultFilter?: (result: any) => boolean): void {
        if (this._handlers && this._handlers.length > 0) {
            var handlersCopy = Utils_Array.clone(this._handlers);
            for (var i = handlersCopy.length - 1; i >= 0; i--) {
                var result = handlersCopy[i](sender, eventArgs);
                if (handlerResultFilter && handlerResultFilter(result)) {
                    break;
                }
            }
        }
    }
}

/**
* Command Event Arguments data structure that can be used for "command" events
*/
export class CommandEventArgs {

    private _commandName: string;
    private _commandArgument: any;
    private _commandSource: any;

    constructor(commandName: string, commandArgument?: any, commandSource?: any) {
        this._commandName = commandName;
        this._commandArgument = commandArgument;
        this._commandSource = commandSource;
    }

    /**
    * Get the name of the command
    */
    public get_commandName(): string {
        return this._commandName;
    }

    /**
    * Get arguments to the command
    */
    public get_commandArgument(): any {
        return this._commandArgument;
    }

    /**
    * Get the source that triggered the event
    */
    public get_commandSource(): any {
        return this._commandSource;
    }
}
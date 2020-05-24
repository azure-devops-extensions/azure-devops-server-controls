/**
 * There exists an unfortunate relationship between discussions and monaco whereby the discussion control needs to understand
 * in greater detail how/when it is getting painted than is normal for a react component. Because of this, the discussion
 * thread host was previously subscribing to a lot of stores to get the emit() events and handle this. But the events that
 * the host needs to listen to are different on different pages so I'm changing DiscussionThreadHost to only listen to this
 * store and each page can have this store subscribe to the actions it needs to care about so that they get forwarded to discussions.
*/
export abstract class IDiscussionRepaintStore {
    abstract onPaint(): void;

    abstract addChangedListener(handler: IEventHandler);
    abstract removeChangedListener(handler: IEventHandler);

    /**
     * Get the name of this interface so that it can be indexed by type name
     */
    static getServiceName(): string { return "IDiscussionRepaintStore"; }
}

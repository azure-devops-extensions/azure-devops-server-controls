const DEFAULT_SCOPE = "DEFAULT_SCOPE";
export class Action<T> {

    /**
     * A mutex to ensure that only one action in a given scope is executing at any time.
     * This prevents cascading actions.
     */
    private static executingScopes: IDictionaryStringTo<boolean> = {};

    private _listeners: ((payload: T) => void)[] = [];
    private _scope: string;

    /**
     * Create a new action
     * @param scope The scope that this action should execute in. Actions with the same scope cannot be invoked within each other
     */
    constructor(scope: string = DEFAULT_SCOPE) {
        this._scope = scope;
    }

    public invoke(payload: T): void {
        if (Action.executingScopes[this._scope]) {
            throw new Error(`Cannot invoke an action with scope ${this._scope} from inside another action with the same scope`);
        }

        Action.executingScopes[this._scope] = true;

        try {
            this._listeners.forEach((listener: (payload: T) => void) => {
                listener(payload);
            });
        } finally {
            delete Action.executingScopes[this._scope];
        }
    }

    /**
     * Add listener to the action
     * @param listener Listener to add
     * @param context Optional context to bind to listener
     * @returns Listener that was added, might be different from the passed in listener if context is given
     */
    public addListener(listener: (payload: T) => void, context?: any): (payload: T) => void {
        const l = context ? listener.bind(context) : listener;
        this._listeners.push(l);
        return l;
    }

    /**
     * Remove listener from the action
     * @param listener Listener to remove
     */
    public removeListener(listener: (payload: T) => void): void {
        const index = this._listeners.indexOf(listener);
        if (index >= 0) {
            this._listeners.splice(index, 1);
        }
    }
}

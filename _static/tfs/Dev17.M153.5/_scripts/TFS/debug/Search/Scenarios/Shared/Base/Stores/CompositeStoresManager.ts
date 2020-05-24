/**
* Porting these changes from VersionControl/Scenarios/Explorer/Stores/StoresHub.ts
*/

import { Action } from "VSS/Flux/Action";
import { Store } from "VSS/Flux/Store";

export type EmitChangedFunction<TPayload> = (changedStores: string[], action: Action<TPayload>, payload: TPayload) => void;

export class CompositeStore extends Store {
    constructor(public readonly childStores: string[]) {
        super();
    }

    public emitCompositeChanged(): void {
        this.emitChanged();
    }
}

interface ActionListener<TPayload> {
    action: Action<TPayload>;

    stores: string[];

    handles: ((payload: TPayload) => void)[];
}

export class ListeningActionsManager {
    private listeners: ActionListener<any>[] = [];

    constructor(private readonly emitChanged: EmitChangedFunction<any>) {
    }

    public listen<TPayload>(action: Action<TPayload>, storeName: string, handle: (payload: TPayload) => void): void {
        const listener = this.getOrCreate(action);

        if (listener.stores.indexOf(storeName) >= 0) {
            throw new Error("A store must only listen once each action.");
        }

        listener.stores.push(storeName);

        listener.handles.push(handle);
    }

    public dispose = (): void => {
        this.listeners.forEach(listener => { listener.handles = []; listener.stores = []; });
        this.listeners = [];
    }

    private getOrCreate<TPayload>(action: Action<TPayload>): ActionListener<TPayload> {
        const filtered = this.listeners.filter(existing => existing.action === action);
        if (filtered.length) {
            return filtered[0];
        } else {
            const actionListener: ActionListener<TPayload> = { action, stores: [], handles: [] };

            action.addListener(payload => {
                for (let i = 0; i < actionListener.handles.length; i++) {
                    const handle = actionListener.handles[i];
                    handle(payload);
                }

                this.emitChanged(actionListener.stores, action, payload);
            });

            this.listeners.push(actionListener);

            return actionListener;
        }
    }
}

export class CompositeStoresManager {
    private compositeStores: CompositeStore[] = [];

    public getOrCreate(storeNames: string[]): CompositeStore {
        let store = this.compositeStores.filter(s => areEqualSets(s.childStores, storeNames))[0];

        if (!store) {
            store = new CompositeStore(storeNames);
            this.compositeStores.push(store);
        }

        return store;
    }

    public dispose = (): void => {
        this.compositeStores = [];
    }

    public emitCompositeChanged = (changedStores: string[]): void => {
        for (const store of this.compositeStores) {
            if (intersect(changedStores, store.childStores).length) {
                store.emitCompositeChanged();
            }
        }
    }
}

function areEqualSets<T>(a: T[], b: T[]): boolean {
    return a.length === b.length &&
        intersect(a, b).length === a.length;
}

function intersect<T>(a: T[], b: T[]): T[] {
    return a.filter(item => b.indexOf(item) >= 0);
}
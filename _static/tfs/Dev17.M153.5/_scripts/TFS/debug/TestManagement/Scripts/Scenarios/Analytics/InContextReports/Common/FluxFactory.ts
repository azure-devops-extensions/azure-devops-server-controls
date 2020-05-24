export interface IDisposable {
    dispose(): void;
}

export interface INewable<T extends IDisposable, U> {
    new (instanceId?: string, arg?: U): T;
    getKey(): string;
}

export class FluxFactory implements IDisposable {

    private constructor() {
    }

    public static instance(): FluxFactory {
        if (!this._instance) {
            this._instance = new FluxFactory();
        }
        
        return this._instance;
    }

    public get<T extends IDisposable, U>(classType: INewable<T, U>, instanceId?: string, arg?: U): T {
        const uniqueInstanceName = classType.getKey().toLowerCase() + (instanceId || "").toLowerCase();
        let instance = this._instanceIdToInstanceMap[uniqueInstanceName];
        if (!instance) {
            instance = Object.create(classType.prototype);
            instance.constructor(instanceId, arg);
            this._instanceIdToInstanceMap[uniqueInstanceName] = instance;
        }
        
        return instance as T;
    }

    public dispose(): void {
        Object.keys(this._instanceIdToInstanceMap).forEach(key => {
            const instance = this._instanceIdToInstanceMap[key];
            instance.dispose();
        });

        this._instanceIdToInstanceMap = {};
        FluxFactory._instance = null;
    }

    private _instanceIdToInstanceMap: IDictionaryStringTo<IDisposable> = {};
    private static _instance: FluxFactory;
}
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";

import * as StringUtils from "VSS/Utils/String";

export interface INewable<T, U> {
    new (args: U): T;
    getKey?: () => string;
    initialize?: (instanceId?: string) => void;
}

export abstract class Singleton {

    constructor() {
        if (!Singleton._allowPrivateInstantiation) {
            throw new Error("Error: Instantiating an object of Singleton class is not allowed. Please use the instance method");
        }
    }

    protected static getInstance<T extends Singleton>(className: INewable<T, {}>): T {
        if (!this._instance) {
            Singleton._allowPrivateInstantiation = true;
            this._instance = new className({});
            Singleton._allowPrivateInstantiation = false;
        }
        return <T>this._instance;
    }

    protected static dispose(): void {
        this._instance = null;
    }

    private static _allowPrivateInstantiation: boolean = false;
    private static _instance: Singleton = null;
}

export class Factory {
    
    public static create<T, U>(className: INewable<T, U>, args: U): T {
        return this.createObject<T, U>(className, args);
    }

    public static createObject<T, U> (className: INewable<T, U>, args: U): T {
        let instance = Object.create(className.prototype);
        instance.constructor(args);
        return instance;
    }
}

export abstract class KeyMonikerProvider {
    public static getKey(): string {
        throw new Error("This method needs to be implemented in derived classes");
    }
}

export abstract class Initializable extends KeyMonikerProvider {
    public abstract initialize(instanceId?: string): void;
}

export abstract class BaseManager<T> extends Singleton {

    constructor() {
        super();
        this._instanceMap = {};
    }

    protected dispose() {

        Object.keys(this._instanceMap).forEach((key: string) => {
            this._deleteInstance(key);
        });

        this._instanceMap = {};
    }

    protected getAllObjects(instanceClass: INewable<T, {}>): T[] {
        let instanceKey = instanceClass.getKey().toLowerCase();
        let instances: T[] = [];
        for (let instance in this._instanceMap) {
            if (this._instanceMap.hasOwnProperty(instance)) {
                if (instance.indexOf(instanceKey) === 0) {
                    instances.push(this._instanceMap[instance]);
                }
            }
        }

        return instances;
    }

    protected getObject(instanceClass: INewable<T, {}>, instanceId: string): T {
        const argumentLength = instanceClass.prototype.constructor.length;
        if (argumentLength > 0) {
            let instanceKey = this._getInstanceKey(instanceClass, instanceId);
            let instance = this._instanceMap[instanceKey];
            if (!instance) {
                throw new Error(StringUtils.format("Object requested is not created yet. Ensure that the object is created before it is queried. {0}", instanceClass));
            }
            else {
                return instance;
            }
        }
        else {
            return this.createObject<{}>(instanceClass, instanceId, null);
        }
    }

    protected removeObject(instanceClass: INewable<T, {}>, instanceId: string): void {
        let instanceKey = this._getInstanceKey(instanceClass, instanceId);
        this._deleteInstance(instanceKey);
    }

    protected createObject<U>(instanceClass: INewable<T, U>, instanceId: string, args: U): T {
        let instanceKey = this._getInstanceKey(instanceClass, instanceId);
        let instance = this._instanceMap[instanceKey];
        if (!instance) {
            instance = Factory.createObject<T, U>(instanceClass, args);
            this.onObjectCreated(instance, instanceId);
            this._instanceMap[instanceKey] = instance;
        }

        return instance;
    }

    protected abstract onObjectCreated(instance: T, instanceId: string): void;

    private _getInstanceKey(instanceClass: INewable<T, {}>, instanceId: string): string {
        let instanceKey: string = instanceClass.getKey();
        if (instanceId) {
            instanceKey = instanceKey + "." + instanceId;
        }

        return instanceKey.toLowerCase();
    }

    private _deleteInstance(instanceKey: string): void {
        let instance = this._instanceMap[instanceKey];
        if (instance) {
            let disposeFunc = (<any>instance).__dispose;
            if (disposeFunc && JQueryWrapper.isFunction(disposeFunc)) {
                (<any>instance).__dispose();
            }

            delete this._instanceMap[instanceKey];
        }
    }

    private _instanceMap: IDictionaryStringTo<T>;
}

export abstract class Manager extends BaseManager<Initializable> {

    protected onObjectCreated(instance: Initializable, instanceId: string) {
        instance.initialize(instanceId);
    }
}


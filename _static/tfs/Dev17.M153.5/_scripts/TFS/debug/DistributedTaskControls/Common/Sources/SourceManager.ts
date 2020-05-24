import { BaseManager, INewable, KeyMonikerProvider } from "DistributedTaskControls/Common/Factory";

export class SourceManager extends BaseManager<KeyMonikerProvider> {

    public static getSource<T extends KeyMonikerProvider>(sourceClass: INewable<T, {}>): T {
        return super.getInstance(SourceManager).getObject(sourceClass, null) as T;
    }

    public static dispose() {
        return super.getInstance(SourceManager).dispose();
    }

    protected onObjectCreated(instance: KeyMonikerProvider, instanceId: string): void {
    }
}
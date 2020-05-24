
import { Initializable as IInitializable, INewable, Manager } from "DistributedTaskControls/Common/Factory";
import { IServiceClientBase } from "DistributedTaskControls/Common/Service/IServiceClientBase";

export class ServiceClientManager extends Manager {

    public static GetServiceClient<T extends IInitializable>(serviceClientClass: INewable<T, {}>, instanceId?: string): T {
        return super.getInstance<ServiceClientManager>(ServiceClientManager).getObject(serviceClientClass, instanceId) as T;
    }

    public static CreateServiceClient<T extends IInitializable, U>(serviceClientClass: INewable<T, U>, instanceId: string, args: U): T {
        return super.getInstance<ServiceClientManager>(ServiceClientManager).createObject<U>(serviceClientClass, instanceId, args) as T;
    }

    public static DeleteServiceClient<T extends IInitializable>(serviceClientClass: INewable<T, {}>, instanceId?: string): void {
        super.getInstance<ServiceClientManager>(ServiceClientManager).removeObject(serviceClientClass, instanceId);
    }

    public static dispose() {
        return super.getInstance<ServiceClientManager>(ServiceClientManager).dispose();
    }
}
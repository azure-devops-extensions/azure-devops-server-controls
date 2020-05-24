import { BuildServiceClient } from "CIWorkflow/Scripts/Service/Build/BuildServiceClient";
import { IServiceClient } from "CIWorkflow/Scripts/Service/IServiceClient";

export class ServiceClientFactory {

    public static getServiceClient(): IServiceClient {
        return BuildServiceClient.instance();
    }
}


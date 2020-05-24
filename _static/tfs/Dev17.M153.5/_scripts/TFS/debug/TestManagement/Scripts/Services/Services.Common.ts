

import q = require("q");

import Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");
import VssContext = require("VSS/Context");
import * as VSS from "VSS/VSS";

export enum ServiceType {
    ReleaseManagement = 0,
    SecurityPermissions = 1
}

export interface IService {
    executeCommand(commandName: string, args?: any[]): any;
}

export class ReleaseManagementCommand {
    public static getReleaseDefinition = "Get-Release-Definition";
}


export class BaseService<T extends VSS_WebApi.VssHttpClient> extends Service.VssService {

    public initializeConnection(tfsConnection: Service.VssConnection) {
        super.initializeConnection(tfsConnection);
        this._httpClient = this.getHttpClient(tfsConnection);
    }

    protected getHttpClient(tfsConnection: Service.VssConnection): T {
        throw new Error("This method should be implemented in derived class");
    }

    protected getProjectName(): string {
        return this.getWebContext().project.name;
    }

    protected _httpClient: T;
}

export class ServiceFactory {

    public static getService(serviceType: ServiceType): IPromise<IService> {
        let returnValue: Q.Deferred<IService> = q.defer<IService>();

        switch (serviceType) {
            case ServiceType.ReleaseManagement:
                VSS.using(["TestManagement/Scripts/Services/TFS.ReleaseManagement.Service"], (module) => {
                    let vssConnection = new Service.VssConnection(VssContext.getDefaultWebContext());
                    let releaseService = vssConnection.getService<any>(module.ReleaseService); 
                    returnValue.resolve(releaseService);
                });
                break;
            case ServiceType.SecurityPermissions:
                VSS.using(["TestManagement/Scripts/Services/TFS.SecurityPermissions.Service"], (module) => {
                    let vssConnection = new Service.VssConnection(VssContext.getDefaultWebContext());
                    let securityPermissionSerice = vssConnection.getService<any>(module.SecurityPermissionsService);
                    returnValue.resolve(securityPermissionSerice);
                });
                break;
            default:
                break;
        }

        return returnValue.promise;
    }
}





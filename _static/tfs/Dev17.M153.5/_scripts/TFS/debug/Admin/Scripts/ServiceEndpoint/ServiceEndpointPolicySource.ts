import * as Q from "q";

import { SourceBase } from "DistributedTaskControls/Common/Sources/SourceBase";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";

import * as Build from "TFS/Build/Contracts";
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");

import { DefinitionResourceReferenceBuildHttpClient } from "DistributedTasksCommon/DefinitionResourceReferenceBuildHttpClient";

import * as VSSContext from "VSS/Context";
import { VssConnection } from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";

/**
 * @brief Source implementation for Tasks related communications with the server
 */
export class ServiceEndpointPolicySource extends SourceBase {

    public static getKey(): string {
        return "ServiceEndpointPolicySource";
    }

    public getDefinitionResourceRefBuildClient(): DefinitionResourceReferenceBuildHttpClient {
        if (!this._defResourceRefBuildClient) {
            this._defResourceRefBuildClient = this._getVssConnection().getHttpClient<DefinitionResourceReferenceBuildHttpClient>(DefinitionResourceReferenceBuildHttpClient);
        }
        return this._defResourceRefBuildClient;
    }

    public getResourceAuthorization(endpointId: string): IPromise<Build.DefinitionResourceReference[]> {
        let endpointPromise = Q.defer<Build.DefinitionResourceReference[]>();
        this.getDefinitionResourceRefBuildClient().getProjectResources(VSSContext.getDefaultWebContext().project.id, "endpoint", endpointId).then((authorizedResources: Build.DefinitionResourceReference[]) => {
            endpointPromise.resolve(authorizedResources);
        }, (err) => {
            endpointPromise.reject(new Error(Utils_String.localeFormat(AdminResources.ErrorLoadingEndpointPolicy, "\r\n", err.message || err)));
        });
        return endpointPromise.promise;
    }

    public authorizeResource(endpointId: string, endpointName: string, shouldAuthorize: boolean): IPromise<Build.DefinitionResourceReference[]> {

        let endpointPromise = Q.defer<Build.DefinitionResourceReference[]>();
        //  Authorizing/Unauthorizing resources for all pipelines
        let endpointReference: Build.DefinitionResourceReference = {
            authorized: shouldAuthorize,
            id: endpointId,
            name: endpointName,
            type: "endpoint"
        };

        this._defResourceRefBuildClient.authorizeProjectResources([endpointReference], VSSContext.getDefaultWebContext().project.id).then((authorizedResources: Build.DefinitionResourceReference[]) => {
            endpointPromise.resolve(authorizedResources);
        }, (err) => {
            endpointPromise.reject(new Error(Utils_String.localeFormat(AdminResources.ErrorSavingEndpointPolicy, "\r\n", err.message || err)));
        });
        return endpointPromise.promise;
    }

    /**
     * @returns vssConnection object
    */
    private _getVssConnection(): VssConnection {
        if (!this._vssConnection) {
            this._vssConnection = new VssConnection(VSSContext.getDefaultWebContext());
        }
        return this._vssConnection;
    }

    public static instance(): ServiceEndpointPolicySource {
        return SourceManager.getSource(ServiceEndpointPolicySource);
    }

    private _vssConnection: VssConnection;
    private _defResourceRefBuildClient: DefinitionResourceReferenceBuildHttpClient;
}
import * as Q from "q";

import * as Constants from "DistributedTask/Scripts/Constants";
import * as Resources from "DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask";

import { SourceBase } from "DistributedTaskControls/Common/Sources/SourceBase";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";
import { DefinitionResourceReferenceBuildHttpClient } from "DistributedTasksCommon/DefinitionResourceReferenceBuildHttpClient";

import * as Build from "TFS/Build/Contracts";


import * as VSSContext from "VSS/Context";
import { VssConnection } from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";

/**
 * @brief Source implementation for Tasks related communications with the server
 */
export class VariableGroupPolicySource extends SourceBase {

    public static getKey(): string {
        return "VariableGroupPolicySource";
    }

    public getDefinitionResourceRefBuildClient(): DefinitionResourceReferenceBuildHttpClient {
        if (!this._defResourceRefBuildClient) {
            this._defResourceRefBuildClient = this._getVssConnection().getHttpClient<DefinitionResourceReferenceBuildHttpClient>(DefinitionResourceReferenceBuildHttpClient);
        }
        return this._defResourceRefBuildClient;
    }

    public getResourceAuthorization(variablegroupid: string): IPromise<Build.DefinitionResourceReference[]> {
        let variableGroupPromise = Q.defer<Build.DefinitionResourceReference[]>();
        this.getDefinitionResourceRefBuildClient().getProjectResources(VSSContext.getDefaultWebContext().project.id, "variablegroup", variablegroupid).then((authorizedResources: Build.DefinitionResourceReference[]) => {
            variableGroupPromise.resolve(authorizedResources);
        }, (err) => {
            variableGroupPromise.reject(new Error(Utils_String.localeFormat(Resources.ErrorLoadingVGPolicy, "\r\n", err.message || err)));
        });
        return variableGroupPromise.promise;
    }

    public authorizeResource(variablegroupid: string, variablegroupname: string, shouldAuthorize: boolean): IPromise<Build.DefinitionResourceReference[]> {

        let variableGroupPromise = Q.defer<Build.DefinitionResourceReference[]>();
        //  Authorizing/Unauthorizing resources for all pipelines
        let variableGroupReference: Build.DefinitionResourceReference = {
            authorized: shouldAuthorize,
            id: variablegroupid,
            name: variablegroupname,
            type: Constants.LibraryConstants.VariableGroup
        };

        this.getDefinitionResourceRefBuildClient().authorizeProjectResources([variableGroupReference], VSSContext.getDefaultWebContext().project.id).then((authorizedResources: Build.DefinitionResourceReference[]) => {
            variableGroupPromise.resolve(authorizedResources);
        }, (err) => {
            variableGroupPromise.reject(new Error(Utils_String.localeFormat(Resources.ErrorSavingVGPolicy, "\r\n", err.message || err)));
        });
        return variableGroupPromise.promise;
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

    public static instance(): VariableGroupPolicySource {
        return SourceManager.getSource(VariableGroupPolicySource);
    }

    private _vssConnection: VssConnection;
    private _defResourceRefBuildClient: DefinitionResourceReferenceBuildHttpClient;
}
import Q = require("q");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Service = require("VSS/Service");
import VssContext = require("VSS/Context");

import DTContracts = require("TFS/DistributedTask/Contracts");

import { FeatureFlag_ResourceAuthForVGEndpoint } from "DistributedTaskControls/Common/Common";
import * as Constants from "DistributedTask/Scripts/Constants";
import DTWebApiServices = require("DistributedTask/Scripts/DT.WebApiService");
import Types = require("DistributedTask/Scripts/DT.Types");
import * as Resources from "DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask";
import TaskAgentClient = require("TFS/DistributedTask/TaskAgentRestClient");
import { VariableGroup } from "TFS/DistributedTask/Contracts";
import ServiceEndpointContracts = require("TFS/ServiceEndpoint/Contracts");
import ServiceEndpointClient = require("TFS/ServiceEndpoint/ServiceEndpointRestClient");
import { EndpointAuthorizationSchemes } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Common";
import * as Utils_String from "VSS/Utils/String";
import { DefinitionResourceReference } from "TFS/Build/Contracts";
import { getDefaultWebContext } from "VSS/Context"
import { DefinitionResourceReferenceBuildHttpClient } from "DistributedTasksCommon/DefinitionResourceReferenceBuildHttpClient";
import { getClient } from "VSS/Service";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

export class DefaultClientFactory implements Types.IClientFactory {

    constructor(connection: Service.VssConnection) {
        this._connection = connection;
    }

    public getCollectionTaskAgentClient(): TaskAgentClient.TaskAgentHttpClient {
        return DTWebApiServices.DistributedTaskAgentClient.getCollectionTaskAgentClient();
    }

    public getCollectionServiceEndpointClient(): ServiceEndpointClient.ServiceEndpointHttpClient {
        return DTWebApiServices.DistributedTaskServiceEndpointClient.getCollectionServiceEndpointClient();
    }

    private _connection: Service.VssConnection;
}

export class BaseManager {
    public static clientFactory: Types.IClientFactory;
    public static webContext: Contracts_Platform.WebContext;
    public static tfsConnection: Service.VssConnection;

    constructor(options?: any) {

        if (!BaseManager.webContext) {
            if (!!options) {
                BaseManager.webContext = options.webContext || VssContext.getDefaultWebContext();
            } else {
                BaseManager.webContext = VssContext.getDefaultWebContext();
            }
        }

        if (!BaseManager.clientFactory) {
            BaseManager.tfsConnection = new Service.VssConnection(BaseManager.webContext);
            BaseManager.clientFactory = new DefaultClientFactory(BaseManager.tfsConnection);
        }
    }
}

export class VariableGroupManager extends BaseManager {

    constructor(options?: any) {
        super(options);

        if (!VariableGroupManager._distributedTaskClient) {
            VariableGroupManager._distributedTaskClient = BaseManager.clientFactory.getCollectionTaskAgentClient();
        }
        this._definitionResourceReferenceBuildClient = getClient(DefinitionResourceReferenceBuildHttpClient);
    }

    public beginAddVariableGroup(variableGroup: DTContracts.VariableGroup, shouldAuthorize: boolean): IPromise<DTContracts.VariableGroup> {

        if (!(FeatureAvailabilityService.isFeatureEnabled(FeatureFlag_ResourceAuthForVGEndpoint))) {
            return VariableGroupManager._distributedTaskClient.addVariableGroup(variableGroup, this.getProjectId());
        }

        let variableGroupPromise = Q.defer<VariableGroup>();
        VariableGroupManager._distributedTaskClient.addVariableGroup(variableGroup, this.getProjectId()).then((variableGroup: VariableGroup) => {

            if (!shouldAuthorize) {
                variableGroupPromise.resolve(variableGroup);
            }
            else {
                //  Creating a variableGroup reference to authorize for all definitions at time of creating
                let variableGroupReference: DefinitionResourceReference = {
                    authorized: true,
                    id: variableGroup.id.toString(),
                    name: variableGroup.name,
                    type: Constants.LibraryConstants.VariableGroup
                };

                //  Authorizing variableGroup for all pipelines
                this._definitionResourceReferenceBuildClient.authorizeProjectResources([variableGroupReference], getDefaultWebContext().project.id).then(() => {
                    variableGroupPromise.resolve(variableGroup);
                }, (err) => {
                    variableGroupPromise.reject(new Error(Utils_String.localeFormat(Resources.ErrorSavingVGPolicyDuringCreation, err.message || err)));
                });
            }
        }, (err) => {
            variableGroupPromise.reject(new Error(err.message || err));
        });
        return variableGroupPromise.promise;
    }


    public beginUpdateVariableGroup(variableGroup: DTContracts.VariableGroup): IPromise<DTContracts.VariableGroup> {
        return VariableGroupManager._distributedTaskClient.updateVariableGroup(variableGroup, this.getProjectId(), variableGroup.id);
    }

    public beginGetVariableGroups(): IPromise<DTContracts.VariableGroup[]> {
        return VariableGroupManager._distributedTaskClient.getVariableGroups(this.getProjectId(), null);
    }

    public beginGetVariableGroup(groupId: number): IPromise<DTContracts.VariableGroup> {
        return VariableGroupManager._distributedTaskClient.getVariableGroup(this.getProjectId(), groupId);
    }

    public beginDeleteVariableGroup(groupId: number): IPromise<void> {
        if (!(FeatureAvailabilityService.isFeatureEnabled(FeatureFlag_ResourceAuthForVGEndpoint))) {
            return VariableGroupManager._distributedTaskClient.deleteVariableGroup(this.getProjectId(), groupId);
        }

        let variableGroupPromise = Q.defer<void>();

        let variableGroupReference: DefinitionResourceReference = {
            authorized: false,
            id: groupId.toString(),
            name: "",
            type: Constants.LibraryConstants.VariableGroup
        };

        this._definitionResourceReferenceBuildClient.authorizeProjectResources([variableGroupReference], getDefaultWebContext().project.id).then(() => {
            VariableGroupManager._distributedTaskClient.deleteVariableGroup(this.getProjectId(), groupId).then(() => {
                variableGroupPromise.resolve();
            }, (err) => {
                variableGroupPromise.reject(new Error(Utils_String.localeFormat(Resources.ErrorDeletingVg, "\r\n", err.message || err)));
            });
        }, (err) => {
            variableGroupPromise.reject(new Error(Utils_String.localeFormat(Resources.ErrorDeletingVGPolicy, "\r\n", err.message || err)));
        });

        return variableGroupPromise.promise;

    }

    private getProjectId(): string {
        return BaseManager.webContext.project.id;
    }

    private static _distributedTaskClient: TaskAgentClient.TaskAgentHttpClient;
    private _definitionResourceReferenceBuildClient: DefinitionResourceReferenceBuildHttpClient;
}

export class SecureFileManager extends BaseManager {

    constructor(options?: any) {
        super(options);

        if (!SecureFileManager._distributedTaskClient) {
            SecureFileManager._distributedTaskClient = BaseManager.clientFactory.getCollectionTaskAgentClient();
        }
    }

    public beginUploadSecureFile(secureFile: DTContracts.SecureFile, file: File): IPromise<DTContracts.SecureFile> {
        return SecureFileManager._distributedTaskClient.uploadSecureFile(file, this.getProjectId(), secureFile.name);
    }

    public beginUpdateSecureFile(secureFile: DTContracts.SecureFile): IPromise<DTContracts.SecureFile> {
        return SecureFileManager._distributedTaskClient.updateSecureFile(secureFile, this.getProjectId(), secureFile.id);
    }

    public beginGetSecureFiles(): IPromise<DTContracts.SecureFile[]> {
        return SecureFileManager._distributedTaskClient.getSecureFiles(this.getProjectId(), null);
    }

    public beginGetSecureFile(secureFileId: string): IPromise<DTContracts.SecureFile> {
        return SecureFileManager._distributedTaskClient.getSecureFile(this.getProjectId(), secureFileId);
    }

    public beginDeleteSecureFile(secureFileId: string): IPromise<void> {
        return SecureFileManager._distributedTaskClient.deleteSecureFile(this.getProjectId(), secureFileId);
    }

    private getProjectId(): string {
        return BaseManager.webContext.project.id;
    }

    private static _distributedTaskClient: TaskAgentClient.TaskAgentHttpClient;
}

export class OAuthConfigurationManager extends BaseManager {

    constructor(options?: any) {
        super(options);

        if (!OAuthConfigurationManager._serviceEndpointClient) {
            OAuthConfigurationManager._serviceEndpointClient = BaseManager.clientFactory.getCollectionServiceEndpointClient();
        }
    }

    public beginGetOAuthConfigurations(): IPromise<ServiceEndpointContracts.OAuthConfiguration[]> {
        return OAuthConfigurationManager._serviceEndpointClient.getOAuthConfigurations();
    }

    public beginDeleteOAuthConfiguration(configurationId: string): IPromise<ServiceEndpointContracts.OAuthConfiguration> {
        return OAuthConfigurationManager._serviceEndpointClient.deleteOAuthConfiguration(configurationId);
    }

    public beginGetOAuthConfiguration(configurationId: string): IPromise<ServiceEndpointContracts.OAuthConfiguration> {
        return OAuthConfigurationManager._serviceEndpointClient.getOAuthConfiguration(configurationId);
    }

    public beginCreateOAuthConfiguration(configurationParams: ServiceEndpointContracts.OAuthConfigurationParams): IPromise<ServiceEndpointContracts.OAuthConfiguration> {
        return OAuthConfigurationManager._serviceEndpointClient.createOAuthConfiguration(configurationParams);
    }

    public beginUpdateOAuthConfiguration(configurationParams: ServiceEndpointContracts.OAuthConfigurationParams, configurationId: string): IPromise<ServiceEndpointContracts.OAuthConfiguration> {
        return OAuthConfigurationManager._serviceEndpointClient.updateOAuthConfiguration(configurationParams, configurationId);
    }

    public beginGetOAuthSourceTypes(refreshCache: boolean = false): IPromise<ServiceEndpointContracts.ServiceEndpointType[]> {
        if (!refreshCache && !!OAuthConfigurationManager._sourceTypesCache) {
            return Q.resolve(OAuthConfigurationManager._sourceTypesCache);
        }

        let promise = OAuthConfigurationManager._serviceEndpointClient.getServiceEndpointTypes(Utils_String.empty, EndpointAuthorizationSchemes.OAuth2);
        promise.then((sourceTypes: ServiceEndpointContracts.ServiceEndpointType[]) => {
            OAuthConfigurationManager._sourceTypesCache = sourceTypes;
        });

        return promise;
    }

    private static _sourceTypesCache: ServiceEndpointContracts.ServiceEndpointType[];
    private static _serviceEndpointClient: ServiceEndpointClient.ServiceEndpointHttpClient;
}
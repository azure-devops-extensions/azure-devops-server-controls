///<amd-dependency path="jQueryUI/core"/>
///<amd-dependency path="jQueryUI/widget"/>

/// <reference types="jquery" />

import VSS = require("VSS/VSS");
import VssContext = require("VSS/Context");
import DistributedTask_Contracts = require("TFS/DistributedTask/Contracts");
import ServiceEndpoint_Contracts = require("TFS/ServiceEndpoint/Contracts");
import Resources = require("DistributedTasksCommon/Resources/TFS.Resources.DistributedTasksLibrary");

export module FeatureAvailabilityFlags {
    export var WebAccessAutoCreateServicePrincipal = "WebAccess.AutoCreateServicePrincipal";
    export var WebAccessAutoCreateServicePrincipalAcrossTenants = "WebAccess.AutoCreateServicePrincipalAcrossTenants";
    export var WebAccessAutoCreateOAuthBasedServicePrincipalAcrossTenants = "WebAccess.AutoCreateOAuthBasedServicePrincipalAcrossTenants";
    export var WebAccessAutoCreateServicePrincipalCompleteCallbackByAuthcode = "WebAccess.AutoCreateServicePrincipalCompleteCallbackByAuthcode";
    export var WebAccessHideServicePrincipal = "WebAccess.HideServicePrincipal";
    export var WebAccessEnableAzureStackForServicePrincipal = "WebAccess.EnableAzureStackForServicePrincipal"
    export var WebAccessEnableManagementGroupsForServicePrincipal = "WebAccess.EnableManagementGroupsForServicePrincipal"
    export var WebAccessEnableResourceGroupScopedServicePrincipal = "WebAccess.EnableResourceGroupScopedServicePrincipal";
    export var WebAccessEnableManagedServiceIdentityAuthenticationScheme = "WebAccess.EnableManagedServiceIdentityAuthenticationScheme";
    export var WebAccessEnableSpnCertificateBasedAuthentication = "WebAccess.EnableSpnCertificateBasedAuthentication";
    export var ResourceAuthorizationforVGEndpoint = "WebAccess.DistributedTask.ResourceAuthorization.VGEndpoint";
}

export interface IServiceEndpointApiData {
    endpointId: string;
    endpointName: string;
    url: string;
    username: string;
    passwordKey: string;
    type: string;
    scheme: string;
    parameters?: {
        [key: string]: string;
    }
}

export interface DockerRegistryServiceEndpointApiData {
    endpointId: string;
    endpointName: string;
    url: string;
    username: string;
    passwordKey: string;
    email: string;
    registry: string;
    type: string;
    scheme: string;
    parameters?: {
        [key: string]: string;
    }
}


export interface KubernetesServiceEndpointApiData {
    endpointId: string;
    endpointName: string;
    url: string;
    type: string;
    scheme: string;
    parameters?: {
        [key: string]: string;
    }
}

export module EndpointAuthorizationSchemes {
    export var UsernamePassword = "UsernamePassword";
    export var Certificate = "Certificate";
    export var ServicePrincipal = "ServicePrincipal";
    export var PersonalAccessToken = "PersonalAccessToken";
    export var OAuth = "OAuth";
    export var OAuth2 = "OAuth2";
    export var None = "None";
    export var Token = "Token";
    export var ManagedServiceIdentity = "ManagedServiceIdentity";
    export var Kubernetes = "Kubernetes";
}

export module EndpointAuthorizationParameters {
    export var OboAuthorization = "oboAuthorization";
    export var TenantId = "tenantid";
    export var ClientCertificateData = "ClientCertificateData";
    export var ClientKeyData = "ClientKeyData";
    export var Username = "username";
    export var Password = "password";
    export var ApiToken = "apiToken";
    export var AccessToken = "AccessToken";
    export var ConfigurationId = "ConfigurationId";
    export var ServicePrincipalKeyAuth = "spnKey";
    export var ServicePrincipalCertificateAuth = "spnCertificate";
}

export module ServiceEndpointType {
    export var Azure = "azure";
    export var AzureRM = "azurerm";
    export var AzureDeploymentManager = "azuredeploymentmanager";
    export var Bitbucket = "bitbucket";
    export var Chef = "chef";
    export var ExternalGit = "git";
    export var Generic = "generic";
    export var GitHub = "github";
    export var GitHubBoards = "githubboards";
    export var GitHubEnterprise = "githubenterprise";
    export var Jenkins = "jenkins";
    export var Subversion = "subversion";
    export var SSH = "ssh";
    export var Docker = "dockerregistry";
    export var Kubernetes = "kubernetes";
}

export class ServiceEndpointDetails {
    endPoint: ServiceEndpoint_Contracts.ServiceEndpoint;
    credentialsXml: string;

    constructor(connectionInfo: IServiceEndpointApiData, authorizationInfo?: ServiceEndpoint_Contracts.EndpointAuthorization) {
        if (!authorizationInfo) {
            if (connectionInfo.scheme === EndpointAuthorizationSchemes.PersonalAccessToken ||
                connectionInfo.scheme === EndpointAuthorizationSchemes.OAuth) {
                authorizationInfo = {
                    parameters: {
                        accessToken: connectionInfo.passwordKey
                    },
                    scheme: connectionInfo.scheme
                };
            } else {
                authorizationInfo = {
                    parameters: {
                        username: connectionInfo.username,
                        password: connectionInfo.passwordKey
                    },
                    scheme: EndpointAuthorizationSchemes.UsernamePassword
                };
            }
        }

        var metadata: ServiceEndpoint_Contracts.ServiceEndpoint = {
            id: connectionInfo.endpointId,
            description: "",
            administratorsGroup: null,
            authorization: authorizationInfo,
            createdBy: null,
            data: connectionInfo.parameters,
            name: connectionInfo.endpointName,
            type: connectionInfo.type,
            url: connectionInfo.url,
            readersGroup: null,
            groupScopeId: null,
            isShared: undefined,
            isReady: false,
            operationStatus: null,
            owner: undefined
        };

        this.endPoint = metadata;
    }

    public toServiceEndpoint(): ServiceEndpoint_Contracts.ServiceEndpoint {
        return this.endPoint;
    }

    public toServiceEndpointDetails(): ServiceEndpoint_Contracts.ServiceEndpointDetails {
        var serviceEndpointDetails: ServiceEndpoint_Contracts.ServiceEndpointDetails = {
            type: this.endPoint.type,
            url: this.endPoint.url,
            authorization: this.endPoint.authorization,
            data: this.endPoint.data
        }

        return serviceEndpointDetails;
    }
}

export class DockerRegistryServiceEndpointDetails {

    endPoint: ServiceEndpoint_Contracts.ServiceEndpoint;
    credentialsXml: string;

    constructor(connectionInfo: DockerRegistryServiceEndpointApiData, authorizationInfo?: ServiceEndpoint_Contracts.EndpointAuthorization) {

        if (!authorizationInfo) {
            if (connectionInfo.scheme === EndpointAuthorizationSchemes.UsernamePassword) {
                authorizationInfo = {
                    parameters: {
                        username: connectionInfo.username,
                        password: connectionInfo.passwordKey,
                        email: connectionInfo.email,
                        registry: connectionInfo.registry
                    },
                    scheme: connectionInfo.scheme
                };
            }
        }

        var metadata: ServiceEndpoint_Contracts.ServiceEndpoint = {
            id: connectionInfo.endpointId,
            description: "",
            administratorsGroup: null,
            authorization: authorizationInfo,
            createdBy: null,
            data: connectionInfo.parameters,
            name: connectionInfo.endpointName,
            type: connectionInfo.type,
            url: connectionInfo.url,
            readersGroup: null,
            groupScopeId: null,
            isShared: undefined,
            isReady: false,
            operationStatus: null,
            owner: undefined
        };

        this.endPoint = metadata;
    }

    public toServiceEndpoint(): ServiceEndpoint_Contracts.ServiceEndpoint {
        return this.endPoint;
    }

    public toServiceEndpointDetails(): ServiceEndpoint_Contracts.ServiceEndpointDetails {
        var serviceEndpointDetails: ServiceEndpoint_Contracts.ServiceEndpointDetails = {
            type: this.endPoint.type,
            url: this.endPoint.url,
            authorization: this.endPoint.authorization,
            data: this.endPoint.data
        }

        return serviceEndpointDetails;
    }
}

export class KubernetesServiceEndpointDetails {

    endPoint: ServiceEndpoint_Contracts.ServiceEndpoint;
    credentialsXml: string;

    constructor(connectionInfo: KubernetesServiceEndpointApiData, authorizationInfo: DistributedTask_Contracts.EndpointAuthorization) {

        var metadata: ServiceEndpoint_Contracts.ServiceEndpoint = {
            id: connectionInfo.endpointId,
            description: "",
            administratorsGroup: null,
            authorization: authorizationInfo,
            createdBy: null,
            data: connectionInfo.parameters,
            name: connectionInfo.endpointName,
            type: connectionInfo.type,
            url: connectionInfo.url,
            readersGroup: null,
            groupScopeId: null,
            isShared: undefined,
            isReady: false,
            operationStatus: null,
            owner: undefined
        };

        this.endPoint = metadata;
    }

    public toServiceEndpoint(): ServiceEndpoint_Contracts.ServiceEndpoint {
        return this.endPoint;
    }

    public toServiceEndpointDetails(): ServiceEndpoint_Contracts.ServiceEndpointDetails {
        var serviceEndpointDetails: ServiceEndpoint_Contracts.ServiceEndpointDetails = {
            type: this.endPoint.type,
            url: this.endPoint.url,
            authorization: this.endPoint.authorization,
            data: this.endPoint.data
        }

        return serviceEndpointDetails;
    }

    private kubeconfigAuthType: string = "Kubeconfig";
}

export function isGuid(value: string): boolean {
    // b7a1d774-113d-4364-82af-75ce6919ef88
    var validGuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return validGuid.test(value);
}

export function productName(): string {
    if (!VssContext.getPageContext().webAccessConfiguration.isHosted) {
        return Resources.TeamFoundationServerProductName;
    }
    else {
        return Resources.VisualStudioTeamServicesProductName;
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("ServiceEndpoint.Common", exports);

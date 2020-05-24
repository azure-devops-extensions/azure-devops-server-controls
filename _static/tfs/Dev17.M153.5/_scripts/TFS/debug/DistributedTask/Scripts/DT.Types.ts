import TaskAgentClient = require("TFS/DistributedTask/TaskAgentRestClient");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import DTContracts = require("TFS/DistributedTask/Contracts");
import ServiceEndpointClient = require("TFS/ServiceEndpoint/ServiceEndpointRestClient");

export interface IClientFactory {
    getCollectionTaskAgentClient(): TaskAgentClient.TaskAgentHttpClient;
    getCollectionServiceEndpointClient(): ServiceEndpointClient.ServiceEndpointHttpClient; 
}

export interface ISecureFileProperty {
    key: string,
    value: string
}

export interface ISecureFile {
    id: string;
    name: string;
    properties: ISecureFileProperty[];
    createdBy: VSS_Common_Contracts.IdentityRef;
    modifiedBy: VSS_Common_Contracts.IdentityRef;
    modifiedOn: Date;
}

export interface Variable {
    name: string;
    value: string;
    isSecret: boolean;
}

export interface VariableGroup {
    id: number;
    type: string;
    name: string;
    description: string;
    providerData: DTContracts.VariableGroupProviderData;
    createdBy: VSS_Common_Contracts.IdentityRef;
    variables: Variable[];
    modifiedBy: VSS_Common_Contracts.IdentityRef;
    modifiedOn: Date;
    isShared: boolean;
}

export interface LibraryItem {
    id: string;
    name: string;
    itemType: LibraryItemType;
    modifiedBy: VSS_Common_Contracts.IdentityRef;
    modifiedOn: Date;
    description: string;
}

export enum LibraryItemType {
    VariableGroup,
    SecureFile,
    Library,
    OAuthConfiguration
}
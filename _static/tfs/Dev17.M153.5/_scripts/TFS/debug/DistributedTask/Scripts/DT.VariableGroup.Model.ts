import Q = require("q");
import VSS = require("VSS/VSS");
import Utils_String = require("VSS/Utils/String");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");

import DTContracts = require("TFS/DistributedTask/Contracts");
import Context = require("DistributedTask/Scripts/DT.Context");
import Types = require("DistributedTask/Scripts/DT.Types");
import Resources = require("DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask");
import { IDefinitionVariable } from "DistributedTaskControls/Variables/Common/Types";

export class VariableGroupType {
    static Vsts: string = "Vsts";
    static AzureKeyVault: string = "AzureKeyVault";

    public static isVstsVariableGroupType(type: string): boolean {
        return Utils_String.equals(type, VariableGroupType.Vsts, true);
    }

    public static isKeyVaultVariableGroupType(type: string): boolean {
        return Utils_String.equals(type, VariableGroupType.AzureKeyVault, true);
    }
}

export class AzureKeyVaultSecretTypes {
    static Secret: string = "Secret";
    static Certificate: string = "Certificate";
}

export class Variable implements IDefinitionVariable {
    public name: string;
    public value: string;
    public isSecret: boolean;
    public hasSecretValueBeenReset?: boolean;
    public hasVariableBeenUpdatedByUser?: boolean;

    constructor() {
        this.name = "";
        this.value = "";
    }
}

export class AzureKeyVaultVariable extends Variable {
    public enabled: boolean;
    public contentType: string;
    public expires: Date;

    constructor() {
        super();

        this.enabled = false;
        this.contentType = Utils_String.empty;
        this.expires = null;
    }
}

export class VariableGroup implements Types.VariableGroup {
    public id: number;
    public type: string;
    public name: string;
    public description: string;
    public providerData: DTContracts.VariableGroupProviderData;
    public createdBy: VSS_Common_Contracts.IdentityRef;
    public variables: any[];
    public modifiedBy: VSS_Common_Contracts.IdentityRef;
    public modifiedOn: Date;
    public isShared: boolean;

    public static convertToModel(variableGroupContract: DTContracts.VariableGroup): VariableGroup {
        let variableGroupModel: VariableGroup = new VariableGroup();
        variableGroupModel.id = variableGroupContract.id;
        variableGroupModel.type = variableGroupContract.type;
        variableGroupModel.name = variableGroupContract.name;
        variableGroupModel.description = variableGroupContract.description;
        variableGroupModel.providerData = variableGroupContract.providerData;
        variableGroupModel.createdBy = variableGroupContract.createdBy;
        variableGroupModel.modifiedBy = variableGroupContract.modifiedBy;
        variableGroupModel.modifiedOn = variableGroupContract.modifiedOn;
        variableGroupModel.isShared = variableGroupContract.isShared;
        variableGroupModel.variables = [];

        switch (variableGroupModel.type) {
            case VariableGroupType.Vsts:
                variableGroupModel.providerData = variableGroupContract.providerData as DTContracts.VariableGroupProviderData;
                let variable: Variable;
                for (let variableName in variableGroupContract.variables) {
                    variable = new Variable();
                    variable.name = variableName;
                    variable.value = variableGroupContract.variables[variableName].value;
                    variable.isSecret = variableGroupContract.variables[variableName].isSecret;
                    variableGroupModel.variables.push(variable);
                }

                break;
            case VariableGroupType.AzureKeyVault:
                // In UI code type information is not retained when a property type is base class and the actual value is derived class
                let providerData = variableGroupContract.providerData as DTContracts.AzureKeyVaultVariableGroupProviderData;
                variableGroupModel.providerData = {
                    lastRefreshedOn: new Date(providerData.lastRefreshedOn),
                    serviceEndpointId: providerData.serviceEndpointId,
                    vault: providerData.vault
                };
                let azkvVariable: AzureKeyVaultVariable;
                for (let variableName in variableGroupContract.variables) {
                    let azkvContractVariable = variableGroupContract.variables[variableName] as AzureKeyVaultVariable;

                    azkvVariable = new AzureKeyVaultVariable();
                    azkvVariable.name = variableName;
                    azkvVariable.value = azkvContractVariable.value;
                    azkvVariable.isSecret = azkvContractVariable.isSecret;
                    azkvVariable.enabled = azkvContractVariable.enabled;
                    azkvVariable.contentType = azkvContractVariable.contentType;
                    azkvVariable.expires = azkvContractVariable.expires;

                    variableGroupModel.variables.push(azkvVariable);
                }

                break;
            default:
                break;
        }

        if (variableGroupModel.variables.length === 0 && VariableGroupType.isVstsVariableGroupType(variableGroupModel.type)) {
            variableGroupModel.variables.push(new Variable());
        }

        return variableGroupModel;
    }

    public static convertToContract(variableGroupModel: VariableGroup): DTContracts.VariableGroup {
        let variables: { [key: string]: DTContracts.VariableValue; } = {};

        switch (variableGroupModel.type) {
            case VariableGroupType.Vsts:
                variableGroupModel.variables.forEach((variable: Variable) => {
                    if (!!variable.name) {
                        let value = (variable.value === "" && Boolean(variable.isSecret)) ? null : variable.value;
                        variables[variable.name.trim()] = { isSecret: variable.isSecret, value: value };
                    }
                });

                break;
            case VariableGroupType.AzureKeyVault:
                variableGroupModel.variables.forEach((variable: AzureKeyVaultVariable) => {
                    if (!!variable.name) {
                        let variableValue: DTContracts.AzureKeyVaultVariableValue = {
                            isSecret: true,
                            value: "",
                            enabled: variable.enabled,
                            contentType: variable.contentType,
                            expires: variable.expires
                        };
                        variables[variable.name.trim()] = variableValue;
                    }
                });
                
                break;
            default:
                break;
        }

        let variableGroupContract: DTContracts.VariableGroup = {
            id: variableGroupModel.id,
            type: variableGroupModel.type,
            name: !!variableGroupModel.name ? variableGroupModel.name.trim() : variableGroupModel.name,
            description: !!variableGroupModel.description ? variableGroupModel.description.trim() : variableGroupModel.description,
            providerData: variableGroupModel.providerData,
            createdBy: variableGroupModel.createdBy,
            createdOn: null,
            modifiedBy: variableGroupModel.modifiedBy,
            modifiedOn: variableGroupModel.modifiedOn,
            isShared: variableGroupModel.isShared,
            variables: variables
        };

        return variableGroupContract;
    }
}

export class VariableGroups {

    public beginAddVariableGroup(variableGroupModel: VariableGroup,shouldAuthorize: boolean): IPromise<VariableGroup> {
        let variableGroupContract = VariableGroup.convertToContract(variableGroupModel);
        return Context.serviceContext.variableGroupManager().beginAddVariableGroup(variableGroupContract,shouldAuthorize).then((variableGroup: DTContracts.VariableGroup) => {
            return VariableGroup.convertToModel(variableGroup);
        });
    }

    public beginUpdateVariableGroup(variableGroupModel: VariableGroup): IPromise<VariableGroup> {
        let variableGroupContract = VariableGroup.convertToContract(variableGroupModel);
        return Context.serviceContext.variableGroupManager().beginUpdateVariableGroup(variableGroupContract).then((variableGroup: DTContracts.VariableGroup) => {
            return VariableGroup.convertToModel(variableGroup);
        });
    }

    public beginGetVariableGroup(variableGroupId: number): IPromise<VariableGroup> {
        return Context.serviceContext.variableGroupManager().beginGetVariableGroup(variableGroupId).then((variableGroup: DTContracts.VariableGroup) => {
            if (variableGroup == null) {
                throw new Error(Utils_String.localeFormat(Resources.VariableGroupNotFound, variableGroupId));
            }
            else {
                return VariableGroup.convertToModel(variableGroup);
            }
        });
    }

    public beginDeleteVariableGroup(variableGroupId: number): IPromise<void> {
        return Context.serviceContext.variableGroupManager().beginDeleteVariableGroup(variableGroupId);
    }

    public beginGetVariableGroups(): IPromise<VariableGroup[]> {
        return Context.serviceContext.variableGroupManager().beginGetVariableGroups().then((variableGroups: DTContracts.VariableGroup[]) => {
            let variableGroupsModel = [];
            for (let i = 0; i < variableGroups.length; i++) {
                variableGroupsModel.push(VariableGroup.convertToModel(variableGroups[i]))
            }

            return variableGroupsModel;
        });
    }
}
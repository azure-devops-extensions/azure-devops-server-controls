import Q = require("q");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");

import DTContracts = require("TFS/DistributedTask/Contracts");
import Context = require("DistributedTask/Scripts/DT.Context");
import Types = require("DistributedTask/Scripts/DT.Types");

export class SecureFileProperty implements Types.ISecureFileProperty {
    public key: string;
    public value: string;

    constructor() {
        this.key = "";
        this.value = "";
    }
}

export class SecureFile implements Types.ISecureFile {
    public id: string;
    public name: string;
    public createdBy: VSS_Common_Contracts.IdentityRef;
    public properties: SecureFileProperty[];
    public modifiedBy: VSS_Common_Contracts.IdentityRef;
    public modifiedOn: Date;

    public static convertToModel(secureFileContract: DTContracts.SecureFile): SecureFile {
        let secureFileModel: SecureFile = new SecureFile();
        secureFileModel.id = secureFileContract.id;
        secureFileModel.name = secureFileContract.name;
        secureFileModel.createdBy = secureFileContract.createdBy;
        secureFileModel.modifiedBy = secureFileContract.modifiedBy;
        secureFileModel.modifiedOn = secureFileContract.modifiedOn;
        secureFileModel.properties = [];

        let property: SecureFileProperty;
        for (let key in secureFileContract.properties) {
            property = new SecureFileProperty();
            property.key = key;
            property.value = secureFileContract.properties[key];
            secureFileModel.properties.push(property);
        }

        return secureFileModel;
    }

    public static convertToContract(secureFileModel: SecureFile): DTContracts.SecureFile {
        let properties: { [key: string]: string } = {};

        if (secureFileModel.properties && secureFileModel.properties.length > 0) {
            secureFileModel.properties.forEach((property: SecureFileProperty) => {
                if (!!property.key) {
                    let value = !!property.value ? property.value.trim() : null;
                    properties[property.key.trim()] = value;
                }
            });
        }

        let secureFileContract: DTContracts.SecureFile = {
            id: secureFileModel.id,
            name: !!secureFileModel.name ? secureFileModel.name.trim() : secureFileModel.name,
            createdBy: secureFileModel.createdBy,
            createdOn: null,
            modifiedBy: secureFileModel.modifiedBy,
            modifiedOn: secureFileModel.modifiedOn,
            properties: properties,
            ticket: null
        };

        return secureFileContract;
    }
}

export class SecureFiles {

    public beginUploadSecureFile(secureFileModel: SecureFile, file: File): IPromise<SecureFile> {
        let secureFileContract = SecureFile.convertToContract(secureFileModel);
        return Context.serviceContext.secureFileManager().beginUploadSecureFile(secureFileContract, file).then((secureFile: DTContracts.SecureFile) => {
            return SecureFile.convertToModel(secureFile);
        });
    }

    public beginUpdateSecureFile(secureFileModel: SecureFile): IPromise<SecureFile> {
        let secureFileContract = SecureFile.convertToContract(secureFileModel);
        return Context.serviceContext.secureFileManager().beginUpdateSecureFile(secureFileContract).then((secureFile: DTContracts.SecureFile) => {
            return SecureFile.convertToModel(secureFile);
        });
    }

    public beginGetSecureFile(secureFileId: string): IPromise<SecureFile> {
        return Context.serviceContext.secureFileManager().beginGetSecureFile(secureFileId).then((secureFile: DTContracts.SecureFile) => {
            return SecureFile.convertToModel(secureFile);
        });
    }

    public beginDeleteSecureFile(secureFileId: string): IPromise<void> {
        return Context.serviceContext.secureFileManager().beginDeleteSecureFile(secureFileId);
    }

    public beginGetSecureFiles(): IPromise<SecureFile[]> {
        return Context.serviceContext.secureFileManager().beginGetSecureFiles().then((secureFiles: DTContracts.SecureFile[]) => {
            let secureFilesModel = [];
            for (let i = 0; i < secureFiles.length; i++) {
                secureFilesModel.push(SecureFile.convertToModel(secureFiles[i]))
            }

            return secureFilesModel;
        });
    }
}
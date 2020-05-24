import { Favorite } from "Favorites/Contracts";

import { ReleasesHubDataProviderKeys, AllDefinitionsContentKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { FolderUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/FolderUtils";
import { IReleaseDefinitionsResult, ReleaseDeployment } from "PipelineWorkflow/Scripts/Common/Types";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import * as Contribution_Services from "VSS/Contributions/Services";
import * as Service from "VSS/Service";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export interface IReleasesHubServiceData {
    releaseDefinitions: RMContracts.ReleaseDefinition[];
    folders: RMContracts.Folder[];
    favorites: Favorite[];
    activeDefinitions: IActiveDefinitionReference[];
    recentDefinitions: IActiveDefinitionReference[];
    hasAnyDefinition: boolean;
    continuationToken: string;
    resourcePath: string;
    flightAssignments: string[];
}

export enum ActiveDefinitionReferenceType {
    Unknown = 0,
    Favorite = 1,
    ApprovalPendingOnMe = 2,
    DeployedByMe = 3,
    ApprovalCompletedByMe = 4,
    Recent = 5,
    SearchedResult = 6
}

export interface IActiveDefinitionReference {
    // release definition Id & name
    id: number;
    name: string;
    path: string;
    definitionType: ActiveDefinitionReferenceType;

    // Last deployment on this definition. 
    lastDeployment: RMContracts.Deployment;

    // Pending approval on this definition
    pendingApproval: RMContracts.ReleaseApproval;

    favoriteId: string;

    definitionEnvironmentCurrentReleaseMap: IDictionaryNumberTo<number>;

    releasesList: RMContracts.Release[];

    releasesContinuationToken: number;

    environments: RMContracts.DefinitionEnvironmentReference[];
}

let ReleasesHubTypeInfo = {
    WebPageData: {
        fields: null as any
    },
    ActiveDefinitionReferenceType: {
        enumValues: {
            "unknown": 0,
            "favorite": 1,
            "approvalPendingOnMe": 2,
            "deployedByMe": 3,
            "approvalCompletedByMe": 4,
            "recent": 5,
            "searchedResult": 6
        }
    },
    ActiveDefinitions: {
        fields: null as any
    }
};

ReleasesHubTypeInfo.ActiveDefinitions.fields = {
    lastDeployment: {
        typeInfo: RMContracts.TypeInfo.Deployment
    },
    pendingApproval: {
        typeInfo: RMContracts.TypeInfo.ReleaseApproval
    },
    releasesList: {
        typeInfo: RMContracts.TypeInfo.Release,
        isArray: true
    },
    definitiontype: {
        enumType: ReleasesHubTypeInfo.ActiveDefinitionReferenceType
    },
    environments: {
        isArray: true
    }
};

ReleasesHubTypeInfo.WebPageData.fields = {
    releaseDefinitions: {
        isArray: true,
        typeInfo: RMContracts.TypeInfo.ReleaseDefinition
    },
    folders: {
        isArray: true,
        typeInfo: RMContracts.TypeInfo.Folder
    },
    favorites: {
        isArray: true
    },
    activeDefinitions: {
        isArray: true,
        typeInfo: ReleasesHubTypeInfo.ActiveDefinitions
    },
    recentDefinitions: {
        isArray: true,
        typeInfo: ReleasesHubTypeInfo.ActiveDefinitions
    },
};

export class ReleasesHubServiceDataHelper {

    public static getReleaseDefinitions(): RMContracts.ReleaseDefinition[] {
        return (this._data && this._data.releaseDefinitions) ? this._data.releaseDefinitions : null;
    }

    public static getFolders(): RMContracts.Folder[] {
        return (this._data && this._data.folders) ? this._data.folders : null;
    }

    public static getContinuationToken(): string {
        return (this._data && this._data.continuationToken) ? this._data.continuationToken : null;
    }

    public static getResourcePath(): string {
        if (this._data && this._data.resourcePath) {
            return this._data.resourcePath;
        }
        return Utils_String.empty;
    }

    public static getReleaseDefinitionResult(): IReleaseDefinitionsResult {
        return ({
            definitions: ReleasesHubServiceDataHelper.getReleaseDefinitions(),
            continuationToken: ReleasesHubServiceDataHelper.getContinuationToken()
        });
    }

    public static getFavorites(): Favorite[] {
        return (this._data && this._data.favorites) ? this._data.favorites : null;
    }

    public static getReleases(definitionId: number): {
        releases: RMContracts.Release[],
        continuationToken: number
    } {
        if (!this._data) {
            // In case the data hasn't been initialized, let us reinitialize. 
            this.initialize();
        }

        if (this._data) {
            const allDefinitions = [...(this._data.activeDefinitions || []), ...(this._data.recentDefinitions || [])];
            const definition = allDefinitions.find((def) => def.id === definitionId);
            if (definition && definition.releasesList && definition.releasesList.length) {
                const releasesResult = {
                    releases: definition.releasesList,
                    continuationToken: definition.releasesContinuationToken
                };

                definition.releasesList = null;
                definition.releasesContinuationToken = 0;
                return releasesResult;
            }
        }
    }

    public static getActiveDefinitions(): IActiveDefinitionReference[] {
        return (this._data && this._data.activeDefinitions) ? this._data.activeDefinitions : null;
    }

    public static getRecentDefinitions(): IActiveDefinitionReference[] {
        return (this._data && this._data.recentDefinitions) ? this._data.recentDefinitions : null;
    }

    public static getFavoriteDefinitionIds(): number[] {
        // When switching from All to Mine page, the favorite definitions data is null, but favorites data is present
        let ids: number[] = [];
        if (this._data && this._data.favorites) {
            for (const favorite of this._data.favorites) {
                ids.push(parseInt(favorite.artifactId));
            }
        }
        return ids;
    }

    public static updateReleaseDefinitions(releaseDefinitions: RMContracts.ReleaseDefinition[]): void {
        if (!!releaseDefinitions && this._data) {
            this._data.releaseDefinitions = releaseDefinitions;
        }
    }

    public static updateContinuationToken(continuationToken: string): void {
        if (this._data) {
            this._data.continuationToken = continuationToken;
        }
    }

    public static addFolder(folder: RMContracts.Folder, oldFolderPath: string): void {
        if (this._data) {
            if (this._data.folders) {
                Utils_Array.removeWhere(this._data.folders, (f) => { return Utils_String.equals(f.path, oldFolderPath, true); });
            }
            else {
                this._data.folders = [];
            }
            this._data.folders.push(folder);
        }
    }

    public static setFolders(folders: RMContracts.Folder[]): void {
        if (this._data) {
            this._data.folders = Utils_Array.clone(folders);
        }
    }

    public static setFavorites(favorites: Favorite[]): void {
        if (this._data && !!favorites) {
            this._data.favorites = Utils_Array.clone(favorites);
        }
        else if (this._data) {
            this._data.favorites = null;
        }
    }

    public static setActiveDefinitions(activeDefinitions: IActiveDefinitionReference[]): void {
        if (this._data) {
            this._data.activeDefinitions = Utils_Array.clone(activeDefinitions);
        }
    }

    public static setRecentDefinitions(recentDefinitions: IActiveDefinitionReference[]): void {
        if (this._data) {
            this._data.recentDefinitions = Utils_Array.clone(recentDefinitions);
        }
    }

    public static addFavorite(favorite: Favorite): void {
        if (this._data) {
            this._data.favorites = this._data.favorites ? this._data.favorites : <Favorite[]>[];
            Utils_Array.removeWhere(this._data.favorites, (f) => { return Utils_String.equals(f.id, favorite.id, true); });
            this._data.favorites.push(favorite);
        }
    }

    public static deleteFavorite(favoriteId: string, definitionId: number): void {
        if (this._data && this._data.favorites) {
            Utils_Array.removeWhere(this._data.favorites, (f) => { return Utils_String.equals(f.id, favoriteId, true); });
        }
    }

    public static updateDefinition(updatedDefinition: RMContracts.ReleaseDefinition): void {
        if (this._data && this._data.releaseDefinitions && this._data.releaseDefinitions.length > 0) {
            let indexToUpdate: number = Utils_Array.findIndex(this._data.releaseDefinitions, (definition: RMContracts.ReleaseDefinition) => {
                return (definition.id === updatedDefinition.id);
            });
            if (indexToUpdate > -1) {
                this._data.releaseDefinitions[indexToUpdate] = updatedDefinition;
            }
        }
    }

    public static deleteDefinition(definitionId: number): void {
        if (this._data && this._data.releaseDefinitions && this._data.releaseDefinitions.length > 0) {
            let indexToDelete: number = Utils_Array.findIndex(this._data.releaseDefinitions, (definition: RMContracts.ReleaseDefinition) => {
                return (definition.id === definitionId);
            });
            if (indexToDelete > -1) {
                this._data.releaseDefinitions.splice(indexToDelete, 1);
            }
        }
    }

    public static updateDataOnDeleteFolder(deletedFolderPath: string): void {
        if (this._data) {
            if (this._data.folders && this._data.folders.length > 0) {
                const folders: RMContracts.Folder[] = this._data.folders;
                for (let i = 0; i < folders.length; i++) {
                    const folderPathToDelete: string = FolderUtils.createNewChildPathForUpdatedParentFolderPath(deletedFolderPath, null, folders[i].path);
                    if (folderPathToDelete !== Utils_String.empty) {
                        this._data.folders.splice(i, 1);
                    }
                }
            }
            if (this._data.releaseDefinitions && this._data.releaseDefinitions.length > 0) {
                const definitions: RMContracts.ReleaseDefinition[] = this._data.releaseDefinitions;
                for (let i = 0; i < definitions.length; i++) {
                    const definitionPathToDelete: string = FolderUtils.createNewChildPathForUpdatedParentFolderPath(deletedFolderPath, null, definitions[i].path);
                    if (definitionPathToDelete !== Utils_String.empty) {
                        this._data.releaseDefinitions.splice(i, 1);
                    }
                }
            }
        }
    }

    public static updateDataOnRenameFolder(oldPath: string, newPath: string): void {
        if (this._data) {
            if (this._data.folders && this._data.folders.length > 0) {
                const folders: RMContracts.Folder[] = this._data.folders;
                for (let i = 0; i < folders.length; i++) {
                    const folderPathToUpdate: string = FolderUtils.createNewChildPathForUpdatedParentFolderPath(oldPath, newPath, folders[i].path);
                    if (folderPathToUpdate !== Utils_String.empty) {
                        this._data.folders[i].path = folderPathToUpdate;
                    }
                }
            }
            if (this._data.releaseDefinitions && this._data.releaseDefinitions.length > 0) {
                const definitions: RMContracts.ReleaseDefinition[] = this._data.releaseDefinitions;
                for (let i = 0; i < definitions.length; i++) {
                    const definitionPathToUpdate: string = FolderUtils.createNewChildPathForUpdatedParentFolderPath(oldPath, newPath, definitions[i].path);
                    // If the parent of current definition matches the renamed folder then update the parent path
                    if (definitionPathToUpdate !== Utils_String.empty) {
                        this._data.releaseDefinitions[i].path = definitionPathToUpdate;
                    }
                }
            }
        }
    }

    public static areAnyReleaseDefinitionsPresent(): boolean {
        return this._data.hasAnyDefinition !== false; // Treat undefined value as true
    }

    public static setLastDeploymentForDefinition(deployment: ReleaseDeployment) {
        this._definitionIdToLastDeploymentMap[deployment.releaseDefinition.id] = deployment;
    }

    public static getLastDeploymentForDefinition(definitionId: number) {
        if (this._definitionIdToLastDeploymentMap && this._definitionIdToLastDeploymentMap.hasOwnProperty(definitionId)) {
            return this._definitionIdToLastDeploymentMap[definitionId];
        }
        else {
            return null;
        }
    }

    public static getFlightAssignments(): string[] {
        return this._data.flightAssignments;
    }

    public static isFlightAssigned(flightName: string): boolean {
        return this._data && this._data.flightAssignments.findIndex(x => Utils_String.equals(x, flightName, true)) > -1;
    }

    public static initialize(): void {
        this._data = Service.getService(Contribution_Services.WebPageDataService).getPageData<IReleasesHubServiceData>(
            ReleasesHubDataProviderKeys.RELEASES_HUB_DATA_PROVIDER_ID,
            ReleasesHubTypeInfo.WebPageData);
    }

    private static _data: IReleasesHubServiceData;
    private static _definitionIdToLastDeploymentMap: IDictionaryNumberTo<ReleaseDeployment> = {};
}

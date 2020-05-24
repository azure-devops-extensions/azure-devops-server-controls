import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import Endpoint_Actions = require("Admin/Scripts/ServiceEndpoint/Actions/EndpointActions");
import Model = require("Admin/Scripts/ServiceEndpoint/EnpointSharedProjectsData")
import Contracts = require("TFS/DistributedTask/Contracts");
import * as Utils_String from "VSS/Utils/String";

export class EnpointSharedProjectStore extends StoreCommonBase.StoreBase {

    public static getKey(): string {
        return this.EnpointSharedProjectStoreKey;
    }

    public initialize(): void {
        Endpoint_Actions.sharedEndpointProjectsData.addListener(this.loadSharedProjectsData, this);
        Endpoint_Actions.updateSharedProjects.addListener(this.updateSharedProjects, this);
        Endpoint_Actions.removedSharedProject.addListener(this.removedSharedProject, this);
        Endpoint_Actions.addedSharedProject.addListener(this.addedSharedProject, this);
        Endpoint_Actions.updateError.addListener(this.updateError, this);
    }

    protected disposeInternal(): void {
        Endpoint_Actions.sharedEndpointProjectsData.removeListener(this.loadSharedProjectsData);
        Endpoint_Actions.updateSharedProjects.removeListener(this.updateSharedProjects);
        Endpoint_Actions.removedSharedProject.removeListener(this.removedSharedProject);
        Endpoint_Actions.addedSharedProject.removeListener(this.addedSharedProject);
        Endpoint_Actions.updateError.removeListener(this.updateError);
    }

    public loadSharedProjectsData(endpointSharedProjectData: Model.EnpointSharedProjectsData) {
        endpointSharedProjectData.allProjects = this._arrangeAllProjectList(endpointSharedProjectData.allProjects, endpointSharedProjectData.sharedProjects);
        this._originaData = endpointSharedProjectData;
        this._updatedData = Object.assign({}, endpointSharedProjectData);
        this.emitChanged();
    }

    public updateSharedProjects(projects: Contracts.ProjectReference[]) {
        this._updatedData.sharedProjects = projects;
        this.emitChanged();
    }

    public removedSharedProject(project: Contracts.ProjectReference) {
        for (let i = 0; i < this._originaData.sharedProjects.length; i++) {
            if (this._originaData.sharedProjects[i].name === project.name) {
                this._originaData.sharedProjects.splice(i, 1);
                break;
            }
        }

        this.emitChanged();
    }

    public addedSharedProject(project: Contracts.ProjectReference) {
        this._originaData.sharedProjects.push(project);
        this.emitChanged();
    }

    public updateError(errorMessage: string) {
        if (errorMessage != Utils_String.empty) {
            this._errorMessage = Utils_String.localeFormat("{0}\n{1}", this._errorMessage, errorMessage);
        } else {
            this._errorMessage = "";
        }

        this.emitChanged();
    }

    public getSharedProjectsData(): Model.EnpointSharedProjectsData {
        return this._updatedData;
    }

    public getOriginallySharedProjects(): Contracts.ProjectReference[] {
        return this._originaData.sharedProjects;
    }

    public getErrorMessage(): string {
        return this._errorMessage;
    }

    public getNewSharedProjects(): Contracts.ProjectReference[] {
        let newSharedProjects: Contracts.ProjectReference[] = [];

        for (let i = 0; i < this._updatedData.sharedProjects.length; i++) {
            let projectFound: boolean = false;
            for (let j = 0; j < this._originaData.sharedProjects.length; j++) {
                if (this._originaData.sharedProjects[j].name === this._updatedData.sharedProjects[i].name) {
                    projectFound = true;
                    break;
                }
            }

            if (!projectFound) {
                newSharedProjects.push(this._updatedData.sharedProjects[i]);
            }
        }

        return newSharedProjects;
    }

    public getDeletedSharedProjects(): Contracts.ProjectReference[] {
        let deletedSharedProjects: Contracts.ProjectReference[] = [];
        for (let i = 0; i < this._originaData.sharedProjects.length; i++) {
            let projectFound: boolean = false;
            for (let j = 0; j < this._updatedData.sharedProjects.length; j++) {
                if (this._updatedData.sharedProjects[j].name === this._originaData.sharedProjects[i].name) {
                    projectFound = true;
                    break;
                }
            }

            if (!projectFound) {
                deletedSharedProjects.push(this._originaData.sharedProjects[i]);
            }
        }

        return deletedSharedProjects;
    }


    public isDirty(): boolean {
        if (!this._originaData || !this._updatedData) {
            return false;
        }

        if (this._originaData.sharedProjects.length != this._updatedData.sharedProjects.length) {
            return true;
        }

        this._originaData.sharedProjects.sort();
        this._updatedData.sharedProjects.sort();

        for (let i = 0; i < this._originaData.sharedProjects.length; i++) {
            if (this._originaData.sharedProjects[i].id !== this._updatedData.sharedProjects[i].id) {
                return true;
            }
        }

        return false;
    }

    private _arrangeAllProjectList(allProjects: Contracts.ProjectReference[], sharedProjects: Contracts.ProjectReference[]): Contracts.ProjectReference[] {

        function projectReferenceSorter(a: Contracts.ProjectReference, b: Contracts.ProjectReference): number {
            var x = a.name.toLowerCase();
            var y = b.name.toLowerCase();
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        }

        allProjects.sort(projectReferenceSorter);
        sharedProjects.sort(projectReferenceSorter);

        let arrangedAllProjects : Contracts.ProjectReference[] = [];
        let sharedProjectsMap = [];
        sharedProjects.forEach(sharedProject => {
            arrangedAllProjects .push(sharedProject)
            sharedProjectsMap[sharedProject.name] = true;
        });

        allProjects.forEach(project => {
            if (!sharedProjectsMap[project.name]) {
                arrangedAllProjects .push(project);
            }
        });

        return arrangedAllProjects ;
    }

    private _originaData: Model.EnpointSharedProjectsData;
    private _updatedData: Model.EnpointSharedProjectsData;
    private _errorMessage: string = "";
    private static EnpointSharedProjectStoreKey: string = "EnpointSharedProjectStoreKey";
}
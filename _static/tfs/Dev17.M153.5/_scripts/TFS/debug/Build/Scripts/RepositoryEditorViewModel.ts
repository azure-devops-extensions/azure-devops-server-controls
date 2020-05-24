/// <reference path='Interfaces.d.ts' />

import ko = require("knockout");
import Q = require("q");

import {RepositoryTypes} from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");

import BuildContracts = require("TFS/Build/Contracts");
import DTAgent_Client = require("TFS/DistributedTask/TaskAgentRestClient");
import DTContracts = require("TFS/DistributedTask/Contracts");
import ServiceEndpoint_Client = require("TFS/ServiceEndpoint/ServiceEndpointRestClient");
import ServiceEndpointContracts = require("TFS/ServiceEndpoint/Contracts");

import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");

import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");


/**
 * Base class for repository editor models
 */
export class RepositoryEditorViewModel extends TaskModels.ChangeTrackerModel {
    private _url: string;
    private _name: string;
    private _clean: string;
    private _previousName: string;

    /**
     * Id of the repository.
     */
    public id: string;

    /**
     * The repository url
     */
    public url: KnockoutObservable<string>;

    /**
     * Textbox for name
     */
    public name: KnockoutObservable<string>;

    /**
     * The CSS class for the icon
     */
    public icon: KnockoutObservable<string>;

    /**
     * Combo box for clean
     * This should show "true" and "false" in the dropdown and allow the user to enter a variable reference
     */
    public clean: KnockoutObservable<string>;

    /**
     * The repository type
     */
    public type: KnockoutObservable<string>;

    constructor(repository: BuildContracts.BuildRepository) {
        super();
        this.type(repository ? repository.type : RepositoryTypes.Git);
        this.update(repository);
    }

    /**
     * Update the viewmodel using the specified repository contract.
     *
     * @param repository Contract used to populate the viewmodel.
     */
    public update(repository: BuildContracts.BuildRepository): void {
        this.id = repository.id || "";

        this._url = repository.url || "";
        this.url(this._url);

        this._name = repository.name || "";
        this.name(this._name);

        this._clean = repository.clean;
        if (this._clean == "undefined") {
            this._clean = "false";
        }
        this.clean(this._clean);
    }

    /**
     * See base.
     */
    _initializeObservables(): void {
        super._initializeObservables();

        this._name = "";
        this.name = ko.observable(this._name);

        this._url = "";
        this.url = ko.observable(this._url);

        this._clean = "false";
        this.clean = ko.observable(this._clean);

        this.type = ko.observable(RepositoryTypes.Git);
        this.icon = ko.observable(this.getIconName());
    }

    /**
     * Gets the icon of this viewmodel.
     */
    public getIconName(): string {
        return "icon-git-logo";
    }

    /**
     * Gets the template name of this viewmodel.
     */
    public getTemplateName(): string {
        return "";
    }

    /**
     * Extracts a data contract from the viewmodel.
     */
    public getValue(): BuildContracts.BuildRepository {
        return null;
    }

    /**
     * Marks the repository clean
     */
    public setClean(): void {
        this._url = this.url();
        this._name = this.name();
        this._clean = this.clean();
    }

    /**
     * Gets the default branch filter
     */
    public getDefaultBranchFilter(): string {
        return "";
    }

    /**
     * Gets the default path filter
     */
    public getDefaultPathFilter(): string {
        return "";
    }

    public normalizeBranchFilters(filters: string[]): string[] {
        let branchFilters = filters || [];
        if (branchFilters.length === 0 || (branchFilters.length === 1 && Utils_Array.contains(branchFilters, "+undefined", Utils_String.ignoreCaseComparer))) {
            branchFilters = [];
            if (this.ciTriggerRequiresBranchFilters()) {
                branchFilters.push("+" + this.getDefaultBranchFilter());
            }
        }

        return branchFilters;
    }

    public normalizePathFilters(filters: string[]): string[] {
        let pathFilters = filters || [];
        if (pathFilters.length === 0 || (pathFilters.length === 1 && Utils_Array.contains(pathFilters, "+undefined", Utils_String.ignoreCaseComparer))) {
            pathFilters = [];
            if (this.ciTriggerRequiresPathFilters()) {
                pathFilters.push("+" + this.getDefaultPathFilter());
            }
        }

        return pathFilters;
    }

    public ciTriggerRequiresBranchFilters(): boolean {
        return false;
    }

    public ciTriggerRequiresPathFilters(): boolean {
        return false;
    }

    public getDefaultScheduledBranch(): string {
        return "";
    }

    /**
     * Shows a path picker dialog
     */
    public showPathDialog(initialValue: string, callback: (selectedValue: ISelectedPathNode) => void) {
        callback(<ISelectedPathNode>{ path: initialValue, isFolder: false });
    }

    public fetchRepositoryFileContent(path: string, callback: (content: any) => void, errorCallback: (error: any) => void) {
        if ($.isFunction(errorCallback)) {
            var errorMessage = Utils_String.format(BuildResources.RepositoryNotSupportedForFileContent, this._name);
            errorCallback(errorMessage);
        }
    }

    /**
     * Indicates whether the model supports a path picker dialog
     */
    public supportsPathDialog(): boolean {
        return false;
    }

    /**
     * Gets the type of editor control for this model
     */
    public getEditorControlType(): any {
        return null;
    }

    /**
     * Indicates whether the repository is dirty
     */
    _isDirty(): boolean {
        return Utils_String.localeIgnoreCaseComparer(this._name, this.name()) !== 0 ||
            Utils_String.localeIgnoreCaseComparer(this._url, this.url()) !== 0 ||
            Utils_String.localeIgnoreCaseComparer(this._clean, this.clean()) !== 0;
    }
}

// This ensures that even if the user doesn't have permissions for the connection already saved in the definition
// it gets that saved connection back and pushes to connections array, so that definition would be valid and further changes can be updated
export function getRepositoryConnection(connections: ServiceEndpointContracts.ServiceEndpoint[], projectId: string, selectedConnectionId: string, serviceEndpointClient: ServiceEndpoint_Client.ServiceEndpointHttpClient): IPromise < ServiceEndpointContracts.ServiceEndpoint > {
    let currentConnection = null;
    if(selectedConnectionId) {
        $.each(connections, (i: number, connection: ServiceEndpointContracts.ServiceEndpoint) => {
            if (connection.id == selectedConnectionId) {
                currentConnection = connection;
                return false; // break;
            }
        });
    }
        if (!currentConnection) {
    if (selectedConnectionId) {
        // Let's get the already selected connection back
        return serviceEndpointClient.getServiceEndpointDetails(projectId, selectedConnectionId).then((connection) => {
            if (connection) {
                connections.push(connection);
                Utils_Array.unique(connections, (a: ServiceEndpointContracts.ServiceEndpoint, b: ServiceEndpointContracts.ServiceEndpoint) => {
                    return Utils_String.defaultComparer(a.id, b.id);
                });
            }
            return Q(connection);
        });
    }
    else {
        currentConnection = connections && connections.length > 0 ? connections[0] : null;
    }
}
return Q(currentConnection);
    }

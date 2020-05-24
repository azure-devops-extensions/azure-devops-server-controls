/// <reference types="knockout" />
/// <reference types="jquery" />

import VSS = require("VSS/VSS");

import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";

export class VersionControlViewModel {
    public repositoryContext: RepositoryContext;
    public parent: VersionControlViewModel;
    public options: any;

    constructor(repositoryContext: RepositoryContext, parent: VersionControlViewModel, options?) {
        this.repositoryContext = repositoryContext;
        this.parent = parent;
        this.options = options;
    }
}

VSS.tfsModuleLoaded("TFS.VersionControl.ViewModel", exports);

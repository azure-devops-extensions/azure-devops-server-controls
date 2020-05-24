

import ko = require("knockout");

import BaseDefinitionModel = require("Build/Scripts/BaseDefinitionModel");
import VariablesListViewModel = require("Build/Scripts/VariablesListViewModel");

import BuildContracts = require("TFS/Build/Contracts");

/**
 * View model for build definitions
 */
export class BuildDefinitionModel extends BaseDefinitionModel.BaseDefinitionModel {
    /**
     * The project id
     */
    public projectId: KnockoutObservable<string> = ko.observable("");

    /**
     * The author
     */
    public authoredBy: KnockoutObservable<any> = ko.observable();

    /**
     * The parent definition id
     */
    public parentDefinitionId: KnockoutObservable<number> = ko.observable<number>();

    /**
     * The primary repository
     */
    public repository: KnockoutObservable<BuildContracts.BuildRepository> = ko.observable(null);

    /**
     * The revision number
     */
    public revision: KnockoutObservable<number> = ko.observable<number>();

    /**
     * The variables
     */
    public variables = new VariablesListViewModel.VariablesListViewModel();

    /**
     * Creates a model from a data contract
     * @param definition The data contract
     */
    constructor(definition: BuildContracts.BuildDefinition) {
        super(definition);

        this._initializeObservables();

        this.update(definition);
    }

    /**
     * Gets the data contract that the model was last updated with
     */
    public getOriginalDefinition(): BuildContracts.BuildDefinition {
        return <BuildContracts.BuildDefinition>this.value;
    }

    /**
     * Updates the model from a data contract
     * @param definition The data contract
     */
    public update(definition: BuildContracts.BuildDefinition) {
        super.update(definition);

        this.projectId(definition.project.id);
        this.authoredBy(definition.authoredBy);
        this.revision(definition.revision);
        this.parentDefinitionId(!!definition.draftOf ? definition.draftOf.id : null);

        this.repository(definition.repository);

        this.variables.update(definition.variables, definition.id);

        this._setFullViewModel(!!definition.process);
    }

    /**
     * Overriding from the base
     */
    public isDescendent(definitionId: number): boolean {
        return this.parentDefinitionId() === definitionId;
    }

    public getParentDefinitionId(): number {
        return this.parentDefinitionId();
    }

    public _initializeObservables() {
    }
}

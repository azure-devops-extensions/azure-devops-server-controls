

import ko = require("knockout");

import BaseDefinitionModel = require("Build/Scripts/BaseDefinitionModel");

import BuildContracts = require("TFS/Build/Contracts");

/**
 * View model for XAML definitions
 */
export class XamlDefinitionModel extends BaseDefinitionModel.BaseDefinitionModel {
    /**
     * The default drop location for the definition
     */
    public dropFolder: KnockoutObservable<string> = ko.observable("");

    /**
     * The URI of the default build controller for the definition
     */
    public controllerUri: KnockoutObservable<string> = ko.observable("");

    /**
     * The default build arguments for the definition
     */
    public buildArgs: KnockoutObservable<string> = ko.observable("");

    /**
     * Creates a model from a data contract
     * @param xamlDefinition The data contract
     */
    constructor(xamlDefinition: BuildContracts.XamlBuildDefinition) {
        super(xamlDefinition);

        this.update(xamlDefinition);
    }

    /**
     * Updates the model from a data contract
     * @param xamlDefinition The data contract
     */
    public update(xamlDefinition: BuildContracts.XamlBuildDefinition) {
        super.update(xamlDefinition);

        this.dropFolder(xamlDefinition.defaultDropLocation);
        this.buildArgs(xamlDefinition.buildArgs);
        this.controllerUri(xamlDefinition.controller ? xamlDefinition.controller.uri : "");

        // links are only included with full definitions
        this._setFullViewModel(!!xamlDefinition._links);
    }
}

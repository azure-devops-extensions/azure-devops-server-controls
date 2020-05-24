

import ko = require("knockout");

import BuildContracts = require("TFS/Build/Contracts");

/**
 * Base class for definition view models
 */
export class BaseDefinitionModel {
    /**
     * The definition type
     */
    public definitionType: KnockoutObservable<BuildContracts.DefinitionType> = ko.observable(null);

    /**
     * The id
     */
    public id: KnockoutObservable<number> = ko.observable<number>();

    /**
     * The name
     */
    public name: KnockoutObservable<string> = ko.observable("");

    /**
     * The path
     */
    public path: string = "\\";

    /**
     * The description
     */
    public description: KnockoutObservable<string> = ko.observable("");

    /**
     * The definition uri
     */
    public uri: KnockoutObservable<string> = ko.observable("");

    /**
     * The definition queue status
     */
    public queueStatus: KnockoutObservable<BuildContracts.DefinitionQueueStatus> = ko.observable(BuildContracts.DefinitionQueueStatus.Enabled);

    /**
     * The data contract
     */
    public value: BuildContracts.DefinitionReference;
    private _fullViewModel: boolean = false;

    /**
     * Creates a new model from a data contract
     * @param value The data contract
     */
    constructor(value: BuildContracts.DefinitionReference) {
        this._update(value);
    }

    /**
     * Indicates whether the model represents a reference or a full definition
     */
    public isFullViewModel(): boolean {
        return this._fullViewModel;
    }

    /**
     * Updates the model from a data contract
     * @param newValue The data contract
     */
    public update(newValue: BuildContracts.DefinitionReference) {
        this._update(newValue);
    }

    protected _setFullViewModel(newValue: boolean) {
        this._fullViewModel = newValue;
    }

    public isDescendent(definitionId: number): boolean {
        return false;
    }

    public getParentDefinitionId(): number {
        return -1;
    }

    private _update(newValue: BuildContracts.DefinitionReference) {
        this.value = newValue;

        this.definitionType(newValue.type);
        this.id(newValue.id);
        var name = newValue.name;
        if (name) {
            name = name.trim();
        }
        // make sure path is set before name, so that anything reacting to name would get updated path
        this.path = newValue.path;
        this.name(name);
        this.description((<any>newValue).description);
        this.uri(newValue.uri);
        this.queueStatus(newValue.queueStatus);
    }
}

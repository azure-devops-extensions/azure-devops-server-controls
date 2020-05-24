

import ko = require("knockout");

import BuildContracts = require("TFS/Build/Contracts");

/**
 * View model for validation results
 */
export class BuildRequestValidationResult {
    private _validationResult: BuildContracts.BuildRequestValidationResult;

    /**
     * The type of issue
     */
    public type: KnockoutObservable<BuildContracts.ValidationResult> = ko.observable(null);

    /**
     * The issue detail
     */
    public message: KnockoutObservable<string> = ko.observable("");

    /**
     * The icon css class
     */
    public iconCssClass: KnockoutComputed<string>;

    /**
     * Creates a view model from a data contract
     * @param validationResult The data contract
     */
    constructor(validationResult: BuildContracts.BuildRequestValidationResult) {
        this.update(validationResult);

        this.iconCssClass = ko.computed(() => {
            switch (this.type()) {
                case BuildContracts.ValidationResult.Warning:
                    return "build-warning-icon-color bowtie-icon bowtie-status-warning";
                case BuildContracts.ValidationResult.Error:
                default:
                    return "build-failure-icon-color bowtie-icon bowtie-edit-delete";
            }
        });
    }

    /**
     * Updates the view model from a data contract
     * @param validationResult The data contract
     */
    public update(validationResult: BuildContracts.BuildRequestValidationResult) {
        this._validationResult = validationResult;

        this.type(validationResult.result);
        this.message(validationResult.message);
    }
}

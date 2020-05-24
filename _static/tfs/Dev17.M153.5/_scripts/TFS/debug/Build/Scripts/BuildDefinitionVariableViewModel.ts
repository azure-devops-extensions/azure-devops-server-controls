

import ko = require("knockout");

import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import BuildVariables = require("Build/Scripts/Common.Variables");

import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");

import Utils_String = require("VSS/Utils/String");

/**
 * View model for build definition variables
 */
export class BuildDefinitionVariableViewModel extends TaskModels.ChangeTrackerModel {
    private _variable: BuildVariables.IDefinitionVariable;

    /**
     * The name
     */
    public name: KnockoutObservable<string>;

    /**
     * The aria label for variable name input
     */
    public inputAriaLabel: KnockoutComputed<string>;

    /**
    * The aria label for input boxes for this variable
    */
    public inputValueAriaLabel: KnockoutComputed<string>;
    

    /**
     * The value
     */
    public value: KnockoutObservable<string>;

    /**
     * Indicates whether the value can be overridden at queue time
     */
    public allowOverride: KnockoutObservable<boolean>;

    /**
     * Specifies whether this variable is implicit or not
     */
    public isImplicit: boolean;

    /**
     * Specifies whether this variable represents a secret
     */
    public isSecret: KnockoutObservable<boolean> = ko.observable(false);

    /**
     * The type of the input control
     */
    public inputType: KnockoutComputed<string>;

    /**
     * Specifies whether to show the secret placeholder
     */
    public showSecretPlaceholder: KnockoutComputed<boolean>;

    private _isSecretUpdated: KnockoutObservable<boolean> = ko.observable(false);

    /**
     * Creates a new model
     * @param name The name
     * @param value The value
     * @param allowOverride Whether the value can be overridden at queue time
     */
    constructor(variable: BuildVariables.IDefinitionVariable, isImplicit: boolean = true) {
        super();

        this._variable = variable;
        this.name(variable.name || "");
        this.value(variable.value || "");
        this.allowOverride(variable.allowOverride === true);
        this.isSecret(variable.isSecret);

        this.isImplicit = isImplicit === true;

        var secretSubscription = this.isSecret.subscribe(() => {
            this._isSecretUpdated(true);
        });
        this._addDisposable(secretSubscription);

        this.inputType = ko.computed(() => {
            return this.isSecret() ? "password" : "text";
        });
        this._addDisposable(this.inputType);

        this.showSecretPlaceholder = ko.computed(() => {
            var isSecret = this.isSecret();
            var isSecretUpdated = this._isSecretUpdated();

            return isSecret && !isSecretUpdated;
        });
        this._addDisposable(this.showSecretPlaceholder);

        this.inputValueAriaLabel = ko.computed({
            read: () => {
                return Utils_String.format("{0} {1}", this.name(), BuildResources.InputValueText);
            }
        });
        this._addDisposable(this.inputValueAriaLabel);

        this.inputAriaLabel = ko.computed({
            read: () => {
                return Utils_String.format("{0} {1}", this.name(), BuildResources.VariableNameText);
            }
        });
        this._addDisposable(this.inputAriaLabel);
    }

    _initializeObservables(): void {
        super._initializeObservables();
        this.name = ko.observable("");
        this.value = ko.observable("");
        this.allowOverride = ko.observable(false);
    }

    _isDirty(): boolean {
        if (!this._variable || this.isImplicit) {
            return false;
        }

        var isSecret = this.isSecret();
        var isSecretUpdated = this._isSecretUpdated();

        if (Utils_String.localeComparer(this.name(), this._variable.name) !== 0 ||
            (Utils_String.localeComparer(this.value(), this._variable.value) !== 0 && !(isSecret && !isSecretUpdated)) ||
            this.allowOverride() !== this._variable.allowOverride ||
            this._isSecretUpdated()) {
            return true;
        }

        return false;
    }

    public clone(): BuildDefinitionVariableViewModel {
        return new BuildDefinitionVariableViewModel(this.getValue(), this.isImplicit);
    }

    public setClean(): void {
        super.setClean();

        // Set original values to current
        this._variable = this.getValue();
        this._isSecretUpdated(false);
    }

    public getValue(): BuildVariables.IDefinitionVariable {
        var isSecret: boolean = this.isSecret();
        var value: string = this.value();
        var isSecretUpdated: boolean = this._isSecretUpdated();

        if (isSecret && !isSecretUpdated) {
            value = undefined;
        }

        return {
            name: this.name(),
            value: value,
            allowOverride: this.allowOverride(),
            isSecret: isSecret
        };
    }

    _isInvalid(): boolean {
        return this.isNameInvalid();
    }

    public isNameInvalid(): boolean {
        return this.name().trim().length == 0;
    }

    public onSecretClick() {
        if (!this.isImplicit) {
            this.isSecret(!this.isSecret());
        }
    }
}

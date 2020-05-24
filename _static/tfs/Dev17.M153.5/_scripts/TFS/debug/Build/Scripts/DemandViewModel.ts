

import ko = require("knockout");

import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");

import Utils_String = require("VSS/Utils/String");

/**
 * Types of demands
 */
export class DemandType {
    public static Exists: string = "exists";
    public static Equals: string = "equals";
}

/**
 * Viewmodel for a task demand
 */
export class DemandViewModel extends TaskModels.ChangeTrackerModel {
    private _demand: string;

    // name opcode value
    private static _demandRegex: RegExp = /^([^\s]+)(\s+\-([^\s]+)\s+(.*))?/;

    /**
     * The name of the required capability.
     */
    public name: KnockoutObservable<string> = ko.observable("");

    /**
    * The aria label for variable name input
    */
    public inputAriaLabel: KnockoutComputed<string>;

    /**
    * The aria label for input boxes for this variable
    */
    public inputValueAriaLabel: KnockoutComputed<string>;

    /**
     * The value of the demand. If type is "equals", the capability value must match this to satisfy the demand.
     */
    public value: KnockoutObservable<string> = ko.observable("");

    /**
     * The type of the demand.
     */
    public type: KnockoutObservable<string> = ko.observable(DemandType.Exists);

    /**
     * Whether or not the value is visible.
     */
    public valueVisible: KnockoutComputed<boolean>;

    /**
     * Constructs a new view model
     * @param serializedDemand The serialized demand
     */
    constructor(serializedDemand: string) {
        super();
        this._demand = serializedDemand;
        this._update(serializedDemand);

        this.valueVisible = ko.computed({
            read: () => {
                return this.type() == DemandType.Equals;
            }
        });

        this.inputValueAriaLabel = ko.computed({
            read: () => {
                return Utils_String.format("{0} {1}", this.name(), BuildResources.InputValueText);
            }
        });
        this._addDisposable(this.inputValueAriaLabel);

        this.inputAriaLabel = ko.computed({
            read: () => {
                return Utils_String.format("{0} {1}", this.name(), BuildResources.DemandNameText);
            }
        });
        this._addDisposable(this.inputAriaLabel);
    }

    private _update(serializedDemand: string): void {
        if (serializedDemand) {
            /*  match[0] is the whole string
                match[1] is the name of the demand
                match[2] is the whole operator clause
                match[3] is the operator
                match[4] is the value
            */
            var match: RegExpExecArray = DemandViewModel._demandRegex.exec(serializedDemand);
            if (match) {
                this.name(match[1] || "");
                this.value(match[4] || "");
                if (Utils_String.localeIgnoreCaseComparer(DemandType.Equals, match[3]) === 0) {
                    this.type(DemandType.Equals);
                }
                else {
                    this.type(DemandType.Exists);
                }
            }
        }
    }

    public revert(): void {
        this._update(this._demand);
    }

    /**
     * Extracts the data contract from the viewmodel
     */
    public getValue(): string {
        var name = this.name(),
            type = this.type(),
            value = this.value();

        switch (type) {
            case DemandType.Equals:
                return Utils_String.localeFormat("{0} -equals {1}", name, value);
            case DemandType.Exists:
                return name;
            default:
                return "";
        }
    }

    _initializeObservables(): void {
        super._initializeObservables();
        this._demand = "";
        this.name = ko.observable("");
        this.type = ko.observable("");
        this.value = ko.observable("");
    }

    _isDirty(): boolean {
        return Utils_String.localeIgnoreCaseComparer(this._demand, this.getValue()) !== 0;
    }

    _isInvalid(): boolean {
        return this.isNameInvalid() || this.isValueInvalid();
    }

    public isNameInvalid(): boolean {
        var name = this.name().trim();
        return name.length == 0 ||
            name.indexOf(" ") >= 0; // spaces aren't allowed
    }

    public isValueInvalid(): boolean {
        if (this.type() == DemandType.Equals) {
            return this.value().trim().length == 0;
        }

        return false;
    }
}

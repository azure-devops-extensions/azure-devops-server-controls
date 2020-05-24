

import ko = require("knockout");

import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");

import Utils_String = require("VSS/Utils/String");

export class OptionInputViewModel extends TaskModels.ChangeTrackerModel {
    public key: KnockoutObservable<string> = ko.observable("");
    public value: KnockoutObservable<string> = ko.observable("");

    private _key: string = "";
    private _value: string = "";

    constructor(key: string, value: string) {
        super();
        this._key = key;
        this._value = value;

        this.key(key);
        this.value(value);
    }

    _initializeObservables(): void {
        super._initializeObservables();
        this.key = ko.observable("");
        this.value = ko.observable("");
    }

    _isDirty(): boolean {
        return Utils_String.localeIgnoreCaseComparer(this._key, this.key()) != 0 ||
            Utils_String.localeIgnoreCaseComparer(this._value, this.value()) != 0;
    }

    _isInvalid(): boolean {
        return Utils_String.localeIgnoreCaseComparer("", this.key().trim()) === 0;
    }

    getValueAsString(): string {
        return Utils_String.format("{0},{1}", this.key(), this.value());
    }
}

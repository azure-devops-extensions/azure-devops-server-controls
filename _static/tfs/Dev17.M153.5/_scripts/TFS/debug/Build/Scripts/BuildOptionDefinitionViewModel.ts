import ko = require("knockout");

import OptionInputViewModel = require("Build/Scripts/OptionInputViewModel");

import BuildConstants = require("Build.Common/Scripts/Generated/TFS.Build2.Common");

import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
import TasksEditor = require("DistributedTasksCommon/TFS.Tasks.TasksEditor");

import Marked = require("Presentation/Scripts/marked");

import BuildCommon = require("TFS/Build/Contracts");
import DistributedTaskContracts = require("TFS/DistributedTask/Contracts");

import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");


import Constants_Platform = require("VSS/Common/Constants/Platform");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { MarkdownRenderer } from "ContentRendering/Markdown";


/**
 * Viewmodel for build option definitions
 */
export class BuildOptionDefinitionViewModel extends TaskModels.ChangeTrackerModel {
    private _selected: boolean;
    private _inputsMap: { [name: string]: TasksEditor.BaseInputViewModel };
    private _inputTemplateName = "taskeditor_input";
    private _additionalFields = "{}"; // empty JSON string

    private readonly _autoLinkingBuildOptionId: string = "5d58cc01-7c75-450c-be18-a388ddb129ec";

    /**
     * The description
     */
    public description: KnockoutObservable<string>;

    /**
     * The option id
     */
    public id: KnockoutObservable<string>;

    /**
     * The option name
     */
    public name: KnockoutObservable<string>;

    /**
     * Specifies whether definition is selected or not.
     */
    public selected: KnockoutObservable<boolean>;

    /**
     * The inputs
     */
    public inputs: TasksEditor.BaseInputViewModel[];

    /**
     * Additional inputs that aren't predefined
     */
    public additionalFields: KnockoutObservableArray<OptionInputViewModel.OptionInputViewModel>;
    
    /**
     * Additional inputs that aren't predefined
     */
    public additionalFieldsEnabled: KnockoutObservable<boolean>;

    /**
     * Check whether the option is visible on current build editor
     */
    public isOptionVisible: KnockoutObservable<boolean>;

    /**
     * Additional inputs that aren't predefined
     */
    public additionalFieldsHelpMarkDown: KnockoutObservable<string>;

    /**
     * The Groups
     */
    public groups: TasksEditor.GroupDefinitionVM[] = [];

    /**
     * The groups inputs map
     */
    public groupInputsMap: { [name: string]: TasksEditor.BaseInputViewModel[] } = {};

    private additionalFieldsInputName: string = BuildConstants.BuildConstants.BuildOptionAdditionalFieldsName;

    /**
     * Creates a new viewmodel from a data contract
     * @param buildOptionDefinition The data contract
     */
    constructor(buildOptionDefinition: BuildCommon.BuildOptionDefinition) {
        super();

        this._inputsMap = {};

        this.description = ko.observable(buildOptionDefinition.description || "");
        this.id = ko.observable(buildOptionDefinition.id || "");
        this.name = ko.observable(buildOptionDefinition.name || "");

        // Record groups
        this.groups = buildOptionDefinition.groups.map((group: BuildCommon.BuildOptionGroupDefinition) => {
            return new TasksEditor.GroupDefinitionVM(group.name, group.displayName, group.isExpanded);
        });

        let renderer: (markdown: string) => string;
        if (FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.MarkdownRendering)) {
            renderer = (new MarkdownRenderer()).renderHtml;
        }
        else {
            renderer = Marked;
        }

        this.isOptionVisible = ko.observable(!Utils_String.equals(buildOptionDefinition.id, this._autoLinkingBuildOptionId, true));

        this.inputs = buildOptionDefinition.inputs.map((inputDefinition: BuildCommon.BuildOptionInputDefinition) => {
            // handle additional fields list separately
            if (inputDefinition.name === this.additionalFieldsInputName) {
                this.additionalFieldsEnabled(true);
                this.additionalFieldsHelpMarkDown(inputDefinition.help ? renderer(inputDefinition.help["markdown"]) || "" : "");
                return null;
            }

            var inputViewModel: TasksEditor.BaseInputViewModel;
            var convertedInputDefinition: DistributedTaskContracts.TaskInputDefinition = $.extend({}, inputDefinition, {
                type: this._getInputDefinitionType(inputDefinition.type),
                helpMarkDown: inputDefinition.help ? renderer(inputDefinition.help["markdown"]) || "" : ""
            });
            inputViewModel = TasksEditor.getInputViewModel(convertedInputDefinition);

            // Cache view models by name
            this._inputsMap[inputDefinition.name] = inputViewModel;
            inputViewModel.templateName = this._inputTemplateName;

            //Handle groups
            var groupName = inputDefinition.groupName;
            if (groupName) {
                if (!this.groupInputsMap[groupName]) {
                    this.groupInputsMap[groupName] = [];
                }
                this.groupInputsMap[groupName].push(inputViewModel);
                return null; // Don't add to the list of normal inputs
            }

            return inputViewModel;
        });

        // Remove possible nulls from inputs
        this.inputs = this.inputs.filter((value: TasksEditor.BaseInputViewModel) => {
            if (value)
                return true;
        });
    }

    _initializeObservables(): void {
        super._initializeObservables();
        this._selected = null;
        this.selected = ko.observable(this._selected);

        this.additionalFieldsEnabled = ko.observable(false);
        this.additionalFieldsHelpMarkDown = ko.observable("");
        this.additionalFields = ko.observableArray([]);
    }

    // Map optiontype to inputdefinition type to use distributed task common controls
    private _getInputDefinitionType(inputType: BuildCommon.BuildOptionInputType): string {
        var convertedType = "string";
        switch (inputType) {
            case BuildCommon.BuildOptionInputType.Boolean:
                convertedType = "boolean";
                break;
            case BuildCommon.BuildOptionInputType.Radio:
                convertedType = "radio";
                break;
            case BuildCommon.BuildOptionInputType.PickList:
                convertedType = "pickList";
                break;
            case BuildCommon.BuildOptionInputType.StringList:
                convertedType = "stringList";
                break;
        }
        return convertedType;
    }

    /**
     * Updates the model from a data contract
     * @param buildOptionDefinition The data contract
     */
    public update(option: BuildCommon.BuildOption): void {
        this._setSelected(option.enabled);

        var inputs = option.inputs || {};
        $.each(inputs, (name: string, value: string) => {
            var input = this._inputsMap[name];
            if (input) {
                input.update(value);
            }
            else if (Utils_String.localeIgnoreCaseComparer(name, this.additionalFieldsInputName) === 0) {
                this.additionalFields([]);
                this._additionalFields = value;
                // populate additional fields             
                if (value) {
                    try {
                        var browserATMismatchValue = value === "{},";
                        if (browserATMismatchValue) {
                            value = "{}";
                            this._additionalFields = value;
                        }

                        var fields = JSON.parse(value);

                        for (var fieldName in fields) {
                            this.additionalFields.push(new OptionInputViewModel.OptionInputViewModel(fieldName, fields[fieldName]));
                        }
                    }
                    catch (ex) {
                        // JSON is not in a valid format. Show the definition as dirty so it can be re-saved in a valid format
                    }
                }
            }
        });
    }

    public getInputViewModel(name: string): TasksEditor.BaseInputViewModel {
        return this._inputsMap[name];
    }

    public reset(): void {
        // Reset selected value
        this._setSelected(null);
        var groupInputs = [];
        $.each(this.groupInputsMap || {}, (index, value) => {
            groupInputs = groupInputs.concat(value);
        });
        // Reset each input
        $.each(this.inputs, (i: number, input: TasksEditor.BaseInputViewModel) => {
            input.reset();
        });
        $.each(groupInputs, (i: number, input: TasksEditor.BaseInputViewModel) => {
            input.reset();
        });
    }

    public dispose(): void {
        var groupInputs = [];
        $.each(this.groupInputsMap || {}, (index, value) => {
            groupInputs = groupInputs.concat(value);
        });
        // Dispose each input
        $.each(this.inputs, (i: number, input: TasksEditor.BaseInputViewModel) => {
            input.dispose();
        });
        $.each(groupInputs, (i: number, input: TasksEditor.BaseInputViewModel) => {
            input.dispose();
        });

        super.dispose();
    }

    public getValue(): BuildCommon.BuildOption {
        var inputsMap: { [name: string]: string } = {};

        $.each(this.inputs, (i: number, input: TasksEditor.BaseInputViewModel) => {
            inputsMap[input.name()] = input.getValue();
        });

        if (this.additionalFieldsEnabled) {
            inputsMap[this.additionalFieldsInputName] = this.getAdditionalFieldsAsJsonString();
        }

        var groupInputs = [];
        $.each(this.groupInputsMap || {}, (index, value) => {
            groupInputs = groupInputs.concat(value);
        });

        $.each(groupInputs, (i: number, input: TasksEditor.BaseInputViewModel) => {
            inputsMap[input.name()] = input.getValue();
        });

        return <BuildCommon.BuildOption>{
            definition: { id: this.id() },
            enabled: this.selected(),
            inputs: inputsMap
        };
    }

    _setSelected(value: boolean): void {
        this._selected = value;
        this.selected(this._selected);
    }

    _isDirty(): boolean {
        if (this._selected !== this.selected()) {
            return true;
        }

        if (this.additionalFieldsEnabled() &&
            Utils_String.localeIgnoreCaseComparer(this._additionalFields, this.getAdditionalFieldsAsJsonString()) != 0) {
            return true;
        }

        var dirtyInput = Utils_Array.first(this.inputs || [], (input: TasksEditor.BaseInputViewModel) => {
            return input._isDirty();
        });

        var groupInputs = [];
        $.each(this.groupInputsMap || {}, (index, value) => {
            groupInputs = groupInputs.concat(value);
        });

        var dirtyGroupInput = Utils_Array.first(groupInputs, (input: TasksEditor.BaseInputViewModel) => {
            return input._isDirty();
        });

        return !!dirtyInput || !!dirtyGroupInput;
    }

    _isInvalid(): boolean {
        var invalid = false;
        if (this.additionalFieldsEnabled()) {
            this.additionalFields().forEach((value) => {
                if (value._isInvalid()) {
                    invalid = true;
                }
            });
        }

        return invalid;
    }

    public addAdditionalField(additonalField: TaskModels.KeyValuePair, evt: JQueryEventObject): void {
        this.additionalFields.push(new OptionInputViewModel.OptionInputViewModel("", ""));
    }

    public removeAdditionalField(additonalField: OptionInputViewModel.OptionInputViewModel, evt: JQueryEventObject): void {
        var context = <BuildOptionDefinitionViewModel>(<KnockoutBindingContext>ko.contextFor(evt.target)).$parent;
        context.additionalFields.remove(additonalField);
    }

    private getAdditionalFieldsAsJsonString(): string {
        var inputs = this.additionalFields();
        var rtn = {};
        inputs.forEach((input) => {
            rtn[input.key()] = input.value();
        });

        return JSON.stringify(rtn);
    }
}

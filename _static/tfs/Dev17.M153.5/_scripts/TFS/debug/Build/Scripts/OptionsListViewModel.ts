

import BuildOptionDefinitionViewModel = require("Build/Scripts/BuildOptionDefinitionViewModel");

import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");

import BuildCommon = require("TFS/Build/Contracts");

import Utils_Array = require("VSS/Utils/Array");

export class OptionsListViewModel extends TaskModels.ChangeTrackerModel {
    private _options: BuildCommon.BuildOption[];
    private _optionDefinitionsMap: { [id: string]: BuildOptionDefinitionViewModel.BuildOptionDefinitionViewModel };
    public optionDefinitions: BuildOptionDefinitionViewModel.BuildOptionDefinitionViewModel[];
    public optionDefinitionsStored: BuildCommon.BuildOptionDefinition[];

    constructor(optionDefinitions: BuildCommon.BuildOptionDefinition[]) {
        super();
        this.optionDefinitionsStored = optionDefinitions;
        this._optionDefinitionsMap = {};
        this.optionDefinitions = optionDefinitions.map((od: BuildCommon.BuildOptionDefinition) => {
            var viewModel = new BuildOptionDefinitionViewModel.BuildOptionDefinitionViewModel(od);
            this._optionDefinitionsMap[od.id.toLowerCase()] = viewModel;
            return viewModel;
        });
    }

    public update(options: BuildCommon.BuildOption[]): void {
        this._options = options || [];
        this._update(this._options);
    }

    public getValue(): BuildCommon.BuildOption[] {
        return $.map(this.optionDefinitions, (definition: BuildOptionDefinitionViewModel.BuildOptionDefinitionViewModel) => {
            return definition.getValue();
        });
    }

    public _update(options: BuildCommon.BuildOption[]): void {
        // Reset all definitions first
        $.each(this.optionDefinitions, (i: number, definition: BuildOptionDefinitionViewModel.BuildOptionDefinitionViewModel) => {
            definition.reset();
        });

        // Update each definition
        $.each(options, (i: number, option: BuildCommon.BuildOption) => {
            var optionDefinition = this._optionDefinitionsMap[option.definition.id.toLowerCase()];
            if (optionDefinition) {
                optionDefinition.update(option);
            }
        });
    }

    public revert(): void {
        this._update(this._options);
    }

    public dispose(): void {
        // Dispose all definitions
        $.each(this.optionDefinitions, (i: number, definition: BuildOptionDefinitionViewModel.BuildOptionDefinitionViewModel) => {
            definition.dispose();
        });

        super.dispose();
    }

    _isDirty(): boolean {
        var dirtyDefinition = Utils_Array.first(this.optionDefinitions || [], (definition: BuildOptionDefinitionViewModel.BuildOptionDefinitionViewModel) => {
            return definition._isDirty();
        });

        return !!dirtyDefinition;
    }

    _isInvalid(): boolean {
        var invalidDefinition = Utils_Array.first(this.optionDefinitions || [], (definition: BuildOptionDefinitionViewModel.BuildOptionDefinitionViewModel) => {
            return definition.selected() && definition._isInvalid();
        });

        return !!invalidDefinition;
    }

    public getOptionViewModel(name: string): BuildOptionDefinitionViewModel.BuildOptionDefinitionViewModel {
        return this._optionDefinitionsMap[name];
    }
}

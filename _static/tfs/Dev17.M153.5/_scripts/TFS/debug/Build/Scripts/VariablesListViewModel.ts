

import ko = require("knockout");

import BuildDefinitionVariableViewModel = require("Build/Scripts/BuildDefinitionVariableViewModel");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import BuildVariables = require("Build/Scripts/Common.Variables");

import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");

import Marked = require("Presentation/Scripts/marked");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import BuildCommon = require("TFS/Build/Contracts");

import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");

import Constants_Platform = require("VSS/Common/Constants/Platform");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { MarkdownRenderer } from "ContentRendering/Markdown";


export class VariablesListViewModel extends TaskModels.ChangeTrackerModel {
    private _variables: BuildVariables.IDefinitionVariable[];
    private _implicitVariables: BuildVariables.IDefinitionVariable[];

    /**
     * List of variables bound to UI.
     */
    public variables: KnockoutObservableArray<BuildDefinitionVariableViewModel.BuildDefinitionVariableViewModel>;

    /**
     * The help text markdown for build variables usage.
     */
    public buildVariablesUsageMarkDown: string;

    constructor() {
        super();

        if (FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.MarkdownRendering)) {
            let renderer = new MarkdownRenderer();
            this.buildVariablesUsageMarkDown = renderer.renderHtml(BuildResources.BuildVariablesUsageHelpText);
        }
        else {
            this.buildVariablesUsageMarkDown = Marked(BuildResources.BuildVariablesUsageHelpText);
        }

    }

    _initializeObservables(): void {
        super._initializeObservables();

        this._variables = [];

        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        this._implicitVariables = BuildVariables.ImplicitVariables.GetImplicitVariables(tfsContext);

        this.variables = ko.observableArray(this._implicitVariables.map((v: BuildVariables.IDefinitionVariable) => {
            return new BuildDefinitionVariableViewModel.BuildDefinitionVariableViewModel(v);
        }));
    }

    public update(variables: { [key: string]: BuildCommon.BuildDefinitionVariable }, definitionId: number): void {
        this._variables = [];
        if (variables) {
            for (var key in variables) {
                var v = <BuildVariables.IDefinitionVariable>$.extend({ name: key }, variables[key]);
                this._variables.push(v);
            }

            this._update(this._variables);
        }

        this._updateDefinitionId(definitionId);
    }

    private _update(variables: BuildVariables.IDefinitionVariable[]): void {
        var existingVariables = this.variables();
        for (var i = 0, len = existingVariables.length; i < len; i++) {
            existingVariables[i].dispose();
        }

        // First populate the implicit variables
        var variablesVM: BuildDefinitionVariableViewModel.BuildDefinitionVariableViewModel[] = this._implicitVariables.map((v: BuildVariables.IDefinitionVariable) => {
            return new BuildDefinitionVariableViewModel.BuildDefinitionVariableViewModel(v);
        });

        // Then add current variables
        for (var i = 0, len = variables.length; i < len; i++) {
            variablesVM.push(new BuildDefinitionVariableViewModel.BuildDefinitionVariableViewModel(variables[i], false));
        }

        // Push them all to observable
        this.variables(variablesVM);
    }

    public _updateDefinitionId(id: number): void {
        var definitionIdVariable = Utils_Array.first(this.variables(), (vm: BuildDefinitionVariableViewModel.BuildDefinitionVariableViewModel) => {
            return Utils_String.localeIgnoreCaseComparer(vm.name(), BuildVariables.ImplicitVariableNames.DefinitionId) === 0;
        });

        if (definitionIdVariable) {
            definitionIdVariable.value(id <= 0 ? BuildResources.NoDefinitionIdYet : id.toString());
        }
    }

    public getValue(): { [key: string]: BuildCommon.BuildDefinitionVariable } {
        var map: { [key: string]: boolean } = {};
        var implicitVariablesMap: { [key: string]: boolean } = {};
        var variables = this.variables();
        var resultVariables: { [key: string]: BuildCommon.BuildDefinitionVariable } = {};

        for (var i = 0, len = variables.length; i < len; i++) {
            var vm = variables[i];
            var key = vm.name().toLowerCase();
            // Record implicit variables to prevent overriding
            if (vm.isImplicit) {
                implicitVariablesMap[key] = true;
            }
            // Skip recurring variables and  variables with same key as implicit variable's
            else if (!map[key] && !implicitVariablesMap[key]) {
                var v = vm.getValue();
                resultVariables[v.name] = { value: v.value, allowOverride: v.allowOverride, isSecret: v.isSecret };
                map[key] = true;
            }
        }

        return resultVariables;
    }

    public getQueueVariables(): IKeyValuePair<string, string>[] {
        var map: { [key: string]: boolean } = {};
        var variables = this.variables();
        var resultVariables: IKeyValuePair<string, string>[] = [];

        for (var i = 0, len = variables.length; i < len; i++) {
            var vm = variables[i];
            var key = vm.name().toLowerCase();
            // Skip implicit and recurring variables
            if (vm.allowOverride() && !map[key]) {
                resultVariables.push({ key: vm.name(), value: vm.value() });
                map[key] = true;
            }
        }

        return resultVariables;
    }

    public revert(): void {
        // Update using original variables
        this._update(this._variables);
    }

    public setClean(): void {
        var variables = this.variables();
        for (var i = 0, len = variables.length; i < len; i++) {
            variables[i].setClean();
        }

        // Notify listeners
        this.variables.valueHasMutated();
    }

    public addVariable(variables: VariablesListViewModel, evt: JQueryEventObject): void {
        this.variables.push(new BuildDefinitionVariableViewModel.BuildDefinitionVariableViewModel({ name: "", value: "", allowOverride: false, isSecret: false }, false));
    }

    public removeVariable(variable: BuildDefinitionVariableViewModel.BuildDefinitionVariableViewModel, evt: JQueryEventObject): void {
        variable.dispose();
        var context = <VariablesListViewModel>(<KnockoutBindingContext>ko.contextFor(evt.target)).$parent;
        context.variables.remove(variable);
    }

    _isDirty(): boolean {
        var variables = this.variables();
        for (var i = 0, len = variables.length; i < len; i++) {
            if (variables[i]._isDirty()) {
                return true;
            }
        }

        return !Utils_Array.arrayEquals(this._variables, this.variables()
            .filter((vm: BuildDefinitionVariableViewModel.BuildDefinitionVariableViewModel) => {
                // Skip implicit variables
                return !vm.isImplicit;
            }),
            (s: BuildVariables.IDefinitionVariable, t: BuildDefinitionVariableViewModel.BuildDefinitionVariableViewModel) => {
                return Utils_String.localeIgnoreCaseComparer(s.name, t.name()) === 0;
            }, true);
    }

    _isInvalid(): boolean {
        var rtn = false;

        this.variables().forEach((variable) => {
            if (variable._isInvalid()) {
                rtn = true;
            }
        });

        return rtn;
    }
}

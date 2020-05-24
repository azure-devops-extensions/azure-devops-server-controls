import * as Q from "q";

import { AppCapability, AppContext } from "DistributedTaskControls/Common/AppContext";
import * as Common from "DistributedTaskControls/Common/Common";
import { Feature, Properties, Source, Telemetry } from "DistributedTaskControls/Common/Telemetry";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { InputControlType } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { ConnectedServiceComponentUtility, IConnectedServiceInputStateBase } from "DistributedTaskControls/SharedControls/InputControls/Components/ConnectedServiceComponentUtility";

import { Boolean } from "DistributedTaskControls/Common/Primitives";
import { DeployPhaseTypes, ParallelExecutionTypes, ExecutionPlanConstants } from "DistributedTaskControls/Phase/Types";
import { DefinitionType } from "DistributedTasksCommon/TFS.Tasks.Types";
import { IDefinitionVariable } from "DistributedTaskControls/Variables/Common/Types";

import { TaskDefinition } from "TFS/DistributedTask/Contracts";
import { TaskInputDefinitionBase as TaskInputDefinition } from "TFS/DistributedTaskCommon/Contracts";

import * as Dialogs from "VSS/Controls/Dialogs";
import { FeatureManagementService } from "VSS/FeatureManagement/Services";
import { getService } from "VSS/Service";
import { copyToClipboard } from "VSS/Utils/Clipboard";
import { parseInvariant } from "VSS/Utils/Number";
import { empty, newLine, lineFeed, format, startsWith, ignoreCaseComparer } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/CopyDialogueStyles";

export function showCopyDialog(artifactType: string, yamlResult: string) {
    publishTelemetry(Feature.CopyYaml, artifactType);

    let dialog = Dialogs.show(Dialogs.CopyContentDialog,
        {
            dialogLabel: Resources.CopyContentHelpText,
            dialogLabelExtend: Resources.CopyContentHelpDocsLink,
            data: yamlResult,
            disableEdit: true,
            textAreaCopyClass: "dtc-copy-dialogue-text-area",
            buttons: [{
                id: Common.KEY_COPY_AS_YAML,
                text: Resources.CopyToClipboard,
                click: () => {
                    copyToClipboard(yamlResult);
                    publishTelemetry(Feature.ViewAsYaml, artifactType);
                    dialog.close();
                }
            }]
        });
}

function publishTelemetry(eventType: string, artifactType: string) {
    let eventProperties: IDictionaryStringTo<any> = {};
    if (artifactType) {
        eventProperties[Properties.ViewYamlArtifact] = artifactType;
    }

    Telemetry.instance().publishEvent(eventType, eventProperties, Source.CommandButton);
}

export function handleViewProcessAsYaml(phases: YamlPhase[], skipSyncSource: string, cleanOption: string, checkoutFromLFS: string, fetchDepth: string) {
    getProcessSnippet(phases, skipSyncSource, cleanOption, checkoutFromLFS, fetchDepth).then((content: string) => {
        showCopyDialog(YamlHelperConstants.ProcessCIKey, content);
    });
}

export function handleViewPhaseAsYaml(refName: string, name: string, phaseType: DeployPhaseTypes, tasks: YamlTask[], demands: any[], queueName: string, timeoutInMinutes: number, dependencies: string[], condition: string, executionPlanType: ParallelExecutionTypes) {
    let yamlPhase: YamlPhase = new YamlPhase(refName, name, phaseType, tasks, demands, queueName, timeoutInMinutes, dependencies, condition, executionPlanType);

    yamlPhase.getValue(false).then((result: string) => {
        showCopyDialog(YamlHelperConstants.PhaseCIKey, result);
    });
}

export function getProcessSnippet(phases: YamlPhase[], skipSyncSource: string, cleanOption: string, checkoutFromLFS: string, fetchDepth: string): IPromise<string> {
    let content = "";
    let promises = [];
    phases = phases || [];
    phases.forEach((phase: YamlPhase) => {
        promises.push(phase.getValue(phases.length > 1));
    });

    

    if (skipSyncSource !== Boolean.trueString)
    {
        // adding checkout section
        content += YamlHelperConstants.resourcesKey + YamlHelperConstants.colon + newLine + YamlHelperConstants.repoKey + YamlHelperConstants.colon 
            + YamlHelperConstants.singleSpace + YamlHelperConstants.syncSourcesValue + newLine;

        if (cleanOption && cleanOption !== Boolean.falseString)
        {
            content += indent(YamlHelperConstants.cleanOption) + YamlHelperConstants.colon + YamlHelperConstants.singleSpace + cleanOption + newLine;
        }

        if (checkoutFromLFS === Boolean.trueString)
        {
            content += indent(YamlHelperConstants.lfsOption) + YamlHelperConstants.colon + YamlHelperConstants.singleSpace + checkoutFromLFS + newLine;
        }

        const parsedFetchDepth = fetchDepth ? parseInvariant(fetchDepth) : 0;
        if (parsedFetchDepth > 0)
        {
            content += indent(YamlHelperConstants.fetchDepthOption) + YamlHelperConstants.colon + YamlHelperConstants.singleSpace + parsedFetchDepth + newLine;
        } 
    }
    
    if (phases.length > 1)
    {
        content += YamlHelperConstants.phasesProperty + newLine;
    }

    return Q.all(promises).then((yamlPhasesContent: string[]) => {
        yamlPhasesContent.forEach((yamlPhaseContent: string) => {
            content += yamlPhaseContent + newLine;
        });
        return content;
    });
}

export function handleViewTaskAsYaml(inputs: IDictionaryStringTo<string>, taskDefinition: TaskDefinition, taskRefName: string, taskDisplayName: string, taskVersion: string, enabled: boolean, continueOnError: boolean, condition: string, timeout: number, inputsStates: IDictionaryStringTo<boolean>, variables: IDictionaryStringTo<IDefinitionVariable>, processParameters: IDictionaryStringTo<string>, environmentVariables: IDictionaryStringTo<string>) {
    let yamlTask: YamlTask = new YamlTask(inputs, taskDefinition, taskRefName, taskDisplayName, taskVersion, enabled, continueOnError, condition, timeout, inputsStates, variables, processParameters, environmentVariables, false, 0);
    yamlTask.getValue(true).then((taskSnippet: string) => {
        showCopyDialog(YamlHelperConstants.TaskCIKey, taskSnippet);
    });
}

export function isYamlFeatureEnabled(): boolean {
    const featureManagementService = getService(FeatureManagementService);
    return (featureManagementService.isFeatureEnabled(YamlHelperConstants.YamlFeatureContributionId)
        && !!AppContext.instance().isCapabilitySupported(AppCapability.ViewYAML));
}

export class YamlPhase {
    private _demands: any[];
    private _tasks: YamlTask[];
    private _queueName: string;
    private _refName: string;
    private _name: string;
    private _timeoutInMinutes: number = 0;
    private _variables: IDictionaryStringTo<string> = {};
    private _variablesComments: string = "";
    private _phaseType: DeployPhaseTypes;
    private _dependencies: string[] = [];
    private _condition: string = empty;
    private _executionPlanType: ParallelExecutionTypes;

    constructor(refName: string, name: string, phaseType: DeployPhaseTypes, tasks: YamlTask[], demands: any[], queueName: string, timeoutInMinutes: number, dependencies: string[], condition: string, executionPlanType: ParallelExecutionTypes) {
        this._refName = refName.replace(new RegExp(" "), "_"); // refName should not have spaces, but just in case, make sure we remove them.
        this._name = name;
        this._phaseType = phaseType;
        this._tasks = tasks || [];
        this._demands = demands;
        this._queueName = queueName;
        this._timeoutInMinutes = timeoutInMinutes;
        this._dependencies = dependencies;
        this._condition = condition;
        this._executionPlanType = executionPlanType;
    }

    public getValue(multiplePhases: boolean): IPromise<string> {
        let value: string = this._getExecutionPlanTypeComment();
        if (multiplePhases) {
            value += YamlHelperConstants.phaseProperty + this._refName + newLine;

            // add displayName property
            value += indent(YamlHelperConstants.displayNameProperty) + YamlHelperConstants.colon + YamlHelperConstants.singleSpace + this._name + newLine + newLine;
        }

        let dependencyValue: string = this._getDependencies(multiplePhases);
        value += dependencyValue;

        if (this._condition && this._condition !== empty && multiplePhases) {
            value += addTailingSpaces("");
            value += YamlHelperConstants.conditionProperty + YamlHelperConstants.colon + YamlHelperConstants.singleSpace + this._condition + newLine; 
        }

        if (multiplePhases) {
            value += addTailingSpaces("");
        }
        if (this._phaseType === DeployPhaseTypes.RunOnServer) {
            // agentless phase  
            value += YamlHelperConstants.serverProperty + YamlHelperConstants.colon + YamlHelperConstants.singleSpace + Boolean.trueString + newLine;
        }
        else {
            value += YamlHelperConstants.queueProperty + newLine;
            if (multiplePhases) {
                value += addTailingSpaces("");
            }
            value += indent(YamlHelperConstants.nameProperty) + this._queueName + newLine;
        }

        let demandsValue: string = this._getDemands(multiplePhases);
        value += demandsValue;
        if (demandsValue && demandsValue !== empty) {
            value += newLine;
        }

        if (this._timeoutInMinutes > 0)
        {
            if (multiplePhases) {
                value += addTailingSpaces("");
            }
            value += indent(YamlHelperConstants.timeoutInMinutesProperty) + YamlHelperConstants.colon + YamlHelperConstants.singleSpace + this._timeoutInMinutes + newLine + newLine;
        }

        return this._getTasks().then((result: string) => {
            return value + this._getVariablesText(multiplePhases) + result;
        });
    }

    private _getDemands(multiplePhases: boolean): string {
        let demands: string = "";
        if (this._demands && this._demands.length > 0) {
            let multiDemands = this._demands.length > 1;
            if (multiplePhases) {
                demands = addTailingSpaces(demands);
            }
            demands += indent(YamlHelperConstants.demandsProperty + YamlHelperConstants.colon + YamlHelperConstants.singleSpace);
            if (multiDemands) {
                demands += newLine;
            }

            this._demands.forEach((demand: string) => {
                if (demand !== empty && demand.length > 0) {
                    demands = multiDemands ? multiplePhases ? demands + indent("-", 3) + YamlHelperConstants.singleSpace + demand + newLine : demands + indent("-", 2) + YamlHelperConstants.singleSpace + demand + newLine : demands + demand + newLine;
                }
            });
        }
        return demands;
    }

    private _getDependencies(multiplePhases: boolean): string {
        let dependencies: string = "";
        if (this._dependencies && this._dependencies.length > 0) {
            let multiDependencies = this._dependencies.length > 1;
            if (multiplePhases) {
                dependencies = addTailingSpaces(dependencies);
            }

            dependencies += YamlHelperConstants.dependencyProperty + YamlHelperConstants.colon + YamlHelperConstants.singleSpace;
            
            if (multiDependencies) {
                dependencies += newLine;
            }

            this._dependencies.forEach((dependency: string) => {
                if (dependency !== empty && dependency.length > 0) {
                    dependencies =  multiDependencies ?  multiplePhases ? dependencies + indent("-", 3) + YamlHelperConstants.singleSpace + dependency + newLine : dependencies + indent("-") + YamlHelperConstants.singleSpace + dependency + newLine : dependencies + dependency + newLine;
                }
            });
        }
        return dependencies;
    }

    private _getTasks(): IPromise<string> {
        let tasksContent: string = "";
        if (this._tasks && this._tasks.length > 0) {
            let promises = [];
            let index: number = 0;
            this._tasks.forEach((task: YamlTask) => {
                promises.push(task.getValue());
                index++;
            });

            return Q.all(promises).then((yamlTasks: string[]) => {
                yamlTasks.forEach((yamlTask: string) => {
                    tasksContent += yamlTask + newLine;
                });

                this._tasks.forEach((task: YamlTask) => {
                    this._variablesComments += task.getVariablesComments();
                    const taskVariables = task.getVariables();
                    const variablesKeys = Object.keys(this._variables);
                    for (let key in taskVariables) {
                        if (variablesKeys.length === 0 || !!this._variables[key]) {
                            this._variables[key] = taskVariables[key];
                        }
                    }
                });

                return tasksContent;
            });
        }
        else {
            return Q.resolve(tasksContent);
        }
    }

    private _getVariablesText(multiplePhases: boolean): string {
        let variables = "";
        const variablesKeys = Object.keys(this._variables);
        if (variablesKeys.length > 0) {
            if (multiplePhases) {
                variables = addTailingSpaces(variables);
            }

            variables += YamlHelperConstants.VariablesProperty + YamlHelperConstants.colon + newLine;
            variablesKeys.forEach((key) => {
                if (multiplePhases) {
                    variables = addTailingSpaces(variables);
                }

                variables += indent(key) + YamlHelperConstants.colon + YamlHelperConstants.singleSpace + "\'" + this._variables[key].replace("'", "''") + "\'" + newLine;
            });
        }

        return this._variablesComments + variables;
    }

    private _getExecutionPlanTypeComment(): string {
        if (this._executionPlanType !== ParallelExecutionTypes.None)
        {
            return "#" + Resources.ParallelExecutionYamlComment + newLine + newLine;
        }

        return empty;
    }
}

export class YamlTask {
    private _name: string;
    private _displayName: string;
    private _majorVersion: string;
    private _inputs: IDictionaryStringTo<string>;
    private _taskDefinition: TaskDefinition;
    private _isTaskGroup: boolean = false;
    private _multiplePhases: boolean = false;
    private _enabled: boolean = true;
    private _continueOnError: boolean = false;
    private _condition: string;
    private _timeout: number = 0;
    private _taskIndex: number = 0;
    private _inputsStates: IDictionaryStringTo<boolean>;
    private _variables: IDictionaryStringTo<IDefinitionVariable>;
    private _processParameters: IDictionaryStringTo<string>;
    private _usedVariables: IDictionaryStringTo<string> = {};
    private _variablesComments: string = "";
    private _hasAlias: boolean = false;
    private _environmentVariables: IDictionaryStringTo<string>;

    constructor(inputs: IDictionaryStringTo<string>, taskDefinition: TaskDefinition, taskRefName: string, taskDisplayName: string, taskVersion: string, enabled: boolean, continueOnError: boolean, condition: string, timeout: number, inputsStates: IDictionaryStringTo<boolean>, variables: IDictionaryStringTo<IDefinitionVariable>, processParameters: IDictionaryStringTo<string>, environmentVariables: IDictionaryStringTo<string>, multiplePhases: boolean, taskIndex: number) {
        this._majorVersion = this._getTaskVersion(taskVersion);
        this._inputs = inputs;
        this._taskDefinition = taskDefinition;
        this._enabled = enabled;
        this._continueOnError = continueOnError;
        this._condition = condition;
        this._timeout = timeout;
        this._multiplePhases = multiplePhases;
        this._taskIndex = taskIndex;
        this._inputsStates = inputsStates;
        this._variables = variables;
        this._processParameters = processParameters;
        this._displayName = taskDisplayName;
        this._environmentVariables = environmentVariables;

        // for contributed tasks
        if (this._taskDefinition.contributionIdentifier && this._taskDefinition.contributionIdentifier !== empty) {
            this._name = this._taskDefinition.contributionIdentifier + "." + this._taskDefinition.name;
        }
        else {
            this._name = this._taskDefinition ? this._taskDefinition.name : taskRefName;
        }

        if (this._taskDefinition && this._taskDefinition.definitionType === DefinitionType.metaTask) {
            this._isTaskGroup = true;
        }
    }

    public getValue(includeVariables?: boolean): IPromise<string> {
        let value: string = "";
        if (this._isTaskGroup) {
            value += "#" + Resources.TaskGroupViewYamlError + newLine;
            return Q.resolve(value);
        }
        else {
            if (this._taskIndex === 0) {
                if (this._multiplePhases) {
                    value = addTailingSpaces(value);
                }
                value += YamlHelperConstants.stepsProperty + YamlHelperConstants.colon + newLine;
            }

            if (this._multiplePhases) {
                value = addTailingSpaces(value);
            }

            const taskName = this._name + "@" + this._majorVersion;
            // Some tasks has an alias so it should be used instead of taskName@taskVersion
            const taskAlias = this._resolveTaskName(taskName);

            // if the task does not have an alias
            if (taskName === taskAlias)
            {
                value += YamlHelperConstants.taskProperty + YamlHelperConstants.colon + YamlHelperConstants.singleSpace + taskName + newLine;
            }
            else {
                value += taskAlias + YamlHelperConstants.colon + YamlHelperConstants.singleSpace;
                this._hasAlias = true;
            }

            // add displayName
            let displayName = newLine;

            if (this._hasAlias)
            {
                if (this._multiplePhases)
                {
                    displayName += addTailingSpaces("");
                }
                
                displayName += indent(YamlHelperConstants.displayNameProperty) + YamlHelperConstants.colon + YamlHelperConstants.singleSpace + escapeValue(this._displayName) + newLine;
            }
            else
            {
                if (this._multiplePhases) {
                    value = addTailingSpaces(value);
                }
                value += indent(YamlHelperConstants.displayNameProperty) + YamlHelperConstants.colon + YamlHelperConstants.singleSpace + escapeValue(this._displayName) + newLine;
            }

            const controlOptions = this._getControlOptions();

            const environmentVariables = this._getEnvironmentVariables();

            return this._getInputs().then((inputsValue: string) => {
                let variablesText = "";
                if (includeVariables) {
                    variablesText = this._getVariablesText();
                }
                return variablesText + value + inputsValue + displayName + controlOptions + environmentVariables;
            });
        }
    }

    public getVariables(): IDictionaryStringTo<string> {
        return this._usedVariables;
    }

    public getVariablesComments(): string {
        return this._variablesComments;
    }

    private _resolveTaskName(taskName: string): string {
        const taskAlias = YamlHelperConstants.TasksAliasLookup[taskName];
        if (taskAlias)
        {
            return taskAlias;
        }
        else
        {
            return taskName;
        }
    }

    private _getControlOptions(): string {
        let enabledProperty = "";
        // add enabled property only if the task is disabled
        if (!this._enabled) {
            if (this._multiplePhases) {
                enabledProperty = addTailingSpaces(enabledProperty);
            }

            enabledProperty += indent(YamlHelperConstants.enabledProperty) + YamlHelperConstants.colon + YamlHelperConstants.singleSpace + this._enabled + newLine;
        }

        let continueOnErrorProperty = "";
        // add contineOnError property only if the task has continueOnError set to true
        if (this._continueOnError) {
            if (this._multiplePhases) {
                continueOnErrorProperty = addTailingSpaces(continueOnErrorProperty);
            }

            continueOnErrorProperty += indent(YamlHelperConstants.continueOnErrorProperty) + YamlHelperConstants.colon + YamlHelperConstants.singleSpace + this._continueOnError + newLine;
        }

        let conditionProperty = "";
        // add condition property only if the task condition has a non-default value (value other than succeeded)
        if (this._condition && this._condition !== Common.TaskConditions.Succeeded) {
            if (this._multiplePhases)
            {
                conditionProperty = addTailingSpaces(conditionProperty);
            }
            
            conditionProperty += indent(YamlHelperConstants.conditionProperty) + YamlHelperConstants.colon + YamlHelperConstants.singleSpace + this._condition + newLine;
        }

        let timeoutProperty = "";
        // add timeout property only if the task has timeout set to a positive value
        if (this._timeout > 0) {
            if (this._multiplePhases) {
                timeoutProperty = addTailingSpaces(timeoutProperty);
            }

            timeoutProperty += indent(YamlHelperConstants.timeoutInMinutesProperty) + YamlHelperConstants.colon + YamlHelperConstants.singleSpace + this._timeout + newLine;
        }

        return enabledProperty + continueOnErrorProperty + conditionProperty + timeoutProperty;
    }

    private _getVariablesText(): string {
        let variables = "";
        const variablesKeys = Object.keys(this._usedVariables);
        if (variablesKeys.length > 0) {
            variables += YamlHelperConstants.VariablesProperty + YamlHelperConstants.colon + newLine;
            variablesKeys.forEach((key) => {
                variables += indent(key) + YamlHelperConstants.colon + YamlHelperConstants.singleSpace + "\'" + this._usedVariables[key].replace("'", "''") + "\'" + newLine;
            });
        }

        return this._variablesComments + variables;
    }

    private _getEnvironmentVariables(): string {
        let environmentVariables: string = "";
        if (this._environmentVariables && Object.keys(this._environmentVariables).length > 0) {
            environmentVariables += indent(YamlHelperConstants.environmentVariablesProperty) + YamlHelperConstants.colon + newLine;
            Object.keys(this._environmentVariables).forEach((name: string) => {
                environmentVariables += indent(indent(name)) + YamlHelperConstants.colon + YamlHelperConstants.singleSpace + this._environmentVariables[name] + newLine;
            });
        }
        return environmentVariables;
    }

    private _getInputs(): IPromise<string> {
        let inputs: string = "";
        if (this._inputs && Object.keys(this._inputs).length > 0) {
            let promises = [];

            Object.keys(this._inputs).forEach((key) => {
                if (key && key !== empty && this._inputs.hasOwnProperty(key) && this._inputs[key] && this._inputs[key] !== empty) {
                    if (!this._inputsStates[key]) {
                        let inputDefinition: TaskInputDefinition = this._getInputDefinition(key);
                        let isDefaultValue: boolean = inputDefinition && inputDefinition.defaultValue ? inputDefinition.defaultValue === this._inputs[key] : false;
                        // for bash commands if the target type is 'inline', it does not need to be added to the yaml script
                        let isTargetTypeInline: boolean = key === YamlHelperConstants.TargetTypeInputName && this._inputs[key] === YamlHelperConstants.TargetTypeInputInlineValue;
                        if ((key === YamlHelperConstants.TargetTypeInputName && isDefaultValue) || (!isDefaultValue && !isTargetTypeInline)) {
                            promises.push(this._getInputValue(key, inputDefinition));
                        }
                    }
                }
            });

            return Q.all(promises).then((inputValues: YamlInput[]) => {
                inputValues.forEach((input: YamlInput) => {
                    
                    const inputNameValue = input.getName();
                    const isScriptInput = inputNameValue.toLowerCase() === YamlHelperConstants.ScriptInputName;
                    const isInputFileTargetInput = inputNameValue === YamlHelperConstants.TargetTypeInputName && (input.getValue() === "./" || input.getValue() === "");
                    const isScriptFileInput = inputNameValue === YamlHelperConstants.TargetTypeInputFilePathValue;

                    if (this._hasAlias && (isScriptInput || isInputFileTargetInput || isScriptFileInput))
                    {
                        inputs += input.getValue();
                    }
                    else
                    {
                        if (inputs !== empty)
                        {
                            inputs += newLine;
                        }                     

                        let inputName = indent(inputNameValue);
                        if (!this._hasAlias)
                        {
                            if (this._multiplePhases) {
                                inputName = indent(inputName, 4);
                            }
                            else {
                                inputName = indent(inputName);
                            }
                            
                        }
                        else if (this._multiplePhases) {
                            inputName = indent(inputName);
                        }

                        inputs += inputName + YamlHelperConstants.colon + YamlHelperConstants.singleSpace + input.getValue() + newLine;
                    }

                    // remove the double quotes around the value
                    const inputValue = this._removeCharsFromBegining(input.getValue());
                    let value = this._removeFromEnd(inputValue, inputValue.length - 1);
                    if (value && value.indexOf(YamlHelperConstants.VariablePrefix) >= 0) {
                        const variableNames: string[] = this._getVariableNames(value);
                        for (let variableIndex in variableNames)
                        {
                            let variableName = variableNames[variableIndex];
                            // add each needed variable once
                            const variablesKeys = Object.keys(this._usedVariables);
                            if (variablesKeys.length === 0 || !this._usedVariables[variableName]) {
                                if (this._variables && !!this._variables[variableName]) {
                                    if (!this._variables[variableName].isSecret && !this._variables[variableName].allowOverride) {
                                        this._usedVariables[variableName] = this._variables[variableName].value;
                                    }
                                    else {
                                        if (this._variables[variableName].isSecret) {
                                            this._variablesComments += "#" + format(Resources.SecretVariableYamlComment, variableName) + newLine;
                                        }
                                        else {
                                            this._variablesComments += "#" + format(Resources.OverrideVariableYamlComment, variableName) + newLine;
                                        }
                                    }
                                }
                                else {
                                    if (this._processParameters && !!this._processParameters[variableName]) {
                                        this._usedVariables[variableName] = this._processParameters[variableName];
                                    }
                                    else {
                                        if (!this._isPredefinedVariable(variableName))
                                        {
                                            this._variablesComments += "#" + format(Resources.UndefinedVariableYamlComment, variableName) + newLine;
                                        }
                                    }
                                }
                            }
                        }
                    }
                });

                if (inputs !== empty) {
                    if (!this._hasAlias)
                    {
                        inputs = indent(YamlHelperConstants.inputsProperty) + YamlHelperConstants.colon + newLine + inputs;
                    }
                    if (this._multiplePhases && !this._hasAlias) {
                        inputs = indent(inputs);
                    }
                }
                return inputs;
            });
        }
        else {
            return Q.resolve(inputs);
        }
    }

    private _isPredefinedVariable(variableName: string): boolean {
        let predefined = false;
        YamlHelperConstants.PredefinedVariablesPrefixes.some((prefix: string) => {
            if (startsWith(variableName, prefix, ignoreCaseComparer))
            {
                predefined = true;
                return true;
            }
        });

        return predefined;
        
    }

    // Removes count number of characters from the begining of the string
    private _removeCharsFromBegining(inputValue: string, count: number = 1): string {
        if (!inputValue) {
            return inputValue;
        }

        while (count > 0 && inputValue) {
            inputValue = inputValue.substr(1);
            count--;
        }

        return inputValue;
    }

    private _removeFromEnd(inputValue: string, index): string {
        if (!inputValue || inputValue.length <= index || index === -1) {
            return inputValue;
        }

        return inputValue.substr(0, index);
    }

    private _getVariableNames(inputValue: string): string[] {
        let variableNames = [];
        if (inputValue) {
            let currentIndex = inputValue.indexOf("$(");
            let guardIndex = 0;
            while (currentIndex !== -1 && guardIndex < inputValue.length)
            {
                guardIndex++;

                // remove everything before $(varName)
                let value = inputValue.substr(currentIndex);
                // remove $(
                value = this._removeCharsFromBegining(value, 2);
                // remove everything after the varName
                currentIndex = value.indexOf(")");
                variableNames.push(this._removeFromEnd(value, currentIndex));
                currentIndex = inputValue.indexOf(")");

                // make sure it is a valid var name
                if (currentIndex !== -1)
                {
                    inputValue = inputValue.substr(currentIndex + 1);
                    currentIndex = inputValue.indexOf("$(");
                }
            }
        }

        return variableNames;
    }

    private _getInputDefinition(inputId: string): TaskInputDefinition {
        let inputDefinition: TaskInputDefinition = null;

        if (this._taskDefinition && this._taskDefinition.inputs) {
            this._taskDefinition.inputs.forEach((input) => {
                if (input.name === inputId) {
                    inputDefinition = input;
                }
            });
        }

        return inputDefinition;
    }

    private _getInputType(inputDefinition: TaskInputDefinition): string {
        return inputDefinition ? DtcUtils.getTaskInputType(inputDefinition) : "";
    }

    private _getInputValue(inputId: string, inputDefinition: TaskInputDefinition): IPromise<YamlInput> {
        let value = this._inputs[inputId];
        let inputType: string = this._getInputType(inputDefinition);
        
        if (inputType === InputControlType.INPUT_TYPE_CONNECTED_SERVICE.toLowerCase() || inputType === InputControlType.INPUT_TYPE_AZURE_CONNECTION.toLowerCase()) {
            return this._getConnectedServiceInputValue(inputDefinition);
        }
        else {
            // for bash commmands if it uses filepath we need to add "./" before the file path
            if (inputId === YamlHelperConstants.TargetTypeInputName && value === YamlHelperConstants.TargetTypeInputFilePathValue)
            {
               // verify that there isn't a leading "./" on the associated path
               let path: string = this._inputs[value];
               if (path && path.trim().startsWith("./"))
               {
                   value = "";
               }
               else
               {
                   value = "./";
               }
            }
            return Q.resolve(new YamlInput(inputDefinition, value, this._multiplePhases, this._hasAlias));
        }
    }

    private _getConnectedServiceInputValue(inputDefinition: TaskInputDefinition): IPromise<YamlInput> {
        let inputId = inputDefinition.name;
        let inputValues = this._inputs[inputId].split(",");
        let connectionNamesPromises = [];
        // in case the value is comma separated list then get the connection name for each of the connection ids
        inputValues.forEach((inputValue: string) => {
            if (inputValue && inputValue.trim() !== empty)
            {
                connectionNamesPromises.push(this._getSingleConnectionServiceEndpointName(inputValue.trim()));
            }
        });

        return Q.all(connectionNamesPromises).then((connectionNames: string[]) => {
            let connectionName = empty;
            connectionNames.forEach((value: string) => {
                if (connectionName !== empty){
                    connectionName += ", ";
                }
                connectionName += value;
            });
            return new YamlInput(inputDefinition, connectionName, this._multiplePhases, this._hasAlias);
        });
    }

    private _getSingleConnectionServiceEndpointName(connectionId: string): IPromise<string> {
        return ConnectedServiceComponentUtility.getConnectedServiceOptions(connectionId, true, "Generic", "", {}).then((connectedServiceInputBaseState: IConnectedServiceInputStateBase) => {
            return ConnectedServiceComponentUtility.getValueFromKey(connectedServiceInputBaseState.optionsMap, connectionId);
        }, (error) => {
            return empty;
        });
    }

    private _getTaskVersion(taskVersion: string): string {
        let version: string = "";
        if (taskVersion) {
            let dotIndex = taskVersion.indexOf(".");
            if (dotIndex > -1) {
                version = taskVersion.substr(0, dotIndex);
            }
            else {
                version = taskVersion;
            }
        }
        return version;
    }

}

class YamlInput {
    private _name: string;
    private _value: string;

    constructor(inputDefinition: TaskInputDefinition, value: string, multiplePhases: boolean, doesTaskHasAlias: boolean) {
        this._name = (inputDefinition.aliases && inputDefinition.aliases.length > 0) ? inputDefinition.aliases[0] : inputDefinition.name;
        this._value = this._formatInputValue(value, multiplePhases, doesTaskHasAlias);
    }

    public getName(): string {
        return this._name;
    }

    public getValue(): string {
        return this._value;
    }

    private _formatInputValue(input: string, multiplePhases: boolean, doesTaskHasAlias: boolean): string {
        if (input.indexOf(lineFeed) > -1) {
            let newValue = "|";
            if (multiplePhases) {
                newValue = addTailingSpaces(newValue);
            }
            const lines = input.split(lineFeed);
            lines.forEach((line: string) => {
                if (doesTaskHasAlias && !multiplePhases)
                {
                    newValue += lineFeed + indent(line, 3);
                }
                else if (multiplePhases) {
                    newValue += lineFeed + indent(line, 7);
                }
                else
                {
                    newValue += lineFeed + indent(line, 5);
                }
            });

            return newValue;
        }
        else {
           return escapeValue(input);
        }
    }
}

function indent(input: string, count?: number): string {
    if (count) {
        while (count > 0) {
            input = YamlHelperConstants.singleSpace + input;
            count--;
        }

        return input;
    }
    else {
        return YamlHelperConstants.spaces + input;
    }
}

function addTailingSpaces(input: string): string {
    return input + YamlHelperConstants.spaces;
}

namespace YamlHelperConstants {
    export const spaces: string = "  ";
    export const singleSpace: string = " ";
    export const phaseProperty: string = "- phase: ";
    export const queueProperty: string = "queue:";
    export const serverProperty: string = "server";
    export const nameProperty: string = "name: ";
    export const phasesProperty: string = "phases:";
    export const demandsProperty: string = "demands";
    export const dependencyProperty: string = "dependsOn";
    export const stepsProperty: string = "steps";
    export const inputsProperty: string = "inputs";
    export const environmentVariablesProperty: string = "env";
    export const enabledProperty: string = "enabled";
    export const continueOnErrorProperty: string = "continueOnError";
    export const conditionProperty: string = "condition";
    export const timeoutInMinutesProperty: string = "timeoutInMinutes";
    export const displayNameProperty: string = "displayName";
    export const taskProperty: string = "- task";
    export const colon: string = ":";
    export const resourcesKey: string = "resources";
    export const ProcessCIKey: string = "process";
    export const repoKey: string = "- repo";
    export const cleanOption: string = "clean";
    export const lfsOption: string = "lfs";
    export const fetchDepthOption: string = "fetchDepth";
    export const PhaseCIKey: string = "phase";
    export const skipSyncValue: string = "none";
    export const syncSourcesValue: string = "self";
    export const TaskCIKey: string = "task";
    export const VariablesProperty: string = "variables";
    export const VariablePrefix: string = "$";
    export const ProcessParametersPrefix: string = "Parameters.";
    export const YamlFeatureContributionId: string = "ms.vss-ciworkflow.yaml-ci-feature";
    export const TasksAliasLookup: IDictionaryStringTo<string> = {"CmdLine@2": "- script", "PowerShell@2": "- powershell", "Bash@3": "- bash"};
    export const TargetTypeInputName: string = "targetType";
    export const TargetTypeInputInlineValue: string = "inline";
    export const TargetTypeInputFilePathValue: string = "filePath";
    export const PredefinedVariablesPrefixes: string[] = ["agent.", "build.", "common.", "release.", "system."];
    export const ScriptInputName: string = "script";
}

export function escapeValue(value): string {
    if (/[^A-Za-z0-9\./.]/.test(value))
    {
        return "'" + value.replace("'", "''") + "'";
    }

    return value;
}
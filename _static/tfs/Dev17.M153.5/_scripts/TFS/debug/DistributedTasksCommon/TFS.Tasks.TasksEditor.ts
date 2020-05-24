import ko = require("knockout");
import Q = require("q");

import VSS = require("VSS/VSS");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Number = require("VSS/Utils/Number");
import Utils_UI = require("VSS/Utils/UI");
import Combos = require("VSS/Controls/Combos");
import Context = require("VSS/Context");
import Contracts = require("VSS/Common/Contracts/Platform");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Grids = require("VSS/Controls/Grids");
import Service = require("VSS/Service");
import Events_Action = require("VSS/Events/Action");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import WebApi_Constants = require("VSS/WebApi/Constants");
import Diag = require("VSS/Diag");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");

import GroupedComboBox = require("VSSPreview/Controls/GroupedComboBox");

import TaskResources = require("DistributedTasksCommon/Resources/TFS.Resources.DistributedTasksLibrary");
import { AddAzureRmEndpointsModel, AddAzureRmEndpointsDialog, SpnCreateMethod } from "DistributedTasksCommon/ServiceEndpoints/AzureRMEndpointsManageDialog";
import { AddCustomConnectionsModel, AddCustomConnectionsDialog } from "DistributedTasksCommon/ServiceEndpoints/CustomEndpointsManageDialog";
import { GUIDUtils } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Utils";
import { ServiceEndpointType, ServiceEndpointDetails, EndpointAuthorizationSchemes } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Common";
import KnockoutPivot = require("DistributedTasksCommon/TFS.Knockout.HubPageExplorerPivot");

import DistributedTaskContracts = require("TFS/DistributedTask/Contracts");
import ServiceEndpointContracts = require("TFS/ServiceEndpoint/Contracts");
import CoreContracts = require("TFS/Core/Contracts");

import Types = require("DistributedTasksCommon/TFS.Tasks.Types");
import TaskEditorCommon = require("DistributedTasksCommon/TFS.Tasks.TasksEditor.Common");
import DistributedTaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
import DTCControls = require("DistributedTasksCommon/TFS.Tasks.Controls");
import TaskCommonDialogs = require("DistributedTasksCommon/TFS.Tasks.Common.Dialogs");
import TaskUtils = require("DistributedTasksCommon/TFS.Tasks.Utils");
import TaskVariables = require("DistributedTasksCommon/TFS.Tasks.Common.Variables");
import TaskTypes = require("DistributedTasksCommon/TFS.Tasks.Types");
import Adapters_Knockout = require("VSS/Adapters/Knockout");
import ExtensionsRestClient_NO_REQUIRE = require("VSS/ExtensionManagement/RestClient");

import Contributions_Contracts = require("VSS/Contributions/Contracts");
import Contributions_Services = require("VSS/Contributions/Services");
import SDK_Shim = require("VSS/SDK/Shim");

import Telemetry = require("VSS/Telemetry/Services");
import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
var delegate = Utils_Core.delegate;

import { MarkdownRenderer } from "ContentRendering/Markdown";
import Constants_Platform = require("VSS/Common/Constants/Platform");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

export class Constants {
    public static DisableManageLink: string = "DisableManageLink";
    public static PopulateDefaultValue: string = "PopulateDefaultValue";
}

export interface IPredicateRule {
    inputName: string;
    condition: string;
    expectedValue: string;
}

export interface IVisibilityRule {
    predicateRules: IPredicateRule[];
    operator: string;
}

export enum TasksMenuCommands {
    EnableAll,
    DisableAll,
    CreateMetaTask,
    ManageMetaTask,
}

export function convertTaskDefinitionInputsToTaskInstanceInputs(inputs: DistributedTaskContracts.TaskInputDefinition[]) {
    var obj = {};
    for (var i = 0; i < inputs.length; i++) {
        var input = inputs[i];
        if (input.defaultValue != undefined) {
            obj[input.name] = input.defaultValue;
        }
    }
    return obj;
}

export function getInputViewModel(inputDefinition: DistributedTaskContracts.TaskInputDefinition, taskDelegates?: KnockoutObservable<Types.ITaskDelegates>, getAllInputValue?: () => { [name: string]: string }): TaskInputDefinitionViewModel<any> {
    var inputViewModel: TaskInputDefinitionViewModel<any>;
    var inputType = inputDefinition.type.split(':')[0];
    switch (inputType) {
        case "filePath":
            inputViewModel = new FilePathInputDefinitionViewModel(inputDefinition, taskDelegates);
            break;
        case "artifactPath":
            inputViewModel = new ArtifactPathInputDefinitionViewModel(inputDefinition, taskDelegates);
            break;
        case "boolean":
            inputViewModel = new BooleanInputDefinitionViewModel(inputDefinition);
            break;
        case "azureConnection":
            inputViewModel = new AzureConnectionInputDefinitionViewModel(inputDefinition, false);
            break;
        case "connectedService":
            inputViewModel = _getConnectedService(inputDefinition);
            break;
        case "radio":
            inputViewModel = new RadioInputDefinitionViewModel(inputDefinition);
            break;
        case "pickList":
            inputViewModel = new PickListInputDefinitionViewModel(inputDefinition);
            break;
        case "multiLine":
            inputViewModel = new TextAreaInputDefinitionViewModel(inputDefinition, getAllInputValue, taskDelegates);
            break;
        case "stringList":
            inputViewModel = new MultipleStringInputDefinitionViewModel(inputDefinition);
            break;
        case "identities":
            inputViewModel = new MultiIdentityPickerDefinitionViewModel(inputDefinition);
            break;
        default:
            inputViewModel = new StringInputDefinitionViewModel(inputDefinition, getAllInputValue, taskDelegates);
            break;
    }
    return inputViewModel;
}

export class TaskInputVisibilityRule {
    private static _operatorAnd: string = "&&";
    private static _operatorOr: string = "||";

    private static getPredicateRule(visibleRule: string): IPredicateRule {
        var reg = /([a-zA-Z0-9 ]+)([!=<>]+)([a-zA-Z0-9. ]+)|([a-zA-Z0-9 ]+(?=NotContains|NotEndsWith|NotStartsWith))(NotContains|NotEndsWith|NotStartsWith)([a-zA-Z0-9. ]+)|([a-zA-Z0-9 ]+(?=Contains|EndsWith|StartsWith))(Contains|EndsWith|StartsWith)([a-zA-Z0-9. ]+)/g;
        var rule: IPredicateRule = null;
        var matches = reg.exec(visibleRule);
        if (matches && matches.length === 10) {
            if (!!matches[1]) {
                rule = {
                    inputName: matches[1].trim(),
                    condition: matches[2].trim(),
                    expectedValue: matches[3].trim()
                };
            } else if (!!matches[4]) {
                rule = {
                    inputName: matches[4].trim(),
                    condition: matches[5].trim(),
                    expectedValue: matches[6].trim()
                };
            } else {
                rule = {
                    inputName: matches[7].trim(),
                    condition: matches[8].trim(),
                    expectedValue: matches[9].trim()
                };
            }
        }
        return rule;
    }

    private static getPredicateResult(rule: IPredicateRule, valueToCheck: string): boolean {
        if (rule) {
            var expectedValue = rule.expectedValue;
            switch (rule.condition) {
                case "=":
                case "==":
                    return valueToCheck == expectedValue;
                case "!=":
                    return valueToCheck != expectedValue;
                case "<":
                    return valueToCheck < expectedValue;
                case ">":
                    return valueToCheck > expectedValue;
                case "<=":
                    return valueToCheck <= expectedValue;
                case ">=":
                    return valueToCheck >= expectedValue;
                case "Contains":
                    return (valueToCheck && valueToCheck.indexOf(expectedValue) >= 0);
                case "StartsWith":
                    return (valueToCheck && Utils_String.startsWith(valueToCheck, expectedValue, Utils_String.ignoreCaseComparer));
                case "EndsWith":
                    return (valueToCheck && Utils_String.endsWith(valueToCheck, expectedValue, Utils_String.ignoreCaseComparer));
                case "NotContains":
                    return !(valueToCheck && valueToCheck.indexOf(expectedValue) >= 0);
                case "NotStartsWith":
                    return !(valueToCheck && Utils_String.startsWith(valueToCheck, expectedValue, Utils_String.ignoreCaseComparer));
                case "NotEndsWith":
                    return !(valueToCheck && Utils_String.endsWith(valueToCheck, expectedValue, Utils_String.ignoreCaseComparer));
            }
        }
        return false;
    }

    public static getVisibilityRule(visibleRule: string): IVisibilityRule {
        var rule: IVisibilityRule = null;
        if (visibleRule) {
            if (visibleRule.indexOf(this._operatorAnd) !== -1) {
                var rules = visibleRule.split(this._operatorAnd);
                var predicateRules = rules.map(this.getPredicateRule);
                rule = {
                    operator: this._operatorAnd,
                    predicateRules: predicateRules
                };
            }
            else if (visibleRule.indexOf(this._operatorOr) !== -1) {
                var rules = visibleRule.split(this._operatorOr);
                var predicateRules = rules.map(this.getPredicateRule);
                rule = {
                    operator: this._operatorOr,
                    predicateRules: predicateRules
                };
            }
            else {
                var predicateRule = this.getPredicateRule(visibleRule);
                rule = {
                    operator: null,
                    predicateRules: [predicateRule]
                };
            }
        }
        return rule;
    }

    public static getVisibility(visibilityRule: IVisibilityRule, dependentInputs: TaskInputDefinitionViewModel<any>[]): boolean {
        var result: boolean = visibilityRule.operator === this._operatorAnd;
        for (var i = 0; i < visibilityRule.predicateRules.length; i++) {
            var predicateRule = visibilityRule.predicateRules[i];
            var dependentInputVM = Utils_Array.first(dependentInputs, (dependentInput: TaskInputDefinitionViewModel<any>) => {
                return Utils_String.equals(dependentInput.name(), predicateRule.inputName, true);
            });
            if (dependentInputVM) {
                // for inputs that are dependent on sourced inputs, let's ignore visiblity
                var isInputVisible = dependentInputVM.isVisible() || dependentInputVM.sourced;
                if (!isInputVisible) {
                    result = this._evaluate(result, isInputVisible, visibilityRule.operator);
                }
                else {
                    var predicateResult = this.getPredicateResult(predicateRule, dependentInputVM.getValue());
                    result = this._evaluate(result, predicateResult, visibilityRule.operator);
                }
            }
            else {
                result = false;
                break;
            }
        }

        return result;
    }

    private static _evaluate(expr1: boolean, expr2: boolean, operator: string): boolean {
        if (operator === this._operatorAnd) {
            return expr1 && expr2;
        }
        else if (operator === this._operatorOr) {
            return expr1 || expr2;
        } else if (operator === null) {
            // Single condition, no operator
            return expr2;
        }
    }
}

function _getConnectedService(inputDefinition: DistributedTaskContracts.TaskInputDefinition): TaskInputDefinitionViewModel<any> {
    if (Utils_String.startsWith(inputDefinition.type, "connectedService:")) {
        var endpointTypeValues = inputDefinition.type.split(':');
        var type = inputDefinition.type.split(':')[1] || "";
        var authSchemes = inputDefinition.type.split(':')[2] || "";
        return Utils_String.ignoreCaseComparer(type, ServiceEndpointType.AzureRM) === 0
            && Context.getPageContext().webAccessConfiguration.isHosted
            ? new ConnectedServiceAzureRMInputDefinitionViewModel(inputDefinition, true, authSchemes)
            : new ConnectedServiceInputDefinitionViewModel(inputDefinition, type.toLowerCase(), true, authSchemes);
    }

    return new StringInputDefinitionViewModel(inputDefinition);
}

/**
 * Abstract base viewmodel for an option input.
 */
export class BaseInputViewModel extends DistributedTaskModels.ChangeTrackerModel {
    /**
     * The label text
     */
    public label: KnockoutObservable<string>;

    /**
     * The input name
     */
    public name: KnockoutObservable<string>;

    /**
    * The template name
    */
    public templateName: string;

    /**
     * Indicates whether the input is required, changes if the group to which it belongs is invisible
     */
    public required: KnockoutObservable<boolean>;

    /**
     * The input type
     */
    public type: string;

    /**
    * Helper MarkDown for the input
    */
    public helpMarkDown: KnockoutObservable<string>;

    /**
     * Properties specific to this control.
     */
    public properties: { [key: string]: string; };

    /**
    * Does this input have a source-endpoint attached?
    */
    public sourced: boolean;

    /**
    * Add Service Endpoint link for the input
    */
    public showAddServiceEndpointLink: KnockoutObservable<boolean>;

    /**
    * Manage link for the input
    */
    public manageLink: KnockoutObservable<string>;

    /**
    * Is this input editable
    */
    public editable: KnockoutObservable<boolean> = ko.observable(true);

    /**
    * Determines the visiblity of the input
    */
    public isVisible: KnockoutComputed<boolean>;

    /**
    * id for the label
    */
    public labelId: KnockoutComputed<string>;

    /**
     * Creates a new viewmodel from a data contract
     * @param inputDefinition The data contract
     */
    constructor(inputDefinition: DistributedTaskContracts.TaskInputDefinition) {
        super();

        this.type = inputDefinition.type;
        this.label = ko.observable(inputDefinition.label);
        this.name = ko.observable(inputDefinition.name);
        this.templateName = "";
        this.required = ko.observable(inputDefinition.required || false);
        this.helpMarkDown = ko.observable(inputDefinition.helpMarkDown || "");

        if (inputDefinition.helpMarkDown) {
            if (FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.MarkdownRendering)) {
                let renderer = new MarkdownRenderer({ html: true });
                this.helpMarkDown(renderer.renderHtml(inputDefinition.helpMarkDown));
            }
            else {
                TaskUtils.PresentationUtils.marked(inputDefinition.helpMarkDown).then((markedString: string) => {
                    this.helpMarkDown(markedString);
                });
            }
        }

        this.sourced = false;
        this.properties = inputDefinition.properties || {};
        this.showAddServiceEndpointLink = ko.observable(false);
        this.manageLink = ko.observable("");

        this.isVisible = ko.computed({
            read: () => {
                return true;
            },
            write: (value: boolean) => {
                return value;
            }
        });

        this.labelId = ko.computed(() => {
            return this.name() + "-id";
        });
    }

    /**
     * Updates input value with the specified value.
     *
     * @param value New input value.
     */
    public update(value: string): void {
    }

    /**
     * Resets the input value by updating the value to default.
     */
    public reset(): void {
    }

    /**
     * Gets the value of the input.
     */
    public getValue(): string {
        return "";
    }

    /**
     * Gets the observable value of the input
     */
    public getObservableValue(): any {
        return null;
    }

    /**
    * Gets group name of the input, empty if doesn't exists
    */
    public getGroupName(): string {
        return "";
    }

    /**
     * Gets any possible static data in the control
     */
    public getData(): any {
        return {};
    }

    /**
     * Determines the invalid state of the input
     */
    public isInvalid(): boolean {
        return false;
    }

    /**
    * Refresh this model if there is a source (url) attached to it
    */
    public refresh(): void {
        // na-da
    }

    public static getDistributedTasksHttpClient(): DistributedTaskModels.ConnectedServicesClientService {
        if (!BaseInputViewModel._httpClient) {
            var webContext: Contracts.WebContext = Context.getDefaultWebContext();
            var vssConnection: Service.VssConnection = new Service.VssConnection(webContext);

            BaseInputViewModel._httpClient = vssConnection.getService<DistributedTaskModels.ConnectedServicesClientService>(
                DistributedTaskModels.ConnectedServicesClientService);
        }
        return BaseInputViewModel._httpClient;
    }

    private static _httpClient: DistributedTaskModels.ConnectedServicesClientService;
}

/**
 * Base Input Definition View Model
 */
export class InputDefinitionViewModel<TOriginalValue, TDisplayValue> extends BaseInputViewModel {
    /**
     * Default value of the input.
     */
    _defaultValue: string;

    /**
     * Original value of the input.
     */
    _value: TOriginalValue;


    /**
     * Initial value from inputDefinition for if the input is required
     */
    private _isRequiredInitial: boolean;

    /**
     * Current value of the input.
     */
    public value: KnockoutObservable<TDisplayValue>;

    /*
    * Any predicate rule associated with the input
     */
    public predicateRule: IPredicateRule;

    /*
    * Any predicate rule associated with the input
     */
    public visibilityRule: IVisibilityRule;

    /**
    * All of the inputs with predicates, this particular input is dependent on - currently there would be only ONE, since we allow only one visible rule
     */
    public dependentInputsModel: KnockoutObservableArray<TaskInputDefinitionViewModel<any>>;

    /**
    * Delegate to obtain all input values for the particular task
     */
    public getAllInputValue: () => { [name: string]: string };

    /**
    * Value of the groupname
    */
    private _groupName: string;

    /**
     * Creates a new viewmodel from a data contract
     * @param inputDefinition The data contract
     */
    constructor(inputDefinition: DistributedTaskContracts.TaskInputDefinition) {
        super(inputDefinition);
        this._isRequiredInitial = inputDefinition.required;
        this._defaultValue = inputDefinition.defaultValue || "";
        this._setDefaultValue();
        this.visibilityRule = TaskInputVisibilityRule.getVisibilityRule(inputDefinition.visibleRule);
        this._groupName = inputDefinition.groupName || "";
        this.dependentInputsModel = ko.observableArray([]);
        this.isVisible = ko.computed({
            read: () => {
                if (this.visibilityRule) {
                    var dependentInputs = this.dependentInputsModel();
                    return TaskInputVisibilityRule.getVisibility(this.visibilityRule, dependentInputs);
                } else {
                    return true;
                }
            },
            write: (value: boolean) => {
                return value;
            }
        });
    }

    /**
     * See base.
     */
    _initializeObservables(): void {
        super._initializeObservables();
        this._setDefaultValue();
    }

    private _setDefaultValue() {
        this._value = this._parseValue(this._defaultValue);
        var valueToStore = this._convertValue(this._value);
        if (this.value) {
            this.value(valueToStore);
        }
        else {
            this.value = ko.observable(valueToStore);
        }
    }

    /**
     * See base.
     */
    public update(value: string): void {
        // Set original value to the specified value.
        this._value = this._parseValue(value || "");

        // Set current value.
        this._update(this._value);
    }

    private _update(value: TOriginalValue): void {
        this.value(this._convertValue(value));
    }

    /**
     * See base.
     */
    public reset(): void {
        this.update(this._defaultValue);
    }

    /**
     * See base.
     */
    public revert(): void {
        this._update(this._value);
    }

    /**
     * See base.
     */
    public getValue(): string {
        return null;
    }

    /**
     * See base.
     */
    public getObservableValue(): KnockoutObservable<TDisplayValue> {
        return this.value;
    }

    /**
     * Sets the required field of the input, based on the parent group visibility
     * @param Group : the parent group of this input
     */
    public updateParentGroupVisibility(parentGroupVisibility: boolean) {
        this.required(this._isRequiredInitial && parentGroupVisibility);
    }

    /**
     * See base.
     */
    _isDirty(): boolean {
        return false;
    }

    /**
     * Converts the specified string value to original value.
     *
     * @param value String representation of the value.
     * @return Value of the string.
     */
    _parseValue(value: string): TOriginalValue {
        // Derivatives implement this
        return null;
    }

    /**
     * Converts the original value to display value.
     *
     * @param value Value of original type.
     * @return String representation of the value.
     */
    _convertValue(value: TOriginalValue): TDisplayValue {
        return <any>value;
    }

    /**
     * Gets the group name of the input, empty if doesn't exist
     */

    public getGroupName(): string {
        return this._groupName;
    }

    public onRefresh(data: string[]): void {
    }
}

/**
 * Viewmodel for task input definitions
 */
export class TaskInputDefinitionViewModel<TValue> extends InputDefinitionViewModel<TValue, TValue> {
    constructor(inputDefinition: DistributedTaskContracts.TaskInputDefinition) {
        super(inputDefinition);
    }
}

/**
 * View model for string input definitions
 */
export class StringInputDefinitionViewModel extends TaskInputDefinitionViewModel<string> {
    private _invalid: KnockoutObservable<boolean>;
    private _label: string;
    private _defaultNumOfRows = 2;
    private _editorExtension: Contributions_Contracts.Contribution;
    private _displayFormatTemplateString;
    private _editorExtensionDelegates: KnockoutObservable<Types.ITaskEditorExtensionDelegates>;
    public rows: KnockoutObservable<number>;
    public maxLength: KnockoutObservable<string>;
    public resizable: KnockoutObservable<string>;
    public isNonNegativeNumber: KnockoutObservable<boolean>;
    public hasEditorExtension: KnockoutObservable<boolean>;
    public hasDisplayFormat: KnockoutObservable<boolean>;
    public displayString: KnockoutObservable<string>;


    /**
     * Create a new viewmodel from a data contract
     * @param inputDefinition The data contract
     */
    constructor(inputDefinition: DistributedTaskContracts.TaskInputDefinition, getAllInputValue?: () => { [name: string]: string }, taskDelegates?: KnockoutObservable<Types.ITaskDelegates>) {
        super(inputDefinition);
        this.getAllInputValue = getAllInputValue;
        this.hasEditorExtension = ko.observable(false);
        this.displayString = ko.observable("");
        this.hasDisplayFormat = ko.observable(false);
        this._displayFormatTemplateString = "";
        this._invalid = ko.observable(false);
        this._label = this.label();

        if (taskDelegates && taskDelegates().editorExtensionDelegates) {
            this._editorExtensionDelegates = taskDelegates().editorExtensionDelegates;
        }

        this._invalid.subscribe((value) => {
            if (value) {
                this.label(Utils_String.format(TaskResources.Task_InvalidSectionName, this._label));
            }
            else {
                this.label(this._label);
            }
        });

        // Number of rows
        this.rows = ko.observable(this._defaultNumOfRows);
        if (inputDefinition.properties && inputDefinition.properties["rows"]) {
            var numOfRows = parseInt(inputDefinition.properties["rows"]);

            // Checking for NaN and negative values.
            numOfRows = numOfRows > 0 ? numOfRows : this._defaultNumOfRows
            this.rows(numOfRows);
        }

        // Max Length of the textbox
        this.maxLength = ko.observable("")
        if (inputDefinition.properties && inputDefinition.properties["maxLength"]) {
            var maxLength = parseInt(inputDefinition.properties["maxLength"]);

            // Checking for NaN and negative values.
            var maxLengthStr = maxLength > 0 ? maxLength.toString() : "";
            this.maxLength(maxLengthStr);
        }

        // Resize property of the textbox
        this.resizable = ko.observable("none");
        if (inputDefinition.properties && inputDefinition.properties["resizable"]) {
            var resizable = (inputDefinition.properties["resizable"]) == "true" ? true : false
            this.resizable(resizable ? "vertical" : "none");
        }

        this.isNonNegativeNumber = ko.observable(false);
        if (inputDefinition.properties && inputDefinition.properties["isNonNegativeNumber"]) {
            var isNumber = (inputDefinition.properties["isNonNegativeNumber"]) == "true" ? true : false
            this.isNonNegativeNumber(isNumber);
        }

        //only enable if the type is multiline or string and editorExtension has a value
        if ((!!inputDefinition.properties && !!inputDefinition.properties["editorExtension"]) &&
            (inputDefinition.type === "multiLine" || inputDefinition.type === "string")) {
            var contributionPromise = Service.getService(Contributions_Services.ExtensionService).getContributionsForTarget("ms.vss-distributed-task.task-input-editors");
            contributionPromise.then((contributions: Contributions_Contracts.Contribution[]) => {
                var filteredContributions = contributions.filter((contributionItem: Contributions_Contracts.Contribution) => {
                    return (contributionItem.id == this.properties["editorExtension"]);
                });
                if (filteredContributions.length > 0) {
                    this.hasEditorExtension(true);
                    this._editorExtension = filteredContributions[0];
                    if (!!inputDefinition.properties["displayFormat"]) {
                        this._displayFormatTemplateString = inputDefinition.properties["displayFormat"];
                        this.hasDisplayFormat(true);
                        this.resolveTemplateDisplayString(this.value());
                    }
                }
            });
        }
    }

    public onEditorExtensionClick(evt: StringInputDefinitionViewModel) {
        if (this._editorExtension) {
            SDK_Shim.VSS.getService("ms.vss-web.dialog-service").then((dialogService: IHostDialogService) => {
                var contributionInstance;
                var extendedInputField = this;
                var contributionId = this._editorExtension.id;
                var allInputValues: { [key: string]: string; } = this.getAllInputValue();
                var extensionDelegates = this._editorExtensionDelegates ? this._editorExtensionDelegates() : null;
                // Add telemetry
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                    TaskModels.CustomerIntelligenceInfo.Area,
                    TaskModels.CustomerIntelligenceInfo.FeatureInputEditorExtension,
                    {
                        "extensionId": contributionId,
                        "TaskInputEditorExtensionClick": 1
                    }));

                // Show dialog
                var dialogOptions = {
                    title: this._label,
                    resizable: false,
                    modal: true,
                    height: 600,
                    width: 550,
                    cancelText: "Cancel",
                    okText: "OK",
                    okCallback: function (result) {
                        extendedInputField.value(result);
                        extendedInputField.resolveTemplateDisplayString(result);
                    },
                    getDialogResult: function () {
                        return contributionInstance.onOkClicked();
                    }
                };
                dialogService.openDialog(contributionId, dialogOptions, { target: this.name(), inputValues: allInputValues, extensionDelegates: extensionDelegates }).then(function (dialog) {
                    dialog.updateOkButton(true);
                    dialog.getContributionInstance(contributionId).then(function (inputEditorInstance) {
                        contributionInstance = inputEditorInstance;
                    });
                });
            });
        }
    }

    public getValue(): string {
        let value = this.value();
        value = value ? value.trim() : "";
        return value;
    }

    _isDirty(): boolean {
        return Utils_String.defaultComparer(this.value(), this._value) !== 0;
    }

    _parseValue(value: string): string {
        return value;
    }

    public isInvalid(): boolean {
        if (this.required()) {
            var value = this.getValue().trim();
            if (value === "") {
                this._invalid(true);
                return true;
            }
            else {
                if (this.isNonNegativeNumber() && !this.isValidNonNegativeNumber(value)) {
                    this._invalid(true);
                    return true;
                }

                this._invalid(false);
                return false;
            }
        }
        return false;
    }

    public onRefresh(data: string[]): void {
    }

    private isValidNonNegativeNumber(value: any): boolean {
        if (value == 0) {
            return true;
        }

        return Utils_Number.isPositiveNumber(value);
    }

    private resolveTemplateDisplayString(value: string): void {
        if (this.hasDisplayFormat()) {
            //if value is the JSON string then resolve the templatized string. Otherwise display the string as it is.
            try {
                var obj = JSON.parse(value);
                Contributions_Services.ExtensionHelper.resolveTemplateString(
                    this._displayFormatTemplateString, obj).then((_value: string) => {
                        this.displayString(_value);
                    }, (error: any) => {
                        //when mustache is not able to resolve the template string.
                        //in this case display the original value as it is.
                        this.displayString(value);
                    });
            }
            catch (e) {
                //Control comes to catch part if value is not the JSON string
                this.displayString(value);
            }
        }
    }
}

/**
 * View model for text area input definitions
 */
export class TextAreaInputDefinitionViewModel extends StringInputDefinitionViewModel {
    /**
     * Create a new viewmodel from a data contract
     * @param inputDefinition The data contract
     */
    constructor(inputDefinition: DistributedTaskContracts.TaskInputDefinition, getAllInputValue?: () => { [name: string]: string }, taskDelegates?: KnockoutObservable<Types.ITaskDelegates>) {
        super(inputDefinition, getAllInputValue, taskDelegates);
        this.resizable("vertical");
    }
}

/**
 * View model for multiple-string input definitions
 * Displays one textbox but treats the value as a comma-delimited array of strings
 */
export class MultipleStringInputDefinitionViewModel extends InputDefinitionViewModel<string[], string> {
    constructor(inputDefinition: DistributedTaskContracts.TaskInputDefinition) {
        super(inputDefinition);
    }

    public getValue(): string {
        return JSON.stringify(this._getValues());
    }

    _isDirty(): boolean {
        return !Utils_Array.arrayEquals(this._value, this._getValues(),
            (s: string, t: string) => {
                return Utils_String.localeIgnoreCaseComparer(s, t) === 0;
            });
    }

    _parseValue(value: string): string[] {
        return this._fixValues(value ? <string[]>JSON.parse(value) : []);
    }

    _convertValue(value: string[]): string {
        return (value || []).join(", ");
    }

    private _fixValues(values: string[]): string[] {
        // Ensure array
        values = values || [];

        // Skip empty values
        values = values.filter((v: string) => {
            return !!v;
        });

        // Skip recurring values
        var map: { [id: string]: boolean } = {};
        var resultValues: string[] = [];
        $.each(values, (i: number, value: string) => {
            var valueLower = value.toLowerCase();
            if (!map[valueLower]) {
                map[valueLower] = true;
                resultValues.push($.trim(value));
            }
        });

        return resultValues;
    }

    private _getValues(): string[] {
        var value = $.trim(this.value());
        return value ? this._fixValues(this.value().split(",")) : [];
    }
}

/**
 * View model for file path input definitions
 */
export class FilePathInputDefinitionViewModel extends StringInputDefinitionViewModel {
    /**
     * Create a new viewmodel from a data contract
     * @param inputDefinition The data contract
     * @param taskDelgates Task Delgates observable
     */
    constructor(inputDefinition: DistributedTaskContracts.TaskInputDefinition, taskDelegates: KnockoutObservable<Types.ITaskDelegates>) {
        super(inputDefinition);
        this._taskDelegates = taskDelegates;
    }

    public supportsFilePathPicker(): boolean {
        var delegates = this._taskDelegates();
        return !!delegates && !!delegates.filePathProviderDelegate;
    }

    public onSourcePickerClick(evt: JQueryEventObject) {
        var delegates = this._taskDelegates();
        if (delegates && delegates.filePathProviderDelegate) {
            delegates.filePathProviderDelegate(this.value(), (node) => {
                this.value(node.path);
            });
        }
    }

    private _taskDelegates: KnockoutObservable<Types.ITaskDelegates>;
}

/**
 * View model for artifact path input definitions
 */
export class ArtifactPathInputDefinitionViewModel extends StringInputDefinitionViewModel {
    /**
     * Create a new viewmodel from a data contract
     * @param inputDefinition The data contract
     * @param taskDelgates Task Delgates observable
     */
    constructor(inputDefinition: DistributedTaskContracts.TaskInputDefinition, taskDelegates: KnockoutObservable<Types.ITaskDelegates>) {
        super(inputDefinition);
        this._taskDelegates = taskDelegates;
    }

    public supportsArtifactPathPicker(): boolean {
        var delegates = this._taskDelegates();
        return !!delegates && !!delegates.artifactPathProviderDelegate;
    }

    public onArtifactPickerClick(evt: JQueryEventObject) {
        var delegates = this._taskDelegates();
        if (delegates && delegates.artifactPathProviderDelegate) {
            delegates.artifactPathProviderDelegate(this.value(), (node) => {
                this.value(node.path);
            });
        }
    }

    private _taskDelegates: KnockoutObservable<Types.ITaskDelegates>;
}

/**
* Viewmodel for identity picker
*/

export class MultiIdentityPickerDefinitionViewModel extends MultipleStringInputDefinitionViewModel {
    constructor(inputDefinition: DistributedTaskContracts.TaskInputDefinition) {
        super(inputDefinition);
    }
}

export class ConnectedServiceInputDefinitionViewModel extends StringInputDefinitionViewModel {
    public connectionPromise: IPromise<any>;
    public kind: string;
    public enableRefresh: boolean = true;
    public RefreshText: string = TaskResources.Refresh;
    public connectedServiceDetails: IDictionaryStringTo<ServiceEndpointContracts.ServiceEndpoint> = {};
    public connectedServicesDeferred: Q.Deferred<IDictionaryStringTo<ServiceEndpointContracts.ServiceEndpoint>> = Q.defer<IDictionaryStringTo<ServiceEndpointContracts.ServiceEndpoint>>();
    public createdEndpoint: KnockoutObservable<ServiceEndpointContracts.ServiceEndpoint> = ko.observable(null);
    public endpointCreatedSuccessCallback(serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) {
        this.createdEndpoint(serviceEndpoint);
    }

    /**
         * Create a new viewmodel from a data contract
         * @param inputDefinition The data contract
                * @param kind Kind of the connectioned service
                * @useConnectedServiceKind determines whether to use connected service kinds, defaults to true
         */
    constructor(inputDefinition: DistributedTaskContracts.TaskInputDefinition, kind: string, useConnectedServiceKind: boolean = true, authSchemes: string = "", disableMultiSelect: boolean = false) {
        super(inputDefinition);

        this._useConnectedServiceKind = useConnectedServiceKind;

        this.kind = kind;
        if (authSchemes) {
            this._authSchemes = authSchemes.split(",");
        }

        var type = inputDefinition.type || "";
        if (type.split(":").length > 2) {
            this.type = type.substr(0, type.lastIndexOf(":"));
        }

        if (disableMultiSelect === false) {
            var properties = inputDefinition.properties;
            if (properties && properties['MultiSelectFlatList'] && properties['MultiSelectFlatList'].toLowerCase() === 'true') {
                this._isMultiSelect = true;
            }
        }

        this._initPromise();

        this._addDisposable(this.createdEndpoint.subscribe((endpoint) => {
            if (endpoint && endpoint.id) {
                var data = this._environmentsMap();
                data[endpoint.id] = endpoint.name;
                if (this._isMultiSelect) {
                    var currentValues = this.value().split(",");
                    currentValues.push(endpoint.id);
                    this.value(currentValues.join(","));
                } else {
                    this.value(endpoint.id);
                }
            }
        }));

        // Hide add service endpoint link for internal endpoint types
        if (Utils_String.equals(this.kind, ServiceEndpointType.Generic, true)
            || Utils_String.equals(this.kind, ServiceEndpointType.ExternalGit, true)
            || Utils_String.equals(this.kind, ServiceEndpointType.GitHub, true)
            || Utils_String.equals(this.kind, ServiceEndpointType.GitHubEnterprise, true)
            || Utils_String.equals(this.kind, ServiceEndpointType.SSH, true)
            || Utils_String.equals(this.kind, ServiceEndpointType.Subversion, true)
            || (Context.getPageContext().webAccessConfiguration.isHosted && Utils_String.equals(this.kind, ServiceEndpointType.AzureRM, true))) { // AzureRM View model decides when to show the add link
            this.showAddServiceEndpointLink(false);
        }
        else {
            var httpClient = BaseInputViewModel.getDistributedTasksHttpClient();
            this._serviceEndpointTypesPromise = httpClient.beginGetServiceEndpointTypes(this.kind);

            this._serviceEndpointTypesPromise.then((endpointTypes: ServiceEndpointContracts.ServiceEndpointType[]) => {
                if (!!endpointTypes && endpointTypes.length >= 1) {
                    this._endpointType = endpointTypes[0];

                    if (!!this._authSchemes) {
                        this._endpointType.authenticationSchemes = this._endpointType.authenticationSchemes.filter((value: ServiceEndpointContracts.ServiceEndpointAuthenticationScheme) => {
                            return Utils_Array.contains(this._authSchemes, value.scheme, Utils_String.localeIgnoreCaseComparer);
                        });
                    }

                    if (!!this._endpointType.authenticationSchemes && this._endpointType.authenticationSchemes.length >= 1) {
                        this.showAddServiceEndpointLink(true);
                    }
                }
            }, (error) => {
                this.showAddServiceEndpointLink(false);
            });
        }

        TaskUtils.PresentationUtils.getActionUrl("", "services", { "area": "admin" }).then((actionUrl: string) => {
            if (!!this.value()) {
                var value = this.value().toString();
                if (this._isMultiSelect) {
                    value = value.split(",")[0];
                }

                this.manageLink(actionUrl.concat("?resourceId=", value));
            }
            else {
                this.manageLink(actionUrl);
            }
        });
    }

    public getData(): KnockoutObservable<any> {
        return this._environmentsMap;
    }

    public addServiceEndpoint() {
        if (Utils_String.equals(this.kind, ServiceEndpointType.AzureRM, true)) {
            var azureEndpointDialogModel;
            azureEndpointDialogModel = new AddAzureRmEndpointsModel(delegate(this, this.endpointCreatedSuccessCallback), { spnCreateMethod: SpnCreateMethod.Manual });

            Dialogs.show(AddAzureRmEndpointsDialog, azureEndpointDialogModel);
        }
        else {
            var customEndpointDialogModel = new AddCustomConnectionsModel(this._endpointType, "", null, this._endpointType.authenticationSchemes[0].scheme, false, delegate(this, this.endpointCreatedSuccessCallback));
            Dialogs.show(AddCustomConnectionsDialog, customEndpointDialogModel);
        }
    }

    public refresh() {
        this._initPromise();
    }

    private _initPromise() {
        var httpClient = BaseInputViewModel.getDistributedTasksHttpClient();
        if (this._useConnectedServiceKind) {
            this.connectionPromise = httpClient.beginGetServiceEndpoints(this.kind, this._authSchemes);
        }
        else {
            this.connectionPromise = httpClient.beginGetSubscriptionNames();
        }
        this.connectionPromise.then((services: any[]) => {
            var data = this._environmentsMap();
            data = {};
            services.forEach((service: any) => {
                // Note: if isTaskNewType is true, we use Distributed Task to get connectedservices/ serviceendpoints
                // Before ConnectedServiceKind, using beginGetSubscriptionNames, ConnectedServiceWebApiData's "id" would be the NAME and "name" would be FRIENDLYNAME
                var id = "";
                var name = "";
                if (this._useConnectedServiceKind) {
                    var serviceWebApi: ServiceEndpointContracts.ServiceEndpoint = service;
                    id = serviceWebApi.id;
                    name = serviceWebApi.name;
                }
                else {
                    //ConnectedServiceMetadata, old one
                    var serviceMetadata: Types.ConnectedServiceMetadata = service;
                    id = serviceMetadata.name;
                    name = serviceMetadata.friendlyName;
                }
                this.connectedServiceDetails[id] = service;
                data[id] = name;
            });

            var currentValues = this.getValue();
            if (currentValues) {
                var splitValues = currentValues.split(",");
                var missingValues = splitValues.filter(value => !data[value] && !TaskUtils.VariableExtractor.containsVariable(value));
                if (missingValues && missingValues.length > 0) {
                    httpClient.beginGetServiceEndpoints(this.kind, this._authSchemes, missingValues).then((serviceEndpoints: ServiceEndpointContracts.ServiceEndpoint[]) => {
                        if (serviceEndpoints) {
                            serviceEndpoints.forEach((service) => {
                                var serviceId = service.id;
                                this.connectedServiceDetails[serviceId] = service;
                                data[serviceId] = service.name;
                            });
                            this._environmentsMap(data);
                        }
                        this.connectedServicesDeferred.resolve(this.connectedServiceDetails);
                        var allValues = splitValues.filter(v => missingValues.indexOf(v) < 0).concat(serviceEndpoints.map(s => s.id));
                        this.value(allValues.join(","));
                    }, (reason) => {
                        this.connectedServicesDeferred.reject(reason);
                        Diag.logError(reason);
                        VSS.handleError({ name: "", message: reason });
                    });
                } else {
                    this._environmentsMap(data);
                    this.connectedServicesDeferred.resolve(this.connectedServiceDetails);
                }
            } else {
                this._environmentsMap(data);
                this.connectedServicesDeferred.resolve(this.connectedServiceDetails);
            }
        }, (error) => {
            this.connectedServicesDeferred.reject(error);
            Diag.logError(error);
            VSS.handleError(error);
        });
    }

    private _endpointType: ServiceEndpointContracts.ServiceEndpointType = null;
    private _useConnectedServiceKind: boolean;
    private _environmentsMap: KnockoutObservable<any> = ko.observable({});
    private _authSchemes: string[];
    private _serviceEndpointTypesPromise: IPromise<ServiceEndpointContracts.ServiceEndpointType[]>;
    private _isMultiSelect: boolean = false;
}

export class ConnectedServiceAzureRMInputDefinitionViewModel extends ConnectedServiceInputDefinitionViewModel {
    public isAuthorizeEnabled: KnockoutObservable<boolean> = ko.observable(true);
    public selectedSubscription: KnockoutObservable<DistributedTaskContracts.AzureSubscription> = ko.observable(null);
    public isLoaded: KnockoutObservable<boolean> = ko.observable(false);
    public static AZURERM_INPUTDEFINITION_CONTROL_ID: string = "ConnectedServiceAzureRMInputDefinition";

    constructor(inputDefinition: DistributedTaskContracts.TaskInputDefinition, useConnectedServiceKind: boolean = true, authSchemes: string = "") {
        super(inputDefinition, ServiceEndpointType.AzureRM, useConnectedServiceKind, authSchemes, true);

        // turn off the add link
        this.showAddServiceEndpointLink(false);

        this._initializePromise();

        this._addDisposable(this.createdEndpoint.subscribe((endpoint) => {
            if (endpoint && endpoint.id) {
                // endpoint is created through add link, update the endpoint data source and the group combo display text
                this.updateEndpoint(endpoint);
            }
        }));
    }

    private updateEndpoint(endpoint: ServiceEndpointContracts.ServiceEndpoint) {
        var endpoints = this._endpoints();
        endpoints[endpoint.id] = endpoint;

        var data: GroupedComboBox.IGroupedDataItem<string>[] = this._groupDataItem();
        var endpointData = Utils_String.localeIgnoreCaseComparer(data[0].title, TaskResources.AzureRMAvailableServiceConnections) === 0 ? data[0].items : data[1].items;
        endpointData.push(endpoint.id);

        this.value(endpoint.id);
    }

    public getEndpoints(): KnockoutObservable<any> {
        return this._endpoints;
    }

    public getSubscriptions(): KnockoutObservable<any> {
        return this._subscriptions;
    }

    public getGroupDataItem(): KnockoutObservable<any[]> {
        return this._groupDataItem;
    }

    public refresh() {
        super.refresh();
        this._initializePromise();
    }

    public isAuthorizeVisible(): boolean {
        var isVisible: boolean = this.selectedSubscription() !== null;

        // Update help mark down text when enabling authorize button
        TaskUtils.PresentationUtils.marked(isVisible ? TaskResources.AuthorizeToCreateAzureRMEndpointHelpText : TaskResources.AzureRMEndpointHelpText).then((markedString) => {
            this.helpMarkDown(markedString);
        });

        return isVisible;
    }

    public isInvalid(): boolean {

        var value: string = this.getValue();

        // If user has specified some value, even if the input is optional check if the value is correct.
        if (value === "") {
            if (this.required()) {
                return true;
            }
            else {
                return false;
            }
        }

        if (TaskUtils.VariableExtractor.containsVariable(value)) {
            return false;
        }

        // if endpoint created through add link, set it to false
        if (this.createdEndpoint()) {
            return false;
        }

        // There are two calls made before rendering the content of the combo box and it could take time to load.
        // If the request takes more time we will not set the task to be invalid, otherwise opening an existing definition with saved data will render the control as invalid first and it will be marked red until the request is complete
        return !this.isLoaded() || this._endpoints()[value] ? false : true;
    }

    private _initializePromise() {
        var httpClient = BaseInputViewModel.getDistributedTasksHttpClient();
        this.azuresubscriptionPromise = httpClient.beginGetAzureSubscriptions();
        this.isLoaded(false);

        Q.spread([this.connectionPromise, this.azuresubscriptionPromise],
            (serviceEndpoints: ServiceEndpointContracts.ServiceEndpoint[], azureSubscriptions: DistributedTaskContracts.AzureSubscriptionQueryResult) => {
                var azureSubscriptionsText: string[] = [];
                var endpointsText: string[] = [];
                var subscriptionIdToendpoints: IDictionaryStringTo<ServiceEndpointContracts.ServiceEndpoint> = {};
                if (serviceEndpoints) {
                    var endpoints: IDictionaryStringTo<ServiceEndpointContracts.ServiceEndpoint> = {};
                    serviceEndpoints.forEach((endpoint: ServiceEndpointContracts.ServiceEndpoint) => {
                        endpointsText.push(endpoint.id);
                        endpoints[endpoint.id] = endpoint;

                        if (endpoint.data && endpoint.data["subscriptionId"]) {
                            subscriptionIdToendpoints[endpoint.data["subscriptionId"].toLocaleLowerCase()] = endpoint;
                        }
                    });
                    this._endpoints(endpoints);
                }

                if (azureSubscriptions.value === null || azureSubscriptions.value.length === 0) {
                    this.showAddServiceEndpointLink(true);
                }

                if (azureSubscriptions.errorMessage) {
                    Diag.logError(azureSubscriptions.errorMessage);
                }
                else if (azureSubscriptions.value) {
                    var subscriptions: IDictionaryStringTo<DistributedTaskContracts.AzureSubscription> = {};
                    azureSubscriptions.value.forEach((subscription: DistributedTaskContracts.AzureSubscription) => {

                        // check if there any endpoint created using this subscription. If not include this in the list of azure subscription
                        if (!subscriptionIdToendpoints[subscription.subscriptionId.toLocaleLowerCase()]) {
                            subscriptions[subscription.subscriptionId] = subscription;
                            azureSubscriptionsText.push(subscription.subscriptionId);
                        }
                    });

                    this._subscriptions(subscriptions);
                }

                var dataItem: GroupedComboBox.IGroupedDataItem<string>[] = [];
                dataItem.push({ title: TaskResources.AzureRMAvailableServiceConnections, items: endpointsText });
                dataItem.push({ title: TaskResources.AzureRMAvailableAzureSubscriptions, items: azureSubscriptionsText });

                this._groupDataItem(dataItem);

                // The user may not have access to the endpoint, we need to do a get to fetch the name in that case.
                // This will make the control valid and editable for this user
                var currentValue = this.getValue();
                if (currentValue && !endpoints[currentValue] && !TaskUtils.VariableExtractor.containsVariable(currentValue)) {
                    httpClient.beginGetEndpoint(currentValue).then((endpoint: ServiceEndpointContracts.ServiceEndpoint) => {
                        if (endpoint) {
                            this.updateEndpoint(endpoint);
                        }
                        else {
                            this.value(""); // set empty because the endpoint is probably deleted
                        }

                        this.isLoaded(true);
                    }, (reason) => {
                        this.isLoaded(true);
                        Diag.logError(reason);
                        VSS.handleError({ name: "", message: reason });
                    });
                } else {
                    this.isLoaded(true);
                }
            },
            (error) => {
                Diag.logError(error);
                VSS.handleError(error);
                this.isLoaded(true);
            });
    }

    protected createServiceEndpoint(): IPromise<ServiceEndpointContracts.ServiceEndpoint> {
        var subscription: DistributedTaskContracts.AzureSubscription = this.selectedSubscription();

        var azureEndpointDialogModel = new AddAzureRmEndpointsModel(delegate(this, this.endpointCreatedSuccessCallback));
        azureEndpointDialogModel.name(Utils_String.localeFormat(TaskResources.AzureSubscriptionDisplayName, subscription.displayName, subscription.subscriptionId));
        azureEndpointDialogModel.subscriptionId(subscription.subscriptionId);
        azureEndpointDialogModel.subscriptionName(subscription.displayName);
        azureEndpointDialogModel.tenantId(subscription.subscriptionTenantId);

        var defer = Q.defer<ServiceEndpointContracts.ServiceEndpoint>();
        azureEndpointDialogModel.createServiceEndpoint().then((provisionEndpointResponse) => {
            defer.resolve(provisionEndpointResponse);
        }, (error) => {
            defer.reject(error);
        });

        return defer.promise;
    }

    public onAuthorizeClick(evt: StringInputDefinitionViewModel) {
        this.isAuthorizeEnabled(false);
        var endpointProgressIndicator: number = VSS.globalProgressIndicator.actionStarted("createazurermendpoint", true);
        this.createServiceEndpoint()
            .then((endpoint: ServiceEndpointContracts.ServiceEndpoint) => {
                this.selectedSubscription(null);
                this.refresh();
                this.value(endpoint.id);
                VSS.globalProgressIndicator.actionCompleted(endpointProgressIndicator);
                this.isAuthorizeEnabled(true);
            },
                (error) => {
                    Diag.logError(error);
                    if (!!error) {
                        if (!!VSS.errorHandler) {
                            VSS.errorHandler.showError(TaskResources.EndpointCreationOperationFailed || Utils_String.empty, Utils_String.empty, error);
                        } else {
                            Dialogs.Dialog.show(Dialogs.ModalDialog, {
                                title: "Error",
                                contentText: TaskResources.EndpointCreationOperationFailed,
                                buttons: null,
                            });
                        }
                    }
                    VSS.globalProgressIndicator.actionCompleted(endpointProgressIndicator);
                    this.isAuthorizeEnabled(true);
                });
    }

    private azuresubscriptionPromise: IPromise<DistributedTaskContracts.AzureSubscriptionQueryResult>;
    private _isSpnEndpointOperationInProgress: KnockoutObservable<boolean> = ko.observable(false);
    private _subscriptions: KnockoutObservable<any> = ko.observable({});
    private _endpoints: KnockoutObservable<any> = ko.observable({});
    private _groupDataItem: KnockoutObservable<any[]> = ko.observable([]);
}

/**
 * View model for azure connection input definitions
 */
export class AzureConnectionInputDefinitionViewModel extends ConnectedServiceInputDefinitionViewModel {

    /**
     * Create a new viewmodel from a data contract
     * @param inputDefinition The data contract
     */
    constructor(inputDefinition: DistributedTaskContracts.TaskInputDefinition, useConnectedServiceKind?: boolean, authSchemes?: string) {
        super(inputDefinition, ServiceEndpointType.Azure, useConnectedServiceKind, authSchemes);
    }
}

/**
 * View model for radio input definitions
 */
export class RadioInputDefinitionViewModel extends StringInputDefinitionViewModel {
    public options: DistributedTaskModels.KeyValuePair[];

    /**
       * Create a new viewmodel from a data contract
       * @param inputDefinition The data contract
       */
    constructor(inputDefinition: DistributedTaskContracts.TaskInputDefinition) {

        super(inputDefinition);

        this.options = $.map(inputDefinition.options, (value: string, key: string) => {
            return new DistributedTaskModels.KeyValuePair(key, value);
        });
    }

    _isDirty(): boolean {
        return Utils_String.localeIgnoreCaseComparer(this.value(), this._value) !== 0;
    }
}

/**
 * DropDown view model for a task option input
 */
export class PickListInputDefinitionViewModel extends StringInputDefinitionViewModel {
    public options: KnockoutObservableArray<DistributedTaskModels.KeyValuePair> = ko.observableArray([]);
    public sourceDefinition: DistributedTaskContracts.TaskSourceDefinition;
    public dataSourceBinding: ServiceEndpointContracts.DataSourceBinding;
    public enableRefresh: boolean;
    public RefreshText: string = TaskResources.Refresh;
    public refreshCallback: (target: BaseInputViewModel, sourceDefinition: DistributedTaskContracts.TaskSourceDefinition, dataSourceBinding: ServiceEndpointContracts.DataSourceBinding) => IPromise<string[]>;
    public optionsCacheValid: boolean;

    /**
       * Create a new viewmodel from a data contract
       * @param inputDefinition The data contract
       */
    constructor(inputDefinition: DistributedTaskContracts.TaskInputDefinition) {
        super(inputDefinition);
        this.enableRefresh = false;
        this.optionsCacheValid = false;
        if (inputDefinition.options) {
            this.options($.map(inputDefinition.options, (value: string, key: string) => {
                return new DistributedTaskModels.KeyValuePair(key, value);
            }));
        }
    }

    _isDirty(): boolean {
        if (this._value != undefined && this.value() != undefined) {
            return !Utils_Array.arrayEquals($.trim(this._value).split(this.sepChar) || [], $.trim(this.value()).split(this.sepChar) || [],
                (s: string, t: string) => {
                    return Utils_String.localeIgnoreCaseComparer(s, t) === 0;
                });
        }
        else {
            return Utils_String.localeIgnoreCaseComparer(this.value(), this._value) !== 0;
        }
    }

    _parseValue(value: string): string {
        return value;
    }

    _convertValue(value: string): string {
        return value;
    }

    public getValue(): string {
        let value = this.value();
        return value ? value.trim() : "";
    }

    public getData() {
        return this.options;
    }

    public refreshIfRequired() {
        var multiselect = !!this.properties["MultiSelect"] && this.properties["MultiSelect"].toLowerCase() === "true";
        var hasKeySelector = !!this.sourceDefinition && !this.isEmpty(this.sourceDefinition.keySelector);
        var hasResultTemplate = !!this.dataSourceBinding && !this.isEmpty(this.dataSourceBinding.resultTemplate);
        if (this.isVisible() && (hasKeySelector || multiselect || hasResultTemplate)) {
            this.refresh();
        }
    }

    public refresh() {
        this.refreshOptions(true);
    }

    public refreshOptions(refreshCache: boolean): Q.Promise<boolean> {
        var refreshDeferred = Q.defer<boolean>();
        if (!this.refreshCallback || (!refreshCache && this.optionsCacheValid)) {
            refreshDeferred.resolve(false);
        } else {
            this.optionsCacheValid = true;
            var refreshPromise = this.refreshCallback(this, this.sourceDefinition, this.dataSourceBinding);
            if (refreshPromise) {
                refreshPromise.then((services: string[]) => {
                    this.onRefresh(services);
                    refreshDeferred.resolve(true);
                }, (error: TfsError) => {
                    refreshDeferred.reject(error);
                    this.options([]);
                    if (parseInt(error.status) !== 404 && parseInt(error.status) !== 400 && parseInt(error.status) !== 403) {
                        // Proxy always throws exceptions for every status code
                        // Let's ignore following errors, we don't want to bother user with these exceptions -
                        // 404 errors,  if the data is not found, eg- no existing websites found
                        // 403, If user doesn't has endpoint view permissions
                        // 400, If No Azure endpoint authorizer found for authentication of type 'UsernamePassword' or bad requests

                        VSS.handleError(error);
                    }
                    else if (parseInt(error.status) === 400 && error.serverError != null && Utils_String.equals(error.serverError.typeKey, this._dataSourceNotFoundException, true)) {
                        var dataSourcesForAzureEndpoint = ["AzureStorageServiceNames", "AzureHostedServiceNames"];
                        this._throwIfErrorMessageHasAnyDataSource(error, dataSourcesForAzureEndpoint, TaskResources.Task_ErrorMessageForAzureRmEndpoint);

                        var dataSourcesForAzureRmEndpoint = ["AzureStorageAccountRM", "AzureVirtualMachinesV2Id"];
                        this._throwIfErrorMessageHasAnyDataSource(error, dataSourcesForAzureRmEndpoint, TaskResources.Task_ErrorMessageForAzureEndpoint);
                    }
                });
            } else {
                refreshDeferred.resolve(false);
            }
        }

        return refreshDeferred.promise;
    }

    public onRefresh(data: string[]): void {

        this.options(data.map((value) => {
            var keystring = value;
            var valuestring = value;

            if (this.sourceDefinition && !this.isEmpty(this.sourceDefinition.keySelector)) {
                var keyValueArray = this.extractKeyAndValue(value);
                if (keyValueArray.length >= 2) {
                    keystring = keyValueArray[0];
                    valuestring = keyValueArray[1];
                }
            }
            if (this.dataSourceBinding && !this.isEmpty(this.dataSourceBinding.resultTemplate)) {
                var parsedData = JSON.parse(value);
                valuestring = parsedData.DisplayValue.toString();
                keystring = parsedData.Value.toString();
            }

            return new DistributedTaskModels.KeyValuePair(keystring, valuestring);
        }));
    }

    isEmpty(str: string): boolean {
        return (!str || 0 === str.length);
    }

    getDelimiterIndex(keyValueStr: string): number {
        var re = new RegExp(this.delimRegex, 'g');
        return keyValueStr.search(re);
    }

    unescapeDelimiter(input: string): string {
        var re = new RegExp(this.unescapeRegex, 'g');
        return input.replace(re, this.delimStr);
    }

    extractKeyAndValue(keyValueStr: string) {
        var kvArray = new Array<string>();
        var index = this.getDelimiterIndex(keyValueStr);
        if (index == -1) {
            kvArray.push(keyValueStr);
            kvArray.push(keyValueStr);
        } else {
            var key = keyValueStr.substr(0, index + 1);
            var valIndex = index + this.delimStr.length + 1;
            var value = keyValueStr.substr(valIndex, keyValueStr.length - valIndex);

            kvArray.push(this.unescapeDelimiter(key));
            kvArray.push(this.unescapeDelimiter(value));
        }
        return kvArray;
    }

    private _throwIfErrorMessageHasAnyDataSource(error: TfsError, dataSources: string[], exceptionMessageToShow: string) {
        for (var i = 0; i < dataSources.length; i++) {
            if (error.message.indexOf(dataSources[i]) != -1) {
                error.stack = "";
                error.message = exceptionMessageToShow;
                VSS.handleError(error);
                break;
            }
        }
    }

    public sepChar: string = ",";
    public delimStr: string = "|";
    public escapeStr: string = "\\";
    public delimRegex: string = "[^\\\\]\\|"; // '[^\\]\|'
    public unescapeRegex: string = "\\\\\\|"; // '\\\|'

    private _dataSourceNotFoundException: string = "DataSourceNotFoundException";
}

/**
 * View model for boolean input definitions
 */
export class BooleanInputDefinitionViewModel extends TaskInputDefinitionViewModel<boolean> {
    /**
     * Create a new viewmodel from a data contract
     * @param inputDefinition The data contract
     */
    constructor(inputDefinition: DistributedTaskContracts.TaskInputDefinition) {
        super(inputDefinition);
    }

    public getValue(): string {
        return "" + this.value();
    }

    _isDirty(): boolean {
        return this.value() !== this._value;
    }

    _parseValue(value: string): boolean {
        return Utils_String.localeIgnoreCaseComparer(value, "true") === 0;
    }
}

/**
 * View model for groups
 */
export class GroupDefinitionVM {
    public name: string;
    public isExpanded: KnockoutObservable<boolean>;
    public displayName: string;
    public isInvalid: KnockoutObservable<boolean>;
    public editable: KnockoutObservable<boolean> = ko.observable(true);
    public isVisible: KnockoutComputed<boolean>;
    public isInPreview: KnockoutObservable<boolean> = ko.observable(false);
    public visibilityRule: KnockoutObservable<IVisibilityRule>;
    public dependentInputsModel: KnockoutObservableArray<TaskInputDefinitionViewModel<any>>;
    public inPreviewTooltip = TaskResources.TaskGroup_InPreviewToolTip;

    private _displayName;
    private _isPreviewTagPresent: KnockoutObservable<boolean> = ko.observable(false);

    constructor(name: string, displayName: string, isExpanded: boolean = false, tags: string[] = []) {
        this.name = name;
        this._displayName = displayName;
        this.displayName = this._displayName;
        this.isExpanded = ko.observable(isExpanded);
        this.isInvalid = ko.observable(false);
        this.visibilityRule = ko.observable(null);
        this.dependentInputsModel = ko.observableArray([]);

        this.setTags(tags);

        this.isInvalid.subscribe((value) => {
            if (value) {
                this.displayName = Utils_String.format(TaskResources.Task_InvalidSectionName, this._displayName);
            }
            else {
                this.displayName = this._displayName;
            }
        });

        this.isVisible = ko.computed({
            read: () => {
                /* We only compute the visibility when group is in either of the two cases:
                 *     1. preview tag is not available, or
                 *     2. have associated preview tag and isInPreview is set*/
                if (!this._isPreviewTagPresent() || this.isInPreview()) {
                    if (this.visibilityRule()) {
                        var dependentInputs = this.dependentInputsModel();
                        return TaskInputVisibilityRule.getVisibility(this.visibilityRule(), dependentInputs);
                    } else {
                        return true;
                    }
                } else {
                    return false;
                }
            },
            write: (value: boolean) => {
                return value;
            }
        });
    }

    public setTags(tags: string[]) {
        if (!tags) {
            return;
        }

        var featureFlagState = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled("DistributedTask.TaskPreview", false);

        $.each(tags, (index: number, tag: string) => {
            if (Utils_String.equals(tag, "Preview", true)) {
                this._isPreviewTagPresent(true);
                if (featureFlagState) {
                    this.isInPreview(true);
                }
                else {
                    this.isInPreview(false);
                    this.isVisible(false);
                }
            }
        });
    }
}

interface InternalServiceDetails {
    authKey: string;
    manageLink: IPromise<string>;
}

export interface ITaskEnhancementOptions {
    filePathProviderDelegate: (initialValue: string) => any;
}

export interface VersionInfo {
    displayText: string;
    versionSpec: string;
    isPreview: boolean;
    releaseNotes?: string;
}

interface Inputs {
    inputs: TaskInputDefinitionViewModel<any>[];
    groups: IDictionaryStringTo<TaskInputDefinitionViewModel<any>[]>;
}

class IncrementalIdGenerator {
    public static next(): number {
        return IncrementalIdGenerator._current++;
    }

    private static _current: number = 1000;
}

/**
 * View model for a task instance
 */
export class TaskViewModel extends DistributedTaskModels.ChangeTrackerModel {
    private _allVersions: IDictionaryNumberTo<DistributedTaskContracts.TaskDefinition>;
    private _task: Types.ITask;

    // the original version spec, used to determine whether the task is dirty
    private _originalVersionSpec: string;

    // the current version spec, used so that we don't lose inputs when we switch back and forth between versions
    private _currentVersionSpec: string;
    private _versionsToInputs: IDictionaryStringTo<Inputs> = {};

    private _enabled: boolean;
    private _continueOnError: boolean;
    private _alwaysRun: boolean;
    private _condition: string;
    private _taskReferenceName: string;
    private _timeoutInMinutes: string;
    private _order: number;
    private _displayNameComputed: string;
    private _inputsMap: { [name: string]: TaskInputDefinitionViewModel<any> };
    private _toCheckForDisplayNameSet: boolean = true;
    private _inputTemplateName = "taskeditor_input";
    private _disposableSubscriptions: any[] = []; // Knockout Subscribable type
    private _invalidResult: boolean = false;
    private _internalServiceDetailsMap: { [name: string]: InternalServiceDetails };
    // Additional group inputs
    private _controlOptionsGroupName = "controlOptions";
    private _enabledInputName = "enabled";
    private _continueOnErrorInputName = "continueOnError";
    private _alwaysRunInputName = "alwaysRun";
    private _timeoutInMinutesName = "timeoutInMinutes";

    /**
     * Delegates contributed by owner passed on to this task.
     */
    public taskDelegates: KnockoutObservable<Types.ITaskDelegates>;

    /**
     * Definition of the task associated with this task.
     */
    public taskDefinition: DistributedTaskContracts.TaskDefinition;

    /**
     * Indicates whether this task is enabled or not.
     */
    public enabled: KnockoutObservable<boolean>;

    /**
     * Indicates whether this task is continue on error or not.
     */
    public continueOnError: KnockoutObservable<boolean>;

    /**
     * Indicates whether this task is always run or not.
     */
    public alwaysRun: KnockoutObservable<boolean>;

    /**
    * Indicates task timeout value.
    */
    public timeoutInMinutes: KnockoutObservable<string>;

    /**
     * Stores the help text
     */
    public helpMarkDown: KnockoutObservable<string>;

    /**
     * The list of inputs in this task
     */
    public inputs: KnockoutObservableArray<TaskInputDefinitionViewModel<any>>;

    /**
     * The Groups
     */
    public groups: KnockoutObservableArray<GroupDefinitionVM>;

    /**
     * Display the instance name of the task
     */
    public instanceName: KnockoutComputed<string>;

    /**
     * Stores the computed displayname of the task based on displayName or instanceName
     */
    public displayNameComputed: KnockoutComputed<string>;

    /**
    * Stores the displayname input for the task
    */
    public displayName: KnockoutObservable<string>;

    /**
    * Determines whether to take the the instanceName or displayName
    */
    public isDisplayNameSet: KnockoutObservable<boolean>;

    /**
     * The groups inputs map
     */
    public groupInputsMap: KnockoutObservable<IDictionaryStringTo<TaskInputDefinitionViewModel<any>[]>>;

    /**
     * To disable task parameters editing
     */
    public editable: KnockoutObservable<boolean> = ko.observable(false);

    /**
     * Order of the task in the parent list
     */
    public order: KnockoutObservable<number> = ko.observable(-1);

    /**
     * Whether the task from an extension is disabled. Does not include manually disabled per definition
     */
    public taskDisabled: KnockoutComputed<boolean>;

    /**
     * THe message to display if the task is disabled
     */
    public taskDisabledMessage: KnockoutObservable<string> = ko.observable(TaskResources.TaskDisabledMessage);

    /**
     * Whether the task should appear disabled in the tasks grid
     */
    public disabledInGrid: KnockoutComputed<boolean>;

    /**
     * To Enable InputViewModels to have access to the value of all other Inputs of the Same Task
     */
    public getAllInputValue: () => { [name: string]: string };

    /**
     * The version of the task
     */
    public versionSpec: KnockoutObservable<string>;

    /**
     * Release notes for the newest version
     */
    public releaseNotes: KnockoutObservable<string>;

    /**
     * Available versions of the task definition
     */
    public allVersionSpecs: VersionInfo[] = [];

    /**
     * Tool tip for new version upsell
     */
    public newVersionToolTip: KnockoutObservable<string>;

    /**
     * Alt-text for new version upsell
     */
    public newVersionTitle = TaskResources.Task_NewVersionAvailable;

    /**
     * Id for the version selector
     */
    public versionSelectId: string = "version_select" + IncrementalIdGenerator.next();

    /**
     * Tooltip for task rename
     */
    public taskRenameTooltip = TaskResources.Task_TaskRenameTooltip;

    /**
     * Tooltip for task in preview
     */
    public inPreviewTooltip = TaskResources.TaskGroup_InPreviewToolTip;

    constructor(task: Types.ITask, taskDefinition: DistributedTaskContracts.TaskDefinition, taskDelegates: KnockoutObservable<Types.ITaskDelegates>, editable: boolean = true, versions: IDictionaryNumberTo<DistributedTaskContracts.TaskDefinition> = {}) {
        super();

        this.getAllInputValue = delegate(this, this.getInputValues);
        this._allVersions = versions || {};
        this._task = task;
        this._inputsMap = {};
        this.helpMarkDown = ko.observable("");
        this.taskDefinition = taskDefinition;
        this._displayNameComputed = task.displayName;

        this._enabled = task.enabled || false;
        this._continueOnError = task.continueOnError || false;
        this._alwaysRun = task.alwaysRun || false;
        this._timeoutInMinutes = !!task.timeoutInMinutes ? task.timeoutInMinutes.toString() : "0";
        this._order = task.order;
        this._condition = task.condition;
        this._taskReferenceName = task.refName;

        var taskOverrideInputs = task.overrideInputs;
        if (!!taskOverrideInputs) {
            var timeoutInputExists = false;
            Object.keys(taskOverrideInputs).forEach(key => {
                if (!timeoutInputExists && Utils_String.ignoreCaseComparer(key, this._timeoutInMinutesName) === 0) {
                    this._timeoutInMinutes = taskOverrideInputs[key];
                    timeoutInputExists = true;
                }
            });
        }

        this.editable(editable);

        this.taskDelegates = taskDelegates;

        let sortedVersions = Object.keys(this._allVersions).map((version) => parseInt(version)).sort((a: number, b: number) => { return b - a }); // sort in descending order
        this.allVersionSpecs = sortedVersions.map((version) => {
            let definition = this._allVersions[version];
            let versionSpec = TaskUtils.getMajorVersionSpec(definition.version);
            let displayText = versionSpec;
            let isPreview: boolean = TaskUtils.isPreview(definition);

            if (isPreview) {
                displayText = Utils_String.format(TaskResources.Task_PreviewMajorVersionSpecFormat, versionSpec);
            }

            let versionInfo: VersionInfo = {
                displayText: displayText,
                versionSpec: versionSpec,
                isPreview: isPreview,
                releaseNotes: definition.releaseNotes
            };

            return versionInfo;
        });

        // update release notes
        this._addDisposable(ko.computed(() => {
            let currentVersionSpec = this.versionSpec();
            // check for latest version
            if (this.allVersionSpecs.length > 0) {
                let latestVersionInfo = this.allVersionSpecs[0];
                if (currentVersionSpec !== latestVersionInfo.versionSpec) {
                    // we have new one available
                    if (latestVersionInfo.releaseNotes) {
                        let versionSpecText = latestVersionInfo.isPreview ? Utils_String.format(TaskResources.Task_PreviewMajorVersionSpecFormat, latestVersionInfo.versionSpec) : latestVersionInfo.versionSpec;
                        TaskUtils.PresentationUtils.marked(this._getReleaseNotes(latestVersionInfo.releaseNotes, versionSpecText)).then((markedString: string) => {
                            // check again since it's async, onload, we get "*", which might trigger this code, but we get data back, version spec might be latest in which case we shouldn't do this
                            this.versionSpec.peek() !== latestVersionInfo.versionSpec && this.newVersionToolTip(markedString);
                        });
                    }
                    else {
                        if (latestVersionInfo.isPreview) {
                            this.newVersionToolTip(TaskResources.Task_NewPreviewVersionHelp);
                        }
                        else {
                            this.newVersionToolTip(TaskResources.Task_NewVersionHelp);
                        }
                    }
                }
                else {
                    this.newVersionToolTip("");
                }
            }

            // update current version release notes
            let currentVersionInfoMatch = this.allVersionSpecs.filter((info) => {
                return info.versionSpec === currentVersionSpec;
            });
            let currentVersionInfo = currentVersionInfoMatch && currentVersionInfoMatch[0];
            if (currentVersionInfo && currentVersionInfo.releaseNotes) {
                let versionSpecText = currentVersionInfo.isPreview ? Utils_String.format(TaskResources.Task_PreviewMajorVersionSpecFormat, currentVersionInfo.versionSpec) : currentVersionInfo.versionSpec;
                TaskUtils.PresentationUtils.marked(this._getReleaseNotes(currentVersionInfo.releaseNotes, versionSpecText)).then((markedString: string) => {
                    this.releaseNotes(markedString);
                });
            }
            else {
                this.releaseNotes("");
            }
        }));

        if (task.task && task.task.versionSpec) {
            this._originalVersionSpec = task.task.versionSpec;
        }
        else {
            this._originalVersionSpec = "*";
        }

        if (this._originalVersionSpec === "*") {
            let latestNonPreview = Utils_Array.first(this.allVersionSpecs, (versionInfo) => !versionInfo.isPreview)
                || this.allVersionSpecs[0];

            if (!!latestNonPreview) {
                this._originalVersionSpec = latestNonPreview.versionSpec;
            }
        }
        this.versionSpec(this._originalVersionSpec);
        this._setupTaskDefinition(taskDefinition);

        // Update each input with task value
        $.each(this._task.inputs || {}, (name: string, value: string) => {
            var inputViewModel = this._inputsMap[name];
            if (inputViewModel) {
                if (!!taskDefinition && (taskDefinition.definitionType === Types.DefinitionType.metaTask && value === "")) {
                    //Fill referenced value from meta-task definition
                    var matchedInputDefinition = Utils_Array.first(taskDefinition.inputs, (inputDefinition: DistributedTaskContracts.TaskInputDefinition) => {
                        return inputDefinition.name === name;
                    });
                    if (matchedInputDefinition) {
                        value = matchedInputDefinition.defaultValue;
                    }
                }
                inputViewModel.update(value);
            }
        });

        // Set up instance name
        this.instanceName = ko.computed<string>(() => {
            if (this.taskDefinition && this.taskDefinition.instanceNameFormat) {
                // replace $(myInput) with the value specified for myInput
                // this version of replace is not in our version of lib.d.ts
                var computedValue = (<any>this.taskDefinition.instanceNameFormat).replace(DistributedTaskModels.InstanceNameFormatRegex, (substring: string, inputName: string) => {
                    var input = this._inputsMap[inputName];
                    var value = input ? input.getValue() : "";
                    return value;
                });

                if (this._toCheckForDisplayNameSet) {
                    // _displayNameComputed will be the instance name it's self if explicit displayname is not set previously
                    if (this._displayNameComputed && this._displayNameComputed != computedValue) {
                        this.isDisplayNameSet(true);
                    }
                    else {
                        // displayNameComputed might be just empty when task.displayName doesn't exist
                        if (!this._displayNameComputed) {
                            this._displayNameComputed = computedValue;
                            this.displayName(computedValue);
                        }
                        this.isDisplayNameSet(false);
                    }

                    this._toCheckForDisplayNameSet = false;
                }

                return computedValue;
            }
        });
        this._addDisposable(this.instanceName);

        this.displayName(this._displayNameComputed);

        // Set up display name computed
        this.displayNameComputed = ko.computed<string>(() => {
            if (!this.taskDefinition) {
                return this._displayNameComputed;
            }
            else if (this.isDisplayNameSet()) {
                return this.displayName();
            }
            else {
                return this.instanceName();
            }
        });
        this._addDisposable(this.displayNameComputed);

        // task disabled
        this.taskDisabled = ko.computed(() => {
            var disabled = !!this.taskDefinition && this.taskDefinition.disabled;

            // update the message here so we don't have to do it any more than necessary
            if (disabled && !!this.taskDefinition.contributionIdentifier) {
                // contribution id is of format ms.hockeyapp.hockeyapp-task
                var contributionIdParts = this.taskDefinition.contributionIdentifier.split(".");

                // contribution id is in unknown format; abort and keep using generic string
                if (contributionIdParts.length < 3) {
                    return disabled;
                }

                VSS.using(["VSS/ExtensionManagement/RestClient"], (ExtentionsRestClient: typeof ExtensionsRestClient_NO_REQUIRE) => {
                    var emsClient = ExtentionsRestClient.getClient();
                    emsClient.getInstalledExtensionByName(contributionIdParts[0], contributionIdParts[1]).then((extension) => {
                        var displayName = extension.extensionName;
                        this.taskDisabledMessage(Utils_String.localeFormat(TaskResources.TaskExtensionDisabledMessage, displayName));
                    });
                });
            }

            return disabled;
        });
        this._addDisposable(this.taskDisabled);

        // disabled in grid
        this.disabledInGrid = ko.computed(() => {
            return !this.taskDefinition || this.taskDisabled() || !this.enabled();
        });
        this._addDisposable(this.disabledInGrid);

        let versionSubscription = this.versionSpec.subscribe((versionSpec: string) => {
            let newTaskDefinition: DistributedTaskContracts.TaskDefinition = TaskUtils.getTaskDefinition(this._allVersions, versionSpec);
            let currentTaskDefinition = this.taskDefinition;
            if (!!newTaskDefinition && newTaskDefinition !== currentTaskDefinition) {
                this.taskDefinition = newTaskDefinition;

                this._setupTaskDefinition(newTaskDefinition);
            }
        });
        this._addDisposable(versionSubscription);

        // Make sure this is set at the end so that all computed values are initialized for dirty to work
        this.enabled(this._enabled);
        this.continueOnError(this._continueOnError);
        this.alwaysRun(this._alwaysRun);
        this.timeoutInMinutes(this._timeoutInMinutes);
        this.order(this._order);
    }

    _initializeObservables(): void {
        super._initializeObservables();
        this.versionSpec = ko.observable("*");
        this.isDisplayNameSet = ko.observable(false);
        this._displayNameComputed = "";
        this.displayName = ko.observable(this._displayNameComputed);
        this.enabled = ko.observable(true);
        this.continueOnError = ko.observable(false);
        this.alwaysRun = ko.observable(false);
        this.timeoutInMinutes = ko.observable("0");
        this.inputs = ko.observableArray([]);
        this.groups = ko.observableArray([]);
        this.groupInputsMap = ko.observable({});
        this.releaseNotes = ko.observable("");
        this.newVersionToolTip = ko.observable("");
    }

    _isDirty(): boolean {
        if (this._originalVersionSpec !== this.versionSpec()) {
            return true;
        }
        if (this._enabled !== this.enabled()) {
            return true;
        }
        if (this._continueOnError !== this.continueOnError()) {
            return true;
        }
        if (this._alwaysRun !== this.alwaysRun()) {
            return true;
        }
        if (this._timeoutInMinutes.trim() !== this.timeoutInMinutes().trim()) {
            return true;
        }
        if (this._order !== this.order()) {
            return true;
        }
        if (this._displayNameComputed && (this._displayNameComputed !== this.displayNameComputed())) {
            return true;
        }

        // If enabled state and displayNameComputed didn't change, look for a dirty input
        var dirtyInput = Utils_Array.first(this.inputs(), (input: BaseInputViewModel) => {
            return input._isDirty();
        });

        var groupInputs = [];
        $.each(this.groupInputsMap() || {}, (index, value) => {
            groupInputs = groupInputs.concat(value);
        });

        var dirtyGroupInput = Utils_Array.first(groupInputs, (input: BaseInputViewModel) => {
            return input._isDirty();
        });

        return !!dirtyInput || !!dirtyGroupInput;
    }

    public renameTask(viewModel: TaskViewModel) {
        var dialogModal = new TaskCommonDialogs.RenameTaskDialogModel(viewModel.displayName(), viewModel.instanceName(), viewModel.displayNameComputed(), viewModel.isDisplayNameSet);
        // Set ok callback which is called when dialog closed with ok button
        dialogModal.okCallback = (result: string) => {
            if (viewModel.isDisplayNameSet()) {
                viewModel.displayName(result);
            }
        }
        Dialogs.show(TaskCommonDialogs.RenameTaskDialog, dialogModal);
    }

    public onRenameTaskKeyDown(viewModel: TaskViewModel, event: JQueryEventObject): boolean {
        return TaskUtils.AccessibilityHelper.triggerClickOnEnterPress(event);
    }

    public getValue(): Types.ITask {
        let inputsMap: { [name: string]: string } = {};
        // Convert the list of inputs to a map
        $.each(this.inputs(), (i: number, input: BaseInputViewModel) => {
            var name: string = input.name();
            var value: string = input.getValue();

            if (!!this.taskDefinition && this.taskDefinition.definitionType === Types.DefinitionType.metaTask) {
                //Check if meta-task input value is by reference
                var matchedInputDefinition: DistributedTaskContracts.TaskInputDefinition = Utils_Array.first(this.taskDefinition.inputs, (inputDefinition: DistributedTaskContracts.TaskInputDefinition) => {
                    return inputDefinition.name === name;
                });

                if (matchedInputDefinition && matchedInputDefinition.defaultValue === value && !TaskUtils.VariableExtractor.containsVariable(value)) {
                    value = "";
                }
            }

            inputsMap[name] = value;
        });

        let groupInputs = [];
        $.each(this.groupInputsMap() || {}, (index, value) => {
            if (index != this._controlOptionsGroupName) {
                groupInputs = groupInputs.concat(value);
            }
        });

        $.each(groupInputs, (i: number, input: BaseInputViewModel) => {
            inputsMap[input.name()] = input.getValue();
        });

        var timeoutValue = +this.timeoutInMinutes();
        var overrideInputs: { [key: string]: string; } = null;
        if (isNaN(timeoutValue)) {
            overrideInputs = {};
            overrideInputs[this._timeoutInMinutesName] = this.timeoutInMinutes();
        }

        return {
            enabled: this.enabled(),
            continueOnError: this.continueOnError(),
            alwaysRun: this.alwaysRun(),
            timeoutInMinutes: timeoutValue,
            displayName: this.displayNameComputed(),
            order: this.order(),
            inputs: inputsMap,
            task: {
                id: this._task.task.id,
                versionSpec: this.versionSpec(),
                definitionType: this._task.task.definitionType
            },
            // condition is not supported by this version of the editor, but retain old value.
            condition: this._condition,
            overrideInputs: overrideInputs,

            // refName is not supported by this version of the editor
            refName: this._taskReferenceName
        };
    }

    public getInputValues(): { [name: string]: string } {
        return this.getValue().inputs;
    }

    public getInputViewModel(name: string): BaseInputViewModel {
        return this._inputsMap[name];
    }

    public dispose(): void {
        var groupInputs = [];
        $.each(this.groupInputsMap.peek() || {}, (index, value) => {
            groupInputs = groupInputs.concat(value);
        });
        // Dispose each input
        $.each(this.inputs.peek(), (i: number, input: BaseInputViewModel) => {
            input.dispose();
        });
        $.each(groupInputs, (i: number, input: BaseInputViewModel) => {
            input.dispose();
        });
        // Dipose subscriptions
        $.each(this._disposableSubscriptions, (i: number, sub: any) => {
            sub.dispose();
        });

        super.dispose();
    }

    private _setupInternalServiceDetailsMap(): void {
        var internalServicePrefix: string = 'tfs:';
        this._internalServiceDetailsMap = {};
        this._internalServiceDetailsMap['tfs:devtestlabs'] = {
            authKey: internalServicePrefix + "0000000e-0000-8888-8000-000000000000",
            manageLink: TaskUtils.PresentationUtils.getActionUrl("", "machines")
        }
        this._internalServiceDetailsMap['tfs:teamfoundation'] = {
            authKey: internalServicePrefix + "00025394-6065-48CA-87D9-7F5672854EF7",
            manageLink: TaskUtils.PresentationUtils.getActionUrl("", "testmanagement")
        }
        this._internalServiceDetailsMap['tfs:feed'] = {
            authKey: internalServicePrefix + "00000036-0000-8888-8000-000000000000",
            manageLink: null
        }
    }

    private _getSourceTokenValue(token: string): string {
        token = token || '';
        var match = token.match(/\{\$(.*?)\}|\$\((.*?)\)/);
        var tokenValue: string = '';
        if (match) {
            var tokenName: string = match[1] || match[2];
            var authTarget: BaseInputViewModel = !!tokenName ? this._inputsMap[tokenName] : null;
            if (authTarget) {
                tokenValue = authTarget.getValue();
            }
        } else {
            var internalServiceDetails = this._internalServiceDetailsMap[token.toLowerCase()];
            if (internalServiceDetails) {
                tokenValue = internalServiceDetails.authKey;
            }
        }

        // If the user has started typing a variable, we should not treat it as an enpoint
        if (!Utils_String.startsWith(tokenValue, "$(") && Utils_String.ignoreCaseComparer(tokenValue, "$") !== 0) {
            return tokenValue;
        }
        else {
            return '';
        }
    }

    private _expandImplicitVariables(url: string): string {
        // Currently there's only one variable we want to replace.
        var expr: string = "\\$\\(" + TaskVariables.ImplicitVariableNames.TeamProject + "\\)";
        var projectVariable: TaskVariables.DefinitionVariable =
            TaskVariables.ImplicitVariables.GetImplicitVariables(Context.getDefaultWebContext()).filter(
                (value: TaskVariables.DefinitionVariable) => {
                    return Utils_String.localeIgnoreCaseComparer(value.name, TaskVariables.ImplicitVariableNames.TeamProject) === 0;
                })[0];
        var regex: RegExp = new RegExp(expr, "ig"); // ignore, global
        return url.replace(regex, projectVariable.value);
    }

    private _initializeSourceDefinitions(): void {
        if (!!this.taskDefinition && this.taskDefinition.sourceDefinitions) {
            this.taskDefinition.sourceDefinitions.forEach((sourceDefinition: DistributedTaskContracts.TaskSourceDefinition) => {
                var target: BaseInputViewModel = this._inputsMap[sourceDefinition.target];
                if (target) {
                    target.sourced = true;
                    var internalServiceDetails = this._internalServiceDetailsMap[sourceDefinition.authKey.toLowerCase()];
                    var hasManageLink = internalServiceDetails && internalServiceDetails.manageLink;
                    var disableManageLinkOnly = target.properties && target.properties[Constants.DisableManageLink] && target.properties[Constants.DisableManageLink].toLowerCase() === 'true';

                    if (hasManageLink && !disableManageLinkOnly) {
                        internalServiceDetails.manageLink.then((actionUrl: string) => {
                            target.manageLink(actionUrl);
                        });
                    }

                    if (target.type === "pickList") {
                        var pickList: PickListInputDefinitionViewModel = <PickListInputDefinitionViewModel>target;
                        this._setSourceDefinitionSubscriptions(pickList, sourceDefinition);
                        this._subscribeToVisibility(pickList);
                        pickList.sourceDefinition = sourceDefinition;
                        pickList.refreshCallback = Utils_Core.delegate(this, this._refreshSourceDefinitionPickList);
                        if (hasManageLink) {
                            pickList.enableRefresh = true;
                        }
                        pickList.refreshIfRequired();
                    }
                }
            });
        }
    }

    private _initializeDataSourceBindings(): void {
        if (!!this.taskDefinition && this.taskDefinition.dataSourceBindings) {
            this.taskDefinition.dataSourceBindings.forEach((dataSourceBinding: ServiceEndpointContracts.DataSourceBinding) => {
                var target: BaseInputViewModel = this._inputsMap[dataSourceBinding.target];
                if (target) {
                    target.sourced = true;
                    var internalServiceDetails = this._internalServiceDetailsMap[dataSourceBinding.endpointId.toLowerCase()];
                    var hasManageLink = internalServiceDetails && internalServiceDetails.manageLink;
                    var disableManageLinkOnly = target.properties && target.properties[Constants.DisableManageLink] && target.properties[Constants.DisableManageLink].toLowerCase() === 'true';

                    if (hasManageLink && !disableManageLinkOnly) {
                        internalServiceDetails.manageLink.then((actionUrl: string) => {
                            target.manageLink(actionUrl);
                        });
                    }

                    if (target.type === "pickList") {
                        var pickList: PickListInputDefinitionViewModel = <PickListInputDefinitionViewModel>target;
                        this._setDataSourceBindingSubscriptions(pickList, dataSourceBinding);
                        this._subscribeToVisibility(pickList);
                        pickList.dataSourceBinding = dataSourceBinding;
                        pickList.refreshCallback = Utils_Core.delegate(this, this._refreshDataSourceBindingPickList);
                        pickList.enableRefresh = true;
                        pickList.refreshIfRequired();
                    }
                }
            });
        }
    }

    private _refreshSourceDefinitionPickList(target: BaseInputViewModel, sourceDefinition: DistributedTaskContracts.TaskSourceDefinition, dataSourceBinding: ServiceEndpointContracts.DataSourceBinding): IPromise<string[]> {
        var url: string = sourceDefinition.endpoint;
        // step 0: replace values of reserved variable names like project.
        url = this._expandImplicitVariables(url);
        var promises: IPromise<string>[] = [];
        var depends = this._getSourceDefinitionDependency(url);
        var promise: IPromise<string>;

        if (depends.length === 0) {
            return this._queryOnRefresh(sourceDefinition, url);
        }
        else {
            depends.forEach((dependency: string) => {
                var source: BaseInputViewModel = this._inputsMap[dependency];
                // TODO(rahudha): once the tasks have been updated to $(var) convention,
                // get rid of the {$var} convention.
                var expr: string = "\\{\\$" + dependency + "\\}|\\$\\(" + dependency + "\\)";
                var regex: RegExp = new RegExp(expr, "ig");
                if (source) {
                    var dependencyValue = source.getValue();
                    if (dependencyValue) {
                        url = url.replace(regex, dependencyValue.trim());
                        promises.push(<IPromise<string>>Q.resolve(url));
                    }
                } else {
                    var authKeyInputName: string = this._getAuthKeyInputName(dependency, sourceDefinition.authKey);
                    var connectedServiceSource = <ConnectedServiceInputDefinitionViewModel>this._inputsMap[authKeyInputName];

                    if (connectedServiceSource) {
                        var connectionId = connectedServiceSource.getValue();
                        if (connectionId) {
                            promises.push(<IPromise<string>>connectedServiceSource.connectedServicesDeferred.promise.then((connectedServiceDetails: any) => {

                                var details = connectedServiceDetails[connectionId];

                                if (!!details) {
                                    var dataParameterName = dependency.split(".")[1];
                                    if (!details.data[dataParameterName]) {
                                        dataParameterName = dataParameterName[0].toLowerCase() + dataParameterName.substring(1);
                                    }
                                    var value = !!details.data[dataParameterName] ? details.data[dataParameterName] : Utils_String.empty;

                                    if (Utils_String.ignoreCaseComparer(dataParameterName, "subscriptionId") === 0) {
                                        value = value.toLowerCase();
                                    }

                                    url = url.replace(regex, value.trim());
                                    return url;
                                }

                            }));
                        }
                    }
                }
            });

            if (promises.length) {
                return Q.all(promises).then((values: string[]) => {
                    return this._queryOnRefresh(sourceDefinition, url);
                });
            }
        }
    }

    private _queryOnRefresh(sourceDefinition: DistributedTaskContracts.TaskSourceDefinition, url: string): IPromise<string[]> {
        var authKeyValue: string = this._getSourceTokenValue(sourceDefinition.authKey);
        // No point in proceeding if there's no auth-key/connection id.
        if (!(authKeyValue === '')) {
            return BaseInputViewModel.getDistributedTasksHttpClient().beginQueryEndpoint({
                url: url,
                selector: sourceDefinition.selector,
                connectionId: authKeyValue,
                scope: null,    //Set to null because it is implicitly project scoped.
                taskId: this.taskDefinition.id,
                keySelector: sourceDefinition.keySelector
            });
        }
    }

    private _setSourceDefinitionSubscriptions(target: PickListInputDefinitionViewModel, sourceDefinition: DistributedTaskContracts.TaskSourceDefinition) {
        var depends = this._getSourceDefinitionDependency(this._expandImplicitVariables(sourceDefinition.endpoint));
        depends.forEach((dependency: string) => {
            var source: BaseInputViewModel = this._inputsMap[dependency];
            if (source) {
                this._disposableSubscriptions.push(source.getObservableValue().subscribe(() => {
                    target.optionsCacheValid = false;
                    target.refreshIfRequired();
                }));
            } else {
                var authKeyInputName = this._getAuthKeyInputName(dependency, sourceDefinition.authKey);
                source = this._inputsMap[authKeyInputName];
                if (source) {
                    this._disposableSubscriptions.push(source.getObservableValue().subscribe(() => {
                        target.optionsCacheValid = false;
                        target.refreshIfRequired();
                    }));
                }
            }
        });
    }

    private _getAuthKeyInputName(dependency: string, authKey: string): string {
        var authKeyInputName: string = '';
        var authKeyToken: string = dependency.split(".")[0];
        if (Utils_String.equals(authKeyToken, "authKey", true) || Utils_String.equals(authKeyToken, "endpoint", true)) {
            var authKeySourceValue = authKey || '';
            var authKeyMatch = authKeySourceValue.match(/\{\$(.*?)\}|\$\((.*?)\)/);

            if (authKeyMatch) {
                authKeyInputName = authKeyMatch[1] || authKeyMatch[2];
            }
        }

        return authKeyInputName;
    }

    private _getReleaseNotes(markedString: string, version: string) {
        // add markdown new line after our text so that their notes would just work
        return Utils_String.format(TaskResources.Task_WhatsNewMarkdown, version) + "  \n" + markedString;
    }

    private _getSourceDefinitionDependency(url: string): string[] {
        // TODO(rahudha): once the tasks have been updated to $(var) convention,
        // get rid of the {$var} convention.
        var pattern = /\{\$(.*?)\}|\$\((.*?)\)/ig;
        var match;
        var depends: string[] = [];
        while ((match = pattern.exec(url)) != null) {
            var inputField: string = match[1] || match[2];
            depends.push(inputField);
        }
        return depends;
    }

    private _getInputViewModel(inputDefinition: DistributedTaskContracts.TaskInputDefinition, taskDelegates: KnockoutObservable<Types.ITaskDelegates>, getAllInputValue: () => { [name: string]: string }): TaskInputDefinitionViewModel<any> {
        var inputViewModel = getInputViewModel(inputDefinition, taskDelegates, getAllInputValue);
        inputViewModel.templateName = this._inputTemplateName;
        inputViewModel.editable(this.editable.peek());
        this._disposableSubscriptions.push(this.editable.subscribe(editable => {
            inputViewModel.editable(editable);
        }));
        return inputViewModel;
    }

    private _getControlOptionsInputs(): TaskInputDefinitionViewModel<any>[] {
        var viewModels: TaskInputDefinitionViewModel<any>[] = [];
        var input: DistributedTaskContracts.TaskInputDefinition;
        var viewModel: TaskInputDefinitionViewModel<any>;
        var innerUpdate: boolean = false;
        var isMetatask: boolean = (!!this.taskDefinition && this.taskDefinition.definitionType === Types.DefinitionType.metaTask);

        // Add enabled checkbox
        input = <DistributedTaskContracts.TaskInputDefinition>{
            defaultValue: this._enabled.toString(),
            groupName: this._controlOptionsGroupName,
            helpMarkDown: isMetatask ? TaskResources.MetataskControlOptionsTooltipText : "",
            label: TaskResources.Task_TaskEnabledText,
            name: this._enabledInputName,
            options: {},
            properties: {},
            required: false,
            type: "boolean",
            visibleRule: ""
        };
        viewModel = this._getInputViewModel(input, this.taskDelegates, this.getAllInputValue);
        // TODO : Because inputs are not part of the contract, using the observable value directly from them
        // groupInputsMap doesn't seem to produce expected results, it would be nice to just use groupInputsMap directly,
        // with out subscribing and maintaining the additional input values seperately.
        this._disposableSubscriptions.push(viewModel.getObservableValue().subscribe((value: boolean) => {
            if (!innerUpdate) {
                this.enabled(value);
            }
        }));
        this._disposableSubscriptions.push(this.enabled.subscribe(function (value: boolean) {
            innerUpdate = true;
            this.getObservableValue()(value);
            innerUpdate = false;
        }.bind(viewModel)));

        viewModels.push(viewModel);

        // Add continueonerror checkbox
        input = <DistributedTaskContracts.TaskInputDefinition>{
            defaultValue: this._continueOnError.toString(),
            groupName: this._controlOptionsGroupName,
            helpMarkDown: isMetatask ? TaskResources.MetataskControlOptionsTooltipText : "",
            label: TaskResources.ContinueOnErrorText,
            name: this._continueOnErrorInputName,
            options: {},
            properties: {},
            required: false,
            type: "boolean",
            // 1 == 2 is false, so we do not show this control for meta-task
            visibleRule: isMetatask ? "1 == 2" : ""
        };
        viewModel = this._getInputViewModel(input, this.taskDelegates, this.getAllInputValue);
        this._disposableSubscriptions.push(viewModel.getObservableValue().subscribe((value: boolean) => {
            this.continueOnError(value);
        }));
        viewModels.push(viewModel);

        // Add always run checkbox
        input = <DistributedTaskContracts.TaskInputDefinition>{
            defaultValue: this._alwaysRun.toString(),
            groupName: this._controlOptionsGroupName,
            helpMarkDown: isMetatask ? TaskResources.MetataskControlOptionsTooltipText : "",
            label: TaskResources.AlwaysRunText,
            name: this._alwaysRunInputName,
            options: {},
            properties: {},
            required: false,
            type: "boolean",
            // 1 == 2 is false, so we do not show this control for meta-task
            visibleRule: isMetatask ? "1 == 2" : ""
        };
        viewModel = this._getInputViewModel(input, this.taskDelegates, this.getAllInputValue);
        this._disposableSubscriptions.push(viewModel.getObservableValue().subscribe((value: boolean) => {
            this.alwaysRun(value);
        }));
        viewModels.push(viewModel);

        // Add timeout text box
        input = <DistributedTaskContracts.TaskInputDefinition>{
            defaultValue: this._timeoutInMinutes.toString(),
            groupName: this._controlOptionsGroupName,
            helpMarkDown: TaskResources.TaskTimeoutTooltip,
            label: TaskResources.TimeoutInMinutes,
            name: this._timeoutInMinutesName,
            options: {},
            properties: {},
            required: true,
            type: "string",
            // 1 == 2 is false, so we do not show this control for meta-task
            visibleRule: isMetatask ? "1 == 2" : ""
        };
        viewModel = this._getInputViewModel(input, this.taskDelegates, this.getAllInputValue);
        this._disposableSubscriptions.push(viewModel.getObservableValue().subscribe((value: string) => {
            this.timeoutInMinutes(value);
        }));
        viewModels.push(viewModel);
        return viewModels;
    }

    private _setGroupInvalidState(input: BaseInputViewModel, value: boolean) {
        let groupName = input.getGroupName();
        if (groupName !== "") {
            // Group input
            let group = this.groups().filter((value: GroupDefinitionVM) => {
                return value.name === groupName;
            })[0];
            if (group) {
                group.isInvalid(value);
            }
        }
    }

    private _isInvalidInput(input: BaseInputViewModel): boolean {
        if (input.isVisible()) {
            // Visible, check for required
            var value = input.isInvalid();
            this._setGroupInvalidState(input, value);
            return value;
        }
        return false;
    }

    private _refreshDataSourceBindingPickList(target: BaseInputViewModel, sourceDefinition: DistributedTaskContracts.TaskSourceDefinition, dataSourceBinding: ServiceEndpointContracts.DataSourceBinding): IPromise<string[]> {
        var parameterToSend: IDictionaryStringTo<string> = {};
        var depends = this._getDataSourceBindingDependency(dataSourceBinding, parameterToSend);
        var shouldRefresh = true;
        var endpointPromise: Q.Deferred<string[]> = Q.defer<string[]>();

        depends.forEach((dependency: string) => {
            var source: BaseInputViewModel = this._inputsMap[dependency];
            if (source) {
                var dependencyValue = source.getValue();

                if (dependencyValue) {
                    parameterToSend[dependency] = dependencyValue.trim();
                } else {
                    shouldRefresh = false;
                }
            }
        });

        if (shouldRefresh) {
            var authKeyValue: string = this._getSourceTokenValue(dataSourceBinding.endpointId);
            // No point in proceeding if there's no auth-key/connection id.
            if (!(authKeyValue === '')) {

                var dataSourceDetails: ServiceEndpointContracts.DataSourceDetails = {
                    dataSourceName: dataSourceBinding.dataSourceName,
                    dataSourceUrl: dataSourceBinding.endpointUrl,
                    resourceUrl: "",
                    requestContent: null,
                    requestVerb: null,
                    parameters: parameterToSend,
                    resultSelector: dataSourceBinding.resultSelector,
                    headers: dataSourceBinding.headers,
                    initialContextTemplate: dataSourceBinding.initialContextTemplate
                };
                var resultTransformationDetails: ServiceEndpointContracts.ResultTransformationDetails = {
                    resultTemplate: dataSourceBinding.resultTemplate,
                    callbackContextTemplate: dataSourceBinding.callbackContextTemplate,
                    callbackRequiredTemplate: dataSourceBinding.callbackRequiredTemplate
                };
                var serviceEndpointRequest: ServiceEndpointContracts.ServiceEndpointRequest = {
                    serviceEndpointDetails: null,
                    dataSourceDetails: dataSourceDetails,
                    resultTransformationDetails: resultTransformationDetails,
                };

                var executeServiceEndpointRequestPromise = BaseInputViewModel.getDistributedTasksHttpClient().beginExecuteServiceEndpointRequest(serviceEndpointRequest, authKeyValue);

                executeServiceEndpointRequestPromise.then((endpointRequestResult: ServiceEndpointContracts.ServiceEndpointRequestResult) => {
                    var result: any = endpointRequestResult.result;
                    if (Utils_String.equals(endpointRequestResult.statusCode, "ok", true)) {
                        endpointPromise.resolve(result);
                    } else {
                        // we dont want to throw or show error message in the web for external service failures
                        endpointPromise.resolve(result);
                    }
                }, (error) => {
                    // we will fail for TFS/VSTS errors
                    endpointPromise.reject(error);
                });

                return endpointPromise.promise;
            }
        }
    }

    private _setDataSourceBindingSubscriptions(target: PickListInputDefinitionViewModel, dataSourceBinding: ServiceEndpointContracts.DataSourceBinding) {
        var depends = this._getDataSourceBindingDependency(dataSourceBinding);
        depends.forEach((dependency: string) => {
            var source: BaseInputViewModel = this._inputsMap[dependency];
            if (source) {
                this._disposableSubscriptions.push(source.getObservableValue().subscribe(() => {
                    target.optionsCacheValid = false;
                    target.refreshIfRequired();
                }));
            }
        });
    }

    private _subscribeToVisibility(pickList: PickListInputDefinitionViewModel) {
        if (pickList) {
            this._disposableSubscriptions.push(pickList.isVisible.subscribe(() => {
                pickList.refreshIfRequired();
            }));
        }
    }

    private _getDataSourceBindingDependency(dataSourceBinding: ServiceEndpointContracts.DataSourceBinding, parametersToSend?: IDictionaryStringTo<string>): string[] {
        var pattern = /\$\((.*?)\)/ig;
        var match;
        var depends: string[] = [];

        for (var key in dataSourceBinding.parameters) {
            if ((match = dataSourceBinding.parameters[key].match(/\{\$(.*?)\}|\$\((.*?)\)/)) != null) {
                var inputField: string = match[1] || match[2];
                depends.push(inputField);
            } else {
                if (parametersToSend) {
                    parametersToSend[key] = dataSourceBinding.parameters[key];
                }
            }
        }

        // Add the endpoint input as a dependency
        if ((match = dataSourceBinding.endpointId.match(/\{\$(.*?)\}|\$\((.*?)\)/)) != null) {
            var inputField: string = match[1] || match[2];
            depends.push(inputField);
        }

        if (!!dataSourceBinding.endpointUrl) {
            depends = depends.concat(this._getSourceDefinitionDependency(dataSourceBinding.endpointUrl));
        }

        return depends;
    }

    public getSectionName(name: string): string {
        if (this._invalidResult) {
            return Utils_String.format(TaskResources.Task_InvalidSectionName, name);
        }
        else {
            return name;
        }
    }

    _isInvalid(): boolean {
        if (!this.enabled()) {
            // If the task is disabled, do not perform any task specific validations.
            return false;
        }

        var invalidInput = Utils_Array.first(this.inputs(), (input: BaseInputViewModel) => {
            return this._isInvalidInput(input);
        });

        var groupInputs = [];
        $.each(this.groupInputsMap() || {}, (index, value) => {
            groupInputs = groupInputs.concat(value);
        });

        var invalidGroupInput = Utils_Array.first(groupInputs, (input: BaseInputViewModel) => {
            return this._isInvalidInput(input);
        });

        this._invalidResult = !!invalidInput || !!invalidGroupInput;

        return this._invalidResult;
    }

    private _setupTaskDefinition(taskDefinition: DistributedTaskContracts.TaskDefinition): void {
        let newVersionSpec = this.versionSpec.peek();

        let previousInputs = this.inputs.peek();
        let previousGroupMap = this.groupInputsMap.peek();

        // save off current inputs in case we come back to this version
        // this._currentVersionSpec is null the first time we call this method, which is fine because that means we're loading up and not replacing a previous version
        if (this._currentVersionSpec) {
            this._versionsToInputs[this._currentVersionSpec] = {
                inputs: previousInputs,
                groups: previousGroupMap
            };
            this._currentVersionSpec = newVersionSpec;
        }

        let groupInputsMap: IDictionaryStringTo<TaskInputDefinitionViewModel<any>[]> = {};

        let groups: GroupDefinitionVM[] = [];
        let inputs: TaskInputDefinitionViewModel<any>[] = [];

        if (!!taskDefinition) {
            // Record groups
            groups = (taskDefinition.groups || []).map((group: DistributedTaskContracts.TaskGroupDefinition) => {
                let groupVM = new GroupDefinitionVM(group.name, group.displayName);
                groupVM.isExpanded(group.isExpanded);
                groupVM.editable(this.editable.peek());
                groupVM.setTags(group.tags || []);
                groupVM.visibilityRule(TaskInputVisibilityRule.getVisibilityRule(group.visibleRule));

                this._disposableSubscriptions.push(this.editable.subscribe((newValue) => {
                    groupVM.editable(newValue);
                }));

                return groupVM;
            });

            inputs = (taskDefinition.inputs || []).map((inputDefinition: DistributedTaskContracts.TaskInputDefinition) => {
                let inputViewModel = this._getInputViewModel(inputDefinition, this.taskDelegates, this.getAllInputValue);

                // Cache view models by name
                this._inputsMap[inputDefinition.name] = inputViewModel;

                if (inputViewModel.visibilityRule) {
                    // create dependencies to handle computed visiblity
                    inputViewModel.visibilityRule.predicateRules.forEach((predicateRule: IPredicateRule) => {
                        var name = predicateRule.inputName;
                        if (name) {
                            var dependentInput = this._inputsMap[name];
                            if (dependentInput) {
                                inputViewModel.dependentInputsModel.push(dependentInput);
                            }
                        }
                    });
                }

                // copy previous value
                let inputName = inputViewModel.name.peek();
                let previousInput = previousInputs.filter((input) => input.name.peek() === inputName)[0];
                if (!previousInput) {
                    let savedInputs = this._versionsToInputs[newVersionSpec];
                    if (savedInputs) {
                        previousInput = savedInputs.inputs.filter((input) => input.name.peek() === inputName)[0];
                    }
                }

                if (previousInput) {
                    inputViewModel._value = previousInput._value;
                    inputViewModel.value(previousInput.value.peek());
                }

                // Handle groups
                let groupName = inputDefinition.groupName;
                if (groupName) {
                    if (!groupInputsMap[groupName]) {
                        groupInputsMap[groupName] = [];
                    }
                    groupInputsMap[groupName].push(inputViewModel);

                    let savedGroup: TaskInputDefinitionViewModel<any>[] = null;
                    let savedInputs = this._versionsToInputs[newVersionSpec];
                    if (savedInputs) {
                        savedGroup = savedInputs.groups[groupName];
                    }

                    // copy previous value
                    let previousGroup = previousGroupMap[groupName];
                    if (!previousGroup) {
                        previousGroup = savedGroup;
                        savedGroup = null;
                    }

                    if (previousGroup) {
                        let previousInput = previousGroup.filter((input) => input.name.peek() === inputName)[0];
                        if (!previousInput && !!savedGroup) {
                            previousInput = savedGroup.filter((input) => input.name.peek() === inputName)[0];
                        }

                        if (previousInput) {
                            inputViewModel._value = previousInput._value;
                            inputViewModel.value(previousInput.value.peek());
                        }
                    }

                    // Don't add to the list of normal inputs
                    return null;
                }

                return inputViewModel;
            }).filter((value: BaseInputViewModel) => !!value); // Remove possible nulls from inputs

            groups.forEach((groupVM: GroupDefinitionVM) => {
                if (groupVM.visibilityRule()) {
                    groupVM.visibilityRule().predicateRules.forEach((predicateRule: IPredicateRule) => {
                        var name = predicateRule.inputName;
                        if (name) {
                            var dependentInput = this._inputsMap[name];
                            if (dependentInput) {
                                groupVM.dependentInputsModel.push(dependentInput);
                            }
                        }
                    });
                }
            });
        }

        // "Control Options" group
        groups.push(new GroupDefinitionVM(this._controlOptionsGroupName, TaskResources.ControlOptionsText, true, []));
        groupInputsMap[this._controlOptionsGroupName] = this._getControlOptionsInputs();

        // copy previous control options
        let previousControlGroup = previousGroupMap[this._controlOptionsGroupName];
        if (previousControlGroup) {
            groupInputsMap[this._controlOptionsGroupName].forEach((input) => {
                let previousInput = previousControlGroup.filter((previousInput) => previousInput.name.peek() === input.name.peek())[0];
                if (previousInput) {
                    input.update(previousInput.value.peek());
                }
            });
        }

        this.groups(groups);
        this.groupInputsMap(groupInputsMap);
        this.inputs(inputs);

        // Mark the required property as false for the inputs which belong to groups that are not visible initially.
        var self = this;
        this.groups().forEach((group) => {
            if (!group.isVisible()) {
                var inputsInGroup = self.groupInputsMap()[group.name];
                if (inputsInGroup) {
                    inputsInGroup.forEach((inputVM) => {
                        inputVM.updateParentGroupVisibility(group.isVisible());
                    })
                }
            }
        }, self);

        // This updates the task inputs' required field based on the visibility of group to which the input belongs.
        // If required field for input is true, but the group to which it belongs has visibility false, then the required becomes false,
        // and is toggled appropriately with group visibility with the help of isRequiredInitial, which stores the actual required property of the
        // input as given in task definition.
        this.groups().forEach((group, index) => {
            self.groups()[index].isVisible.subscribe(function () {
                var inputsInGroup = self.groupInputsMap()[self.groups()[index].name];
                if (inputsInGroup) {
                    inputsInGroup.forEach((inputVM) => {
                        inputVM.updateParentGroupVisibility(self.groups()[index].isVisible());
                    });
                }
            })
        }, self);

        this._setupInternalServiceDetailsMap();

        // Setup dependencies between input fields
        this._initializeSourceDefinitions();
        this._initializeDataSourceBindings();
    }
}

/*
 * View model for the list of tasks
 */
export class TaskListViewModel extends DistributedTaskModels.ChangeTrackerModel implements TaskTypes.ITaskList {

    private _taskCollection: DistributedTaskModels.TaskDefinitionCollection;
    private _tasks: Types.ITask[];

    public tasks: KnockoutObservableArray<TaskViewModel>;

    /**
     * Indicates whether this view model is visible or not.
     */
    public visible: KnockoutObservable<boolean>;

    /**
     * Indicates whether this view model is editable or not.
     */
    public editable: KnockoutObservable<boolean>;

    /**
     * Stores taskdelegates contributed by the owner
     */
    public taskDelegates: KnockoutObservable<TaskTypes.ITaskDelegates>;

    /**
     * Task group type of this list
    */
    public type: Types.TaskGroupType;

    constructor(taskCollection: DistributedTaskModels.TaskDefinitionCollection, taskDelegates: KnockoutObservable<TaskTypes.ITaskDelegates>, editable: boolean = true, type: Types.TaskGroupType = Types.TaskGroupType.RunOnAgent) {

        super();

        this.type = type;

        // This will provide us all available tasks
        this._taskCollection = taskCollection;
        this.editable = ko.observable(editable);

        // TODO:Aseem making it visible by default for now until I figure out how it is getting visible.
        this.visible = ko.observable(true);

        this.taskDelegates = taskDelegates;

        this._addDisposable(this.tasks.subscribe((newTasks: TaskViewModel[]) => {
            newTasks.forEach((newTask: TaskViewModel, index: number) => {
                newTask.order(index);
            });
        }));

        this._addDisposable(this.editable.subscribe((editable: boolean) => {
            var tasks = this.tasks();
            tasks.forEach((task) => {
                task.editable(editable);
            });
        }));
    }

    public update(tasks: Types.ITask[]): void {
        this._tasks = tasks || [];
        this._update(this._tasks);
    }

    private _update(tasks: Types.ITask[]): void {
        // Dispose previous tasks first
        this._disposeTasks();

        // Convert data contract to viewmodels
        this.tasks($.map(tasks, (taskInstance: Types.ITask, indexInArray: number) => {
            taskInstance.order = indexInArray;

            let versions = this._taskCollection.getMajorVersions(taskInstance.task.id);
            let taskDefinition = TaskUtils.getTaskDefinition(versions, taskInstance.task.versionSpec);

            return new TaskViewModel(taskInstance, taskDefinition, this.taskDelegates, this.editable.peek(), versions);
        }));
    }

    /**
     * Adds a new task to task list
     */
    public addTask(taskDefinition: DistributedTaskContracts.TaskDefinition): void {
        if (this.editable.peek() && this.isSupported(taskDefinition)) {

            if (this.type === Types.TaskGroupType.RunOnServer && this.tasks().length !== 0) {
                throw TaskResources.OnlyOneManualInterventionTaskIsAllowedError;
            }

            let continueOnError = false;
            let alwaysRun = false;

            if (taskDefinition.definitionType === Types.DefinitionType.metaTask) {
                continueOnError = true;
                alwaysRun = true;
            }

            let versionSpec: string = TaskUtils.getMajorVersionSpec(taskDefinition.version);

            let task: Types.ITask = {
                displayName: "",
                enabled: true,
                continueOnError: continueOnError,
                alwaysRun: alwaysRun,
                timeoutInMinutes: 0,
                inputs: <IDictionaryStringTo<string>>convertTaskDefinitionInputsToTaskInstanceInputs(taskDefinition.inputs),
                task: {
                    id: taskDefinition.id,
                    versionSpec: versionSpec,
                    definitionType: taskDefinition.definitionType
                },
                // condition is not supported by this version of the editor
                condition: undefined,

                // refName is not supported by this version of the editor
                refName: undefined
            };

            task.order = this.tasks().length;

            let versions = this._taskCollection.getMajorVersions(taskDefinition.id);
            this.tasks.push(new TaskViewModel(task, taskDefinition, this.taskDelegates, true, versions));
        }
    }

    /**
     * Returns whether task is supported or not
     */
    public isSupported(taskDefinition: DistributedTaskContracts.TaskDefinition): boolean {
        // We have not introduced taskGroup type in the task definitions, so hard-coding it based on the MI task as it is the only known
        // server container task and also DT SDK only supports 1 task per server container, enforce it here
        //
        return (this.type === Types.TaskGroupType.RunOnServer && !!taskDefinition.runsOn && Utils_Array.contains<string>(taskDefinition.runsOn, Types.TaskRunsOnConstants.RunsOnServer, Utils_String.localeIgnoreCaseComparer))
            || (this.type === Types.TaskGroupType.RunOnAgent && (!taskDefinition.runsOn || taskDefinition.runsOn.length === 0 || Utils_Array.contains<string>(taskDefinition.runsOn, Types.TaskRunsOnConstants.RunsOnAgent, Utils_String.localeIgnoreCaseComparer)))
            || (this.type === Types.TaskGroupType.RunOnMachineGroup && !!taskDefinition.runsOn && Utils_Array.contains<string>(taskDefinition.runsOn, Types.TaskRunsOnConstants.RunsOnMachineGroup, Utils_String.localeIgnoreCaseComparer))
            || (this.type === Types.TaskGroupType.RunOnMachineGroup && !!taskDefinition.runsOn && Utils_Array.contains<string>(taskDefinition.runsOn, Types.TaskRunsOnConstants.RunsOnDeploymentGroup, Utils_String.localeIgnoreCaseComparer))
            || (this.type === Types.TaskGroupType.RunOnAny);
    }

    /**
     * Removes the task from the list.
     */
    public removeTask(task: TaskViewModel): void {
        // Dispose task first
        task.dispose();

        // Remove it from the list
        this.tasks.remove(task);
    }

    /**
     * Moves the task by oldIndex to new index in the list.
     */
    public moveTask(oldIndex: number, newIndex: number): void {
        var tasks = this.tasks();

        // Remove task from the list
        var task = tasks.splice(oldIndex, 1);

        // Add to new location
        tasks.splice(newIndex, 0, task[0]);

        // Assign same list
        this.tasks(tasks);
    }

    public getValue(): Types.ITask[] {
        return $.map(this.tasks(), (task: TaskViewModel) => {
            return task.getValue();
        });
    }

    public getTasks(): DistributedTaskContracts.TaskDefinition[] {
        return this._taskCollection.getLatestVersionArray();
    }

    public revert(): void {
        this._update(this._tasks);
    }

    public dispose(): void {
        this._disposeTasks();
        super.dispose();
    }

    private _disposeTasks(): void {
        $.each(this.tasks(), (index: number, taskInstance: TaskViewModel) => {
            taskInstance.dispose();
        });
    }

    _initializeObservables(): void {
        super._initializeObservables();
        this.tasks = ko.observableArray<TaskViewModel>([]);
    }

    _isDirty(): boolean {
        var tasks = this.tasks(),
            originalTasks = this._tasks || [];

        if (tasks.length !== originalTasks.length) {
            return true;
        }
        var index = 0;
        var dirtyTask = Utils_Array.first(this.tasks(), (task: TaskViewModel) => {
            // at this point both 'tasks' and 'originalTasks' should be of same length
            var originalTask = originalTasks[index];
            var isDifferentTask = false;
            if (originalTask && originalTask.task) {
                if (!task.taskDefinition) {
                    index++;
                    return false;
                }

                isDifferentTask = task.taskDefinition.id !== originalTask.task.id;
            }
            else {
                Diag.logError("TaskDefinition shouldn't be null - inside _isDirty call for TaskListViewModel");
            }
            index++;
            return task._isDirty() || isDifferentTask;
        });

        return !!dirtyTask;
    }

    _isInvalid(): boolean {
        var tasks = this.tasks();

        var invalidTask = Utils_Array.first(this.tasks(), (task: TaskViewModel) => {
            return task._isInvalid();
        });

        return !!invalidTask;
    }
}

export class TasksEditorViewModel extends TaskEditorCommon.TaskEditorCommonViewModel {

    public taskListOwner: KnockoutObservable<Types.ITaskListOwner>;
    public showTasks: KnockoutObservable<boolean>;
    public disableAddTasks: KnockoutObservable<boolean>;
    public selectedTask: KnockoutObservable<TaskViewModel>;
    public addTasksLabel: KnockoutObservable<string>;
    private _taskVisibilityFilter: string[];

    constructor(taskListOwner: KnockoutObservable<Types.ITaskListOwner>, options: Types.ITasksEditorOptions) {
        super(options);

        TaskEditorCommon.TaskEditorCommonViewModel.renderTaskInputTemplate();
        TaskUtils.HtmlHelper.renderTemplateIfNeeded("taskeditor_view", TasksEditorViewModel._taskEditorViewHtmlTemplate);

        this.showTasks = ko.observable(false);
        this.selectedTask = ko.observable(null);
        this.disableAddTasks = ko.observable(false);
        this.taskListOwner = taskListOwner;
        this.addTasksLabel = ko.observable("");
        this._taskVisibilityFilter = options.tasksVisibilityFilter || [];

        if (options) {
            if (options.addTasksLabel) {
                this.addTasksLabel(options.addTasksLabel);
            }

            if (options.disableAddTasks) {
                this.disableAddTasks(true);
            }
        }
    }

    public getDefaultTaskCategoryName(): string {
        return super.getDefaultTaskCategoryName();
    }

    public addTasks(viewModel: TasksEditorViewModel) {
        if (!viewModel.disableAddTasks()) {
            var taskListOwner = viewModel.taskListOwner();
            var dialogModel = new TaskCommonDialogs.AddTasksDialogModel(taskListOwner, viewModel.getDefaultTaskCategoryName(), this._taskVisibilityFilter, null, this._metaTaskManager);
            Dialogs.show(TaskCommonDialogs.AddTasksDialog, dialogModel);
        }
    }

    public onAddTasksKeyDown(viewModel: TasksEditorViewModel, event: JQueryEventObject): boolean {
        return TaskUtils.AccessibilityHelper.triggerClickOnEnterPress(event);
    }

    public createMetaTask(metaTaskDefinition: DistributedTaskContracts.TaskGroup): IPromise<DistributedTaskContracts.TaskGroup> {
        return super.createMetaTask(metaTaskDefinition);
    }

    public isMetaTaskSupported(): boolean {
        return super.isMetaTaskSupported();
    }

    public isSystemVariable(variable: string): boolean {
        return super.isSystemVariable(variable);
    }

    public getVariableDefaultValue(variable: string): string {
        return super.getVariableDefaultValue(variable);
    }

    public dispose(): void {
        if (this.taskListOwner()) {
            this.taskListOwner().taskList.dispose();
        }

        super.dispose();
    }

    private static _taskEditorViewHtmlTemplate = `
    <div class='taskeditor-tasks custom-input'>
        <div class='splitter horizontal' data-bind='tfsSplitter: $data'>
            <div class='leftPane'>
                <span tabindex="0" class='task-button add-task' data-bind=\"hover: { hoverClass: 'hover' }, css: { 'disabled': disableAddTasks }, click: addTasks, event: { keypress: onAddTasksKeyDown }\">
                    <span class='icon icon-add'></span><span class='text' data-bind='text: addTasksLabel'></span>
                </span>
                <div class='tasks-grid initial' data-bind='visible: showTasks'></div>
            </div>
            <div class='handleBar'></div>
            <div class='rightPane'>
                <div class='input-container'>
                    <!-- ko if: selectedTask -->
                    <!-- ko if: selectedTask().taskDefinition -->
                    <!-- ko if: selectedTask().taskDisabled -->
                    <div data-bind=\"text: selectedTask().taskDisabledMessage\"/>
                    <!-- /ko -->
                    <!-- ko with: selectedTask -->
                    <h3 data-bind=\"text: displayNameComputed, css: { 'required-input-message': _isInvalid() }\"></h3>
                    <span id='task-definition-rename' data-bind=\"title: taskRenameTooltip, click: renameTask, visible: editable(), event: { keydown: onRenameTaskKeyDown } \" class='task-icon-near-heading help bowtie-icon icon-edit'  tabindex=0 role='button'></span>
                    <table class='taskeditor-inputs-grid-table custom-input' data-bind='foreach: inputs'>
                        <tbody data-bind=\"applyTemplate: { templateName: templateName, viewModel: $data, parentIndex: '0', cssClass: 'taskeditor-inputs' }\"></tbody>
                    </table>
                    <div class='taskeditor-groups' data-bind='foreach: groups'>
                        <div class='taskeditor-group' data-bind=\"taskEditorGroup: { viewModel: $data }, expandGroupOnKeyBoardEvent: {}, attr:{'aria-label':displayName},  css: { 'taskeditor-group-expanded': isExpanded(), 'taskeditor-group-collapsed': !isExpanded(), 'hidden': !isVisible()}\" tabindex='0'>
                            <fieldset class='fieldset'>
                                <legend><span class='tree-icon'></span>
                                    <label data-bind=\"text: displayName, css: { 'required-input-message': isInvalid() }\"></label>
                                    <sup class='taskeditor-group-inpreview' data-bind=\" title: inPreviewTooltip, 'visible': isInPreview()\" >${TaskResources.TaskGroup_Preview}</sup>
                                </legend>
                                <table class='taskeditor-inputs-grid-table custom-input' data-bind=\"foreach: inputs\">
                                    <tbody data-bind=\"applyTemplate: { templateName: templateName, viewModel: $data, parentIndex: '1', cssClass: 'taskeditor-inputs' }\"></tbody>
                                </table>
                            </fieldset>
                        </div>
                    </div>
                    <!-- ko if: helpMarkDown -->
                    <span></span>
                    <div class='taskeditor-help'>
                        <span class='icon icon-info'></span>
                        <div class='help' data-bind=\"html: helpMarkDown, title: helpMarkDown\"></div>
                    </div>
                    <!-- /ko -->
                    <!-- /ko -->
                    <!-- /ko -->
                    <!-- /ko -->
                </div>
            </div>
        </div>
    </div>`;
}

var TASKS_GRID_DRAGDROP_SCOPE = "TasksList.Tasks";

export class TasksEditorControl extends Adapters_Knockout.TemplateControl<TasksEditorViewModel> {
    private _grid: Grids.Grid;
    private _gridColumns: Grids.IGridColumn[];
    private _gridSelectedIndex: number;
    private _gridRowMover: TaskUtils.GridRowMover;

    private _deleteOnClickHandler: JQueryEventHandler;
    private _deleteOnKeyDownHandler: JQueryEventHandler;
    private _selectionChangeHandler: JQueryEventHandler;
    private _inputRequiredHandler: JQueryEventHandler;
    private _subscriptions: IDisposable[] = [];

    private _webContext: Contracts.WebContext;

    constructor(viewModel: TasksEditorViewModel, options?: any) {
        super(viewModel, options);
    }

    initialize(): void {
        super.initialize();

        // Active empty tasks grid. It will be populated later
        this._grid = <Grids.Grid>Controls.Enhancement.enhance(Grids.Grid, this.getElement().find(".tasks-grid"), this._getTasksGridOptions());

        if (!this.getViewModel().disableAddTasks()) {

            // Grid row mover will handle drag & drop as well as keyboard support for move
            this._gridRowMover = new TaskUtils.GridRowMover(
                this._grid,
                TASKS_GRID_DRAGDROP_SCOPE,
                (rowData) => {
                    return <string>rowData.taskDefinition.friendlyName;
                },
                (oldIndex: number, newIndex: number) => {
                    // Keep selected index
                    this._gridSelectedIndex = newIndex;

                    // Perform move
                    this._getTaskListViewModel().moveTask(oldIndex, newIndex);
                });
        }

        // Attach necessary UI and viewmodels events
        this._attachEvents();

        this._webContext = Context.getDefaultWebContext();
    }

    private _attachEvents(): void {
        var viewModel = this.getViewModel();

        if (!viewModel.disableAddTasks()) {

            // Add delete task handler
            this._grid.getElement().on("click", ".delete-icon", this._deleteOnClickHandler = (evt: JQueryEventObject) => {
                if (viewModel.disableAddTasks.peek()) {
                    return false;
                }

                // Find the row and task to delete
                var row = $(evt.target).closest("div.grid-row")[0],
                    task = <TaskViewModel>ko.dataFor(row);

                // Remove the task
                this._getTaskListViewModel().removeTask(task);

                // Cancel selecting row
                return false;
            });

            this._grid.getElement().on("keydown", ".delete-icon", this._deleteOnKeyDownHandler = (event: JQueryEventObject) => {
                TaskUtils.AccessibilityHelper.triggerClickOnEnterPress(event);
            })
        }

        // Add selection change handler
        this.getElement().on(Grids.Grid.EVENT_SELECTED_INDEX_CHANGED, this._selectionChangeHandler = (evt: JQueryEventObject, rowIndex?: number, dataIndex?: number) => {
            this._gridSelectedIndex = dataIndex;
            var task = this._getTaskListViewModel().tasks()[dataIndex];
            if (task !== this.getViewModel().selectedTask()) {
                if (task) {
                    this.getViewModel().selectedTask(task);
                    if (task.helpMarkDown().length == 0) {
                        // Set help text
                        var taskDefinition = task.taskDefinition;
                        if (taskDefinition) {
                            TaskUtils.PresentationUtils.marked(taskDefinition.helpMarkDown).then((markedString) => {
                                task.helpMarkDown(markedString);
                            });
                        }
                    }
                }
                else {
                    // Possibly empty template is selected
                    this.getViewModel().selectedTask(null);
                }
            }
        });

        this._initOwner(viewModel.taskListOwner());

        this.subscribe(viewModel.taskListOwner, (taskListOwner: Types.ITaskListOwner) => {
            this._initOwner(taskListOwner);
        });

        this.subscribe(viewModel.onTabSelected, () => {
            this._grid.layout();
        });
    }

    private _initOwner(owner: Types.ITaskListOwner) {
        var viewModel = this.getViewModel();

        // Dispose existing subscription first
        this._disposeSubscriptions();

        // This is a flag to select first item initially
        this._gridSelectedIndex = -1;

        if (owner) {
            var taskListViewModel = owner.taskList;
            this._subscriptions.push(this.subscribe(taskListViewModel.tasks, (newTasks: TaskViewModel[]) => {
                // Update the grid with the tasks
                this._updateGridSource(newTasks);
            }));

            this._subscriptions.push(this.subscribe(taskListViewModel.visible, (visible: boolean) => {
                this._updateGridSource(taskListViewModel.tasks());
            }));

            this._updateGridSource(taskListViewModel.tasks());

            this._subscriptions.push(this.subscribe(taskListViewModel.editable, (editable: boolean) => {
                viewModel.disableAddTasks(editable && viewModel.disableAddTasks.peek());
            }));
        }

        viewModel.disableAddTasks(!owner || viewModel.disableAddTasks.peek());
    }

    private _detachEvents(): void {
        // Dispose task subscription if applicable
        this._disposeSubscriptions();

        // Unbind delete task click
        this._grid.getElement().off("click", ".delete-icon", this._deleteOnClickHandler);
        this._deleteOnClickHandler = null;

        // Unbind delete keydown
        this._grid.getElement().off("click", ".delete-icon", this._deleteOnKeyDownHandler);
        this._deleteOnKeyDownHandler = null;

        // Unbind selection change handler
        this.getElement().off(Grids.Grid.EVENT_SELECTED_INDEX_CHANGED, this._selectionChangeHandler);
        this._selectionChangeHandler = null;
    }

    dispose(): void {
        this._detachEvents();

        // Dispose grid
        this._grid.dispose();
        this._grid = null;

        // Dispose grid row mover
        this._gridRowMover.dispose();
        this._gridRowMover = null;
        super.dispose();
    }

    private _disposeSubscriptions(): void {
        this._subscriptions.forEach((value: IDisposable) => {
            value.dispose();
        });
    }

    private _getTaskListViewModel(): Types.ITaskList {
        return this.getViewModel().taskListOwner().taskList;
    }

    private _getTasksGridOptions(): Grids.IGridOptions {
        // Initial options for the grid. It will be populated as definition changes.
        var options = <Grids.IGridOptions>{
            source: [],
            columns: [],
            header: false,
            sharedMeasurements: false,
            lastCellFillsRemainingContent: true,
            cssClass: "taskeditor-tasks-grid"
        };

        // Add context menu. Keeping this as a separate section for readability.
        options = $.extend({
            gutter: {
                contextMenu: true
            },
            contextMenu: {
                items: (contextInfo) => { return this._getContextMenuItems(contextInfo); },
                updateCommandStates: (contextInfo) => { this._updateCommandStates(contextInfo); }
            },
        }, options);

        return options;
    }

    protected _getContextMenuItems(contextInfo: any): any {
        // TODO(rahudha): refactor commands as first class objects when number of commands changes here.
        var menuItems = [
            {
                id: TasksMenuCommands.EnableAll,
                text: TaskResources.Tasks_MenuEnableText,
                icon: "icon-tick",
                action: (contextInfo) => {
                    this._enableSelectedTasks(true);
                },
                "arguments": contextInfo
            },
            {
                id: TasksMenuCommands.DisableAll,
                text: TaskResources.Tasks_MenuDisableText,
                icon: "icon-close",
                action: (contextInfo) => {
                    this._enableSelectedTasks(false);
                },
                "arguments": contextInfo
            }];

        if (this.getViewModel().isMetaTaskSupported()) {
            menuItems.push({
                id: TasksMenuCommands.CreateMetaTask,
                text: TaskResources.Tasks_MenuCreateMetaTask,
                icon: null,
                action: (contextInfo) => {
                    this._createMetaTask(contextInfo);
                },
                "arguments": contextInfo
            });

            menuItems.push({
                id: TasksMenuCommands.ManageMetaTask,
                text: TaskResources.Tasks_MenuManageMetaTask,
                icon: null,
                action: (contextInfo) => {
                    this._manageMetaTask(contextInfo);
                },
                "arguments": contextInfo
            });
        }

        return menuItems;
    }

    private _enableSelectedTasks(status: boolean): void {
        this._grid.getSelectedDataIndices().forEach((index: number) => {
            var vm: TaskViewModel = <TaskViewModel>this._grid.getRowData(index);
            if (vm.editable()) {
                vm.enabled(status);
            }
        });
    }

    private _manageMetaTask(contextInfo: any): void {

        if (contextInfo && contextInfo.item) {
            var metTaskHubContributionId: string = "ms.vss-releaseManagement-web.hub-metatask";
            var metaTaskHubRoute: string = "_taskgroups";

            var vm: TaskViewModel = contextInfo.item;

            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                url: TaskUtils.PresentationUtils.getUrlForExtension(metTaskHubContributionId, "properties", { taskGroupId: vm.taskDefinition.id }, metaTaskHubRoute)
            });
        }
    }

    private _createMetaTask(contextInfo: any): void {
        var tasks: DistributedTaskContracts.TaskGroupStep[] = [];
        var addedVariables: string[] = [];
        var metaTaskInputs: DistributedTaskContracts.TaskInputDefinition[] = [];
        var dataSourceBindings: ServiceEndpointContracts.DataSourceBinding[] = [];
        var groups: DistributedTaskContracts.TaskGroupDefinition[] = [];
        var runsOn: string[];
        var invalidTaskDefinition: DistributedTaskContracts.TaskDefinition;
        var invalidDataIndex = Utils_Array.first(this._grid.getSelectedDataIndices(), ((index: number) => {
            var vm: TaskViewModel = <TaskViewModel>this._grid.getRowData(index);
            var task: Types.ITask = vm.getValue();
            var currentDataSourceBindings: ServiceEndpointContracts.DataSourceBinding[] = [];
            var taskDefinition: DistributedTaskContracts.TaskDefinition = vm.taskDefinition;

            // runsOn for taskGroup: intersect child tasks runsOn
            if (!!runsOn) {
                runsOn = Utils_Array.intersect(runsOn, taskDefinition.runsOn, Utils_String.localeIgnoreCaseComparer);
            } else {
                runsOn = taskDefinition.runsOn;
            }
            if (runsOn.length < 1) {
                invalidTaskDefinition = taskDefinition;
                return true;
            }

            //If definition contains source bindings
            if (taskDefinition.dataSourceBindings) {
                currentDataSourceBindings = TaskUtils.DataSourceBindingUtils.clone(taskDefinition.dataSourceBindings);
            }

            var taskGroupDefinition: DistributedTaskContracts.TaskGroupDefinition = {
                displayName: task.displayName,
                isExpanded: true,
                name: task.displayName,
                tags: [],
                visibleRule: ""
            };

            if (task.inputs) {
                for (var inputName in task.inputs) {
                    if (task.inputs.hasOwnProperty(inputName)) {
                        var value: string = task.inputs[inputName];

                        var sourceInputDefinition: DistributedTaskContracts.TaskInputDefinition = Utils_Array.first(taskDefinition.inputs, (inputDefinition: DistributedTaskContracts.TaskInputDefinition) => {
                            return inputDefinition.name === inputName;
                        });

                        var extractedVariables: DistributedTaskContracts.TaskInputDefinition[] = [];
                        let inputViewModel = vm.getInputViewModel(inputName);
                        if (!inputViewModel || inputViewModel.isVisible()) {
                            extractedVariables = this._extractNonSystemVariables(inputName, value, sourceInputDefinition);
                        }

                        extractedVariables.forEach((variable: DistributedTaskContracts.TaskInputDefinition) => {
                            if (!Utils_Array.contains(addedVariables, variable.name)) {
                                var newDefaultValue: string = this.getViewModel().getVariableDefaultValue(variable.name);
                                if (newDefaultValue != null && newDefaultValue !== "") {
                                    variable.defaultValue = newDefaultValue;
                                }

                                metaTaskInputs.push(variable);
                                addedVariables.push(variable.name);
                            }

                            //Normalize data type
                            TaskUtils.VariableExtractor.normalizeVariableTypeInfo(metaTaskInputs, variable);
                        });

                        //Update current bindings with new name
                        if (extractedVariables.length === 1) {

                            var newlyAddedInput: DistributedTaskContracts.TaskInputDefinition = Utils_Array.first(metaTaskInputs, (serachVariable: DistributedTaskContracts.TaskInputDefinition) => {
                                return serachVariable.name === extractedVariables[0].name;
                            });

                            TaskUtils.DataSourceBindingUtils.updateVariables(currentDataSourceBindings, sourceInputDefinition, newlyAddedInput);
                        }

                        dataSourceBindings = TaskUtils.DataSourceBindingUtils.merge(dataSourceBindings, currentDataSourceBindings);
                    }
                }
            }

            tasks.push(<DistributedTaskContracts.TaskGroupStep>vm.getValue());
            groups.push(taskGroupDefinition);
            return false;
        }));

        // alert user if unable to get runsOn value for taskGroup
        if (runsOn.length < 1 && !!invalidTaskDefinition) {
            alert(Utils_String.format(TaskResources.Task_UnableToCreateTaskGroupMessage, invalidTaskDefinition.name, invalidTaskDefinition.runsOn.join()));

            return;
        }

        this._showCreateMetaTaskDialog(metaTaskInputs, tasks, dataSourceBindings, groups, runsOn);
    }

    private _updateDataSourceBindingVariables(): void {

    }

    private _showCreateMetaTaskDialog(
        metaTaskInputDefinitions: DistributedTaskContracts.TaskInputDefinition[],
        tasks: DistributedTaskContracts.TaskGroupStep[],
        dataSourceBindings: ServiceEndpointContracts.DataSourceBinding[],
        groups: DistributedTaskContracts.TaskGroupDefinition[],
        runsOn: string[]) {

        var viewModel: TaskCommonDialogs.CreateMetaTaskDialogViewModel = new TaskCommonDialogs.CreateMetaTaskDialogViewModel(metaTaskInputDefinitions,
            delegate(this, this._onCreateMetaTaskOkCallBack), tasks, dataSourceBindings, groups, runsOn);

        viewModel.selectedCategory(this.getViewModel().getDefaultTaskCategoryName());

        Dialogs.show(TaskCommonDialogs.CreateMetaTaskDialog, viewModel);
    }

    private _onCreateMetaTaskOkCallBack(metaTaskDefinition: DistributedTaskContracts.TaskGroup): IPromise<void> {
        return this.getViewModel().createMetaTask(metaTaskDefinition).then((savedMetaTaskDefinition: DistributedTaskContracts.TaskGroup) => {
            var taskList: Types.ITaskList = this._getTaskListViewModel();
            var firstIndex: number = null; this._grid.getSelectedDataIndex();

            var tasksToRemove: TaskViewModel[] = [];

            this._grid.getSelectedDataIndices().forEach((index: number) => {
                if (firstIndex == null) {
                    firstIndex = index;
                }
                var vm: TaskViewModel = <TaskViewModel>this._grid.getRowData(index);
                tasksToRemove.push(vm);
            });

            tasksToRemove.forEach((vm: TaskViewModel) => {
                taskList.removeTask(vm);
            });

            TaskCommonDialogs.TaskDefinitionCache.getTaskDefinitionCache().getCurrentTaskDefinitions().push(savedMetaTaskDefinition);

            taskList.addTask(savedMetaTaskDefinition);
            var lastIndex: number = taskList.tasks.length - 1;
            if (firstIndex !== lastIndex) {
                taskList.moveTask(lastIndex, firstIndex);
                this._grid.setSelectedRowIndex(firstIndex);
            }
        });
    }

    private _extractNonSystemVariables(key: string, value: string, sourceInputDefinition: DistributedTaskContracts.TaskInputDefinition): DistributedTaskContracts.TaskInputDefinition[] {
        return TaskUtils.VariableExtractor.extractVariables(key, value, sourceInputDefinition, (variableName: string) => {
            return !this._isSystemVariable(variableName);
        });
    }

    private _isSystemVariable(variable: string): boolean {
        return this.getViewModel().isSystemVariable(variable);
    }

    private _updateCommandStates(menu: any): void {
        var countEnabled: number = 0;
        var countUnEditable: number = 0;
        var isInvalidTaskSelected: boolean = false;
        var selectedDataIndices: number[] = this._grid.getSelectedDataIndices();
        var metaTaskSelected: boolean = false;

        selectedDataIndices.forEach((index: number) => {
            var vm: TaskViewModel = <TaskViewModel>this._grid.getRowData(index);
            if (!vm.editable()) {
                countUnEditable++;
            }
            else if (vm.enabled()) {
                countEnabled++;
            }

            if (vm._isInvalid()) {
                isInvalidTaskSelected = true;
            }

            if (vm.taskDefinition.definitionType === Types.DefinitionType.metaTask) {
                metaTaskSelected = true;
            }
        });

        var selectedDataIndicesCount: number = selectedDataIndices.length;

        var commandStates = [
            {
                id: TasksMenuCommands.EnableAll,
                disabled: countEnabled === (selectedDataIndicesCount - countUnEditable)
            },
            {
                id: TasksMenuCommands.DisableAll,
                disabled: countEnabled === 0
            }
        ];

        if (this.getViewModel().isMetaTaskSupported()) {
            commandStates.push({
                id: TasksMenuCommands.CreateMetaTask,
                disabled: selectedDataIndicesCount <= 0 || isInvalidTaskSelected
            });

            commandStates.push({
                id: TasksMenuCommands.ManageMetaTask,
                disabled: selectedDataIndicesCount !== 1 || !metaTaskSelected
            });
        }

        menu.updateCommandStates(commandStates);
    }

    private _getTasksGridColumns(): Grids.IGridColumn[] {
        var disableTaskAddRemove = this.getViewModel().disableAddTasks();
        if (!this._gridColumns) {
            this._gridColumns = <Grids.IGridColumn[]>[
                {
                    index: 0,
                    width: 50,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        var template = "<div class='grid-cell task-icon-cell'>" +
                            "<!-- ko if: taskDefinition -->" +
                            "<img data-bind=\"attr: { src: taskDefinition.iconUrl }, css: { disabled: disabledInGrid }\" class='task-icon' />" +
                            "<!-- /ko -->" +
                            "</div>";

                        return $(template).width(column.width);
                    }
                },
                {
                    index: 1,
                    width: 50,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        var template = "<div class='grid-cell task-name-cell' data-bind=\"css: { disabled: disabledInGrid }\">" +
                            "<div data-bind=\"text: displayNameComputed, css: { 'required-input-message': _isInvalid() }\" class='task-name'></div>" +
                            "<!-- ko if: taskDefinition -->" +
                            "<div data-bind=\"text: getSectionName(taskDefinition.friendlyName), css: { 'required-input-message': _isInvalid() }\" class='task-instance-name'></div>" +
                            "<!-- /ko -->" +
                            "<!-- ko if: !taskDefinition -->" +
                            "<div class='task-instance-name'>" + TaskResources.TaskDeletedMessage + "</div>" +
                            "<!-- /ko -->" +
                            "</div>";

                        return $(template).width(column.width);
                    }
                },
                {
                    index: 2, // Inivisible cell for knockout binding
                    width: 0, // This should be the last cell because templates for visible cells need to be set before this
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        var row = rowInfo.row[0],
                            grid = <Grids.Grid>this,
                            task = <TaskViewModel>grid.getRowData(dataIndex);

                        if (!disableTaskAddRemove) {
                            // Add delete icon
                            $("<span />").addClass("icon icon-delete-grey-f1-background delete-icon task-activate")
                                .attr("tabindex", "0")
                                .appendTo(row);

                            // Add drag handler
                            $("<span />").addClass("draggable-indicator task-activate").appendTo(row);
                        }

                        // This is an invisible cell to apply knockout binding
                        ko.applyBindings(task, row);

                        // Do not return any content
                        return null;
                    }
                }
            ];
        }

        return this._gridColumns;
    }

    private _updateGridSource(tasks: TaskViewModel[]): void {
        if (!this._getTaskListViewModel().visible()) {
            // No need to render grid if container tab is invisible
            return;
        }

        // This will hide/show according to the task count
        this.getViewModel().showTasks(tasks.length > 0);

        // Update the grid with new source
        this._grid.setDataSource(
            tasks,
            null,
            this._getTasksGridColumns());

        // Grid selection
        if (tasks.length > 0) {
            if (this._gridSelectedIndex < 0) {
                // Initially select first task
                this._grid.setSelectedDataIndex(0);
            } else if (this._gridSelectedIndex < tasks.length) {
                // For successive operations like add/remove, try keeping previous index
                this._grid.setSelectedDataIndex(this._gridSelectedIndex);
            } else {
                // Index not available, select last element
                this._grid.setSelectedDataIndex(tasks.length - 1);
            }
        }
    }
}


ko.bindingHandlers["createTaskInputControls"] = {
    init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
        return { controlsDescendantBindings: true };
    },
    update: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
        var control = $(element);
        var ENHANCED_DATA_KEY = "EnhancedTaskInputControlKey";
        var value: {
            viewModel: TaskInputDefinitionViewModel<any>;
        } = valueAccessor();

        if (value) {

            if ((value.viewModel instanceof ConnectedServiceInputDefinitionViewModel) && (!!value.viewModel.value())) {
                TaskUtils.PresentationUtils.getActionUrl("", "services", { "area": "admin" }).then((actionUrl: string) => {
                    var endpointId = value.viewModel.value().toString();
                    endpointId = endpointId.split(",")[0];
                    value.viewModel.manageLink(actionUrl.concat("?resourceId=", endpointId));
                });
            }

            var inputVM = value.viewModel;
            var editable = false;
            if (inputVM.properties['EditableOptions'] && inputVM.properties['EditableOptions'].toLowerCase() === 'true') {
                editable = true;
            }

            let populateDefaultValue = false;
            if (inputVM.properties[Constants.PopulateDefaultValue] && inputVM.properties[Constants.PopulateDefaultValue].toLowerCase() === 'true') {
                populateDefaultValue = true;
            }

            var multiSelectType: string;
            var type = "list";

            if (inputVM.properties['MultiSelect'] && inputVM.properties['MultiSelect'].toLowerCase() === 'true') {
                type = "treeMultiValue";
                multiSelectType = "treeList";
            }
            else if (inputVM.properties['MultiSelectFlatList'] && inputVM.properties['MultiSelectFlatList'].toLowerCase() === 'true') {
                type = "multi-value";
                multiSelectType = "flatList";
            }

            var inputControl = control.data(ENHANCED_DATA_KEY);
            if (inputVM instanceof PickListInputDefinitionViewModel) {
                var castedInputVM = <PickListInputDefinitionViewModel>inputVM;
                var vmData = castedInputVM.getData();

                if (!inputControl) {
                    // creating control
                    inputControl = <DTCControls.FetchingCombo>Controls.BaseControl.createIn(DTCControls.FetchingCombo, control, {
                        change: function (e: JQueryEventObject) {
                            switch (multiSelectType) {
                                case 'treeList':
                                    var selectedValues = this.getText().split("; ") || [];
                                    castedInputVM.value((findIds(vmData, selectedValues) || []).join(castedInputVM.sepChar));
                                    break;
                                case 'flatList':
                                    var selectedValues = this.getText().split(", ") || [];
                                    var selectedItems = vmData().filter((keyvalue) => { return (selectedValues.indexOf(keyvalue.value()) > -1) });
                                    var selectedKeys = selectedItems.map((keyvalue) => { return keyvalue.key() });
                                    castedInputVM.value((selectedKeys || []).join(castedInputVM.sepChar));
                                    break;
                                default:
                                    var comboBoxValue = this.getText();
                                    var pair = vmData().filter((keyvalue) => { return keyvalue.value() == comboBoxValue })[0];
                                    //since the dropdown is editable, there may exist a value that doesn't map to model
                                    if (pair) {
                                        castedInputVM.value(pair.key());
                                    } else {
                                        castedInputVM.value(comboBoxValue);
                                    }
                                    break;
                            }
                        },
                        source: function (): any {
                            switch (multiSelectType) {
                                case 'treeList':
                                    return vmData().map((keyvalue) => {
                                        return parseKeyValueOutput(keyvalue);
                                    });
                                default:
                                    return vmData().map((keyvalue) => { return keyvalue.value() });
                            }
                        },
                        allowEdit: editable,
                        enabled: viewModel.editable(),
                        type: type,
                        refreshData: () => {
                            return castedInputVM.refreshOptions(false);
                        }
                    });

                    inputControl.getElement().find("input").attr("aria-labelledby", castedInputVM.labelId());
                    control.data(ENHANCED_DATA_KEY, inputControl);
                }

                const fetchingComboControl = inputControl as DTCControls.FetchingCombo;
                fetchingComboControl.setInvalid(inputVM.isInvalid());
                const viewModelData = vmData();
                switch (multiSelectType) {
                    case 'treeList':
                        var jsonObj = viewModelData.map((keyvalue) => {
                            return parseKeyValueOutput(keyvalue);
                        });

                        fetchingComboControl.setSource(jsonObj);
                        var keys = castedInputVM.getValue().split(castedInputVM.sepChar);
                        if (keys.length == 1 && keys[0] == "") {
                            keys = [];
                        }
                        fetchingComboControl.setText(findSuites(jsonObj, keys).join("; "));
                        break;
                    case 'flatList':
                        fetchingComboControl.setSource(viewModelData.map((keyvalue) => { return keyvalue.value() }));
                        var keys = castedInputVM.getValue().split(castedInputVM.sepChar) || [];
                        var items = viewModelData.filter((keyvalue) => { return (keys.indexOf(keyvalue.key()) > -1) });
                        var values = items.map((keyvalue) => { return keyvalue.value() }) || [];
                        fetchingComboControl.setText(values.join(", "));
                        break;
                    default:
                        fetchingComboControl.setSource(viewModelData.map((keyvalue) => { return keyvalue.value() }));
                        let key = castedInputVM.getValue();
                        let pair = viewModelData.filter((keyvalue) => { return keyvalue.key() == key })[0];
                        let setKeyAsText = true;
                        if (pair) {
                            fetchingComboControl.setText(pair.value());
                        } else {
                            if (inputVM.sourced && populateDefaultValue) {
                                //is this sourced?
                                // then let's select the very first value from the list
                                // we do this only for a simple hidden picklist
                                const firstPair = viewModelData && viewModelData[0];
                                if (firstPair) {
                                    fetchingComboControl.setText(firstPair.value());
                                    // oh, also set the value observable to the right key so that any visibility rules etc., gets re-evaluated as well
                                    inputVM.value(firstPair.key());
                                    setKeyAsText = false; // we already set the text
                                }
                            }

                            if (fetchingComboControl.getText() !== key && setKeyAsText) {
                                fetchingComboControl.setText(key);
                            }
                        }
                        break;
                }
            }
            else if (inputVM instanceof ConnectedServiceAzureRMInputDefinitionViewModel) {
                var castedConnectedServiceAzureRMInputVM = <ConnectedServiceAzureRMInputDefinitionViewModel>inputVM;
                var dataSource: KnockoutObservable<GroupedComboBox.IGroupedDataItem<string>[]> = castedConnectedServiceAzureRMInputVM.getGroupDataItem();
                var subscriptions: KnockoutObservable<IDictionaryStringTo<DistributedTaskContracts.AzureSubscription>> = castedConnectedServiceAzureRMInputVM.getSubscriptions();
                var endpoints: KnockoutObservable<IDictionaryStringTo<ServiceEndpointContracts.ServiceEndpoint>> = castedConnectedServiceAzureRMInputVM.getEndpoints();

                var getSubscriptionIdFromDisplayName = (displayName: string): string => {
                    var result: RegExpMatchArray = displayName.match(/\(([A-Fa-f0-9]{8}(?:-[A-Fa-f0-9]{4}){3}-[A-Fa-f0-9]{12})\)$/);
                    return (result && result[1]) ? result[1] : Utils_String.empty;
                }

                var getSubscriptionByName = (subscriptions: IDictionaryStringTo<DistributedTaskContracts.AzureSubscription>, displayName: string): DistributedTaskContracts.AzureSubscription => {
                    var subscriptionId = getSubscriptionIdFromDisplayName(displayName);
                    return subscriptions && subscriptions[subscriptionId] ? subscriptions[subscriptionId] : null
                };

                var getEndpointByName = (endpoints: IDictionaryStringTo<ServiceEndpointContracts.ServiceEndpoint>, displayName: string): ServiceEndpointContracts.ServiceEndpoint => {
                    var endpoint: ServiceEndpointContracts.ServiceEndpoint = null;
                    for (let key in endpoints) {
                        if (Utils_String.localeIgnoreCaseComparer(endpoints[key].name, displayName) === 0) {
                            endpoint = endpoints[key];
                            break;
                        }
                    }

                    return endpoint;
                };

                var getDisplayText = (subscriptions: IDictionaryStringTo<DistributedTaskContracts.AzureSubscription>, endpoints: IDictionaryStringTo<ServiceEndpointContracts.ServiceEndpoint>, key: string): string => {
                    var displayName: string = Utils_String.empty;
                    if (subscriptions && subscriptions[key]) {
                        displayName = Utils_String.localeFormat(TaskResources.AzureSubscriptionDisplayName, subscriptions[key].displayName, subscriptions[key].subscriptionId);
                    }
                    else if (endpoints && endpoints[key]) {
                        displayName = endpoints[key].name;
                    }
                    return displayName;
                };

                if (!inputControl) {
                    // Register grouped behavior on the combo box to enable "grouped" type
                    GroupedComboBox.GroupedComboBehavior.registerBehavior();

                    let options: GroupedComboBox.IGroupedComboOptions = {
                        type: "grouped",
                        id: ConnectedServiceAzureRMInputDefinitionViewModel.AZURERM_INPUTDEFINITION_CONTROL_ID,
                        allowEdit: castedConnectedServiceAzureRMInputVM.editable(),
                        enabled: true,
                        value: "",
                        source: dataSource(),
                        enableFilter: true,
                        autoComplete: true,
                        dropOptions: {
                            // Renderer for items passed into combo box
                            getItemContents: (item) => {
                                return item ? getDisplayText(subscriptions(), endpoints(), item) : "";
                            },
                            // Display when all items have been filtered out
                            emptyRenderer: () => {
                                return $("<div/>").addClass("taskeditor-group-combo-no-data-message").text(TaskResources.NoMatchingSubscriptionFound);
                            },
                            // Renderer for groups in combo box
                            groupRenderer: (groupTitle) => {
                                return $("<div/>").addClass("taskeditor-group-combo-title").text(groupTitle);
                            },

                            itemCss: "taskeditor-group-combo-text-item",
                        },
                        // Text that will be sent to combo text box on item selection
                        getItemText: (item) => { // item is key
                            return item ? getDisplayText(subscriptions(), endpoints(), item) : "";
                        },
                        // Used to compare input text to items in the combobox
                        compareInputToItem: (key, compareText): number => {
                            var displayText: string = getDisplayText(subscriptions(), endpoints(), key);
                            if (displayText !== Utils_String.empty) {
                                return Utils_String.localeIgnoreCaseComparer(compareText, displayText.substr(0, compareText.length));
                            }

                            return -1;
                        },
                        // React to text entry change
                        change: () => {
                            var text: string = inputControl.getText();
                            var subscription: DistributedTaskContracts.AzureSubscription = getSubscriptionByName(subscriptions(), text);
                            if (subscription) {
                                castedConnectedServiceAzureRMInputVM.selectedSubscription(subscription);
                                castedConnectedServiceAzureRMInputVM.value("");
                            } else {
                                castedConnectedServiceAzureRMInputVM.selectedSubscription(null);
                                var endpoint: ServiceEndpointContracts.ServiceEndpoint = getEndpointByName(endpoints(), text);
                                if (endpoint) {
                                    castedConnectedServiceAzureRMInputVM.value(endpoint.id);
                                } else {
                                    castedConnectedServiceAzureRMInputVM.value(text);
                                }
                            }
                        }
                    }

                    // Create grouped combobox
                    inputControl = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, control, options);
                    inputControl.getElement().find("input").attr("aria-labelledby", castedConnectedServiceAzureRMInputVM.labelId());
                    control.data(ENHANCED_DATA_KEY, inputControl);
                }

                var comboControl = <Combos.Combo>inputControl;
                if (comboControl) {
                    comboControl.setSource(dataSource());

                    var selectText = castedConnectedServiceAzureRMInputVM.getValue();

                    var updatedValue = endpoints()[selectText]
                        ? endpoints()[selectText].name
                        : (TaskUtils.VariableExtractor.containsVariable(selectText)
                            ? selectText
                            : '');

                    // update the text for stored value
                    if (comboControl.getText() === "" && updatedValue !== "") {
                        comboControl.setText(updatedValue);
                    }

                    // Update connected service task input on successful inline endpoint creation
                    if (!!castedConnectedServiceAzureRMInputVM.createdEndpoint()) {
                        comboControl.setText(updatedValue);
                        castedConnectedServiceAzureRMInputVM.createdEndpoint(null);
                    }

                    // If its anything other than valid endpoint set the control state to be invalid
                    if (castedConnectedServiceAzureRMInputVM.isLoaded()) {
                        comboControl.setInvalid(updatedValue === "");
                    }
                }
            }
            else if (inputVM instanceof ConnectedServiceInputDefinitionViewModel) {
                var isMultiSelect = multiSelectType === "flatList";
                var getSourceFromMap = (map: { [id: string]: string }) => {
                    var source = [];
                    $.each(map, (id, name) => {
                        source.push(name);
                    });
                    return source.sort(Utils_String.ignoreCaseComparer);
                };

                var getKeyFromValue = (map, value: string) => {
                    //return actual value if parameterized
                    if (TaskUtils.VariableExtractor.containsVariable(value)) {
                        return value;
                    }

                    var keyFound = "";
                    $.each(map, (id, name) => {
                        if (name == value) {
                            keyFound = id;
                        }
                    });
                    return keyFound;
                };

                var getValueFromKey = (map, key: string) => {
                    if (TaskUtils.VariableExtractor.containsVariable(key)) {
                        return key;
                    }

                    var valueFound = "";
                    $.each(map, (id, name) => {
                        if (id == key) {
                            valueFound = name;
                        }
                    });
                    return valueFound;
                };

                var castedConnectedServiceInputVM = <ConnectedServiceInputDefinitionViewModel>inputVM;
                var dataObservable = castedConnectedServiceInputVM.getData();
                var map = dataObservable();
                if (!inputControl) {
                    inputControl = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, control, {
                        change: function (e: JQueryEventObject) {
                            var endpointsValue: string;
                            map = dataObservable();
                            if (isMultiSelect) {
                                var endpoints = [];
                                var splitText = this.getText().split(", ");
                                splitText.forEach((endpoint) => {
                                    endpoints.push(getKeyFromValue(map, endpoint));
                                });
                                endpointsValue = endpoints.length > 0 ? endpoints.join(",") : "";
                            }
                            else {
                                endpointsValue = getKeyFromValue(map, this.getText());
                            }
                            castedConnectedServiceInputVM.value(endpointsValue);
                        },
                        dropOptions: { itemCss: "" },
                        source: source,
                        enabled: castedConnectedServiceInputVM.editable(),
                        type: isMultiSelect ? "multi-value" : "list"
                    });
                    inputControl.getElement().find("input").attr("aria-labelledby", castedConnectedServiceInputVM.labelId());
                    control.data(ENHANCED_DATA_KEY, inputControl);
                }

                var firstValue = "";
                var comboControl = <Combos.Combo>inputControl;
                var serviceValue = castedConnectedServiceInputVM.getValue();
                if (comboControl) {
                    var updatedValue: string;
                    var source = getSourceFromMap(map);
                    comboControl.setSource(source);
                    if (isMultiSelect) {
                        var updatedValues = source.length > 0 ? serviceValue.split(",").map(x => getValueFromKey(map, x)) : [];
                        updatedValues.sort(Utils_String.ignoreCaseComparer);
                        updatedValue = updatedValues.filter(v => v && v != "").join(", ");
                    }
                    else {
                        updatedValue = getValueFromKey(map, serviceValue);
                    }
                    // When the task loads initially, we have only the serviceValue and text in control is empty. We have to update the text in that case.
                    if (comboControl.getText() === "" && updatedValue !== "") {
                        comboControl.setText(updatedValue);
                    }

                    // Update connected service task input on successful inline endpoint creation
                    if (!!castedConnectedServiceInputVM.createdEndpoint()) {
                        comboControl.setText(updatedValue);
                        castedConnectedServiceInputVM.createdEndpoint(null);
                    }
                }
            }
            else if (inputVM instanceof MultiIdentityPickerDefinitionViewModel) {
                var multiIdentityPickerInputVM = <MultiIdentityPickerDefinitionViewModel>inputVM;
                var allowEdit: boolean = multiIdentityPickerInputVM.editable();

                if (!inputControl) {
                    var options: any = {};

                    inputControl = <DTCControls.MultiSelectIdentityPickerControl>Controls.BaseControl.createIn(DTCControls.MultiSelectIdentityPickerControl, control, options);

                    control.change((event: any) => {
                        var ids = (<DTCControls.MultiSelectIdentityPickerControl>inputControl).getSelectedIdentities().existingUsers;
                        var idsString = multiIdentityPickerInputVM._convertValue(ids);
                        multiIdentityPickerInputVM.value(idsString);
                    });

                    control.data(ENHANCED_DATA_KEY, inputControl);
                }

                var identityControl = <DTCControls.MultiSelectIdentityPickerControl>inputControl;
                if (identityControl) {
                    identityControl.setValue(multiIdentityPickerInputVM.getValue());
                    identityControl.setEnable(allowEdit);
                }
            }
        }
    }
};

function parseKeyValueOutput(keyvalue: DistributedTaskModels.KeyValuePair): any {
    var parseKeyValue = tryParseJSON(keyvalue.value());
    if (!parseKeyValue.error) {
        return parseKeyValue.jsonObject;
    }

    return null;
}

function findIds(vmData: KnockoutObservableArray<DistributedTaskModels.KeyValuePair>, selectedValues: Array<string>): Array<number> {

    var jsonObj = vmData().map((keyvalue) => {
        return parseKeyValueOutput(keyvalue);
    });
    var suiteIds = [];

    for (var i = 0; i < selectedValues.length; i++) {
        var suiteStruct = selectedValues[i].split("\\") || [];
        var finalSuiteId = getIdsFromNestedObject(jsonObj, suiteStruct, 0);

        if (finalSuiteId !== -1) {
            suiteIds.push(finalSuiteId);
        }
    }

    return suiteIds;
}

function getIdsFromNestedObject(childrenArray: any[], suiteStruct: Array<string>, index: number): number {

    for (var j = 0; j < childrenArray.length; j++) {
        if (childrenArray[j].text === suiteStruct[index]) {
            if (index == suiteStruct.length - 1) {
                return childrenArray[j].id;
            }
            else {
                return getIdsFromNestedObject(childrenArray[j].children, suiteStruct, index + 1);
            }
        }
    }
    return -1;
}

function findSuites(jsonObj: any[], keys: Array<string>): Array<string> {

    var suites = [];

    for (var i = 0; i < keys.length; i++) {
        var finalSuitePath = getSuiteNamesFromNestedObject(jsonObj, keys[i]);

        if (finalSuitePath) {
            suites.push(finalSuitePath);
        }
    }

    return suites;
}

function getSuiteNamesFromNestedObject(childrenArray: any[], suiteId: string): string {

    for (var j = 0; j < childrenArray.length; j++) {
        if (childrenArray[j].id === parseInt(suiteId)) {
            return childrenArray[j].text;
        }
    }

    for (j = 0; j < childrenArray.length; j++) {
        if (childrenArray[j].children && childrenArray[j].children.length > 0) {
            var name = getSuiteNamesFromNestedObject(childrenArray[j].children, suiteId);
            if (name) {
                return childrenArray[j].text + "\\" + name;
            }
        }
    }

    return null;
}

function tryParseJSON(jsonString): any {
    try {
        var output = JSON.parse(jsonString);
        if (output && typeof output === "object" && output !== null) {
            return { error: false, jsonObject: output };
        } else {
            return { error: true, jsonObject: null };
        }
    }
    catch (e) {
        return { error: true, jsonObject: null };
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Tasks.TasksEditor", exports);

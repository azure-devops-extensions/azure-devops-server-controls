/// <reference types="jquery" />

import ko = require("knockout");

import BuildDefinitionModel = require("Build/Scripts/BuildDefinitionModel");
import BuildDefinitionVariableViewModel = require("Build/Scripts/BuildDefinitionVariableViewModel");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import BuildVariables = require("Build/Scripts/Common.Variables");
import DemandViewModel = require("Build/Scripts/DemandViewModel");
import GeneralViewModel = require("Build/Scripts/GeneralViewModel");
import SourceOptions = require("Build/Scripts/IQueueDialogSourceOptions");
import Telemetry = require("Build/Scripts/Telemetry");
import VariablesList = require("Build/Scripts/VariablesListViewModel");

import BuildClient = require("Build.Common/Scripts/Api2.2/ClientServices");

import KnockoutPivot = require("DistributedTasksCommon/TFS.Knockout.HubPageExplorerPivot");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

import BuildCommon = require("TFS/Build/Contracts");
import DistributedTask = require("TFS/DistributedTask/Contracts");

import Dialogs = require("VSS/Controls/Dialogs");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");

var delegate = Utils_Core.delegate;
var TfsContext = TFS_Host_TfsContext.TfsContext;
var domElem = Utils_UI.domElem;

export class QueueTimeBuildDefinitionVariableViewModel extends BuildDefinitionVariableViewModel.BuildDefinitionVariableViewModel {
    public canRemove: KnockoutObservable<boolean> = ko.observable(false);
    constructor(variable: BuildVariables.IDefinitionVariable, isImplicit: boolean = true) {
        super(variable, isImplicit);
    }
}

export class QueueTimeVariablesListViewModel extends VariablesList.VariablesListViewModel {
    public variables: KnockoutObservableArray<QueueTimeBuildDefinitionVariableViewModel>;
    constructor() {
        super();
    }

    public addVariable(variablesList: QueueTimeVariablesListViewModel, evt: JQueryEventObject): void {
        var newVariable = new QueueTimeBuildDefinitionVariableViewModel({ name: "", value: "", allowOverride: false, isSecret: false }, false);
        newVariable.canRemove(true);
        newVariable.allowOverride(true);
        variablesList.variables.push(newVariable);
    }

    public removeVariable(variable: QueueTimeBuildDefinitionVariableViewModel, evt: JQueryEventObject): void {
        var context = <VariablesQueueBuildDialogPivotTab>(<KnockoutBindingContext>ko.contextFor(evt.target)).$root;
        var variablesList = context.queueTimeVariables.peek();
        variablesList.variables.remove(variable);
        context.queueTimeVariables(variablesList);
    }
}

export class VariablesQueueBuildDialogPivotTab extends KnockoutPivot.BasicPivotTab {
    public queueTimeVariables: KnockoutObservable<VariablesList.VariablesListViewModel> = ko.observable(null);

    constructor(id: string, text: string, templateName: string, variables: KnockoutObservable<VariablesList.VariablesListViewModel>) {
        super(id, text, templateName);

        this.queueTimeVariables(variables());
    }
}

export class DemandsQueueBuildDialogPivotTab extends KnockoutPivot.BasicPivotTab {
    public demands: KnockoutObservableArray<DemandViewModel.DemandViewModel> = ko.observableArray(<DemandViewModel.DemandViewModel[]>[]);

    constructor(id: string, text: string, templateName: string, existingDemands: KnockoutObservableArray<DemandViewModel.DemandViewModel>) {
        super(id, text, templateName);

        this.demands(existingDemands());
    }

    public removeDemand(demand: DemandViewModel.DemandViewModel, evt: JQueryEventObject): void {
        demand.dispose();
        this.demands.remove(demand);
    }

    public addDemand(tab: DemandsQueueBuildDialogPivotTab, evt: JQueryEventObject): void {
        tab.demands.push(new DemandViewModel.DemandViewModel(""));
    }
}

export class QueueDefinitionDialogModel extends KnockoutPivot.HubPageExplorerPivotBase {
    public tfsContext: TFS_Host_TfsContext.TfsContext;
    public queueTimeVariables: KnockoutObservable<QueueTimeVariablesListViewModel> = ko.observable(null);
    public queueTimeDemands: KnockoutObservableArray<DemandViewModel.DemandViewModel> = ko.observableArray(<DemandViewModel.DemandViewModel[]>[]);
    public selectedBranch: KnockoutObservable<string> = ko.observable(null);
    public selectedDefinition: KnockoutObservable<BuildDefinitionModel.BuildDefinitionModel> = ko.observable(null);
    public sourceVersion: KnockoutObservable<string> = ko.observable("");
    public queues: KnockoutObservableArray<DistributedTask.TaskAgentQueue> = ko.observableArray(<DistributedTask.TaskAgentQueue[]>[]);
    public warningMessage: KnockoutObservable<string> = ko.observable("");
    public general: GeneralViewModel.GeneralViewModel;
    public initialized: KnockoutObservable<boolean> = ko.observable(false);
    public okCallback: (queuedBuild: BuildCommon.Build) => void;
    public cancelCallback: Function;

    public telemetrySource: string;

    public sourceOptions: SourceOptions.IQueueDialogSourceOptions;

    public sourceVersionHelpMarkDown: string;

    private variablesTemplate: string = "queue_definition_dialog_variables_content";
    private demandsTemplate: string = "queue_definition_dialog_demands_content";

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext, definition: BuildDefinitionModel.BuildDefinitionModel, queues: DistributedTask.TaskAgentQueue[], defaultBranch: string, sourceOptions: SourceOptions.IQueueDialogSourceOptions, okCallback?: (queuedBuild: BuildCommon.Build) => void, cancelCallback?: Function, options?: any) {
        super(options);
        this.tfsContext = tfsContext;
        this.sourceOptions = sourceOptions;
        this.selectedBranch(defaultBranch);
        this.selectedDefinition(definition);

        // filter out variables that are implicit / not allowed at queue time
        // create clones so that toggling values doesn't affect the variables on the build definition
        var variablesAllowedAtQueueTime: QueueTimeVariablesListViewModel = new QueueTimeVariablesListViewModel();
        definition.variables.variables().forEach((variable: BuildDefinitionVariableViewModel.BuildDefinitionVariableViewModel) => {
            if (variable.allowOverride() && !variable.isImplicit) {
                var queueTimeVariable = new QueueTimeBuildDefinitionVariableViewModel(variable.getValue(), variable.isImplicit);
                variablesAllowedAtQueueTime.variables.push(queueTimeVariable);
            }
        });

        this.queueTimeVariables(variablesAllowedAtQueueTime);

        if (definition.queueStatus() === BuildCommon.DefinitionQueueStatus.Paused) {
            this.warningMessage(BuildResources.MessageBarPausedDefinitionText);
        }

        this.queues(queues);
        this.general = new GeneralViewModel.GeneralViewModel(queues, null);

        // this update call may add the default queue to the queues array
        this.general.update(this.selectedDefinition().getOriginalDefinition());

        this.queueTimeDemands(this.general.demands());
        this.okCallback = okCallback;
        this.cancelCallback = cancelCallback;
        var tab = null;

        // select a tab via ko binding
        this._onTabClick = (tab: KnockoutPivot.PivotTab) => {
            var tabId: string = !!tab ? tab.id : "";
            this.selectedTab(tabId);
            this._onSelectedTabChanged(tabId);
        };

        this._initTabs();

        this.hubTitleContent(this.selectedTab());
        this.selectedTab.subscribe((newValue: string) => {
            this.hubTitleContent(newValue);
        });

        var options: any = this.sourceOptions;
        this.sourceVersionHelpMarkDown = options.sourceVersionHelpMarkDown || "";
    }

    private _initTabs() {
        this.tabs([]);

        // add variables and demands tabs
        var category = BuildResources.QueueBuildDialogVariables;
        var tab = new VariablesQueueBuildDialogPivotTab(category, category, this.variablesTemplate, this.queueTimeVariables);
        this.tabs.push(tab);
        // Select tab - initially variables tab
        this.selectedTab(category);

        category = BuildResources.QueueBuildDialogDemands;

        var tab2 = new DemandsQueueBuildDialogPivotTab(category, category, this.demandsTemplate, this.queueTimeDemands);
        this.tabs.push(tab2);

        this.initialized(true);
    }

    public _onSelectedTabChanged(tabId: string) {
    }
}

// show with Dialogs.show(QueueDefinitionDialog, model)
export class QueueDefinitionDialog extends Dialogs.ModalDialog {
    private _model: QueueDefinitionDialogModel;
    private _buildClient: BuildClient.BuildClientService;

    private _$template: JQuery;
    private _$queue: JQuery;

    constructor(model: QueueDefinitionDialogModel) {
        super(model);

        this._model = model;
    }

    public initialize() {
        super.initialize();

        this._buildClient = TFS_OM_Common.ProjectCollection.getConnection(this._model.tfsContext).getService<BuildClient.BuildClientService>(BuildClient.BuildClientService);

        this._$template = TFS_Knockout.loadHtmlTemplate(this._model.sourceOptions.dialogTemplate);
        this._element.append(this._$template);
        ko.applyBindings(this._model, this._$template[0]);

        this._$queue = this._$template.find("select.queue");

        var queue = (<BuildCommon.BuildDefinitionReference>this._model.selectedDefinition().value).queue;
        if (queue) {
            this._$queue.val("" + queue.id);
        }

        this._$queue.change(delegate(this, this._onQueueChange));

        this._model.renderPivotView(this._element);

        this.updateOkButton(!!this._$queue.val());
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            resizable: false,
            width: 500,
            buttons: {
                "ok": {
                    id: "ok",
                    text: VSS_Resources_Platform.ModalDialogOkButton,
                    click: delegate(this, this.onOkClick)
                },
                "close": {
                    id: "close",
                    text: VSS_Resources_Platform.CloseButtonLabelText,
                    click: delegate(this, this.onClose),
                }
            }
        }, options));
    }

    public getTitle(): string {
        return Utils_String.format(BuildResources.QueueBuildDialogTitleWithName, this._model.selectedDefinition().name());
    }

    public onOkClick() {
        this.updateOkButton(false);

        let selectedDefinition = this._model.selectedDefinition.peek();
        let definitionId: number = selectedDefinition.id.peek();
        let queueId: number = this._$queue.val();
        let projectId: string = selectedDefinition.projectId.peek();
        let queuedDemands = this.getDemands();

        let variables: any = {};
        let fullVariablesList = this._model.queueTimeVariables();
        fullVariablesList.variables().filter((vm: BuildDefinitionVariableViewModel.BuildDefinitionVariableViewModel) => {
            // Skip implicit and secret variables
            return !(vm.isImplicit || vm.isSecret());
        }).forEach((variable: BuildDefinitionVariableViewModel.BuildDefinitionVariableViewModel) => {
            variables[variable.name.peek()] = variable.value.peek();
        });

        let sourceOptions: any = this._model.sourceOptions;
        let build: BuildCommon.Build = <BuildCommon.Build><any>{
            queue: {
                id: queueId
            },
            definition: {
                id: definitionId
            },
            project: {
                id: projectId,
            },
            sourceBranch: sourceOptions.selectedBranch ? sourceOptions.selectedBranch() : this._model.selectedBranch.peek(),
            sourceVersion: this._model.sourceVersion(),
            parameters: JSON.stringify(variables),
            reason: BuildCommon.BuildReason.Manual,
            demands: queuedDemands
        };

        let telemetryProperties = {};
        telemetryProperties[Telemetry.Properties.Outcome] = "Queued";

        Telemetry.publishEvent(Telemetry.Features.BuildQueued, this._model.telemetrySource, telemetryProperties);

        this._queueRequest(build, false);
    }

    public onClose(e?: JQueryEventObject) {
        let telemetryProperties = {};
        telemetryProperties[Telemetry.Properties.Outcome] = "Cancelled";

        Telemetry.publishEvent(Telemetry.Features.BuildQueued, this._model.telemetrySource, telemetryProperties);

        super.onClose(e);
        if ($.isFunction(this._options.cancelCallback)) {
            this._options.cancelCallback();
        }
    }

    private getDemands(): string[] {
        let demands = $.grep(this._model.queueTimeDemands(), (d: DemandViewModel.DemandViewModel) => {
            return !!$.trim(d.name());
        });

        return $.map(demands, (d: DemandViewModel.DemandViewModel) => {
            return d.getValue();
        });
    }

    private _queueRequest(build: BuildCommon.Build, ignoreWarnings: boolean) {
        // check isDisposed in the promise continuations - if the request is slow, the user may close the dialog
        this._buildClient.beginQueueBuild(build, ignoreWarnings).then(
            (queuedRequest: BuildCommon.Build) => {
                if (!this.isDisposed()) {
                    if ($.isFunction(this._options.okCallback)) {
                        this._options.okCallback(queuedRequest);
                    }
                    this.close();
                }
            },
            (details: BuildCommon.BuildRequestValidationResult[]) => {
                if (!this.isDisposed()) {
                    if ($.isArray(details)) {
                        var anyErrors: boolean = $.grep(details, (result: BuildCommon.BuildRequestValidationResult, index: number) => {
                            return result.result === BuildCommon.ValidationResult.Error;
                        }).length > 0;

                        var message: string = $.map(details, (result: BuildCommon.BuildRequestValidationResult, index: number) => {
                            return result.message;
                        }).join("\r\n");

                        if (!anyErrors) {
                            if (confirm(Utils_String.format(BuildResources.QueueBuildDialogRequestValidationFormat_Warnings, message))) {
                                this._queueRequest(build, true);
                            }
                            else {
                                this.updateOkButton(true);
                            }
                        }
                        else {
                            alert(Utils_String.format(BuildResources.QueueBuildDialogRequestValidationFormat_Error, message));
                            this.updateOkButton(true);
                        }
                    }
                    else {
                        VSS.handleError(<any>details);
                        this.updateOkButton(true);
                    }
                }
            });
    }

    public dispose() {
        super.dispose();
        this._model.dispose();
    }

    private _onQueueChange(eventObject: JQueryEventObject) {
        this.updateOkButton(!!this._$queue.val());
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Controls.QueueDefinitionDialog", exports);

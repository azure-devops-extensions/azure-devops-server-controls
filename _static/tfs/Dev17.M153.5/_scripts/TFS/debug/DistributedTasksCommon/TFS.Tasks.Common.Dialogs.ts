///<amd-dependency path="jQueryUI/dialog"/>

import ko = require("knockout");
import Q = require("q");

import VSS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Splitter = require("VSS/Controls/Splitter");
import Service = require("VSS/Service");
import Context = require("VSS/Context");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Html = require("VSS/Utils/Html");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");

import Events_Action = require("VSS/Events/Action");

import DistributedTaskContracts = require("TFS/DistributedTask/Contracts");
import ServiceEndpointContracts = require("TFS/ServiceEndpoint/Contracts");
import BuildContracts = require("TFS/Build/Contracts");

import TaskResources = require("DistributedTasksCommon/Resources/TFS.Resources.DistributedTasksLibrary");
import { TaskDefinitionStepExistingCategories, getTaskCategoryDisplayName } from "DistributedTasksCommon/TFS.Tasks.Categories";
import TaskUtils = require("DistributedTasksCommon/TFS.Tasks.Utils");
import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
import Types = require("DistributedTasksCommon/TFS.Tasks.Types");
import KnockoutPivot = require("DistributedTasksCommon/TFS.Knockout.HubPageExplorerPivot");
import TaskTypes = require("DistributedTasksCommon/TFS.Tasks.Types");
import KoTree = require("DistributedTasksCommon/TFS.Knockout.Tree");

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import Telemetry = require("VSS/Telemetry/Services");
import {ContributionsHttpClient} from "VSS/Contributions/RestClient";
import {DataProviderQuery, DataProviderResult} from "VSS/Contributions/Contracts";

var delegate = Utils_Core.delegate;

/**
 * Rename task dialog 
 */

export class RenameTaskDialogModel {
    public displayName: string;
    public instanceName: string;
    public displayNameComputed: string;
    public isDisplayNameSet: KnockoutObservable<boolean>;
    public okCallback: (path: string) => void;

    constructor(displayName: string, instanceName: string, displayNameComputed: string, isDisplayNameSet: KnockoutObservable<boolean>, okCallback?: (path: string) => void) {
        this.displayName = displayName;
        this.instanceName = instanceName;
        this.displayNameComputed = displayNameComputed;
        this.isDisplayNameSet = isDisplayNameSet;
        this.okCallback = okCallback;
    }
}

export class RenameTaskDialog extends Dialogs.ModalDialog {

    private _model: RenameTaskDialogModel;
    private _$nameInput: JQuery;
    private _resetLink: JQuery;
    private _generateLink: JQuery;
    private _initialValue: string;

    constructor(model: RenameTaskDialogModel) {
        super(model);
        this._model = model;
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            title: TaskResources.Task_RenameTaskLabel,
            resizable: true,
            buttons: {
                "ok": {
                    id: "ok",
                    text: VSS_Resources_Platform.ModalDialogOkButton,
                    click: delegate(this, this.onOkClick)
                },
                "cancel": {
                    id: "cancel",
                    text: VSS_Resources_Platform.ModalDialogCancelButton,
                    click: delegate(this, this.onCancelClick),
                }
            },
            cssClass: "rename-task-dialog",
            contentMargin: false
        }, options));
    }

    public initialize() {
        super.initialize();

        var nameId = "task-name";
        this._initialValue = this._model.displayNameComputed;

        // name
        $("<label />")
            .attr("for", nameId)
            .text(TaskResources.Task_NameLabel)
            .appendTo(this.getElement());

        this._$nameInput = $("<input />")
            .attr("id", nameId)
            .attr("type", "text")
            .attr("placeholder", "Enter a name")
            .addClass("taskeditor-tab rename-task-dialog-input")
            .keyup((evt: any) => { this._validateInput(evt) })
            .appendTo(this.getElement());

        $('<br/>').appendTo(this.getElement());

        this._generateLink = $("<a />")
            .attr('href', "#")
            .text(TaskResources.GenerateLinkText)
            .attr('title', TaskResources.GenerateLinkTooltip)
            .addClass('link-style')
            .appendTo(this.getElement());

        this._generateLink.click((event: JQueryEventObject) => {
            event.preventDefault();
            this._$nameInput.val(this._model.instanceName);
            this._validateInput();
        });

        this._resetLink = $("<a />")
            .attr('href', "#")
            .text(TaskResources.Task_ResetText)
            .addClass('link-style')
            .appendTo(this.getElement());

        this._resetLink.click((event: JQueryEventObject) => {
            event.preventDefault();
            this._$nameInput.val(this._initialValue);
            this._validateInput();
        });

        this._$nameInput.val(this._initialValue);
    }

    public dispose(): void {
        super.dispose();
    }

    public onOkClick(e?: JQueryEventObject): any {
        var inputVal = this._$nameInput.val().trim();
        if (Utils_String.localeComparer(inputVal, this._model.instanceName) !== 0) {
            this._model.isDisplayNameSet(true);
        }
        else if (Utils_String.localeComparer(inputVal, this._initialValue) !== 0) {
            this._model.isDisplayNameSet(true);
        }
        else if (Utils_String.localeComparer(inputVal, this._model.displayNameComputed) === 0) {
            this._model.isDisplayNameSet(false);
        }

        this.setDialogResult(this._$nameInput.val());
        super.onOkClick(e); // This calls the call back from the model
    }

    private _validateInput(e?: JQueryEventObject): void { 
            var isValid = this._$nameInput.val().trim().length > 0;
            this.onButtonStatusChange(undefined, {
                button: "ok", enabled: isValid
            });

            if (isValid) {
                this._$nameInput.removeClass("invalid");
            }
            else {
                this._$nameInput.addClass("invalid");
            }
    }
}

/**
 * Add tasks dialog 
 */
export class AddTasksDialogModel {

    public dialogTemplate: string = "add_tasks_dialog";
    public taskListOwner: TaskTypes.ITaskListOwner;
    public taskDefinitions: KnockoutObservableArray<TaskModels.TaskDefinitionViewModel> = ko.observableArray([]);
    public taskCategoriesTree: KoTree.TreeViewModel;
    public okCallback: () => void;
    public numTasksToUpdate: KnockoutObservable<number> = ko.observable(0);
    public taskTypeDescription: KnockoutObservable<string> = ko.observable("");
    public errorMessage: KnockoutObservable<string> = ko.observable("");
    public taskTypeDescriptioHelpUrl: KnockoutObservable<string> = ko.observable(TaskResources.TaskTypeDescriptioHelpUrl);

    // This would  keep track of when tasks are changed, so that the very first task could be focused on, for accessibility    
    public tasksInitialized: KnockoutObservable<boolean> = ko.observable(false);

    private _allTaskDefinitions: TaskModels.TaskDefinitionViewModel[] = [];
    private _taskDefinitionsByCategory: { [category: string]: TaskModels.TaskDefinitionViewModel[] } = {};
    private _currentCategories: string[] = [];
    private _allCategoriesNodeValue = "all_categories";
    private _allCategoriesNode: TaskModels.TaskCategoryTreeNode;
    private _subscriptions: KnockoutDisposable[] = [];
    private _defaultCategoryOtherThanAllValue: string = "";
    private _defaultCategoryNode: TaskModels.TaskCategoryTreeNode;
    private _taskCategories: KnockoutObservableArray<TaskModels.TaskCategoryTreeNode> = ko.observableArray([]);
    private _visibilityFilter: string[] = [];
    private _galleryServerKey: KnockoutObservable<string> = ko.observable("");

    constructor(taskListOwner: TaskTypes.ITaskListOwner,
        defaultCategoryName: string,
        visibilityFilter?: string[],
        okCallback?: () => void,
        metaTaskManager?: TaskTypes.IMetaTaskManager)
    {
        this.taskListOwner = taskListOwner;
        this.okCallback = okCallback;
        this._allCategoriesNode = new TaskModels.TaskCategoryTreeNode(this._allCategoriesNodeValue, TaskResources.Task_AllCategoriesText);
        this._defaultCategoryNode = this._allCategoriesNode; // all category node as default to begin with
        this._defaultCategoryOtherThanAllValue = defaultCategoryName;
        this.taskCategoriesTree = new KoTree.TreeViewModel(this._taskCategories);
        this._visibilityFilter = visibilityFilter;
        this.taskTypeDescription(this._getTaskTypeDescription(taskListOwner.taskList.type));
        
        //Fetch the current task list from server
        var result: KnockoutObservable<TaskModels.TaskDefinitionsResult>;
        TaskModels.TaskDefinitionCache.metaTaskManager = metaTaskManager;

        TaskModels.TaskDefinitionCache.getTaskDefinitionCache().refresh(this._visibilityFilter).then((result: TaskModels.TaskDefinitionsResult) => {

            var taskDefinitions = result.tasks;
            // Get the latest versions of all the tasks
            this.numTasksToUpdate(result.numTasksToUpdate);
            var latestTaskVersions = new TaskModels.TaskDefinitionCollection(taskDefinitions).getLatestVersionArray();

            // group by category
            $.each(latestTaskVersions, (index: number, definition: DistributedTaskContracts.TaskDefinition) => {
                if (!definition.disabled && this.taskListOwner.taskList.isSupported(definition)) {
                    var definitions: TaskModels.TaskDefinitionViewModel[] = this._taskDefinitionsByCategory[definition.category];
                    if (!definitions) {
                        definitions = [];
                        this._taskDefinitionsByCategory[definition.category] = definitions;
                    }

                    var taskDefinitionViewModel: TaskModels.TaskDefinitionViewModel = new TaskModels.TaskDefinitionViewModel(definition, () => {
                        this._addTaskToDefinition(definition);
                    });

                    definitions.push(taskDefinitionViewModel);
                    this._allTaskDefinitions.push(taskDefinitionViewModel);
                }
            });

            // sort all tasks
            this._sortDefinitions(this._allTaskDefinitions);
            this.taskDefinitions(this._allTaskDefinitions);

            // sort tasks per category
            $.each(this._taskDefinitionsByCategory, (category: string, definitions: TaskModels.TaskDefinitionViewModel[]) => {
                this._currentCategories.push(category);
                this._sortDefinitions(definitions);
            });

            this._taskCategories(this._getOrderedCategoryNodes());
            this.taskCategoriesTree.selectedNode(this._defaultCategoryNode);
            if (this._defaultCategoryOtherThanAllValue !== this._allCategoriesNodeValue) {
                // update task definitions
                this.taskDefinitions(this._taskDefinitionsByCategory[this._defaultCategoryOtherThanAllValue]);
                this.tasksInitialized(!this.tasksInitialized.peek());
            }

            // Bind selection
            this._subscriptions.push(this.taskCategoriesTree.selectedNode.subscribe((newNode: TaskModels.TaskCategoryTreeNode) => {
                newNode.selected(true);
                var value = newNode.value();
                if (value === this._allCategoriesNodeValue) {
                    this.taskDefinitions(this._allTaskDefinitions);
                }
                else {
                    this.taskDefinitions(this._taskDefinitionsByCategory[value]);
                }
                this.tasksInitialized(!this.tasksInitialized.peek());
            }));
        });

        if (!Context.getPageContext().webAccessConfiguration.isHosted) {
            this._beginGetMarketPlaceData().then((serverKey) => {
                this._galleryServerKey(serverKey);
            });
        }
    }

    private _getTaskTypeDescription(type: Types.TaskGroupType): string {
        if (type === Types.TaskGroupType.RunOnServer) {
            return TaskResources.RunOnServerTaskTypeDescription;
        }

        return "";
    }

    private _addTaskToDefinition(definition: DistributedTaskContracts.TaskDefinition) {
        this.errorMessage("");
        try {
            this.taskListOwner.taskList.addTask(definition);
        }
        catch (e) {
            this.errorMessage(e);
        }
    }

    public onMarketplaceLinkClick(object: AddTasksDialogModel, e: JQueryEventObject) {
        e.preventDefault();

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            TaskModels.CustomerIntelligenceInfo.Area,
            TaskModels.CustomerIntelligenceInfo.FeatureTask,
            {
                "ExtensionMarketPlaceClicked": 1
            }));

        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
            url: this.getMarketplaceLink()
        });
    }

    public getMarketplaceLink() {
        let marketplaceUrl = "https://go.microsoft.com/fwlink/?LinkId=797831";

        if (!Context.getPageContext().webAccessConfiguration.isHosted && this._galleryServerKey()) {
            marketplaceUrl = marketplaceUrl + "&serverKey=" + encodeURIComponent(this._galleryServerKey());
        }

        return marketplaceUrl;
    }

    private _beginGetMarketPlaceData(): IPromise<string> {
        var contributionsClient = Service.VssConnection.getConnection().getHttpClient(ContributionsHttpClient);

        var query: DataProviderQuery = {
            context: {
                properties: {}
            },
            contributionIds: ["ms.vss-tfs.marketplace-data-provider"]
        } as DataProviderQuery;

        return contributionsClient.queryDataProviders(query).then<string>((contributionDataResult: DataProviderResult) => {
            const pageData: any = contributionDataResult.data["ms.vss-tfs.marketplace-data-provider"] || {};
            return pageData && pageData.serverKey;
        });
    }

    private _getOrderedCategoryNodes(): TaskModels.TaskCategoryTreeNode[] {
        var nodes: TaskModels.TaskCategoryTreeNode[] = [this._allCategoriesNode];  // "All" categories as first node
        Object.keys(TaskDefinitionStepExistingCategories).forEach((categoryName) => {
            if ($.inArray(categoryName, this._currentCategories) != -1) {
                var node = new TaskModels.TaskCategoryTreeNode(categoryName, getTaskCategoryDisplayName(categoryName));
                if (categoryName === this._defaultCategoryOtherThanAllValue) {
                    this._defaultCategoryNode = node;
                }
                nodes.push(node);
            }
        });
        return nodes;
    }

    private _sortDefinitions(taskDefinitions: TaskModels.TaskDefinitionViewModel[]) {
        taskDefinitions.sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.friendlyName(), b.friendlyName()));
    }
}

export class AddTasksDialog extends Dialogs.ModalDialog {
    private _model: AddTasksDialogModel;
    private _$template: JQuery;

    private _splitter: Splitter.Splitter;
    private _disposables: IDisposable[] = [];

    constructor(model: AddTasksDialogModel) {
        super(model);

        this._model = model;
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            resizable: false,
            draggable: true,
            height: 600,
            width: 650,
            buttons: {
                "ok": {
                    id: "ok",
                    text: (options && options.okText) || VSS_Resources_Platform.CloseButtonLabelText,
                    click: delegate(this, this.onOkClick),
                    disabled: "disabled"
                }
            },
            contentMargin: false,
            coreCssClass: "add-tasks-dialog-content"
        }, options));
    }

    public initialize() {
        super.initialize();

        TaskUtils.HtmlHelper.renderTemplateIfNeeded("task_category_tree_node", AddTasksDialog._taskEditorNodeHtmlTemplate);
        TaskUtils.HtmlHelper.renderTemplateIfNeeded(this._model.dialogTemplate, AddTasksDialog._dialogHtmlTemplate);

        this._$template = TaskUtils.loadHtmlTemplate(this._model.dialogTemplate, "add-tasks-dialog-tasksexplorer");

        this._element.append(this._$template);

        ko.applyBindings(this._model, this._$template[0]);
       
        this._splitter = <Splitter.Splitter>Controls.Enhancement.enhance(Splitter.Splitter, this.getElement().find(".splitter"));
        this._splitter.leftPane.css("width", "20%");
        this._splitter.rightPane.css("left", "20%");
        this._splitter.handleBar.css("left", "20%");

        this.updateOkButton(true);
        this._disposables.push(this._model.numTasksToUpdate.subscribe((value) => { this.getFooterText(value) }));
        this._disposables.push(this._model.tasksInitialized.subscribe(() => {
            let firstTaskElement = this._element.find(".taskeditor-add-tasks-dialog").find(".task-definition").get(0);
            if (firstTaskElement) {
                $(firstTaskElement).find(".task-definition-add").find("button").focus();
            }
        }));

        if (!!this._model.taskTypeDescription.peek()) {
            this.getElement().find(".taskeditor-add-tasks").addClass("taskeditor-add-tasks-withdescription");
        }
        else {
            this.getElement().find(".taskeditor-add-tasks").addClass("taskeditor-add-tasks-withoutdescription");
        }
    }

    public getTitle(): string {
        return TaskResources.Task_AddTasksDialogTitle;
    }

    public getFooterText(value: number): void {
        if (value > 0) {
            $(".ui-dialog-buttonpane").append(Utils_String.format(TaskResources.Task_NumTasksUpdateInProgress, value));
        }
    }

    public onOkClick() {
        this.close();
        if ($.isFunction(this._model.okCallback)) {
            this._model.okCallback();
        }
    }

    dispose(): void {
        this._disposables.forEach((disposable) => {
            disposable.dispose();
        });
        super.dispose();
    }    

    private static _taskEditorNodeHtmlTemplate = `
    <li class='taskeditor-node' data-bind=\"css: { 'dirty': dirty, 'expanded': expanded(), 'collapsed': !expanded(), 'no-children': !showIcon(), 'hover': hovering, 'selected': selected }, attr: {'title': text}\">
        <div tabindex='0' class='node-content' data-bind=\"event: { contextmenu: _onContextMenuClick, mouseover: _onMouseover, mouseout: _onMouseout, click: _onClick, keydown: _onKeyDown }\">
            <div class='icon tree-icon' data-bind=\"css: { 'invisibleIcon': !isFolder() }, click: _onTreeIconClick\"></div>
            <div data-bind='css: cssClass'><label data-bind=\"text: text, css: { 'dirty': dirty }\" /></div>
        </div>
        <ul class='tree-children' data-bind=\"template: { name: 'task_category_tree_node', foreach: nodes }, visible: expanded() && nodes().length !== 0\"></ul>
    </li>`;

    private static _dialogHtmlTemplate = `
    <div class='splitter vertical taskeditor-tasks-explorer'>
        <div class='task-editor-error' data-bind='visible: errorMessage()'>
            <div class='task-editor-typedescription-message' >
                <span class="alert-message">
                    <i class="bowtie-icon bowtie-status-warning warning_col"></i>
                    <span data-bind='text: taskTypeDescription'></span> ${Utils_String.localeFormat(TaskResources.TaskTypeDescriptionHelpText, TaskResources.TaskTypeDescriptioHelpUrl)} 
                    <a data-bind='href: taskTypeDescriptioHelpUrl' target="_blank"><span class="bowtie-icon bowtie-navigate-external"></span></a>
                </span>
            </div>
        </div>
        <div class='task-editor-typedescription' data-bind='visible: (!!taskTypeDescription() && !errorMessage())'>
            <div class='task-editor-typedescription-message' >
                <span class="alert-message">
                    <i class="bowtie-icon bowtie-status-info success_blue"></i>
                    <span data-bind='text: taskTypeDescription'/> ${Utils_String.localeFormat(TaskResources.TaskTypeDescriptionHelpText, TaskResources.TaskTypeDescriptioHelpUrl)}                    
                </span>
            </div>
        </div>
        <div class='splitter horizontal taskeditor-add-tasks'>
            <div class='leftPane'>
                <div class='taskeditor-tree taskeditor-tree-task-category'>
                    <ul class='tree-children' data-bind=\"template: { name: 'task_category_tree_node', foreach: taskCategoriesTree.nodes }\"></ul>
                </div>
            </div>
            <div class='handleBar'></div>
            <div class='rightPane splitter vertical'>
                <div class='taskeditor-add-tasks-dialog' data-bind='foreach: taskDefinitions'>
                    <div class='task-definition'>
                        <div class='task-definition-details'>
                            <!-- ko if: hasIcon -->
                            <div class='icon task-definition-details-icon'><img data-bind='attr: { src: iconUrl }' /></div>
                            <!-- /ko -->
                            <!-- ko ifnot: hasIcon -->
                            <div class='icon task-definition-details-icon'></div>
                            <!-- /ko -->
                            <div class='taskeditor-dialog-item-title task-definition-details-title' data-bind='text: friendlyName'></div>
                        </div>
                        <div class='task-definition-description' data-bind='text: description'></div>
                        <div class='task-definition-add'>
                            <button data-bind='click: addCommand, event: {keydown: onAddButtonKeyDown}' value='Add'>${TaskResources.Task_AddLabelText}</button>
                        </div>
                    </div>
                </div>
                <div class='extensions-external' data-bind=\"click: onMarketplaceLinkClick\">
                    <a data-bind=\"attr: { 'href': getMarketplaceLink() }\"><span class='bowtie-icon bowtie-status-info-outline'></span>&nbsp;${TaskResources.Tasks_MarketPlaceText}<span class='bowtie-icon bowtie-navigate-external'></span></a>
                </div>
            </div>
        </div>
    </div>`;
}

/**
 * Wizard dialog 
 */
export class WizardDialogModel {
    public dialogTemplate: string = "wizard_dialog";
    public wizardPages: KnockoutObservableArray<TaskModels.WizardPage> = ko.observableArray([]);
    public currentWizardPage: KnockoutObservable<TaskModels.WizardPage> = ko.observable(null);

    // this should be set to true when data is available to create the wizard
    public loaded: KnockoutObservable<boolean> = ko.observable(false);

    public dialogCssClass = "wizard-dialog";

    public errorMessage: KnockoutObservable<string> = ko.observable("");
    public lastPageNextIcon: KnockoutObservable<string> = ko.observable("icon-save");
    public lastPageNextText: KnockoutObservable<string> = ko.observable(TaskResources.WizardSave);

    public chevronNextButtonIcon = "bowtie-icon bowtie-chevron-right";
    public chevronPrevButtonIcon = "bowtie-icon bowtie-chevron-left";

    public standardButtonCssClass = "button-standard"; // this needs to be applied when we add/remove  buttons, so that default styling can be applied 
    public jqeryUIClass = "ui-icon";

    public rootDialogCssClass = "root-wizard-dialog"; // the whole div, which helps in controlling the buttonpane
    public brandColorCssClass = "cta";

    public nextButtonId = "next";
    public prevButtonId = "prev";
    public closeButtonId = "close";

    constructor(dialogCssClass?: string) {
        if (dialogCssClass) {
            this.dialogCssClass = dialogCssClass;
        }
        TaskUtils.HtmlHelper.renderTemplateIfNeeded(this.dialogTemplate, WizardDialogModel._wizardDialogHtmlTemplate);

        this.wizardPages.subscribe((pages) => {
            if (pages && pages.length > 0) {
                var currentPage = this.currentWizardPage.peek();
                if (!currentPage) {
                    //select first page to begin with
                    this.currentWizardPage(pages[0]);
                }
            }
        });

    }

    public getPreviousPage(): TaskModels.WizardPage {
        var pages = this.wizardPages.peek();
        var currentPage = this.currentWizardPage.peek();
        var index = currentPage.order;
        if (index - 1 >= 0) {
            return pages[index - 1];
        }
        return null;
    }

    public getNextPage(): TaskModels.WizardPage {
        var pages = this.wizardPages.peek();
        var currentPage = this.currentWizardPage.peek();
        var index = currentPage.order;
        if (index + 1 < pages.length) {
            return pages[index + 1];
        }
        return null;
    }

    public insertAfterCurrentPage(pageToInsert: TaskModels.WizardPage) {
        var pages = this.wizardPages.peek();
        var currentPage = this.currentWizardPage.peek();
        var index = currentPage.order;
        pages.splice(index + 1, 0, pageToInsert);
        this.wizardPages(pages);
    }

    private static _wizardDialogHtmlTemplate = `
    <!-- ko if: errorMessage -->
    <div class='input-error-tip' data-bind=\"text: errorMessage, attr: { title: errorMessage }\"></div>
    <!-- /ko -->
    <div class='status-indicator' data-bind='visible: !loaded()'>
            <div class='status'>
                <table>
                    <tr>
                        <td>
                            <span class='icon big-status-progress'></span>
                        </td>
                    </tr>
                </table>
            </div>
     </div>
    <div data-bind='visible: loaded, css: dialogCssClass'>
        <!-- ko with: currentWizardPage -->
        <div class='wizard-container'  data-bind='css: cssClass'>
            <span class='page-heading' data-bind=\"text: title, visible: title\"></span>
            <div class='page-content custom-input' data-bind=\"applyTemplate: { templateName: templateName, viewModel: viewModel, fadeIn: 'true' }\"></div>
        </div>
        <!-- /ko -->
    </div>`;
}

export interface IDialogButton {
    click?: () => {};
    icons?: { primary: string };
    id: string;
    text: string;
}

export class WizardDialog<T extends WizardDialogModel> extends Dialogs.ModalDialogO<any> {
    private _model: T;
    private _disposables: IDisposable[] = [];
    private _pixelsForTransition = 0;
    private _nextButtonPrevIconClass = "";

    constructor(model: T) {
        super(model);
        this._model = model;
    }

    public initialize() {
        super.initialize();
        var $template = TaskUtils.loadHtmlTemplate(this._model.dialogTemplate);
        this._element.append($template);
        ko.applyBindings(this._model, $template[0]);
        // subscribe to current selected page
        this._disposables.push(ko.computed(() => {
            var currentPage = this._model.currentWizardPage();
            if (!currentPage) {
                return;
            }
            var order = currentPage.order;
            var isLastPage = order === this._model.wizardPages.peek().length - 1;

            if (isLastPage) {
                //last page
                this._nextButtonPrevIconClass = this._model.chevronNextButtonIcon;

                if (order > 0) {
                    this.addPreviousButton();
                }

                this._updateNextButton(this._model.lastPageNextText.peek(), this._model.lastPageNextIcon.peek(), true);
            }
            else if (order === 0) {
                // first page
                this.removePreviousButton();
                this._resetNextButton();
            }
            else {
                this._resetNextButton();
                this.addPreviousButton();
            }

            // update final status of 'next' button based on validity and wizard loading status
            var pageVM = currentPage.viewModel();
            if (pageVM) {
                var enable = !pageVM.isInvalid() && this._model.loaded();
                this.changeNextButtonStatus(enable);
            }

        }));

        // add our own css to root ui-dialog to take much control
        this._element.closest(".ui-dialog").addClass(this._model.rootDialogCssClass);
    }

    private _resetNextButton() {
        this.changeNextButtonStatus(this._model.loaded.peek());
        this._updateNextButton(TaskResources.WizardNext, this._model.chevronNextButtonIcon, true);
    }

    public initializeOptions(options?: T) {
        super.initializeOptions($.extend({
            resizable: false,
            draggable: true,
            height: 600,
            width: 600,
            coreCssClass: options.dialogCssClass,
            buttons: {
                "next": {
                    id: options.nextButtonId,
                    text: TaskResources.WizardNext,
                    click: delegate(this, this.onNextClick),
                    icons: {
                        secondary: options.chevronNextButtonIcon
                    }
                },
                "close": {
                    id: options.closeButtonId,
                    text: VSS_Resources_Platform.ModalDialogCancelButton,
                    click: delegate(this, this._close),
                }
            },
            noAutoCta: true,
            useBowtieStyle: true,
            contentMargin: false
        }, options));
    }

    public addDisposable(disposable: IDisposable) {
        this._disposables.push(disposable);
    }

    public onPrevClick() {
        var prevPage = this._model.getPreviousPage();
        if (prevPage) {
            this._model.loaded(false);
            this._model.errorMessage("");
            this._model.currentWizardPage(prevPage);
            this._model.loaded(true);
        }
    }

    public changeNextButtonStatus(enable: boolean) {
        this.onButtonStatusChange(undefined, { button: this._model.nextButtonId, enabled: enable });
    }

    public addPreviousButton() {
        var buttons = this._getExistingButtonsDictionary();
        if (buttons[this._model.prevButtonId]) {
            // already exists, do nothing
            return;
        }
        var previousButton: IDialogButton = {
            icons: {
                primary: this._model.chevronPrevButtonIcon
            },
            id: this._model.prevButtonId,
            text: TaskResources.WizardPrevious,
            click: delegate(this, this.onPrevClick)
        };

        var newButtons = {};
        newButtons[this._model.prevButtonId] = previousButton;

        $.extend(newButtons, buttons); // need to extend newbuttons so that the new button comes to the far left
        this.getElement().dialog("option", "buttons", newButtons);

        this._addStandardClass();
    }

    public removePreviousButton() {
        var buttons = this._getExistingButtonsDictionary();
        if (buttons[this._model.prevButtonId]) {
            delete buttons[this._model.prevButtonId];
            this.getElement().dialog("option", "buttons", buttons);
            this._addStandardClass();
        }
    }

    public onNextClick() {
        this._model.errorMessage("");

        var nextPage = this._model.getNextPage();
        if (nextPage) {
            this._model.loaded(false);
            this._model.currentWizardPage(nextPage);
            this._model.loaded(true);
        }
        else {
            // done
            this._model.currentWizardPage(null);
        }
    }

    public onOkClick() {
        this._close();
    }

    public dispose() {
        super.dispose();
        $.each(this._disposables, (index, disposable) => {
            disposable.dispose()
        });
    }

    public getViewModel(): T {
        return this._model;
    }

    private _addStandardClass() {
        this._addOrRemoveButtonsClass(true, { css: this._model.standardButtonCssClass, add: true });
    }

    private _getExistingButtonsDictionary(): IDictionaryStringTo<IDialogButton> {
        // see http://api.jqueryui.com/dialog/#option-buttons
        return <any>this.getElement().dialog("option", "buttons");
    }

    private _close() {
        this.close();
        this.dispose();
    }

    private _addOrRemoveButtonsClass(removeJqueryUIIconClass: boolean, data?: { css: string, add: boolean }) {
        var buttonsPane = this.getElement().siblings(".ui-dialog-buttonpane");
        if (removeJqueryUIIconClass) {
            buttonsPane.find('.ui-button-icon-primary,.ui-button-icon-secondary').removeClass(this._model.jqeryUIClass);
        }
        if (data) {
            var buttons = buttonsPane.find('.ui-button');
            if (data.add) {
                buttons.addClass(data.css);
            }
            else {
                buttons.removeClass(data.css);
            }
        }
    }

    private _updateNextButton(changeTo: string, iconToSet: string, addBrandColor: boolean) {
        var button = this.getElement().siblings(".ui-dialog-buttonpane").find("#" + this._model.nextButtonId); // this is how modal dialog internally finds the buttons

        let textSpan = button.find(".ui-button-text");
        if (!textSpan.hasClass("wizard-next-button-text")) {
            if (!!iconToSet) {
                textSpan.addClass("wizard-next-button-text");
            }
        }
        else if (!iconToSet) {
            textSpan.removeClass("wizard-next-button-text");
        }

        textSpan.text(changeTo);
        var iconSpan = button.find('.ui-button-icon-secondary');
        if (this._nextButtonPrevIconClass === iconToSet) {
            return;
        }
        iconSpan.removeClass(this._nextButtonPrevIconClass);
        iconSpan.addClass(iconToSet);
        this._nextButtonPrevIconClass = iconToSet;
        this._addOrRemoveButtonsClass(true); //jquery adds this, this interfers with bowtie we are using

        if (addBrandColor) {
            button.addClass(this._model.brandColorCssClass);
        }
        else {
            button.removeClass(this._model.brandColorCssClass);
        }
    }
}

// compat
export class TaskDefinitionCache extends TaskModels.TaskDefinitionCache {

    public static getTaskDefinitionCache(): TaskDefinitionCache {
        return TaskModels.TaskDefinitionCache.getTaskDefinitionCache();
    }

    public getCurrentTaskDefinitions(): DistributedTaskContracts.TaskDefinition[] {
        return super.getCurrentTaskDefinitions();
    }

    //This method fetches updated build definitions from the service
    public refresh(visibilityFilter?: string[]): IPromise<TaskModels.TaskDefinitionsResult> {
        return super.refresh(visibilityFilter);
    }

    public static setMetaTaskManager(metaTaskManager: TaskTypes.IMetaTaskManager): void {
        TaskModels.TaskDefinitionCache.metaTaskManager = metaTaskManager;
        TaskDefinitionCache.metaTaskManager = metaTaskManager;
    }
}

export class MetaTaskPropertiesModel {
    public taskGroupName: string;

    public taskGroupDescription: string;

    public selectedCategory: string;

    public metaTaskInput: DistributedTaskContracts.TaskInputDefinition[];

    constructor(taskGroupName: string, taskGroupDescription: string, selectedCategory: string,
        metaTaskInput: DistributedTaskContracts.TaskInputDefinition[]) {
        this.taskGroupName = taskGroupName;
        this.taskGroupDescription = taskGroupDescription;
        this.selectedCategory = selectedCategory;
        this.metaTaskInput = metaTaskInput;
    }

    public update(taskGroupName: string, taskGroupDescription: string, selectedCategory: string, metaTaskInput: DistributedTaskContracts.TaskInputDefinition[]) {
        this.taskGroupName = taskGroupName;
        this.taskGroupDescription = taskGroupDescription;
        this.selectedCategory = selectedCategory;
        this.metaTaskInput = metaTaskInput;
    }
}

export class TaskInputDefinitionViewModel {
    public name: KnockoutObservable<string> = ko.observable("");
    public defaultValue: KnockoutObservable<string> = ko.observable("");
    public helpMarkDown: KnockoutObservable<string> = ko.observable("");
    public groupName: string = "";

    private _taskInputDefinition: DistributedTaskContracts.TaskInputDefinition;

    constructor(taskInputDefinition: DistributedTaskContracts.TaskInputDefinition) {
        this._taskInputDefinition = taskInputDefinition;

        if (taskInputDefinition) {
            this.name(taskInputDefinition.name);
            this.defaultValue(taskInputDefinition.defaultValue);
            this.helpMarkDown(taskInputDefinition.helpMarkDown);
            this.groupName = taskInputDefinition.groupName;
        }
    }

    public getTaskInputDefinition(): DistributedTaskContracts.TaskInputDefinition {
        if (this._taskInputDefinition) {
            this._taskInputDefinition.name = this.name();
            this._taskInputDefinition.defaultValue = this.defaultValue();
            this._taskInputDefinition.helpMarkDown = this.helpMarkDown();
            this._taskInputDefinition.groupName = this.groupName;
        }

        return this._taskInputDefinition;
    }
}

export class MetaTaskPropertiesBaseViewModel implements Adapters_Knockout.ITemplateViewModel {
    public taskGroupName: KnockoutObservable<string> = ko.observable("");

    public taskGroupDescription: KnockoutObservable<string> = ko.observable(""); 

    public editable: KnockoutObservable<boolean> = ko.observable(true);

    public category: KnockoutObservableArray<string> = ko.observableArray(TaskTypes.MetaTaskCategoryType.metaTaskCategory);

    public selectedCategory: KnockoutObservable<string> = ko.observable(TaskTypes.MetaTaskCategoryType.metaTaskCategory[0]);

    public helpMarkDown: KnockoutObservable<string> = ko.observable(TaskResources.Task_HelpMessageForTaskCategory);

    public metaTaskInput: KnockoutObservableArray<TaskInputDefinitionViewModel> = ko.observableArray([]);

    public dirty: KnockoutComputed<boolean> = ko.computed(() => { return false; });

    public onlySafeFieldsDirty: boolean = false;

    public invalid: KnockoutComputed<boolean> = ko.computed(() => { return false; });

    public areSystemVariablesDirty: KnockoutObservable<boolean> = ko.observable(false);

    public dataSourceBindings: KnockoutObservableArray<ServiceEndpointContracts.DataSourceBinding> = ko.observableArray([]);

    public groups: KnockoutObservableArray<DistributedTaskContracts.TaskGroupDefinition> = ko.observableArray([]);

    public errorMessage: KnockoutObservable<string> = ko.observable("");

    public variableGridHandler = delegate(this, this._variableChangeHandler);

    public Tasks_MetaTaskParamTooltip = TaskResources.Tasks_MetaTaskParamTooltip;

    public Tasks_MetaTaskValueTooltip= TaskResources.Tasks_MetaTaskValueTooltip;

    public Tasks_MetaTaskDescTooltip = TaskResources.Tasks_MetaTaskDescTooltip;

    public ExternalLinkTooltipText = TaskResources.ExternalLinkTooltipText;

    public MoreInformationTooltipText = TaskResources.MoreInformationTooltipText;

    public CreateMetaTaskDescriptionWatermarkText: string = TaskResources.CreateMetaTaskDescriptionWatermarkText;

    constructor(
        taskGroupName: string,
        taskGroupDescription: string,
        selectedCategory: string,
        metaTaskInputDefinitions: DistributedTaskContracts.TaskInputDefinition[],
        tasks: DistributedTaskContracts.TaskGroupStep[],
        dataSourceBindings: ServiceEndpointContracts.DataSourceBinding[],
        groups: DistributedTaskContracts.TaskGroupDefinition[],
        runsOn: string[]) {

        this._tasks = tasks;
        this._runsOn = runsOn;
        this.dataSourceBindings(dataSourceBindings);
        this.groups(groups.filter((taskGroup: DistributedTaskContracts.TaskGroupDefinition) => {
            var searchTask = Utils_Array.first(metaTaskInputDefinitions, (inputDefinition: DistributedTaskContracts.TaskInputDefinition) => {
                return inputDefinition.groupName === taskGroup.name;
            });
            return !!searchTask;
        }));

        this.metaTaskInput(this._createTaskInputDefinitions(metaTaskInputDefinitions));

        this._model = new MetaTaskPropertiesModel(taskGroupName, taskGroupDescription, selectedCategory, metaTaskInputDefinitions);

        this.dirty = ko.computed(() => {
            var taskGroupNameBool = this.taskGroupName() === this._model.taskGroupName;
            var taskGroupDescriptionBool = this.taskGroupDescription() === this._model.taskGroupDescription;
            var selectedCategoryBool = this.selectedCategory() === this._model.selectedCategory;
            var systemVarDirty = this.areSystemVariablesDirty();

            if (systemVarDirty) {
                this.onlySafeFieldsDirty = false;
            }
            else if (!taskGroupNameBool || !taskGroupDescriptionBool || !selectedCategoryBool) {
                this.onlySafeFieldsDirty = true;
            }
            else {
                this.onlySafeFieldsDirty = false;
            }

            return !((taskGroupNameBool) && (taskGroupDescriptionBool) && (selectedCategoryBool) && !systemVarDirty);
        });

        this.invalid = ko.computed(() => {
            return this.taskGroupName().trim().length <= 0;
        });

    }

    public getTaskCategoryDisplayName(type){
        return getTaskCategoryDisplayName(type);
    }

    public dispose() {
    }

    public update(taskGroupName: string, taskGroupDescription: string, selectedCategory: string, metaTaskInputDefinitions: DistributedTaskContracts.TaskInputDefinition[], tasks: DistributedTaskContracts.TaskGroupStep[], runsOn: string[]): void {
        this.areSystemVariablesDirty(false);
        this._tasks = tasks;
        this._runsOn = runsOn;
        this.metaTaskInput(this._createTaskInputDefinitions(metaTaskInputDefinitions));
        this._model = new MetaTaskPropertiesModel(taskGroupName, taskGroupDescription, selectedCategory, metaTaskInputDefinitions);

        this.taskGroupName(taskGroupName);
        this.taskGroupDescription(taskGroupDescription);
        this.selectedCategory(selectedCategory);
    }

    private _createTaskInputDefinitions(inputDefinitions: DistributedTaskContracts.TaskInputDefinition[]): TaskInputDefinitionViewModel[] {
        if (!inputDefinitions || inputDefinitions.length == 0) {
            return [];
        }

        return $.map(inputDefinitions, (inputDefinition: DistributedTaskContracts.TaskInputDefinition) => {
            return new TaskInputDefinitionViewModel(inputDefinition);
        });
    }

    private _variableChangeHandler(data: any, event: any): void {
        var currentVariables = this.metaTaskInput.peek();

        if (currentVariables.length !== this._model.metaTaskInput.length) {
            this.areSystemVariablesDirty(true);
            return;
        }

        var isDirty: boolean = false;

        $.each(currentVariables, (index: number, variable: TaskInputDefinitionViewModel) => {
            var originalVariable = this._model.metaTaskInput[index];

            if (!!originalVariable && ((originalVariable.name !== variable.name())
                || (originalVariable.defaultValue !== variable.defaultValue())
                || (originalVariable.helpMarkDown !== variable.helpMarkDown()))) {
                isDirty = true;
                return false;
            }
        });

        this.areSystemVariablesDirty(isDirty);
    }

    public setModel(taskGroupName: string, taskGroupDescription: string, selectedCategory: string, nonSystemTaskVariables: DistributedTaskContracts.TaskInputDefinition[]) {
        this._model.update(taskGroupName, taskGroupDescription, selectedCategory, nonSystemTaskVariables);
    }

    public _updateData(): void {
        this._model.update(
            this.taskGroupName(),
            this.taskGroupDescription(),
            this.selectedCategory(),
            this.metaTaskInput().map(vm => vm.getTaskInputDefinition()));
    }

    public getOriginalMetaTaskinputs(): DistributedTaskContracts.TaskInputDefinition[] {
        return this._model && this._model.metaTaskInput;
    }

    public _resetData(): void {
        this.taskGroupName(this._model.taskGroupName);
        this.taskGroupDescription(this._model.taskGroupDescription);
        this.selectedCategory(this._model.selectedCategory);
        this.metaTaskInput(this._createTaskInputDefinitions(this._model.metaTaskInput));
    }

    public _generateMetaTaskDefinition(groupName: string, description: string, category: string, tasks: DistributedTaskContracts.TaskGroupStep[], inputs: DistributedTaskContracts.TaskInputDefinition[], runsOn: string[]): DistributedTaskContracts.TaskGroup {

        groupName = groupName.trim();

        var taskGroupDefinition: DistributedTaskContracts.TaskGroup = {
            tasks: tasks,
            owner: Context.getDefaultWebContext().user.id,
            category: category,
            description: description,
            agentExecution: null,
            author: Context.getDefaultWebContext().user.name,
            contentsUploaded: true,
            contributionIdentifier: null,
            contributionVersion: null,
            dataSourceBindings: this.dataSourceBindings.peek(),
            satisfies: [],
            demands: [],
            disabled: false,
            deleted: false,
            preview: false,
            deprecated: false,
            friendlyName: groupName,
            groups: this.groups.peek(),
            helpMarkDown: "",
            hostType: null,
            iconUrl: Context.getPageContext().webAccessConfiguration.paths.resourcesPath + "icon-meta-task.png",
            id: "",
            inputs: inputs,
            instanceNameFormat: TaskUtils.getTaskGroupInstanceNameFormat(groupName, inputs),
            minimumAgentVersion: "*",
            name: groupName,
            packageLocation: "",
            packageType: "",
            releaseNotes: null,
            serverOwned: false,
            showEnvironmentVariables: false,
            sourceDefinitions: [],
            sourceLocation: "",
            version: { isTest: false, major: 1, minor: 0, patch: 0 },
            parentDefinitionId: null,
            visibility: ["Build", "Release"],
            runsOn: runsOn,
            definitionType: "metaTask",
            preJobExecution: { key: "", value: "" },
            execution: { key: "", value: "" },
            postJobExecution: { key: "", value: "" },
            revision: null,
            createdBy: null,
            createdOn: null,
            modifiedBy: null,
            modifiedOn: null,
            comment: null,
            outputVariables: null
        };

        return taskGroupDefinition;
    }

    protected _tasks: DistributedTaskContracts.TaskGroupStep[] = [];
    protected _runsOn: string[];
    private _model: MetaTaskPropertiesModel;
}

export class CreateMetaTaskDialogViewModel extends MetaTaskPropertiesBaseViewModel {
    constructor(nonSystemTaskVariables: DistributedTaskContracts.TaskInputDefinition[], onOkCallBack: (taskSetDefinition: DistributedTaskContracts.TaskGroup) => IPromise<DistributedTaskContracts.TaskGroup>,
        tasks: DistributedTaskContracts.TaskGroupStep[],
        dataSourceBindings: ServiceEndpointContracts.DataSourceBinding[],
        groups: DistributedTaskContracts.TaskGroupDefinition[],
        runsOn: string[]) {

        super("", "", "", nonSystemTaskVariables, tasks, dataSourceBindings, groups, runsOn);
        this._onOkCallBack = onOkCallBack;
    }

    public onOkClick(): IPromise<DistributedTaskContracts.TaskGroup> {
        var taskInputDefinitions: DistributedTaskContracts.TaskInputDefinition[] = this.metaTaskInput().map(vm => vm.getTaskInputDefinition());
        var taskSetDefinition: DistributedTaskContracts.TaskGroup = this._generateMetaTaskDefinition(this.taskGroupName(), this.taskGroupDescription(), this.selectedCategory(), this._tasks, taskInputDefinitions, this._runsOn);
        this._updateData();

        return this._onOkCallBack(taskSetDefinition);
    }

    public onCancelClick(): void {
        this._resetData();
    }

    private _onOkCallBack: (taskSetDefinition: DistributedTaskContracts.TaskGroup) => IPromise<DistributedTaskContracts.TaskGroup>;
}

export class CreateMetaTaskDialog extends Dialogs.ModalDialog {
    constructor(viewModel: CreateMetaTaskDialogViewModel) {
        super(viewModel);

        this._viewModel = viewModel;
    }

    public initialize() {
        super.initialize();
        this._renderUI();
        this._invalidSubscription = this._viewModel.invalid.subscribe((invalid: boolean) => {
            this.onButtonStatusChange(undefined, { button: "ok", enabled: !invalid });
        });
    }

    public dispose(): void {
        super.dispose();
        this._invalidSubscription.dispose();
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            resizable: false,
            draggable: true,
            height: 450,
            width: 740,
            useBowtieStyle: true,
            buttons: {
                "ok": {
                    id: "ok",
                    text: TaskResources.Tasks_MetaTaskDialogCreate,
                    disabled: "disabled",
                    click: delegate(this, this.onOkClick)
                },
                "cancel": {
                    id: "cancel",
                    text: VSS_Resources_Platform.ModalDialogCancelButton,
                    click: delegate(this, this.onCancelClick)
                }
            },
            contentMargin: false
        }, options));
    }

    public onOkClick(e?: JQueryEventObject): any {
        this._$errorMessage.hide();
        this._viewModel.errorMessage(Utils_String.empty);

        this._viewModel.onOkClick().then(() => {
            this.close();
        }, (error: any) => {
            if (error.message) {
                error = error.message;
            }

            this._$errorMessage.text(error);
            this._$errorMessage.toggle(!!error);
            this._viewModel.errorMessage(error.toString());
        });
    }

    public onCancelClick(e?: JQueryEventObject): any {
        this._viewModel.onCancelClick();
        super.onCancelClick();
    }

    public getTitle(): string {
        return TaskResources.Task_CreateMetaTaskDialogTitle;
    }

    private _renderUI(): void {
        // Append error message tip
        this._$errorMessage = $("<div class='input-error-tip meta-task-cre-error'>")
            .hide()
            .text("")
            .appendTo(this._element);
        Controls.Control.create<MetaTaskDialogControl, IMetaTaskOptions>(MetaTaskDialogControl, this._element, { viewModel: this._viewModel });
    }

    private _$errorMessage: JQuery;
    private _metaTaskPropertiesTemplateId = 'metatask-properties';
    private _metaTaskPropertiesTemplateHTML = `<div/>`;
    private _viewModel: CreateMetaTaskDialogViewModel;
    private _invalidSubscription: KnockoutSubscription<boolean>;
}

export interface IMetaTaskOptions {
    viewModel: CreateMetaTaskDialogViewModel;
}

export class MetaTaskDialogControl extends Controls.Control<IMetaTaskOptions> {
    public initializeOptions(options: IMetaTaskOptions) {
        super.initializeOptions(options);
        this._metaTaskDialogViewModel = options.viewModel;
    }

    public initialize() {
        super.initialize();
        this._renderUI();
    }

    private _renderUI(): void {
        TaskUtils.HtmlHelper.renderTemplateIfNeeded(this._templateName, this._templateHTML);

        this._$template = TaskUtils.loadHtmlTemplate(this._templateName);
        this._element.append(this._$template);

        ko.applyBindings(this._metaTaskDialogViewModel, this._$template[0]);
    }

    private _templateHTML = `
    <div class='meta-task-dialog' data-bind=\"css: { 'adjust-margin': !!errorMessage() }\">
        <div class='meta-task-properties'>
            <table>
                <tr>
                    <td class='property-name meta-task-name' for='taskGroupNameId' data-bind=\"css: { 'bold-text': invalid() }\">${TaskResources.Task_NameLabel}</td>
                    <td class='property-value meta-task-name-value'><input  id='taskGroupNameId' class='meta-task-name-textbox' data-bind='value: taskGroupName, valueUpdate: \"afterkeydown\", css: { "invalid": invalid() }'/></td>
                </tr>
                <tr>
                    <td class='property-name meta-task-description'>${TaskResources.Tasks_MetaTaskDialogDescriptionHeader}</td>
                    <td class='property-value meta-task-description-value'>
                        <textarea rows='2' data-bind='attr: {placeholder: CreateMetaTaskDescriptionWatermarkText}, value: taskGroupDescription, valueUpdate: \"afterkeydown\"' class='meta-task-description-textarea'>
                        </textarea>
                    </td>
                </tr>
                <tr>
                    <td class='property-name meta-task-category'>${TaskResources.CategoryText}</td>
                    <td class='property-value meta-task-category-value'>
                        <select class='meta-task-category-options' data-bind='options: category,
                                                                              optionsText: getTaskCategoryDisplayName ,
                                                                              value: selectedCategory'>
                        </select>
                    </td>
                    <td class='tooltip' data-bind = \"showTooltip: { text: helpMarkDown, pivotSiblingCssClass: 'meta-task-category-value' }\"></td>
                </tr>
            </table>
        </div>
        <div class='task-variables' data-bind='visible: metaTaskInput().length > 0'>
            <div class='param-heading'>${TaskResources.Task_MetaTaskDialogParentParameterHeading}</div>
            <div class='horizontal-line splitter horizontal meta-task-dialog-splitter'></div>
            <div class='message'>${TaskResources.Tasks_MetaTaskVariablesMessage}</div>
            <table class='non-sys-var'>
                <tr>
                    <th class='param-header' data-bind='attr: { "title": Tasks_MetaTaskParamTooltip }'>${TaskResources.Tasks_MetaTaskDialogParameterHeader}</th>
                    <th class='value-header' data-bind='attr: { "title": Tasks_MetaTaskValueTooltip }'>${TaskResources.Tasks_MetaTaskDialogValuesHeader}</th>
                    <th class='desc-header' data-bind='attr: { "title": Tasks_MetaTaskDescTooltip }'>${TaskResources.Tasks_MetaTaskDialogDescriptionHeader}</th>
                </tr>
                <tbody data-bind='foreach: metaTaskInput'>
                    <tr>
                        <td class='param-name' data-bind='text:name'></td>
                        <td class='param-value'><input class='val' type='text' data-bind='value: defaultValue, event: { change: $parent.variableGridHandler }'/></td>
                        <td class='param-description'><input class='desc' type='text' data-bind='value: helpMarkDown, event: { change: $parent.variableGridHandler }'/></td>
                    </tr>
                </tbody>
        </div>
    </div>`;

    private _templateName = 'meta_task_create_dialog_template';
    private _metaTaskDialogViewModel: CreateMetaTaskDialogViewModel;
    private _$template: JQuery;
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Tasks.Common.Dialogs", exports);

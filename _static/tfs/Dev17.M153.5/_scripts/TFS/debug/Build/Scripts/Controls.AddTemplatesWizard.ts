/// <reference types="jquery" />

import ko = require("knockout");
import Q = require("q");

import Build_Actions = require("Build/Scripts/Actions/Actions");
import BuildDefinitionViewModel = require("Build/Scripts/BuildDefinitionViewModel");
import Build_FolderManageDialog_Component_NO_REQUIRE = require("Build/Scripts/Components/FolderManageDialog");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import BuildUtils = require("Build/Scripts/Utilities/Utils");
import Context = require("Build/Scripts/Context");
import DefinitionManager = require("Build/Scripts/DefinitionManager");
import KnockoutExtensions = require("Build/Scripts/KnockoutExtensions");
import RepositoryFactory = require("Build/Scripts/RepositoryFactory");
import SourceProviderManager = require("Build/Scripts/SourceProviderManager");
import TemplateDefinitionViewModel = require("Build/Scripts/Models.TemplateDefinitionViewModel");

import BuildClient = require("Build.Common/Scripts/Api2.2/ClientServices");
import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import KnockoutPivot = require("DistributedTasksCommon/TFS.Knockout.HubPageExplorerPivot");
import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
import TasksCommonDialogs = require("DistributedTasksCommon/TFS.Tasks.Common.Dialogs");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Mru = require("Build/Scripts/Mru");

import BuildContracts = require("TFS/Build/Contracts");
import DistributedTaskContracts = require("TFS/DistributedTask/Contracts");
import VCContracts = require("TFS/VersionControl/Contracts");

import ComboControls_NO_REQUIRE = require("VSS/Controls/Combos");

import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";

import Diag = require("VSS/Diag");
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

var delegate = Utils_Core.delegate;
var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

KnockoutExtensions.KnockoutCustomHandlers.initializeKnockoutHandlers();

// to honor the order
export var categoryTabs = ["build", "deployment", "custom"];

export interface ITemplateWizardCompleteResult {
    templateId: string;
    repoId?: string;
    repoType?: string;
    branchName?: string;
    enableCI?: number;
    fromVC?: number;
    queue?: {
        id?: number;
        name?: string;
    };
    folderPath?: string;
}

export class TemplatesWizardDialogModel extends TasksCommonDialogs.WizardDialogModel {
    private _requiredPromises: Q.Promise<any[]>;
    private _viewContext: Context.ViewContext;
    private _folderPath: string = "\\";
    public element: JQuery = null;

    private _hideRepoPicker: boolean = false;
    private _hideFolderPicker: boolean = false;

    public rootViewModel: KnockoutObservable<SelectTemplatePageViewModel> = ko.observable(null);

    public repositoryContext: RepositoryContext = null;
    public branchName: string = null;

    public successCallback: (data: ITemplateWizardCompleteResult) => any;
    public cancelCallback: (data: ITemplateWizardCompleteResult) => any;

    constructor(wizardOptions: ITemplatesWizardOptions, viewContext?: Context.ViewContext) {
        super("template-wizard");
        this.repositoryContext = wizardOptions.repositoryContext;

        this.lastPageNextIcon(""); // we don't need any icon for create button
        this.lastPageNextText(BuildResources.CreateText);

        if (wizardOptions.branchName) {
            this.branchName = wizardOptions.branchName;
        }

        if (wizardOptions.folderPath) {
            this._folderPath = wizardOptions.folderPath;
        }

        if (wizardOptions.successCallback) {
            this.successCallback = wizardOptions.successCallback;
        }

        if (wizardOptions.cancelCallback) {
            this.cancelCallback = wizardOptions.cancelCallback;
        }

        if (wizardOptions.repositoryContext) {
            this._hideRepoPicker = true;
        }

        if (wizardOptions.hideFolderPicker) {
            this._hideFolderPicker = true;
        }

        this._viewContext = viewContext;

        if (Context.viewContext && !this._viewContext) {
            this._viewContext = Context.viewContext;
        }

        // viewContext is when build view is enhanced, if the caller is not from build, this won't be initialized
        if (!this._viewContext) {
            var tfsConnection = new Service.VssConnection(tfsContext.contextData);
            var buildClient = tfsConnection.getService<BuildClient.BuildClientService>(BuildClient.BuildClientService);

            var sourceProviderManager = new SourceProviderManager.SourceProviderManager({});
            var buildDefinitionManager = new DefinitionManager.BuildDefinitionManager(sourceProviderManager, {});

            // initialize context
            this._viewContext = new Context.ViewContext(tfsContext, sourceProviderManager, buildDefinitionManager, buildClient, null);
            Context.viewContext = this._viewContext; // to let other scripts access right context
        }
        this._requiredPromises = this._viewContext.setUpBuildDefinitionPromises(true);

        this._viewContext.buildDefinitionManager.getDefinitionTemplates(wizardOptions.refreshTemplatesOnLoad).then((templates: BuildContracts.BuildDefinitionTemplate[]) => {
            var taskIdsToIconUrls: IDictionaryStringTo<string> = {};
            var requestedTaskIds: IDictionaryStringTo<boolean> = {};

            var iconPromises: IPromise<any>[] = [];
            $.each(templates, (index: number, template: BuildContracts.BuildDefinitionTemplate) => {
                if (template.iconTaskId && !requestedTaskIds[template.iconTaskId]) {
                    requestedTaskIds[template.iconTaskId] = true;
                    var iconPromise: IPromise<any> = this._viewContext.buildDefinitionManager.getTaskDefinition(template.iconTaskId, "*").then((taskDefinition: DistributedTaskContracts.TaskDefinition) => {
                        if (taskDefinition) {
                            taskIdsToIconUrls[template.iconTaskId] = taskDefinition.iconUrl;
                        }
                    });

                    iconPromises.push(iconPromise);
                }
            });

            // when all the promises are complete, we have all of the icon urls
            Q.all(iconPromises).then(() => {
                let selectTemplatePageOptions: ISelectTemplatePageOptions = {
                    deleteCallback: wizardOptions.deleteCallback,
                    selectedTemplateId: wizardOptions.selectedTemplateId,
                    templates: templates,
                    taskIdsToIconUrls: taskIdsToIconUrls,
                    openCreatedDefinitionInNewTab: wizardOptions.openCreatedDefinitionInNewTab
                };

                let wizardSettingsPageOptions: IWizardSettingsPageOptions = {
                    folderPath: this._folderPath,
                    hideRepoPicker: this._hideRepoPicker,
                    hideFolderPicker: this._hideFolderPicker
                };
                this._createPages(selectTemplatePageOptions, wizardSettingsPageOptions);
            });
        });

    }

    private _createPages(selectTemplatePageOptions: ISelectTemplatePageOptions, wizardSettingsPageOptions: IWizardSettingsPageOptions) {
        // Construct wizard pages
        var pages: TaskModels.WizardPage[] = [];

        // Page 0: selecting definition template
        var vm: any = new SelectTemplatePageViewModel(selectTemplatePageOptions);
        var page = new TaskModels.WizardPage("select_template_page", BuildResources.TemplateWizardDialogPage0Title, 0, "select-template-page", "select_template_page", vm);
        pages.push(page);

        this.rootViewModel(vm);

        // Page 1: CI and repo source
        vm = new WizardSettingsPageViewModel(this._viewContext, wizardSettingsPageOptions);
        page = new TaskModels.WizardPage("selected_definition_build_repo_source_page", BuildResources.TemplateWizardDialogPage1Title, 1, "selected-definition-build-repo-source", "selected_definition_build_repo_source", vm);
        pages.push(page);

        this.wizardPages(pages);
        this.loaded(true); // ready to render pages
    }

    public getRequiredPromises() {
        return this._requiredPromises;
    }

    public getContext() {
        return this._viewContext;
    }
}

export class TemplatesWizardDialog extends TasksCommonDialogs.WizardDialog<TemplatesWizardDialogModel> {
    private _defaultRepositoryPromise: IPromise<BuildContracts.BuildRepository>;

    private _buildDefinitionViewModel: BuildDefinitionViewModel.BuildDefinitionViewModel = null;

    constructor(model: TemplatesWizardDialogModel) {
        super(model);

        this.addDisposable(model.loaded.subscribe((loaded) => {
            if (!loaded) {
                return;
            }
            var currentPage = model.currentWizardPage();
            if (currentPage) {
                if (currentPage.order === 0) {
                    // template selection page
                    var pageVM = <SelectTemplatePageViewModel>currentPage.viewModel.peek();
                    let element = this.getElement();
                    // there is not a great way to handle double-click from knockout
                    let li = element.find("ul.templates-list li");
                    if (li.length === 0) {
                        return;
                    }

                    li.dblclick((event: JQueryEventObject) => {
                        let element = $(event.target);
                        let template: TemplateDefinitionViewModel.TemplateDefinitionViewModel = ko.dataFor(element[0]);
                        if (template) {
                            pageVM.selectedTemplateId(template.id);
                            this.onNextClick(); // simulate next click
                        }
                    });

                    // scroll a little so that default template shows ups
                    let templateDiv = element.find(".add-task-templates-dialog");
                    if (element && element[0]) {
                        // at this point, to get offset we need to ensure that element is visible
                        element.find(".status-indicator").hide();
                        element.find(".template-wizard").show();

                        let defaultTemplate = element.find("#" + pageVM.selectedTemplateId.peek());
                        if (defaultTemplate.length > 0) {
                            templateDiv.animate({ scrollTop: defaultTemplate.offset().top }, 100);
                        }
                    }
                    else {
                        Diag.logError("template dialog element not found");
                    }
                }

            }
        }));
    }

    public initializeOptions(options?: TemplatesWizardDialogModel) {
        super.initializeOptions($.extend({
            width: 600,
            height: 600
        }, options));
    }

    public initialize() {
        super.initialize();
        this.getViewModel().element = this.getElement();
    }

    public getTitle(): string {
        return BuildResources.AddTemplatesDialogTitle;
    }

    private _updateViewModels(page: TaskModels.WizardPage) {
        var order = page.order;
        var vm = <TemplatesWizardDialogModel>this.getViewModel();
        var rootVM = vm.rootViewModel.peek();
        var pageViewModel = page.viewModel.peek();
        if (!rootVM) {
            Diag.logError("Root viewModel should be non-null in Templates Wizard");
            return;
        }

        // some templates might specify to enable CI, honor that
        if (order == 1) {
            var templateId = rootVM.selectedTemplateId.peek();
            var selectedTemplate = rootVM.templates.filter((template) => {
                return template.id === templateId;
            });
            if (selectedTemplate && selectedTemplate[0]) {
                let template = selectedTemplate[0].template;
                if (template && template.triggers) {
                    let pageVM = <WizardSettingsPageViewModel>pageViewModel;
                    // try to find CI trigger
                    let continuousIntegrationTrigger = template.triggers.filter((trigger) => {
                        return trigger.triggerType === BuildContracts.DefinitionTriggerType.ContinuousIntegration;
                    });
                    let enableCI = !!(continuousIntegrationTrigger && continuousIntegrationTrigger[0]);
                    pageVM.enableCI(enableCI);
                    pageVM.templateHasCITrigger(enableCI);
                }
            }
        }

        if (pageViewModel && pageViewModel.isInitialized.peek()) {
            // we don't have any dependent pages, so if the viewmodel is already initialized, then just skip
            return;
        }
        vm.getRequiredPromises().spread((
            repositoryFactories: RepositoryFactory.RepositoryFactory[],
            queues: DistributedTaskContracts.TaskAgentQueue[],
            pools: DistributedTaskContracts.TaskAgentPool[],
            projectInfo: VCContracts.VersionControlProjectInfo) => {
            let vm = <TemplatesWizardDialogModel>this.getViewModel();
            vm.loaded(false);
            if (!this._defaultRepositoryPromise) {
                this._defaultRepositoryPromise = vm.repositoryContext ?
                    BuildUtils.createDefaultRepositoryPromise(projectInfo, repositoryFactories, vm.repositoryContext) : BuildUtils.createDefaultRepositoryPromise(projectInfo, repositoryFactories);
            }
            if (this._defaultRepositoryPromise) {
                this._defaultRepositoryPromise.then((defaultRepo) => {
                    if (!defaultRepo) {
                        Diag.logError("Default repository is not found");
                        return;
                    }
                    if (Utils_String.ignoreCaseComparer(defaultRepo.type, RepositoryTypes.TfsGit) != -1) {
                        if (vm.branchName) {
                            defaultRepo.defaultBranch = vm.branchName;
                        }
                    }
                    if (order === 1) {
                        let pageVM = <WizardSettingsPageViewModel>pageViewModel;
                        pageVM.initViewModel(queues, pools, repositoryFactories, defaultRepo);
                    }
                    vm.loaded(true);
                });
            }
        }, (error: TfsError) => {
            VSS.handleError(error);
            vm.loaded(true);
        });
    }

    public onCancelClick() {
        let vm = <TemplatesWizardDialogModel>this.getViewModel();
        if (vm.cancelCallback) {
            vm.cancelCallback(this._getDialogResult(vm));
        }

        super.onCancelClick();
    }

    public onNextClick() {
        super.onNextClick();

        let vm = <TemplatesWizardDialogModel>this.getViewModel();

        let currentPage = vm.currentWizardPage.peek();
        if (currentPage) {
            this._updateViewModels(currentPage);
        }
        else {
            // done
            if (vm.successCallback) {
                vm.successCallback(this._getDialogResult(vm));
            }
            this.close();
        }
    }

    private _getDialogResult(vm: TemplatesWizardDialogModel): ITemplateWizardCompleteResult {
        let pages = vm.wizardPages.peek();
        let page0VM = <SelectTemplatePageViewModel>pages[0].viewModel.peek();
        let page1VM = <WizardSettingsPageViewModel>pages[1].viewModel.peek();
        let buildRepo = page1VM.buildRepository();

        let repoId = null
        let repoType = null;
        let branchName = page1VM.selectedBranch();
        let queueId = page1VM.selectedQueueId();
        let queueName = page1VM.selectedQueueName();

        let selectedRepoSourceId = page1VM.selectedRepositorySourceId.peek();

        if (Utils_String.localeIgnoreCaseComparer(selectedRepoSourceId, page1VM.projectSourceId) !== 0) {
            // repo other than project repo is selected => other than tfvc,tfgit => external source, we don't know any info on repo yet
            repoType = selectedRepoSourceId;
            repoId = null;
            branchName = null;
        }
        else {
            // project's repo
            let repo = page1VM.repository.peek();
            let repoContext = page1VM.repositoryContext.peek();

            if (repoContext && repo) {
                if (repoContext.getRepositoryType() === RepositoryType.Tfvc) {
                    repoId = null;
                    repoType = RepositoryTypes.TfsVersionControl;
                    branchName = null;
                }
                else {
                    repoId = repo.id;
                    repoType = RepositoryTypes.TfsGit;
                }
            }
            else {
                //fallback to default repo that we obtained before
                let buildRepo = page1VM.buildRepository.peek();
                repoId = buildRepo.id;
                repoType = buildRepo.type;
            }
        }

        let enableCI = 0;
        if (page1VM.enableCI.peek()) {
            enableCI = 1;
        }

        return {
            branchName: branchName,
            enableCI: enableCI,
            repoId: repoId,
            repoType: repoType,
            queue: {
                id: queueId,
                name: queueName
            },
            templateId: page0VM.selectedTemplateId(),
            folderPath: page1VM.folderPath.peek()
        };
    }
}

// Page0 ViewModel
export class SelectTemplatePageViewModel extends KnockoutPivot.HubPageExplorerPivotBase implements TaskModels.IWizardPageViewModel {
    private _tabsTemplate = "add_templates_dialog_content";
    private _loadingTemplate = "loading_templates";
    private _disposableManager: Utils_Core.DisposalManager;
    public categoryTemplateMap: { [category: string]: BuildContracts.BuildDefinitionTemplate[] } = {};
    public templates: BuildContracts.BuildDefinitionTemplate[] = [];
    public deleteCallback: (template: BuildContracts.BuildDefinitionTemplate) => IPromise<any>;
    public emptyDefinitionTab: KnockoutObservable<TemplateDialogPivotTab> = ko.observable(null);
    public initialized: KnockoutObservable<boolean> = ko.observable(false);
    public selectedTemplateId: KnockoutObservable<string> = ko.observable("");

    private _taskIdsToIconUrls: IDictionaryStringTo<string> = {};
    private _customTab: TemplateDialogPivotTab = null;
    private _loading = BuildResources.TemplateCategoryLoading;

    public isInvalid: KnockoutObservable<boolean> = ko.observable(false);
    public isInitialized: KnockoutObservable<boolean> = ko.observable(false);

    constructor(options: ISelectTemplatePageOptions) {
        super(options);

        // initialize. this.selectedTemplateId is set in _initTabs
        this.templates = options.templates;
        this.deleteCallback = options.deleteCallback;
        this._taskIdsToIconUrls = options.taskIdsToIconUrls;
        this._disposableManager = new Utils_Core.DisposalManager();

        var tab = null;

        // select a tab via ko binding
        this._onTabClick = (tab: KnockoutPivot.PivotTab) => {
            var tabId: string = !!tab ? tab.id : "";
            this.selectedTab(tabId);
        };

        // Create map
        $.each(this.templates, (index: number, template: BuildContracts.BuildDefinitionTemplate) => {
            var categoryId: string = template.category.toLowerCase() || "";

            // special case for empty template
            if (this._isEmptyTemplate(template)) {
                var categoryText: string = this._getCategoryText(categoryId);
                tab = new TemplateDialogPivotTab(categoryId, categoryText, this._tabsTemplate, this.selectedTemplateId);
                var vm = new TemplateDefinitionViewModel.TemplateDefinitionViewModel(template, this.deleteCallback,
                    () => {
                        // don't delete empty template
                    });
                tab.templateVMs = ko.observableArray([vm]);
                this.emptyDefinitionTab(tab);
            }

            if (this.categoryTemplateMap[categoryId]) {
                this.categoryTemplateMap[categoryId].push(template);
            }
            else {
                this.categoryTemplateMap[categoryId] = [template];
            }
        });

        this._initTabs();

        // Initial tab
        if (this.tabs().length === 0) {
            tab = new TemplateDialogPivotTab(this._loading, this._loading, this._loadingTemplate, this.selectedTemplateId);
            this.tabs.push(tab);
        }

        this.isInitialized(true);

    }

    private _getCategoryText(category: string): string {
        switch (category.toLowerCase()) {
            case "build":
                return BuildResources.TemplateCategoryBuild;
            case "deployment":
                return BuildResources.TemplateCategoryDeployment;
            case "custom":
                return BuildResources.TemplateCategoryCustom;
            case "empty":
                return BuildResources.TemplateCategoryEmpty;
            default:
                return BuildResources.TemplateCategoryOther;
        }
    }

    private _initTabs() {
        // Clear out initial loading tab
        this.tabs([]);

        var selectedTabId: string = null;
        $.each(categoryTabs, (index, categoryId) => {
            var templates = this.categoryTemplateMap[categoryId];
            if (templates) {
                var categoryText: string = this._getCategoryText(categoryId); // If category doesn't exist or not of known type falls into "Other"

                var tab = new TemplateDialogPivotTab(categoryId, categoryText, this._tabsTemplate, this.selectedTemplateId);
                var templateVMs: TemplateDefinitionViewModel.TemplateDefinitionViewModel[] = [];
                var isCustom = false;
                var isEmpty = false;

                $.each(templates, (index: number, definitionTemplate: BuildContracts.BuildDefinitionTemplate) => {
                    var iconUrl = this._taskIdsToIconUrls[definitionTemplate.iconTaskId] || "";
                    templateVMs.push(new TemplateDefinitionViewModel.TemplateDefinitionViewModel(definitionTemplate, this.deleteCallback,
                        () => {
                            tab.removeTemplate(definitionTemplate);
                            // If a custom template is deleted, selection goes away, so none will be selected
                            this.selectedTemplateId(null);
                        }, iconUrl)
                    );

                    isCustom = definitionTemplate.canDelete; // Already mapped by category so doesn't matter if it gets replaced

                    isEmpty = this._isEmptyTemplate(definitionTemplate);

                    // only set the selected template id if the template actually exists
                    if (Utils_String.localeIgnoreCaseComparer(definitionTemplate.id, this._options.selectedTemplateId) === 0) {
                        this.selectedTemplateId(definitionTemplate.id);
                        selectedTabId = tab.id;
                    }
                });

                if (isCustom) {
                    // Save it to add later
                    this._customTab = tab;
                }

                // Sort them out
                templateVMs.sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.friendlyName, b.friendlyName));
                tab.templateVMs = ko.observableArray(templateVMs);

                if (!isEmpty && !isCustom) {
                    this.tabs.push(tab);
                }
            }
        });

        // Now add custom tab
        if (this._customTab) {
            this.tabs.push(this._customTab);
        }

        // select tab
        if (selectedTabId) {
            this.selectedTab(selectedTabId);
        }
        this.initialized(true);

        // subscribe to current Id, to make the page valid/invalid
        this._disposableManager.addDisposable(this.selectedTemplateId.subscribe((id) => {
            if (!id) {
                this.isInvalid(true);
            }
            else {
                this.isInvalid(false);
            }
        }));
    }

    private _isEmptyTemplate(template: BuildContracts.BuildDefinitionTemplate): boolean {
        // use well-known id to find "empty" template
        return template.id === "blank";
    }
}

// Page1 ViewModel
export class WizardSettingsPageViewModel implements TaskModels.IWizardPageViewModel {
    private _viewContext: Context.ViewContext;
    private _disposableManager: Utils_Core.DisposalManager;
    private _folderManageComponentInitialized = false;

    public projectSourceId = "project";

    public isInvalid: KnockoutObservable<boolean> = ko.observable(false);
    public isInitialized: KnockoutObservable<boolean> = ko.observable(false);

    public enableCI: KnockoutObservable<boolean> = ko.observable(false);

    // This would disable CI trigger input, if the template has CI trigger as part of it's definition
    public templateHasCITrigger: KnockoutObservable<boolean> = ko.observable(false);

    public selectedRepositorySourceId: KnockoutObservable<string> = ko.observable(null);

    public repositorySourceBlocks: KnockoutObservableArray<IRepositorySourceBlock> = ko.observableArray([]);

    public repository: KnockoutObservable<VCContracts.GitRepository> = ko.observable(null);
    public repositoryContext: KnockoutObservable<RepositoryContext> = ko.observable(null);
    public selectedBranch: KnockoutObservable<string> = ko.observable("");
    public queues: KnockoutObservableArray<DistributedTaskContracts.TaskAgentQueue> = ko.observableArray([]);
    public queueManageLink: string;

    public buildRepository: KnockoutObservable<BuildContracts.BuildRepository> = ko.observable(null);
    public selectedQueueId: KnockoutObservable<number> = ko.observable(0);
    public selectedQueueName: KnockoutComputed<string>;
    public showBranchPicker: KnockoutComputed<boolean>;

    public hideRepoPicker: KnockoutObservable<boolean> = ko.observable(false);
    public hideFolderPicker: KnockoutObservable<boolean> = ko.observable(false);

    public labelForCI: KnockoutObservable<string> = ko.observable("");

    public folderPathDialogTitle = BuildResources.SelectFolderPathDialogTitle;
    public folderPath: KnockoutObservable<string> = ko.observable("");
    public folderPathsSource: KnockoutObservableArray<string> = ko.observableArray([]);

    public showFolderDialog: KnockoutObservable<boolean> = ko.observable(false);

    constructor(viewContext: Context.ViewContext, options: IWizardSettingsPageOptions) {
        this._viewContext = viewContext;
        this._disposableManager = new Utils_Core.DisposalManager();

        this.hideRepoPicker(options.hideRepoPicker);
        this.hideFolderPicker(options.hideFolderPicker);

        this.folderPath(options.folderPath);

        this.folderPathsSource(Mru.RecentlyUsedFolderPaths.getMRUValue());

        var projectName = tfsContext.contextData.project.name;
        this.queueManageLink = tfsContext.getActionUrl(null, "AgentQueue", { project: projectName, area: "admin" });

        this.showBranchPicker = this._disposableManager.addDisposable(ko.computed({
            read: () => {
                let repositoryContext = this.repositoryContext();
                if (repositoryContext && repositoryContext.getRepositoryType() === RepositoryType.Git) {
                    return true;
                }

                return false;
            }
        }));
    }

    private _updateCIOption(type: string) {
        let sourceProvider = this._viewContext.sourceProviderManager.getSourceProvider(type);
        if (sourceProvider && sourceProvider.supportsTrigger(BuildContracts.DefinitionTriggerType.ContinuousIntegration)) {
            this.labelForCI(sourceProvider.getTriggerLabel(BuildContracts.DefinitionTriggerType.ContinuousIntegration) || BuildResources.CITriggerLabel);
        }
        else {
            this.labelForCI("");
        }
    }

    private _getAndSetRepoContext(repoId: string, repoName: string, repoType: string): RepositoryContext {
        let repoContext = null;
        let sourceProvider = this._viewContext.sourceProviderManager.getSourceProvider(repoType);
        if (sourceProvider) {
            repoContext = sourceProvider.getRepositoryContext(tfsContext, repoId, repoName);
            this.repositoryContext(repoContext);
        }
        return repoContext;
    }

    public isTfvc(repo: VCContracts.GitRepository) {
        // we added tfvc dummy repo, so we can check just for id to determine that this is tfvc
        return repo && !repo.id;
    }

    public initViewModel(queues: DistributedTaskContracts.TaskAgentQueue[], pools: DistributedTaskContracts.TaskAgentPool[], repositoryFactories: RepositoryFactory.RepositoryFactory[], repo: BuildContracts.BuildRepository) {
        if (!repo) {
            Diag.logError("Build repo cannot be null");
        }

        let repoContext = this._getAndSetRepoContext(repo.id, repo.name, repo.type);
        if (repoContext) {
            this.repository(repoContext.getRepository());
        }
        else {
            // tfvc, we added dummy repo with out any Id
            this.repository(<VCContracts.GitRepository>{
                name: repo.name,
                defaultBranch: repo.defaultBranch,
                url: repo.url
            });
            Diag.logInfo("This is tfvc project");
        }

        this.queues(queues);

        let defaultQueue = BuildUtils.getDefaultQueue(queues, pools);
        if (defaultQueue) {
            this.selectedQueueId(defaultQueue.id);
        }

        this.buildRepository(repo);

        this._updateCIOption(repo.type);

        this.selectedBranch(repo.defaultBranch);
        this.selectedRepositorySourceId(this.projectSourceId);

        // add project block to begin with
        let blocks: IRepositorySourceBlock[] = [
            {
                id: this.projectSourceId,
                text: Utils_String.format(BuildResources.RepositorySourceBlockProject, tfsContext.navigation.project)
            }
        ];

        $.each(repositoryFactories, (index, factory) => {
            var block = factory.repositoryBlock;
            if (block) {
                blocks.push(block);
            }
        });

        this.repositorySourceBlocks(blocks);

        this.selectedQueueName = ko.computed(() => {
            let selectedQueueId = this.selectedQueueId();
            let queue = Utils_Array.first(this.queues(), (queue: DistributedTaskContracts.TaskAgentQueue) => {
                return queue.id === selectedQueueId;
            });

            if (queue) {
                return queue.name;
            }
            else {
                return "";
            }
        });

        this.isInitialized(true);
    }

    public repositorySourceClicked(viewModel: WizardSettingsPageViewModel, selectedBlock: IRepositorySourceBlock, event: JQueryEventObject) {
        if (selectedBlock) {
            var id = selectedBlock.id;
            viewModel.selectedRepositorySourceId(id);

            if (Utils_String.localeIgnoreCaseComparer(id, viewModel.projectSourceId) === 0) {
                let repoContext = viewModel.repositoryContext.peek();
                if (repoContext && repoContext.getRepositoryType() === RepositoryType.Tfvc) {
                    id = RepositoryTypes.TfsVersionControl;
                }
                else {
                    id = RepositoryTypes.TfsGit;
                }
            }

            viewModel._updateCIOption(id);
        }
        else {
            Diag.logError("Selected Repository source is null");
        }
    }

    public onFolderPickerClick(evt: JQueryEventObject) {
        this.showFolderDialog(true);
    }

    public onFolderManageDialogDismiss() {
        this.showFolderDialog(false);
    }

    public onItemChanged(repository: VCContracts.GitRepository) {
        var repoType = RepositoryTypes.TfsGit.toLowerCase();
        if (this.isTfvc(repository)) {
            repoType = RepositoryTypes.TfsVersionControl.toLowerCase();
        }
        this._getAndSetRepoContext(repository.id, repository.name, repoType);
        this.repository(repository);
        this._updateCIOption(repoType);
    }

    public showRepoSelector(): boolean {
        return this.selectedRepositorySourceId() === this.projectSourceId;
    }

    public refreshQueues() {
        this._viewContext.getQueues(true).then((queues) => {
            this.queues(queues);
            if (queues && queues.length > 0) {
                this.selectedQueueId(queues[0].id);
            }
        });
    }

    public onFolderManageDialogOkClick(result: Build_FolderManageDialog_Component_NO_REQUIRE.IFolderManageDialogResult) {
        let path = result.path;
        this.folderPath(path);

        // add to MRU list
        Mru.RecentlyUsedFolderPaths.appendMRUValue(path);
        let source = this.folderPathsSource.peek();
        source.unshift(path);
        source = Utils_Array.unique(source);
        this.folderPathsSource(source);
        this.showFolderDialog(false);
    }

    public onFolderComboInputChange(combo: ComboControls_NO_REQUIRE.Combo) {
        this.folderPath(combo.getValue<string>());
    }
}

export class TemplateDialogPivotTab extends KnockoutPivot.BasicPivotTab {
    public templateVMs: KnockoutObservableArray<TemplateDefinitionViewModel.TemplateDefinitionViewModel> = ko.observableArray([]);
    public selectedTemplateId: KnockoutObservable<string>;
    public onTemplateClick: (template: TemplateDefinitionViewModel.TemplateDefinitionViewModel) => void;

    constructor(id: string, text: string, templateName: string, selectedTemplateId: KnockoutObservable<string>) {
        super(id, text, templateName);

        this.onTemplateClick = (template: TemplateDefinitionViewModel.TemplateDefinitionViewModel) => {
            if (template) {
                this.selectedTemplateId(template.id);
            }
        }

        this.selectedTemplateId = selectedTemplateId;
    }

    public removeTemplate(template: BuildContracts.BuildDefinitionTemplate) {
        var index = Utils_Array.findIndex(this.templateVMs(), vm => (Utils_String.localeIgnoreCaseComparer(vm.id, template.id) === 0));
        var vm = this.templateVMs()[index];
        this.templateVMs.remove(vm);
        this.templateVMs.sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.friendlyName, b.friendlyName));
    }
}

export interface ITemplatesWizardOptions {
    deleteCallback: (template: BuildContracts.BuildDefinitionTemplate) => IPromise<any>;
    selectedTemplateId: string;
    refreshTemplatesOnLoad: boolean;
    openCreatedDefinitionInNewTab: boolean;
    repositoryContext?: RepositoryContext;
    branchName?: string;
    successCallback?: (data: ITemplateWizardCompleteResult) => void;
    cancelCallback?: (data: ITemplateWizardCompleteResult) => void;
    folderPath?: string;
    hideFolderPicker?: boolean;
}

export interface ISelectTemplatePageOptions {
    deleteCallback: (template: BuildContracts.BuildDefinitionTemplate) => IPromise<any>;
    selectedTemplateId: string;
    templates: BuildContracts.BuildDefinitionTemplate[];
    taskIdsToIconUrls: IDictionaryStringTo<string>;
    openCreatedDefinitionInNewTab: boolean;
}

export interface IWizardSettingsPageOptions {
    folderPath?: string;
    hideRepoPicker?: boolean;
    hideFolderPicker?: boolean;
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Controls.AddTemplatesWizard", exports);

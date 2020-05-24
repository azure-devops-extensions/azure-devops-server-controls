import ko = require("knockout");

import BuildDefinitionModel = require("Build/Scripts/BuildDefinitionModel");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import BuildUtils = require("Build/Scripts/Utilities/Utils");
import GeneralViewModel = require("Build/Scripts/GeneralViewModel");
import HistoryViewModel = require("Build/Scripts/HistoryViewModel");
import OptionsListViewModel = require("Build/Scripts/OptionsListViewModel");
import RepositoryDesignerViewModel = require("Build/Scripts/RepositoryDesignerViewModel");
import RepositoryFactory = require("Build/Scripts/RepositoryFactory");
import ViewsCommon = require("Build/Scripts/Views.Common");
import MetaTaskVariableProvider = require("Build/Scripts/MetaTaskVariableProvider");

import { ExplorerActions } from "Build.Common/Scripts/Linking";

import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
import TasksEditor = require("DistributedTasksCommon/TFS.Tasks.TasksEditor");
import InternalTasksEditor = require("DistributedTasksCommon/TFS.Tasks.TasksEditor.Internal");
import TaskTypes = require("DistributedTasksCommon/TFS.Tasks.Types");
import InternalTaskTypes = require("DistributedTasksCommon/TFS.Tasks.Types.Internal");

import Framework = require("VSS/WebApi/Contracts");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

import BuildContracts = require("TFS/Build/Contracts");
import DistributedTask = require("TFS/DistributedTask/Contracts");
import MachineManagement = require("MachineManagement/Contracts")

import Navigation_Services = require("VSS/Navigation/Services");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Number = require("VSS/Utils/Number");
import FeatureAvailability = require("VSS/FeatureAvailability/Services");

var delegate: typeof Utils_Core.delegate = Utils_Core.delegate;

/**
 * View model for a build definition
 */
export class BuildDefinitionViewModel extends BuildDefinitionModel.BuildDefinitionModel implements TaskModels.IDirty, IBuildDefinitionViewModel, InternalTaskTypes.ITaskGroupListOwner {
    /**
     * Indicates whether the definition is a draft
     */
    public isDraft: KnockoutObservable<boolean>;

    /**
     * The author
     */
    public author: KnockoutObservable<string>;

    /**
     * The build options
     */
    public options: OptionsListViewModel.OptionsListViewModel;

    /**
     * The repository
     */
    public repositoryViewModel: RepositoryDesignerViewModel.RepositoryDesignerViewModel;

    /**
     * The build steps
     * see ITaskGroupListOwner
     */
    public taskGroupList: InternalTasksEditor.TaskGroupsViewModel;

    /**
     * General & demands
     */
    public general: GeneralViewModel.GeneralViewModel;

    /**
     * History
     */
    public history: HistoryViewModel.HistoryViewModel;

    /**
     * Indicates whether the model is dirty
     */
    public dirty: KnockoutComputed<boolean>;

    /**
     * Indicates whether the model is Invalid
     */
    public invalid: KnockoutComputed<boolean>;

    /**
     * Indicates whether builds can be queued against the definition
     */
    public canQueueBuild: KnockoutComputed<boolean>;

    /**
     * A list of validation issues that may prevent the definition from being saved
     */
    public validationIssues: KnockoutComputed<string[]>;

    /**
     * The latest version of each task definition
     */
    public latestVersionArray: KnockoutObservableArray<DistributedTask.TaskDefinition> = ko.observableArray(<DistributedTask.TaskDefinition[]>[]);

    /**
     * The definition from which this definition was cloned
     */
    public clonedFrom: BuildContracts.BuildDefinitionReference;

    public variableProvider: MetaTaskVariableProvider.MetaTaskVariableProvider;

    private _taskCollection: TaskModels.TaskDefinitionCollection;
    private _initialized: boolean = false;
    private _taskDelegates: KnockoutObservable<TaskTypes.ITaskDelegates>;
    public numTasksToUpdate: number = 0;

    /**
     * Create a view model from a data contract
     * @param definition The data contract
     * @param taskDefinitions The task definitions
     * @param optionDefinitions The build option definitions
     * @param repositoryFactories The repository factories
     * @param queues The build queues
     * @param isDirty Whether the model is initially dirty
     */
    constructor(definition: BuildContracts.BuildDefinition,
        taskDefinitions: DistributedTask.TaskDefinition[],
        optionDefinitions: BuildContracts.BuildOptionDefinition[],
        repositoryFactories: RepositoryFactory.RepositoryFactory[],
        queues: DistributedTask.TaskAgentQueue[],
        images: MachineManagement.FriendlyImageName[],
        isDirty: boolean = false) {
        super(definition);

        this.variableProvider = new MetaTaskVariableProvider.MetaTaskVariableProvider(this.variables);

        var extensionDelegates: KnockoutObservable<TaskTypes.ITaskEditorExtensionDelegates> = ko.observable({});
        this._taskDelegates = ko.observable({
            editorExtensionDelegates: extensionDelegates
        });

        // option definitions
        this.options = new OptionsListViewModel.OptionsListViewModel(optionDefinitions.sort((a, b) => {
            return Utils_Number.defaultComparer(a.ordinal, b.ordinal);
        }));

        // repository designer
        this.repositoryViewModel = new RepositoryDesignerViewModel.RepositoryDesignerViewModel(this.id(), repositoryFactories);

        this.id.subscribe((newValue: number) => {
            this.repositoryViewModel.setDefinitionId(newValue);
        });

        // Update task delegates based on currently selected repo
        this.repositoryViewModel.selectedRepository.subscribe((repoVM) => {
            if (repoVM) {
                var filePathProviderDelegate;
                if (repoVM.supportsPathDialog()) {
                    this._taskDelegates({
                        filePathProviderDelegate: delegate(this.repositoryViewModel, this.repositoryViewModel.showPathDialog),
                        editorExtensionDelegates: extensionDelegates
                    });
                }
                else {
                    this._taskDelegates({
                        editorExtensionDelegates: extensionDelegates
                    });
                }
                this._taskDelegates().editorExtensionDelegates({
                    fileContentProviderDelegate: delegate(this.repositoryViewModel, this.repositoryViewModel.fetchRepositoryFileContent)
                });                
            }
        });


        // task definition collection
        this._taskCollection = new TaskModels.TaskDefinitionCollection(taskDefinitions, ["Build"]);

        // Build steps designer
        this.taskGroupList = new InternalTasksEditor.TaskGroupsViewModel(this._taskCollection, this._taskDelegates);

        // convert the latest version map to an array
        this.latestVersionArray(this._taskCollection.getLatestVersionArray());

        // General & demands
        this.general = new GeneralViewModel.GeneralViewModel(queues, images);

        // History
        this.history = new HistoryViewModel.HistoryViewModel();

        this._initialized = true;
        this.update(definition);

        this.dirty = ko.computed({
            read: () => {
                var generalDirty: boolean = this.general._isDirty();
                var optionsAreDirty: boolean = this.options._isDirty();
                var repositoriesAreDirty: boolean = this.repositoryViewModel.dirty();
                var variablesAreDirty: boolean = this.variables._isDirty();
                var stepsAreDirty: boolean = this.taskGroupList.dirty();

                return generalDirty || optionsAreDirty || repositoriesAreDirty || stepsAreDirty || variablesAreDirty;
            }
        });

        this.invalid = ko.computed({
            read: () => {
                var generalInvalid: boolean = this.general._isInvalid();
                var optionsAreInvalid: boolean = this.options._isInvalid();
                var repositoriesAreInvalid: boolean = this.repositoryViewModel._isInvalid();
                var variablesAreInvalid: boolean = this.variables._isInvalid();
                var stepsAreInvalid: boolean = this.taskGroupList._isInvalid();

                return generalInvalid || optionsAreInvalid || repositoriesAreInvalid || variablesAreInvalid || stepsAreInvalid;
            }
        });

        this.canQueueBuild = ko.computed({
            read: () => {
                var isDirty: boolean = this.dirty();
                var hasValidId: boolean = this.id() > 0;

                return !isDirty && hasValidId;
            }
        });

        this.validationIssues = ko.computed({
            read: () => {
                var issues: string[] = [];

                // check for a default queue
                var defaultQueueValue = this.general.defaultQueue();
                if (!defaultQueueValue) {
                    issues.push(BuildResources.DefinitionInvalidNoQueue);
                }

                return issues;
            }
        });
    }

    public _initializeObservables() {
        this.author = ko.observable("");
        this.isDraft = ko.observable(true);
    }

    /**
     * Updates the model from a data contract
     * @param definition The data contract
     */
    public update(definition: BuildContracts.BuildDefinition) {
        super.update(definition);

        if (!!definition) {
            let tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

            this.id(definition.id);

            // make sure path is set before name, so that anything reacting to name would get updated path
            this.path = definition.path;

            this.name(definition.name);

            this.parentDefinitionId(!!definition.draftOf ? definition.draftOf.id : null);

            if (!!definition.authoredBy) {
                this.author(definition.authoredBy.displayName);
            }
            else {
                this.author("");
            }

            if (this._initialized) {
                // repository designer
                this.repositoryViewModel.update(definition.repository);

                // options designer
                this.options.update(definition.options);

                // steps designer
                let tasks: TaskTypes.ITask[] = null;
                let process = definition.process as BuildContracts.DesignerProcess;
                if (process && process.phases && process.phases.length > 0) {
                    tasks = process.phases[0].steps.map((buildStep: BuildContracts.BuildDefinitionStep) => {
                        var step: TaskTypes.ITask = <TaskTypes.ITask>buildStep;
                        if (!step.task.definitionType || step.task.definitionType === "") {
                            step.task.definitionType = "task";
                        }
                        return step;
                    });
                }

                this.taskGroupList.updateTaskList(tasks);

                // general & demands
                this.general.update(definition);

                this.definitionType(definition.type);
                this.isDraft(definition.quality === BuildContracts.DefinitionQuality.Draft);
            }
        }

        this.setClean();
    }

    /**
     * Reverts changes made to the model
     */
    public revert() {
        this.update(this.getOriginalDefinition());
    }

    /**
     * Extracts a data contract from the model
     */
    public extractDefinition(): BuildContracts.BuildDefinition {
        var extractedDefinition: BuildContracts.BuildDefinition;

        var currentDefinition: BuildContracts.BuildDefinition = this.getOriginalDefinition();
        if (!!currentDefinition) {
            // repository
            var repository = this.repositoryViewModel.getValue();

            // options
            var buildOptions = this.options.getValue();

            // variables
            var variables = this.variables.getValue();

            // steps
            var buildSteps = this.taskGroupList.getTaskList();

            // demands
            var demands = this.general.getValue();

            extractedDefinition = <BuildContracts.BuildDefinition><any>{
                id: currentDefinition.id,
                revision: currentDefinition.revision,
                name: this.name.peek(),
                description: this.general.description.peek(),
                buildNumberFormat: this.general.buildNumberFormat.peek(),
                jobAuthorizationScope: this.general.jobAuthorizationScope.peek(),
                jobTimeoutInMinutes: this.general.jobTimeout.peek(),
                jobCancelTimeoutInMinutes: this.general.jobCancelTimeout.peek(),
                type: BuildContracts.DefinitionType.Build,
                quality: this.isDraft.peek() ? BuildContracts.DefinitionQuality.Draft : BuildContracts.DefinitionQuality.Definition,
                project: {
                    id: currentDefinition.project.id,
                },
                queueStatus: currentDefinition.queueStatus,
                url: currentDefinition.url,
                build: buildSteps,
                repository: repository,
                options: buildOptions,
                variables: variables,
                authoredBy: <Framework.IdentityRef>{
                    displayName: this.author.peek()
                },
                demands: demands,
                comment: "",
                queue: this.general.getSelectedQueue(),
                badgeEnabled: this.general.badgeEnabled.peek(),
                path: this.path,
                _links: currentDefinition._links,
                processParameters: currentDefinition.processParameters
            };

            if (extractedDefinition.queue) {
                let selectedImage = extractedDefinition.queue.pool.isHosted ? this.general.getSelectedImage() : null;
                BuildUtils.updateHostedImageNameProperty(extractedDefinition, selectedImage);
            }


            var parentDefinitionId = this.parentDefinitionId.peek();
            if (!!parentDefinitionId) {
                extractedDefinition.draftOf = <BuildContracts.DefinitionReference>{
                    id: parentDefinitionId
                };
            }
        }

        return extractedDefinition;
    }

    public extractTaskDefinitions(): DistributedTask.TaskDefinition[] {
        return this._taskCollection.getTaskDefinitions();
    }

    public extractOptionDefinitions(): BuildContracts.BuildOptionDefinition[] {
        return this.options.optionDefinitionsStored;
    }

    public extractQueues(): DistributedTask.TaskAgentQueue[] {
        return this.general.queues();
    }

    /**
     * Marks the model clean
     */
    public setClean() {
        if (this.repositoryViewModel) {
            this.repositoryViewModel.setClean();
        }

        if (this.variables) {
            // variables
            this.variables.setClean();
        }
    }

    /**
     * Jumps to Builds
     */
    public showBuilds() {
        if (this.dirty()) {
            if (!confirm(BuildResources.BuildDefinitionLeaveDesignerMessage)) {
                // Cancel operation
                return;
            }
        }
        Navigation_Services.getHistoryService().addHistoryPoint(ExplorerActions.CompletedBuilds, $.extend(ViewsCommon.BuildActionIds.getDefaultState(), { definitionId: this.id() }));
    }
}

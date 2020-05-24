import ko = require("knockout");
import Q = require("q");

import ModelContext = require("Build/Scripts/ModelContext");
import RepositoryEditor = require("Build/Scripts/RepositoryEditorViewModel");
import RepositoryFactory = require("Build/Scripts/RepositoryFactory");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");

import {BuildCustomerIntelligenceInfo} from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");

import BuildCommon = require("TFS/Build/Contracts");

import Performance = require("VSS/Performance");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

export class RepositoryDesignerViewModel extends TaskModels.ChangeTrackerModel {
    private _cleanRepositoryType: string;
    private _definitionId: number;
    private _factoryPromises: { [type: string]: IPromise<RepositoryEditor.RepositoryEditorViewModel>; } = {};
    private _currentType: string;

    // This will hold a model for each type the user has edited to provide a nice experience when switching the type
    private _repositories: { [type: string]: RepositoryEditor.RepositoryEditorViewModel; };
    private _isBuildRepositoryEmpty: boolean = false;

    /*
     * List of repository factories
     */
    public repositoryFactories: KnockoutObservableArray<RepositoryFactory.RepositoryFactory>;

    /*
     * The currently selected repository view model
     */
    public selectedRepository: KnockoutObservable<RepositoryEditor.RepositoryEditorViewModel>;

    /*
     * The currently selected repository type
     */
    public selectedRepositoryType: KnockoutObservable<string>;

    public clean: KnockoutObservable<string> = ko.observable("");
    public name: KnockoutObservable<string> = ko.observable("");

    constructor(definitionId: number, repositoryFactories: RepositoryFactory.RepositoryFactory[]) {
        super();
        this._definitionId = definitionId;
        this._repositories = {};
        this.repositoryFactories = ko.observableArray(repositoryFactories);

        this._addDisposable(ko.computed(() => {
            var selectedRepository = this.selectedRepository();
            if (selectedRepository) {
                var clean = selectedRepository.clean();
                this.clean(clean);

                var name = selectedRepository.name();
                this.name(name);

                var type = selectedRepository.type().toLowerCase();
                this.selectedRepositoryType(type);
            }
        }));
    }

    public setDefinitionId(definitionId: number) {
        this._definitionId = definitionId;
    }

    public getDefinitionId() {
        return this._definitionId;
    }

    public getSelectedRepositoryType(): string {
        return this.selectedRepositoryType();
    }

    /**
     * See base.
     */
    _initializeObservables(): void {
        super._initializeObservables();

        this.selectedRepository = ko.observable(null);
        this.selectedRepositoryType = ko.observable("");
    }

    public repositoryTypeChanged(type: string) {
        var type = type.toLowerCase();
        if (type) {
            ModelContext.ModelContext.repositoryType(type);
            this._updateRepositoryModel(type);
        }
    }

    private _updateRepositoryModel(type: string, repository?: BuildCommon.BuildRepository) {
        let viewModel = this._getRepositoryEditorViewModel(type);
        this._currentType = type;
        if (viewModel) {
            if (repository) {
                viewModel.update(repository);
            }
            else {
                this.selectedRepository(viewModel);
            }
        }
        else {
            let performance = Performance.getScenarioManager().startScenario(BuildCustomerIntelligenceInfo.Area, "UpdateRepositoryModel");
            this._getNewRepositoryViewModelPromise(type).then((newViewModel: RepositoryEditor.RepositoryEditorViewModel) => {
                if (newViewModel && Utils_String.equals(newViewModel.type.peek(), this._currentType, true)) {
                    performance.addSplitTiming("finished new repository view model promise for current type");
                    if (repository) {
                        newViewModel.update(repository);
                    }
                    this.selectedRepository(newViewModel);
                    this._repositories[type] = newViewModel;
                }

                performance.end();
            });
        }
    }

    /**
     * Sets the repository
     * @param repository The repository to edit
     */
    public update(repository: BuildCommon.BuildRepository) {
        if (repository) {
            var repositoryType = repository.type.toLowerCase();
            this._cleanRepositoryType = repositoryType;
            this._updateRepositoryModel(repositoryType, repository);
            this._isBuildRepositoryEmpty = false;
        }
        else {
            this._isBuildRepositoryEmpty = true;
        }
    }

    private _getNewRepositoryViewModelPromise(repositoryType: string, repository?: BuildCommon.BuildRepository): IPromise<RepositoryEditor.RepositoryEditorViewModel> {
        var promise = this._factoryPromises[repositoryType];
        if (!promise) {
            promise = Q(null);

            var factory = this._getRepositoryFactory(repositoryType);
            if (factory) {
                if (repository) {
                    promise = factory.createRepositoryViewModel(this._definitionId, repository)
                        .then((viewModel: RepositoryEditor.RepositoryEditorViewModel) => {
                            this._setRepositoryEditorViewModel(repositoryType, viewModel);
                            return viewModel;
                        });
                }
                else {
                    promise = factory.createNewRepository()
                        .then((repository: BuildCommon.BuildRepository) => {
                            return factory.createRepositoryViewModel(this._definitionId, repository)
                                .then((viewModel: RepositoryEditor.RepositoryEditorViewModel) => {
                                    this._setRepositoryEditorViewModel(repositoryType, viewModel);
                                    return viewModel;
                                });
                        });
                }
            }

            this._factoryPromises[repositoryType] = promise;
        }

        return promise;
    }

    private _getRepositoryFactory(repositoryType: string): RepositoryFactory.RepositoryFactory {
        var factory = Utils_Array.first(this.repositoryFactories(), (factory: RepositoryFactory.RepositoryFactory) => {
            return Utils_String.localeIgnoreCaseComparer(repositoryType, factory.type) === 0;
        });

        return factory;
    }

    private _getRepositoryEditorViewModel(repositoryType: string): RepositoryEditor.RepositoryEditorViewModel {
        return this._repositories[repositoryType.toLowerCase()];
    }

    private _setRepositoryEditorViewModel(repositoryType: string, viewModel: RepositoryEditor.RepositoryEditorViewModel) {
        this._repositories[repositoryType.toLowerCase()] = viewModel;
    }

    /**
     * Gets the default branch filter
     */
    public getDefaultBranchFilter(): string {
        let selectedRepository = this.selectedRepository();
        if (selectedRepository) {
            return selectedRepository.getDefaultBranchFilter();
        }
    }

    public normalizeBranchFilters(filters: string[]): string[] {
        let selectedRepository = this.selectedRepository();
        if (selectedRepository) {
            return selectedRepository.normalizeBranchFilters(filters);
        }
        else {
            return filters || [];
        }
    }

    /**
     * Gets the default path filter
     */
    public getDefaultPathFilter(): string {
        var selectedRepository = this.selectedRepository();
        if (selectedRepository) {
            return selectedRepository.getDefaultPathFilter();
        }
    }

    public normalizePathFilters(filters: string[]): string[] {
        let selectedRepository = this.selectedRepository();
        if (selectedRepository) {
            return selectedRepository.normalizePathFilters(filters);
        }
        else {
            return filters || [];
        }
    }

    public ciTriggerRequiresBranchFilters(): boolean {
        let selectedRepository = this.selectedRepository();
        if (selectedRepository) {
            return selectedRepository.ciTriggerRequiresBranchFilters();
        }
        else {
            return false;
        }
    }

    public ciTriggerRequiresPathFilters(): boolean {
        let selectedRepository = this.selectedRepository();
        if (selectedRepository) {
            return selectedRepository.ciTriggerRequiresPathFilters();
        }
        else {
            return false;
        }
    }

    // Subversion requires that the scheduled branch (e.g., "trunk") be different than the
    // trigger branch which is a path (e.g., "/trunk/folder").
    public getDefaultScheduledBranch(): string {
        var selectedRepository = this.selectedRepository();
        if (selectedRepository) {
            return selectedRepository.getDefaultScheduledBranch();
        }
    }

    /**
     * See base.
     */
    public getValue(): BuildCommon.BuildRepository {
        var selectedRepository = this.selectedRepository();
        if (selectedRepository) {
            return selectedRepository.getValue();
        }
    }

    /**
     * Marks the current repository clean
     */
    public setClean() {
        var selectedRepository = this.selectedRepository();
        if (selectedRepository) {
            selectedRepository.setClean();
            selectedRepository.name.valueHasMutated();

            this._cleanRepositoryType = this.selectedRepositoryType();
            this.selectedRepositoryType.notifySubscribers(this._cleanRepositoryType);
        }

        // clear out other repository types
        for (var repositoryType in this._repositories) {
            if (Utils_String.localeIgnoreCaseComparer(repositoryType, this._cleanRepositoryType) !== 0 && this._repositories.hasOwnProperty(repositoryType)) {
                this._repositories[repositoryType] = null;
                this._factoryPromises[repositoryType] = null;
            }
        }
    }

    /**
    * Indicates whether the model supports a path picker dialog
    */
    public supportsPathDialog(): boolean {
        var selectedRepository = this.selectedRepository();
        if (selectedRepository) {
            return selectedRepository.supportsPathDialog();
        }
    }

    /**
     * Shows a path picker dialog
     */
    public showPathDialog(initialValue: string, callback: (selectedValue: ISelectedPathNode) => void) {
        var selectedRepository = this.selectedRepository();
        if (selectedRepository) {
            selectedRepository.showPathDialog(initialValue, callback);
        }
    }

    public fetchRepositoryFileContent(path: string, callback: (content: any) => void, errorCallback: (error: any) => void) {
        var selectedRepository = this.selectedRepository();
        if (selectedRepository && selectedRepository.fetchRepositoryFileContent) {
            selectedRepository.fetchRepositoryFileContent(path, callback, errorCallback);
        }
        else {
            if ($.isFunction(errorCallback)) {
                var errorMessage = Utils_String.format(BuildResources.RepositoryNotSupportedForFileContent, this.name());
                errorCallback(errorMessage);
            }
        }
    }

    /**
     * Gets the name of the template to use for the repository editor
     */
    public getTemplateName(): string {
        var selectedRepository = this.selectedRepository();
        if (selectedRepository) {
            return selectedRepository.getTemplateName();
        }
    }

    /**
     * Gets the type of the editor control
     */
    public getEditorControlType(): any {
        var selectedRepository = this.selectedRepository();
        if (selectedRepository) {
            return selectedRepository.getEditorControlType();
        }
    }

    /**
     * See base.
     */
    _isDirty(): boolean {
        var selectedRepositoryType = this.selectedRepositoryType();
        if (this._cleanRepositoryType && Utils_String.localeIgnoreCaseComparer(this._cleanRepositoryType, selectedRepositoryType) !== 0) {
            return true;
        }

        var selectedRepository = this.selectedRepository();
        if (selectedRepository) {
            if (this._isBuildRepositoryEmpty || selectedRepository._isDirty()) {
                return true;
            }
        }

        return false;
    }

    _isInvalid(): boolean {
        var invalid = false;

        var selectedRepository = this.selectedRepository();
        if (selectedRepository) {
            invalid = selectedRepository._isInvalid();
        }
        else {
            invalid = true;
        }

        return invalid;
    }
}

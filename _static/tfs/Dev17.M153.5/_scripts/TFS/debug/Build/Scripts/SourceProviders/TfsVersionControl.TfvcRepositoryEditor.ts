import ko = require("knockout");

import BaseSourceProvider = require("Build/Scripts/SourceProviders/BaseSourceProvider");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import RepositoryEditor = require("Build/Scripts/RepositoryEditorViewModel");
import TfvcCommon = require("Build/Scripts/SourceProviders/TfsVersionControl.Common");

import {RepositoryProperties, RepositoryTypes} from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");

import Marked = require("Presentation/Scripts/marked");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import BuildContracts = require("TFS/Build/Contracts");

import AddPathDialog = require("VersionControl/Scripts/Controls/AddPathDialog");
import VCClient = require("VersionControl/Scripts/TFS.VersionControl.ClientServices");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VersionSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");

import Dialogs = require("VSS/Controls/Dialogs");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");

import Constants_Platform = require("VSS/Common/Constants/Platform");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { MarkdownRenderer } from "ContentRendering/Markdown";

export class TfvcMappingViewModel extends TaskModels.ChangeTrackerModel {
    private _mapping: BuildContracts.MappingDetails;

    public mappingType: KnockoutObservable<string>;
    public serverPath: KnockoutObservable<string>;
    public displayedLocalPath: KnockoutObservable<string>;
    public localPathVisible: KnockoutComputed<boolean>;
    public localPath: KnockoutComputed<string>;

    public duplicateServerPath: KnockoutObservable<boolean>;
    public duplicateLocalPath: KnockoutObservable<boolean>;

    private _sourcePickerMethod: (initialValue: string, callback: (selectedValue: ISelectedPathNode) => void) => void;
    private _getMappingsEligibleForGeneration: () => TfvcMappingViewModel[];
    private _generateLocalPaths: (mappings: TfvcMappingViewModel[]) => void;

    constructor(mapping: BuildContracts.MappingDetails, pickerMethod: any, eligibleForGenerationMethod: any, generateMethod: any) {
        super();
        this._mapping = mapping;
        this._sourcePickerMethod = pickerMethod;
        this._getMappingsEligibleForGeneration = eligibleForGenerationMethod;
        this._generateLocalPaths = generateMethod;
        this.mappingType(this._mapping.mappingType || "map");
        this.serverPath(this._mapping.serverPath || "");
        this.displayedLocalPath(TfvcMappingViewModel.convertLocalPathToDisplay(this._mapping.localPath) || "");
    }

    _initializeObservables(): void {
        super._initializeObservables();
        this.mappingType = ko.observable("map");
        this.serverPath = ko.observable("");
        this.displayedLocalPath = ko.observable("");
        this.duplicateServerPath = ko.observable(false);
        this.duplicateLocalPath = ko.observable(false);

        // local path should only be shown for type "map"
        this.localPathVisible = ko.computed({
            read: () => {
                return Utils_String.localeIgnoreCaseComparer(this.mappingType(), "map") === 0;
            }
        });

        this.localPath = ko.computed(() => {
            // add '\\' to aid server calculation
            return "\\" + this.displayedLocalPath();
        });
    }

    /**
     * Extracts a data contract from the editor
     */
    public getValue(): BuildContracts.MappingDetails {
        // peeking everything to avoid inadvertently creating subscriptions
        return <BuildContracts.MappingDetails>{
            mappingType: this.mappingType.peek(),
            serverPath: this.serverPath.peek().trim(),
            localPath: this.localPath.peek().trim()
        };
    }

    _isDirty(): boolean {
        if (!this._mapping) {
            return false;
        }

        return Utils_String.localeIgnoreCaseComparer(this.mappingType(), this._mapping.mappingType) !== 0 ||
            Utils_String.localeIgnoreCaseComparer(this.serverPath(), this._mapping.serverPath) !== 0 ||
            (Utils_String.localeIgnoreCaseComparer(this.localPath(), this._mapping.localPath) !== 0 &&
                this.localPathVisible());
    }

    _isInvalid(): boolean {
        return this.isServerPathInvalid() || this.isLocalPathInvalid();
    }

    public isServerPathInvalid(): boolean {
        var serverPath = this.serverPath().trim();
        return serverPath.length === 0 ||
            serverPath.indexOf("$/") !== 0 ||
            this.duplicateServerPath();
    }

    public isLocalPathInvalid(): boolean {
        // local path shouldn't be invalid if there is no local path
        var visible = this.localPathVisible();
        if (!visible) {
            return false;
        }

        return this.duplicateLocalPath();
    }

    public onSourcePickerClick(path: string) {
        this._sourcePickerMethod(this.serverPath(),
            (result: ISelectedPathNode) => {
                var mappingsEligibleForGeneration = this._getMappingsEligibleForGeneration();
                // this.localPath(this._commonRootReactionMethod(result.path));
                this.serverPath(result.path);

                this._generateLocalPaths(mappingsEligibleForGeneration);
            });
    }

    public static convertLocalPathToDisplay(localPath: string): string {
        if (localPath && localPath.length > 0 && localPath.charAt(0) === '\\') {
            return localPath.substr(1);
        }

        return localPath;
    }
}

export class TfvcRepositoryEditorControl extends BaseSourceProvider.RepositoryEditorControl {
    constructor(viewModel: BaseSourceProvider.RepositoryEditorWrapperViewModel, options?: any) {
        super(viewModel, options);
    }
}

export class TfvcRepositoryEditorViewModel extends RepositoryEditor.RepositoryEditorViewModel {
    private _rootFolder: string;
    private _mappings: BuildContracts.MappingDetails[] = [];
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _labelSources: BuildContracts.BuildResult;
    private _sourceLabelFormat: string;
    private _cleanOptions: BuildContracts.RepositoryCleanOptions;

    /**
     * The repository clean option to use
     */
    public cleanOptions: KnockoutObservable<BuildContracts.RepositoryCleanOptions>;

    /**
     * Tfvc mappings that are part of tfvc workspace
     */
    public mappings: KnockoutObservableArray<TfvcMappingViewModel>;

    /**
     * The root folder
     */
    public rootFolder: KnockoutObservable<string>;

    /**
     * When to label sources as part of the build
     */
    public labelSources: KnockoutObservable<BuildContracts.BuildResult>;

    /**
     * The format to use for the source label
     */
    public sourceLabelFormat: KnockoutObservable<string>;

    /**
     * Clean option help markdown
     */
    public cleanOptionHelpMarkDown: KnockoutObservable<string>;

    constructor(repository: BuildContracts.BuildRepository) {
        super(repository);
        this.update(repository);
    }

    /**
     * See base.
     */
    _initializeObservables(): void {
        super._initializeObservables();

        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

        this._cleanOptions = BuildContracts.RepositoryCleanOptions.Source;
        this.cleanOptions = ko.observable(this._cleanOptions);

        this._rootFolder = TfvcCommon.defaultTfvcPrefix + tfsContext.navigation.project;
        this.rootFolder = ko.observable(this._rootFolder);

        this.mappings = ko.observableArray([]);

        this._labelSources = BuildContracts.BuildResult.None;
        this.labelSources = ko.observable(this._labelSources);

        this._sourceLabelFormat = TfvcCommon.defaultSourceLabelFormat;
        this.sourceLabelFormat = ko.observable(this._sourceLabelFormat);

        this.cleanOptionHelpMarkDown = ko.observable(null);
    }

    /**
     * See base.
     */
    public update(repository: BuildContracts.BuildRepository): void {
        super.update(repository);

        if (repository.rootFolder) {
            this._rootFolder = repository.rootFolder;
        }
        else {
            var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
            this._rootFolder = TfvcCommon.defaultTfvcPrefix + tfsContext.navigation.project;
        }

        this.rootFolder(this._rootFolder);

        this._labelSources = (repository.properties && repository.properties[RepositoryProperties.LabelSources]) ? <BuildContracts.BuildResult><any>repository.properties[RepositoryProperties.LabelSources] : BuildContracts.BuildResult.None;
        this.labelSources(this._labelSources);

        this._sourceLabelFormat = repository.properties ? repository.properties[RepositoryProperties.LabelSourcesFormat] : "";
        this.sourceLabelFormat(this._sourceLabelFormat);

        this._cleanOptions = (repository.properties && repository.properties[RepositoryProperties.CleanOptions]) ? <BuildContracts.RepositoryCleanOptions><any>repository.properties[RepositoryProperties.CleanOptions] : BuildContracts.RepositoryCleanOptions.Source;
        this.cleanOptions(this._cleanOptions);

        // Update workspace mappings
        var workspace: BuildContracts.BuildWorkspace = <any>{};
        if (repository.properties && repository.properties[RepositoryProperties.TfvcMapping]) {
            workspace = JSON.parse(repository.properties[RepositoryProperties.TfvcMapping]);
        }
        if (workspace.mappings) {
            this._mappings = workspace.mappings;
        }
        else {
            // default mappings for a new definition
            this._mappings = [
                {
                    mappingType: "map",
                    serverPath: this._rootFolder,
                    localPath: "\\"
                },
                {
                    mappingType: "cloak",
                    serverPath: this._rootFolder + "/Drops",
                    localPath: ""
                }
            ];
        }

        this._updateWorkspaceMappings(this._mappings);

        var cleanMarkdown: string;
        
        if (FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.MarkdownRendering)) {
            let renderer = new MarkdownRenderer();
            cleanMarkdown = renderer.renderHtml(BuildResources.BuildRepositoryTfvcCleanHelpMarkDown);
        }
        else {
            cleanMarkdown = Marked(BuildResources.BuildRepositoryTfvcCleanHelpMarkDown);
        }

        this.cleanOptionHelpMarkDown(cleanMarkdown);
    }

    /**
     * Gets the name of the html template used by the editor
     */
    public getTemplateName(): string {
        return "buildvnext_repository_editor_tfvc";
    }

    /**
     * See base.
     */
    public getIconName(): string {
        return "icon-open-visualstudio";
    }

    /**
     * Extracts a data contract from the editor
     */
    public getValue(): BuildContracts.BuildRepository {
        // peeking at everything to avoid inadvertently triggering subscriptions
        let properties: { [key: string]: string } = {};

        let labelSources = this.labelSources.peek();
        properties[RepositoryProperties.LabelSources] = labelSources.toString();
        // using != to compare strings to numbers
        if (labelSources != BuildContracts.BuildResult.None) {
            properties[RepositoryProperties.LabelSourcesFormat] = this.sourceLabelFormat.peek() || "";
        }

        // Add workspace
        let workspace: BuildContracts.BuildWorkspace = { mappings: this._getWorkspaceMappings() };
        properties[RepositoryProperties.TfvcMapping] = JSON.stringify(workspace);

        // Add repository clean options
        let cleanOptions = this.cleanOptions.peek();
        properties[RepositoryProperties.CleanOptions] = cleanOptions.toString();

        return <BuildContracts.BuildRepository>{
            type: RepositoryTypes.TfsVersionControl,
            name: this.name.peek(),
            rootFolder: this.rootFolder.peek(),
            url: this.url.peek(),
            clean: "" + this.clean.peek(),
            properties: properties
        };
    }

    /**
     * Gets the type of editor control for this model
     */
    public getEditorControlType(): any {
        return TfvcRepositoryEditorControl;
    }

    /**
     * Marks the repository clean
     */
    public setClean(): void {
        super.setClean();
        this._rootFolder = this.rootFolder();
        this._labelSources = this.labelSources();
        this._sourceLabelFormat = this.sourceLabelFormat();
        this._cleanOptions = this.cleanOptions();
        this.mappings().forEach((value, index, array) => {
            value.setClean();
        });
    }

    /**
     * Gets the default trigger filter
     */
    public getDefaultPathFilter(): string {
        return this.rootFolder();
    }

    public normalizeBranchFilters(filters: string[]): string[] {
        return filters || [];
    }

    public normalizePathFilters(filters: string[]): string[] {
        // If no pathFilters provide the default trigger filter
        let pathFilters = filters || [];
        if (pathFilters.length === 0 || (pathFilters.length === 1 && Utils_Array.contains(pathFilters, "+undefined", Utils_String.ignoreCaseComparer))) {
            pathFilters = [];
            pathFilters.push("+" + this.getDefaultPathFilter());
        }

        return pathFilters;
    }

    public ciTriggerRequiresBranchFilters(): boolean {
        return false;
    }

    public ciTriggerRequiresPathFilters(): boolean {
        return true;
    }

    public getDefaultScheduledBranch(): string {
        return this.getDefaultPathFilter();
    }

    /**
    * Indicates whether the model supports a path picker dialog
    */
    public supportsPathDialog(): boolean {
        return true;
    }
    
    /**
     * See base.
     */
    _isDirty(): boolean {
        // source label is case-sensitive. labelSources is bound to a dropdown so it has string values
         // 0 != "0" should be false, cleanOptions is from <select> and would be string, so use !=
        if (super._isDirty() ||
            this._labelSources != this.labelSources() ||
            this._sourceLabelFormat !== this.sourceLabelFormat() ||
            this._cleanOptions != this.cleanOptions()) {
            return true;
        }

        var mappings = this.mappings();
        if (this._mappings && mappings.length != this._mappings.length) {
            return true;
        }

        for (var i = 0, len = mappings.length; i < len; i++) {
            if (mappings[i]._isDirty()) {
                return true;
            }
        }

        return Utils_String.localeIgnoreCaseComparer(this._rootFolder, this.rootFolder()) !== 0 ||
            !Utils_Array.arrayEquals(this._mappings, this.mappings(),
                (s: BuildContracts.MappingDetails, t: TfvcMappingViewModel) => {
                    return Utils_String.localeIgnoreCaseComparer(s.serverPath, t.serverPath()) === 0 ||
                        Utils_String.localeIgnoreCaseComparer(s.localPath, t.displayedLocalPath()) === 0 ||
                        Utils_String.localeIgnoreCaseComparer(s.mappingType, t.mappingType()) === 0;
                }, true);
    }

    _isInvalid(): boolean {
        // using != to compare string to number
        let sourceLabelFormat = this.sourceLabelFormat() || "";
        if (this.labelSources() != BuildContracts.BuildResult.None
            && sourceLabelFormat.trim().length === 0) {
            return true;
        }

        var rtn: boolean = false;
        var mappings = this.mappings();

        var serverPaths: string[] = [];
        var localPaths: string[] = [];

        mappings.forEach((value, index, array) => {
            var cleanServerPath = this._removeTrailingSpacesAndSlashes(value.serverPath());
            var cleanLocalPath = this._removeTrailingSpacesAndSlashes(value.displayedLocalPath());

            // check for duplicated server paths
            if (serverPaths.some((path, index, array) => {
                return cleanServerPath === path;
            })) {
                value.duplicateServerPath(true);
            }
            else {
                value.duplicateServerPath(false);
                serverPaths.push(cleanServerPath);
            }

            // check for duplicated local paths
            if (Utils_String.localeIgnoreCaseComparer(value.mappingType(), "map") === 0) {
                if (localPaths.some((path, index, array) => {
                    return cleanLocalPath === path;
                })) {
                    value.duplicateLocalPath(true);
                }
                else {
                    value.duplicateLocalPath(false);
                    localPaths.push(cleanLocalPath);
                }
            }

            if (value._isInvalid()) {
                rtn = true;
            }
        });

        return rtn;
    }

    public addMapping(model: TfvcRepositoryEditorViewModel, evt: JQueryEventObject): void {
        var root = model.rootFolder();
        this.mappings.push(new TfvcMappingViewModel({
            mappingType: "map",
            serverPath: "",
            localPath: ""
        }, this.showPathDialog, () => this.getMappingsEligibleForGeneration(), (mappings: TfvcMappingViewModel[]) => this.generateLocalMappings(mappings)));
    }

    public removeMapping(mapping: TfvcMappingViewModel, evt: JQueryEventObject): void {
        var context = <TfvcRepositoryEditorViewModel>(<KnockoutBindingContext>ko.contextFor(evt.target)).$parent;

        // warning message about deleting last mapping
        if (context.mappings().length != 1 || confirm(BuildResources.DeleteLastWorkspaceMappingConfirmation)) {
            context.mappings.remove(mapping);
            mapping.dispose();
        }
    }

    /**
     * Shows a path picker dialog
     */
    public showPathDialog(initialValue: string, callback: (selectedValue: ISelectedPathNode) => void) {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var dialogModel = new AddPathDialog.AddPathDialogModel();

        dialogModel.initialPath = "$/" + tfsContext.navigation.project;
        dialogModel.addSlashToPathToGetSelection = false;

        // Initialize input model
        dialogModel.inputModel = new AddPathDialog.InputModel();
        dialogModel.inputModel.path(initialValue);

        // set the repository context
        dialogModel.repositoryContext = VCClient.getContext(tfsContext);

        // set the callabck
        dialogModel.okCallback = callback;

        // Show the dialog
        Dialogs.show(AddPathDialog.AddPathDialog, dialogModel);
    }

    /**
     * Fetch the content of the file from Tfvc.
     * @param path file path in source provider
     * @param callback success callback function called once the content is available
     * @param errorCallback error callback function to notify the error to caller
     */

    public fetchRepositoryFileContent(path: string, callback: (content: any) => void, errorCallback: (error: any) => void) {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var repositoryContext = VCClient.getContext(tfsContext);

        var repoClient = repositoryContext.getClient();
        var version = new VersionSpecs.LatestVersionSpec().toVersionString();

        repoClient.beginGetItemContent(repositoryContext, path, version, callback, errorCallback);
    }

    public getMappingsEligibleForGeneration(): TfvcMappingViewModel[] {
        var existingMappings: TfvcMappingViewModel[] = [];
        var eligibleMappings: TfvcMappingViewModel[] = [];
        var serverPaths: string[] = [];
        this.mappings().forEach((value, index, array) => {
            // exclude cloaks
            if (value.mappingType() === "map") {
                if (!(Utils_String.ignoreCaseComparer(value.serverPath(), Utils_String.empty) === 0)) {

                    serverPaths.push(value.serverPath());
                    existingMappings.push(value);
                }
                else {
                    // empty paths should attempt to be generated
                    eligibleMappings.push(value);
                }
            }
        });

        // generate local mappings without new value so we can figure out which paths are generated vs. manually input
        var generatedLocalPaths = this.calculateLocalMappings(serverPaths);

        existingMappings.forEach((value, index, array) => {
            var localPathValue = value.displayedLocalPath().trim();

            // if local paths were previously generated and not manually input, add them for regeneration
            // also add empty local paths
            if (Utils_String.ignoreCaseComparer(localPathValue, generatedLocalPaths[index].trim()) === 0 ||
                Utils_String.ignoreCaseComparer(localPathValue, Utils_String.empty) === 0) {
                eligibleMappings.push(value);
            }
        });

        return eligibleMappings;
    }

    public generateLocalMappings(mappings: TfvcMappingViewModel[]) {
        var existingMappings: TfvcMappingViewModel[] = [];
        var serverPaths: string[] = [];
        mappings.forEach((value, index, array) => {
            // don't use empty server paths
            if (!(Utils_String.ignoreCaseComparer(value.serverPath(), Utils_String.empty) === 0)) {
                serverPaths.push(value.serverPath());
                existingMappings.push(value);
            }
        });

        var generatedLocalPaths = this.calculateLocalMappings(serverPaths);

        // set local paths
        existingMappings.forEach((value, index, array) => {
            value.displayedLocalPath(generatedLocalPaths[index]);
        });
    }

    public convertServerPathToLocal(serverPath: string): string {
        if (!serverPath || Utils_String.equals(serverPath.trim(), Utils_String.empty)) {
            // empty path for null/empty
            return "";
        }

        // remove the "$" from the server path
        if (serverPath.length > 1 && Utils_String.equals(serverPath.substr(0, 2), "$/", true)) {
            serverPath = serverPath.substr(1);
        }

        // swap / for \
        return serverPath.replace(/\//g, '\\');
    }

    public calculateLocalMappings(serverPaths: string[]): string[] {
        var commonPath = TfvcRepositoryEditorViewModel._getCommonServerPath(serverPaths);
        commonPath = commonPath.replace("$/", "\\").replace(/\//g, '\\');

        var localPaths: string[] = [];
        serverPaths.forEach((path) => {
            var localPath = this.convertServerPathToLocal(path)
                .replace(commonPath, "")
                .replace(/\//g, '\\');     
                   
            // when the entire path is the same as the common path, represent with \
            if (localPath.length === 0) {
                localPath = "\\";
            }

            localPaths.push(TfvcMappingViewModel.convertLocalPathToDisplay(localPath));
        });

        return localPaths;
    }

    private _removeTrailingSpacesAndSlashes(str: string): string {
        var rtn = str.trim().replace(/\/+$/, "").replace(/\\+$/, "");
        var lastChar = str.substr(str.length - 1);
        // remove trailing chars until there are no more
        while (lastChar === "/" ||
            lastChar === " ") {
            rtn = str.trim().replace(/\/+$/, "").replace(/\\+$/, "");
            lastChar = rtn.length > 0 ? rtn.substr(str.length - 1) : "";
        }

        return rtn;
    }

    private static _getCommonServerPath(serverItems: string[]): string {
        if (!serverItems ||
            serverItems.length === 0) {
            return "/";
        }

        var root = serverItems[0];
        for (var i = 1; i < serverItems.length; i++) {
            root = TfvcRepositoryEditorViewModel._getCommonPath(root, serverItems[i]);
            if (!root || Utils_String.equals(root, Utils_String.empty)) {
                return "$/";
            }
        };

        return root;
    }

    private static _getCommonPath(path1: string, path2: string): string {
        var commonPath: string[] = [];

        var path1Parts = path1.split("/");
        var path2Parts = path2.split("/");
        var shorterPathLength = Math.min(path1Parts.length, path2Parts.length);

        for (var i = 0; i < shorterPathLength; i++) {
            if (!Utils_String.equals(path1Parts[i], path2Parts[i], true)) {
                break;
            }

            commonPath.push(path1Parts[i]);
        }

        return commonPath.join("/");;
    }

    private _getWorkspaceMappings(): BuildContracts.MappingDetails[] {
        let mappings: BuildContracts.MappingDetails[] = [];
        $.each(this.mappings.peek(), (index, value: TfvcMappingViewModel) => {
            mappings.push(value.getValue());
        });
        return mappings;
    }

    private _updateWorkspaceMappings(mappings: BuildContracts.MappingDetails[]) {
        var mappingVMs: TfvcMappingViewModel[] = [];
        mappingVMs = $.map(mappings, (value: BuildContracts.MappingDetails, index) => {
            var mappingDetailsClone: BuildContracts.MappingDetails = {
                mappingType: value.mappingType,
                serverPath: value.serverPath,
                localPath: value.localPath
            };
            return new TfvcMappingViewModel(mappingDetailsClone, this.showPathDialog, () => this.getMappingsEligibleForGeneration(), (mappings: TfvcMappingViewModel[]) => this.generateLocalMappings(mappings));
        });
        this.mappings(mappingVMs);
    }
}

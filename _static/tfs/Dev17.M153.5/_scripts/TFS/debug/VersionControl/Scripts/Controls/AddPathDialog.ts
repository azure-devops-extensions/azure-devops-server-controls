/// <reference types="jquery" />
import ko = require("knockout");

import TaskTypes = require("DistributedTasksCommon/TFS.Tasks.Types");

import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import SourceExplorerTree = require("VersionControl/Scripts/Controls/SourceExplorerTree");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VersionSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");

import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import VSS = require("VSS/VSS");

import "VSS/LoaderPlugins/Css!VersionControl/Controls/AddPathDialog";

export class AddPathDialogModel implements Dialogs.IDialogOptions {
    public okCallback: (result: TaskTypes.ISelectedPathNode) => void;
    constructor(okCallback?: (result: TaskTypes.ISelectedPathNode) => void) {
        this.okCallback = okCallback;
    }
    public resizable: boolean = false;
    public height: number = 450;
    public okText: string = "";
    public buttons: any;
    public sourceTree: SourceExplorerTree.Tree;
    public repositoryContext: RepositoryContext = null;
    public branch: string = "";
    public inputModel: InputModel;
    public initialPath: string = "";
    public addSlashToPathToGetSelection: boolean = true;
    public allowGetNode: boolean = false;

    public setBranch(branchRef: string) {
        if (!branchRef) {
            branchRef = "";
        }
        this.branch = branchRef.replace("refs/heads/", "");
    }
}

export class InputModel {
    public path: KnockoutObservable<string> = ko.observable("");
    public isFolder: KnockoutObservable<boolean> = ko.observable(false);
    constructor() {
    }
}

// show with ControlsCommon.Dialog.show(AddPathDialog, model)
export class AddPathDialog extends Dialogs.ModalDialog {
    public _model: AddPathDialogModel;
    private selectedItem: JQuery = null;
    private _$template: JQuery;
    private initialSelection: boolean = true;
    constructor(model: AddPathDialogModel) {
        super(model);
        super.initializeOptions($.extend({
            cssClass: "add-path-dialog"
        }, model));
        this._model = model;
    }

    public initializeOptions(options?: AddPathDialogModel) {
        super.initializeOptions($.extend({
        }, options));
    }

    private getExpandablePath(path: string): string {
        if (path && path.charAt(0) == "*") {
            // Default value, trick to expand the node by default
            return this._model.initialPath;
        }
        else {
            return path;
        }
    }

    public initialize() {
        super.initialize();
        this._$template = $('<div class="add-path-container"><div class="source-explorer-tree"></div></div>');
        this._element.append(this._$template);

        const repoContext = this._model.repositoryContext;
        // Set up the tree if repository exists, for tfvc repoContext won't have any repository...
        if (repoContext && (repoContext.getRepository() || repoContext.getRepositoryType() === RepositoryType.Tfvc)) {
            const el = this._element.find(".source-explorer-tree");
            this._model.sourceTree = <SourceExplorerTree.Tree>Controls.Enhancement.enhance(SourceExplorerTree.Tree, el, {
                showFavorites: false,
                contextMenu: null
            });
            // Call back when item is clicked
            this._model.sourceTree.onItemClick = (node: SourceExplorerTree.SourceExplorerTreeNode, nodeElement: JQuery, e?) => {
                let path = node.vcPath || "", folder = node.folder;
                if (typeof (path) !== "string" && typeof (folder) !== "boolean") {
                    // Ignore for empty repo
                    return false;
                }
                const firstChar = path.charAt(0);
                if (firstChar === "/") {
                    path = path.slice(1, path.length); // stripping off root path in the beginning for GIT repo only
                }

                this.updateOkButton(!!path);

                // Ignore errors on attempting to set the path for an empty Git repo (path === "")
                this._model.sourceTree.setSelectedItemPath(path, path === "");
                this._model.inputModel.path(path);
                this._model.inputModel.path.notifySubscribers(path);
                this._model.inputModel.isFolder(folder);
                this._model.inputModel.isFolder.notifySubscribers(folder);
                return false;
            };
            // Subscribe to self data change to avoid element triggerings
            this._model.inputModel.path.subscribe((newVal) => { this._model.inputModel.path(newVal) });
            this._model.inputModel.isFolder.subscribe((newVal) => { this._model.inputModel.isFolder(newVal) });
            let version = new VersionSpecs.LatestVersionSpec().toVersionString();
            if (this._model.branch != "") {
                // Possible Git branch selected
                version = new VersionSpecs.GitBranchVersionSpec(this._model.branch).toVersionString();
            }
            this._model.sourceTree.setRepositoryAndVersion(this._model.repositoryContext, version);
            // To load existing selection
            this._model.sourceTree.setSelectedItemPath(this.getExpandablePath(this._model.inputModel.path()), true);

            // Ignore errors if repo is empty
            this._model.sourceTree.toggleErrorCallback = (error: any) => {
                return;
            };
        }
        else {
            this._element.find(".build-add-path-container").hide();
            const warning = $("<span><span class='bowtie-icon bowtie-status-warning'></span><span class='warning-text'></span></span>");
            warning.find('.warning-text').text(VCResources.AddPathDialogWarning);
            this._element.append(warning);
        }

        this.updateOkButton(!!this._model.initialPath);
    }

    public getTitle(): string {
        return VCResources.AddPathDialogTitle;
    }

    public onOkClick(e?: JQueryEventObject): any {
        this.updateOkButton(false);
        this.setDialogResult(<TaskTypes.ISelectedPathNode>{
            path: this._model.inputModel.path(),
            isFolder: this._model.inputModel.isFolder()
        });
        if (this._model.inputModel.path().trim() == "")
            this.close();
        super.onOkClick(e); // This calls the call back from the model
    }
}

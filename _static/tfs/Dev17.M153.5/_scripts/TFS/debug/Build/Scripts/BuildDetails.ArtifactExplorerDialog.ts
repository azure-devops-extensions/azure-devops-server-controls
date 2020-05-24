/// <reference types="jquery" />

import ko = require("knockout");

import { BuildClientService } from "Build.Common/Scripts/ClientServices";
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import { DedupFileContainerItem } from "Build/Scripts/BuildDetails.DedupArtifact";
import XamlBuildControls = require("Build/Scripts/Controls.Xaml");

import KoTree = require("DistributedTasksCommon/TFS.Knockout.Tree");
import { KnockoutTreeNode } from "DistributedTasksCommon/TFS.Knockout.Tree.TreeView"

import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Events_Action = require("VSS/Events/Action");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import FileContainer = require("VSS/FileContainer/Contracts");
import Menus = require("VSS/Controls/Menus");
import { getCollectionService } from "VSS/Service";
import Utils_Clipboard = require("VSS/Utils/Clipboard");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");

var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;

export enum ArtifactsExplorerDialogSubtype {
    /** Artifacts are backed by File Container service. */
    Container,
    /** Artifacts are backed by Dedup Store service. */
    Dedup
}

export class TreeViewModel extends KoTree.TreeViewModel {
    private buildId?: number;
    private projectId?: string;
    private artifactId?: string;
    private artifactName: string;
    private subtype: ArtifactsExplorerDialogSubtype;
    private service: BuildClientService;

    constructor(subtype: ArtifactsExplorerDialogSubtype = ArtifactsExplorerDialogSubtype.Container, artifactName: string, buildId?: number, projectId?: string, artifactId?: string) {
        super();
        this.subtype = subtype;
        this.buildId = buildId;
        this.projectId = projectId;
        this.artifactId = artifactId;
        this.artifactName = artifactName;
    }

    public getMenuOptions = (node: KnockoutTreeNode): Menus.MenuOptions => {
        let items: Menus.IMenuItemSpec[] = [];
        let data = node.tag as ArtifactFileTreeNode;
        let item = data.value.peek();

        if (item) {
            if (data.isFolder.peek()) { // It's a folder
                if (this.subtype == ArtifactsExplorerDialogSubtype.Container) {
                    items.push({
                        id: "download-as-zip",
                        text: BuildResources.ArtifactsDownloadAsZipText,
                        title: BuildResources.ArtifactsDownloadAsZipText,
                        icon: "icon-download-package",
                        showText: true,
                        setTitleOnlyOnOverflow: true,
                        action: () => {
                            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                                url: item.contentLocation + "&$format=zip",
                                target: "_self"
                            });
                        }
                    });
                    items.push({
                        id: "copy-download-url",
                        text: BuildResources.ArtifactsCopyDownloadUrlText,
                        title: BuildResources.ArtifactsCopyDownloadUrlText,
                        setTitleOnlyOnOverflow: true,
                        icon: "bowtie-icon bowtie-edit-copy",
                        showText: true,
                        action: () => {
                            Utils_Clipboard.copyToClipboard(item.contentLocation + "&$format=zip");
                        }
                    });
                }
                else if (this.subtype == ArtifactsExplorerDialogSubtype.Dedup && FeatureAvailabilityService.isFeatureEnabled("Artifact.Features.ArtifactContent")) {
                    items.push({
                        id: "download-as-zip",
                        text: BuildResources.ArtifactsDownloadAsZipText,
                        title: BuildResources.ArtifactsDownloadAsZipText,
                        icon: "icon-download-package",
                        showText: true,
                        setTitleOnlyOnOverflow: true,
                        action: () => {
                            let ditem: DedupFileContainerItem = <DedupFileContainerItem>item;
                            if (this.service == null) {
                                this.service = getCollectionService(BuildClientService);
                            }
                            let dirPath: string = ditem.getFullPath();
                            if (dirPath != null && this.buildId != null) {
                                this.service.getPipelineArtifactDirectoryUri(
                                    this.projectId, <number>this.buildId, this.artifactName, dirPath, this.artifactId)
                                    .then(url => {
                                        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                                            url: url,
                                            target: "_blank"
                                        });
                                    })
                            }
                        }
                    });
                    items.push({
                        id: "copy-download-url",
                        text: BuildResources.ArtifactsCopyDownloadUrlText,
                        title: BuildResources.ArtifactsCopyDownloadUrlText,
                        setTitleOnlyOnOverflow: true,
                        icon: "bowtie-icon bowtie-edit-copy",
                        showText: true,
                        action: () => {
                            let ditem: DedupFileContainerItem = <DedupFileContainerItem>item;
                            if (this.service == null) {
                                this.service = getCollectionService(BuildClientService);
                            }
 
                            let dirPath: string = ditem.getFullPath();
                            if (dirPath != null && this.buildId != null) {
                                this.service.getPipelineArtifactDirectoryUri(
                                    this.projectId, <number>this.buildId, this.artifactName, dirPath, this.artifactId)
                                    .then(url => {
                                        Utils_Clipboard.copyToClipboard(url);
                                    })
                            }
                        }
                    });
                }
            }
            else { // It's a file
                items.push({
                    id: "download-as-zip",
                    text: BuildResources.ArtifactsDownloadText,
                    title: BuildResources.ArtifactsDownloadText,
                    setTitleOnlyOnOverflow: true,
                    icon: "icon-download-package",
                    showText: true,
                    action: () => {
                        if (this.subtype == ArtifactsExplorerDialogSubtype.Container) {
                            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                                url: item.contentLocation,
                                target: "_self"
                            });
                        }
                        else if (this.subtype == ArtifactsExplorerDialogSubtype.Dedup) {
                            let ditem: DedupFileContainerItem = <DedupFileContainerItem>item;
                            if (this.service == null) {
                                this.service = getCollectionService(BuildClientService);
                            }

                            let fileName: string = ditem.getFileName();
                            if (fileName != null) {
                                this.service.getPipelineArtifactFileUri(
                                    this.projectId, this.buildId, this.artifactName, fileName, ditem.dedupId)
                                .then(url => {
                                    Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                                        url: url,
                                        target: "_self"
                                    });
                                })
                            }
                        }
                    }
                });
                items.push({
                    id: "copy-download-url",
                    text: BuildResources.ArtifactsCopyDownloadUrlText,
                    title: BuildResources.ArtifactsCopyDownloadUrlText,
                    setTitleOnlyOnOverflow: true,
                    icon: "bowtie-icon bowtie-edit-copy",
                    showText: true,
                    action: () => {
                        if (this.subtype == ArtifactsExplorerDialogSubtype.Container) {
                            Utils_Clipboard.copyToClipboard(item.contentLocation);
                        }
                        else if (this.subtype == ArtifactsExplorerDialogSubtype.Dedup) {
                            let ditem: DedupFileContainerItem = <DedupFileContainerItem>item;
                            if (this.service == null) {
                                this.service = getCollectionService(BuildClientService);
                            }

                            let fileName: string = ditem.getFileName();
                            if (fileName != null) {
                                let url = this.service.getPipelineArtifactFileUri(this.projectId, this.buildId, this.artifactName, fileName, ditem.dedupId);
                                url.then(urlString => {
                                    Utils_Clipboard.copyToClipboard(urlString);
                                })
                            }
                        }
                    }
                });
            }
        }

        return {
            items: items
        };
    }
}

export class ArtifactsExplorerDialogModel extends XamlBuildControls.ModalViewModel {
    public dialogTemplate: string = "artifacts_explorer_dialog";
    public dropName: string;
    public buildId?: number;
    public projectId?: string;
    public artifactId?: string;
    public fileTree: TreeViewModel;
    public subtype: ArtifactsExplorerDialogSubtype;
    public items: FileContainer.FileContainerItem[];

    /** The subtype is defaulted to ArtifactsExplorerDialogSubtype.Container */
    constructor(
        items: FileContainer.FileContainerItem[],
        name: string,
        buildId?: number,
        projectId?: string,
        artifactId?: string,
        subtype: ArtifactsExplorerDialogSubtype = ArtifactsExplorerDialogSubtype.Container) {
        super();
        this.dropName = name;
        this.items = items;
        this.buildId = buildId;
        this.projectId = projectId;
        this.artifactId = artifactId;
        this.subtype = subtype;
    }
}

/**
 * A basic node representing a file
 */
export class ArtifactFileTreeNode extends KoTree.BaseTreeNode implements KoTree.ITreeNode {
    /**
     * The unique Id for this node
     * We use this to trigger popup contextual menu, though newGuid doesn't guarantee absolute uniqueness, for the scope of current artifact explorer it should be okay
     * Since this Id used to find element in DOM, we can't use any existing FileContainerItem unique property as Id, hence using new Guid instead.
     */
    public id: KnockoutObservable<string> = ko.observable("id" + GUIDUtils.newGuid());

    /**
     * The definition represented by this node
     */
    public value: KnockoutObservable<FileContainer.FileContainerItem> = ko.observable(null);

    /**
     * The text to display
     */
    public text: KnockoutComputed<string>;

    /**
     * Whether to show an icon for the node
     */
    public showIcon: KnockoutObservable<boolean> = ko.observable(true);

    /**
     * The CSS class for the icon
     */
    public nodeIconCssClass: KnockoutObservable<string> = ko.observable("file");

    /**
     * Indicates whether the model is dirty
     */
    public dirty: KnockoutComputed<boolean>;

    /**
     * The CSS class for the node
     */
    public cssClass: KnockoutObservable<string> = ko.observable("node-link");

    constructor(nodes?: any) {
        super(nodes);

        // nothing is editable
        this.dirty = ko.computed({
            read: () => {
                return false;
            }
        });

        // text is file/folder without parenting folders
        this.text = ko.computed({
            read: () => {
                const item = this.value();
                if (item) {
                    var path = item.path;
                    return path.substring(path.lastIndexOf("/") + 1);
                }

                return "";
            }
        });
    }

    /**
     * Called when the context menu for the node is clicked
     * @param target The node
     * @param args Event args
     */
    public _onContextMenuClick(target: KoTree.ITreeNode, args: JQueryEventObject) {
        this.root()._onContextMenuClick(this, args, this.value());
    }
}

/**
 * A tree section node that represents a folder
 */
export class ArtifactFolderTreeNode extends ArtifactFileTreeNode implements KoTree.ITreeSection<ArtifactFileTreeNode> {

    /**
     * The CSS class for the icon
     */
    public nodeIconCssClass: KnockoutObservable<string> = ko.observable("folder");

    /**
     * A node used as the child-item placeholder of a directory pending on loading. Without putting
     * any node under a directory the tree node will be rendered without an expand icon.
     */
    private static DUMMY_NODE: ArtifactFileTreeNode = new ArtifactFileTreeNode();

    /**
     * The items under this node pending on loading. When the node is expanded, these items will be 
     * parsed and placed into the node DOM.
     */
    private _fcitems: FileContainer.FileContainerItem[];

    constructor(lazy: boolean, nodes?: any) {
        super(nodes);

        // If lazy, initialize the unparsed items array
        this._fcitems = lazy ? [] : null;

        // override isFolder calculation
        this.isFolder = ko.computed({
            read: () => {
                return true;
            }
        });
    }

    /**
     * Expands or collapses the node
     * @param newValue True to expand, false to collapse
     */
    public setExpanded(newValue: boolean) {
        this.expanded(newValue);
    }

    /**
     * Adds a node to the section
     * @param node The node to add
     * @param unshift If yes, it makes the node first element. Otherwise
     * node is added to the end.
     */
    public add(node: ArtifactFolderTreeNode, unshift: boolean = false) {
        if (unshift) {
            this.nodes.unshift(node);
        } else {
            this.nodes.push(node);
        }
    }

    /**
     * Sets the list of nodes in the section
     * @param nodes The new list of nodes
     */
    public setNodes(nodes: ArtifactFolderTreeNode[]) {
        this.nodes(nodes);
    }

    /**
     * Add a file container item under this node.
     * @param item
     */
    public addRawItem(item: FileContainer.FileContainerItem): void {
        this._fcitems.push(item);
    }

    /*
     * Set this so eo enable expanding of the folder even if at this moment we don't have any sub-items yet.
     */
    public setUnparsed(): void {
        if (this.nodes().length == 0) {
            this.nodes.push(ArtifactFolderTreeNode.DUMMY_NODE);
        }
    }

    public onItemToggle = (): boolean => {
        return this._onExpanding();
    }

    private _onExpanding(): boolean {
        if (this._fcitems !== null) {
            // This is the first time we load this folder. Populate the items directly under this folder.
            this.nodes.removeAll();

            if (this._fcitems.length > 0) {
                var folderCache: { [id: string]: ArtifactFolderTreeNode } = {};

                // put model items into file tree
                this._fcitems.forEach((item, index) => {
                    // split path into parts
                    var parent = this.value().path;
                    var child = item.path.substring(parent.length + 1); // +1 to skip '/'
                    var pathParts = child.split("/");

                    // create top-level node
                    if (pathParts.length == 1) {
                        var node;
                        if (item.itemType === FileContainer.ContainerItemType.Folder) {
                            node = new ArtifactFolderTreeNode(true);
                            var folderId = pathParts.join("/");
                            folderCache[folderId] = node;
                        }
                        else {
                            node = new ArtifactFileTreeNode();
                        }
                        node.value(item);

                        this.nodes.push(node);
                    }
                });

                // in the second run, store sub-items under each folder's node
                this._fcitems.forEach((item, index) => {
                    // split path into parts
                    var parent = this.value().path;
                    var child = item.path.substring(parent.length + 1); // +1 to skip '/'
                    var pathParts = child.split("/");

                    // stash items at deeper level under their parent nodes
                    if (pathParts.length > 1) {
                        var node: ArtifactFolderTreeNode = folderCache[pathParts[0]];
                        node.addRawItem(item);
                        node.setUnparsed();
                    }
                });

                this.nodes().sort(_sort);
            }

            this._fcitems = null;

            return true;
        }
        else {
            return false;
        }
    }
}

// show with ControlsCommon.Dialog.show(ArtifactsExplorerDialog, model)
export class ArtifactsExplorerDialog extends Dialogs.ModalDialog {
    public _model: ArtifactsExplorerDialogModel;
    private _$template: JQuery;
    private _subtype: ArtifactsExplorerDialogSubtype;

    /**
     * The file tree
     */
    public fileTree: TreeViewModel;

    constructor(model: ArtifactsExplorerDialogModel) {
        super(model);
        super.initializeOptions($.extend({
            buttons: {
                "close": {
                    id: "close",
                    text: VSS_Resources_Platform.CloseButtonLabelText,
                    click: delegate(this, this._close),
                }
            }
        }, model));
        model.fileTree = this.fileTree = new TreeViewModel(
            this._subtype = model.subtype,
            model.dropName,
            model.buildId,
            model.projectId,
            model.artifactId);
        this._model = model;
    }

    public initializeOptions(options?: ArtifactsExplorerDialogModel) {
        super.initializeOptions($.extend({
        }, options));
    }

    public initialize() {
        super.initialize();
        this.populateFileTree();

        this._$template = TFS_Knockout.loadHtmlTemplate(this._model.dialogTemplate);
        this._element.append(this._$template);
        ko.applyBindings(this._model, this._$template[0]);
    }

    public getTitle(): string {
        return BuildResources.ArtifactsExplorerTitle;
    }

    public populateFileTree() {
        switch (this._subtype) {
        case ArtifactsExplorerDialogSubtype.Dedup:
            this.populateDedupFileTree();
            break;
        case ArtifactsExplorerDialogSubtype.Container:
            this.populateContainerFileTree();
            break;
        }
    }

    // In this approach, build the tree DOM on demand. In particular, during initialization only build the first level.
    // Clicking on expand icon of a directory will trigger tree building at the immediate sub-level. 
    private populateDedupFileTree() {
        var folderCache: { [id: string]: ArtifactFolderTreeNode } = {};
        var dropNameSegments: string[] = null;
        var dropNameReplacements: string[] = null;

        // \ chars should be handled in drop name, as well as all combinations of / and \
        if (this._model.dropName.indexOf("\\") >= 0) {
            var dropNameSegments: string[] = this._model.dropName.split('/');
            dropNameReplacements = [];
            dropNameSegments.forEach((segment, index, array) => {
                dropNameReplacements.push(segment.replace(/\\/gi, "/"));
            });
        }

        // put model items into file tree
        this._model.items.forEach((item, index) => {
            // if the drop name has a \ in it, replace the drop name
            if (dropNameReplacements) {
                dropNameReplacements.forEach((segment, index, array) => {
                    item.path = item.path.replace(segment, dropNameSegments[index]);
                });
            }

            // split path into parts
            var pathParts = item.path.split("/");

            // create top-level node
            if (pathParts.length == 1) {
                var node;
                if (item.itemType === FileContainer.ContainerItemType.Folder) {
                    node = new ArtifactFolderTreeNode(true);
                    var folderId = pathParts.join("/");
                    folderCache[folderId] = node;
                }
                else {
                    node = new ArtifactFileTreeNode();
                }
                node.value(item);

                // top-level node
                this.fileTree.nodes.push(node);
            }
        });

        // in the second run, store sub-items under each folder's node
        this._model.items.forEach((item, index) => {
            // split path into parts
            var pathParts = item.path.split("/");

            // create top-level node
            if (pathParts.length > 1) {
                var node: ArtifactFolderTreeNode = folderCache[pathParts[0]];
                node.addRawItem(item);
                node.setUnparsed();
            }
        });

        this.fileTree.nodes().sort(_sort);
    }

    // In this approach, build the whole tree DOM upfront
    private populateContainerFileTree() {
        var folderCacheIds: string[] = [];
        var folderCache: { [id: string]: ArtifactFolderTreeNode } = {};
        var dropNameSegments: string[] = null;
        var dropNameReplacements: string[] = null;

        // \ chars should be handled in drop name, as well as all combinations of / and \
        if (this._model.dropName.indexOf("\\") >= 0) {
            var dropNameSegments: string[] = this._model.dropName.split('/');
            dropNameReplacements = [];
            dropNameSegments.forEach((segment, index, array) => {
                dropNameReplacements.push(segment.replace(/\\/gi, "/"));
            });
        }

        // put model items into file tree
        this._model.items.forEach((item, index) => {
            // if the drop name has a \ in it, replace the drop name
            if (dropNameReplacements) {
                dropNameReplacements.forEach((segment, index, array) => {
                    item.path = item.path.replace(segment, dropNameSegments[index]);
                });
            }

            // split path into parts
            var pathParts = item.path.split("/");

            // create node
            var node;
            if (item.itemType === FileContainer.ContainerItemType.Folder) {
                node = new ArtifactFolderTreeNode(false);
                var folderId = pathParts.join("/").toLowerCase();
                folderCache[folderId] = node;
                folderCacheIds.push(folderId);
            }
            else {
                node = new ArtifactFileTreeNode();
            }
            node.value(item);

            if (pathParts.length == 1) {
                // top-level node
                this.fileTree.nodes.push(node);
            }
            else {
                var dirs = pathParts.slice(0, pathParts.length - 1);
                var folderToInsertUnder: ArtifactFolderTreeNode = folderCache[dirs.join("/").toLowerCase()];
                folderToInsertUnder.nodes.push(node);
            }
        });

        this.fileTree.nodes().sort(_sort);

        folderCacheIds.forEach((id: string, index) => {
            folderCache[id].nodes().sort(_sort);
        });
    }

    private _close() {
        this.close();
        this.dispose();
    }
}

function _sort(a: ArtifactFileTreeNode, b: ArtifactFileTreeNode): number {
    // folders should all come before files
    if (a.isFolder() && !b.isFolder()) {
        return -1;
    }
    else if (!a.isFolder() && b.isFolder()) {
        return 1;
    }

    return Utils_String.localeIgnoreCaseComparer(a.value().path, b.value().path);
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Controls.ArtifactsExplorerDialog", exports);

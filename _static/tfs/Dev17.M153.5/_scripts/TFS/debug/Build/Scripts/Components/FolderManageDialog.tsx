/// <reference types="jquery" />
/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { IFolderActionCompletedPayload, IMessage, folderActionCompleted } from "Build/Scripts/Actions/FolderActions";
import { BuildTreeView, BuildTreeNode } from "Build/Scripts/Components/BuildTreeView";
import { CreateFolderDialog } from "Build/Scripts/Components/CreateFolderDialog";
import { DeleteFolderDialog } from "Build/Scripts/Components/DeleteFolderDialog";
import { RenameFolderDialog } from "Build/Scripts/Components/RenameFolderDialog";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { getFolderManageDialogStore, FolderManageDialogStore } from "Build/Scripts/Stores/FolderManageDialog";

import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { DefaultButton } from "OfficeFabric/components/Button/DefaultButton/DefaultButton";
import { PrimaryButton } from "OfficeFabric/components/Button/PrimaryButton/PrimaryButton";
import { CommandBar } from "OfficeFabric/CommandBar";
import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import { MessageBar } from "OfficeFabric/MessageBar";
import { BaseComponent, IBaseProps } from "OfficeFabric/Utilities";

import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { Folder } from "TFS/Build/Contracts";

import { registerLWPComponent } from "VSS/LWP";
import * as VSS_Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import { arrayEquals } from "VSS/Utils/Array";
import { format } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!Build/FolderManageDialog";

var RootPath = "\\";

export interface IFolderManageDialogResult {
    path: string;
}

interface IFolderTag {
    path: string;
}

export interface IFolderManageDialogState {
    showDialog: boolean;
    folders: Folder[];
    isRootPath: boolean;
    defaultPath: string;
    message?: IMessage;
}

export interface IFolderManageDialogProps extends IBaseProps {
    title: string;
    okManageDialogCallBack?: (result: IFolderManageDialogResult) => void;
    onManageDialogDissmiss?: () => void;
    showDialogActions?: boolean;
    defaultPath?: string;
    showDialog: boolean;
}

export class FolderManageDialog extends BaseComponent<IFolderManageDialogProps, IFolderManageDialogState> {
    public static componentType = "ci-folder-manage-dialog";

    private _showDialog: boolean = false;
    private _defaultPath: string = "";
    private _selectedPath: string = "";
    private _message: IMessage = null;

    private _commandBar: CommandBar = null;
    private _dialogElement: HTMLElement = null;
    private _folderManageDialogStore: FolderManageDialogStore;

    constructor(props: IFolderManageDialogProps) {
        super(props);
        this._folderManageDialogStore = getFolderManageDialogStore();
        this._showDialog = props.showDialog;
        this._selectedPath = props.defaultPath;
        this._defaultPath = props.defaultPath;
        this.state = this._getState();
    }

    public render(): JSX.Element {
        let nodes = getBuildTreeNodesFromDefinitionFolders(this.state.folders);
        return <Dialog
            hidden={!this.state.showDialog}
            onDismiss={this._onDismiss}
            closeButtonAriaLabel={BuildResources.CloseButtonText}
            dialogContentProps={{
                className: "folder-manage-dialog-content",
                type: DialogType.close,
                title: this.props.title
            }}
            modalProps={{
                className: "folder-manage-dialog bowtie-fabric"
            }}>
            {
                this.state.message &&
                <MessageBar
                    className="message-bar"
                    messageBarType={this.state.message.type}
                    onDismiss={this._onMessageDismiss}>
                    {this.state.message.content}
                </MessageBar>
            }
            {
                this.props.showDialogActions &&
                <CommandBar
                    ref={this._resolveRef('_commandBar')}
                    isSearchBoxVisible={false}
                    items={this._getCommandBarItems()} />
            }
            <BuildTreeView
                nodes={nodes}
                defaultPath={this.state.defaultPath}
                selectionChangedCallBack={this._onBuildTreeNodeSelected}
            />
            <span ref={this._resolveRef('_dialogElement')} />
            <DialogFooter>
                {
                    (this.props.okManageDialogCallBack) ?
                        <PrimaryButton onClick={this._onOkClick}>{VSS_Resources_Platform.ModalDialogOkButton}</PrimaryButton> : null
                }
                <DefaultButton onClick={this._onDismiss}>{VSS_Resources_Platform.CloseButtonLabelText}</DefaultButton>
            </DialogFooter>
        </Dialog>;
    }

    public componentDidMount() {
        this._folderManageDialogStore.addChangedListener(this._updateState);
        folderActionCompleted.addListener(this._folderActionCompletedListener);
    }

    public componentWillUnmount() {
        // unmount
        if (this._dialogElement) {
            ReactDOM.unmountComponentAtNode(this._dialogElement);
        }

        this._folderManageDialogStore.removeChangedListener(this._updateState);
        folderActionCompleted.removeListener(this._folderActionCompletedListener);
    }

    public componentWillReceiveProps(newProps: IFolderManageDialogProps) {
        this._showDialog = newProps.showDialog;
        this._updateState();
    }

    public shouldComponentUpdate(nextProps: IFolderManageDialogProps, nextState: IFolderManageDialogState) {
        return this.props.showDialog != nextProps.showDialog
            || this.state.showDialog != nextState.showDialog
            || this.state.isRootPath != nextState.isRootPath
            || this.state.message != nextState.message
            || this.state.defaultPath != nextState.defaultPath
            || !arrayEquals(this.state.folders, nextState.folders, (a, b) => { return a.path === b.path });
    }

    private _folderActionCompletedListener = (payload: IFolderActionCompletedPayload) => {
        this._message = payload.message;
        if (payload.defaultPath) {
            this._defaultPath = payload.defaultPath;
        }

        this._updateState();
    }

    private _getCommandBarItems(): IContextualMenuItem[] {
        let items: IContextualMenuItem[] = [];

        items.push({
            iconProps: { className: "bowtie-icon bowtie-math-plus-box-light" },
            name: BuildResources.CreateNewFolderText,
            key: "CreateNewFolder",
            title: BuildResources.CreateNewFolderText,
            onClick: () => {
                ReactDOM.render(<CreateFolderDialog showDialog={true} path={this._selectedPath} okDisabled={true} onDismissed={this._onDialogFromCommandBarDismissed} />, this._dialogElement);
            }
        });

        if (!this.state.isRootPath) {
            items.push({
                iconProps: { className: "bowtie-icon bowtie-trash" },
                name: BuildResources.DeleteFolderText,
                key: "DeleteFolder",
                title: BuildResources.DeleteFolderText,
                onClick: () => {
                    ReactDOM.render(<DeleteFolderDialog showDialog={true} path={this._selectedPath} okDisabled={true} onDismissed={this._onDialogFromCommandBarDismissed} />, this._dialogElement);
                }
            });

            items.push({
                iconProps: { className: "bowtie-icon bowtie-edit-rename" },
                name: BuildResources.RenameFolderText,
                key: "RenameFolder",
                title: BuildResources.RenameFolderText,
                onClick: () => {
                    ReactDOM.render(<RenameFolderDialog showDialog={true} path={this._selectedPath} okDisabled={true} onDismissed={this._onDialogFromCommandBarDismissed} />, this._dialogElement);
                }
            });
        }

        return items;
    }

    private _onDialogFromCommandBarDismissed = () => {
        // workaround for https://github.com/OfficeDev/office-ui-fabric-react/issues/1515, refocusing...
        // this triggers focus on focusZone which tracks the current active element, so correct button will get focus
        this._commandBar && this._commandBar.focus();
    }

    private _onDismiss = () => {
        if (this.props.onManageDialogDissmiss) {
            this.props.onManageDialogDissmiss();
        }

        this._showDialog = false;
        this._updateState();
    };

    private _onOkClick = () => {
        if (this.props.okManageDialogCallBack) {
            this.props.okManageDialogCallBack({
                path: this._selectedPath
            });
        }

        this._onDismiss();
    };

    private _onMessageDismiss = () => {
        this._message = null;
        this._updateState();
    };

    private _updateState = () => {
        this.setState(this._getState());
    }

    private _onBuildTreeNodeSelected = (node: BuildTreeNode) => {
        if (node && node.tag) {
            let tag = node.tag as IFolderTag;
            this._selectedPath = tag.path;
            this._updateState();
        }
    }

    private _getState(): IFolderManageDialogState {
        return {
            showDialog: this._showDialog,
            folders: this._folderManageDialogStore.getFolders(),
            isRootPath: this._selectedPath === RootPath,
            message: this._message,
            defaultPath: this._defaultPath
        };
    }
}

export function getBuildTreeNodesFromDefinitionFolders(definitionFolders: Folder[], sortDesc: boolean = false): BuildTreeNode[] {
    let pathToNodeMap: IDictionaryStringTo<BuildTreeNode> = {};
    let folderIcon = "bowtie-icon bowtie-folder";
    (definitionFolders || []).forEach((definitionFolder) => {
        let path = definitionFolder.path;
        // ensure that we are dealing with path that ends with "\\" at the end
        if (path.lastIndexOf(RootPath) != path.length - 1) {
            path = path + RootPath;
        }

        let parsedPath = RootPath;
        path.split(RootPath).forEach((name) => {
            if (name && name.trim().length > 0) {
                // Id of a tree node as Id for HTML element, so it shouldn't have invalid characters that are not allowed for HTML Id
                //  use newGuid instead so that we can get over it, HTML 4 won't like if ID starts with a number, to be safe just add a string
                let treeNode = new BuildTreeNode("folder" + GUIDUtils.newGuid(), name);
                treeNode.icon = folderIcon;
                let currentpath = parsedPath + name + RootPath;
                treeNode.tag = {
                    path: parsedPath + name
                } as IFolderTag;
                if (!pathToNodeMap[currentpath.toLocaleLowerCase()]) {
                    pathToNodeMap[currentpath.toLocaleLowerCase()] = treeNode;
                    if (parsedPath !== RootPath) {
                        // Grab the parent node and add myself as a child
                        pathToNodeMap[parsedPath.toLocaleLowerCase()].add(treeNode);
                    }
                }
                parsedPath = parsedPath + name + RootPath;
            }
        });
    });

    let nodes: BuildTreeNode[] = [];
    $.map(pathToNodeMap, (value: BuildTreeNode, index: string) => {
        // since we already populated children as needed, we just need to grab nodes at level1
        if (index && index.split(RootPath).length === 3) {
            nodes.push(value);
        }
    });

    // add root node by default
    let tfsContext = TfsContext.getDefault();
    let rootNode = new BuildTreeNode("projectRootNode", format(BuildResources.DefaultProjectFolderName, tfsContext.navigation.project));
    rootNode.tag = {
        path: RootPath
    } as IFolderTag;
    rootNode.icon = folderIcon + " build-root-folder";
    rootNode.addRange(nodes);

    return [rootNode];
}

registerLWPComponent(FolderManageDialog.componentType, FolderManageDialog);

import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { BuildTreeView, BuildTreeNode } from "CIWorkflow/Scripts/Scenarios/Definition/Components/BuildTreeView";
import { FolderManageDialogStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/FolderManageDialogStore";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";

import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { Folder } from "TFS/Build/Contracts";

import * as VSS_Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import { arrayEquals } from "VSS/Utils/Array";
import { format } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/FolderManageDialog";

let RootPath = "\\";

interface IFolderTag {
    path: string;
}

export interface IFolderManageDialogResult {
    path: string;
}

export interface IFolderManageDialogState {
    showDialog: boolean;
    folders: Folder[];
    isRootPath: boolean;
}

export interface IFolderManageDialogProps {
    title: string;
    okManageDialogCallBack?: (result: IFolderManageDialogResult) => void;
    onManageDialogDissmiss?: () => void;
    showDialogActions?: boolean;
    defaultPath?: string;
    showDialog: boolean;
}

export class FolderManageDialog extends React.Component<IFolderManageDialogProps, IFolderManageDialogState> {
    private _showDialog: boolean = false;
    private _selectedPath: string = "";

    private _dialogElement: HTMLElement = null;
    private _folderManageDialogStore: FolderManageDialogStore;

    constructor(props: IFolderManageDialogProps) {
        super(props);
        this._folderManageDialogStore = StoreManager.GetStore<FolderManageDialogStore>(FolderManageDialogStore);
        this._showDialog = props.showDialog;
        this._selectedPath = props.defaultPath;
        this.state = this._getState();
    }

    public render(): JSX.Element {
        let nodes = getBuildTreeNodesFromDefinitionFolders(this.state.folders);
        return <Dialog
            hidden={!this.state.showDialog}
            dialogContentProps={{
                type: DialogType.close,
                className: "folder-manage-dialog-content"
            }}
            modalProps={{
                className: "folder-manage-dialog bowtie-fabric",
                containerClassName: "folder-manage-dialog-container"
            }}
            onDismiss={this._onDismiss}
            title={this.props.title}
            forceFocusInsideTrap={false}
            closeButtonAriaLabel={DTCResources.CloseButtonText} >
            <BuildTreeView
                nodes={nodes}
                defaultPath={this.props.defaultPath}
                selectionChangedCallBack={this._onBuildTreeNodeSelected}
            />
            <span ref={(element) => this._dialogElement = element} />
            <DialogFooter>
                {
                    (this.props.okManageDialogCallBack) ?
                        <PrimaryButton
                            onClick={this._onOkClick}
                            ariaLabel={VSS_Resources_Platform.ModalDialogOkButton}>
                            {VSS_Resources_Platform.ModalDialogOkButton}
                        </PrimaryButton> : null
                }
                <DefaultButton onClick={this._onDismiss} ariaLabel={VSS_Resources_Platform.CloseButtonLabelText}>
                    {VSS_Resources_Platform.CloseButtonLabelText}
                </DefaultButton>
            </DialogFooter>
        </Dialog>;
    }

    public componentDidMount() {
        this._folderManageDialogStore.addChangedListener(this._updateState);
    }

    public componentWillUnmount() {
        // unmount
        if (this._dialogElement) {
            ReactDOM.unmountComponentAtNode(this._dialogElement);
        }

        this._folderManageDialogStore.removeChangedListener(this._updateState);
    }

    public componentWillReceiveProps(newProps: IFolderManageDialogProps) {
        this._showDialog = newProps.showDialog;
        this._updateState();
    }

    public shouldComponentUpdate(nextProps: IFolderManageDialogProps, nextState: IFolderManageDialogState) {
        return this.props.showDialog !== nextProps.showDialog
            || this.state.showDialog !== nextState.showDialog
            || this.state.isRootPath !== nextState.isRootPath
            || !arrayEquals(this.state.folders, nextState.folders, (a, b) => { return a.path === b.path; });
    }

    private _onDismiss = () => {
        if (this.props.onManageDialogDissmiss) {
            this.props.onManageDialogDissmiss();
        }

        this._showDialog = false;
        this._updateState();
    }

    private _onOkClick = () => {
        if (this.props.okManageDialogCallBack) {
            this.props.okManageDialogCallBack({
                path: this._selectedPath
            });
        }

        this._onDismiss();
    }

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
            isRootPath: this._selectedPath === RootPath
        };
    }
}

export function getBuildTreeNodesFromDefinitionFolders(definitionFolders: Folder[], sortDesc: boolean = false): BuildTreeNode[] {
    let pathToNodeMap: IDictionaryStringTo<BuildTreeNode> = {};
    let folderIcon = "bowtie-icon bowtie-folder";
    (definitionFolders || []).forEach((definitionFolder) => {
        let path = definitionFolder.path;
        // ensure that we are dealing with path that ends with "\\" at the end
        if (path.lastIndexOf("\\") !== path.length - 1) {
            path = path + "\\";
        }
        let parsedPath = "\\";
        path.split("\\").forEach((name) => {
            if (name && name.trim().length > 0) {
                // Id of a tree node as Id for HTML element, so it shouldn't have invalid characters that are not allowed for HTML Id
                //  use newGuid instead so that we can get over it, HTML 4 won't like if ID starts with a number, to be safe just add a string
                let treeNode = new BuildTreeNode("folder" + GUIDUtils.newGuid(), name);
                treeNode.icon = folderIcon;
                let currentpath = parsedPath + name + "\\";
                treeNode.tag = {
                    path: parsedPath + name
                } as IFolderTag;
                if (!pathToNodeMap[currentpath]) {
                    pathToNodeMap[currentpath] = treeNode;
                    if (parsedPath !== "\\") {
                        // Grab the parent node and add myself as a child
                        pathToNodeMap[parsedPath].add(treeNode);
                    }
                }
                parsedPath = parsedPath + name + "\\";
            }
        });
    });

    let nodes: BuildTreeNode[] = [];
    for (let key in pathToNodeMap) {
        if (pathToNodeMap.hasOwnProperty(key)) {
            let value: BuildTreeNode = pathToNodeMap[key];

            // since we already populated children as needed, we just need to grab nodes at level1
            if (key && key.split("\\").length === 3) {
                nodes.push(value);
            }
        }
    }

    // add root node by default
    let tfsContext = TfsContext.getDefault();
    let rootNode = new BuildTreeNode("projectRootNode", format(Resources.DefaultProjectFolderName, tfsContext.navigation.project));
    rootNode.tag = {
        path: "\\"
    } as IFolderTag;
    rootNode.icon = folderIcon + " build-root-folder";
    rootNode.addRange(nodes);

    return [rootNode];
}

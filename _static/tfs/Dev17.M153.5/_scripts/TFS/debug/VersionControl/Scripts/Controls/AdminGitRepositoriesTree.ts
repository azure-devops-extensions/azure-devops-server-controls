import VSS = require("VSS/VSS");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_UI = require("VSS/Utils/UI");
import TreeView = require("VSS/Controls/TreeView");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Dialogs = require("VSS/Controls/Dialogs");
import VCContracts = require("TFS/VersionControl/Contracts");
import VCCommon = require("VersionControl/Scripts/Generated/TFS.VersionControl.Common");
import { GitClientService } from "VersionControl/Scripts/GitClientService"
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext"
import VCGitRepositoryDialogs = require("VersionControl/Scripts/Controls/GitRepositoryDialogs");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { ClientGitRef } from "VersionControl/Scripts/ClientGitRef";
import { GitHttpClient } from "TFS/VersionControl/GitRestClient";

import delegate = Utils_Core.delegate;
import TfsContext = TFS_Host_TfsContext.TfsContext;

export interface GitRepositoriesAdminTreeNodeInfo {
    projectId: string;
    repositoryContext?: GitRepositoryContext;
    branch?: ClientGitRef;
    tagGroup?: boolean;
    branchGroup?: boolean;
    repoGroup?: boolean;
}

export interface GitRepositoriesAdminTreeOptions extends TreeView.ITreeOptions {
    projectId: string;
    projectName: string;
    showAllBranchesExperience: boolean;
    showAllTagsOption: boolean
    tfsContext: TFS_Host_TfsContext.TfsContext;
    repositoryContexts: GitRepositoryContext[];
}

export class GitRepositoriesAdminTree extends TreeView.TreeViewO<GitRepositoriesAdminTreeOptions> {

    private _repositories: GitRepositoryContext[];
    private _branchesByRepositoryId: { [repositoryId: string]: ClientGitRef[]; };
    private _projectId: string;
    private _projectName: string;
    private _gitClient: GitClientService;
    private _selectedRepositoryId: string;
    private _selectedBranchName: string;
    private _isAllTagGroupSelected: boolean;
    private _isBranchGroupSelected: boolean;
    private _isRepoGroupSelected: boolean;
    private _projectNode: TreeView.TreeNode;
    private _expandNextClick: boolean;
    private _showAllBranchesExperience: boolean;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "vc-git-repositories-tree",
            contextMenu: {
                executeAction: delegate(this, this._onMenuItemClick),
                "arguments": (contextInfo) => {
                    return {
                        node: contextInfo.item
                    };
                }
            },
            useBowtieStyle: true,
            onItemToggle: this._onItemToggle,
        }, options));

    }

    public initialize() {
        super.initialize();

        this._repositories = [];
        this._projectId = this._options.projectId;
        this._projectName = this._options.projectName;
        this._branchesByRepositoryId = {};
        this._gitClient = <GitClientService>TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<GitClientService>(GitClientService);
        this._expandNextClick = false;

        this._showAllBranchesExperience = this._options.showAllBranchesExperience;

        this._bind("selectionchanged", delegate(this, this._onSelectionChanged));

        if (this._options.repositoryContexts) {
            this._setRepositoryContexts(this._options.repositoryContexts);
        }
        else {
            this.refreshRepositories();
        }
    }

    /**
     *    When called, the next click on any node within this tree will expand 
     *    that node instead of toggling it, preventing the collapse of any 
     *    subtree for one click.
     */
    public expandNextClick() {
        this._expandNextClick = true;
    }

    private _onSelectionChanged(e: JQueryEventObject) {
        const selectedNodeInfo = this.getSelectedNodeInfo();
        if (selectedNodeInfo && selectedNodeInfo.repositoryContext) {
            this._selectedRepositoryId = selectedNodeInfo.repositoryContext.getRepositoryId();
            this._selectedBranchName = selectedNodeInfo.branch ? selectedNodeInfo.branch.friendlyName : null;
            this._isAllTagGroupSelected = selectedNodeInfo.tagGroup;
            this._isBranchGroupSelected = selectedNodeInfo.branchGroup;
            this._isRepoGroupSelected = selectedNodeInfo.repoGroup;
        }
        else {
            this._selectedRepositoryId = null;
            this._selectedBranchName = null;
            this._isAllTagGroupSelected = null;
            this._isBranchGroupSelected = null;
            this._isRepoGroupSelected = null;
        }
    }     

    private _onItemToggle(node: TreeView.TreeNode) : void {
        const nodeInfo = <GitRepositoriesAdminTreeNodeInfo>node.tag;
        if (nodeInfo.branchGroup && !node.expanded){
            this._ensureBranches(node);
        }
    }

    public onItemClick(node: TreeView.TreeNode, nodeElement: HTMLElement, e?: JQueryEventObject) {
        const nodeInfo = <GitRepositoriesAdminTreeNodeInfo>node.tag,
            selectedNodeInfo = this.getSelectedNodeInfo(),
            selectedRepository = selectedNodeInfo ? selectedNodeInfo.repositoryContext : null,
            selectedBranchName = (selectedNodeInfo && selectedNodeInfo.branch) ? selectedNodeInfo.branch.friendlyName : null,
            isAllTagGroupSelected = (selectedNodeInfo && selectedNodeInfo.tagGroup),
            isBranchGroupSelected = (selectedNodeInfo && selectedNodeInfo.branchGroup),
            isRepoGroupSelected = (selectedNodeInfo && selectedNodeInfo.repoGroup);
            
        if (this._showAllBranchesExperience) {
            if (node.folder && nodeInfo.repositoryContext && !this._expandNextClick) {
                
                if (nodeInfo.branchGroup){
                    this._ensureBranches(node);
                }

                // Toggle expand/collapse state, except don't collapse in the case of clicking on a different repository than before.
                if (!node.expanded || (nodeInfo.repositoryContext === selectedRepository)) {

                    if (nodeInfo.branch || nodeInfo.tagGroup || nodeInfo.branchGroup) {
                        if ((nodeInfo.branch && nodeInfo.branch.friendlyName === selectedBranchName) ||
                            (nodeInfo.tagGroup && nodeInfo.tagGroup === isAllTagGroupSelected) ||
                            nodeInfo.branchGroup && nodeInfo.branchGroup === isBranchGroupSelected) {
                            this._toggle(node, nodeElement);
                        }
                    }
                    else if (!selectedBranchName && !isAllTagGroupSelected){
                        this._toggle(node, nodeElement);
                    }
                }
            }

            if (this._expandNextClick) {
                this._expandNextClick = false;
                this._setNodeExpansion(node, $(nodeElement), true);
            }
        }

        return super.onItemClick(node, nodeElement, e);
    }

    private _ensureBranches(parentNode: TreeView.TreeNode) {
        const repository = parentNode.tag.repositoryContext.getRepository();

        if (!this._branchesByRepositoryId[repository.id]) {
            if (this._showAllBranchesExperience) {
                this._gitClient.beginGetGitBranches(repository, (branches: ClientGitRef[]) => {
                    this.onBranchesLoaded(parentNode, branches, repository);
                }, (error: any) => {
                    this.onBranchesLoadedError(error, repository);
                });
            }
            else {
                const getRefsFilter = VCCommon.GitWebApiConstants.HeadsFilter + "/" + this._selectedBranchName;
                this._gitClient.beginGetGitRefsBatch(
                    repository,
                    [getRefsFilter],
                    (branches: ClientGitRef[]) => {
                        this.onBranchesLoaded(parentNode, branches, repository);
                    },
                    (error: any) => {
                        this.onBranchesLoadedError(error, repository);
                    });
            }
        }
    }

    private onBranchesLoadedError(error: any, repository: VCContracts.GitRepository) {
        if (error.status == 403) {
            const repoNode = this._findNode(repository.id);
            repoNode.emptyFolderNodeText = VCResources.NoPermissionReadBranches;
        }
        else {
            VSS.handleError(error);
        }
    }

    private onBranchesLoaded(parentNode: TreeView.TreeNode, branches: ClientGitRef[], repository: VCContracts.GitRepository) {
        branches.sort((branch1: ClientGitRef, branch2: ClientGitRef) => {
            return Utils_String.localeIgnoreCaseComparer(branch1.friendlyName, branch2.friendlyName);
        });

        this._branchesByRepositoryId[repository.id] = branches;

        if (parentNode) {
            parentNode.clear();

            this._populateBranchNodes(parentNode, branches);
            this.updateNode(parentNode);

            if (this._selectedRepositoryId === repository.id && this._selectedBranchName) {
                this.setSelectedNode(this._findNode(this._selectedRepositoryId, this._selectedBranchName));
            }
        }
    }

    private _populateRepositoryChildrenNodes(repositoryNode: TreeView.TreeNode, branches: ClientGitRef[]): void {

        this._populateTagNode(repositoryNode);
        const branchParentNode = this._populateBranchGroupNode(repositoryNode);
        if (branches) {
            this._populateBranchNodes(branchParentNode, branches);
        }
    }

    private _populateBranchNodes(parentNode: TreeView.TreeNode, branches: ClientGitRef[]) {

        $.each(branches, (i: number, branch: ClientGitRef) => {
            const childNode = this._createBranchNode(this._projectId, parentNode.tag.repositoryContext, branch);
            parentNode.add(childNode);
        });
       
        parentNode.emptyFolderNodeText = VCResources.NoBranchesInRepository;
    }

    private _populateBranchGroupNode(repositoryNode: TreeView.TreeNode): TreeView.TreeNode {
        var branchGroupNode = this._createBranchGroupNode(this._projectId, repositoryNode.tag.repositoryContext);
        repositoryNode.add(branchGroupNode);
        
        if (this._selectedRepositoryId === repositoryNode.tag.repositoryContext.getRepositoryId() && this._isBranchGroupSelected) {
            this.setSelectedNode(this._findNode(this._selectedRepositoryId, null, this._isBranchGroupSelected));
        }
        return branchGroupNode;
    }

    private _populateTagNode(repositoryNode: TreeView.TreeNode): void {
        repositoryNode.add(this._createTagGroupNode(this._projectId, repositoryNode.tag.repositoryContext));

        if (this._selectedRepositoryId === repositoryNode.tag.repositoryContext.getRepositoryId() && this._isAllTagGroupSelected) {
            this.setSelectedNode(this._findNode(this._selectedRepositoryId, null, this._isAllTagGroupSelected));
        }
    }

    private _setRepositoryContexts(repositoryContexts: GitRepositoryContext[]) {
        let sortedRepositories: GitRepositoryContext[];

        sortedRepositories = repositoryContexts.slice(0);
        sortedRepositories.sort((context1: GitRepositoryContext, context2: GitRepositoryContext) => {
            return Utils_String.localeIgnoreCaseComparer(context1.getRepository().name, context2.getRepository().name);
        });

        this._repositories = sortedRepositories;

        this.rootNode.clear();
        this._projectNode = this._createProjectNode(this._projectId, this._projectName);
        if (sortedRepositories.length > 0) {
            this.rootNode.add(this._projectNode);
        }
        $.each(sortedRepositories, (index: number, repository: GitRepositoryContext) => {
            const repositoryNode = this._createRepositoryNode(this._projectId, repository),
                branches = this._branchesByRepositoryId[repository.getRepositoryId()];

            this._projectNode.add(repositoryNode);
            this._populateRepositoryChildrenNodes(repositoryNode, branches);

        });

        // Handle selected repository/branch
        if (this._selectedRepositoryId) {
            this.setSelectedNode(this._findNode(
                this._selectedRepositoryId, 
                this._selectedBranchName, 
                this._isAllTagGroupSelected,
                this._isBranchGroupSelected));
        }

        this._draw();
    }

    public refreshRepositories(callback?: (repositoryContexts: GitRepositoryContext[]) => void) {
        this._gitClient.beginGetProjectRepositories(this._projectId, (repositories: VCContracts.GitRepository[]) => {
            const repositoryContexts = $.map(repositories, (repository: VCContracts.GitRepository) => {
                return GitRepositoryContext.create(repository, this._options.tfsContext);
            });
            this._setRepositoryContexts(repositoryContexts);
            if ($.isFunction(callback)) {
                callback.call(this, repositoryContexts);
            }
        });
    }

    public getRepositoryContexts() {
        return this._repositories;
    }

    public getSelectedNodeInfo(): GitRepositoriesAdminTreeNodeInfo {
        const selectedNode = this.getSelectedNode();
        return selectedNode ? <GitRepositoriesAdminTreeNodeInfo>selectedNode.tag : null;
    }

    public setSelectedRepositoryContext(
        repositoryContext: GitRepositoryContext, 
        branchName?: string, 
        tagGroup?: boolean, 
        branchGroup?: boolean) {
        let node: TreeView.TreeNode,
            currentSelectedNode: GitRepositoriesAdminTreeNodeInfo;

        if (!repositoryContext) {
            this.setSelectedNode(this._projectNode);
        }
        else {
            this._selectedRepositoryId = repositoryContext.getRepositoryId();
            this._selectedBranchName = branchName;
            this._isAllTagGroupSelected = tagGroup;
            this._isBranchGroupSelected = branchGroup;
            
            currentSelectedNode = this.getSelectedNodeInfo();
            if (!currentSelectedNode || currentSelectedNode.repositoryContext !== repositoryContext) {
                if (this._selectedBranchName) {
                    const branchGroupNode = this._findNode(repositoryContext.getRepositoryId(), null, null, true);
                    this._ensureBranches(branchGroupNode);
                }

                node = this._findNode(repositoryContext.getRepositoryId(), branchName, tagGroup, branchGroup);
                if (this._isBranchGroupSelected){
                    this._ensureBranches(node);
                }
                if (node) {
                    this.setSelectedNode(node);
                }
            }
        }
    }

    private _findNode(repositoryId: string, branchName?: string, tagGroup?: boolean, branchGroup?: boolean) {
        let result: TreeView.TreeNode = null;

        Utils_UI.walkTree.call(this.rootNode, (treeNode: TreeView.TreeNode) => {
            let nodeInfo: GitRepositoriesAdminTreeNodeInfo;
            if (!result && treeNode.tag) {
                nodeInfo = <GitRepositoriesAdminTreeNodeInfo>treeNode.tag;
                if (repositoryId) {
                    if (nodeInfo.repositoryContext &&
                        nodeInfo.repositoryContext.getRepositoryId() === repositoryId) {

                        if (branchName || tagGroup || branchGroup) {
                            if ((branchName && treeNode.tag.branch && branchName === treeNode.tag.branch.friendlyName) ||
                                (tagGroup && treeNode.tag.tagGroup) ||
                                (branchGroup && treeNode.tag.branchGroup)) {
                                result = treeNode;
                            }
                        }
                        else {
                            result = treeNode;
                        }
                    }
                }
                else {
                    if (!treeNode.tag.repositoryContext) {
                        result = treeNode;
                    }
                }
            }
        });

        return result;
    }

    private _createProjectNode(projectId: string, projectName: string) {
        const node = TreeView.TreeNode.create(Utils_String.format(VCResources.GitRepositoriesTreeProjectNodeTitleFormat, projectName), {
            css: "project-node"
        });
        node.tag = {
            projectId: projectId,
            repoGroup: true
        };
        node.icon = "bowtie-icon bowtie-git";
        node.expanded = true;
        node.folder = true;
        node.noContextMenu = true;
        return node;
    }

    private _createRepositoryNode(projectId: string, repositoryContext: GitRepositoryContext) {
        const node = TreeView.TreeNode.create(repositoryContext.getRepository().name, {
            css: "repository-node unhide-chevron"
        });
        node.tag = {
            projectId: projectId,
            repositoryContext: repositoryContext
        };

        const isFork = repositoryContext.getRepository().isFork;

        node.icon = "bowtie-icon " + (isFork ? "bowtie-git-fork" : "bowtie-git");
        node.folder = true;

        return node;
    }

    private _createBranchNode(projectId: string, repositoryContext: GitRepositoryContext, branch: ClientGitRef) {
        let node: TreeView.TreeNode,
            isDefaultBranch = branch.name === repositoryContext.getRepository().defaultBranch;

        node = TreeView.TreeNode.create(branch.friendlyName, {
            css: "branch-node" + (isDefaultBranch ? " default-branch" : "")
        });

        node.tag = {
            projectId: projectId,
            repositoryContext: repositoryContext,
            branch: branch,
            isDefaultBranch: isDefaultBranch
        };

        this._setBranchNodeIconAndTitle(node);

        return node;
    }

    private _createBranchGroupNode(projectId: string, repositoryContext: GitRepositoryContext): TreeView.TreeNode {
        const nodeLabel = VCResources.Branches;
        const node = TreeView.TreeNode.create(nodeLabel, {
            css: "unhide-chevron"
        });

        node.tag = {
            projectId: projectId,
            repositoryContext,
            branchGroup: true
        };

        node.icon = "bowtie-icon bowtie-tfvc-branch";       
        node.noContextMenu = true;
        node.folder = true;
        node.emptyFolderNodeText = VCResources.LoadingText;
        
        return node;
    }

    private _createTagGroupNode(projectId: string, repositoryContext: GitRepositoryContext): TreeView.TreeNode {
        let node: TreeView.TreeNode;

        node = TreeView.TreeNode.create(VCResources.AdminPage_GitTree_allTags, {
            css: "branch-node"
        });

        node.tag = {
            projectId: projectId,
            repositoryContext: repositoryContext,
            tagGroup: true,
        };

        node.icon = "bowtie-icon bowtie-tag";
        node.noContextMenu = true;

        return node;
    }

    private _setBranchNodeIconAndTitle(node: TreeView.TreeNode) {
        if (!node.tag.branch.isLockedBy) {
            node.icon = "bowtie-icon bowtie-tfvc-branch";
            if (node.tag.isDefaultBranch) {
                node.title = Utils_String.format(VCResources.DefaultBranchTooltipFormat, node.tag.branch.friendlyName);
            }
        }
        else {
            node.icon = "bowtie-icon bowtie-tfvc-branch-locked";
            node.title = Utils_String.format(VCResources.LockedBranchTooltipFormat, node.tag.branch.friendlyName, node.tag.branch.isLockedBy.displayName);
        }
    }

    public onShowPopupMenu(node, options?) {
        const menuItems: any[] = [],
            repositoryContext: GitRepositoryContext = <GitRepositoryContext>node.tag.repositoryContext;

        if (repositoryContext) {

            if (node.tag.branch) {
                if (!node.tag.isDefaultBranch) {
                    menuItems.push({
                        id: "git-set-default-branch",
                        text: VCResources.SetDefaultBranchMenuItem
                    });
                }
                if (node.tag.branch.isLockedBy) {
                    menuItems.push({
                        id: "git-unlock-branch",
                        text: VCResources.UnlockBranchMenuItem
                    });
                }
                else {
                    menuItems.push({
                        id: "git-lock-branch",
                        text: VCResources.LockBranchMenuItem
                    });
                }
            }
            else if (!node.tag.branchGroup) {
                menuItems.push({
                    id: "rename-repository",
                    icon: "bowtie-icon bowtie-edit-rename",
                    text: VCResources.RenameRepositoryMenuItem
                });

                if (this._repositories.length > 1) {
                    menuItems.push({
                        id: "delete-repository",
                        icon: "bowtie-icon bowtie-edit-remove",
                        text: VCResources.DeleteRepositoryMenuItem
                    });
                }
            }
        }
        super.onShowPopupMenu(node, $.extend({}, options, { items: menuItems }));
    }

    private _onMenuItemClick(e?: any): any {
        let command = e.get_commandName(),
            node = e.get_commandArgument().node,
            selectedNodeInfo = <GitRepositoriesAdminTreeNodeInfo>node.tag,
            repositoryContext = selectedNodeInfo ? selectedNodeInfo.repositoryContext : null,
            gitRepository: VCContracts.GitRepository;

        e._commandArgument = repositoryContext;

        if (repositoryContext) {

            gitRepository = repositoryContext.getRepository();
            const branchGroupNode = this._findNode(gitRepository.id, null, null, true);
            switch (command) {

                case "git-lock-branch":
                    (<GitRepositoryContext>repositoryContext).getGitClient().beginLockGitRef(gitRepository, selectedNodeInfo.branch.name, () => {
                        const currentIdentity = TfsContext.getDefault().currentIdentity;
                        node.tag.branch.isLockedBy = {
                            id: currentIdentity.id,
                            uniqueName: currentIdentity.uniqueName,
                            displayName: currentIdentity.displayName
                        };
                        this._setBranchNodeIconAndTitle(node);
                        delete this._branchesByRepositoryId[gitRepository.id];
                        this._ensureBranches(branchGroupNode);
                    }, (error) => {
                        alert(error.message);
                    });
                    break;

                case "git-unlock-branch":
                    (<GitRepositoryContext>repositoryContext).getGitClient().beginUnlockGitRef(gitRepository, selectedNodeInfo.branch.name, () => {
                        node.tag.branch.isLockedBy = null;
                        this._setBranchNodeIconAndTitle(node);
                        delete this._branchesByRepositoryId[gitRepository.id];
                        this._ensureBranches(branchGroupNode);
                    }, (error) => {
                        alert(error.message);
                    });
                    break;

                case "git-set-default-branch":
                    (<GitRepositoryContext>repositoryContext).getGitClient().beginSetDefaultBranch(gitRepository, selectedNodeInfo.branch.name, () => {
                        delete this._branchesByRepositoryId[gitRepository.id];
                        this._ensureBranches(branchGroupNode);                        
                    }, (error) => {
                        alert(error.message);
                    });
                    break;

                case "rename-repository":
                    VCGitRepositoryDialogs.renameGitRepository(gitRepository, {
                        isDefaultRepository: Utils_String.localeIgnoreCaseComparer(gitRepository.name, TfsContext.getDefault().navigation.project) === 0,
                        okCallback: (gitRepository: VCContracts.GitRepository) => {
                            this.refreshRepositories(() => {
                                this._fire("repository-renamed", gitRepository);
                            });
                        }
                    });
                    break;

                case "delete-repository":
                    VCGitRepositoryDialogs.deleteGitRepository(gitRepository)
                        .then(result => {
                            const gitHttpClient = this._gitClient.getConnection().getHttpClient<GitHttpClient>(GitHttpClient);
                            return gitHttpClient.deleteRepository(gitRepository.id);
                        })
                        .done(() => {
                            this._gitClient.clearCachedProjectRepositories(gitRepository.project.id);
                            this.refreshRepositories(() => {
                                this._fire("repository-deleted", gitRepository);
                            });
                        },(error) => {
                            if (error.message && error.message.length) {
                                Dialogs.showMessageDialog(error.message, {
                                    title: Utils_String.format(VCResources.GitRepositoryDeleteErrorTitle, gitRepository.name),
                                    // Dialogs.ts is currently using the deprecated "bowtie-style" class; this messes up paragraph spacing. Use the newer "bowtie" class.
                                    useBowtieStyle: false,
                                    // IShowMessageDialogOptions doesn't extend IMessageDialogOptions, but it will use next properties via $.extend()
                                    bowtieVersion: 0,
                                    dialogClass: "bowtie",
                                } as Dialogs.IShowMessageDialogOptions);
                            }
                        });
                    break;
            }
        }

        this._fire("repositories-grid-menu-item-clicked", e);
    }
}

VSS.classExtend(GitRepositoriesAdminTree, TfsContext.ControlExtensions);

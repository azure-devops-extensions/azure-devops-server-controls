import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import * as React from "react";

import { TreeStore, IItem } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { GitRepository } from "TFS/VersionControl/Contracts";
import { ItemRetrievalBridge } from "VersionControl/Scenarios/Explorer/Bridges/ItemRetrievalBridge";
import { Tree } from "VersionControl/Scenarios/Explorer/Components/Tree";
import { RepositorySource } from "VersionControl/Scenarios/Explorer/Sources/RepositorySource";
import { KnownItemsStore } from "VersionControl/Scenarios/Explorer/Stores/KnownItemsStore";
import { ExplorerTreeAdapter, createTreeStore } from "VersionControl/Scenarios/Explorer/Stores/TreeStore";
import { getFilesTreeCommands } from "VersionControl/Scenarios/Shared/Commands/FilesTreeCommands";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { VersionSpec, ShelvesetVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import "VSS/LoaderPlugins/Css!VersionControl/FilesTree";

export interface FilesTreeProps {
    repositoryContext: RepositoryContext;
    selectedFullPath: string;
    versionSpec: VersionSpec;
    onItemSelected(path: string): void;
    onError(error: Error): void;
    getItemIsDisabled?(item: IItem): boolean;
    getItemHasCommands?(item: IItem): boolean;
}

/**
 * A tree to browse repository files, that lazy loads the items it needs from the server.
 */
export class FilesTree extends React.PureComponent<FilesTreeProps, {}> {
    private bridge: ItemRetrievalBridge;
    private treeAdapter: ExplorerTreeAdapter;
    private treeStore: TreeStore;
    private knownItemsStore: KnownItemsStore;
    private repositorySource: RepositorySource;

    constructor(props: FilesTreeProps) {
        super(props);

        const isGit = props.repositoryContext.getRepositoryType() === RepositoryType.Git;

        this.treeAdapter = new ExplorerTreeAdapter(isGit);
        this.treeStore = createTreeStore(this.treeAdapter, isGit);

        this.knownItemsStore = new KnownItemsStore();
        this.knownItemsStore.initializeRepository(isGit, props.repositoryContext.getRepositoryClass());

        this.repositorySource = new RepositorySource(
            props.repositoryContext.getTfsContext(),
            props.repositoryContext.getRepository());

        this.bridge = new ItemRetrievalBridge(
            {
                itemRetrieved: (path, item, items, notFoundError) =>
                    notFoundError
                    ? props.onError(notFoundError)
                    : this.addItemsAndExpand(items, path),
                treeItemExpanded: payload => this.addItemsAndExpand(payload.allRetrievedItems, payload.folderPath),
                treeItemExpanding: this.makeItemExpanding,
            },
            this.repositorySource,
            () => ({
                isGit,
                rootPath: props.repositoryContext.getRootPath(),
                path: this.props.selectedFullPath,
                version: this.props.versionSpec && this.props.versionSpec.toVersionString(),
                knownItemsState: this.knownItemsStore.state,
            }));
    }

    public render(): JSX.Element {
        const items = this.treeStore.getVisible();
        const knownItemsState = this.knownItemsStore.state;

        return (
            <Tree
                items={items}
                itemsIconClasses={knownItemsState.iconClasses}
                knownItems={knownItemsState.knownItems}
                selectedFullPath={this.props.selectedFullPath}
                versionSpec={this.props.versionSpec}
                repositoryContext={this.props.repositoryContext}
                rootName={this.repositorySource.getRepositoryName()}
                rootPath={this.getRootPath()}
                isGit={this.repositorySource.isGit()}
                isDirty={false}
                isNewFile={false}
                onItemSelected={this.props.onItemSelected}
                onItemExpand={this.requestExpandItem}
                onItemCollapse={this.collapseItem}
                getItemCommands={this.getItemCommands}
                getItemIsDisabled={this.props.getItemIsDisabled}
                getItemHasCommands={this.props.getItemHasCommands}
                />);
    }

    public componentDidMount(): void {
        this.fetchItemIfNeeded();
    }

    public componentWillReceiveProps(newProps: FilesTreeProps): void {
        const hasVersionChanged = this.props.versionSpec !== newProps.versionSpec;
        if (hasVersionChanged) {
            this.knownItemsStore.reset();
            this.treeAdapter.refresh.invoke(undefined);
        }

        if (hasVersionChanged || this.props.selectedFullPath !== newProps.selectedFullPath) {
            this.fetchItemIfNeeded(newProps.selectedFullPath, newProps.versionSpec);
        }
    }

    private getRootPath(): string {
        return this.props.repositoryContext.getRootPath();
    }

    private fetchItemIfNeeded(
        path: string = this.props.selectedFullPath || this.getRootPath(),
        versionSpec: VersionSpec = this.props.versionSpec,
    ): ItemModel {
        if (versionSpec) {
            return this.bridge.getItem(path, versionSpec).item;
        }
    }

    private requestExpandItem = (path: string): void => {
        this.bridge.expandTreeItem(path);
    }

    private makeItemExpanding = (path: string): void => {
        this.treeAdapter.folderExpanding.invoke(path);
        this.forceUpdate();
    }

    private addItemsAndExpand = (items: ItemModel[], pathToExpand: string): void => {
        this.treeAdapter.addItemsAndExpand(items, pathToExpand);
        this.knownItemsStore.loadItems(items);
        this.forceUpdate();
    }

    private collapseItem = (path: string): void => {
        this.treeAdapter.folderCollapsed.invoke(path);
        this.forceUpdate();
    }

    private getItemCommands = (treeItem: IItem): IContextualMenuItem[] => {
        return getFilesTreeCommands({
            repositoryContext: this.props.repositoryContext,
            isGit: this.props.repositoryContext.getRepositoryType() === RepositoryType.Git,
            path: treeItem.fullName,
            version: this.props.versionSpec && this.props.versionSpec.toVersionString(),
            isFolder: treeItem.isFolder,
            isShelveset: this.props.versionSpec instanceof ShelvesetVersionSpec,
            isFullPageNavigate: false,
        });
    }
}

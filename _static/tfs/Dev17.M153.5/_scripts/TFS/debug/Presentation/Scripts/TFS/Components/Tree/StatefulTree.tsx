import * as React from "react";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { autobind, BaseComponent, IBaseProps } from "OfficeFabric/Utilities";
import * as TreeStore from "Presentation/Scripts/TFS/Stores/TreeStore";
import { Tree } from "Presentation/Scripts/TFS/Components/Tree/Tree";

export interface StatefulTreeProps extends IBaseProps {
    onRenderItem(item: TreeStore.IItem): JSX.Element;
    addedPaths?: string[];
    modifiedPaths?: string[];
    removedPaths?: string[];
    shouldReset?: boolean;
    selectedFullPath?: string;
    pathComparer?: (a: string, b: string) => number;
    compareChildren?: (parentPath: string, a: string, b: string) => number;
    canCompactNodeIntoChild?: (node: TreeStore.Node, depth: number) => boolean;
    getItemHasCommands?(treeItem: TreeStore.IItem): boolean;
    getItemCommands?(treeItem: TreeStore.IItem): IContextualMenuItem[];
    onItemSelected?: (path: string, depth?: number) => void;
}

export interface StatefulTreeState {
    visibleItems: TreeStore.IItem[];
}

/**
 * The stateful tree encapsulates lower-level tree functionality like navigate and
 * collapse/expand. The consumer only needs to provide the paths to render in a generic
 * tree format.
 */
export class StatefulTree extends BaseComponent<StatefulTreeProps, StatefulTreeState> {
    constructor(props: StatefulTreeProps) {
        super(props);
        this.state = { visibleItems: [] };

        this._treeActionAdapter = new TreeStore.ActionAdapter();
        let treeStoreOptions: TreeStore.ITreeStoreOptions = {
            adapter: this._treeActionAdapter,
            isDeferEmitChangedMode: true,
            canCompactNodeIntoChild: this._canCompactNodeIntoChild,
            compareChildren: this.props.compareChildren && this._compareChildren,
        };
        this._treeStore = new TreeStore.TreeStore(treeStoreOptions);
    }

    public render(): JSX.Element {
        return (
            <Tree
                items={this.state.visibleItems}
                getItemHasCommands={this.props.getItemHasCommands}
                getItemCommands={this.props.getItemCommands}
                selectedFullPath={this.props.selectedFullPath}
                pathComparer={this.props.pathComparer}
                onRenderItem={this.props.onRenderItem}
                onItemCollapse={this._onItemCollapse}
                onItemExpand={this._onItemExpand}
                onItemSelected={this._onItemSelected}
            />
        );
    }

    public componentDidMount(): void {
        this._updateTreeState(this.props);
    }

    public componentWillReceiveProps(nextProps: StatefulTreeProps): void {
        this._updateTreeState(nextProps);
    }

    @autobind
    private _updateTreeState(props?: StatefulTreeProps): void {
        if (props) {
            props.shouldReset && this._treeActionAdapter.refresh.invoke(null);

            this._treeActionAdapter.itemsRemoved.invoke(props.removedPaths);
            this._treeActionAdapter.itemsAdded.invoke(props.addedPaths);

            // expand the folders that have added items
            for (const path of [...props.addedPaths, ...props.modifiedPaths]) {
                const containingFolders: string[] = path.split(TreeStore.DEFAULT_SEPARATOR);
                containingFolders.pop();
                this._treeActionAdapter.folderExpanded.invoke(containingFolders.join(TreeStore.DEFAULT_SEPARATOR) || "/");
            }

            props.shouldReset && this._treeActionAdapter.expandAll.invoke(null);
        }

        this.setState({
            visibleItems: this._treeStore.getVisible() 
        });
    }

    @autobind
    private _compareChildren(parentPath: string, a: TreeStore.Node | string, b: TreeStore.Node | string): number {
        if (!this.props.compareChildren) {
            return 0;
        }

        const basePath: string = parentPath + TreeStore.DEFAULT_SEPARATOR;
        const aPath: string = (a as TreeStore.Node).name || (a as string);
        const bPath: string = (b as TreeStore.Node).name || (b as string);

        return this.props.compareChildren(basePath, aPath, bPath);
    }

    @autobind
    private _canCompactNodeIntoChild(node: TreeStore.Node, depth: number): boolean {
        return (this.props.canCompactNodeIntoChild && this.props.canCompactNodeIntoChild(node, depth)) || false;
    }

    @autobind
    private _onItemExpand(path: string): void {
        this._treeActionAdapter.folderExpanded.invoke(path);
        this._updateTreeState();
    }

    @autobind
    private _onItemCollapse(path: string): void {
        this._treeActionAdapter.folderCollapsed.invoke(path);
        this._updateTreeState();
    }

    @autobind
    private _onItemSelected(path: string, depth?: number): void {
        this.props.onItemSelected && this.props.onItemSelected(path, depth);
    }

    private _treeStore: TreeStore.TreeStore;
    private _treeActionAdapter: TreeStore.IActionAdapter;
}

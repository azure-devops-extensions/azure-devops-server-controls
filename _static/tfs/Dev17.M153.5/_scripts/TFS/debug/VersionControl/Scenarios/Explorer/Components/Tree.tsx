import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import * as React from "react";
import { ignoreCaseComparer, defaultComparer } from "VSS/Utils/String";

import * as VCTree from "Presentation/Scripts/TFS/Components/Tree/Tree";
import { IItem } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { getCommands } from "VersionControl/Scenarios/Explorer/Commands/ItemCommands";
import { getFilesItemProvider, ContributionNames } from "VersionControl/Scenarios/Explorer/Commands/ItemContribution";
import * as VCContainer from "VersionControl/Scenarios/Explorer/Components/Container";
import { FileNameCell } from "VersionControl/Scenarios/Explorer/Components/FileNameCell";
import { PathParser } from "VersionControl/Scenarios/Shared/Path/PathParser";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import "VSS/LoaderPlugins/Css!VersionControl/FilesTree";

/**
 * Container for the Explorer tree.
 */
export const TreeContainer = VCContainer.create(
    ["knownItems", "fileContent", "permissions", "path", "version", "extensions", "smartFolderTree"],
    ({ knownItemsState, fileContentState, permissionsState, pathState, versionSpec, extensionsState, treeState, repositoryContext, isGit }, { actionCreator }) => {
        const { visibleItems } = treeState;
        actionCreator.notifyTreeRendered(visibleItems.length);

        const allowEditing = fileContentState.allowEditingFeatures && fileContentState.allowEditingVersion;
        const hasEditPermissions = permissionsState.createOrModifyFiles;

        const getItemCommands = (treeItem: IItem) => {
            const fullName = treeItem.fullName || "/";
            const item = knownItemsState.knownItems[fullName];
            const pathParser = new PathParser(fullName);
            return getCommands({
                allowEditing,
                hasEditPermissions,
                item,
                isCurrentItem: pathState.path === fullName,
                isEditing: fileContentState.isEditing,
                isDirty: pathState.isDirty,
                isNewFile: fileContentState.isNewFile,
                isRoot: pathParser.isRoot,
                isGit,
                isTooBigToEdit: fileContentState.isTooBigToEdit,
                uiSource: "tree-context-menu",
                actionCreator,
                extraCommands: extensionsState.extraCommands,
            });
        };

        return (
            <Tree
                items={visibleItems}
                itemsIconClasses={knownItemsState.iconClasses}
                selectedFullPath={pathState.path}
                versionSpec={versionSpec}
                repositoryContext={repositoryContext}
                knownItems={knownItemsState.knownItems}
                isDirty={pathState.isDirty}
                isNewFile={fileContentState.isNewFile}
                rootName={pathState.repositoryName}
                rootPath={fileContentState.rootPath}
                isGit={pathState.isGit}
                allowEditing={allowEditing}
                hasEditPermissions={hasEditPermissions}
                onItemSelected={path => actionCreator.changePath(path, undefined, "item-selected-in-tree")}
                onItemExpand={actionCreator.expandTreeItem}
                onItemCollapse={actionCreator.collapseTreeItem}
                onFilesDrop={(targetPath, dataDrop) => actionCreator.promptUploadFiles(targetPath, "drop-in-tree", dataDrop)}
                getItemCommands={getItemCommands}
            />);
    });

export interface TreeProps {
    items: IItem[];
    itemsIconClasses: IDictionaryStringTo<string>;
    selectedFullPath: string;
    versionSpec: VersionSpec;
    repositoryContext: RepositoryContext;
    knownItems: IDictionaryStringTo<ItemModel>;
    isDirty: boolean;
    isNewFile: boolean;
    rootName: string;
    rootPath: string;
    isGit: boolean;
    allowEditing?: boolean;
    hasEditPermissions?: boolean;
    onItemSelected(path: string): void;
    onItemExpand(path: string): void;
    onItemCollapse(path: string): void;
    onFilesDrop?(targetPath: string, dataDrop: DataTransfer): void;
    getItemCommands(item: IItem): IContextualMenuItem[];
    getItemIsDisabled?(item: IItem): boolean;
    getItemHasCommands?(item: IItem): boolean;
}

/**
 * Gets the selected full path with the Tree-expected casing.
 * Note the tree generates path from folders, while selectedFullPath is coming from the Item.
 * Only necessary for TFVC. Git is case-sensitive so this adds no overhead.
 * @example
 * In TFVC, even though parent is "Folder", item could be checked in as "$/Team/FOLDER/name".
 * In this case, this function will return "$/Team/Folder/name".
 */
function getSelectedFullPathMatchingTreeCasing({ selectedFullPath, isGit, items }: TreeProps): string {
    if (isGit) {
        return selectedFullPath;
    }

    for (const item of items) {
        if (ignoreCaseComparer(item.fullName, selectedFullPath) === 0) {
            return item.fullName;
        }
    }

    return selectedFullPath;
}

export class Tree extends React.PureComponent<TreeProps, {}> {
    public render(): JSX.Element {
        return (
            <VCTree.Tree
                items={this.props.items}
                selectedFullPath={getSelectedFullPathMatchingTreeCasing(this.props)}
                pathComparer={this.props.isGit ? defaultComparer : ignoreCaseComparer}
                onItemSelected={this.props.onItemSelected}
                onItemExpand={this.props.onItemExpand}
                onItemCollapse={this.props.onItemCollapse}
                onRenderItem={this.onRenderItem}
                getItemIsCollapsible={this.getItemIsCollapsible}
                getItemCommands={this.props.getItemCommands}
                getMenuItemProviders={this.getMenuItemProviders}
                getItemIsDisabled={this.props.getItemIsDisabled}
                getItemHasCommands={this.props.getItemHasCommands || getItemHasCommands}
            />);
    }

    private getItemIsCollapsible = (treeItem: IItem): boolean => {
        if (this.props.rootPath === treeItem.fullName) {
            return false;
        }

        const item = this.getItem(treeItem);
        return !item || !item.childItems || item.childItems.length > 0;
    }

    private getItem(treeItem: IItem): ItemModel {
        return this.props.knownItems[getNodeFullName(treeItem)];
    }

    private onRenderItem = (treeItem: IItem, options: VCTree.RenderItemOptions): JSX.Element => {
        const name = getNodeText(treeItem, this.props.rootName, this.props.isGit);
        const fullName = getNodeFullName(treeItem);
        const isCurrentItem = this.props.selectedFullPath === fullName;
        const item = this.getItem(treeItem);
        return (
            <FileNameCell
                {...options}
                name={name}
                iconClass={this.props.itemsIconClasses[fullName]}
                item={item}
                isDirty={isCurrentItem && this.props.isDirty}
                canDrop={this.props.allowEditing && this.props.hasEditPermissions && treeItem.isFolder}
                onFilesDrop={dataDrop => this.props.onFilesDrop && this.props.onFilesDrop(fullName, dataDrop)}
                />);
    }

    private getMenuItemProviders = (treeItem: IItem) => {
        return [getFilesItemProvider(this.getItem(treeItem), this.props.versionSpec, this.props.repositoryContext, ContributionNames.treeItem)];
    }
}

function getNodeText(item: IItem, rootName: string, isGit: boolean): string {
    if (isGit && item.depth === 0) {
        return rootName;
    }

    return item.name;
}

function getNodeFullName(treeItem: IItem): string {
    if (treeItem.fullName === "$") {
        return "$/";
    } else {
        return treeItem.fullName || "/";
    }
}


function getItemHasCommands(treeItem: IItem): boolean {
    return treeItem.fullName !== "$";
}

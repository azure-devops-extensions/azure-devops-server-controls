import { CommandBar } from "OfficeFabric/CommandBar";
import * as React from "react";

import { ActionCreator } from "VersionControl/Scenarios/Explorer/ActionCreator";
import { getCommands, getSideCommands, GetCommandsOptions } from "VersionControl/Scenarios/Explorer/Commands/ItemCommands";
import * as VCContainer from "VersionControl/Scenarios/Explorer/Components/Container";
import { AggregateState } from "VersionControl/Scenarios/Explorer/Stores/StoresHub";
import { ItemModel, HistoryEntry } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";

import "VSS/LoaderPlugins/Css!VersionControl/ItemCommandBar";

export const ItemCommandBarContainer = VCContainer.create(
    ["pivotTabs", "itemContent", "folderContent", "fileContent", "permissions", "path", "compare"],
    (aggregateState, { actionCreator }) =>
        <ItemCommandBar {...getItemCommandBarProps(aggregateState, actionCreator)} />);

function getItemCommandBarProps(aggregateState: AggregateState, actionCreator: ActionCreator): GetCommandsOptions {
    let item: ItemModel;
    let isCurrentItem: boolean = false;

    if (aggregateState.itemContentState.item) {
        if (aggregateState.itemContentState.item.isFolder) {
            const { selectedItems } = aggregateState.folderContentState;
            if (selectedItems.length > 1) {
                throw new Error("Multiple selection is not supported.");
            } else if (selectedItems.length) {
                item = selectedItems[0];
            } else {
                item = aggregateState.itemContentState.item;
                isCurrentItem = true;
            }
        } else {
            item = aggregateState.itemContentState.item;
            isCurrentItem = true;
        }
    }

    const allowEditing =
        aggregateState.fileContentState.allowEditingFeatures &&
        aggregateState.fileContentState.allowEditingVersion;

    const hasEditPermissions = aggregateState.permissionsState.createOrModifyFiles;

    return {
        item,
        isCurrentItem,
        isRoot: item && item.serverItem === aggregateState.fileContentState.rootPath,
        allowEditing,
        hasEditPermissions,
        extraCommands: aggregateState.extensionsState.extraCommands,
        tab: aggregateState.pivotTabsState.currentTab,
        isEditing: aggregateState.fileContentState.isEditing,
        isNewFile: aggregateState.fileContentState.isNewFile,
        isDirty: aggregateState.pathState.isDirty,
        isDiffInline: aggregateState.fileContentState.isDiffInline,
        isGit: aggregateState.pathState.isGit,
        isTooBigToEdit: aggregateState.fileContentState.isTooBigToEdit,
        itemHistory: getItemHistory(aggregateState),
        compareOptions: aggregateState.compareState,
        canGoToPreviousDiff: aggregateState.compareState.canGoToPreviousDiff,
        canGoToNextDiff: aggregateState.compareState.canGoToNextDiff,
        actionCreator,
        uiSource: "command-bar",
    };
}

function getItemHistory({ isGit, historyListState, tfvcHistoryListState }: AggregateState): HistoryEntry[] {
    let history: HistoryEntry[];
    if (isGit) {
        if (historyListState.historyResults) {
            history = historyListState.historyResults.results;
        }
    } else {
        if (tfvcHistoryListState.tfvcChangeSetsListItems) {
            history = tfvcHistoryListState.tfvcChangeSetsListItems.map(tfvcItem => tfvcItem.item);
        }
    }

    return history || [];
}

export const ItemCommandBar = (props: GetCommandsOptions): JSX.Element => {
    const items = getCommands(props);
    return <div className="vc-item-command-bar--right">
        {
            items.length > 0 &&
            <div className="vc-item-command-bar--separator" />
        }
        <CommandBar
            className="vc-item-command-bar"
            items={items}
            farItems={getSideCommands({ isFullScreen: false, ...props })}
            ref={props.actionCreator.focusManager.setCommandBar}
        />
    </div>;
}

import * as React from "react";
import * as _CodeContracts from "Search/Scenarios/WebApi/Code.Contracts";
import * as _VCRepositoryContext from "VersionControl/Scripts/RepositoryContext";
import * as Container from "Search/Scenarios/Code/Components/Container";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { CommandBar } from "OfficeFabric/CommandBar";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { IIconProps } from "OfficeFabric/Icon";
import { ActionCreator } from "Search/Scenarios/Code/Flux/ActionCreator";
import { HitsNavigationActionIds, CompareViewActionIds, PivotTabActionIds, ActionIds } from "Search/Scenarios/Code/Constants";

export interface PreviewCommandBarContainerProps extends Container.ContainerProps {
    selectedItem: _CodeContracts.CodeResult;
}

export interface ICommandoptions {
    activeTabKey: string;

    nextHitNavigationEnabled: boolean;

    prevHitNavigationEnabled: boolean;

    canGotoNextDiff: boolean;

    canGotoPreviousDiff: boolean;

    isDiffInline: boolean;

    selectedItem: _CodeContracts.CodeResult;

    isFullScreen: boolean;

    actionCreator: ActionCreator;
}

export const PreviewCommandBarContainer = Container.create<PreviewCommandBarContainerProps>(
    ["hitNavigationStore", "pivotTabsStore", "compareStore"],
    ({
        hitNavigationState,
        pivotTabsState,
        compareState
    }, props) => {
        const { nextHitNavigationEnabled, prevHitNavigationEnabled } = hitNavigationState,
            { canGotoNextDiff, canGotoPreviousDiff, isDiffInline } = compareState,
            { actionCreator, selectedItem } = props,
            activeTabKey = pivotTabsState.currentTab,
            isFullScreen = pivotTabsState.isFullScreen;

        const commandOptions: ICommandoptions = {
            activeTabKey,
            actionCreator,
            nextHitNavigationEnabled,
            prevHitNavigationEnabled,
            canGotoNextDiff,
            canGotoPreviousDiff,
            isDiffInline,
            selectedItem,
            isFullScreen
        };

        return <CommandBar
            className="search-command-bar"
            items={[]}
            farItems={getCommands(commandOptions)} />;
    });

function getCommands(commandOptions: ICommandoptions): IContextualMenuItem[] {
    let commands: IContextualMenuItem[] = [];
    if (commandOptions.activeTabKey === PivotTabActionIds.Contents ||
        commandOptions.activeTabKey === PivotTabActionIds.Blame) {
        commands.push(getPrevNavigationCommand(
            HitsNavigationActionIds.PrevHitNavigation,
            Resources.PreviousButtonToolTip,
            commandOptions.actionCreator.gotoPrevHit,
            commandOptions.prevHitNavigationEnabled));
        commands.push(getNextNavigationCommand(
            HitsNavigationActionIds.NextHitNavigation,
            Resources.NextButtonToolTip,
            commandOptions.actionCreator.gotoNextHit,
            commandOptions.nextHitNavigationEnabled));
        commands.push(getDownloadCommand(
            () => {
                commandOptions.actionCreator.downloadFile(commandOptions.selectedItem);
            }));
    }
    else if (commandOptions.activeTabKey === PivotTabActionIds.Compare) {
        commands.push(getPrevNavigationCommand(
            CompareViewActionIds.PrevDiffNavigation,
            Resources.PreviousCompareButtonToolTip,
            commandOptions.actionCreator.gotoPrevCompareHit,
            commandOptions.canGotoPreviousDiff));
        commands.push(getNextNavigationCommand(
            CompareViewActionIds.NextDiffNavigation,
            Resources.NextCompareButtonToolTip,
            commandOptions.actionCreator.gotoNextCompareHit,
            commandOptions.canGotoNextDiff));
        commands.push(getToggleDiffViewCommand(commandOptions.actionCreator.toggleCompareView, commandOptions.isDiffInline));
    }

    // Adding the Full screen option to all the tabs. The user can switch tabs in full screen mode.
    commands.push(getToggleFullScreenCommand(commandOptions.actionCreator.toggleFullScreen, !!commandOptions.isFullScreen));

    return commands;
}

function getNextNavigationCommand(key: string, toolTip: string, onClickDelegate: () => void, isEnabled: boolean): IContextualMenuItem {
    return {
        key: key,
        name: toolTip,
        iconOnly: true,
        onClick: onClickDelegate,
        disabled: !isEnabled,
        iconProps: getMenuIcon("bowtie-arrow-down")
    }
}

function getPrevNavigationCommand(key: string, toolTip: string, onClickDelegate: () => void, isEnabled: boolean): IContextualMenuItem {
    return {
        key: key,
        name: toolTip,
        iconOnly: true,
        onClick: onClickDelegate,
        disabled: !isEnabled,
        iconProps: getMenuIcon("bowtie-arrow-up")
    }
}

function getToggleDiffViewCommand(onClickDelegate: () => void, isDiffInline: boolean): IContextualMenuItem {
    return {
        key: CompareViewActionIds.ToggleInlineDiff,
        name: isDiffInline ? Resources.InlineDiffToolTip : Resources.SideBySideDiffToolTip,
        iconOnly: true,
        onClick: onClickDelegate,
        iconProps: getMenuIcon(isDiffInline ? "bowtie-diff-inline" : "bowtie-diff-side-by-side")
    }
}

function getToggleFullScreenCommand(onClickDelegate: (boolean) => void, isFullScreen: boolean): IContextualMenuItem {
    return {
        key: ActionIds.FullScreen,
        name: isFullScreen ? Resources.ExitFullScreenToolTip : Resources.EnterFullScreenToolTip,
        iconOnly: true,
        iconProps: getMenuIcon(isFullScreen ? "bowtie-view-full-screen-exit" : "bowtie-view-full-screen"),
        onClick: () => { onClickDelegate(!isFullScreen) }
    };
}

function getMenuIcon(name: string): IIconProps {
    return { className: "bowtie-icon " + name, iconName: undefined };
}

function getDownloadCommand(onClickDelegate: () => void): IContextualMenuItem {
    return {
        key: ActionIds.Download,
        name: Resources.DownloadText,
        iconOnly: true,
        onClick: onClickDelegate,
        iconProps: getMenuIcon("bowtie-transfer-download")
    }
}

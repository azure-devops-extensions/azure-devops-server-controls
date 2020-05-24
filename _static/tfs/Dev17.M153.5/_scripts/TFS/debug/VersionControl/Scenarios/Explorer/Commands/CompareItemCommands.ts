import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { findIndex } from "VSS/Utils/Array";
import { localeFormat } from "VSS/Utils/Date";
import { format } from "VSS/Utils/String";

import { ActionCreator } from "VersionControl/Scenarios/Explorer/ActionCreator";
import { CompareOptions } from "VersionControl/Scenarios/Explorer/ActionsHub";
import { renderHistoryEntry, getHistoryEntryName } from "VersionControl/Scenarios/Explorer/Commands/HistoryPickerItem";
import { getMenuIcon } from "VersionControl/Scenarios/Shared/Commands/CommandsCreator";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { HistoryEntry } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export interface GetCompareCommandsOptions {
    actionCreator: ActionCreator;
    tab?: string;
    itemHistory?: HistoryEntry[];
    isDiffInline?: boolean;
    compareOptions?: CompareOptions;
    canGoToPreviousDiff?: boolean;
    canGoToNextDiff?: boolean;
}

export const compareCommands = {
    toggleInlineDiff: ({ actionCreator, isDiffInline, tab }: GetCompareCommandsOptions): IContextualMenuItem =>
        (VersionControlActionIds.isCompareAction(tab)) && {
            key: "toggleInlineDiff",
            name: isDiffInline ? VCResources.EditFileDiffSideBySide : VCResources.EditFileDiffInline,
            iconOnly: true,
            iconProps: getMenuIcon(isDiffInline ? "bowtie-diff-side-by-side" : "bowtie-diff-inline"),
            onClick: () => actionCreator.toggleEditingDiffInline(),
        },
    originalVersion: getVersionPickerCreator("oversion", VCResources.CompareOriginalVersionPickerAriaLabel),
    modifiedVersion: getVersionPickerCreator("mversion", VCResources.CompareModifiedVersionPickerAriaLabel),
    goToPreviousDiff: ({ actionCreator, canGoToPreviousDiff }: GetCompareCommandsOptions): IContextualMenuItem => ({
        key: "goToPreviousDiff",
        name: VCResources.PreviousDifferenceTooltip,
        disabled: !canGoToPreviousDiff,
        iconOnly: true,
        iconProps: getMenuIcon("bowtie-arrow-up"),
        onClick: () => actionCreator.goToPreviousDiff(),
    }),
    goToNextDiff: ({ actionCreator, canGoToNextDiff }: GetCompareCommandsOptions): IContextualMenuItem => ({
        key: "goToNextDiff",
        name: VCResources.NextDifferenceTooltip,
        iconOnly: true,
        disabled: !canGoToNextDiff,
        iconProps: getMenuIcon("bowtie-arrow-down"),
        onClick: () => actionCreator.goToNextDiff(),
    }),
};

function getVersionPickerCreator(versionPropName: keyof CompareOptions, ariaLabelTemplate: string) {
    return ({ actionCreator, itemHistory, compareOptions }: GetCompareCommandsOptions): IContextualMenuItem => {
        if (itemHistory.length > 0) {
            const name = getHistoryEntryName(getEffectiveCompareVersion(versionPropName, itemHistory, compareOptions));
            return {
                key: versionPropName,
                name,
                ariaLabel: format(ariaLabelTemplate, name),
                iconProps: { iconName: "BranchCommit" },
                subMenuProps: {
                    className: "vc-history-picker",
                    items: itemHistory.map(
                        entry => createHistoryEntryMenuItem(entry, itemHistory, compareOptions, actionCreator, versionPropName)),
                },
            };
        }
    };
}

function createHistoryEntryMenuItem(
    entry: HistoryEntry,
    itemHistory: HistoryEntry[],
    compareOptions: CompareOptions,
    actionCreator: ActionCreator,
    versionPropName: keyof CompareOptions,
) {
    const version = getEffectiveCompareVersion(versionPropName, itemHistory, compareOptions);
    const oppositeVersion = getEffectiveCompareVersion(oppositeVersionPropName[versionPropName], itemHistory, compareOptions);

    return {
        key: `changeVersion-${entry.changeList.version}`,
        name: renderHistoryEntry(entry) as any,
        secondaryText: localeFormat(entry.changeList.creationDate, "d"),
        ariaLabel: getHistoryEntryName(entry.changeList.version),
        canCheck: true,
        checked: entry.changeList.version === version,
        disabled: entry.changeList.version === oppositeVersion,
        iconProps: { iconName: "BranchCommit" },
        onClick: () => actionCreator.changeCompareVersion(
            entry.changeList.version,
            entry.serverItem,
            versionPropName === "oversion"),
    };
}

function getEffectiveCompareVersion(versionPropName: keyof CompareOptions, itemHistory: HistoryEntry[], compareOptions: CompareOptions) {
    const compareVersion = compareOptions[versionPropName];

    if (compareVersion) {
        if (compareVersion.startsWith("P")) {
            const versionToFindPrevious = compareVersion.substring(1);
            const indexToFindPrevious = findIndex(itemHistory, item => item.changeList.version === versionToFindPrevious);
            if (indexToFindPrevious >= 0 && indexToFindPrevious + 1 < itemHistory.length) {
                return itemHistory[indexToFindPrevious + 1].changeList.version;
            }
        }

        return compareVersion;
    } else {
        const defaultIndex = fallbackHistoryIndex[versionPropName];

        let defaultEntry = itemHistory[defaultIndex];
        if (!defaultEntry) {
            defaultEntry = itemHistory[0];
        }

        return defaultEntry && defaultEntry.changeList.version;
    }
}

const oppositeVersionPropName: IDictionaryStringTo<keyof CompareOptions> = {
    mversion: "oversion",
    oversion: "mversion",
};

const fallbackHistoryIndex: IDictionaryStringTo<number> = {
    mversion: 0,
    oversion: 1,
};

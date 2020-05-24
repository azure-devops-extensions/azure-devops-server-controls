import * as React from "react";
import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";
import { ChangeExplorerGridDisplayMode } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { ChangeExplorerGridModeChangedEventArgs } from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerGrid";
import * as Telemetry from "VSS/Telemetry/Services";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!fabric";

export interface ITreeFilterSelectorProps extends React.Props<void> {
    displayMode: ChangeExplorerGridDisplayMode;
    onUpdateChangeExplorerOptions(options: any, shouldUpdatePrefs?: boolean): void;
}

const TreeFilterType = [
    ChangeExplorerGridDisplayMode.FullTree,
    ChangeExplorerGridDisplayMode.FilesByFolder,
    ChangeExplorerGridDisplayMode.FilesOnly,
];

const TreeFilterText = [
    VCResources.PullRequest_ChangeExplorer_TreeFilter_FullTree,
    VCResources.PullRequest_ChangeExplorer_TreeFilter_FilesByFolder,
    VCResources.PullRequest_ChangeExplorer_TreeFilter_FilesOnly,
];

const TreeFilterTextLong = [
    VCResources.PullRequest_ChangeExplorer_TreeFilter_FullTreeLong,
    VCResources.PullRequest_ChangeExplorer_TreeFilter_FilesByFolderLong,
    VCResources.PullRequest_ChangeExplorer_TreeFilter_FilesOnlyLong,
];

const TreeFilterIcon = [
    "bowtie-icon bowtie-view-list-tree",
    "bowtie-icon bowtie-view-list-group",
    "bowtie-icon bowtie-view-list",
];

const getTypeIndex = (mode: ChangeExplorerGridDisplayMode): number => {
    return TreeFilterType.indexOf(mode);
};

export class TreeFilterSelector extends React.Component<ITreeFilterSelectorProps, {}> {
    public render(): JSX.Element {
        return (
            <div className={"filter-selector vc-pullrequest-tree-filter-container"}>
                <Dropdown
                    className={"vc-pullrequest-tree-filter"}
                    label={""} // no text label next to the dropdown
                    ariaLabel={VCResources.PullRequest_ChangeExplorer_TreeFilter_Label}
                    options={this._getDropdownOptions()}
                    selectedKey={this.props.displayMode}
                    onChanged={this._onFilterChanged}
                    onRenderTitle={this._onRenderTitle} />
            </div>);
    }

    private _getDropdownOptions(): IDropdownOption[] {
        return [
            {
                key: ChangeExplorerGridDisplayMode.FullTree,
                text: TreeFilterTextLong[getTypeIndex(ChangeExplorerGridDisplayMode.FullTree)],
            },
            {
                key: ChangeExplorerGridDisplayMode.FilesByFolder,
                text: TreeFilterTextLong[getTypeIndex(ChangeExplorerGridDisplayMode.FilesByFolder)],
            },
            {
                key: ChangeExplorerGridDisplayMode.FilesOnly,
                text: TreeFilterTextLong[getTypeIndex(ChangeExplorerGridDisplayMode.FilesOnly)],
            },
        ];
    }

    private _onRenderTitle = (): JSX.Element => {
        const filterIcon: string = TreeFilterIcon[getTypeIndex(this.props.displayMode)];
        return (
            <span>
                <i className={filterIcon} />
                {TreeFilterText[getTypeIndex(this.props.displayMode)]}
            </span>);
    }

    private _onFilterChanged = (option: IDropdownOption): void => {
        const newDisplayMode: ChangeExplorerGridDisplayMode = option.key as ChangeExplorerGridDisplayMode;

        if (newDisplayMode !== this.props.displayMode) {
            const options = {
                displayMode: newDisplayMode,
                displayModeChanged: true,
            } as ChangeExplorerGridModeChangedEventArgs;

            if (this.props.onUpdateChangeExplorerOptions) {
                this.props.onUpdateChangeExplorerOptions(options, false);
            }

            const treeFilterChangedEvent = new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                CustomerIntelligenceConstants.COMMENT_FILTER, {
                    "FilterSelected": newDisplayMode,
                    "FilterSelectedText": option.text,
                });
            Telemetry.publishEvent(treeFilterChangedEvent);
        }
    }
}

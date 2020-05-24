/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDOM from "react-dom";
import {
    Dropdown,
    IDropdownOption,
    IDropdownProps,
} from "OfficeFabric/Dropdown";
import { Fabric } from "OfficeFabric/Fabric";
import "VSS/LoaderPlugins/Css!fabric";

import { IFilterComponentProps } from "Presentation/Scripts/TFS/Controls/Filters/Components/IFilterComponent";
import { GitLogHistoryMode } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export class HistoryModeComponent extends React.Component<IFilterComponentProps, {}> {

    public static historyModeCombodropOptions = [
        {
            key: GitLogHistoryMode[GitLogHistoryMode.simplified].toString(),
            text: VCResources.HistoryModeSimplifiedText,
        },
        {
            key: GitLogHistoryMode[GitLogHistoryMode.firstParent].toString(),
            text: VCResources.HistoryModeFirstParentText,
        },
        {
            key: GitLogHistoryMode[GitLogHistoryMode.fullHistory].toString(),
            text: VCResources.HistoryModeFullHistoryText,
        },
        {
            key: GitLogHistoryMode[GitLogHistoryMode.fullHistorySimplifyMerges].toString(),
            text: VCResources.HistoryModeFullHistorySimplifyMergesText,
        },
    ];

    public render(): JSX.Element {
        const dropProps: IDropdownProps = {
            label: null,
            ariaLabel: VCResources.HistoryModeFilterControlText,
            disabled: false,
            options: HistoryModeComponent.historyModeCombodropOptions,
            id: "filter-dropdown",
            onChanged: ((option, index) => {
                if (this.props.onUserInput) {
                    this.props.onUserInput(this.props.filterKey, option.key.toString());
                }
            })
        };
        dropProps.selectedKey = this.props.filterValue ? this.props.filterValue : GitLogHistoryMode[GitLogHistoryMode.simplified].toString();
        return (
            <div className={"history-mode-dropdown"}>
                <Dropdown {...dropProps} />
            </div>
        );
    }
}

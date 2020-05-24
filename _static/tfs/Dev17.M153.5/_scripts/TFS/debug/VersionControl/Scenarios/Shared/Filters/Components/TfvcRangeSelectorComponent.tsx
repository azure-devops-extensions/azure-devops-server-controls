import * as React from "react";
import {
    Dropdown,
    IDropdownProps,
    IDropdownOption,
} from "OfficeFabric/Dropdown";
import "VSS/LoaderPlugins/Css!fabric";

import { IFilterComponentProps } from "Presentation/Scripts/TFS/Controls/Filters/Components/IFilterComponent";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export enum TfvcfilterRange {
    DateRange,
    ChangesetNumberRange,
};

export class TfvcRangeSelectorComponent extends React.Component<IFilterComponentProps, {}> {

    public static comboDropOptions = [
        {
            key: TfvcfilterRange.DateRange.toString(),
            text: VCResources.ChangesetListCreatedDate,
        },
        {
            key: TfvcfilterRange.ChangesetNumberRange.toString(),
            text: VCResources.ChangesetListChangesetNumber,
        },
    ];

    public render(): JSX.Element {
        const dropProps: IDropdownProps = {
            ariaLabel: VCResources.TfvcRangeSelectorLabel,
            options: TfvcRangeSelectorComponent.comboDropOptions,
            id: "filter-dropdown",
            onChanged: ((option: IDropdownOption, index?: number): void => {
                if (this.props.onUserInput) {
                    this.props.onUserInput(this.props.filterKey, option.key.toString());
                }
            }),
        };
        dropProps.selectedKey = this.props.filterValue ? this.props.filterValue : TfvcfilterRange.DateRange.toString();
        return (
            <Dropdown {...dropProps} />
        );
    }
}
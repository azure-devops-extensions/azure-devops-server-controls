import * as React from "react";

import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { ResourcePicker, IResourcePickerOption } from "Build/Scripts/Components/ResourcePicker";

import { BuildStatus } from "TFS/Build/Contracts";

export interface IBuildStatusFilterProps {
    onChanged: (status: BuildStatus) => void;
    selectionOption: BuildStatus;
}

export interface IBuildStatusFilterOption extends IResourcePickerOption {
    data: BuildStatus;
}

export class BuildStatusPicker extends React.Component<IBuildStatusFilterProps, {}> {
    private static _options: IBuildStatusFilterOption[] = [
        {
            key: BuildStatus.All.toString(),
            text: BuildResources.BuildStatusPickerAllOptionText,
            data: BuildStatus.All
        },
        {
            key: BuildStatus.NotStarted.toString(),
            text: BuildResources.BuildStatusPickerNotStartedOptionText,
            data: BuildStatus.NotStarted
        },
        {
            key: BuildStatus.InProgress.toString(),
            text: BuildResources.BuildStatusPickerInProgressOptionText,
            data: BuildStatus.InProgress
        },
        {
            key: BuildStatus.Completed.toString(),
            text: BuildResources.BuildStatusPickerCompletedOptionText,
            data: BuildStatus.Completed
        }
    ];

    public render(): JSX.Element {
        const selectedKey = this.props.selectionOption ? this.props.selectionOption.toString() : "";
        return <ResourcePicker
            selectedKey={selectedKey}
            options={BuildStatusPicker._options}
            onChanged={this._onChanged}
            ariaLabel={BuildResources.BuildStatusPickerAriaLabel}
            onClearProps={{
                onClear: this._onClear,
                ariaLabel: BuildResources.ClearBuildStatusAriaLabel
            }}
        />;
    }

    private _onChanged = (option: IBuildStatusFilterOption, index: number) => {
        this.props.onChanged(option.data);
    }

    private _onClear = () => {
        this.props.onChanged(BuildStatus.All);
    }
}

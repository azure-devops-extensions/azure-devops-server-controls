import * as React from "react";

import * as Utils_String from "VSS/Utils/String";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { ComboBox, IComboBoxOption, SelectableOptionMenuItemType } from "OfficeFabric/ComboBox";
import { BaseComponent, IBaseProps } from "OfficeFabric/Utilities";

export interface ILinkTypeComboBoxProps extends IBaseProps {
    /**
     * The map of friendly tool name to link type
     */
    toolTypeToLinkTypeMap: { [toolType: string]: string[] };
    /**
     * The selected link type
     */
    selected: string;
    /**
     * Event fired when the link type changes
     */
    onChanged: (value: string) => void;
    /**
     * Is the component in an error state
     */
    error?: boolean;
}

export class LinkTypeComboBox extends BaseComponent<ILinkTypeComboBoxProps> {
    private _lastOptionValue: string;

    public render(): JSX.Element {
        const { toolTypeToLinkTypeMap, selected, error } = this.props;

        let toolTypes: string[] = Object.keys(toolTypeToLinkTypeMap);
        toolTypes = toolTypes.sort(Utils_String.localeIgnoreCaseComparer);

        const comboBoxOptions: IComboBoxOption[] = [];
        toolTypes.forEach((toolType: string, index: number) => {
            comboBoxOptions.push({
                key: `Header-${toolType}`,
                text: toolType,
                itemType: SelectableOptionMenuItemType.Header
            });
            toolTypeToLinkTypeMap[toolType].forEach((linkType: string) => {
                comboBoxOptions.push({
                    key: linkType,
                    text: linkType,
                });
            });
            if (index < toolTypes.length - 1) {
                comboBoxOptions.push({
                    key: `Divider-${toolType}`,
                    text: "-",
                    itemType: SelectableOptionMenuItemType.Divider
                });
            }
        });

        return (
            <ComboBox
                className="link-type-combobox"
                calloutProps={{
                    calloutMaxHeight: 420,
                }}
                styles={{
                    label: "link-type-combobox-label"
                }}
                label={Resources.LinkToExistingDialogLinkTypeTitle}
                ariaLabel={Resources.LinkToExistingDialogLinkTypeTitle}
                allowFreeform={true}
                text={!error && selected}
                autoComplete="on"
                onPendingValueChanged={this._onPendingValueChanged}
                options={comboBoxOptions}
                onChanged={this._onChanged}
                useComboBoxAsMenuWidth={true}
                errorMessage={error && Resources.LinkDialogTypeNotValid}
            />
        );
    }

    private _onPendingValueChanged = (option?: IComboBoxOption, index?: number, value?: string) => {
        const { onChanged } = this.props;
        // OF ComboBox onPendingValueChange does not pass option if option has not changed
        if (option) {
            const { text: linkType } = option;
            this._lastOptionValue = linkType;
            onChanged(linkType);
        } else if (value && (!this._lastOptionValue ||
            !Utils_String.startsWith(this._lastOptionValue, value, Utils_String.localeIgnoreCaseComparer))) {
            this._lastOptionValue = null;
            onChanged(value);
        }
    }

    private _onChanged = (option?: IComboBoxOption, index?: number, value?: string) => {
        const { onChanged } = this.props;
        if (option) {
            const { text: linkType } = option;
            onChanged(linkType);
        } else {
            onChanged(value);
        }
    }
}

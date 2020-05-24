import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!Admin/Scripts/BacklogLevels/Components/AddNewWorkItemType";

import * as React from "react";

import { DefaultButton } from "OfficeFabric/Button";
import { TextField } from "OfficeFabric/TextField";
import { autobind } from "OfficeFabric/Utilities";

import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";
import { ActionsCreator } from "Admin/Scripts/BacklogLevels/Actions/ActionsCreator";
import { BacklogLevelUtils } from "Admin/Scripts/BacklogLevels/BacklogLevelUtils";
import { ErrorMessage } from "Admin/Scripts/BacklogLevels/Components/ErrorComponent";
import { ColorPicker } from "Admin/Scripts/Components/ColorPicker";
import { IconUtils } from "Admin/Scripts/Common/IconUtils";
import { IconPicker } from "Admin/Scripts/Components/IconPicker";

import { WorkItemTypeColorAndIcons } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";

export interface Props {
    actionsCreator: ActionsCreator;
    name: string;
    color: string;
    icon: string;
}

export interface State {
    name: string;
    color: string;
    icon: string;
}

export class AddNewWorkItemType extends React.Component<Props, State> {
    private _firstLoad: boolean = true;

    constructor(props: Props) {
        super(props);
        this.state = {
            name: props.name || "",
            color: props.color,
            icon: props.icon,
        };
    }

    public render(): JSX.Element {
        const onEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.which === $.ui.keyCode.ENTER &&
                !this._isInvalidName()) {
                this._submit();
            }
        };

        const isInvalid = this._isInvalidName();

        return (
            <div className="add-new-work-item-type-inputs-container">
                <TextField
                    className="name-textfield-container"
                    autoFocus
                    onChanged={this._onNameChanged}
                    value={this.state.name}
                    onKeyPress={onEnter}
                    ariaLabel={AdminResources.BacklogLevelDialog_WorkItemTypeNameInputLabel}
                    inputClassName={(!this._firstLoad && isInvalid) ? "ms-TextField-invalid" : null}
                />

                <ColorPicker
                    ariaLabelPrefix={AdminResources.WorkItemTypeColorComboAriaLabel}
                    className="color-picker-container"
                    color={this.state.color}
                    onChanged={this._onColorChanged}
                    tooltipContainerClassName="ms-Layer-content"
                />

                <IconPicker
                    selectedIcon={this.state.icon}
                    icons={WorkItemTypeColorAndIcons.ICON_NAME_MAPPINGS}
                    onChanged={this._onIconChanged} />

                <div className="add-new-work-item-type-button-container">
                    <DefaultButton disabled={this._isInvalidName()} onClick={this._submit}>{AdminResources.Add}</DefaultButton>
                </div>
                <div className="add-new-work-item-type-button-container">
                    <DefaultButton onClick={() => this.props.actionsCreator.dialogCancelClientOnlyWorkItemType()}>{AdminResources.Cancel}</DefaultButton>
                </div>
                {this._renderValidaitonError()}
            </div>
        );
    }

    @autobind
    private _submit(): void {
        this.props.actionsCreator.dialogSaveClientOnlyWorkItemType(this.state.name, this.state.color, this.state.icon);
    }

    @autobind
    private _isInvalidName(): boolean {
        if (BacklogLevelUtils.isNameWhitespace(this.state.name) ||
            !BacklogLevelUtils.isNameValid(this.state.name)) {
            return true;
        }
        else {
            return false;
        }
    }

    private _renderValidaitonError(): JSX.Element {
        if (this._firstLoad) {
            // We want to only show the validation error after the user has already started typing
            return null;
        }

        var msg: string;
        if (BacklogLevelUtils.isNameWhitespace(this.state.name)) {
            msg = AdminResources.BacklogLevelDialog_WorkItemTypeNameEmpty;
        }
        else if (!BacklogLevelUtils.isNameValid(this.state.name)) {
            msg = AdminResources.InvalidCharInBacklogLevelName;
        }
        else {
            return null;
        }
        return (
            <ErrorMessage message={msg} />
        );
    }

    @autobind
    private _onNameChanged(name: string): void {
        this._firstLoad = false;
        this.setState({
            ...this.state,
            name: name,
        });
    }

    @autobind
    private _onColorChanged(color: string): void {
        this.setState({
            ...this.state,
            color: color,
        });
    }

    @autobind
    private _onIconChanged(icon: string): void {
        this.setState({
            ...this.state,
            icon: icon,
        });
    }
}

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!Admin/Scripts/BacklogLevels/Components/BacklogLevelDialog";

import * as React from "react";

import { Fabric } from "OfficeFabric/Fabric";
import * as Dialog from "OfficeFabric/Dialog";
import * as TextField from "OfficeFabric/TextField";
import * as CheckBox from "OfficeFabric/Checkbox";
import * as Dropdown from "OfficeFabric/Dropdown";
import * as Button from "OfficeFabric/Button";
import * as Tooltip from "VSSUI/Tooltip";

import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";
import * as Interfaces from "Admin/Scripts/BacklogLevels/Interfaces";
import { ActionsCreator } from "Admin/Scripts/BacklogLevels/Actions/ActionsCreator";
import * as ErrorComponent from "Admin/Scripts/BacklogLevels/Components/ErrorComponent";
import * as AddNewWorkItemType from "Admin/Scripts/BacklogLevels/Components/AddNewWorkItemType";
import { WorkItemTypeIconComponent } from "Admin/Scripts/Components/WorkItemTypeIconComponent";
import { IconUtils } from "Admin/Scripts/Common/IconUtils";

import { BaseControl } from "VSS/Controls";
import * as Utils_String from "VSS/Utils/String";

import * as ColorPicker from "Presentation/Scripts/TFS/TFS.UI.Controls.ColorPicker";


export interface Props {
    actionsCreator: ActionsCreator;
    hierarchy: Interfaces.IBacklogLevelHierarchy;
    dialogData: Interfaces.IDialogState;
}


export class BacklogLevelDialog extends React.Component<Props, null> {
    // Add dialogs on the Backlog Levels Admin Page will have this class (shared styling)
    public static BACKLOG_LEVEL_DIALOG_CLASS: string = "backlog-level-dialog";
    private static COLOR_PICKER_CONTAINER_CLASS: string = "backlog-color-picker-container";

    private _colorPicker: ColorPicker.DefinedPaletteColorPickerControl;

    private _comingFromTempWit: boolean;
    private _autofocusAddWorkItemTypeButton: boolean;

    public render(): JSX.Element {
        let data = this.props.dialogData;

        var dialogProps: Dialog.IDialogProps = {
            isOpen: true,
            type: Dialog.DialogType.normal,
            containerClassName: `${BacklogLevelDialog.BACKLOG_LEVEL_DIALOG_CLASS} bowtie-fabric`,
            isBlocking: !data.showCancelConfirmation,
            title: data.backlogLevel ? AdminResources.BacklogLevels_Editbacklog_DialogTitle : AdminResources.BacklogLevels_AddPortfolioBacklog_DialogTitle,
            onDismiss: () => this._closeDialog()
        };
        let fields = data.defaultFieldNames;
        if (!!data.backlogLevel && !!data.backlogLevel.fields) {
            fields = data.backlogLevel.fields
                .map((field) => field.name)
                .sort((f, f1) => Utils_String.ignoreCaseComparer(f, f1));
        }
        let fieldString = fields.join(",");

        return (
            <Fabric>
                <Dialog.Dialog {...dialogProps}>
                    <div className="backlog-levels-error-component">
                        <ErrorComponent.ErrorMessageBar errors={this.props.dialogData.errors} onDismiss={() => this.props.actionsCreator.dismissDialogError()} />
                    </div>
                    <div className="backlog-levels-dialog-content">
                        <p>{Utils_String.format(AdminResources.BacklogLevelDialog_AddtionalFieldsSubtext, data.groupName, fieldString)}</p>
                        {this._renderBacklogLevelPrimarySection()}
                        <div className="work-item-types-container">
                            <div className="ms-font-m ms-fontColor-neutralSecondary ms-fontWeight-semibold">{AdminResources.BacklogLevelDialog_WorkItemTypesHeading}</div>
                            {this._renderWorkItemTypes()}
                            {this._renderAddNewWorkItemTypeComponent()}
                        </div>
                        {this._renderDefaultWorkItemTypeSection()}
                    </div>
                    <Dialog.DialogFooter>
                        <Button.PrimaryButton
                            disabled={!data.isDirty || !!data.validationError || data.isLoading || !!this.props.dialogData.userAddedWorkItemType}
                            onClick={() => this.props.actionsCreator.saveBacklogLevel(this.props.hierarchy, data)}>
                            {data.isLoading ? AdminResources.SavingProgress : AdminResources.Save}
                        </Button.PrimaryButton>
                        <Button.DefaultButton disabled={data.isLoading} onClick={() => this._closeDialog()}>{AdminResources.Cancel}</Button.DefaultButton>
                    </Dialog.DialogFooter>
                    {/* Dialogs must be within each other, not side by side else stack overflow */}
                    {this._renderConfirmationDialog()}
                </Dialog.Dialog>
            </Fabric>
        );
    }

    public componentWillReceiveProps?(nextProps: Props, nextContext: any): void {
        // TODO: Clean this up when the shared state/props is fixed
        this._autofocusAddWorkItemTypeButton = false;
        if (!nextProps.dialogData.userAddedWorkItemType && this._comingFromTempWit) {
            this._autofocusAddWorkItemTypeButton = true;
            this._comingFromTempWit = false;
        }
        else if (nextProps.dialogData.userAddedWorkItemType) {
            this._comingFromTempWit = true;
        }
    }

    private _renderBacklogLevelPrimarySection(): JSX.Element {
        let data = this.props.dialogData;
        let container = null;

        if (data.backlogLevel && data.backlogLevel.type === Interfaces.BacklogLevelType.Tasks) {
            container = (
                <div className="backlog-name-color-container" >
                    {data.name}
                </div>
            );
        }
        else {
            container = (
                <div className="backlog-name-color-container" >
                    <span className="bowtie-icon bowtie-backlog" style={{ color: `#${data.color}` }}></span>
                    <TextField.TextField
                        className="name-textfield-container"
                        onChanged={(name: string) => this.props.actionsCreator.dialogSetBacklogName(name)}
                        value={data.name}
                        disabled={data.isLoading}
                        ariaLabel={AdminResources.BacklogLevelDialog_BacklogNameInputLabel}
                        inputClassName={data.validationError ? "ms-TextField-invalid" : null}
                    />
                    <div className={BacklogLevelDialog.COLOR_PICKER_CONTAINER_CLASS}></div>
                    <div className="name-color-error-container">
                        {data.validationError ? <ErrorComponent.ErrorMessage message={data.validationError} /> : null}
                    </div>
                </div>
            );
        }

        return (
            <div className="backlog-level-primary-section-container">
                <div className="ms-font-m ms-fontColor-neutralSecondary ms-fontWeight-semibold">{AdminResources.BacklogLevelDialog_BacklogHeading}</div>
                {container}
            </div>
        );
    }

    private _shouldRenderBacklogColor(backlogLevel: Interfaces.IBacklogLevel): boolean {
        if (!backlogLevel) {
            //   Show colors when adding a new backlog
            return true;
        } else {
            //   We don't show colors for iteration backlogs.
            return backlogLevel.type !== Interfaces.BacklogLevelType.Tasks;
        }
    }

    private _renderWorkItemTypes(): JSX.Element {
        const data = this.props.dialogData;
        const workItemTypes = data.workItemTypes.concat(data.newWorkItemTypes);
        return (
            workItemTypes.length > 0 ?
                <div className="work-item-types">
                    {
                        workItemTypes.map(wit => {
                            var isDisabled: boolean = !wit.isCustom || data.isLoading;
                            var props: CheckBox.ICheckboxProps = {
                                defaultChecked: wit.isSelected,
                                disabled: isDisabled,
                                label: (
                                    <span className="work-item-type-name">
                                        <WorkItemTypeIconComponent colorClass="bowtie-work-item-bar" icon={wit.icon} color={wit.color} />
                                        {wit.name + (wit.isDisabled ? ` ${AdminResources.BacklogLevels_DisabledWorkItemType_Suffix}` : "")}
                                    </span> as any
                                ),
                                onChange: (ev?: React.FormEvent<HTMLInputElement>, checked?: boolean) => this.props.actionsCreator.dialogChangeWorkItemTypeSelection(wit.name, checked, wit.id)
                            };
                            if (!wit.isCustom) {
                                var tooltipProps: Tooltip.ITooltipHostProps = {
                                    content: AdminResources.BacklogLevelDialog_InheritedWorkItemTypeCheckboxTooltip
                                };
                                return (
                                    <div key={wit.name}>
                                        <Tooltip.TooltipHost {...tooltipProps}>
                                            <CheckBox.Checkbox {...props as any} />
                                        </Tooltip.TooltipHost>
                                    </div>
                                );
                            }
                            else {
                                return (
                                    <div key={wit.name}>
                                        <CheckBox.Checkbox {...props as any} />
                                    </div>
                                );
                            }
                        })
                    }
                </div> : null
        );
    }

    private _renderAddNewWorkItemTypeComponent(): JSX.Element {
        let data = this.props.dialogData;
        if (!data.userAddedWorkItemType) {
            var props: Button.IButtonProps = {
                className: "add-new-work-item-type-button",
                iconProps: { iconName: "Add" },
                onClick: () => this.props.actionsCreator.dialogAddNewClientOnlyWorkItemTypeClicked(),
                disabled: data.isLoading,
                autoFocus: this._autofocusAddWorkItemTypeButton
            };

            return (
                <div className="add-new-work-item-type-container">
                    <Button.CommandButton {...props}>
                        {AdminResources.NewWitButton}
                    </Button.CommandButton>
                </div>
            );
        }
        else {
            return (
                <div className="add-new-work-item-type-container">
                    <AddNewWorkItemType.AddNewWorkItemType actionsCreator={this.props.actionsCreator} {...data.userAddedWorkItemType} />
                </div>
            );
        }
    }

    private _renderDefaultWorkItemTypeSection(): JSX.Element {
        const data = this.props.dialogData;
        let props: Dropdown.IDropdownProps = {
            label: <span className="ms-font-m ms-fontColor-neutralSecondary ms-fontWeight-semibold">{AdminResources.BacklogLevelDialog_DefaultWorkItemTypeLabel}</span> as any,
            onChanged: (option: Dropdown.IDropdownOption, index?: number) => this.props.actionsCreator.dialogSetDefaultWorkItemType(option.text),
            disabled: data.isLoading
        };
        var selectedWits: Interfaces.IDialogWorkItemType[] = data.workItemTypes.concat(data.newWorkItemTypes).filter(wit => wit.isSelected);

        if (selectedWits.length > 0) {
            props.options = selectedWits.map(wit => { return { key: wit.name, text: wit.name, selected: wit.isDefault } as Dropdown.IDropdownOption });
        }
        else {
            props.disabled = true;
        }

        return (
            <div className="default-work-item-type-section">
                <Dropdown.Dropdown {...props} />
            </div>
        );
    }

    private _closeDialog() {
        this.props.actionsCreator.cancelEditDialogClicked();
    }

    private _renderConfirmationDialog(): JSX.Element {
        let data = this.props.dialogData;

        if (data.showCancelConfirmation) {
            var dialogProps: Dialog.IDialogProps = {
                isOpen: true,
                type: Dialog.DialogType.normal,
                containerClassName: BacklogLevelDialog.BACKLOG_LEVEL_DIALOG_CLASS,
                isBlocking: true,
                title: AdminResources.BacklogLevels_ConfirmCancel_DialogTitle,
                onDismiss: () => this.props.actionsCreator.discardDialogChanges(false)
            };
            return (
                <Dialog.Dialog {...dialogProps}>
                    {AdminResources.BacklogLevelDialog_CancelConfirmationDialogWarning}
                    <Dialog.DialogFooter>
                        <Button.PrimaryButton onClick={() => this.props.actionsCreator.discardDialogChanges(true)}>{AdminResources.DialogOkButton}</Button.PrimaryButton>
                        <Button.DefaultButton onClick={() => this.props.actionsCreator.discardDialogChanges(false)}>{AdminResources.Cancel}</Button.DefaultButton>
                    </Dialog.DialogFooter>
                </Dialog.Dialog>
            );
        }
        else {
            return null;
        }
    }

    public componentDidMount(): void {
        let data = this.props.dialogData;

        let color = data.color ? `#${data.color}` : null;
        // first render after loading is complete should create the control
        // Include color picker
        let $colorContainer = $(`.${BacklogLevelDialog.COLOR_PICKER_CONTAINER_CLASS}`).addClass("color-picker-container");

        let options = {
            tagName: "div",
            template: ColorPicker.PaletteTemplate.Full,
            onColorSelected: (source: ColorPicker.IColorPickerControl, color: ColorPicker.AccessibilityColor) => {
                this.props.actionsCreator.dialogSetBacklogColor(color.asHex().slice(1));
            },
            defaultColor: color ? new ColorPicker.AccessibilityColor(color) : null,
            allowNonPaletteDefaultColor: true,
        };
        this._colorPicker = BaseControl.create<ColorPicker.DefinedPaletteColorPickerControl, any>(ColorPicker.DefinedPaletteColorPickerControl, $colorContainer, options, { ariaLabel: AdminResources.BacklogLevelDialog_BacklogColorInputLabel });

        // do an initial refresh in case it is needed
        this.componentDidUpdate();
    }

    public componentWillUnmount(): void {

        if (this._colorPicker) {
            this._colorPicker.dispose();
            this._colorPicker = null;
        }
    }

    public componentDidUpdate(): void {
        let data = this.props.dialogData;

        if (this._colorPicker && data.color) {
            this._colorPicker.setColor(new ColorPicker.AccessibilityColor(`#${data.color}`));
        }
        if (this._colorPicker) {
            this._colorPicker.enableElement(!data.isLoading);
        }
    }

    public dispose() {
        if (this._colorPicker) {
            this._colorPicker.dispose();
            this._colorPicker = null;
        }
    }
}

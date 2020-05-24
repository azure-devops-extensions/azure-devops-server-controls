import * as React from "react";
import "VSS/LoaderPlugins/Css!Agile/Scripts/SprintsHub/Capacity/Components/DaysOffDialog";
import { IFormFieldState } from "Agile/Scripts/Common/ValidationContracts";
import * as CapacityPivotResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.CapacityPivot";
import { IDaysOff, IUser } from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import { DaysOffDialogRow } from "Agile/Scripts/SprintsHub/Capacity/Components/DaysOffDialogRow";
import { getTotalDaysOff } from "Agile/Scripts/SprintsHub/Capacity/DaysOffUtils";
import * as Button from "OfficeFabric/Button";
import * as Dialog from "OfficeFabric/Dialog";
import { Label } from "OfficeFabric/Label";
import { List } from "OfficeFabric/List";
import { IdentityHelper } from "Presentation/Scripts/TFS/TFS.OM.Identities";
import * as Utils_String from "VSS/Utils/String";

export interface IDaysOffDialogProps {
    /** The days off to initially render this dialog */
    daysOff: IDaysOff[];

    /** The current user for this dialog. If null, this dialog is for team days off */
    currentUser?: IUser;

    /** A validation function to calculate the net days off  */
    dateRangeValidator: (currentState: IFormFieldState<IDaysOff>[], indexModified: number, newStart: Date, newEnd: Date) => IFormFieldState<IDaysOff>[];

    /** A function to validate days off */
    validateDaysOff: (daysOff: IDaysOff[]) => IFormFieldState<IDaysOff>[];

    /** Callback on dismiss of dialog */
    onDismiss: () => void;

    /** Callback upon save of dialog with new settings */
    onSave: (newDaysOff: IDaysOff[], user?: IUser) => void;

    /** Optional flag to hide this dialog */
    isHidden?: boolean;

}

export interface IDaysOffDialogState {
    daysOffRows: IFormFieldState<IDaysOff>[];
}

export class DaysOffDialog extends React.Component<IDaysOffDialogProps, IDaysOffDialogState> {
    private _focusedRow: number;

    constructor(props: IDaysOffDialogProps) {
        super(props);

        this.state = {
            daysOffRows: props.daysOff.length > 0 ? this.props.validateDaysOff(props.daysOff) : [this._getEmptyDaysOffRow()]
        };

        this._focusedRow = 0;
    }

    public render(): JSX.Element {
        let title: string = "";
        const {
            currentUser,
            isHidden
        } = this.props;

        if (currentUser) {
            const identity = IdentityHelper.parseUniquefiedIdentityName(currentUser.displayName);
            title = Utils_String.format(CapacityPivotResources.Dialog_DaysOffForPerson, identity.displayName);
        } else {
            title = CapacityPivotResources.Dialog_DaysOffForEntireTeam;
        }

        const dialogProps: Dialog.IDialogProps = {
            dialogContentProps: {
                type: Dialog.DialogType.close,
                showCloseButton: true,
                className: "capacity-days-off-dialog"
            },
            modalProps: {
                isBlocking: true,
                containerClassName: "capacity-days-off-dialog-container",
                className: "capacity-days-off-modal"
            },
            title: title,
            onDismiss: this._onDialogDismissed,
            hidden: isHidden
        };

        return (
            <Dialog.Dialog {...dialogProps}>
                <div className="capacity-days-off-dialog-header capacity-days-off-row">
                    <Label className="capacity-column-date">{CapacityPivotResources.Header_StartDate}</Label>
                    <Label className="capacity-column-date">{CapacityPivotResources.Header_EndDate}</Label>
                    <div className="capacity-column-days-off">
                        <Label>{CapacityPivotResources.Header_DaysOff}</Label>
                    </div>
                    <div className="capacity-column-remove-placeholder" />
                </div>
                <form onSubmit={this._onDialogSaved}>
                    {this.renderDaysOffForm()}
                    {this.renderDialogFooter()}
                </form>
            </Dialog.Dialog>
        );
    }

    private _getEmptyDaysOffRow(): IFormFieldState<IDaysOff> {
        return {
            pristine: true,
            value: {
                start: null,
                end: null,
                netDaysOff: 0
            },
            validationResult: {
                isValid: false,
                errorMessage: CapacityPivotResources.Dialog_StartDateRequired
            },
            key: new Date().getTime().toString()
        } as IFormFieldState<IDaysOff>;
    }

    private renderDaysOffForm(): JSX.Element {
        const addAdditionalDaysButtonProps: Button.IButtonProps = {
            className: "capacity-add-additional-day-button",
            iconProps: { iconName: "Add" },
            disabled: !this._isDataValid(),
            onClick: this._addAdditionalDay
        };

        const {
            daysOffRows
        } = this.state;

        return (
            <div
                className="capacity-days-off-form"
                data-is-scrollable={true}
            >
                <List
                    className="capacity-days-off-grid"
                    items={daysOffRows}
                    onRenderCell={this.renderDayOffRow}
                />
                <div className="capacity-days-off-grid-summary">
                    <Button.ActionButton {...addAdditionalDaysButtonProps}>
                        {CapacityPivotResources.Dialog_AddAdditionalDaysOff}
                    </Button.ActionButton>
                    <div className="daysoff-summary">
                        <Label className="capacity-days-off-total">{CapacityPivotResources.Total}</Label>
                        <Label className="capacity-days-off-total">{getTotalDaysOff(daysOffRows.map((d) => d.value))}</Label>
                    </div>
                    <div className="capacity-column-remove-placeholder" />
                </div>
            </div>
        );
    }

    private _addAdditionalDay = () => {
        const {
            daysOffRows
        } = this.state;

        const newRows = [...daysOffRows, this._getEmptyDaysOffRow()];
        this._focusedRow = newRows.length - 1;
        this.setState({ daysOffRows: newRows });
    }

    private renderDayOffRow = (daysOff: IFormFieldState<IDaysOff>, index: number): JSX.Element => {
        const focus = index === this._focusedRow;
        if (focus) {
            this._focusedRow = -1;
        }

        return (
            <DaysOffDialogRow
                key={daysOff.key} // Using the key for pristine rows to clear the errors when we remove a row with errors
                autoFocus={focus}
                daysOff={daysOff}
                index={index}
                onChanged={this.onDateSelectionChanged}
                onRemove={this._onDaysOffRemoved}
                isLastRow={index === (this.state.daysOffRows.length - 1)}
            />
        );
    }

    private _onDaysOffRemoved = (index: number): void => {
        let daysOffRows = this.state.daysOffRows.slice(0);
        daysOffRows.splice(index, 1);
        if (daysOffRows.length === 0) {
            daysOffRows = [this._getEmptyDaysOffRow()];
        }

        this._focusedRow = index;
        if (this._focusedRow >= daysOffRows.length) {
            this._focusedRow = daysOffRows.length - 1;
        }
        this.setState({
            daysOffRows: daysOffRows
        });
    }

    private renderDialogFooter(): JSX.Element {
        const isSubmitDisabled = this._isSubmitDisabled();

        return (
            <Dialog.DialogFooter>
                <Button.PrimaryButton
                    type="submit"
                    disabled={isSubmitDisabled}
                >
                    {CapacityPivotResources.OK}
                </Button.PrimaryButton>
                <Button.DefaultButton
                    disabled={false}
                    onClick={this._onDialogDismissed}
                >
                    {CapacityPivotResources.Cancel}
                </Button.DefaultButton>
            </Dialog.DialogFooter>
        );
    }

    /**
     * Is every row valid, with the last row optionally being empty?
     */
    protected _isSubmitDisabled(): boolean {
        const {
            daysOffRows
        } = this.state;

        return daysOffRows.some(d => !d.validationResult.isValid && !d.pristine);
    }

    /**
     * Does every row contain valid data?
     */
    private _isDataValid() {
        const {
            daysOffRows
        } = this.state;

        return daysOffRows.every(d => d.validationResult.isValid);
    }

    private _onDialogDismissed = () => {
        if (this.props.onDismiss) {
            this.props.onDismiss();
        }
    }

    protected _onDialogSaved = (event: React.FormEvent<HTMLFormElement>): boolean => {

        const daysOffRows = this.state.daysOffRows.filter((d) => d.value.start && d.value.end);
        this.props.onSave(daysOffRows.map((d) => d.value), this.props.currentUser);

        event.preventDefault();
        event.stopPropagation();

        return false;
    }

    private onDateSelectionChanged = (index: number, newStartDate: Date, newEndDate: Date): void => {
        const {
            daysOffRows
        } = this.state;

        // Autofill in the end date when user chooses a start date on an empty row.
        // There is a bug in Office Fabric DatePicker (Issue #3574) where setting the state
        // of the picker to today does not trigger a re-render.  This means if the user selects
        // start date today the end date will appear blank.  US 1145400 tracking the fix in Office Fabric.
        if (!this.state.daysOffRows[index].value.end && !newEndDate) {
            newEndDate = newStartDate;
        }

        // Run validation on the changed dates
        const newRows = this.props.dateRangeValidator([...daysOffRows], index, newStartDate, newEndDate);

        this.setState({ daysOffRows: newRows });
    }
}
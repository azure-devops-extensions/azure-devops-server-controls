import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/SprintsHub/SprintEditor/Components/SprintEditorForm";
import { SprintsHubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { IterationDateUtil } from "Agile/Scripts/Common/IterationDateUtil";
import { IFormFieldState, IValidationResult } from "Agile/Scripts/Common/ValidationContracts";
import * as SprintEditorResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.SprintEditor";
import { SprintEditorFormValidators } from "Agile/Scripts/SprintsHub/SprintEditor/Components/SprintEditorFormValidators";
import { SprintEditorUsageTelemetryConstants } from "Agile/Scripts/SprintsHub/SprintEditor/SprintEditorTelemetryConstants";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { DatePicker } from "OfficeFabric/DatePicker";
import { ILabelProps, Label } from "OfficeFabric/Label";
import { Link } from "OfficeFabric/Link";
import { Spinner } from "OfficeFabric/Spinner";
import { ITextField, TextField } from "OfficeFabric/TextField";
import { BaseComponent, css, getId, IBaseProps, IRenderFunction } from "OfficeFabric/Utilities";
import { DirectionalHint, InfoIcon } from "Presentation/Scripts/TFS/Components/InfoIcon";
import { INode, INodeStructureType } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { DayOfWeek } from "VSS/Common/Contracts/System";
import * as Culture from "VSS/Utils/Culture";
import * as DateUtilities from "VSS/Utils/Date";
import * as StringUtilities from "VSS/Utils/String";
import { TreePicker } from "VSSPreview/Controls/TreePicker";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import { datePickerStrings } from "VSSPreview/OfficeFabric/Helpers";
import { VssIconType } from "VSSUI/VssIcon";
import { NodeHelpers } from "WorkItemTracking/Scripts/Utils/NodeHelpers";

export interface ISprintEditorFormProps extends IBaseProps {
    /** Are we fetching iteration information */
    isFetching: boolean;
    /** Are we current creating a sprint editor */
    isCreating: boolean;
    /** The next suggested iteration path */
    nextSuggestedIterationPath: string;
    /** The iteration hierarchy */
    projectIterationHierarchy: INode;
    /** The selected team"s backlog iteration */
    selectedTeamBacklogIteration: INode;
    /** The selected team's days off */
    selectedTeamDaysOff: DayOfWeek[];
    /** The current selected iterations for the selected team */
    selectedTeamIterationPaths: string[];
    /** The suggested parent node */
    suggestedParentNode: INode;
    /** The optional, current iteration that is being edited */
    editingIteration?: INode;
    /** Callback for when a user cancels the form */
    onCancel: () => void;
    /** Callback for when a new iteration is created */
    onCreateIteration: (name: string, startDate: Date, endDate: Date, iterationPath: string) => void;
    /** Callback for when an existing iteration is edited */
    onEditIteration: (iteration: INode, name: string, startDate: Date, endDate: Date) => void;
    /** Callback for when an iteration is selected */
    onSelectIteration: (iterationPath: string) => void;
    /** Callback for when the iteration name changes */
    onIterationNameChanged?: (name: string) => void;
}

export interface ISprintEditorFormState {
    /** The current iteration creation choice */
    formMode: IterationFormMode;
    /** The selected iteration field state(for selecting an existing iteration) */
    selectedIterationPathField: IFormFieldState<{ path: string, node?: INode }>;
    /** The parent iteration field state (for creating a new iteration) */
    parentIterationPathField: IFormFieldState<{ path: string, node?: INode }>;
    /** The name field state for the new iteration */
    nameField: IFormFieldState<string>;
    /** The start date field state for the new iteration */
    startDateField: IFormFieldState<Date>;
    /** The end date field state for the new iteration */
    endDateField: IFormFieldState<Date>;
    /** Information for autcompleting iteration dates */
    suggestedDateInformation: INewSprintSuggestedDateInformation;
}

export const enum IterationFormMode {
    /** Select an existing iteration */
    SelectExisting = "select",
    /** Create a new iteration */
    CreateNew = "create",
    /** Edit an existing iteration */
    Edit = "edit"
}

/**
 * Type which consolidates all the validation information for this form
 */
type SprintEditorFormValidationResults = {
    nameField: IValidationResult;
    endDateField: IValidationResult;
    startDateField: IValidationResult;
    parentIterationPathField: IValidationResult;
    selectedIterationPathField: IValidationResult;
};

export interface INewSprintSuggestedDateInformation {
    /** The suggested start date, in UTC */
    suggestedStartDateUTC: Date;
    /** The number of working days in the previous iteration */
    workingDaysOffset: number;
}

/**
 * Form for collecting information needed to create a sprint editor
 */
export class SprintEditorForm extends BaseComponent<ISprintEditorFormProps, ISprintEditorFormState> {
    private _nameField: ITextField;
    private _selectionPicker: TreePicker<INode>;
    private _selectedIterationFieldInfoId: string;

    constructor(props: ISprintEditorFormProps, context?: any) {
        super(props, context);

        const isEditing = props.editingIteration != null;
        let fieldState;
        let nextSuggestedNode;

        if (isEditing) {
            fieldState = this._getEditFieldState(props);
        } else {
            fieldState = this._getNewFieldState(props);
            nextSuggestedNode = props.nextSuggestedIterationPath ? NodeHelpers.findByPath(props.projectIterationHierarchy, props.nextSuggestedIterationPath) : null;
            if (nextSuggestedNode) {
                this._onIterationNameChanged(nextSuggestedNode.name, props);
            }
        }

        this.state = {
            suggestedDateInformation: this._computeSuggestedDateInformation(props.suggestedParentNode, props.selectedTeamDaysOff),
            formMode: props.editingIteration ? IterationFormMode.Edit : (props.nextSuggestedIterationPath ? IterationFormMode.SelectExisting : IterationFormMode.CreateNew),
            selectedIterationPathField: {
                value: props.nextSuggestedIterationPath ?
                    { path: props.nextSuggestedIterationPath, node: nextSuggestedNode }
                    :
                    { path: null, node: null },
                validationResult: { isValid: true },
                pristine: true
            },
            ...fieldState
        };

        this._selectedIterationFieldInfoId = getId("sprint-editor-form");
    }

    public focusInitialElement(): void {
        const {
            formMode
        } = this.state;

        if (formMode === IterationFormMode.CreateNew) {
            if (this._nameField) {
                this._nameField.focus();
            }
        } else {
            if (this._selectionPicker) {
                this._selectionPicker.focus();
            }
        }
    }

    public componentWillMount(): void {
        // Set initial form validation results
        this._validateForm();
    }

    public componentWillReceiveProps(nextProps: ISprintEditorFormProps): void {
        let shouldValidate: boolean = false;

        // If the parent iteration field is null, default it to the root node of the iteration hierarchy
        if (this.props.suggestedParentNode !== nextProps.suggestedParentNode && nextProps.suggestedParentNode && !this.state.parentIterationPathField.value.path) {
            this.setState({
                parentIterationPathField: {
                    ...this.state.parentIterationPathField,
                    value: { path: NodeHelpers.getPath(nextProps.suggestedParentNode, 1), node: nextProps.suggestedParentNode }
                },
                suggestedDateInformation: this._computeSuggestedDateInformation(nextProps.suggestedParentNode, nextProps.selectedTeamDaysOff)
            });
            shouldValidate = true;
        } else if (this.props.selectedTeamDaysOff !== nextProps.selectedTeamDaysOff) {
            this.setState({
                suggestedDateInformation: this._computeSuggestedDateInformation(nextProps.projectIterationHierarchy, nextProps.selectedTeamDaysOff)
            });
        }

        // If the suggested iteration path has changed, update it
        if (this.props.nextSuggestedIterationPath !== nextProps.nextSuggestedIterationPath && nextProps.nextSuggestedIterationPath) {
            const nextSuggestedNode = NodeHelpers.findByPath(nextProps.projectIterationHierarchy, nextProps.nextSuggestedIterationPath);
            this.setState({
                selectedIterationPathField: {
                    ...this.state.selectedIterationPathField,
                    value: { path: nextProps.nextSuggestedIterationPath, node: nextSuggestedNode },
                }
            });

            if (nextSuggestedNode) {
                this._onIterationNameChanged(nextSuggestedNode.name, nextProps);
            }

            shouldValidate = true;
        }

        if (this.props.selectedTeamBacklogIteration !== nextProps.selectedTeamBacklogIteration) {
            shouldValidate = true;
        }

        if (shouldValidate) {
            this._validateForm(nextProps);
        }
    }

    /*----------
    |  Render  |
    -----------*/

    public render(): JSX.Element {
        return (
            <form onSubmit={this._onFormSubmitted}>
                {this.renderSprintForm()}
                {this.state.formMode !== IterationFormMode.Edit && this.renderFormOptionToggle()}
                {this.renderSubmitSection()}
            </form>
        );
    }

    private renderSprintForm(): JSX.Element {
        switch (this.state.formMode) {
            case IterationFormMode.SelectExisting:
                return this.renderSelectIterationForm();
            case IterationFormMode.CreateNew:
            case IterationFormMode.Edit:
                return this.renderIterationForm();
        }
    }

    private renderSelectIterationForm(): JSX.Element {
        const {
            isFetching,
            projectIterationHierarchy,
        } = this.props;

        const {
            selectedIterationPathField
        } = this.state;

        return (
            <div>
                <TreePicker
                    componentRef={this._resolveSelectionPicker}
                    aria-describedby={this._selectedIterationFieldInfoId}
                    aria-label={SprintEditorResources.SelectIterationFieldTitle}
                    disabled={isFetching}
                    errorMessage={!selectedIterationPathField.pristine && !selectedIterationPathField.validationResult.isValid ? selectedIterationPathField.validationResult.errorMessage : ""}
                    onRenderLabel={this._renderSelectedIterationInputLabel}
                    tree={projectIterationHierarchy}
                    onValueSelected={this._onSelectedIterationChanged}
                    openCalloutOnFocus={false}
                    label={SprintEditorResources.SelectIterationFieldTitle}
                    selectedValue={selectedIterationPathField.value.node || selectedIterationPathField.value.path}
                />
            </div>
        );
    }

    private _renderSelectedIterationInputLabel = (labelProps: ILabelProps, defaultRenderer: IRenderFunction<ILabelProps>): JSX.Element => {
        return (
            <div className="classification-label">
                {defaultRenderer(labelProps)}
                <InfoIcon
                    id={this._selectedIterationFieldInfoId}
                    className="classification-help"
                    directionalHint={DirectionalHint.leftCenter}
                    iconProps={{ iconType: VssIconType.fabric, iconName: "Info" }}
                    infoText={SprintEditorResources.SelectIterationExtraInfoText}
                />
            </div>
        );
    }

    private renderIterationForm(): JSX.Element {
        const {
            isFetching
        } = this.props;

        const {
            formMode,
            nameField,
            startDateField,
            endDateField,
            parentIterationPathField,
            suggestedDateInformation
        } = this.state;

        const defaultDatePickerStrings = datePickerStrings();

        return (
            <div className="create-iteration-form">
                <div className="text-field-wrapper name-field sprint-editor-form-section">
                    <Label className="text-field-label" required={true}>
                        {SprintEditorResources.NameFieldLabel}
                    </Label>
                    <TextField
                        componentRef={this._resolveTextField}
                        ariaLabel={SprintEditorResources.NameFieldLabel}
                        autoComplete="off"
                        onBeforeChange={this._onNameFieldChanged}
                        value={nameField.value}
                        errorMessage={!nameField.pristine && !nameField.validationResult.isValid ? nameField.validationResult.errorMessage : ""}
                    />
                </div>

                <div className="create-iteration-form-date-section sprint-editor-form-section">
                    <div className={css("date-picker-wrapper", "create-iteration-date", { "date-picker-wrapper--invalid": !startDateField.pristine && !startDateField.validationResult.isValid })}>
                        <DatePicker
                            ariaLabel={SprintEditorResources.StartDateFieldLabel}
                            label={SprintEditorResources.StartDateFieldLabel}
                            className="date-picker"
                            allowTextInput={true}
                            formatDate={this._formatDate}
                            onSelectDate={this._onStartDateFieldChanged}
                            parseDateFromString={this._parseDate}
                            value={startDateField.value}
                            isRequired={true}
                            initialPickerDate={suggestedDateInformation ? suggestedDateInformation.suggestedStartDateUTC : undefined}
                            strings={defaultDatePickerStrings}
                        />
                    </div>

                    <div className={css("date-picker-wrapper", "create-iteration-date", { "date-picker-wrapper--invalid": !endDateField.pristine && !endDateField.validationResult.isValid })}>
                        <DatePicker
                            ariaLabel={SprintEditorResources.EndDateFieldLabel}
                            label={SprintEditorResources.EndDateFieldLabel}
                            className="date-picker"
                            allowTextInput={true}
                            formatDate={this._formatDate}
                            onSelectDate={this._onEndDateFieldChanged}
                            parseDateFromString={this._parseDate}
                            minDate={startDateField.value}
                            isRequired={true}
                            strings={defaultDatePickerStrings}
                            value={endDateField.value}
                        />
                    </div>
                </div>

                <div className="sprint-editor-form-section">
                    <TreePicker
                        aria-label={SprintEditorResources.ParentIterationFieldTitle}
                        disabled={isFetching || formMode === IterationFormMode.Edit}
                        errorMessage={!parentIterationPathField.pristine && !parentIterationPathField.validationResult.isValid ? parentIterationPathField.validationResult.errorMessage : ""}
                        tree={this.props.projectIterationHierarchy}
                        label={SprintEditorResources.ParentIterationFieldTitle}
                        labelProps={{ required: true }}
                        onValueSelected={this._onParentIterationPathChanged}
                        openCalloutOnFocus={false}
                        selectedValue={parentIterationPathField.value.node || parentIterationPathField.value.path}
                    />
                </div>

            </div>
        );
    }

    private renderFormOptionToggle(): JSX.Element {
        const {
            selectedTeamDaysOff
        } = this.props;

        const {
            formMode,
            selectedIterationPathField
        } = this.state;

        let workingDays: number = null;
        let noWorkingDays: boolean = false;
        if (formMode === IterationFormMode.SelectExisting) {
            const selectedNode = selectedIterationPathField.value.node;
            if (selectedNode) {
                if (!selectedNode.startDate || !selectedNode.finishDate) {
                    noWorkingDays = true;
                } else {
                    workingDays = IterationDateUtil.getNumberOfWorkingDays(
                        DateUtilities.shiftToUTC(selectedNode.startDate),
                        DateUtilities.shiftToUTC(selectedNode.finishDate),
                        selectedTeamDaysOff,
                        /*sprint editor, no days off will be set*/[]);
                }
            }
        }

        return (
            <div className="form-footer-container">
                {
                    workingDays != null &&
                    <FormatComponent format={SprintEditorResources.SelectedIterationWorkingDaysText} elementType="div">
                        <b>{StringUtilities.format(SprintEditorResources.WorkingDaysText, workingDays)}</b>
                    </FormatComponent>
                }

                {
                    noWorkingDays &&
                    <div>
                        {SprintEditorResources.SelectedIterationUnsetWorkingDaysText}
                    </div>
                }

                <Link
                    className="form-option-toggle"
                    onClick={this._onFormOptionToggled}
                    type="button"
                >
                    {
                        formMode === IterationFormMode.CreateNew ?
                            SprintEditorResources.SelectIterationToggleText :
                            SprintEditorResources.CreateIterationToggleText
                    }
                </Link>
            </div>
        );
    }

    private renderSubmitSection(): JSX.Element {
        const {
            isCreating,
            onCancel
        } = this.props;

        const {
            formMode
        } = this.state;

        let disableSubmit = isCreating || !this._isFormValid(this._getValidationResults());

        return (
            <div className="submit-buttons-container">
                {isCreating && <Spinner />}
                <PrimaryButton disabled={disableSubmit} type="submit" className="sprint-editor-form-submit">
                    {formMode === IterationFormMode.Edit ? SprintEditorResources.Save : SprintEditorResources.CreateButtonText}
                </PrimaryButton>

                <DefaultButton onClick={onCancel} className="sprint-editor-form-cancel">
                    {SprintEditorResources.CancelButtonText}
                </DefaultButton>
            </div>
        );
    }

    private _formatDate = (date: Date): string => {
        if (date) {
            const dateTimeFormat = Culture.getDateTimeFormat();
            return DateUtilities.localeFormat(date, dateTimeFormat.ShortDatePattern, true);
        }

        return "";
    }

    private _parseDate = (value: string): Date => {
        const dateTimeFormat = Culture.getDateTimeFormat();
        return DateUtilities.parseDateString(value, dateTimeFormat.ShortDatePattern, true);
    }

    /*----------
    |  Events  |
    -----------*/

    private _onFormSubmitted = (formEvent: React.FormEvent<HTMLFormElement>): void => {
        const {
            editingIteration,
            onCreateIteration,
            onEditIteration,
            onSelectIteration
        } = this.props;

        const {
            formMode,
            endDateField,
            nameField,
            startDateField,
            parentIterationPathField,
            selectedIterationPathField
        } = this.state;

        // Stop the browser from POSTing back by default
        formEvent.preventDefault();
        formEvent.stopPropagation();

        const validationResults = this._validateForm();
        if (this._isFormValid(validationResults)) {
            switch (formMode) {
                case IterationFormMode.CreateNew:
                    onCreateIteration(nameField.value, startDateField.value, endDateField.value, parentIterationPathField.value.path);
                    break;
                case IterationFormMode.Edit:
                    onEditIteration(editingIteration, nameField.value, startDateField.value, endDateField.value);
                    break;
                case IterationFormMode.SelectExisting:
                    onSelectIteration(selectedIterationPathField.value.path);
                    break;
            }
        } else {
            this.setState({
                nameField: { ...this.state.nameField, pristine: false },
                endDateField: { ...this.state.endDateField, pristine: false },
                startDateField: { ...this.state.startDateField, pristine: false },
                parentIterationPathField: { ...this.state.parentIterationPathField, pristine: false },
                selectedIterationPathField: { ...this.state.selectedIterationPathField, pristine: false },
            });
        }
    }

    private _onFormOptionToggled = (event: React.MouseEvent<HTMLElement>) => {
        const {
            formMode,
            nameField,
            selectedIterationPathField
        } = this.state;

        if (formMode === IterationFormMode.CreateNew) {
            this.setState({ formMode: IterationFormMode.SelectExisting });
            if (selectedIterationPathField.validationResult.isValid) {
                const node: INode = selectedIterationPathField.value.node;
                this._onIterationNameChanged(node.name);
            } else {
                this._onIterationNameChanged("");
            }
            SprintsHubTelemetryHelper.publishTelemetryValue(SprintEditorUsageTelemetryConstants.SPRINTEDITOR_TOGGLE, "SwitchTo", IterationFormMode.SelectExisting);
        } else {
            this.setState({ formMode: IterationFormMode.CreateNew });
            this._onIterationNameChanged(nameField.value);
            SprintsHubTelemetryHelper.publishTelemetryValue(SprintEditorUsageTelemetryConstants.SPRINTEDITOR_TOGGLE, "SwitchTo", IterationFormMode.CreateNew);
        }
    }

    private _onIterationNameChanged = (value: string, props: ISprintEditorFormProps = this.props): void => {
        const {
            onIterationNameChanged
        } = props;

        if (onIterationNameChanged) {
            onIterationNameChanged(value);
        }
    }

    private _onNameFieldChanged = (value: string): void => {
        const {
            nameField,
            parentIterationPathField
        } = this.state;

        if (nameField.value !== value) {
            const parentNode: INode = parentIterationPathField.value.node;
            const validationResult: IValidationResult = SprintEditorFormValidators.validateName(value, parentNode);
            this.setState({
                nameField: {
                    value,
                    validationResult,
                    pristine: false
                }
            });

            this._onIterationNameChanged(value);
        }
    }

    private _onStartDateFieldChanged = (value: Date): void => {
        const {
            endDateField,
            suggestedDateInformation
        } = this.state;

        const startDateValidationResult: IValidationResult = SprintEditorFormValidators.validateStartDate(value);

        this.setState({
            startDateField: {
                value,
                validationResult: startDateValidationResult,
                pristine: false
            }
        });

        if (this.state.endDateField.value) {
            const endDateValidationResult: IValidationResult = SprintEditorFormValidators.validateEndDate(value, endDateField.value);
            this.setState({
                endDateField: {
                    ...endDateField,
                    validationResult: endDateValidationResult,
                    pristine: false
                }
            });
        } else if (startDateValidationResult.isValid && suggestedDateInformation) {
            const endDate: Date = new Date(value);
            endDate.setDate(endDate.getDate() + suggestedDateInformation.workingDaysOffset);

            const endDateValidationResult = SprintEditorFormValidators.validateEndDate(value, endDate);
            this.setState({
                endDateField: {
                    ...endDateField,
                    validationResult: endDateValidationResult,
                    value: endDate
                }
            });
        }
    }

    private _onEndDateFieldChanged = (value: Date): void => {
        const validationResult: IValidationResult = SprintEditorFormValidators.validateEndDate(this.state.startDateField.value, value);
        this.setState({
            endDateField: {
                value,
                validationResult,
                pristine: false
            }
        });
    }

    private _onParentIterationPathChanged = (path: string, node?: INode): void => {
        const {
            selectedTeamBacklogIteration,
            selectedTeamDaysOff
        } = this.props;

        const {
            nameField
        } = this.state;

        const parentNodeValidationResult: IValidationResult = SprintEditorFormValidators.validateParentIterationValue(path, node, selectedTeamBacklogIteration);
        const nameFieldValidationResult: IValidationResult = SprintEditorFormValidators.validateName(nameField.value, node);

        this.setState({
            suggestedDateInformation: this._computeSuggestedDateInformation(node, selectedTeamDaysOff),
            parentIterationPathField: {
                value: { path, node },
                validationResult: parentNodeValidationResult,
                pristine: false
            },
            nameField: {
                ...this.state.nameField,
                validationResult: nameFieldValidationResult
            }
        });
    }

    private _onSelectedIterationChanged = (path: string, node?: INode): void => {
        const {
            projectIterationHierarchy,
            selectedTeamBacklogIteration,
            selectedTeamIterationPaths
        } = this.props;

        const validationResult: IValidationResult = SprintEditorFormValidators.validateSelectedIteration(path, node, projectIterationHierarchy, selectedTeamIterationPaths, selectedTeamBacklogIteration);
        this.setState({
            selectedIterationPathField: {
                value: { path, node },
                validationResult,
                pristine: false
            }
        });

        if (validationResult.isValid) {
            this._onIterationNameChanged(node.name);
        } else {
            this._onIterationNameChanged("");
        }
    }

    /*-----------
    |  Helpers  |
    ------------*/

    private _getValidationResults(): SprintEditorFormValidationResults {
        return {
            nameField: this.state.nameField.validationResult,
            endDateField: this.state.endDateField.validationResult,
            startDateField: this.state.startDateField.validationResult,
            parentIterationPathField: this.state.parentIterationPathField.validationResult,
            selectedIterationPathField: this.state.selectedIterationPathField.validationResult
        };
    }

    /*--------------
    |  Validation  |
    ---------------*/

    /**
     * Validate every form field and set their validation state
     */
    private _validateForm(props: ISprintEditorFormProps = this.props, state: ISprintEditorFormState = this.state): SprintEditorFormValidationResults {
        const {
            projectIterationHierarchy,
            selectedTeamBacklogIteration,
            selectedTeamIterationPaths
        } = props;

        const {
            nameField,
            startDateField,
            endDateField,
            parentIterationPathField,
            selectedIterationPathField
        } = state;

        const parentNode: INode = parentIterationPathField.value.node;

        const validationResults = {
            nameField: SprintEditorFormValidators.validateName(nameField.value, parentNode),
            endDateField: SprintEditorFormValidators.validateEndDate(startDateField.value, endDateField.value),
            startDateField: SprintEditorFormValidators.validateStartDate(startDateField.value),
            parentIterationPathField: SprintEditorFormValidators.validateParentIterationValue(parentIterationPathField.value.path, parentNode, selectedTeamBacklogIteration),
            selectedIterationPathField: SprintEditorFormValidators.validateSelectedIteration(selectedIterationPathField.value.path, selectedIterationPathField.value.node, projectIterationHierarchy, selectedTeamIterationPaths, selectedTeamBacklogIteration)
        };

        this.setState({
            nameField: { ...nameField, validationResult: validationResults.nameField },
            endDateField: { ...endDateField, validationResult: validationResults.endDateField },
            startDateField: { ...startDateField, validationResult: validationResults.startDateField },
            parentIterationPathField: { ...parentIterationPathField, validationResult: validationResults.parentIterationPathField },
            selectedIterationPathField: { ...selectedIterationPathField, validationResult: validationResults.selectedIterationPathField }
        });

        return validationResults;
    }

    /**
     * Check to see if the form is valid, given some validation results
     * @param validationResults The validation results
     * @param iterationChoice The iteration creation style choice
     */
    private _isFormValid(validationResults: SprintEditorFormValidationResults, iterationChoice: IterationFormMode = this.state.formMode): boolean {
        if (iterationChoice === IterationFormMode.SelectExisting) {
            return validationResults.selectedIterationPathField.isValid;
        } else {
            return validationResults.nameField.isValid &&
                validationResults.endDateField.isValid &&
                validationResults.startDateField.isValid &&
                validationResults.parentIterationPathField.isValid;
        }
    }

    /**
     * Compute a suggested date information, given a parent iteration node
     * Finds the last sibling node with dates and uses the IterationDateUtil to compute suggested date information
     * @param parentNode The parent node
     * @param weekends The team weekends
     */
    private _computeSuggestedDateInformation(parentNode: INode, weekends: number[]): INewSprintSuggestedDateInformation {
        if (parentNode && parentNode.children && parentNode.children.length > 0) {
            const lastSibling = this._findLastSiblingWithDates(parentNode);
            if (lastSibling) {
                const {
                    suggestedStartDate,
                    workingDaysOffset
                } = IterationDateUtil.getIterationDateDefaultInformation(lastSibling.startDate, lastSibling.finishDate, weekends);

                return {
                    suggestedStartDateUTC: DateUtilities.shiftToUTC(suggestedStartDate),
                    workingDaysOffset: workingDaysOffset
                };
            }
        }

        return null;
    }

    /**
     * Find the last sibling node with date values set
     * @param parentNode The parent node
     */
    private _findLastSiblingWithDates(parentNode: INode): INode {
        // Find the last node with dates
        let lastChild: INode;
        for (let i = parentNode.children.length - 1; i >= 0; i--) {
            const child = parentNode.children[i];
            if (child.startDate && child.finishDate) {
                lastChild = child;
                break;
            }
        }

        return lastChild;
    }

    /**
     * Get the form field state for a new iteration
     * @param props The props of the component
     */
    private _getNewFieldState(props: ISprintEditorFormProps): {
        parentIterationPathField: IFormFieldState<{ path: string, node?: INode }>,
        nameField: IFormFieldState<string>,
        startDateField: IFormFieldState<Date>,
        endDateField: IFormFieldState<Date>
    } {
        return {
            parentIterationPathField: {
                value: props.suggestedParentNode ?
                    { path: NodeHelpers.getPath(props.suggestedParentNode, 1), node: props.suggestedParentNode }
                    :
                    { path: null, node: null },
                validationResult: { isValid: true },
                pristine: true
            },
            nameField: {
                value: "",
                validationResult: { isValid: true },
                pristine: true
            },
            startDateField: {
                value: null,
                validationResult: { isValid: true },
                pristine: true
            },
            endDateField: {
                value: null,
                validationResult: { isValid: true },
                pristine: true
            }
        };
    }

    /**
     * Get the form field state for an existing iteration
     * Prefills the form with the iteration values
     * @param props The props of the component
     */
    private _getEditFieldState(props: ISprintEditorFormProps): {
        parentIterationPathField: IFormFieldState<{ path: string, node?: INode }>,
        nameField: IFormFieldState<string>,
        startDateField: IFormFieldState<Date>,
        endDateField: IFormFieldState<Date>
    } {

        // If last selected node's parent's parent is the Project node, then last selected node's parent is a root node (Area/ or Iteration/)
        // We want to skip that node
        const parentNode = props.editingIteration.parent.parent && props.editingIteration.parent.parent.structure === INodeStructureType.Project ? props.editingIteration.parent.parent : props.editingIteration.parent;
        return {
            parentIterationPathField: {
                value: { path: NodeHelpers.getPath(parentNode, 1), node: parentNode },
                validationResult: { isValid: true },
                pristine: true
            },
            nameField: {
                value: props.editingIteration.name,
                validationResult: { isValid: true },
                pristine: true
            },
            startDateField: {
                // DatePicker uses the local timezone instead of shifiting to UTC, we need to do this here
                value: props.editingIteration.startDate ? DateUtilities.shiftToUTC(props.editingIteration.startDate) : null,
                validationResult: { isValid: true },
                pristine: true
            },
            endDateField: {
                // DatePicker uses the local timezone instead of shifiting to UTC, we need to do this here
                value: props.editingIteration.finishDate ? DateUtilities.shiftToUTC(props.editingIteration.finishDate) : null,
                validationResult: { isValid: true },
                pristine: true
            }
        };
    }

    private _resolveTextField = (textField: ITextField): void => {
        this._nameField = textField;
    }

    private _resolveSelectionPicker = (selectionPicker: TreePicker<INode>): void => {
        this._selectionPicker = selectionPicker;
    }
}
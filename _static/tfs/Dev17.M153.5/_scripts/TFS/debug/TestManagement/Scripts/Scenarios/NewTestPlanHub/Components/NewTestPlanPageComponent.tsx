import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/NewTestPlanPageComponent";

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as Utils_String from "VSS/Utils/String";
import { autobind, css} from "OfficeFabric/Utilities";
import { Colors } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Colors";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { ITextField, TextField } from "OfficeFabric/TextField";
import { LoadingComponent } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/LoadingComponent";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { MruClassificationPicker, IMruClassificationPickerProps } from "WorkItemTracking/Scripts/MruClassificationPicker/Components/MruClassificationPicker";
import { NewTestPlanFormValidators } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/NewTestPlanFormValidators";
import { NewTestPlanPageActionsCreator } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Actions/NewTestPlanPageActionsCreator";
import { NewTestPlanPageStore } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Stores/NewTestPlanPageStore";
import { Spinner } from "OfficeFabric/Spinner";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";
import {
    IFormFieldState,
    INewTestPlanPageState,
    INodeField,
    IValidationResult,
    WorkItemField
} from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";

export interface INewTestPlanPageProps {
    /** The actions creator to use with this component */
    actionsCreator: NewTestPlanPageActionsCreator;
    /** The store that drives this component */
    store: NewTestPlanPageStore;

    onCancel?: () => void;

    onCompleted?: (name: string, projectId: string, areaPath: string, iteration: string) => IPromise<void>;
}

export class NewTestPlanPageComponent extends React.Component<INewTestPlanPageProps, INewTestPlanPageState> {
    private _nameField: ITextField;
    private _classificationPicker: MruClassificationPicker;
    private readonly _dropDownHeight: number = 24;
    private readonly _dropdownWidth: number = 10;
    private readonly _visibleItemCount: number = 10;

    constructor(props: INewTestPlanPageProps) {
        super(props);

        this.state = props.store.getNewPlanState();
    }

    public focusInitialElement(): void {
        if (this._nameField) {
            this._nameField.focus();
        }
    }

    public componentWillMount(): void {
        this.props.store.addChangedListener(this._onStoreChanged);
    }

    public componentWillUnmount(): void {
        this.props.store.removeChangedListener(this._onStoreChanged);
    }

    public render(): JSX.Element {

        const {
            isLoading,
            nameField,
            rootAreaPath,
            selectedAreaPathField,
            rootIteration,
            selectedIterationField,
            projectId,
            isCreatingTestPlan,
            errorMessage
        } = this.state;

        if (isLoading) {
            return (
                <div className="new-test-plan-loading">
                    <LoadingComponent />
                </div>
            );
        }

        const disableSubmit = !this._isFormValid();

        return (
            <div className="new-test-plan-page">
                {errorMessage && this._renderErrorMessage(errorMessage)}
                <h1 className="new-test-plan-page-title" key="title">
                    <VssIcon iconType={VssIconType.bowtie} iconName="test-plan" styles={{root: {color: Colors.darkTeal}}}/>
                    <span className="new-test-plan-page-title-header">{Resources.NewTestPlanText}</span>
                </h1>

                <form onSubmit={this._onFormSubmitted}>

                    <div className="test-plan-name" key="name">
                        <TextField
                            componentRef={this._resolveTextField}
                            label={Resources.Name}
                            required={true}
                            autoComplete="off"
                            onBeforeChange={this._onNameFieldChanged}
                            value={nameField.value}
                            placeholder={Resources.NewTestPlanPlaceholder}
                            errorMessage={nameField.changed && !nameField.validationResult.isValid ? nameField.validationResult.errorMessage : ""}
                        />
                    </div>

                    <div className="test-plan-area-path" key="area-path">
                        {this._renderNodeSection(rootAreaPath,
                            selectedAreaPathField,
                            WorkItemField.areaPath,
                            Resources.AreaPath,
                            this._onAreaPathNodeChanged)}
                    </div>
                    <div className="test-plan-iteration" key="iteration">
                        {this._renderNodeSection(rootIteration,
                            selectedIterationField,
                            WorkItemField.iterationPath,
                            Resources.Iteration,
                            this._onIterationNodeChanged)}
                    </div>

                    <div className="submit-buttons-container">
                        {isCreatingTestPlan && <Spinner />}
                        <PrimaryButton disabled={disableSubmit} type="submit" className="new-test-plan-submit">
                            {Resources.CreateButtonText}
                        </PrimaryButton>

                        <DefaultButton onClick={this.props.onCancel} className="new-sprint-form-cancel">
                            {Resources.CancelText}
                        </DefaultButton>
                    </div>

                </form>

            </div>
        );
    }

    private _renderErrorMessage(message: string): JSX.Element {
        return (
            <MessageBar
                messageBarType={MessageBarType.error}
                onDismiss={() => { this.setState({ errorMessage: Utils_String.empty }); }}>
                {message}
            </MessageBar>
        );
    }

    @autobind
    private _onFormSubmitted(formEvent: React.FormEvent<HTMLFormElement>): void {

        // Stop the browser from POSTing back by default
        formEvent.preventDefault();
        formEvent.stopPropagation();

        if (this._isFormValid()) {

            const {
                nameField,
                selectedAreaPathField,
                selectedIterationField,
                projectId
            } = this.state;

            this.props.onCompleted(nameField.value, projectId, selectedAreaPathField.value.path, selectedIterationField.value.path);
        }
    }

    private _renderNodeSection(root: INodeField,
        selectedField: IFormFieldState<INodeField>,
        refName: string,
        label: string,
        onNodeChanged: any): JSX.Element {
        const classNames = css("workitem-classification-picker", { "invalid": false }, { "readonly": true });
        return <MruClassificationPicker
            aria-label={label}
            aria-required={true}
            label={label}
            labelProps={{ required: true }}
            errorMessage={selectedField.changed && !selectedField.validationResult.isValid ? selectedField.validationResult.errorMessage : ""}
            componentRef={this._resolveClassificationPicker}
            containerClassName={classNames}
            calloutClassName="workitem-classification-picker-dropdown"
            openCalloutOnFocus={false}
            dropdownItemHeight={this._dropDownHeight}
            dropdownItemIndentWidth={this._dropdownWidth}
            fieldRefName={refName}
            projectId={this.state.projectId}
            selectedValue={selectedField.value.path}
            readOnly={false}
            onValueSelected={onNodeChanged} 
            showSelectedDate={true}
            visibleItemCount={this._visibleItemCount}
            updateMruOnSelection={false}
            tree={root.node} />;
    }

    @autobind
    private _resolveClassificationPicker(classificationPicker: MruClassificationPicker): void {
        this._classificationPicker = classificationPicker;
    }

    @autobind
    private _onAreaPathNodeChanged(value: string, node?: INode): void {
        const validationResult: IValidationResult = NewTestPlanFormValidators.validateNodeValue(value, node);
        this.setState({
            selectedAreaPathField: {
                value: {
                    path: value,
                    node: node
                },
                validationResult,
                changed: true
            }
        });
    }

    @autobind
    private _onIterationNodeChanged(value: string, node?: INode): void {
        const validationResult: IValidationResult = NewTestPlanFormValidators.validateNodeValue(value, node);
        this.setState({
            selectedIterationField: {
                value: {
                    path: value,
                    node: node
                },
                validationResult,
                changed: true
            }
        });
    }

    @autobind
    private _onStoreChanged(): void {
        this.setState(this.props.store.getNewPlanState());
    }

    @autobind
    private _onNameFieldChanged(value: string): void {
        const {
            nameField
        } = this.state;

        if (nameField.value !== value) {
            const validationResult: IValidationResult = NewTestPlanFormValidators.validateName(value);
            this.setState({
                nameField: {
                    value,
                    validationResult,
                    changed: true
                }
            });
        }
    }

    @autobind
    private _resolveTextField(textField: ITextField): void {
        this._nameField = textField;
    }

    private _isFormValid(): boolean {
        return this.state.nameField.validationResult.isValid &&
            this.state.selectedAreaPathField.validationResult.isValid &&
            this.state.selectedIterationField.validationResult.isValid;
    }
}

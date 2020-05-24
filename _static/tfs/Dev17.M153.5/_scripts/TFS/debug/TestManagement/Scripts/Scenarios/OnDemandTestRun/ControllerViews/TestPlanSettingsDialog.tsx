/// <reference types="react" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { IDropdownOption } from "OfficeFabric/Components/Dropdown/Dropdown.types";
import { Checkbox } from "OfficeFabric/Checkbox";
import { Dialog } from "OfficeFabric/Dialog";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { DialogType, IDialogContentProps } from "OfficeFabric/components/Dialog/DialogContent.types";
import { DialogFooter } from "OfficeFabric/components/Dialog/DialogFooter";
import { IModalProps } from "OfficeFabric/Modal";
import { Link } from "OfficeFabric/Link";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { Pivot, PivotItem } from "OfficeFabric/Pivot";

import * as ConfirmationDialog from "TestManagement/Scripts/Scenarios/Common/Components/ConfirmationDialog";
import { TestPlanSettingsActionsCreator } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Actions/TestPlanSettingsActionsCreator";
import { HelpUrls, OnDemandReleaseDefinitionTemplateId, TestPlanSettingsTabKeyConstants } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Constants";
import { ArtifactInputCombo, IArtifactInputIconsProps } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Components/ArtifactInputCombo";
import { TestPlanSettingsStore, ITestPlanSettingsState } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Stores/TestPlanSettingsStore";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as TM_Utils from "TestManagement/Scripts/TFS.TestManagement.Utils";

import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Utils_String from "VSS/Utils/String";
import * as Url from "VSS/Utils/Url";
import * as ComponentBase from "VSS/Flux/Component";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/OnDemandTestRun/ControllerViews/TestPlanSettingsDialog";

export interface ITestPlanSettingsProps extends ComponentBase.Props{
    selectedPlan: TCMContracts.TestPlan;
    actionsCreator: TestPlanSettingsActionsCreator;
    store: TestPlanSettingsStore;
    onCloseDialog?: () => void;
    onSaveCallback?: (testPlan: TCMContracts.TestPlan) => void;
}

export function renderDialog(element: HTMLElement, testPlanSettingProps: ITestPlanSettingsProps): void {
    ReactDOM.render(<TestPlanSettingsDialog { ...testPlanSettingProps } />, element);
}

export function unmountDialog(element: HTMLElement): void {
    ReactDOM.unmountComponentAtNode(element);
}

export class TestPlanSettingsDialog extends ComponentBase.Component<ITestPlanSettingsProps, ITestPlanSettingsState> {

    public componentWillMount(): void {
        this._handleStoreChange();
        this.props.store.addChangedListener(this._handleStoreChange);
    }

    public componentWillUnmount(): void {
        this.props.store.removeChangedListener(this._handleStoreChange);
    }

    public render(): JSX.Element {
        let dialogTitle: string = Utils_String.format(Resources.TestPlanSettingsDialogText, this.props.selectedPlan.name);
        let dialogcontentProps: IDialogContentProps = {
            title: this._isDirty() ? Utils_String.format(Resources.DirtyText, dialogTitle) : dialogTitle,
            className: "test-plan-settings-dialog-content",
            closeButtonAriaLabel: Resources.CloseText,
            type: DialogType.close,
            showCloseButton: true
        };
        let modalProps: IModalProps = {
            className: "test-plan-settings-dialog bowtie-fabric",
            containerClassName: "test-plan-settings-dialog-container",
            isBlocking: true
        };
        return (
            <Dialog
                dialogContentProps={dialogcontentProps}
                modalProps={modalProps}
                hidden={!this.state.showDialog}
                onDismiss={this._onCancelClick}
                firstFocusableSelector={TestPlanSettingsDialog.BuildDropDownSelectorClass}>
                {
                    this.state.errorMessage ?
                        <TooltipHost content={this.state.errorMessage}>
                            <MessageBar
                                messageBarType={MessageBarType.error}
                                dismissButtonAriaLabel={Resources.ClearErrorMessage}
                                className="test-plan-settings-error-bar"
                                isMultiline={false}
                                onDismiss={this._onErrorMessageDismiss}>
                                {this.state.errorMessage}
                            </MessageBar>
                        </TooltipHost>
                        :
                        Utils_String.empty
                }
                <Pivot
                    selectedKey={this.state.selectedTabItemKey}
                    onLinkClick={this._onTabClick}>
                    {this._getTestRunSettingsTabItem()}
                    {this._getTestOutcomeSettingsTabItem()}
                </Pivot>
                <DialogFooter>
                    <PrimaryButton
                        onClick={this._onSaveClick}
                        disabled={this.state.isSaving || !this._isDirty()}>
                        {this.state.isSaving ? Resources.SavingText : Resources.SaveText}
                    </PrimaryButton>
                    <DefaultButton
                        onClick={this._onCancelClick}>
                        {Resources.CloseText}
                    </DefaultButton>
                </DialogFooter>
            </Dialog>
        );
    }

    private _getTestRunSettingsTabItem(): JSX.Element {
        let selectedBuildDefinitionId: number = this.state.availableBuildDefinitions && this.state.availableBuildDefinitions.length && this.state.selectedBuildDefinitionId ?
            this.state.selectedBuildDefinitionId : 0;
        let selectedBuildId: number = this.state.availableBuilds && this.state.availableBuilds.length && this.state.selectedBuildId ?
            this.state.selectedBuildId : 0;
        let selectedReleaseDefinitionId: number = this.state.availableReleaseDefinitions && this.state.availableReleaseDefinitions.length && this.state.selectedReleaseDefinitionId ?
            this.state.selectedReleaseDefinitionId : 0;
        let selectedReleaseEnvDefinitionId: number = this.state.availableReleaseEnvDefinitions && this.state.availableReleaseEnvDefinitions.length && this.state.selectedReleaseEnvDefinitionId ?
            this.state.selectedReleaseEnvDefinitionId : 0;
        return (
            <PivotItem
                key={TestPlanSettingsTabKeyConstants.RunSettings}
                itemKey={TestPlanSettingsTabKeyConstants.RunSettings}
                linkText={Resources.TestRunSettingsTabLinkText}
                ariaLabel={Resources.TestRunSettingsTabLinkText}>

                <div className="test-plan-settings-pivot-item">
                    <div className="planSettingDialog-subHeader">
                        <b>{Resources.BuildLabel}</b>
                        <ArtifactInputCombo
                            labelText={Resources.BuildDefinitionText}
                            options={this._getDropdownOptions(this.state.availableBuildDefinitions)}
                            selectedKey={selectedBuildDefinitionId}
                            placeHolder={this.state.buildDefinitionsLoading ? Resources.LoadingMessage : Resources.SelectBuildDefinitionText}
                            className={TestPlanSettingsDialog.BuildDropDownSelectorClass}
                            onChanged={(option: IDropdownOption, index: number) => {
                                this._onBuildDefChanged(option.key as number);
                            }} />
                        <ArtifactInputCombo
                            labelText={Resources.BuildNumber}
                            options={this._getDropdownOptions(this.state.availableBuilds)}
                            selectedKey={selectedBuildId}
                            placeHolder={this.state.buildsLoading ? Resources.LoadingMessage : Resources.SelectBuildText}
                            onChanged={(option: IDropdownOption, index: number) => {
                                this._onBuildChanged(option.key as number);
                            }}
                        />
                    </div>

                    <div className="planSettingDialog-subHeader">
                        <div><b>{Resources.StageToRunTestsText}</b></div>
                        <div className="planSettingsDialog-runAutomatedHelperText">{Resources.StageToRunTestsSubText} &nbsp;
                            <Link
                                href={HelpUrls.learnMoreUrl}
                                target="_blank"
                                rel="noreferrer noopener">
                                {Resources.LearnMoreText}
                            </Link>
                        </div>
                        <ArtifactInputCombo
                            labelText={Resources.ReleaseDefinitionText}
                            options={this._getDropdownOptions(this.state.availableReleaseDefinitions)}
                            selectedKey={selectedReleaseDefinitionId}
                            placeHolder={this.state.releaseDefinitionsLoading ? Resources.LoadingMessage : Resources.SelectReleaseDefinitionText}
                            onChanged={(option: IDropdownOption, index: number) => {
                                this._onReleaseDefChanged(option.key as number);
                            }}
                            iconButtonPropsList={this._getReleaseDefinitionsRightIconsProps(selectedBuildDefinitionId, selectedReleaseDefinitionId)} />

                        <ArtifactInputCombo
                            labelText={Resources.Stage}
                            options={this._getDropdownOptions(this.state.availableReleaseEnvDefinitions)}
                            selectedKey={selectedReleaseEnvDefinitionId}
                            placeHolder={this.state.releaseEnvDefinitionsLoading ? Resources.LoadingMessage : Resources.SelectReleaseStageText}
                            onChanged={(option: IDropdownOption, index: number) => {
                                this._onReleaseEnvDefChanged(option.key as number);
                            }} />
                    </div>

                </div>
            </PivotItem>
        );
    }

    private _getTestOutcomeSettingsTabItem(): JSX.Element {
        return (
            <PivotItem
                key={TestPlanSettingsTabKeyConstants.OutcomeSettings}
                itemKey={TestPlanSettingsTabKeyConstants.OutcomeSettings}
                linkText={Resources.TestOutcomeSettingsTabLinkText}
                ariaLabel={Resources.TestOutcomeSettingsTabLinkText}>
                <div className="test-plan-settings-pivot-item">
                    {Resources.ConfigureTestOutcome_Description}
                    <Checkbox
                        label={Resources.ConfigureTestOutcome_Label}
                        disabled={this.state.currentOutcomeSettings == null}
                        checked={this.state.currentOutcomeSettings}
                        onChange={this._onTestOutcomeSettingsCheckboxChanged} />
                </div>
            </PivotItem>
        );
    }

    /**
    * checks if the dialog is dirty
    */
    private _isDirty(): boolean {
        return !this._isInitializing()
            && (this._isRunSettingsDirty() || this._isOutcomeSettingsDirty());
    }

    private _isInitializing(): boolean {
        return this.state.buildsLoading || this.state.buildDefinitionsLoading || this.state.releaseDefinitionsLoading || this.state.releaseEnvDefinitionsLoading;
    }

    private _isRunSettingsDirty(): boolean {
        return this._isBuildDefinitionDirty() || this._isBuildDirty() || this._isReleaseDefinitionDirty() || this._isReleaseEnvironmentDefinitionDirty();
    }

    private _isBuildDefinitionDirty(): boolean {
        let selectedBuildDefinitionId: number = this.state.availableBuildDefinitions && this.state.availableBuildDefinitions.length && this.state.selectedBuildDefinitionId ?
            this.state.selectedBuildDefinitionId : 0;
        // If build definition is not associated to test plan  and there is a definition selected from the dropdown
        // or if build definition is already associated to test plan and the selected test plan is not the same as the one associated
        return (!this.props.selectedPlan.buildDefinition && selectedBuildDefinitionId > 0)
            || (this.props.selectedPlan.buildDefinition && selectedBuildDefinitionId !== parseInt(this.props.selectedPlan.buildDefinition.id));
    }

    private _isBuildDirty(): boolean {
        let selectedBuildId: number = this.state.availableBuilds && this.state.availableBuilds.length && this.state.selectedBuildId ?
            this.state.selectedBuildId : 0;
        return (!this.props.selectedPlan.build && selectedBuildId > 0)
            || (this.props.selectedPlan.build && selectedBuildId !== (parseInt(this.props.selectedPlan.build.id)));
    }

    private _isReleaseDefinitionDirty(): boolean {
        let selectedReleaseDefinitionId: number = this.state.availableReleaseDefinitions && this.state.availableReleaseDefinitions.length && this.state.selectedReleaseDefinitionId ?
            this.state.selectedReleaseDefinitionId : 0;
        return (!this.props.selectedPlan.releaseEnvironmentDefinition && selectedReleaseDefinitionId > 0)
            || (this.props.selectedPlan.releaseEnvironmentDefinition && selectedReleaseDefinitionId !== this.props.selectedPlan.releaseEnvironmentDefinition.definitionId);
    }

    private _isReleaseEnvironmentDefinitionDirty(): boolean {
        let selectedReleaseEnvDefinitionId: number = this.state.availableReleaseEnvDefinitions && this.state.availableReleaseEnvDefinitions.length && this.state.selectedReleaseEnvDefinitionId ?
            this.state.selectedReleaseEnvDefinitionId : 0;
        return (!this.props.selectedPlan.releaseEnvironmentDefinition && selectedReleaseEnvDefinitionId > 0)
            || (this.props.selectedPlan.releaseEnvironmentDefinition && selectedReleaseEnvDefinitionId !== this.props.selectedPlan.releaseEnvironmentDefinition.environmentDefinitionId);
    }

    private _isOutcomeSettingsDirty(): boolean {
        return this.state.currentOutcomeSettings !== this.state.initialOutcomeSettings;
    }

    private _onTabClick = (item: PivotItem) => {
        let key: string = item.props.itemKey;
        this.props.actionsCreator.changeTab(key);
    }

    private _getReleaseDefinitionsRightIconsProps(selectedBuildDefinitionId: number, selectedReleaseDefinitionId: number): IArtifactInputIconsProps[] {

        let buttonProps: IArtifactInputIconsProps[] = [];
        buttonProps.push({
            iconName: "Refresh",
            label: Resources.Refresh,
            onClick: () => { this._onRefreshReleaseDefinitions(selectedBuildDefinitionId, selectedReleaseDefinitionId); }
        });
        buttonProps.push({
            iconName: "Settings",
            disabled: !selectedReleaseDefinitionId,
            label: Resources.ManageText,
            onClick: () => { this._onManageReleaseDefinitionClick(selectedReleaseDefinitionId); }
        });
        buttonProps.push({
            iconName: "Add",
            label: Resources.CreateNewText,
            onClick: () => { this._onAddNewReleaseDefinitionClick(); }
        });
        return buttonProps;
    }

    private _getDropdownOptions(inputOptions: IKeyValuePair<number, string>[]): IDropdownOption[] {
        let options: IDropdownOption[] = [];
        if (inputOptions) {
            options = inputOptions.map((inputOption) => {
                return { key: inputOption.key, text: inputOption.value } as IDropdownOption;
            });
        }
        return options;
    }

    private _getNewReleaseDefinitionUrl(): string {
        if (this.state.selectedBuildDefinitionId && this.state.buildDefinitionNames && this.state.buildDefinitionNames.hasOwnProperty(this.state.selectedBuildDefinitionId.toString())) {
            return TM_Utils.UrlHelper.getNewReleaseDefinitionEnvironmentEditorUrl(OnDemandReleaseDefinitionTemplateId, this.state.selectedBuildDefinitionId, this.state.buildDefinitionNames[this.state.selectedBuildDefinitionId]);
        } else {
            return TM_Utils.UrlHelper.getNewReleaseDefinitionEnvironmentEditorUrl(OnDemandReleaseDefinitionTemplateId);
        }
    }

    private _handleStoreChange = (): void => {
        this.setState(this.props.store.getState());
    }

    private _onRefreshReleaseDefinitions(buildDefId: number, selectedReleaseDefId: number ): void {
        this.props.actionsCreator.refreshReleaseDefinitionsForBuildDef(buildDefId, selectedReleaseDefId, this.props.selectedPlan);
    }

    private _onManageReleaseDefinitionClick(releaseDefinitionId: number): void {
        if (releaseDefinitionId) {
            let manageUrl: string = TM_Utils.UrlHelper.getReleaseDefinitionEnvironmentEditorUrl(releaseDefinitionId);
            if (Url.isSafeProtocol(manageUrl || Utils_String.empty)) {
                open(manageUrl, "_blank");
            }
        }
    }

    private _onAddNewReleaseDefinitionClick(): void {
        let newReleaseDefintionUrl: string = this._getNewReleaseDefinitionUrl();
        if (Url.isSafeProtocol(newReleaseDefintionUrl || Utils_String.empty)) {
            open(newReleaseDefintionUrl, "_blank");
        }
    }

    private _onTestOutcomeSettingsCheckboxChanged = (ev: React.FormEvent<HTMLInputElement | HTMLElement> , checked: boolean) => {
        this.props.actionsCreator.setTestOutcomeSetting(checked);
    }

    private _onSaveClick = () => {
        if (this._isRunSettingsDirty()) {
            this.props.actionsCreator.saveTestPlanSettings(
                this.props.selectedPlan.id,
                this.state.selectedBuildDefinitionId,
                this.state.selectedBuildId,
                this.state.selectedReleaseDefinitionId,
                this.state.selectedReleaseEnvDefinitionId,
                this.props.onSaveCallback);
        }
        if (this._isOutcomeSettingsDirty()) {
            this.props.actionsCreator.saveTestOutcomeSettings(this.props.selectedPlan.id, this.state.currentOutcomeSettings);
        }
    }

    private _onCancelClick = () => {
        if (this._isDirty()) {
            ConfirmationDialog.openConfirmationDialog(Resources.UnsavedChangesLoseWarning, () => { this._closeDialog(); });
        } else {
            this._closeDialog();
        }
    }

    private _onErrorMessageDismiss = () => {
        this.props.actionsCreator.closeErrorMessage();
    }

    private _onBuildDefChanged = (buildDefId: number) => {
        this.props.actionsCreator.buildDefChanged(buildDefId, false, this.props.selectedPlan);
    }

    private _onBuildChanged = (buildId: number) => {
        this.props.actionsCreator.buildChanged(buildId);
    }

    private _onReleaseDefChanged = (releaseDefId: number) => {
        this.props.actionsCreator.releaseDefinitionChanged(releaseDefId, false, this.props.selectedPlan);
    }

    private _onReleaseEnvDefChanged = (releaseEnvDefId: number) => {
        this.props.actionsCreator.releaseEnvDefinitionChanged(releaseEnvDefId);
    }

    private _closeDialog(): void {
        this.props.actionsCreator.closeDialog();
        if (this.props.onCloseDialog) {
            this.props.onCloseDialog();
        }
    }

    private static BuildDropDownSelectorClass: string = "build-definition-dropdown-selector";
}

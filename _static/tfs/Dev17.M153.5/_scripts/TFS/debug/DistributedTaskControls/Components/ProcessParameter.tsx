/// <reference types="react" />

import * as React from "react";

import { ProcessParameterActionsCreator } from "DistributedTaskControls/Actions/ProcessParameterActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { KeyCodes } from "DistributedTaskControls/Common/ShortKeys";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Feature, Properties, Telemetry } from "DistributedTaskControls/Common/Telemetry";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { ConfirmationDialog } from "DistributedTaskControls/Components/ConfirmationDialog";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { Component as MarkdownRenderer } from "DistributedTaskControls/Components/MarkdownRenderer";
import { ProcessParameterInputFooterComponent } from "DistributedTaskControls/Components/ProcessParameterInputFooterComponent";
import { IFooterRenderer, IInputActionDelegateProps } from "DistributedTaskControls/Components/Task/TaskInput";
import { TaskInputGroup } from "DistributedTaskControls/Components/Task/TaskInputGroup";
import { DeployPhaseUtilities } from "DistributedTaskControls/Phase/DeployPhaseUtilities";
import { ProcessManagementStore } from "DistributedTaskControls/ProcessManagement/ProcessManagementStore";
import { ProcessManagementCapabilities } from "DistributedTaskControls/ProcessManagement/Types";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { IGroupedData, IProcessParameterViewState, ProcessParameterViewStore } from "DistributedTaskControls/Stores/ProcessParameterViewStore";

import { CommandButton } from "OfficeFabric/Button";
import { css } from "OfficeFabric/Utilities";

import { TaskGroupDefinition } from "TFS/DistributedTask/Contracts";
import { TaskInputDefinitionBase as TaskInputDefinition } from "TFS/DistributedTaskCommon/Contracts";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/ProcessParameter";

export interface IProcessParameterProps extends ComponentBase.IProps {
    linkUnlinkNotSupported?: boolean;
}

export interface IProcessParameterState extends IProcessParameterViewState {
    isConfirmationDialogVisible: boolean;
}

export class ProcessParameter extends ComponentBase.Component<IProcessParameterProps, IProcessParameterState> {

    public componentWillMount(): void {
        this._processManagementStore = StoreManager.GetStore<ProcessManagementStore>(ProcessManagementStore, this.props.instanceId);
        this._store = StoreManager.GetStore<ProcessParameterViewStore>(ProcessParameterViewStore, this.props.instanceId);
        this._actionCreator = ActionCreatorManager.GetActionCreator<ProcessParameterActionsCreator>(ProcessParameterActionsCreator, this.props.instanceId);
        this._setState();
    }

    public componentDidMount(): void {
        this._store.addChangedListener(this._onStoreUpdate);
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoreUpdate);
    }

    public render(): JSX.Element {

        let processParameters = this._store.getProcessParameters();
        let hasValidProcessParameters = processParameters &&
            processParameters.inputs &&
            processParameters.inputs.length > 0;

        let processParameterSectionHeader: JSX.Element = (
            <div className="dtc-processparameter-header">
                <div className="dtc-processparameter-label"
                    tabIndex={0}
                    aria-label={Resources.ProcessParameterGroupDescription}
                    onKeyDown={this._handleKeyDown}>
                    {Resources.ProcessParameterGroupLabel}
                    <InfoButton
                        ref={this._resolveRef("_parametersInfoElement")}
                        calloutContent={{
                            calloutDescription: Resources.ProcessParameterGroupDescription,
                            calloutLink: (hasValidProcessParameters) ? Resources.ProcessParameterGroupParamsMoreInfoLink : null,
                            calloutLinkText: (hasValidProcessParameters) ? Resources.ProcessParameterGroupParamsMoreInfo : null
                        } as ICalloutContentProps} />
                </div>
                {hasValidProcessParameters && this._processManagementStore.canEditProcess() && <span>
                    <span className="dtc-processparameter-separator">{"|"} </span>
                    <CommandButton
                        className={css("dtc-processparameter-unlinkall", "remove-linkSettings-button",
                            "fabric-style-overrides", "linkSettings-button")}
                        ariaLabel={Resources.UnlinkText}
                        onClick={
                            () => { this._onUnlinkAllClicked(); }
                        }
                        iconProps={{ iconName: "RemoveLink" }} >
                        {Resources.UnlinkAllText}
                    </CommandButton></span>}
            </div>
        );

        if (hasValidProcessParameters && this.state.phaseGroupedData && this.state.phaseGroupedData.length !== 0) {
            return (
                <div className="dtc-processparameter">
                    {processParameterSectionHeader}
                    <div className="dtc-processparameter-inputs">
                        {this._getTaskInputGroups()}
                    </div>

                    {/* Confirmation dialog for unlink-all scenario */}
                    <ConfirmationDialog
                        title={Resources.UnlinkAllProcessParametersDialogTitle}
                        subText={Resources.UnlinkAllProcessParametersDialogSubText}
                        onConfirm={
                            () => { this._onRemoveProcessParametersClicked(); }
                        }
                        showDialog={this.state.isConfirmationDialogVisible}
                        onCancel={this._hideUnlinkAllDialog}
                    />
                </div>
            );
        }
        else {
            //When there are no proc params,
            //check if the processParametersNotSupported prop is passed as true, if it is so then skip the Process Parameter section
            //otherwise only show the Text with Learn more

            //This scenario is used in CD
            if (!!this.props.linkUnlinkNotSupported) {
                return null;
            }

            //Show Learn more link with appropriate text.

            //This scenario is used in CI
            return (
                <div className="dtc-processparameter">
                    {processParameterSectionHeader}
                    <div className="dtc-processparameter-description">
                        {Resources.ProcessParameterGroupNoParamsHelp}
                        <MarkdownRenderer markdown={Resources.ProcessParameterGroupParamsMoreInfoMarkdown} />
                    </div>
                </div>
            );
        }
    }

    private _onUnlinkAllClicked(): void {
        this.setState({ isConfirmationDialogVisible: true } as IProcessParameterState);
    }

    private _hideUnlinkAllDialog = () => {
        this.setState({ isConfirmationDialogVisible: false } as IProcessParameterState);
    }

    private _onRemoveProcessParametersClicked(): void {
        this._publishProcessParameterUnlinkAllTelemetry();
        this._actionCreator.removeAllProcessParameters();
    }

    private _getTaskInputGroups(): JSX.Element[] {
        //Putting the grouping logic here     
        let taskInputGroups: JSX.Element[] = [];

        if (this.state.phaseGroupedData) {
            if (this.state.phaseGroupedData.length > 1) {
                //UI for multiple phases

                this.state.phaseGroupedData.forEach((perPhaseData: IGroupedData) => {
                    //Create groups for each phase
                    let phaseGroup = this._store.getGroupDefinition(perPhaseData.phaseStoreInstanceId);

                    let accordionBowtieClassName = DeployPhaseUtilities.getPhaseTypeIconName(this._store.getPhaseType(perPhaseData.phaseStoreInstanceId));
                    //Push task input groups for UI grouped rendering
                    taskInputGroups.push(this._createTaskInputGroup(phaseGroup, perPhaseData.processParameterInputs, accordionBowtieClassName));
                });
            }
            else {
                //UI for single phase: FlatList 
                //Passing groupdefinition as null for flatlist
                taskInputGroups.push(this._createTaskInputGroup(null, this.state.phaseGroupedData[0].processParameterInputs));
            }
        }
        return taskInputGroups;
    }

    private _createTaskInputGroup(groupDef: TaskGroupDefinition, processParameterInputs: TaskInputDefinition[], accordionBowtieClassName?: string): JSX.Element {
        let key = groupDef ? groupDef.name : null;

        return (<TaskInputGroup
            key={key}
            controllerInstanceId={this.props.instanceId}
            groupDefinition={groupDef}
            isSectionAutoCollapsed={false}
            inputs={processParameterInputs}
            controllerStore={this._store}
            controllerActions={this._actionCreator}
            inputActionDelegates={this._getInputActionDelegates()}
            footerRenderer={this._getFooterDelegates()}
            iconClassName={accordionBowtieClassName}
            requiredEditCapability={ProcessManagementCapabilities.EditProcessInputs} />);
    }

    private _getFooterDelegates(): IFooterRenderer {
        return {
            getFooter: this._getFooterComponent
        } as IFooterRenderer;
    }

    // This function takes input and showFooter as arguments, find the data according to the input
    // and passes showFooter to ProcessParameterInputFooterComponent to toggle visibility
    private _getFooterComponent = (input: TaskInputDefinition, showFooter: boolean, footerDescriptionElementId: string): JSX.Element => {
        this._inputInFocus = input;

        let inputNameKey: string = input.name.toLowerCase();

        if (this.state.inputNameToRefCountMap && this.state.inputNameToRefCountMap[inputNameKey]) {
            const inputNameLinkRefCount = this.state.inputNameToRefCountMap[inputNameKey];
            if (inputNameLinkRefCount === 1) {
                let linkedTaskNames: string[] = this._store.getInputReferencesText(input.name, true);

                if (linkedTaskNames && linkedTaskNames.length > 0) {
                    let singleLinkfooterText = Utils_String.format(Resources.ProcessParametersSingleSettingLinkedFooterText, linkedTaskNames[0]);
                    return (
                        <ProcessParameterInputFooterComponent
                            footerDescriptionElementId={footerDescriptionElementId}
                            inputFooterText={singleLinkfooterText}
                            showFooter={showFooter} />
                    );
                }
                else {
                    return null;
                }
            }
            else {
                let footerText = Utils_String.format(Resources.ProcessParametersMultipleSettingsLinkedFooterText, inputNameLinkRefCount);

                return (
                    <ProcessParameterInputFooterComponent
                        footerDescriptionElementId={footerDescriptionElementId}
                        inputFooterText={footerText}
                        showFooter={showFooter}
                        buttonCalloutProps={
                            {
                                calloutContent: {
                                    calloutAdditionalContent: this._getAdditionalContentForProcParamFooter
                                } as ICalloutContentProps,
                                linkText: Resources.ViewDetails
                            }
                        } />
                );
            }
        }
        else {
            return null;
        }
    }

    private _getAdditionalContentForProcParamFooter = (): JSX.Element => {
        return this._getAdditionalContentForInputCallout(this._inputInFocus);
    }

    private _getInputActionDelegates(): IInputActionDelegateProps {
        return {
            additionalContent: this._getAdditionalContentForInputCallout
        } as IInputActionDelegateProps;
    }

    private _getAdditionalContentForInputCallout = (inputDefn: TaskInputDefinition): JSX.Element => {
        if (inputDefn) {
            let linkNames: string[] = this._store.getInputReferencesText(inputDefn.name);
            let inputCount = this.state.inputNameToRefCountMap[inputDefn.name.toLowerCase()];

            return (
                <div className="callout-additionalContent">
                    <table>
                        <tbody>
                            <tr>
                                <td className="callout-additionalContent-icon">
                                    <span className="bowtie-icon bowtie-link" />
                                </td>
                                <td>
                                    {Utils_String.format(Resources.ProcessParametersCalloutText, inputCount)}
                                    {this._getListedNames(linkNames)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            );
        }
    }

    private _getListedNames(linkNames: string[]): JSX.Element[] {
        let listedName = linkNames.map((linkName: string) => {
            return <li key={DtcUtils.getUniqueInstanceId()}> {linkName} </li>;
        });
        return listedName;
    }

    private _onStoreUpdate = () => {
        this._setState();
    }

    private _setState(): void {
        this.setState(this._store.getState());
    }

    private _handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e && e.ctrlKey && e.altKey && e.keyCode === KeyCodes.Help) {
            if (this._parametersInfoElement) {
                this._parametersInfoElement.toggleInfoCalloutState();
            }
        }
    }

    private _publishProcessParameterUnlinkAllTelemetry() {
        const processParameters = this._store.getProcessParameters();
        if (processParameters && processParameters.inputs) {
            const count = processParameters.inputs.length;
            let eventProperties: IDictionaryStringTo<any> = {};
            eventProperties[Properties.ProcessParameterCount] = count;
            Telemetry.instance().publishEvent(Feature.UnlinkAllProcessParameters, eventProperties);
        }
    }

    private _inputInFocus: TaskInputDefinition = null;
    private _store: ProcessParameterViewStore;
    private _actionCreator: ProcessParameterActionsCreator;
    private _parametersInfoElement: InfoButton;
    private _processManagementStore: ProcessManagementStore;
}

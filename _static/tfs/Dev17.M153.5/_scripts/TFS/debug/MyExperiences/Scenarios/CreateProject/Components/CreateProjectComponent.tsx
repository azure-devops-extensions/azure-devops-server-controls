/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as VSSContext from "VSS/Context";
import * as Controls from "VSS/Controls";
import * as Combos from "VSS/Controls/Combos";
import * as Controls_TreeView from "VSS/Controls/TreeView";
import * as Locations from "VSS/Locations";
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as VSSResourcesPlatform from "VSS/Resources/VSS.Resources.Platform";
import {
    DefaultButton,
    PrimaryButton,
} from "OfficeFabric/Button";
import {
    Callout,
    ICalloutProps
} from "OfficeFabric/Callout";
import { ChoiceGroup, IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
import { Fabric } from "OfficeFabric/Fabric";
import { Icon } from "OfficeFabric/Icon";
import { Label } from "OfficeFabric/Label";
import { Link } from "OfficeFabric/Link";
import { TextField } from "OfficeFabric/TextField";
import { TooltipHost } from "VSSUI/Tooltip";
import {
    MessageBar,
    MessageBarType
} from "OfficeFabric/MessageBar";
import { IMessageBarProps } from "OfficeFabric/components/MessageBar/MessageBar.types";
import { css, getId, autobind, KeyCodes } from 'OfficeFabric/Utilities';
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { ActionCreator } from "MyExperiences/Scenarios/CreateProject/Actions/ActionCreator";
import {
    Store,
    ICreateProjectComponentState,
    IStatus
} from "MyExperiences/Scenarios/CreateProject/Stores/Store";
import { LinkCallout } from "MyExperiences/Scenarios/CreateProject/Components/LinkCallout";
import { SimpleComboBox } from "MyExperiences/Scenarios/CreateProject/Components/SimpleComboBox";
import { CollapsibleMessage } from "MyExperiences/Scenarios/CreateProject/Components/CollapsibleMessage";
import {
    StatusType,
    StatusValueType,
    INewProjectParameters,
    IProjectCreationMetadataItemDescriptor,
    IProcessTemplateDescriptor
} from "MyExperiences/Scenarios/CreateProject/Contracts";
import { ProjectParameterConstants } from "MyExperiences/Scenarios/CreateProject/Constants";
import * as Alerts from "MyExperiences/Scenarios/Shared/Alerts";
import * as HubAlert from "MyExperiences/Scenarios/Shared/Components/HubAlert";
import { HubSpinner, Alignment } from "MyExperiences/Scenarios/Shared/Components/HubSpinner";
import { MyExperiencesTelemetry } from "MyExperiences/Scripts/Telemetry";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";
import { FormattedMessage, IFormattedMessageLink } from "Presentation/Scripts/TFS/Components/FormattedMessage";
import { MyExperiencesUrls } from "Presentation/Scripts/TFS/TFS.MyExperiences.UrlHelper";
import { FeatureAvailabilityFlags, ProjectVisibilityConstants } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import "VSS/LoaderPlugins/Css!MyExperiences/Scenarios/CreateProject/Components/CreateProjectComponent";

export interface ICreateProjectComponentProps {
    /**
     * The action creator which holds the action methods associated with project creation
     */
    actionCreator: ActionCreator,
    /**
     * The action creator which holds the state associated with project creation
     */
    store: Store;
    /**
     *  Optional handler to be attached to the cancel button of the project creation page
     */
    onCancel?: () => void;
    /**
     * Optional handler to perform operations on scenario complete
     */
    onScenarioComplete?: () => void;
}

export module CreateProjectComponentRenderer {
    export function renderControl(element: HTMLElement, props: ICreateProjectComponentProps): void {
        ReactDOM.render(
            <CreateProjectComponent {...props} />,
            element);
    }
}

const ProjectDescriptionTextAreaMinHeight = 60;
const ProjectDescriptionTextAreaMaxHeight = 200;

const ProjectNameAvailablilityIconClass = {
    [StatusValueType.NoStatus]: "name-availability bowtie-icon",
    [StatusValueType.Success]: "name-availability bowtie-icon bowtie-check",
    [StatusValueType.Failure]: "name-availability bowtie-icon bowtie-edit-delete",
};

export class CreateProjectComponent extends React.Component<ICreateProjectComponentProps, ICreateProjectComponentState> {
    private _element: HTMLElement;
    private _createButtonControl: any;
    private _descTextFieldElement: HTMLTextAreaElement;

    private _collectionNameTextFieldId: string;
    private _projectNameTextFieldId: string;
    private _projectDescriptionTextFieldId: string;

    private _versionControlTooltipId: string;
    private _workItemProcessTooltipId: string;
    private _versionControlHelpTooltipId: string;
    private _workItemProcessHelpTooltipId: string;
    private _disabledProjectVisibilityTooltipId: string;

    private _projectNameAriaDescriptionId: string;
    private _projectDescriptionAriaDescriptionId: string;

    private _processTemplatesComboId: string;
    private _versionControlTypesComboId: string;

    private _projectDescTextFieldControl: HTMLElement;
    private _projectNameTextFieldControl: HTMLElement;
    private _projectNameTextField: TextField;
    private _processTemplateComboControl: SimpleComboBox;

    private _createProjectAnnouncer = new CreateProjectAnnouncer();

    constructor(props: ICreateProjectComponentProps, context?: any) {
        super(props, context);

        // Initialize the control
        this.props.actionCreator.fetchProjectCreationMetadata();

        this.state = jQuery.extend(true, {}, this.props.store.state);

        this._collectionNameTextFieldId = getId("collection-name-textfield");
        this._projectNameTextFieldId = getId("project-name-textfield");
        this._projectDescriptionTextFieldId = getId("project-description-textfield");

        this._versionControlTooltipId = getId("version-control-tooltip");
        this._workItemProcessTooltipId = getId("work-item-process-tooltip");
        this._versionControlHelpTooltipId = getId("version-control-help-tooltip");
        this._workItemProcessHelpTooltipId = getId("work-item-help-process-tooltip");
        this._disabledProjectVisibilityTooltipId = getId("disabled-project-visibility-tooltip");

        this._projectNameAriaDescriptionId = getId("project-name-aria-description");
        this._projectDescriptionAriaDescriptionId = getId("project-description-aria-description");

        this._processTemplatesComboId = "process-templates-combo";
        this._versionControlTypesComboId = "version-control-types-combo";
    }

    public render(): JSX.Element {

        const renderAlert = (): JSX.Element => {
            if (this.state.pageStatus.value !== StatusValueType.Failure) {
                // No error to show at the page level
                return null;
            } else {
                if (this.state.projectCreationMetadata.canUserCreateProject == null) {
                    // Return generic error
                    return (
                        <div className="generic-alert">
                            <HubAlert.HubAlert>
                                {Alerts.createReloadPromptAlertMessage(
                                    MyExperiencesResources.CreateProjectGenericServerErrorText)}
                            </HubAlert.HubAlert>
                        </div>
                    );
                } else if (this.state.projectCreationMetadata.canUserCreateProject === false) {
                    // Return permission error since the user does not have access to create a project
                    return (
                        <div className="permission-alert">
                            <HubAlert.HubAlert>
                                <span>
                                    {this.state.pageStatus.message}
                                </span>
                            </HubAlert.HubAlert>
                        </div>
                    );
                }
            }
        }

        const renderContent = (): JSX.Element => {
            if (this.state.pageStatus.value === StatusValueType.InProgress) {
                // Return the loading component if the page metadata is still being fetched
                return (
                    <div className="loading-spinner">
                        <HubSpinner alignment={Alignment.center} />
                    </div>
                );
            } else {
                let currentStatusToBeDisplayed = this._getCurrentStatusForMessageBar();
                let hasStatusDetailedMessage = !!currentStatusToBeDisplayed && !!currentStatusToBeDisplayed.detailedMessage;
                let hasStatusJobId = !!currentStatusToBeDisplayed && !!currentStatusToBeDisplayed.creationJobId;
                const showCodeOfConductStatement = this._showProjectVisibilityOptions()
                    && this.state.projectParamsState.currentProjectVisibilityOption.id === ProjectVisibilityConstants.Everyone;                

                // Return the project creation form scine the page metadata is fetched
                return (
                    <Fabric>
                        <div className="create-project-form bowtie-fabric">
                            <fieldset className="form-fieldset">
                                <div className="title-banner">
                                    <img src={Locations.urlHelper.getVersionedContentUrl("MyExperiences/project-creation-title-banner.svg")} alt="" />
                                </div>
                                <div className="title-container">
                                    <Label className="form-header">
                                        {MyExperiencesResources.CreateProjectFormHeader}
                                    </Label>
                                    <Label className="form-sub-header">
                                        {MyExperiencesResources.CreateProjectFormSubHeader}
                                    </Label>
                                </div>
                                {this._showStatus() && currentStatusToBeDisplayed != undefined &&
                                    <div className="status-container">
                                        <MessageBar
                                            ariaLabel={currentStatusToBeDisplayed.message}
                                            messageBarType={this._getStatusMessageBarType(currentStatusToBeDisplayed)}
                                            onDismiss={this._onStatusDismissed}>
                                            {
                                                hasStatusDetailedMessage && !VSSContext.getPageContext().webAccessConfiguration.isHosted ?
                                                    // Only show PCW details on-prem
                                                    <CollapsibleMessage
                                                        collapsibleContent={<span>{currentStatusToBeDisplayed.detailedMessage}</span>}
                                                        alwaysVisibleContent={
                                                            hasStatusJobId ?
                                                                <span className="download-log-container">
                                                                    <span className="download-text">{currentStatusToBeDisplayed.message}</span>
                                                                    <span className="download-text">{MyExperiencesResources.RetrieveCreateProjectFailureTextPreHere}</span>
                                                                    <Link
                                                                        onClick={this._onDownloadJobLog}
                                                                        className="download-link">{MyExperiencesResources.RetrieveCreateProjectFailureTextHere}</Link>
                                                                    <span className="download-text">{MyExperiencesResources.RetrieveCreateProjectFailureTextAfterHere}</span>
                                                                </span> :
                                                                <span>{currentStatusToBeDisplayed.message}</span>
                                                        } />
                                                    :
                                                    // We are displaying information message from resources file and hence using dangerouslySetInnerHTML is safe
                                                    <span dangerouslySetInnerHTML={{ __html: currentStatusToBeDisplayed.message }} />
                                            }
                                        </MessageBar>
                                    </div>
                                }
                                {VSSContext.getPageContext().webAccessConfiguration.isHosted !== true &&
                                    <div className="collection-name-container">
                                        <Label htmlFor={this._collectionNameTextFieldId}>
                                            {MyExperiencesResources.CreateProjectCollectionNameContainerHeader}
                                        </Label>
                                        <TextField className="text-input"
                                            id={this._collectionNameTextFieldId}
                                            value={(this.state.projectCreationMetadata && !(this.state.projectCreationMetadata.collectionName == undefined))
                                                ? this.state.projectCreationMetadata.collectionName
                                                : Utils_String.empty}
                                            disabled
                                        />
                                    </div>
                                }
                                <div className="project-name-container">
                                    <Label required={true} htmlFor={this._projectNameTextFieldId}>
                                        {MyExperiencesResources.CreateProjectNameContainerHeader}
                                    </Label>
                                    <div ref={(control) => this._projectNameTextFieldControl = control}>
                                        <TextField
                                            ref={(ref) => this._projectNameTextField = ref}
                                            id={this._projectNameTextFieldId}
                                            aria-describedby={this._projectNameAriaDescriptionId}
                                            className={this._getProjectNameTextFieldClass()}
                                            onGetErrorMessage={this._validateProjectName}
                                            deferredValidationTime={500}
                                            disabled={!this._canEnableFormElement()}
                                            maxLength={ProjectParameterConstants.MaxProjectNameLength + ProjectParameterConstants.ProjectNameBufferLength}
                                            defaultValue={this.state.projectNameState.name}
                                        />
                                        <span className={this._getProjectNameAvailabilityIconClass()} />
                                        <div className="hidden" id={this._projectNameAriaDescriptionId}>
                                            {MyExperiencesResources.CreateProjectNameToolTip}
                                        </div>
                                    </div>
                                    {this.state.projectNameState.name && this.state.projectNameState.status.message &&
                                        <Callout
                                            className="error-message-callout"
                                            target={this._projectNameTextFieldControl}
                                            directionalHint={DirectionalHint.bottomLeftEdge}
                                            gapSpace={-5}
                                            beakWidth={6}
                                            doNotLayer={true}>
                                            <div className="callout-content" role="alert">
                                                <span className="text">
                                                    {this.state.projectNameState.status.message}
                                                    {this.state.projectNameState.meetsRequirements === false &&
                                                        <Link className="learn-more-link"
                                                            aria-label={MyExperiencesResources.CreateProjectNameRequirementsLearnMoreAriaLabel}
                                                            href={MyExperiencesResources.CreateProjectNameRequirementsLearnMoreLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer">
                                                            {MyExperiencesResources.LearnMoreText}
                                                        </Link>
                                                    }
                                                </span>
                                            </div>
                                        </Callout>
                                    }
                                </div>
                                <div ref={(control) => this._projectDescTextFieldControl = control} className="project-description-container">
                                    <Label htmlFor={this._projectDescriptionTextFieldId}>
                                        {MyExperiencesResources.CreateProjectDescriptionContainerHeader}
                                    </Label>
                                    <TextField className="text-input"
                                        id={this._projectDescriptionTextFieldId}
                                        aria-describedby={this._projectDescriptionAriaDescriptionId}
                                        multiline={true}
                                        resizable={false}
                                        onBeforeChange={this._beforeDescriptionChanged}
                                        disabled={!this._canEnableFormElement()}
                                        maxLength={ProjectParameterConstants.MaxProjectDescLength}
                                        defaultValue={this.state.projectParamsState.projectDescription}
                                    />
                                    <div className="hidden" id={this._projectDescriptionAriaDescriptionId}>
                                        {MyExperiencesResources.CreateProjectDecriptionToolTip}
                                    </div>
                                </div>
                                <div className="divider" />
                                {this._showProjectVisibilityOptions() &&
                                    <ChoiceGroup className="project-visibility-container"
                                        label={MyExperiencesResources.CreateProjectProjectVisibilitySectionHeader}
                                        onChange={this._onProjectVisibilityChanged}
                                        options={this._getProjectVisibilityOptions()}
                                        disabled={!this._canEnableFormElement()}>
                                    </ChoiceGroup>
                                }
                                <div className="version-control-container">
                                    <Label // _txt is added by Combo control for the input element
                                        className={"combobox-label"}
                                        htmlFor={this._versionControlTypesComboId + "_txt"}>
                                        {MyExperiencesResources.CreateProjectVersionControlSectionHeader}
                                    </Label>
                                    <div className="version-control-contents">
                                        <div className="vc-list">
                                            <SimpleComboBox
                                                className="version-control-combo"
                                                options={this._getVersionControlComboOptions()}
                                                enhancementOptions={this._getVersionControlComboEnhancementOptions()}
                                            />
                                            <div className="hidden" id={this._versionControlTooltipId}>
                                                {MyExperiencesResources.CreateProjectVersionControlToolTip}
                                            </div>
                                        </div>
                                        <TooltipHost
                                            id={this._versionControlHelpTooltipId}
                                            hostClassName="help-icon-tooltip-host"
                                            content={MyExperiencesResources.CreateProjectVersionControlHelpToolTip}
                                            directionalHint={DirectionalHint.bottomCenter}>
                                            <Link className="help-icon-container"
                                                href={MyExperiencesResources.CreateProjectVersionControlLearnMoreLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={MyExperiencesResources.VersionControlLearnMoreAriaLabel}
                                                aria-describedby={this._versionControlHelpTooltipId}
                                                disabled={!this._canEnableFormElement()}>
                                                <span className="bowtie-icon bowtie-status-help-outline" />
                                            </Link>
                                        </TooltipHost>
                                    </div>
                                </div>
                                <div className="work-item-process-container">
                                    <Label // _txt is added by Combo control for the input element
                                        className={"combobox-label"}
                                        htmlFor={this._processTemplatesComboId + "_txt"}>
                                        {MyExperiencesResources.CreateProjectWorkItemProcessSectionHeader}
                                    </Label>
                                    <div className="work-item-process-contents">
                                        <div className="process-list">
                                            <SimpleComboBox
                                                className="work-item-process-combo"
                                                options={this._getProcessTemplateComboOptions()}
                                                enhancementOptions={this._getProcessTemplateComboEnhancementOptions()}
                                                ref={(combo) => this._processTemplateComboControl = combo}
                                            />
                                            <div className="hidden" id={this._workItemProcessTooltipId}>
                                                {MyExperiencesResources.CreateProjectProcessTemplateToolTip}
                                            </div>
                                        </div>
                                        <TooltipHost
                                            id={this._workItemProcessHelpTooltipId}
                                            hostClassName="help-icon-tooltip-host"
                                            content={MyExperiencesResources.CreateProjectProcessTemplateHelpToolTip}
                                            directionalHint={DirectionalHint.bottomCenter}>
                                            <Link className="help-icon-container"
                                                aria-label={MyExperiencesResources.WorkItemProcessLearnMoreAriaLabel}
                                                aria-describedby={this._workItemProcessHelpTooltipId}
                                                href={MyExperiencesResources.CreateProjectProcessTemplateLearnMoreLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                disabled={!this._canEnableFormElement()}>
                                                <span className="bowtie-icon bowtie-status-help-outline" />
                                            </Link>
                                        </TooltipHost>
                                    </div>
                                    {this.state.projectParamsState.currentProcessTemplate
                                        && !this.state.projectParamsState.currentProcessTemplate.isSystemTemplate
                                        && this.state.projectParamsState.currentProcessTemplate.description &&
                                        <LinkCallout
                                            linkText={MyExperiencesResources.CreateProjectShowDescriptionText}
                                            ariaLabel={MyExperiencesResources.CreateProjectShowDescriptionLinkAriaLabel}
                                            calloutTitle={this.state.projectParamsState.currentProcessTemplate.name}
                                            calloutText={this.state.projectParamsState.currentProcessTemplate.description}
                                            directionalHint={DirectionalHint.bottomCenter}
                                            gapSpace={5} />
                                    }
                                </div>
                                {
                                    showCodeOfConductStatement &&
                                    <div className="code-of-conduct-statement">
                                        <FormattedMessage
                                            links={[
                                                {
                                                    text: VSSResourcesPlatform.BrandWithProductName,
                                                },
                                                {
                                                    text: MyExperiencesResources.CreateProjectCodeOfConductText,
                                                    href: MyExperiencesResources.CreateProjectCodeOfConductLink,
                                                    target: "_blank",
                                                    rel: "noopener noreferrer",
                                                }
                                            ]}
                                            message={MyExperiencesResources.CreateProjectCodeOfConductStatement} />
                                    </div>
                                }
                                <div className="divider" />
                                {this.state.projectCreationMetadata.isReportingConfigured &&
                                    renderReportingWarning()
                                }
                                <div className="actions-container">
                                    <span className="create-action">
                                        <PrimaryButton ref={(control) => this._createButtonControl = control}
                                            ariaLabel={this._getCreateProjectCtaAriaLabel()}
                                            disabled={!this._canEnableCreateProjectCTA()}
                                            onClick={this._onCreateButtonClick}>
                                            <span className={css(`ms-Button-label`)} id={getId()} >
                                                {(this.state.creationStatus.value == StatusValueType.InProgress || this.state.creationStatus.value == StatusValueType.Success) &&
                                                    <span className="bowtie-icon bowtie-spinner" />
                                                }
                                                {this._getCreateProjectCTAText()}
                                            </span>
                                        </PrimaryButton>
                                    </span>
                                    <span className="cancel-action">
                                        <DefaultButton
                                            ariaLabel={MyExperiencesResources.CreateProjectCancelButtonText}
                                            onClick={this._onCancelButtonClick}>
                                            {MyExperiencesResources.CreateProjectCancelButtonText}
                                        </DefaultButton>
                                    </span>
                                </div>
                            </fieldset>
                        </div>
                    </Fabric>
                );
            }
        }

        const renderReportingWarning = (): JSX.Element => {
            return (
                <div className="report-onprem-warning">
                    <span className="bowtie bowtie-icon bowtie-status-warning" />
                    <span>{MyExperiencesResources.CreateProjectOnPremWarningPart1}</span>
                    <Link href={MyExperiencesResources.CreateProjectOnPremWarningFindoutLinkUrl}
                        target="_blank"
                        rel="noopener noreferrer">
                        {MyExperiencesResources.CreateProjectOnPremWarningFindoutLinkText}
                    </Link>
                    <span>{MyExperiencesResources.CreateProjectOnPremWarningPart2}</span>
                    <br />
                    <br />
                </div>
            );
        }

        return (
            <div ref={(element) => this._element = element} className="create-project-component">
                {renderAlert()}
                {renderContent()}
            </div>
        );
    }

    public componentWillUpdate(nextProps: ICreateProjectComponentProps, nextState: ICreateProjectComponentState): void {
        // If the new state has the project url, navigate to that url
        if (!(nextState.projectUrl == undefined)) {
            window.location.href = nextState.projectUrl;
        }
    }

    public componentDidUpdate(prevProps: ICreateProjectComponentProps, prevState: ICreateProjectComponentState): void {
        // Call the scenario complete callback once page data is loaded and rendered
        if ((prevState.pageStatus.value === StatusValueType.InProgress) &&
            (this.state.pageStatus.value === StatusValueType.Success || this.state.pageStatus.value === StatusValueType.Failure)) {

            if ($.isFunction(this.props.onScenarioComplete)) {
                this.props.onScenarioComplete();
            }

            if (this._projectNameTextFieldControl) {
                let inputElements: NodeListOf<HTMLInputElement> = this._projectNameTextFieldControl.getElementsByTagName("input");
                if (inputElements.length > 0) {
                    inputElements[0].focus();
                }
            }
        }
    }

    public componentDidMount(): void {
        document.title = this._getPageTitle();

        this.props.store.addChangedListener(this._onStoreChanged);
        this._element.onkeydown = this._onKeyDown;
    }

    public componentWillUnmount(): void {
        this.props.store.removeChangedListener(this._onStoreChanged);
        this._element = null;
        this._descTextFieldElement = null;
        this._createButtonControl = null;
        this._projectDescTextFieldControl = null;
        this._projectNameTextFieldControl = null;
        this._processTemplateComboControl = null;
    }

    private _onStoreChanged = (): void => {
        this._createProjectAnnouncer.announceCTATextChange(this.props.store.state.creationStatus);

        this.setState(jQuery.extend(true, {}, this.props.store.state));
    }

    /**
     * Updates the selected version control data based on the selected index
     * @param index - The index of selected dropdown element
     */
    private _onVersionControlComboIndexChanged = (index: number): boolean => {
        setTimeout(() => {
            this.props.actionCreator.updateVersionControlType(index);
        }, 50);

        return true;
    }

    /**
     * Updates the selected project visibility data based on the selected radio button input.
     */
    private _onProjectVisibilityChanged = (event?: React.SyntheticEvent<HTMLInputElement>, visibilityOption?: IChoiceGroupOption): void => {
        let id = -1;
        this.state.projectCreationMetadata.projectVisibilityMetadata.forEach(
            (value, index) => {
                if (value.id === visibilityOption.key) {
                    id = index;
                    return false;
                }
            });

        if (id > -1)
        {
            this.props.actionCreator.updateProjectVisibilityOption(id);
        }
    }

    /**
     * Updates the selected process template data based on the selected index
     * @param dropPopup - The drop down popup of the combo
     */
    private _onProcessTemplateComboIndexChanged = (index: number): boolean => {
        setTimeout(() => {
            this.props.actionCreator.updateProcessTemplate(this._processTemplateComboControl.getText());
        }, 50);

        return true;
    }

    /**
     * Keydown event handler for the control to decide if the project creation is to be initiated
     */
    private _onKeyDown = (event: KeyboardEvent): void => {
        if (event.keyCode === KeyCodes.enter) {
            let $eventTarget = $(event.target);
            if ((!event.shiftKey && $eventTarget.is("input[type='text']")) || ($eventTarget.is("textarea") && event.ctrlKey)) {
                if (this._createButtonControl && this._canEnableCreateProjectCTA()) {
                    this._onCreateButtonClick();
                }
            }
        }
    }

    /**
     * Click handler for the Create button
     */
    private _onCreateButtonClick = (): void => {
        // Invoke the create project function to trigger the project creation
        this._createProject();

        MyExperiencesTelemetry.LogNewProjectCreateButtonClicked(this.state.source, this.state.projectNameState.name);
    }

    /**
     * Click handler for the Cancel button
     */
    private _onCancelButtonClick = (): void => {
        MyExperiencesTelemetry.LogNewProjectCancelButtonClicked(this.state.source);

        const currentUrl = window.location.href;
        if (this.props.onCancel) {
            this.props.onCancel();
        }

        setTimeout(() => {
            const newUrl = window.location.href;
            if (currentUrl === newUrl) {
                // Two cases in which we will have to navigate to the projects hub
                //   1. If this.props.onCancel is null or undefined
                //   2. If this.props.onCancel does not navigate to any other page
                MyExperiencesUrls.getMyProjectsUrl(
                    this.props.store.state.projectCreationMetadata.collectionName).then((url: string) => {
                        window.location.href = url;
                    });
            }
        }, 500);
    }

    /**
     * Invokes the new team project creation flow with the entered /selected parameters
     */
    private _createProject(): void {
        let newProjectParams: INewProjectParameters = {
            collectionId: this.state.projectCreationMetadata.collectionId,
            projectName: this.state.projectNameState.name.trim(),
            projectDescription: this.state.projectParamsState.projectDescription.trim(),
            processTemplateId: this.state.projectParamsState.currentProcessTemplate.id.toString(),
            processTemplateTypeId: this.state.projectParamsState.currentProcessTemplate.typeId,
            versionControlOption: this.state.projectParamsState.currentVersionControl.id,
            projectVisibilityOption: this.state.projectParamsState.currentProjectVisibilityOption != undefined
                ? this.state.projectParamsState.currentProjectVisibilityOption.id
                : null
        };

        // Invoking the project creation call
        this.props.actionCreator.createProject(
            newProjectParams,
            this.state.source,
            this._projectNameTextField.value,
            this.state.projectCreationMetadata.existingProjectNames
        );
    }

    /**
     * Get the version control types from state and contruct the combo box options
     */
    private _getVersionControlComboOptions(): Combos.IComboOptions {
        let options: Combos.IComboOptions = {};

        options = {
            id: this._versionControlTypesComboId,
            type: Controls_TreeView.ComboTreeBehaviorName,
            source: this.state.projectParamsState.versionControlTypes,
            value: this.state.projectParamsState.currentVersionControl != undefined ? this.state.projectParamsState.currentVersionControl.name : Utils_String.empty,
            enabled: this._canEnableFormElement(),
            allowEdit: false,
            indexChanged: this._onVersionControlComboIndexChanged
        };

        return options;
    }

    private _getVersionControlComboEnhancementOptions(): Controls.EnhancementOptions {
        let options: Controls.EnhancementOptions = {};

        options = {
            ariaAttributes: {
                describedby: this._versionControlTooltipId
            }
        };

        return options;
    }

    /**
     * Get the project visibility options from state and contruct the choice group options.
     */
    private _getProjectVisibilityOptions(): IChoiceGroupOption[] {
        const visibilityMetadata = this.state.projectCreationMetadata.projectVisibilityMetadata || [];
        const choiceGroupOptions: IChoiceGroupOption[] = visibilityMetadata.map((value: IProjectCreationMetadataItemDescriptor) => {
            const text = this._getOptionText(value.id);
            const choiceGroupOption: IChoiceGroupOption = {
                key: value.id,
                text: text,
                disabled: value.isDisabled,
                onRenderLabel: (props) => this._renderVisibilityOptionLabel(props, value.id, text, value.isDisabled),
                checked: this.state.projectParamsState.currentProjectVisibilityOption != undefined && this.state.projectParamsState.currentProjectVisibilityOption.id === value.id,
                onRenderField: (props, render) => this._renderVisibilityOptionField(props, render, value.id),
            };

            return choiceGroupOption;
        });

        return choiceGroupOptions;
    }

    private _getOptionText(visibility: string): string {
        switch (visibility) {
            case ProjectVisibilityConstants.TeamMembers:
                return MyExperiencesResources.CreateProjectPrivateVisibilityText;
            case ProjectVisibilityConstants.EveryoneInTenant:
                return MyExperiencesResources.CreateProjectOrganizationVisibilityText;
            case ProjectVisibilityConstants.Everyone:
                return MyExperiencesResources.CreateProjectPublicVisibilityText;
            default:
                throw new Error(Utils_String.format(MyExperiencesResources.CreateProjectInvalidVisibilityValue, visibility));
        }
    }

    private _renderVisibilityOptionLabel(props: IChoiceGroupOption, visibility: string, label: string, disabled: boolean): JSX.Element {
        return (
            <div className={css("visibility-option-label", { "enabled": !disabled }, { "disabled": disabled })}>
                <Icon iconName={this._getIconName(visibility)} className={"visibility-option-icon"} />
                {label}
                {
                    disabled &&
                    <TooltipHost
                        id={this._disabledProjectVisibilityTooltipId}
                        className={"info-icon-tooltip-host"}
                        content={MyExperiencesResources.CreateProjectDisabledProjectVisibilityTooltip}
                        directionalHint={DirectionalHint.rightCenter}>
                        <Icon
                            tabIndex={0}
                            iconName={"Info"}
                            className={"info-icon"}
                            aria-describedby={Utils_String.format("{0} {1}", props.id, this._disabledProjectVisibilityTooltipId)} />
                    </TooltipHost>
                }
            </div>
        );
    }

    private _renderVisibilityOptionField(props: IChoiceGroupOption, render: (props: IChoiceGroupOption) => JSX.Element, visibility: string): JSX.Element {
        return (
            <div>
                {render(props)}
                {this._getVisibilityOptionDescription(visibility)}
            </div>
        );
    }

    private _getIconName(visibility: string): string {
        switch (visibility) {
            case ProjectVisibilityConstants.TeamMembers:
                return "Lock";
            case ProjectVisibilityConstants.EveryoneInTenant:
                return "CityNext";
            case ProjectVisibilityConstants.Everyone:
                return "Globe";
            default:
                throw new Error(Utils_String.format(MyExperiencesResources.CreateProjectInvalidVisibilityValue, visibility));
        };
    }

    private _getVisibilityOptionDescription(visibility: string): JSX.Element {
        const className = "ms-fontColor-neutralTertiary visibility-option-description";
        switch (visibility) {
            case ProjectVisibilityConstants.Everyone:
                return (
                    <div className={className}>
                        <FormattedMessage
                            links={[
                                {
                                    text: MyExperiencesResources.LearnMoreText.trim(),
                                    href: MyExperiencesResources.CreateProjectPublicProjectsLearnMoreLink,
                                    target: "_blank",
                                    rel: "noopener noreferrer",
                                }
                            ]}
                            message={MyExperiencesResources.CreateProjectPublicVisibilityOptionDescription}
                        />
                    </div>
                );
            case ProjectVisibilityConstants.EveryoneInTenant:
                return (
                    <div className={className}>
                        <FormattedMessage
                            links={[
                                {
                                    text: MyExperiencesResources.CreateProjectMembersOfYourOrganizationText,
                                    href: MyExperiencesResources.CreateProjectMembersOfYourOrganizationLink,
                                    target: "_blank",
                                    rel: "noopener noreferrer",
                                },
                                {
                                    text: MyExperiencesResources.LearnMoreText.trim(),
                                    href: MyExperiencesResources.CreateProjectOrganizationProjectsLearnMoreLink,
                                    target: "_blank",
                                    rel: "noopener noreferrer",
                                },
                            ]}
                            message={MyExperiencesResources.CreateProjectOrganizationVisibilityOptionDescription}
                        />
                    </div>
                );
            case ProjectVisibilityConstants.TeamMembers:
                return (
                    <div className={className}>
                        {MyExperiencesResources.CreateProjectPrivateVisibilityOptionDescription}
                    </div>
                );
            default:
                throw new Error(Utils_String.format(MyExperiencesResources.CreateProjectInvalidVisibilityValue, visibility));
        }
    }

    /**
     * Get the process templates from state and construct the combo box options
     */
    private _getProcessTemplateComboOptions(): Combos.IComboOptions {
        let options: Combos.IComboOptions = {};

        options = {
            id: this._processTemplatesComboId,
            type: Controls_TreeView.ComboTreeBehaviorName,
            source: this.state.projectParamsState.parentProcessTemplates,
            value: this.state.projectParamsState.currentProcessTemplate != undefined ? this.state.projectParamsState.currentProcessTemplate.name : Utils_String.empty,
            enabled: this._canEnableFormElement(),
            allowEdit: false,
            indexChanged: this._onProcessTemplateComboIndexChanged
        };

        return options;
    }

    private _getProcessTemplateComboEnhancementOptions(): Controls.EnhancementOptions {
        let options: Controls.EnhancementOptions = {};

        options = {
            ariaAttributes: {
                describedby: this._workItemProcessTooltipId
            }
        };

        return options;
    }

    /**
     * Get the icon class for the project name validation icon based on the project name state
     */
    private _getProjectNameAvailabilityIconClass(): string {
        let iconClass: string = Utils_String.empty;
        // Show validation icon if the project name is entered and if creation status is not a failure
        if (this.state.projectNameState.name && this.state.creationStatus.value !== StatusValueType.Failure) {
            switch (this.state.projectNameState.status.value) {
                case StatusValueType.Success:
                    iconClass = ProjectNameAvailablilityIconClass[StatusValueType.Success];
                    break;
                case StatusValueType.Failure:
                    iconClass = ProjectNameAvailablilityIconClass[StatusValueType.Failure];
                    break;
                case StatusValueType.NoStatus:
                case StatusValueType.InProgress:
                default:
                    iconClass = ProjectNameAvailablilityIconClass[StatusValueType.NoStatus];
                    break;
            }
        }
        return iconClass;
    }

    /**
     * Get the Fabric MessageBar type based on the status state
     */
    private _getStatusMessageBarType(status: IStatus): MessageBarType {
        let statusMessageBarType: MessageBarType;
        switch (status.value) {
            case StatusValueType.Success:
                statusMessageBarType = MessageBarType.success;
                break;
            case StatusValueType.Failure:
                statusMessageBarType = MessageBarType.error;
                break;
            case StatusValueType.Warning:
            case StatusValueType.NoStatus:
            case StatusValueType.InProgress:
            default:
                statusMessageBarType = MessageBarType.info;
                break;
        }
        return statusMessageBarType;
    }

    /**
     * Get the class for the project name text field based on the project name state
     */
    private _getProjectNameTextFieldClass(): string {
        let textFieldClass: string = Utils_String.empty;
        switch (this.state.projectNameState.status.value) {
            case StatusValueType.Failure:
                textFieldClass = "invalid-text-input";
                break;
            case StatusValueType.Success:
            case StatusValueType.NoStatus:
            case StatusValueType.InProgress:
            default:
                textFieldClass = "text-input";
                break;
        }
        return textFieldClass;
    }

    /**
     * Returns the page title page on the environment type
     */
    private _getPageTitle(): string {
        var titleFormat = VSSContext.getPageContext().webAccessConfiguration.isHosted
            ? VSSResourcesPlatform.PageTitleWithContent_Hosted
            : VSSResourcesPlatform.PageTitleWithContent;
        return Utils_String.format(titleFormat, MyExperiencesResources.CreateProjectFormHeader);
    }

    /**
     * Returns whether the project visibility options are to be displayed or not
     */
    private _showProjectVisibilityOptions(): boolean {
        return (this.state.projectParamsState.projectVisibilityOptions != undefined) && (this.state.projectParamsState.projectVisibilityOptions.length > 0);
    }

    /**
     * Returns whether the status message bar is to be shown or not
     */
    private _showStatus(): boolean {
        return (this.state.creationStatus.value === StatusValueType.Failure || this.state.pageStatus.value === StatusValueType.Warning);
    }

    /**
     * Returns the status that we need to display in the message bar
     */
    private _getCurrentStatusForMessageBar(): IStatus {
        if (this.state.creationStatus.value === StatusValueType.Failure) {
            return this.state.creationStatus;
        } else if (this.state.pageStatus.value === StatusValueType.Warning) {
            return this.state.pageStatus;
        }

        return null;
    }

    /**
     * Returns whether the form element is to be enabled or not based on user permission state
     */
    private _canEnableFormElement(): boolean {
        return (
            this.state.projectCreationMetadata != undefined
            && this.state.projectCreationMetadata.canUserCreateProject
            && this.state.pageStatus.value !== StatusValueType.Failure           // Enable components when the page status is not failure
            && this.state.creationStatus.value !== StatusValueType.InProgress    // Disable components while the project creation is in progress
            && this.state.creationStatus.value !== StatusValueType.Success       // Disable components while the project creation is done and navigation is in progress
        );
    }

    /**
     * Returns whether the Create project CTA button should be enabled or not based on the state
     */
    private _canEnableCreateProjectCTA(): boolean {
        if (!this._canEnableFormElement()) {
            return false;
        }

        if (!this.state.projectNameState.name) {
            return false;
        }

        if (this.state.projectNameState.status.value !== StatusValueType.Success) {
            return false;
        }

        return true;
    }

    /**
     * Returns the text for the CTA button based on the state
     */
    private _getCreateProjectCTAText(): string {
        if (this.state.creationStatus.value == StatusValueType.InProgress) {
            return MyExperiencesResources.CreateProjectCreatingCTAButtonText;
        }

        if (this.state.creationStatus.value == StatusValueType.Success) {
            return MyExperiencesResources.CreateProjectNavigatingCTAButtonText;
        }

        return MyExperiencesResources.CreateProjectCTAButtonText;
    }

    /**
     * Returns the text for the CTA button ariaLabel based on the state
     */
    private _getCreateProjectCtaAriaLabel(): string {
        if (this.state.creationStatus.value == StatusValueType.InProgress) {
            return MyExperiencesResources.CreateProjectCreatingCTAButtonToolTip;
        }

        if (this.state.creationStatus.value == StatusValueType.Success) {
            return MyExperiencesResources.CreateProjectNavigatingCTAButtonToolTip;
        }

        return MyExperiencesResources.CreateProjectCreateCTAButtonToolTip;
    }

    /**
     * To check the validity of the project name entered in the project name text box
     * @param newValue - The new value entered in the project name text box
     */
    private _validateProjectName = (newValue: string): string => {
        if (this._canEnableFormElement()) {
            if (newValue) {
                this.props.actionCreator.validateAndUpdateProjectName(
                    newValue,
                    this.state.projectCreationMetadata.existingProjectNames);
            } else if (this.state.projectNameState.status.value !== StatusValueType.NoStatus) {
                // If the status is already reset, do not call reset again
                // This is added to prevent validation check during mount
                this.props.actionCreator.resetProjectNameValidation();
            }
        }
        return Utils_String.empty;
    }

    /**
     * To grow the descriptions field as the user types in the description
     * @param newValue - The new value entered in the description text box
     */
    private _beforeDescriptionChanged = (newValue: string): void => {
        if (this._projectDescTextFieldControl) {
            let textAreaElements: NodeListOf<HTMLTextAreaElement> = this._projectDescTextFieldControl.getElementsByTagName("textarea");
            if (textAreaElements.length > 0) {
                this._descTextFieldElement = textAreaElements[0];

                this._descTextFieldElement.style.height = "0px";

                // The +2 prevents the vertical scrollbar from showing up (one pixel on top and one on bottom)
                let scrollHeight: number = this._descTextFieldElement.scrollHeight + 2;
                let visibleHeight = Math.min(Math.max(scrollHeight, ProjectDescriptionTextAreaMinHeight), ProjectDescriptionTextAreaMaxHeight);

                if (visibleHeight < ProjectDescriptionTextAreaMaxHeight) {
                    this._descTextFieldElement.style.overflowY = "none";
                } else if (this._descTextFieldElement.style.overflowY != "auto") {
                    this._descTextFieldElement.style.overflowY = "auto";
                }

                this._descTextFieldElement.style.height = visibleHeight + "px";
            }
        }

        this.props.actionCreator.updateProjectDescription(newValue);
    }

    /**
     * Dismisses the status message shown on the control
     */
    private _onStatusDismissed = (): void => {
        this.props.actionCreator.dismissStatus();
    }

    /**
     * Download the detailed job creation log 
     */
    private _onDownloadJobLog = (): void => {
        let jobGuid = this.state.creationStatus.creationJobId;
        if (Utils_String.isGuid(jobGuid)) {
            this.props.actionCreator.downloadProjectCreationLog(this.state.projectNameState.name, jobGuid)
        }
    }
}

/**
 * Announcer for create project page regions
 */
class CreateProjectAnnouncer {
    private _previousStatusValue: StatusValueType;

    public announceCTATextChange(creationStatus: IStatus): void {
        const currentStatusValue = creationStatus.value;
        let message = null;

        switch (currentStatusValue) {
            case StatusValueType.InProgress:
                message = MyExperiencesResources.CreateProjectCreatingCTAButtonToolTip;
                break;
            case StatusValueType.Success:
                message = MyExperiencesResources.CreateProjectNavigatingCTAButtonToolTip;
                break;
            case StatusValueType.Failure:
                message = MyExperiencesResources.CreateProjectJobFailedErrorText;
                break;
        }

        if (message && currentStatusValue != this._previousStatusValue) {
            announce(message, true);
            this._previousStatusValue = currentStatusValue;
        }
    }
}

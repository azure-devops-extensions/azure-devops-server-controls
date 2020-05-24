import * as VSSStore from "VSS/Flux/Store";
import * as Utils_String from "VSS/Utils/String";
import {
    IProjectCreationStatusPayload,
    IProjectCreationMetadataLoadedPayload,
    IProjectNameValidationStatusPayload,
    IStatusPayload
} from "MyExperiences/Scenarios/CreateProject/ActionsHub";
import {
    StatusType,
    StatusValueType,
    IParentComboItem,
    IChildComboItem,
    IProjectCreationMetadataItemDescriptor,
    IProcessTemplateDescriptor,
    IProjectCreationMetadata
} from "MyExperiences/Scenarios/CreateProject/Contracts";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";

export interface ICreateProjectComponentState {
    projectUrl: string;
    projectCreationMetadata: IProjectCreationMetadata;
    projectNameState: IProjectNameState,
    projectParamsState: IProjectParamsState,
    creationStatus: IStatus;
    pageStatus: IStatus;
    source: string;
}

export interface IProjectNameState {
    name: string;
    meetsRequirements: boolean;
    status: IStatus;
}

export interface IProjectParamsState {
    projectDescription: string;
    versionControlTypes: IParentComboItem[];
    parentProcessTemplates: IParentComboItem[];
    projectVisibilityOptions: IParentComboItem[];
    currentVersionControl: IProjectCreationMetadataItemDescriptor;
    currentProjectVisibilityOption: IProjectCreationMetadataItemDescriptor;
    currentProcessTemplate: IProcessTemplateDescriptor;
}

export interface IStatus {
    type: StatusType;
    value: StatusValueType;
    message: string;
    detailedMessage?: string;
    creationJobId?: string;
}

export class Store extends VSSStore.Store {
    private _state = {} as ICreateProjectComponentState;

    constructor() {
        super();

        this._state = {
            projectUrl: null,
            projectCreationMetadata: {
                collectionName: null,
                collectionId: null,
                canUserCreateProject: null,
                existingProjectNames: null,
                versionControlMetadata: null,
                projectVisibilityMetadata: null,
                processTemplatesMetadata: null,
                isReportingConfigured: false
            },
            projectNameState: {
                name: "",
                meetsRequirements: false,
                status: {
                    type: StatusType.InputValidationStatus,
                    value: StatusValueType.NoStatus,
                    message: null
                }
            },
            projectParamsState: {
                projectDescription: "",
                versionControlTypes: [],
                parentProcessTemplates: [],
                projectVisibilityOptions: [],
                currentProcessTemplate: null,
                currentVersionControl: null,
                currentProjectVisibilityOption: null
            },
            creationStatus: {
                type: StatusType.CreationStatus,
                value: StatusValueType.NoStatus,
                message: null
            },
            pageStatus: {
                type: StatusType.PageStatus,
                value: StatusValueType.NoStatus,
                message: null
            },
            source: null
        }
    }

    public get state(): ICreateProjectComponentState {
        return this._state;
    }

    public onProjectCreationMetadataLoadStatusChanged = (payload: IProjectCreationMetadataLoadedPayload): void => {
        // Update the status
        this._state.pageStatus.value = payload.status.value;
        this._state.pageStatus.message = payload.status.message;

        if (payload.status.value === StatusValueType.Success) {
            let inputVersionControlId: string = Utils_String.empty;
            let inputProcessTemplateName: string = Utils_String.empty;

            // Set the required metadata
            this._state.projectCreationMetadata = payload.projectCreationMetadata;

            if (payload.projectCreationMetadata.canUserCreateProject === false) {
                this._state.pageStatus.value = StatusValueType.Failure;
                this._state.pageStatus.message = MyExperiencesResources.CreateProjectUnauthorizedAccessText;
            }

            if (payload.urlParameters) {
                this._state.source = payload.urlParameters.source;
                inputVersionControlId = payload.urlParameters.versionControl;
                inputProcessTemplateName = payload.urlParameters.processTemplate;
            }

            // Updates the state to hold the values for the VC types and Process Templates
            this._populateVersionControlTypes(inputVersionControlId);
            this._populateParentProcessTemplates(inputProcessTemplateName);
            this._populateProjectVisibilityOptions();
        }

        this.emitChanged();
    }

    public onProjectCreationStatusChanged = (payload: IProjectCreationStatusPayload): void => {
        this._state.projectUrl = payload.projectUrl;

        this._state.creationStatus.value = payload.status.value;
        this._state.creationStatus.message = payload.status.message;
        this._state.creationStatus.detailedMessage = payload.status.detailedMessage;
        this._state.creationStatus.creationJobId = payload.projectCreationJobId;

        this.emitChanged();
    }

    public onProjectNameValidationStatusChanged = (payload: IProjectNameValidationStatusPayload): void => {
        this._state.projectNameState.name = payload.projectName;
        this._state.projectNameState.meetsRequirements = payload.meetsRequirements;

        if (this._state.projectNameState.name) {
            this._state.projectNameState.status.value = payload.status.value;
            this._state.projectNameState.status.message = payload.status.message;
        } else {
            this._state.projectNameState.status.value = StatusValueType.NoStatus;
            this._state.projectNameState.status.message = null;
        }

        // Removing the status since there has been a retry in the project name text box
        this._state.creationStatus.value = StatusValueType.NoStatus;
        this._state.creationStatus.message = null;

        this.emitChanged();
    }

    public onProjectDescriptionChanged = (value: string): void => {
        this._state.projectParamsState.projectDescription = value;
        this.emitChanged();
    }

    public onVersionControlTypeChanged = (selectedIndex: number): void => {
        this._state.projectParamsState.currentVersionControl = this._state.projectCreationMetadata.versionControlMetadata[selectedIndex];
        this.emitChanged();
    }

    public onProjectVisibilityOptionChanged = (selectedIndex: number): void => {
        this._state.projectParamsState.currentProjectVisibilityOption = this._state.projectCreationMetadata.projectVisibilityMetadata[selectedIndex];
        this.emitChanged();
    }

    public onProcessTemplateChanged = (selectedValue: string): void => {
        let indexOfParentChildSeparator: number = selectedValue.lastIndexOf("\\");
        let templateName: string = indexOfParentChildSeparator >= 0 ? selectedValue.substring(indexOfParentChildSeparator + 1) : selectedValue;
        this._state.projectCreationMetadata.processTemplatesMetadata.every((processTemplate: IProcessTemplateDescriptor) => {
            if (templateName === processTemplate.name) {
                this._state.projectParamsState.currentProcessTemplate = processTemplate;
                return false;
            }
            return true;
        });
        this.emitChanged();
    }

    public onStatusDismissed = (payload: void): void => {
        this._state.creationStatus.value = StatusValueType.NoStatus;
        this._state.creationStatus.message = null;

        this._state.pageStatus.value = StatusValueType.NoStatus;
        this._state.pageStatus.message = null;

        this.emitChanged();
    }

    /**
     * Get the version control types from metadata and populate the state
     */
    private _populateVersionControlTypes(inputVersionControlId: string): void {
        let defaultVersionControlDescriptor: IProjectCreationMetadataItemDescriptor;
        let inputVersionControlDescriptor: IProjectCreationMetadataItemDescriptor;
        let versionControlListItems: IParentComboItem[] = [];

        if (this._state.projectCreationMetadata && this._state.projectCreationMetadata.versionControlMetadata) {
            this._state.projectCreationMetadata.versionControlMetadata.forEach((value: IProjectCreationMetadataItemDescriptor) => {
                versionControlListItems.push({
                    text: value.name
                });
                if (value.isDefault) {
                    defaultVersionControlDescriptor = value;
                } else if (value.id === inputVersionControlId) {
                    inputVersionControlDescriptor = value;
                }
            });
        }

        this._state.projectParamsState.currentVersionControl = inputVersionControlDescriptor || defaultVersionControlDescriptor;

        this._state.projectParamsState.versionControlTypes = versionControlListItems;
    }

    /**
     * Get the project visibility options from metadata and populate the state
     */
    private _populateProjectVisibilityOptions(): void {
        let projectVisibilityOptions: IParentComboItem[] = [];

        if (this._state.projectCreationMetadata && this._state.projectCreationMetadata.projectVisibilityMetadata) {
            this._state.projectCreationMetadata.projectVisibilityMetadata.forEach((value: IProjectCreationMetadataItemDescriptor) => {
                projectVisibilityOptions.push({
                    text: value.name
                });
                if (value.isDefault) {
                    this._state.projectParamsState.currentProjectVisibilityOption = value;
                }
            });
        }

        if (projectVisibilityOptions.length < 2) {
            // Don't show visibility options if choice options are less than two.
            this._state.projectParamsState.projectVisibilityOptions = [];
        } else {
            this._state.projectParamsState.projectVisibilityOptions = projectVisibilityOptions;
        }
    }

    /**
     * Get the process templates from metadata and populate the state
     */
    private _populateParentProcessTemplates(inputProcessTemplateName: string): void {
        let defaultProcessTemplate: IProcessTemplateDescriptor;
        let inputProcessTemplate: IProcessTemplateDescriptor;

        if (this._state.projectCreationMetadata && this._state.projectCreationMetadata.processTemplatesMetadata) {
            this._state.projectCreationMetadata.processTemplatesMetadata.forEach((value: IProcessTemplateDescriptor) => {
                if (value.isDefault) {
                    defaultProcessTemplate = value;
                }

                if (value.name === inputProcessTemplateName) {
                    inputProcessTemplate = value;
                }
            });

            this._state.projectParamsState.currentProcessTemplate = inputProcessTemplate || defaultProcessTemplate;
            this._state.projectParamsState.parentProcessTemplates = this._buildProcessTemplateTree(this._state.projectCreationMetadata.processTemplatesMetadata);
        }
    }

    /**
     * Build the parent-child relation between the process templates
     * @param processTemplates - the process templates got from the props
     */
    private _buildProcessTemplateTree(processTemplates: IProcessTemplateDescriptor[]): IParentComboItem[] {
        let processTemplateTree: IParentComboItem[] = [];
        let itemMap: { [guid: string]: IParentComboItem } = {};
        let i: number;

        // Process root level templates
        for (i = 0; i < processTemplates.length; i++) {
            let template = processTemplates[i];
            // If the template is a root level template and does not have a parent
            if (template.inherits === Utils_String.EmptyGuidString || !template.inherits) {
                let item = {
                    text: template.name,
                    typeId: template.typeId,
                    templateId: template.id,
                    children: []
                } as IParentComboItem;

                processTemplateTree.push(item)
                itemMap[template.typeId] = item;
            }
        }

        // Process inherited templates
        for (i = 0; i < processTemplates.length; i++) {
            let template = processTemplates[i];
            // If the template is not a root level template and has a parent
            if (template.inherits !== Utils_String.EmptyGuidString && template.inherits) {
                let item = itemMap[template.inherits];

                // Though this template inherits another template, that parent template is not available.
                // Hence make this a parent level template
                if (!item) {
                    let parentItem = {
                        text: template.name,
                        typeId: template.typeId,
                        templateId: template.id,
                    } as IParentComboItem;
                    processTemplateTree.push(parentItem);
                }
                else {
                    let children = item.children;
                    if (children == null) {
                        item.children = children = [];
                    }
                    children.push({
                        text: template.name,
                        typeId: template.typeId,
                        templateId: template.id,
                    } as IChildComboItem);
                }
            }
        }
        return processTemplateTree;
    }
}
/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { PanelComponent } from "DistributedTaskControls/Components/PanelComponent";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { TemplateActionsCreator } from "DistributedTaskControls/Actions/TemplateActionsCreator";
import { TemplatesStore } from "DistributedTaskControls/Stores/TemplatesStore";
import { TemplatesControllerView } from "DistributedTaskControls/ControllerViews/TemplatesControllerView";
import { ITemplateDefinition } from "DistributedTaskControls/Common/Types";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";

import { TemplateConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { EnvironmentTemplateSource } from "PipelineWorkflow/Scripts/Editor/Sources/EnvironmentTemplateSource";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { SpinnerSize } from "OfficeFabric/Spinner";
import { css } from "OfficeFabric/Utilities";

import { announce } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTemplateSelectorControllerView";

export interface IState {
    isLoading: boolean;
    showPanel: boolean;
}

export interface IProps extends ComponentBase.IProps {
    hasCloseButton?: boolean;
    onClose?: () => void;
    onApplyTemplate?: (templatedId: string) => IPromise<void>;
    elementToFocusOnDismiss?: HTMLElement;
    templateSelectorPanelWidth?: number;
}

/**
 * Renders deployment templates for environment
 */
export class EnvironmentTemplateSelectorControllerView extends ComponentBase.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);
        StoreManager.GetStore<TemplatesStore>(TemplatesStore);
        this._templateActionsCreator = ActionCreatorManager.GetActionCreator<TemplateActionsCreator>(TemplateActionsCreator);
        this._templateActionsCreator.updateTemplateList(EnvironmentTemplateSource.instance(), false);
        this.state = {
            showPanel: true,
            isLoading: false
        };
    }

    public componentDidMount(): void {
        this._isMounted = true;
    }

    public componentWillUnmount(): void {
        this._isMounted = false;
    }

    //TODO: revisit string based on PM inputs
    public render(): JSX.Element {
        const firstFocusableSelector = css(EnvironmentTemplateSelectorControllerView.c_containerCssClass, EnvironmentTemplateSelectorControllerView.c_searchBoxInputSelector);
        return (
            <PanelComponent
                showPanel={this.state.showPanel}
                panelWidth={this.props.templateSelectorPanelWidth}
                onClose={this._closePanel}
                onClosed={this._handleOnClosed}
                isBlocking={true}
                hasCloseButton={this.props.hasCloseButton}
                focusTrapZoneProps={{ firstFocusableSelector: firstFocusableSelector }}
                elementToFocusOnDismiss={this.props.elementToFocusOnDismiss}>

                <TemplatesControllerView
                    title={Resources.EnvironmentTemplateSelectorTitle}
                    onEmptyProcessClick={this._onApplyEmptyProcessTemplate}
                    onApplyTemplate={this._onApplyTemplate}
                    onDeleteTemplate={this._onDeleteTemplate}
                    onShowDeleteTempleteDialog={this._onShowDeleteTemplateDialog}
                    onCloseDeleteTempleteDialog={this._onCloseDeleteTemplateDialog}
                    containerCssClass={EnvironmentTemplateSelectorControllerView.c_containerCssClass} />

                {this.state.isLoading &&
                    <LoadingComponent
                        className={"environment-template-selector-loading-container"}
                        size={SpinnerSize.large}
                        blocking={true} />}
            </PanelComponent>);
    }

    private _closePanel = () => {
        // Hide delete template error message (if any)
        this._templateActionsCreator.dismissTemplateErrorMessage();

        if (this.state && this.state.showPanel) {
            this.setState({ showPanel: false });
        }
    }

    private _onShowDeleteTemplateDialog = () => {
        // Coupling: This assumes the class name that is used for new environment placeholder. 
        this._newEnvPlaceHolder = document.querySelector(".cd-environment-temporary-node") as HTMLElement;
        if (this._newEnvPlaceHolder) {
            // Set a small z-index. Using 100 as it is sufficiently small.
            this._newEnvPlaceHolder.style.zIndex = "100";
        }
    }

    private _onCloseDeleteTemplateDialog = () => {
        // Clear z-index so that style applied from css takes over.
        if (this._newEnvPlaceHolder) {
            this._newEnvPlaceHolder.style.zIndex = Utils_String.empty;
        }
    }

    private _handleOnClosed = () => {
        if (this.props.onClose) {
            this.props.onClose();
        }
    }

    private _onApplyEmptyProcessTemplate = () => {
        this._applyTemplate(null);
    }

    private _onApplyTemplate = (template: ITemplateDefinition) => {
        this._applyTemplate(template);
    }

    private _applyTemplate(template: ITemplateDefinition): void {
        const templateId = template ? template.id : TemplateConstants.EmptyTemplateGuid;
        this._publishTemplateSelectionTelemetry(templateId, template);
        if (this.props.onApplyTemplate) {
            this._templateActionsCreator.dismissTemplateErrorMessage();
            this.setState({ isLoading: true });
            this.props.onApplyTemplate(templateId).then(() => {
                if (this._isMounted) {
                    announce(Resources.EnvironmentAdded, true);
                    this.setState({ showPanel: false, isLoading: false });
                }
            }, (error) => {
                if (this._isMounted) {
                    this._templateActionsCreator.showTemplateErrorMessage(error.message || error);
                    this.setState({ isLoading: false });
                }
            });
        } else {
            this.setState({ showPanel: false });
        }
    }

    private _onDeleteTemplate = (templateId: string) => {
        this._templateActionsCreator.deleteTemplate(EnvironmentTemplateSource.instance(), true, templateId).then(() => {
            Telemetry.instance().publishEvent(Feature.DeleteEnvironmentTemplate);
        });
    }

    private _publishTemplateSelectionTelemetry(templateId: string, template?: ITemplateDefinition) {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.TemplateId] = templateId;

        if (template) {

            // If you can delete the template it means its custom template, don't log custome template name
            // as that may contain PII data
            if (!template.canDelete) {
                eventProperties[Properties.TemplateName] = template.name;
            }
            eventProperties[Properties.GroupId] = template.groupId;
        }

        let feature: string = Feature.NewReleaseDefinitionTemplateSelection;
        if (this.props.hasCloseButton) {
            feature = Feature.NewEnvironmentTemplateSelection;
        }

        Telemetry.instance().publishEvent(feature, eventProperties);
    }

    private _templateActionsCreator: TemplateActionsCreator;
    private _isMounted: boolean;
    private _newEnvPlaceHolder: HTMLElement;
    private static readonly c_containerCssClass = "cd-environment-template-selector";
    private static readonly c_searchBoxInputSelector = ".ms-SearchBox-field";
}
/// <reference types="react" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { IGroup } from "OfficeFabric/GroupedList";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { IErrorState, ITemplateDefinition, IYamlTemplateDefinition, IYamlTemplateItem } from "DistributedTaskControls/Common/Types";
import { MessageBarComponent } from "DistributedTaskControls/Components/MessageBarComponent";
import { NoSearchResults } from "DistributedTaskControls/Components/NoSearchResults";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { TemplateActionsCreator } from "DistributedTaskControls/Actions/TemplateActionsCreator";
import { TemplateList, IYamlTemplateListItem } from "DistributedTaskControls/Components/TemplateList";
import { TemplatesStore } from "DistributedTaskControls/Stores/TemplatesStore";

import { Async } from "OfficeFabric/Utilities";
import { DefaultButton } from "OfficeFabric/Button";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { SearchBox, ISearchBox } from "OfficeFabric/SearchBox";

import * as Utils_String from "VSS/Utils/String";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/ControllerViews/TemplatesControllerView";

export interface ITemplatesControllerViewState extends ComponentBase.IState {
    templateGroups: IGroup[];
    templates: ITemplateDefinition[];
    yamlTemplateItem?: IYamlTemplateItem;
    errorState: IErrorState;
}

export interface ITemplatesControllerViewProps extends ComponentBase.IProps {
    title: string;
    onEmptyProcessClick: () => void;
    onApplyTemplate: (template: ITemplateDefinition) => void;
    onApplyYamlTemplate?: (template: IYamlTemplateDefinition) => void;
    onDeleteTemplate?: (templateId: string) => void;
    onShowDeleteTempleteDialog?: () => void;
    onCloseDeleteTempleteDialog?: () => void;
    containerCssClass?: string;
}

export class TemplatesControllerView extends ComponentBase.Component<ITemplatesControllerViewProps, ITemplatesControllerViewState> {

    constructor(props: ITemplatesControllerViewProps) {
        super(props);

        this._store = StoreManager.GetStore<TemplatesStore>(TemplatesStore);
        this._actionCreator = ActionCreatorManager.GetActionCreator<TemplateActionsCreator>(TemplateActionsCreator);
        this.state = {
            templateGroups: this._store.getTemplateGroups(),
            templates: this._store.getTemplateList(),
            yamlTemplateItem: props.onApplyYamlTemplate && this._store.getYamlTemplateItem(),
            errorState: {
                errorMessage: Utils_String.empty,
                errorStatusCode: null
            }
        } as ITemplatesControllerViewState;

        // throttling the filter text changed event as rendering of template is cpu intensive activity.
        let async = new Async();
        this._throttledFilterTextChanged = async.throttle(this._onFilterTextChanged, TemplatesControllerView.c_throttleFilterDelay);
    }

    public componentDidMount(): void {
        this._store.addChangedListener(this._refreshTemplates);
        this._renderEmptyProcessGuidance();
        if (this._searchButton) {
            this._searchButton.focus();
        }
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._refreshTemplates);
        if (this._emptyProcessContainer) {
            ReactDOM.unmountComponentAtNode(this._emptyProcessContainer);
            this._emptyProcessContainer = null;
        }
    }

    public componentWillReceiveProps(nextProps: ITemplatesControllerViewProps) {
        if (this.props.onApplyYamlTemplate !== nextProps.onApplyYamlTemplate) {
            this.setState({
                yamlTemplateItem: nextProps.onApplyYamlTemplate && this._store.getYamlTemplateItem()
            } as ITemplatesControllerViewState);
        }
    }

    public render(): JSX.Element {
        let templatesComponent: JSX.Element;
        if (this.state.templates && this.state.templates.length > 0) {
            let yamlTemplateListItem: IYamlTemplateListItem = null;
            if (this.state.yamlTemplateItem) {
                yamlTemplateListItem = {
                    item: this.state.yamlTemplateItem,
                    onApplyTemplate: this.props.onApplyYamlTemplate
                };
            }

            templatesComponent = (
                <TemplateList
                    templates={this.state.templates}
                    templateGroups={this.state.templateGroups}
                    onApplyTemplate={this.props.onApplyTemplate}
                    onDeleteTemplate={this.props.onDeleteTemplate}
                    yamlTemplateListItem={yamlTemplateListItem}
                    onShowDeleteTemplateDialog={this.props.onShowDeleteTempleteDialog}
                    onCloseDeleteTemplateDialog={this.props.onCloseDeleteTempleteDialog} />);
        } else {
            templatesComponent = (
                <div className="dtc-templates-no-search-results">
                    <NoSearchResults searchText={this._filterText} />
                </div>
            );
        }
        return (
            <div className={css("dtc-templates-parent-container", this.props.containerCssClass)}>
                <div className="dtc-templates-container" >
                    <div className="dtc-templates-heading-container">
                        {
                            !!this.state.errorState.errorMessage &&
                            <MessageBarComponent
                                className="dtc-template-error-message"
                                messageBarType={MessageBarType.error}
                                onDismiss={this._onDismissDeleteTemplateErrorMessage}
                                errorStatusCode={this.state.errorState.errorStatusCode}>
                                {this.state.errorState.errorMessage}
                            </MessageBarComponent>
                        }
                        <div className="dtc-templates-top-strip">
                            <div className="dtc-templates-header">
                                <div className="dtc-templates-title">{this.props.title}</div>
                                <div className="dtc-templates-description">
                                    {this._getEmptyProcessContainer()}
                                </div>
                            </div>
                            <div className="dtc-templates-search fabric-style-overrides" role="search" aria-label={Resources.SearchTemplateAriaLabel} aria-describedby="template-search-describedby" >
                                <div className="hidden" id="template-search-describedby">{Resources.SearchTemplateDescription}</div>
                                <SearchBox
                                    componentRef={this._resolveRef("_searchButton")}
                                    placeholder={Resources.SearchLabel}
                                    onChange={this._throttledFilterTextChanged} />
                            </div>
                        </div>
                    </div>
                    {templatesComponent}
                </div>
            </div>
        );
    }

    // This is done to show empty process guidance button
    // with localized string
    private _getEmptyProcessContainer(): JSX.Element {
        const emptyProcessButtonContainer = Utils_String.format("<div class='empty-process-button-container' id='{0}'></div>",
            TemplatesControllerView.c_emptyProcessButtonId);
        const emptyProcessFormat = Utils_String.localeFormat(Resources.EmptyProcessFormat, emptyProcessButtonContainer);

        // tslint:disable-next-line:react-no-dangerous-html
        return <div dangerouslySetInnerHTML={{ __html: emptyProcessFormat }} />;
    }

    // Render empty process button after the component is loaded
    private _renderEmptyProcessGuidance(): void {
        if (!this._emptyProcessContainer) {
            this._emptyProcessContainer = document.getElementById(TemplatesControllerView.c_emptyProcessButtonId);
            let component = React.createElement(DefaultButton, {
                onClick: this._onClick,
                className: "empty-process-button",
                ariaDescription: Resources.EmptyProcessDescription,
                text: Resources.EmptyProcessText,
                iconProps: { className: "bowtie-icon bowtie-build empty-process-icon" }
            });

            ReactDOM.render(component, this._emptyProcessContainer);
        }
    }

    // Clicking without timeout results in react dom tree node reference error
    private _onClick = (): void => {
        setTimeout(() => {
            this.props.onEmptyProcessClick();
        }, 0);
    }

    private _refreshTemplates = () => {
        this.setState({
            templateGroups: this._store.getTemplateGroups(),
            templates: this._store.getTemplateList(),
            errorState: this._store.getTemplateErrorState()
        } as ITemplatesControllerViewState);
    }

    private _onFilterTextChanged = (filterText: string) => {
        if (Utils_String.localeIgnoreCaseComparer(this._filterText, filterText) !== 0) {
            this._filterText = filterText;
            this._actionCreator.filterTemplateList(filterText);
        }
    }

    private _onDismissDeleteTemplateErrorMessage = (): void => {
        this._actionCreator.dismissTemplateErrorMessage();
    }

    private _store: TemplatesStore;
    private _actionCreator: TemplateActionsCreator;
    private _filterText: string = Utils_String.empty;
    private _throttledFilterTextChanged: (string) => void;
    private static readonly c_throttleFilterDelay: number = 50;
    private _emptyProcessContainer: HTMLElement;
    private static readonly c_emptyProcessButtonId = "emptyProcessButton" + Utils_String.generateUID();
    private _searchButton: ISearchBox;
}

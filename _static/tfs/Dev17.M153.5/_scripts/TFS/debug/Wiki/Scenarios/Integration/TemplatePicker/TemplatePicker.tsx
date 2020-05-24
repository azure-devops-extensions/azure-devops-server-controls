import * as React from "react";

import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { Label } from "OfficeFabric/Label";
import { List } from "OfficeFabric/List";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner } from "OfficeFabric/Spinner";
import { autobind, format } from "OfficeFabric/Utilities";

import { KeyCode } from "VSS/Utils/UI";

import { GitVersionDescriptor } from "TFS/VersionControl/Contracts";
import { WikiV2, WikiPage } from "TFS/Wiki/Contracts";
import { SearchBox } from "VersionControl/Scenarios/Shared/Trees/SearchBox";

import { localeCaseInsensitiveContains } from "Wiki/Scripts/Helpers";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import { ActionCreator } from "Wiki/Scenarios/Integration/TemplatePicker/ActionCreator";
import { ActionsHub, WikiPageTemplate } from "Wiki/Scenarios/Integration/TemplatePicker/ActionsHub";
import { AsyncLabel } from "Wiki/Scenarios/Integration/TemplatePicker/AsyncLabel";
import { TemplatesStore } from "Wiki/Scenarios/Integration/TemplatePicker/TemplatesStore";
import { WikiPagesSource } from "Wiki/Scenarios/Shared/Sources/WikiPagesSource";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Integration/TemplatePicker/TemplatePicker";

export interface TemplatePickerProps {
    title: string;
    isOpen: boolean;
    wiki: WikiV2;
    onSelection(selectedTemplate: WikiPageTemplate): void;
    onDismiss(): void;
}

export interface TemplatePickerState {
    error: Error;
    isLoading: boolean;
    selectedTemplate: WikiPageTemplate;
    templates: WikiPageTemplate[];
    filterText: string;
}

export class TemplatePicker extends React.Component<TemplatePickerProps, TemplatePickerState> {
    private _actionCreator: ActionCreator;
    private _actionsHub: ActionsHub;
    private _store: TemplatesStore;
    private _wikiPagesSource: WikiPagesSource;
    private _selectedWikiVersion: GitVersionDescriptor;
   
    constructor(props: TemplatePickerProps) {
        super(props);

        // Showing templates from the current version of the wiki
        this._selectedWikiVersion = this.props.wiki.versions[0];
        this._actionsHub = new ActionsHub();
        this._store = new TemplatesStore(this._actionsHub);
        this._wikiPagesSource = new WikiPagesSource(this.props.wiki, this._selectedWikiVersion);
        this._actionCreator = new ActionCreator(
            this._actionsHub,
            {
                wikiPagesSource: this._wikiPagesSource,
            },
        );

        this.state = {
            error: null,
            isLoading: true,
            templates: null,
            selectedTemplate: null,
            filterText: null,
        };
    }

    public componentWillMount(): void {
        this._store.addChangedListener(this._onStoreChanged);
        this._actionCreator.loadAllTemplates();
    }

    public componentWillUnmount(): void {
        if (this._store) {
            this._store.removeChangedListener(this._onStoreChanged);
            this._store.dispose();
            this._store = null;
        }
    }

    public componentWillReceiveProps(nextProps: TemplatePickerProps): void {
        if (!this.props.isOpen && nextProps.isOpen) {

            // Clearing filter during every dialog open
            if (this.state.filterText) {
                this.setState({ filterText: "" });
            }
        }
    }

    @autobind
    private _onStoreChanged(): void {
        this.setState({
            templates: this._store.state.templates,
            isLoading: this._store.state.isLoading,
            error: this._store.state.error,
        });
    }

    public render(): JSX.Element {
        // Not rendering dialog if `isOpen` is false. This is because the dialog steals focus before it hides.
        // So controlling the visiability at our end itself.
        return (this.props.isOpen &&
            <Dialog
                hidden={!this.props.isOpen}
                modalProps={{
                    className: "template-picker-dialog",
                    containerClassName: "container",
                    isBlocking: true,
                }}
                dialogContentProps={{
                    type: DialogType.close,
                    showCloseButton: true,
                    closeButtonAriaLabel: WikiResources.DialogCloseButtonAriaLabel,
                }}
                onDismiss={this.props.onDismiss}>
                {this._getDialogContent()}
            </Dialog >
        );        
    }
    
    private _getDialogContent(): JSX.Element {
        return (
            <div className={"picker-content"}>
                <div className={"picker-header"}>
                    <Label className={"picker-title"}>{WikiResources.TemplatePickerTitle}</Label>
                    <SearchBox
                        className={"template-filter-box"}
                        placeholder={WikiResources.TemplatePickerFilterBoxText}
                        onChangeValue={this._onFilterTextChange} />
                </div>
                <div className={"templates-content-container"}>
                    {this._getContentArea()}
                </div> 
            </div>
        );
    }

    private _getContentArea(): JSX.Element {
        if (this.state.isLoading) {
            return this._getLoadingStateContent();
        } else if (this.state.error) {
            return this._getErrorStateContent(this.state.error);
        } else {
            return this._getTemplateListContent();
        }
    }

    private _getLoadingStateContent(): JSX.Element {
        return <Spinner
            ariaLabel={WikiResources.FilteringInProgressAriaLabel}
            key={"TemplatePickerSpinner"}
            className={"wiki-spinner"}
        />;
    }

    private _getErrorStateContent(error: Error): JSX.Element {
        return <MessageBar
            className={"error-message-bar"}
            messageBarType={MessageBarType.error}>
            {error.message}
        </MessageBar>;
    }

    private _getTemplateListContent(): JSX.Element {
        const templatesToRender: WikiPageTemplate[] = this._getItemsToRender() || [];

        if (templatesToRender.length > 0) {
            return (
                <FocusZone
                    direction={FocusZoneDirection.bidirectional}>
                    <List
                        className={"templates-list"}
                        items={templatesToRender}
                        onRenderCell={this._onRenderTemplateItem} />
                </FocusZone>
            );
        } else {
            return (
                <MessageBar
                    className={"info-message-bar"}
                    messageBarType={MessageBarType.info}>
                    {this.state.filterText
                        ? WikiResources.TemplatePickerNoFilteredTemplatesMessage
                        : WikiResources.TemplatePickerNoTemplatesMessage
                    }
                </MessageBar>
            );
        }
    }

    @autobind
    private _onTemplateSelected(template: WikiPageTemplate): void {
        this.props.onSelection(template);
    }

    @autobind
    private _onFilterTextChange(value: string): void {
        this.setState({ filterText: value });
    }

    private _getItemsToRender(): WikiPageTemplate[] {
        if (this.state.filterText) {
            const filteredTemplates: WikiPageTemplate[] = [];

            for (const template of this.state.templates) {
                if (localeCaseInsensitiveContains(template.name, this.state.filterText)) {
                    filteredTemplates.push(template);
                }
            }

            return filteredTemplates;
        } else {
            return this.state.templates;
        }
    }

    @autobind
    private _onRenderTemplateItem(template: WikiPageTemplate, index: number): JSX.Element {
        return (
            <div
                className={"template-item"}
                data-is-focusable={true}
                tabIndex={0}
                onClick={() => this._onTemplateSelected(template)}
                onFocus={() => this.setState({ selectedTemplate: template })}
                onKeyDown={this._onTemplateItemKeyDown}>
                <span className={"bowtie-icon bowtie-file-content"} />
                <span className={"template-details"}>
                    <Label
                        className={"template-name"}
                        aria-label={format(WikiResources.TemplatePickerNameAriaLabel, template.name)}>
                        {template.name}
                    </Label>
                    <AsyncLabel
                        key={template.name}
                        className={"template-description"}
                        ariaLabelFormat={WikiResources.TemplatePickerDescriptionAriaLabel}
                        textPromise={template.description} />
                </span>
            </div>
        );
    }

    @autobind
    private _onTemplateItemKeyDown(event: React.KeyboardEvent<HTMLElement>): void {
        if (event.keyCode === KeyCode.ENTER || event.keyCode === KeyCode.SPACE) {
            this._onTemplateSelected(this.state.selectedTemplate);

            event.stopPropagation();
            event.preventDefault();
        }
    }

}

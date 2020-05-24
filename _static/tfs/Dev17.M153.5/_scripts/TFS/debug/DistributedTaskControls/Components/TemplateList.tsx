/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { ITemplateDefinition, IYamlTemplateDefinition, IYamlTemplateItem } from "DistributedTaskControls/Common/Types";
import { ConfirmationDialog } from "DistributedTaskControls/Components/ConfirmationDialog";
import { SectionHeader } from "DistributedTaskControls/Components/SectionHeader";
import { TemplateListItem, ITemplateListItem } from "DistributedTaskControls/Components/TemplateListItem";

import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { GroupedList, IGroup, IGroupDividerProps } from "OfficeFabric/GroupedList";
import { getRTLSafeKeyCode, KeyCodes } from "OfficeFabric/Utilities";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/TemplateList";

export interface IYamlTemplateListItem {
    item: IYamlTemplateItem;
    onApplyTemplate: (template: IYamlTemplateDefinition) => void;
}

export interface ITemplateListProps extends ComponentBase.IProps {
    templates: ITemplateDefinition[];
    templateGroups: IGroup[];
    onApplyTemplate: (template: ITemplateDefinition) => void;
    onDeleteTemplate?: (templateId: string) => void;
    onShowDeleteTemplateDialog?: () => void;
    onCloseDeleteTemplateDialog?: () => void;

    yamlTemplateListItem?: IYamlTemplateListItem;
}

export interface ITemplateListState {
    selectedTemplateId: string;
    selectedTemplateName?: string;
    showDeleteTemplateDialog?: boolean;
}

export class TemplateList extends ComponentBase.Component<ITemplateListProps, ITemplateListState> {

    constructor(props: ITemplateListProps) {
        super(props);

        // Set initial state.
        this.state = this._initialState;
    }

    public render(): JSX.Element {
        const confirmMessage = Utils_String.format(Resources.DeleteTemplateConfirmMessage, this.state.selectedTemplateName);
        const yamlTemplateListItem = this.props.yamlTemplateListItem;

        return (
            <FocusZone className="dtc-template-list"
                direction={FocusZoneDirection.vertical}
                isInnerZoneKeystroke={(keyEvent: React.KeyboardEvent<HTMLElement>) => (
                    (keyEvent.which === getRTLSafeKeyCode(KeyCodes.right)))}>

                <ConfirmationDialog
                    title={Resources.DeleteTemplateConfirmHeader}
                    subText={confirmMessage}
                    onConfirm={this._onDeleteTemplate}
                    showDialog={this.state.showDeleteTemplateDialog}
                    onCancel={this._hideDeleteTemplateDialog}
                />

                {
                    yamlTemplateListItem &&
                    <GroupedList
                        groups={[yamlTemplateListItem.item.group]}
                        items={[yamlTemplateListItem.item.definition]}
                        onRenderCell={this._onRenderListYamlItem}
                        groupProps={
                            {
                                onRenderHeader: this._onRenderHeader
                            }
                        }
                    />
                }

                <GroupedList
                    groups={Utils_Array.clone(this.props.templateGroups)}
                    items={this.props.templates}
                    onRenderCell={this._onRenderListItem}
                    groupProps={
                        {
                            onRenderHeader: this._onRenderHeader
                        }
                    }
                />
            </FocusZone>
        );
    }

    private _onDeleteTemplate = () => {
        if (this.props.onDeleteTemplate && this.state.selectedTemplateId) {
            this.props.onDeleteTemplate(this.state.selectedTemplateId);
        }
    }

    private _showDeleteTemplateDialog = (selectedTemplateId: string, selectedTemplateName: string) => {
        if (this.props.onShowDeleteTemplateDialog) {
            this.props.onShowDeleteTemplateDialog();
        }

        this.setState({
            selectedTemplateId: selectedTemplateId,
            selectedTemplateName: selectedTemplateName,
            showDeleteTemplateDialog: true
        });
    }

    private _hideDeleteTemplateDialog = () => {

        if (this.props.onCloseDeleteTemplateDialog) {
            this.props.onCloseDeleteTemplateDialog();
        }

        this.setState({
            selectedTemplateId: this.state.selectedTemplateId,
            selectedTamplateName: this.state.selectedTemplateName,
            showDeleteTemplateDialog: false
        });
    }

    private _onRenderListYamlItem = (nestingDepth: number, template: IYamlTemplateDefinition, index: number) => {
        const templateItem: ITemplateListItem<IYamlTemplateDefinition> = {
            id: template.id,
            name: template.name,
            description: template.description,
            canDelete: false,
            iconClassName: template.iconClassName,
            data: template,
            allowLinks: true
        };

        return (
            <TemplateListItem
                templateItem={templateItem}
                onApplyTemplate={this.props.yamlTemplateListItem.onApplyTemplate}
                onSelect={this._onSelect}
                isSelected={this.state.selectedTemplateId === template.id} />
        );
    }

    private _onRenderListItem = (nestingDepth: number, template: ITemplateDefinition, index: number) => {
        const templateItem: ITemplateListItem<ITemplateDefinition> = {
            id: template.id,
            name: template.name,
            description: template.description,
            canDelete: template.canDelete,
            iconUrl: template.iconUrl,
            data: template
        };

        return (
            <TemplateListItem
                templateItem={templateItem}
                onApplyTemplate={this.props.onApplyTemplate}
                onDeleteTemplate={this._showDeleteTemplateDialog}
                onSelect={this._onSelect}
                isSelected={this.state.selectedTemplateId === template.id} />
        );
    }

    private _onRenderHeader(props: IGroupDividerProps): JSX.Element {
        return (
            <SectionHeader sectionLabel={props.group.name} cssClass={"dtc-templates-sublist-header"} />
        );
    }

    private _onSelect = (templateId: string) => {
        if (templateId && this.state.selectedTemplateId !== templateId) {
            this.setState({
                selectedTemplateId: templateId
            });
        }
    }

    private _initialState: ITemplateListState = {
        selectedTemplateId: null,
        selectedTemplateName: null,
        showDeleteTemplateDialog: false
    };
}

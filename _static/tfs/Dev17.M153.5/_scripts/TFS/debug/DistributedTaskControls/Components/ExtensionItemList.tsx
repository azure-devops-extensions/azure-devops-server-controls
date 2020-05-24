/// <reference types="react" />

import * as React from "react";

import { TaskExtensionItemListActionsCreator } from "DistributedTaskControls/Actions/TaskExtensionItemListActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { Component, IProps, IState } from "DistributedTaskControls/Common/Components/Base";
import { ExtensionUtils } from "DistributedTaskControls/Common/ExtensionUtils";
import { MessageBarComponent } from "DistributedTaskControls/Components/MessageBarComponent";
import { IExtensionDefinitionItem } from "DistributedTaskControls/Common/Types";
import { ExtensionDefinitionItem } from "DistributedTaskControls/Components/ExtensionDefinitionItem";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { LoadableComponent } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponent";

import { MessageBarType } from "OfficeFabric/MessageBar";
import { List } from "OfficeFabric/List";
import { css } from "OfficeFabric/Utilities";

import * as ArrayUtils from "VSS/Utils/Array";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/ExtensionItemList";

export interface IExtensionListProps extends IProps {
    extensions: IExtensionDefinitionItem[];
    isExtensionFetched: boolean;
    onItemSelect?: (id: string) => void;
    selectedItemId?: string;
    className?: string;
}

export interface IExtensionListState extends IState {
    selectedExtension: string;
}

export class ExtensionItemList extends Component<IExtensionListProps, IExtensionListState> {

    public componentWillMount(): void {
        this._actionCreator = ActionCreatorManager.GetActionCreator<TaskExtensionItemListActionsCreator>(TaskExtensionItemListActionsCreator, this.props.instanceId);
    }

    public render(): JSX.Element {
        return (
            <div className={css("dtc-extension-list", this.props.className)} >
                <LoadableComponent
                    instanceId={this.props.instanceId.concat(ExtensionUtils.extensionsIdentifierText)}
                    label={Resources.FetchingExtensionsText} >
                    <div>
                        {!this.props.isExtensionFetched && this._getErrorElement()}
                        {this._getExtensions()}
                    </div>
                </LoadableComponent>
            </div>
        );
    }

    private _getExtensions(): JSX.Element {
        return this.props.extensions.length > 0 ? this._getExtensionsList() :
            (this.props.isExtensionFetched ? this._getNoExtensionAvailableElement() : null);
    }

    private _getErrorElement(): JSX.Element {
        return (<MessageBarComponent
            className={"extension-error-element"}
            messageBarType={MessageBarType.error} >
            {Resources.ExtensionCallFailedDisplayErrorMessage}
        </MessageBarComponent>);
    }

    private _getNoExtensionAvailableElement(): JSX.Element {
        return (<div className={"no-extension-available"}>
            {Resources.NoExtensionAvailableText}
        </div>);
    }

    private _getExtensionsList(): JSX.Element {
        return (<List
            items={ArrayUtils.clone(this.props.extensions)}
            onRenderCell={this._onRenderListItem}
            role={"listbox"}
        />);
    }

    private _onRenderListItem = (extension: IExtensionDefinitionItem, index: number) => {
        return (
            <ExtensionDefinitionItem
                key={extension.id}
                task={extension}
                posInSet={index + 1}
                sizeOfSet={this.props.extensions.length}
                onSelect={this._onSelect}
                isSelected={this.props.onItemSelect ? this.props.selectedItemId === extension.id : this.state.selectedExtension === extension.id} />
        );
    }


    private _onSelect = (extensionId: string) => {
        if (this.props.onItemSelect) {
            this.props.onItemSelect(extensionId);
        }
        else {
            this.setState({
                selectedExtension: extensionId
            } as IExtensionListState);
        }
    }

    private _actionCreator: TaskExtensionItemListActionsCreator;
}

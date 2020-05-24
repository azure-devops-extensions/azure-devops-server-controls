/// <reference types="react" />

import React = require("react");
import ReactDOM = require("react-dom");
import Navigation_Services = require("VSS/Navigation/Services");

import ContextualMenu = require("OfficeFabric/ContextualMenu");
import Constants = require("DistributedTask/Scripts/Constants");
import Dialogs = require("DistributedTask/Scripts/Components/Dialogs");
import Menu = require("DistributedTask/Scripts/Common/Menu");
import Resources = require("DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask");

import { LibraryItem } from "DistributedTask/Scripts/DT.LibraryItem.Model";
import { LibraryItemType } from "DistributedTask/Scripts/DT.Types";
import { contextualMenuIcon } from "VSSPreview/OfficeFabric/Helpers";
import { LibraryActionCreator } from "DistributedTask/Scripts/Actions/LibraryActionCreator";

export interface LibraryItemMenuProps extends Menu.Props {
    libraryItem: LibraryItem
}

export class LibraryItemMenu extends Menu.Menu<LibraryItemMenuProps> {
    constructor(props: LibraryItemMenuProps) {
        super(props);
    }

    public getMenuItems(): ContextualMenu.IContextualMenuItem[] {
        if (this.props.libraryItem.itemType === LibraryItemType.VariableGroup) {
            return this.getVariableGroupMenuItems();
        } else if (this.props.libraryItem.itemType === LibraryItemType.SecureFile) {
            return this.getSecureFileMenuItems();
        } else {
            return this.getLibraryMenuItems();
        }
    }

    private getLibraryMenuItems() {
        let childItems: ContextualMenu.IContextualMenuItem[] = [];

        childItems.push({
            key: Constants.UserActions.ShowSecurityDialog,
            iconProps: contextualMenuIcon("bowtie-shield"),
            name: Resources.Security,
            onClick: () => {
                Dialogs.Dialogs.showSecurityDialog(this.props.libraryItem.itemType, this.props.libraryItem.id, this.props.libraryItem.name);
            }
        } as ContextualMenu.IContextualMenuItem);

        return childItems;
    }

    private getVariableGroupMenuItems(): ContextualMenu.IContextualMenuItem[] {
        let childItems: ContextualMenu.IContextualMenuItem[] = [];

        childItems.push({
            key: Constants.UserActions.EditLibraryItem,
            iconProps: contextualMenuIcon("bowtie-edit"),
            name: Resources.EditText,
            onClick: () => {
                Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: Constants.LibraryConstants.VariableGroupView, variableGroupId: this.props.libraryItem.id });
            }
        } as ContextualMenu.IContextualMenuItem);

        childItems.push({
            key: Constants.UserActions.DeleteLibraryItem,
            iconProps: contextualMenuIcon("bowtie-edit-delete"),
            name: Resources.DeleteText,
            onClick: () => {
                Dialogs.Dialogs.showDeleteVariableGroupDialog(Number(this.props.libraryItem.id));
            }
        } as ContextualMenu.IContextualMenuItem);

        childItems.push({
            key: Constants.UserActions.CloneLibraryItem,
            iconProps: contextualMenuIcon("bowtie-edit-copy"),
            name: Resources.CloneText,
            onClick: () => {
                LibraryActionCreator.getInstance().cloneVariableGroup(Number(this.props.libraryItem.id));
            }
        } as ContextualMenu.IContextualMenuItem);

        childItems.push({
            key: Constants.UserActions.ShowSecurityDialog,
            iconProps: contextualMenuIcon("bowtie-shield"),
            name: Resources.Security,
            onClick: () => {
                Dialogs.Dialogs.showSecurityDialog(this.props.libraryItem.itemType, this.props.libraryItem.id, this.props.libraryItem.name);
            }
        } as ContextualMenu.IContextualMenuItem);

        return childItems;
    }

    private getSecureFileMenuItems() {
        let childItems: ContextualMenu.IContextualMenuItem[] = [];

        childItems.push({
            key: Constants.UserActions.EditLibraryItem,
            iconProps: contextualMenuIcon("bowtie-edit"),
            name: Resources.EditText,
            onClick: () => {
                Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: Constants.LibraryConstants.SecureFileView, secureFileId: this.props.libraryItem.id });
            }
        } as ContextualMenu.IContextualMenuItem);

        childItems.push({
            key: Constants.UserActions.DeleteLibraryItem,
            iconProps: contextualMenuIcon("bowtie-edit-delete"),
            name: Resources.DeleteText,
            onClick: () => {
                Dialogs.Dialogs.showDeleteSecureFileDialog(this.props.libraryItem.id);
            }
        } as ContextualMenu.IContextualMenuItem);

        childItems.push({
            key: Constants.UserActions.ShowSecurityDialog,
            iconProps: contextualMenuIcon("bowtie-shield"),
            name: Resources.Security,
            onClick: () => {
                Dialogs.Dialogs.showSecurityDialog(this.props.libraryItem.itemType, this.props.libraryItem.id, this.props.libraryItem.name);
            }
        } as ContextualMenu.IContextualMenuItem);

        return childItems;
    }
}

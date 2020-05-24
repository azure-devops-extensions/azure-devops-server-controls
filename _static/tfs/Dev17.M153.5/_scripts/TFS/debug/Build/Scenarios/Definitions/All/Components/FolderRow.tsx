/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";

import { RootPath } from "Build.Common/Scripts/Security";

import * as CreateFolderDialog_Component_NO_REQUIRE from "Build/Scripts/Components/CreateFolderDialog";
import * as DeleteFolderDialog_Component_NO_REQUIRE from "Build/Scripts/Components/DeleteFolderDialog";
import * as RenameFolderDialog_Component_NO_REQUIRE from "Build/Scripts/Components/RenameFolderDialog";
import { renderLazyComponentIntoDom } from "Build/Scripts/Components/LazyRenderedDomComponent";
import { LinkWithKeyBinding } from "Build/Scripts/Components/LinkWithKeyBinding";
import { UserActions } from "Build/Scripts/Constants";
import { raiseTfsError } from "Build/Scripts/Events/MessageBarEvents";
import { onFolderClick } from "Build/Scripts/Folders";
import { getDefaultBreadcrumbUrl } from "Build/Scripts/Linking";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";

import { PopupContextualMenu, IPopupContextualMenuProps } from "Presentation/Scripts/TFS/Components/PopupContextualMenu";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

import { getService as getEventService } from "VSS/Events/Services";

import { format } from "VSS/Utils/String";

export interface IFolderRowProps {
    path: string;
    description?: string;
    folderIcon?: string;
    folderName?: string;
    hidePopupMenu?: boolean;
}

export class FolderRow extends React.Component<IFolderRowProps, {}> {
    constructor(props: IFolderRowProps) {
        super(props);
    }

    public render(): JSX.Element {
        let folderIcon: string = this.props.folderIcon || "bowtie-folder";
        let folderName: string = this.props.folderName || getFolderName(this.props.path);

        let props: IPopupContextualMenuProps = {
            className: "popup-menu",
            iconClassName: "bowtie-ellipsis",
            items: getFolderContextualMenus(this.props.path, this.props.description),
            menuClassName: "build-popup-menu",
            useTargetElement: true
        };

        return <div className="build-definition-folder-col">
            <div className="build-definition-entry-folder">
                <span className={"bowtie-icon " + folderIcon}></span>
                <LinkWithKeyBinding
                    href={getDefaultBreadcrumbUrl(this.props.path)}
                    className="build-definition-folder-name"
                    title={format(BuildResources.FolderAriaLabel, folderName)}
                    text={folderName}
                    onClick={this._onFolderClick} />
            </div>
            {!this.props.hidePopupMenu && <PopupContextualMenu {...props} />}
        </div>
    }

    private _onFolderClick = (event: React.SyntheticEvent<HTMLElement>) => {
        onFolderClick(this.props.path);
        event.preventDefault();
        event.stopPropagation();
    }
}

function getFolderName(path: string) {
    path = path || "";
    let paths = path.split(RootPath);
    return paths[paths.length - 1];
}

function getFolderContextualMenus(path: string, description?: string): IContextualMenuItem[] {
    let items: IContextualMenuItem[] = [];
    // Todo: introduce message bar to handle errors instead of read ugly box, and also success callbacks...

    items.push({
        key: "CreateFolder",
        name: BuildResources.CreateSubFolderText,
        iconProps: { className: "bowtie-icon bowtie-math-plus-light" },
        data: path,
        onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
            let props: CreateFolderDialog_Component_NO_REQUIRE.ICreateFolderDialogProps = {
                path: item.data,
                showDialog: true,
                errorCallBack: raiseTfsError
            };

            renderLazyComponentIntoDom(
                "alldefinitions_folderow_createFolder",
                ["Build/Scripts/Components/CreateFolderDialog"],
                props,
                (m: typeof CreateFolderDialog_Component_NO_REQUIRE) => m.CreateFolderDialog,
                null,
                false);
        }
    } as IContextualMenuItem);

    items.push({
        key: "RenameFolder",
        name: BuildResources.RenameFolderText,
        iconProps: { className: "bowtie-icon bowtie-edit-rename" },
        data: path,
        onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
            let props: RenameFolderDialog_Component_NO_REQUIRE.IRenameFolderDialogProps = {
                path: item.data,
                description: description,
                showDialog: true,
                errorCallBack: raiseTfsError
            };

            renderLazyComponentIntoDom(
                "alldefinitions_folderow_renameFolder",
                ["Build/Scripts/Components/RenameFolderDialog"],
                props,
                (m: typeof RenameFolderDialog_Component_NO_REQUIRE) => m.RenameFolderDialog,
                null,
                false);
        }
    } as IContextualMenuItem);

    items.push({
        key: "DeleteFolder",
        name: BuildResources.DeleteFolderText,
        iconProps: { className: "bowtie-icon bowtie-edit-delete" },
        data: path,
        onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
            let props: DeleteFolderDialog_Component_NO_REQUIRE.IDeleteFolderDialogProps = {
                path: item.data,
                showDialog: true,
                errorCallBack: raiseTfsError
            };

            renderLazyComponentIntoDom(
                "alldefinitions_folderow_deleteFolder",
                ["Build/Scripts/Components/DeleteFolderDialog"],
                props,
                (m: typeof DeleteFolderDialog_Component_NO_REQUIRE) => m.DeleteFolderDialog,
                null,
                false);
        }
    } as IContextualMenuItem);

    items.push({
        key: "FolderSecurity",
        name: PresentationResources.ItemSecurityTitle,
        iconProps: { className: "bowtie-icon bowtie-security" },
        data: path,
        onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
            getEventService().fire(UserActions.ViewFolderSecurity, this, path);
        }
    } as IContextualMenuItem);

    return items;
}

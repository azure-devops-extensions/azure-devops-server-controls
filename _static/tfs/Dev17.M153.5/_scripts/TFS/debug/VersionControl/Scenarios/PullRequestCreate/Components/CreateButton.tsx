import * as React from "react";

import { PrimaryButton } from "OfficeFabric/Button";
import { KeyCodes } from "OfficeFabric/Utilities";
import { IContextualMenuItem, IContextualMenuProps } from "OfficeFabric/ContextualMenu";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export interface ICreateButtonProps {
    isActive: boolean;
    draftIsEnabled: boolean;
    draftIsDefault: boolean;
    onCreate(event: React.SyntheticEvent<any>, isDraft?: boolean): void;
}

export const CreateButton = (props: ICreateButtonProps): JSX.Element => {

    let primaryButton: JSX.Element;
    let pullDownButton: IContextualMenuItem;
    let createDraftIsPrimaryButton = false;

    if (props.draftIsEnabled) {
        if (props.draftIsDefault) {
            // "Create" is the pull-down item
            pullDownButton = {
                key: "create-item",
                name: VCResources.ModalDialogCreateButton,
                onClick: (event) => { props.onCreate(event, false); },
                disabled: !props.isActive,
            } as IContextualMenuItem;

            createDraftIsPrimaryButton = true;
        }
        else {
            // "Create as draft" is the pull-down item
            pullDownButton = {
                key: "create-draft-item",
                name: VCResources.CreateAsDraft,
                iconProps: { iconName: "EditNote" },
                onClick: (event) => { props.onCreate(event, true); },
                disabled: !props.isActive,
            } as IContextualMenuItem;
        }
    }

    let menuProps: IContextualMenuProps;

    if (pullDownButton) {
        menuProps = {
            items: [pullDownButton],
            directionalHint: DirectionalHint.bottomRightEdge,
        };
    }

    if (createDraftIsPrimaryButton) {
        return <PrimaryButton
            iconProps={{ iconName: "EditNote" }}
            onClick={(event) => { props.onCreate(event, true); }}
            disabled={!props.isActive}
            ariaLabel={VCResources.CreateDraftPullRequest}
            split={!!menuProps}
            menuTriggerKeyCode={KeyCodes.down}
            menuProps={menuProps}
        >
            {VCResources.CreateAsDraft}
        </PrimaryButton>
    }
    else {
        return <PrimaryButton
            onClick={(event) => { props.onCreate(event, false); }}
            disabled={!props.isActive}
            ariaLabel={VCResources.CreatePullRequestLabel}
            split={!!menuProps}
            menuTriggerKeyCode={KeyCodes.down}
            menuProps={menuProps}
        >
            {VCResources.ModalDialogCreateButton}
        </PrimaryButton>
    }
}
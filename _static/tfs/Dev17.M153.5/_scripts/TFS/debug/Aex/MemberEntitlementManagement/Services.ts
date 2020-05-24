import {
    TeamRef,
} from "Aex/MemberEntitlementManagement/Contracts";
import { TeamContext } from "VSS/Common/Contracts/Platform";

import * as React from "react";

/**
 * Light-weight contributed standalone component
 * @param T container type
 */
export interface IContributedComponent<S, T extends string = string> {
    /**
     * @param containerElement DOM element of the container
     * @param containerId container ID to distingurish differnt containers
     */
    renderInContainer(containerElement: HTMLElement, containerId?: T): void;
    /**
     * Set state of the component
     */
    setState(state: S): void;
}

export type InviteUserToProjectDialogContainerIdType = "dialog" | "message-bar";

export interface IInviteUserToProjectDialogState {
    hidden?: boolean;
    /**
     * Callback when call to dialog dismisses.
     */
    onDismiss?: (ev?: React.MouseEvent<HTMLButtonElement>) => any;
    /**
     * Team context to be used for the dialog.
     */
    teamContext?: TeamContext;
    /**
     * Options for the team picker. If not supplied, the default options will be
     * all teams in the project.
     */
    teamOptionsPromise?: Promise<TeamRef[]>;
    /**
     * Callback when add user action is complete, will not be called if user dismisses the dialog before invoking the action.
     */
    onActionComplete?: (success?: boolean, statusContent?: React.ReactNode) => void;
}

/**
 * Host service for user management
 */
export interface IUserManagementService {
    /**
     * get the contributed user dialog
     */
    getAddUsersToProjectDialogComponent(initialState: IInviteUserToProjectDialogState):
        IContributedComponent<IInviteUserToProjectDialogState, InviteUserToProjectDialogContainerIdType>;
}

export const userManagementServiceContributionId: string = "ms.vss-aex-user-management-web.user-management-services";

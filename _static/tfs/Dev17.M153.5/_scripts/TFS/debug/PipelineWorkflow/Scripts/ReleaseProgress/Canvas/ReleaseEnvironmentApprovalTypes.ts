import { ReleaseDefinitionApprovals, ReleaseApproval, ApprovalStatus } from "ReleaseManagement/Core/Contracts";
import { ApprovalOrderKeys } from "PipelineWorkflow/Scripts/Common/Types";

import { IStatusProps } from "VSSUI/Status";

export interface IOverallReleaseApprovalsStatus {
	statusIconProps: IStatusProps;
	statusString: string;
	approvalStatus: ApprovalStatus;
	approvalStatusClassName: string;
	policyDescription: string;
	timeStamp?: string;
	cancelByDisplayName?: string;
	canceledByImageUrl?: string;
}

export interface IReleaseApprovalStatus {
	statusIconProps: IStatusProps;
	statusString: string;
	statusTooltip: string;
}

export interface IReassignedStatusProps {
	reassignedStatusText: string;
}

export interface IReleaseApprovalReassignHistory {
	/**
	 * revision of the reassignment
	 */
	revisionId: number;
	/**
	 * Icon props to show icon of the person who reassigned the approval
	 */
	iconProps: IReleaseApprovalIconProps;
	/**
	 * Name of the person who reassigned the approval
	 */
	name: string;
	/**
	 * Reassigned status props
	 */
	reassignedStatusProps: IReassignedStatusProps;
	/**
	 * Comment during reassignment
	 */
	comment?: string;
}

export interface IReleaseApprovalIconProps {
	url: string;
	alternateText: string;
}

export interface IReleaseApprovalDeferDeploymentProps {
	isDeferDeploymentEnabled: boolean;
	scheduledDeploymentTime?: Date;
	errorMessage?: string;
}

export interface IReleaseApprovalItem {

	/**
	 * approval associated with the item
	 */
	approval: ReleaseApproval;

	/**
	 * snapshot associated with the item
	 */
	snapshot: ReleaseDefinitionApprovals;

	/**
	 * name of the item
	 */
	name: string;

	/**
	 * props of the icon used in the item
	 */
	iconProps: IReleaseApprovalIconProps;

	/**
	 * approval status contains the icon and statusString
	 */
	approvalStatus: IReleaseApprovalStatus;

	/**
	 * comments associated with the item ( if any )
	 */
	comments: string;

    /**
    *  show override button for the current approval item
    */
	showOverrideButtonForApprovalItem: boolean;

	/**
    *  is override-mode enabled for the current approval item
    */
	isOverrideModeEnabled: boolean;

	/**
	 * show reassign dialog box boolean 
	 */
	showReassign: boolean;

	/**
	 * reassigned history props
	 */
	reassignHistoryData: IReleaseApprovalReassignHistory[];

	/**
	 * Check if approval is allowed for current user based on policy
	 */
	isApprovalAllowedForCurrentUser: boolean;

	/**
	 * whether to show actionable items or not 
	 */
	showActionableItems?: IPromise<boolean>;

	/**
	 * whether to disable approval items
	 */
	isApprovalItemDisabled?: boolean;

	/**
	 * is this approval item in approving mode (in-progress)
	 */
	isApprovalInProgress?: boolean;

	/**
	 * is this approval item in rejection mode (in-progress)
	 */
	isRejectionInProgress?: boolean;

	/**
 	* is this approval item in reassignment mode (in-progress)
 	*/
	isReassignmentInProgress?: boolean;

	/**
	 * should focus on reassign history link
	 */
	focusReassignHistoryLink?: boolean;

	/**
	 * error message
	 */
	errorMessage?: string;

	/**
 	* reassign error message which gets displayed inside the reassign dialog box
 	*/
	reassignErrorMessage?: string;

	/**
	 * defer deployment props
	 */
	deferDeploymentProps?: IReleaseApprovalDeferDeploymentProps;

    /**
    * warning message for deployment authorization
    */
	warningMessage?: string;

	/**
	 * is this approval item actionable - used in multiple deploy panel
	 */
	isItemActionable?: boolean;
}

export interface IReleaseApprovalsData {
	overallApprovalsStatus: IOverallReleaseApprovalsStatus;
	policyDescription: string;
	approvalOrder: ApprovalOrderKeys;
	approvalItems: IReleaseApprovalItem[];
	isFirstPreDeploymentApprover: boolean;
	timeoutTime?: string;
	enforceIdentityRevalidation: boolean;
}
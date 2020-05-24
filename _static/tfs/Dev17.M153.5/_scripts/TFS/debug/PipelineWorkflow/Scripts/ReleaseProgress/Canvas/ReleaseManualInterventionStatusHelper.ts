import { FriendlyDate, PastDateMode } from "DistributedTaskControls/Common/FriendlyDate";
import { DateTimeUtilities } from "DistributedTaskControls/Common/DateTimeUtilities";

import { ReleaseApprovalsGatesTimeHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseApprovalsGatesTimeHelper";
import { DateTimeUtils } from "PipelineWorkflow/Scripts/Shared/Utils/DateTimeUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { ManualInterventionStatus } from "ReleaseManagement/Core/Contracts";

import { addMinutes, localeFormat } from "VSS/Utils/Date";
import { localeFormat as String_localeFormat } from "VSS/Utils/String";

import { IdentityRef } from "VSS/WebApi/Contracts";

import { Statuses, IStatusProps } from "VSSUI/Status";

export enum ManualInterventionTimeoutPolicy {
    Resume,
    Reject
}

export class ReleaseManualInterventionStatusHelper {
    public static getStatusIconProps(status: ManualInterventionStatus): IStatusProps {
        switch (status) {
            case ManualInterventionStatus.Pending:
                return Statuses.Waiting;
            case ManualInterventionStatus.Approved:
                return Statuses.Success;
            case ManualInterventionStatus.Rejected:
            case ManualInterventionStatus.Canceled:
                return Statuses.Canceled;
            default:
                return null;
        }
    }

    public static getStatusStyle(status: ManualInterventionStatus): string {
        switch (status) {
            case ManualInterventionStatus.Pending:
                return "manual-intervention-waiting";

            case ManualInterventionStatus.Approved:
                return "manual-intervention-approved";

            case ManualInterventionStatus.Rejected:
                return "manual-intervention-rejected";

            case ManualInterventionStatus.Canceled:
                return "manual-intervention-cancelled";

            default:
                return null;
        }
    }

    public static getMessageBarStyle(status: ManualInterventionStatus): string {
        switch (status) {
            case ManualInterventionStatus.Pending:
                return "info";

            case ManualInterventionStatus.Approved:
                return "success";

            case ManualInterventionStatus.Rejected:
            case ManualInterventionStatus.Canceled:
                return "inactive";

            default:
                return null;
        }
    }

    public static getStatusText(status: ManualInterventionStatus): string {
        switch (status) {
            case ManualInterventionStatus.Pending:
                return Resources.Waiting;

            case ManualInterventionStatus.Approved:
                return Resources.Resumed;

            case ManualInterventionStatus.Rejected:
                return Resources.JobRejectedStatus;

            case ManualInterventionStatus.Canceled:
                return Resources.CanceledText;

            default:
                return null;
        }
    }

    public static getCanceledByUserDisplayName(approver: IdentityRef, status: ManualInterventionStatus): string {
        if (status === ManualInterventionStatus.Canceled) {
            return approver ? approver.displayName : null;
        }

        return null;
    }

    public static getCanceledByUserImageUrl(approver: IdentityRef, status: ManualInterventionStatus): string {
        if (status === ManualInterventionStatus.Canceled) {
            return approver ? approver.imageUrl : null;
        }

        return null;
    }

    public static getStatusSubText(
        status: ManualInterventionStatus,
        timeoutPolicy: ManualInterventionTimeoutPolicy,
        timeout: number,
        hasManageDeploymentsPermissions: boolean): string {

        let subText: string = null;
        if (status === ManualInterventionStatus.Pending && timeout) {
            subText = timeoutPolicy === ManualInterventionTimeoutPolicy.Resume
                ? Resources.ManualInterventionTimeoutPolicyForResume
                : Resources.ManualInterventionTimeoutPolicyForReject;
        }

        // user does not have permission, so append the permission text also
        if (!hasManageDeploymentsPermissions) {
            const permissionText = Resources.ManualInterventionNoPermissionsMessageText;
            subText = subText ? `${subText}<br>${permissionText}` : permissionText;
        }

        return subText;
    }

    public static getTimeoutTextString(pendingSinceDate: Date, timeout: number): string {
        const timeoutDate: Date = addMinutes(pendingSinceDate, timeout);
        return DateTimeUtilities.getDateDiffFriendlyString(timeoutDate, pendingSinceDate);
    }

    public static getStatusTitleFormat(status: ManualInterventionStatus, manualInterventionName: string): string {
        switch (status) {
            case ManualInterventionStatus.Approved:
                return Resources.ResumedDate;

            case ManualInterventionStatus.Rejected:
                return Resources.RejectedDate;

            case ManualInterventionStatus.Canceled:
                return Resources.CanceledTimestampFormat;

            case ManualInterventionStatus.Pending:
                return String_localeFormat(Resources.ManualInterventionPendingFormat, manualInterventionName);

            default:
                return null;
        }
    }

    public static getStatusTitle(status: ManualInterventionStatus, modifiedDate: Date): string {

        switch (status) {

            case ManualInterventionStatus.Approved:
            case ManualInterventionStatus.Rejected:
            case ManualInterventionStatus.Canceled:
                return DateTimeUtils.getLocaleTimestamp(modifiedDate);

            case ManualInterventionStatus.Pending:
                return null;

            default:
                return null;
        }

    }

    public static showTimeout(status: ManualInterventionStatus, timeout: number): boolean {
        return (status === ManualInterventionStatus.Pending) && (timeout > 0);
    }

    public static getTimeoutString(createdOn: Date, timeout: number): string {
        let futureDateStepArray = ReleaseApprovalsGatesTimeHelper.getFutureDateStepArray("{0}", ReleaseApprovalsGatesTimeHelper.c_conciseTimeResources, ReleaseApprovalsGatesTimeHelper.c_conciseTimeResources);
        const timeoutTime = addMinutes(createdOn, timeout);
        return new FriendlyDate(timeoutTime, PastDateMode.none, false, new Date(), false, false, [], futureDateStepArray).toString();
    }
}
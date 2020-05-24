import * as React from "react";
import * as WorkItemTypeIcon from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";

export interface WorkItemTypeIconWrapperProps {
    projectName: string;

    workItemTypeName: string;
}

export const WorkItemTypeIconWrapper: React.StatelessComponent<WorkItemTypeIconWrapperProps> = (props: WorkItemTypeIconWrapperProps) => {
    const hasCustomInput = typeof props.projectName !== "string",
        workItemIconProps: WorkItemTypeIcon.IWorkItemTypeIconProps = {
            workItemTypeName: props.workItemTypeName,
            projectName: hasCustomInput ? null : props.projectName as string
        };
    return <WorkItemTypeIcon.WorkItemTypeIcon {...workItemIconProps} />;
}
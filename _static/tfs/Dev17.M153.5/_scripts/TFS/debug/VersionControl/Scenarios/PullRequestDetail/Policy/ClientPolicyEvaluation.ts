import { PolicyEvaluationStatus } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { PullRequestPolicyEvaluation } from "VersionControl/Scenarios/PullRequestDetail/Contracts/PullRequestPolicyEvaluation";
import { IMenuItemSpec } from "VSS/Controls/Menus";

export interface ClientPolicyEvaluation {
    policyEvaluation: PullRequestPolicyEvaluation;
    isVisible: boolean;
    displayPriority: number;
    displayUrl?: string;
    displayUrlHubId?: string;
    actions?: ClientPolicyAction[];
    hasDynamicStatus?: boolean;
}

export interface ClientPolicyAction extends IMenuItemSpec {
    actionId: string;
    actionArg: string;
}

export const PullRequestPolicyTypeIds = {
    ApproverCountPolicy: "fa4e907d-c16b-4a4c-9dfa-4906e5d171dd",
    BuildPolicy: "0609b952-1397-4640-95ec-e00a01b2c241",
    CommentRequirementsPolicy: "c6a1889d-b943-4856-b76f-9e46bb6b0df2",
    MergeStrategyPolicy: "fa4e907d-c16b-4a4c-9dfa-4916e5d171ab",
    FileSizePolicy: "2e26e725-8201-4edd-8bf5-978563c34a80",
    RequiredReviewersPolicy: "fd2167ab-b0be-447a-8ec8-39368250530e",
    WorkItemLinkingPolicy: "40e92b44-2fe1-4dd6-b3d8-74a9c21d0c6e",
    StatusPolicy: "cbdc66da-9728-4af8-aada-9a5a32e4a226",
};

export namespace PolicyErrorCode {
    export let MissingType = "9f3c4c7d-f104-4063-aeb6-35f3ca2396c7";
    export let Unknown = "bddcdd34-fc89-44de-9515-f6728d2cb31e";
}

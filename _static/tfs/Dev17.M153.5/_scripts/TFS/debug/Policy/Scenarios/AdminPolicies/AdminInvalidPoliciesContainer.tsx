// libs
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Locations from "VSS/Locations";
import Navigation_Common = require("TfsCommon/Scripts/Navigation/Common");
import { autobind } from "OfficeFabric/Utilities";
// contracts
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { DefinitionReference } from "TFS/Build/Contracts";
// controls
import { Fabric, IFabricProps } from "OfficeFabric/Fabric";
import { Image } from "OfficeFabric/Image";
import { Link } from "OfficeFabric/Link";
import { AdminPoliciesTitle } from "Policy/Scenarios/AdminPolicies/AdminPoliciesTitle";
// scenario
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

export interface AdminInvalidPoliciesContainerProps extends React.HTMLProps<HTMLDivElement | Fabric | AdminInvalidPoliciesContainer> {
    tfsContext: TfsContext;
    defaultGitRepoName: string;
}

/**
 * Top-level control when policy scope is invalid. This will have some content to guide the user how to edit branch policies.
 */
export class AdminInvalidPoliciesContainer extends React.Component<AdminInvalidPoliciesContainerProps, {}> {

    public static attachToDOM(container: HTMLElement, props: AdminInvalidPoliciesContainerProps)
        : React.Component<AdminInvalidPoliciesContainerProps, void> {
        return ReactDOM.render(
            <AdminInvalidPoliciesContainer {...props as any} />,
            container
        ) as React.Component<any, any>;
    }

    constructor(props: AdminInvalidPoliciesContainerProps) {
        super(props);
    }

    public render(): JSX.Element {

        const { tfsContext, defaultGitRepoName, ...htmlProps } = this.props;

        const screenshotUrl = Locations.urlHelper.getVersionedContentUrl("Policy/exampleBranchesPage.png");

        let branchesUrl: string;

        if (defaultGitRepoName) {
            branchesUrl = tfsContext.getActionUrl(defaultGitRepoName, "git", { parameters: ["branches"] });
        }

        return (
            <Fabric className="admin-invalid-policies-container zerodata" {...htmlProps as IFabricProps}>
                <Image
                    alt={Resources.BranchPageScreenshotAlt}
                    src={screenshotUrl}
                    className="branch-page-screenshot"
                />

                <div className="ms-font-xxl primary protect-text">{Resources.ProtectWithBranchPoliciesText}</div>
                <div className="ms-font-m protect-detail">{Resources.ProtectWithBranchPoliciesDetails}</div>

                {branchesUrl &&
                    <Link className="info-link branch-page-link" href={branchesUrl}>
                        {Resources.LinkToBranchesPageText + " "}<i className="icon bowtie-icon bowtie-navigate-forward-circle"></i>
                    </Link>
                }
            </Fabric>
        );
    }
}

//css
import "VSS/LoaderPlugins/Css!Policy/Scenarios/AdminPolicies/AdminPoliciesTitle";
// libs
import * as React from "react";
// contracts
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
// controls
import { Icon } from "OfficeFabric/Icon";
import { Breadcrumb, IBreadcrumbItem } from "OfficeFabric/Breadcrumb";
// scenario
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

export interface AdminPoliciesTitleProps extends React.HTMLProps<HTMLDivElement> {
    projectName: string;
    repositoryName: string;
    friendlyBranchName: string;
}

/**
 * Breadcrumb which tells you which project / repo / branch you are configuring policies for
 */
export class AdminPoliciesTitle extends React.Component<AdminPoliciesTitleProps, {}> {
    public render(): JSX.Element {

        const { projectName, repositoryName, friendlyBranchName, ...htmlProps } = this.props;

        const items: IBreadcrumbItem[] = [
            { text: projectName, key: "project" },
            { text: repositoryName, key: "repository", },
            { text: friendlyBranchName, key: "branch", },
        ];

        return (
            <div {...htmlProps}>
                <div className="ms-font-xl admin-policies-breadcrumb-text">{Resources.PoliciesFor}</div>
                <div className="admin-policies-breadbrumb-container">
                    <Breadcrumb className="admin-policies-breadcrumb" items={items} />
                </div>
            </div>
        );
    }

    constructor(props: AdminPoliciesTitleProps) {
        super(props);
    }
}

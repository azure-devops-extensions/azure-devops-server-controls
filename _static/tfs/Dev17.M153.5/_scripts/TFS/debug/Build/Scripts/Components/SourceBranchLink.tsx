/// <reference types="react" />

import React = require("react");

import { injectSourceProvider } from "Build/Scripts/Components/InjectSourceProvider";
import { LinkWithKeyBinding } from "Build/Scripts/Components/LinkWithKeyBinding";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { QueryResult } from "Build/Scripts/QueryResult";
import { SourceProviderManager } from "Build/Scripts/SourceProviderManager";

import { Build } from "TFS/Build/Contracts";

import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!Build/SourceBranchLink";

interface Props extends SourceBranchLinkProps {
    sourceProviderManager: QueryResult<SourceProviderManager>;
}

class Component extends React.Component<Props, any> {
    public render(): JSX.Element {
        if (!this.props.sourceProviderManager.pending) {
            let sourceProviderManager = this.props.sourceProviderManager.result;

            let canLink = sourceProviderManager.canLinkBranch(this.props.build.repository.type);
            let branchIconClass = sourceProviderManager.getBranchIconClass(this.props.build.repository.type, this.props.build.sourceBranch);

            let branchIcon: JSX.Element = null;
            if (branchIconClass) {
                branchIcon = <div className={"icon bowtie-icon " + branchIconClass}></div>
            }

            let calculatedSourceBranch = sourceProviderManager.getSourceBranch(this.props.build);

            if (!canLink) {
                return <span className="source-branch-link">{branchIcon}{calculatedSourceBranch}</span>;
            }
            else {
                return <LinkWithKeyBinding
                    className="source-branch-link"
                    title={Utils_String.format(BuildResources.ViewBranchUpdatesText, calculatedSourceBranch)}
                    href={sourceProviderManager.getSourceBranchLink(TFS_Host_TfsContext.TfsContext.getDefault(), this.props.build.project.id, this.props.build.repository.id, this.props.build.repository.type, this.props.build.sourceBranch)}
                    icon={branchIcon}
                    text={calculatedSourceBranch}
                    />;
            }
        }
        else {
            return <span />;
        }
    }

    public shouldComponentUpdate(nextProps: Props, nextState: any): boolean {
        return this.props.sourceProviderManager.pending !== nextProps.sourceProviderManager.pending
            || this.props.sourceProviderManager.result !== nextProps.sourceProviderManager.result
            || this.props.build.project.id !== nextProps.build.project.id
            || this.props.build.repository.id !== nextProps.build.repository.id
            || this.props.build.repository.type !== nextProps.build.repository.type
            || this.props.build.sourceBranch !== nextProps.build.sourceBranch
            || this.props.sourceProviderManager.result.getSourceBranch(this.props.build) !== nextProps.sourceProviderManager.result.getSourceBranch(nextProps.build);
    }
}

export interface SourceBranchLinkProps {
    build: Build;
}

export const SourceBranchLink = (props: SourceBranchLinkProps) => {
    return injectSourceProvider((sourceProviderManager) => {
        return <Component {...props} sourceProviderManager={sourceProviderManager} />
    });
}

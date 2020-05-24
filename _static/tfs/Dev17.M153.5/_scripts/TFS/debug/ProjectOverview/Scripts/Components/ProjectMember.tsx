import * as React from "react";
import { registerLWPComponent } from "VSS/LWP";
import { format } from "VSS/Utils/String";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { IdentityDetailsProvider } from "VSSPreview/Providers/IdentityDetailsProvider";
import { VssPersona } from "VSSUI/VssPersona";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { MemberInfo } from "ProjectOverview/Scripts/Generated/Contracts";

import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Components/ProjectMember";

// Unique Guid identifying the consumer of PersonaCard in VssPersona
const consumerId = "F3F79DA5-C502-4451-9089-1918BB16209D";

export interface ProjectMemberProps {
    member: MemberInfo;
}

export interface ProjectMemberState {
    identity: IdentityRef;
}

export class ProjectMember extends React.Component<ProjectMemberProps, ProjectMemberState> {
    constructor(props: ProjectMemberProps) {
        super(props);

        const { id, name, mail } = props.member;
        const src = TfsContext.getDefault().getIdentityImageUrl(id);

        const identity = {
            // Only id, displayName, uniqueName & isContainer property values are consumed by VssPersona, others are don't care, hence set to defaults
            // Hardcoding isContainer to default (false) which means all identities are members and not a group, since we expand groups
            id: id,
            directoryAlias: null,
            displayName: name,
            uniqueName: mail,
            imageUrl: src,
            inactive: false,
            isAadIdentity: false,
            isContainer: false,
            profileUrl: "",
            url: ""
        } as IdentityRef;

        this.state = {
            identity: identity
        };
    }

    public render(): JSX.Element {
        const { id, name, mail } = this.props.member;
        const { identity } = this.state;
        const ariaLabel = !!mail ? format("{0} <{1}>", name, mail) : format("{0}", name);

        return (
            <div
                className="project-member"
                key={id}
                id={id}
                aria-label={ariaLabel}>
                <VssPersona
                    identityDetailsProvider={new IdentityDetailsProvider(identity, consumerId)}
                    dataIsFocusable />
            </div>
        );
    }
}

registerLWPComponent("TFS.ProjectOverview.ProjectMember", ProjectMember);

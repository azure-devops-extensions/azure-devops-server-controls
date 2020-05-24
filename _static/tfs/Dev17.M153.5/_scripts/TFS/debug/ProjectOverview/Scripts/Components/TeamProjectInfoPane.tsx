import * as React from "react";

import { Icon } from "OfficeFabric/Icon";
import { Persona, PersonaSize } from "OfficeFabric/Persona";
import { AnimationClassNames } from "OfficeFabric/Styling";
import { DirectionalHint, TooltipHost } from "VSSUI/Tooltip";
import { css} from "OfficeFabric/Utilities";
import { getDefaultWebContext } from "VSS/Context";
import { format } from "VSS/Utils/String";
import { ProjectVisibility } from "TFS/Core/Contracts";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectVisibilityConstants } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { ProjectDescription } from "ProjectOverview/Scripts/Components/ProjectDescription";
import { ProjectFavorite } from "ProjectOverview/Scripts/Components/ProjectFavorite";
import { ProjectLikes } from "ProjectOverview/Scripts/Components/ProjectLikes";
import { ProjectAboutData } from "ProjectOverview/Scripts/Generated/Contracts";
import { DescriptionEditingToggleType } from "ProjectOverview/Scripts/Constants";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";
import { VisibilityTag } from "ProjectOverview/Scripts/Shared/Components/VisibilityTag";

import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Components/TeamProjectInfoPane";

export interface TeamProjectInfoProps {
    projectAboutData: ProjectAboutData;
    errorMessage: string;
    hasProjectEditPermission: boolean;
    onSaveDescriptionClicked: (newDescription: string) => void;
    isEditingProjectDescription: boolean;
    isEditingProjectDescriptionDisabled: boolean;
    toggleEditingProjectDescription: (toggleType: DescriptionEditingToggleType) => void;
    clearErrorMessage: () => void;
    publishProjectDescriptionDiscardClicked: () => void;
    publishProjectDescriptionDiscardDialogOKClicked: () => void;
    publishProjectDescriptionDiscardDialogCancelClicked: () => void;
    publishProjectDescriptionDiscardDialogDismissed: () => void;
    headingLevel: number;
}

export interface TeamProjectInfoState {
    showSeparator: boolean;
}

export class TeamProjectInfoPane extends React.Component<TeamProjectInfoProps, TeamProjectInfoState> {

    constructor(props: TeamProjectInfoProps) {
        super(props);

        this.state = {
            showSeparator: false,
        };
    }

    public render(): JSX.Element {
        const {
            projectAboutData,
            errorMessage,
            hasProjectEditPermission,
            onSaveDescriptionClicked,
            isEditingProjectDescription,
            isEditingProjectDescriptionDisabled,
            toggleEditingProjectDescription,
            clearErrorMessage,
            publishProjectDescriptionDiscardClicked,
            publishProjectDescriptionDiscardDialogOKClicked,
            publishProjectDescriptionDiscardDialogCancelClicked,
            publishProjectDescriptionDiscardDialogDismissed,
            headingLevel,
        } = this.props;
       
        return (
            <div
                className="team-project-info-pane"
                role="region"
                aria-label={ProjectOverviewResources.ProjectInformationRegion_Label}>
                <ProjectImage
                    isProjectImageSet={projectAboutData.isProjectImageSet}
                    projectName={projectAboutData.name} />
                <span className="project-details">
                    <div
                        className="project-title"
                        role="heading"
                        aria-level={headingLevel}>
                        {projectAboutData.name}
                    </div>
                    <ProjectFavorite
                        projectName={projectAboutData.name}
                        projectId={projectAboutData.id} />
                    <div className="right-float-content">
                        <ProjectLikes
                            projectId={projectAboutData.id}
                            onLikeHeartRender={this._updateSeparatorState}
                            isOrganizationActivated={projectAboutData.isOrganizationActivated} />
                        <Separator showSeparator={this.state.showSeparator} />
                        <VisibilityTag
                            visibility={projectAboutData.visibility}
                            className={"project-visibility-tag-container"}/>
                    </div>
                    <div className="clear-floats" />
                    <ProjectDescription
                        description={projectAboutData.description}
                        hasProjectEditPermission={hasProjectEditPermission}
                        onSaveClicked={onSaveDescriptionClicked}
                        errorMessage={errorMessage}
                        isEditing={isEditingProjectDescription}
                        isEditingDisabled={isEditingProjectDescriptionDisabled}
                        toggleEditing={toggleEditingProjectDescription}
                        clearErrorMessage={clearErrorMessage}
                        publishProjectDescriptionDiscardClicked={publishProjectDescriptionDiscardClicked}
                        publishProjectDescriptionDiscardDialogOKClicked={publishProjectDescriptionDiscardDialogOKClicked}
                        publishProjectDescriptionDiscardDialogCancelClicked={publishProjectDescriptionDiscardDialogCancelClicked}
                        publishProjectDescriptionDiscardDialogDismissed={publishProjectDescriptionDiscardDialogDismissed} />
                </span>
            </div>
        );
    }
    
    private _updateSeparatorState = (): void => {
        // This method gets called when likes component is shown. Checking if visibility tag is also existing to show separator.
        if (!this.state.showSeparator && !!this.props.projectAboutData.visibility) {
            // Using setTimeout to schedule re-render after current one is complete.
            setTimeout(() => this.setState({ showSeparator: true }), 0);
        }
    }
}

interface ProjectImageProps {
    isProjectImageSet: boolean;
    projectName: string;
}

const ProjectImage = (props: ProjectImageProps): JSX.Element => {
    const projectImageAnimationClassName = AnimationClassNames.fadeIn400;

    return (
        props.isProjectImageSet
            ? <div className={css("default-team-image", projectImageAnimationClassName)}>
                <img
                    src={TfsContext.getDefault().getIdentityImageUrl(getDefaultWebContext().team.id, { t: Date.now() })}
                    alt="" />
            </div>
            : props.isProjectImageSet === undefined
                ? <div className="placeholder" />
                : <Persona
                    className={css("project-persona", projectImageAnimationClassName)}
                    hidePersonaDetails={true}
                    size={PersonaSize.large}
                    primaryText={props.projectName}
                    allowPhoneInitials={true}
                />
    );
}

const Separator = (props: {
    showSeparator: boolean;
}): JSX.Element => {
    return props.showSeparator
        ? <div className="separator-bar" />
        : null;
}

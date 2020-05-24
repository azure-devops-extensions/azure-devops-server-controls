import * as React from "react";
import * as PageError from "Presentation/Scripts/TFS/Components/GenericPageError";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";
import * as Locations from "VSS/Locations";

export var ProjectsPageError: PageError.Props = {
    text: MyExperiencesResources.Projects_NonTeamMemberError,
    imageUrl: Locations.urlHelper.getVersionedContentUrl("MyExperiences/general-robot-error.png"),
};

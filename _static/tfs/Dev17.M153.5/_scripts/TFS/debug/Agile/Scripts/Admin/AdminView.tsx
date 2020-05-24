import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Context from "VSS/Context";
import * as Contribution_Services from "VSS/Contributions/Services";
import * as Service from "VSS/Service";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { AdminProjectViewComponent } from "Agile/Scripts/Admin/AdminProjectView";
import { AdminTeamViewComponent } from "Agile/Scripts/Admin/AdminTeamView";

interface AdminViewComponentProps {
    title: string;
    projectViewOptionsJson: string;
    teamViewOptionsJson?: string;
    teamFieldDataOptions?: string;
    teamSettingsControlOptions?: string;
    isTeamFieldAreaPath: boolean;
    processName: string;
}

SDK_Shim.registerContent("agileAdminView.initialize", (context: SDK_Shim.InternalContentContextData): IDisposable => {
    const pageDataService = Service.getService(Contribution_Services.WebPageDataService);
    const pageData = pageDataService.getPageData<AdminViewComponentProps>("ms.vss-work-web.agile-admin-data-provider");
  
    ReactDOM.render(
        <AdminProjectViewComponent
            title={pageData.title}
            viewOptionsJson={pageData.projectViewOptionsJson}
            processName={pageData.processName}
        />,
        context.container,
    );

    const disposable = {
        dispose: () => {
            ReactDOM.unmountComponentAtNode(context.container);
        }
    };

    return disposable;
});

SDK_Shim.registerContent("agileAdminView.initializeTeam", (context: SDK_Shim.InternalContentContextData): IDisposable => {
    const pageDataService = Service.getService(Contribution_Services.WebPageDataService);
    const pageData = pageDataService.getPageData<AdminViewComponentProps>(
        "ms.vss-work-web.agile-team-admin-data-provider",
    );

    // For new vertical settings hub, we will have a specific team defined from the request.
    // We will overwrite the old legacy TFS context's team information with this so that
    // the existing hub continues to work as expected.
    const teamData = pageDataService.getPageData<{ team: { id: string; name: string } }>("ms.vss-tfs-web.team-data");
    if (teamData) {
        const webContext = Context.getDefaultWebContext();
        if (!webContext.team) {
            webContext.team = { id: teamData.team.id, name: teamData.team.name };
        } else {
            webContext.team.id = teamData.team.id;
            webContext.team.name = teamData.team.name;
        }

        const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        if (tfsContext.currentTeam) {
            tfsContext.currentTeam.name = teamData.team.name;
            tfsContext.currentTeam.identity.displayName = teamData.team.name;
            tfsContext.currentTeam.identity.id = teamData.team.id;
            tfsContext.navigation.teamId = teamData.team.id;
        }
    }
    
    ReactDOM.render(
        <AdminTeamViewComponent
            title={pageData.title}
            processName={pageData.processName}
            isTeamFieldAreaPath={pageData.isTeamFieldAreaPath}
            projectViewOptionsJson={pageData.projectViewOptionsJson}
            teamFieldDataOptions={pageData.teamFieldDataOptions}
            teamSettingsControlOptions={pageData.teamSettingsControlOptions}
            teamViewOptionsJson={pageData.teamViewOptionsJson}
        />,
        context.container,
    );

    const disposable = {
        dispose: () => {
            ReactDOM.unmountComponentAtNode(context.container);
        }
    };

    return disposable;
});

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

export function vsUrlprocessHtml($container: JQuery) {
    const workItemLinkRegex = /x-mvwit:workitem\/([0-9]+)/;
    const content = $container.html();
    const regexResult = workItemLinkRegex.exec(content);

    if (regexResult && regexResult.length > 1) {
        const workItemId = regexResult[1];
        const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        
        const url = tfsContext.getPublicActionUrl("edit", "workitems", {
            parameters: +workItemId,
            project: tfsContext.navigation.project || tfsContext.navigation.projectId,
            team: ""
        } as TFS_Host_TfsContext.IRouteData);

        $container.html(content.replace(new RegExp(regexResult[0], 'g'), url));
    }
}

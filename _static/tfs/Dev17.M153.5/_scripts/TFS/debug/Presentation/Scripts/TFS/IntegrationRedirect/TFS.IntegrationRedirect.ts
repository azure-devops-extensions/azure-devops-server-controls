
import Controls = require("VSS/Controls");
import LocationsContracts = require("VSS/Locations/Contracts");
import LocationsRestClient = require("VSS/Locations/RestClient");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import VSSService = require("VSS/Service");
import Resources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import Utils_String = require("VSS/Utils/String");
import Utils_Core = require("VSS/Utils/Core");
import VSS_WebApi_Constants = require("VSS/WebApi/Constants");
import * as microsoftTeams from "@microsoft/teams-js";

export class IntegrationConfigureView extends Controls.BaseControl {
    private _$signInButton: JQuery;
    private _currentTheme: string;

    public initialize() {

        // Go see if we can reach the connectionData endpoint for this collection.
        // If so, we're validly authenticated and can redirect to the next location.
        // Otherwise, we need to display the authentication UX.

        var redirectUrl: string = this._options.RedirectUrl;
        var tfsConnection: VSSService.VssConnection = new VSSService.VssConnection(TFS_Host_TfsContext.TfsContext.getDefault().contextData);
        var locationClient: LocationsRestClient.LocationsHttpClient3 = tfsConnection.getHttpClient<LocationsRestClient.LocationsHttpClient3>(
            LocationsRestClient.LocationsHttpClient3,
            VSS_WebApi_Constants.ServiceInstanceTypes.TFS);
            
        locationClient.getConnectionData().then(
            (value: LocationsContracts.ConnectionData) => {
                window.location.href = redirectUrl;
            },
            (reason: any) => {
                // If for any reason we failed, load the Teams library and display the auth UX. 
                microsoftTeams.initialize();
                microsoftTeams.getContext((context: microsoftTeams.Context) => {
                    let $mainContent = $("#main-content");
                    if (context && context.theme) {
                        this._currentTheme = context.theme;
                        $mainContent.addClass(context.theme);
                    }
                    $mainContent.append('<p style="padding-bottom:10px;">' + Resources.SignInToViewBoard + '</p>');
                    this._$signInButton = $('<input/>')
                        .attr({ type: 'submit' })
                        .val(Resources.SignInToVSTS)
                        .click(() => { this.logIn(); return false; });
                    $mainContent.append(this._$signInButton);
                    $mainContent.append('<p style="padding-top:10px;">' + Resources.RefreshSignInToVSTS + '</p>');
                });
                microsoftTeams.registerOnThemeChangeHandler((theme: string) => {
                    if (Utils_String.ignoreCaseComparer(theme, this._currentTheme) !== 0) {
                        let $mainContent = $("#main-content");
                        $mainContent.removeClass(this._currentTheme);
                        $mainContent.addClass(theme);
                        this._currentTheme = theme;
                    }
                });
            });
    }

    private logIn() {
        let signInButton = this._$signInButton;
        microsoftTeams.authentication.authenticate({
            url: `teamsAuthRedirect?replyTo=${encodeURIComponent(window.location.protocol + "//" + window.location.host + '/_integrationredirect/complete')}`,
            height: 500,
            width: 600,
            successCallback: function (result) {
                signInButton.prop("disabled", true);
                window.location.reload();
            },
            failureCallback: function (reason) { console.log(`Error during authentication: ${reason}`); }
        });
    }
}

export class CompleteView extends Controls.BaseControl {
    public initialize() {
        microsoftTeams.initialize();
        microsoftTeams.authentication.notifySuccess();
    }
}

let redirectJsonIsland: string = $('#redirect-options').eq(0).html();
let completeRedirectJsonIsland: string = $('#complete-redirect').eq(0).html();

if (redirectJsonIsland) {
    Controls.Enhancement.registerEnhancement(IntegrationConfigureView, '#main-content', Utils_Core.parseMSJSON(redirectJsonIsland));
}
if (completeRedirectJsonIsland) {
    Controls.Enhancement.registerEnhancement(CompleteView, '#main-content', Utils_Core.parseMSJSON(completeRedirectJsonIsland));
}
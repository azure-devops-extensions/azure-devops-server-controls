import React = require("react");
import ReactDOM = require("react-dom");

import TestManagement_Admin = require("TestManagement/Scripts/TFS.TestManagement.Admin");
import TestManagement_Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");

import Controls = require("VSS/Controls");
import SDK_Shim = require("VSS/SDK/Shim");

import "VSS/LoaderPlugins/Css!TestManagement";

class AdminTestComponent extends React.Component<{}> {
    private viewElement: HTMLDivElement;
    private retentionSettingsTemplate = `
        <table class="retention-settings-table">
            <tr>
                <td class="info-cell">
                    <div class="info-header">${TestManagement_Resources.DaysToKeepAutomatedResultsText}</div>
                    <div class="info-details">${TestManagement_Resources.RetainsAutomatedResultsWithRetainedBuildText}</div>
                </td>
                <td class="combo-data">
                    <div class="duration-selector-automated"></div>
                </td>
            </tr>

            <tr>
                <td class="info-cell">
                    <div class="info-header">${TestManagement_Resources.DaysToKeepManualResultsText}</div>
                    <div class="info-details">${TestManagement_Resources.RetainsManualResultsWithRetainedBuildText}</div>
                </td>
                <td class="combo-data">
                    <div class="duration-selector-manual"></div>
                </td>
            </tr>

        </table>

        <button class="save-changes-button" data-bind="enable: canSave">
            ${TestManagement_Resources.SaveChangesText}
        </button>

        <button class="undo-changes-button" data-bind="enable: canUndo">
            ${TestManagement_Resources.UndoChangesText}
        </button>`;

    public render(): JSX.Element {
        return (
            <div ref={(el) => this.viewElement = el} className="test-admin-view">
                <script id="retention_settings" type="text/html"></script>
                <h3 className="retention-header">{TestManagement_Resources.RetentionActionName}</h3>
                <div className="retention-settings-container"></div>
            </div>
        );
    }

    public componentDidMount(): void {
        // Make sure the template needed by admin view is added
        $(this.viewElement).find("#retention_settings").html(this.retentionSettingsTemplate);

        // Make sure legacy admin view is enhanced and renders its UI as expected
        Controls.Enhancement.ensureEnhancement(TestManagement_Admin.AdminView);
    }
}

SDK_Shim.registerContent("testAdminPivot.initialize", (context: SDK_Shim.InternalContentContextData): void => {

    ReactDOM.render(
        <AdminTestComponent />,
        context.container
    );
});
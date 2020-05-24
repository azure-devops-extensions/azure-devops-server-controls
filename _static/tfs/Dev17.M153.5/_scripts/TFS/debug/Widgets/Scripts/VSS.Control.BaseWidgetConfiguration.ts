/// <amd-dependency path='VSS/LoaderPlugins/Css!widgets' />



import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import Dashboard_Contracts = require("TFS/Dashboards/Contracts");

import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Controls = require("VSS/Controls");

export class BaseWidgetConfiguration<T extends Dashboard_Shared_Contracts.WidgetConfigurationOptions>
    extends Controls.Control<T> {

    protected tfsContext: Contracts_Platform.WebContext;
    protected teamContext: Contracts_Platform.TeamContext;
    public configureName: Dashboard_Shared_Contracts.IConfigureWidgetName;

    /*
     * BaseWidget need to define all context during the construction because context can be used during initialization of child
     */
    constructor(options?: T) {
        super(options);
        this.tfsContext = Context.getDefaultWebContext();
        this.teamContext = TFS_Dashboards_Common.getDashboardTeamContext();

        this.configureName = {
            getCurrentWidgetName: this._options.getCurrentWidgetName,
            setCurrentWidgetName: this._options.setCurrentWidgetName
        };
    }

    public getWidgetTypeId(): string {
        return this._options.widgetTypeId;
    }

    public getCurrentWidgetSize(): Dashboard_Contracts.WidgetSize {
        return this._options.getCurrentWidgetSize();
    }
}

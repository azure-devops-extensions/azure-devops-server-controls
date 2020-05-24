import Service = require("VSS/Service");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");

export class TfsService extends Service.VssService {
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    public tfsConnection: Service.VssConnection;

    public initializeConnection(connection: Service.VssConnection) {
        super.initializeConnection(connection);
        this.tfsConnection = connection;
    }

    public getTfsContext(): TFS_Host_TfsContext.TfsContext {
        if (!this._tfsContext) {
            var webContext = this.getWebContext();
            if (webContext === Context.getDefaultWebContext()) {
                this._tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
            }
            else {
                this._tfsContext = new TFS_Host_TfsContext.TfsContext(webContext);
            }
        }
        return this._tfsContext;
    }

    public getCurrentServiceHost(): TFS_Host_TfsContext.IServiceHost {
        var tfsContext = this.getTfsContext();
        var hostType = this.getConnection().getHostType();

        if (hostType === Contracts_Platform.ContextHostType.ProjectCollection) {
            return tfsContext.navigation.collection;
        }
        else if (hostType === Contracts_Platform.ContextHostType.Application) {
            return tfsContext.navigation.applicationServiceHost;
        }
        else {
            return tfsContext.navigation.serviceHost;
        }
    }
}

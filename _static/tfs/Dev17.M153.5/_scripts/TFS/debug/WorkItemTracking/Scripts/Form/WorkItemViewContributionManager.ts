import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import Extensions = require("WorkItemTracking/Scripts/Extensions/TFS.WorkItemTracking.Extensions");
import ExtensionContracts = require("TFS/WorkItemTracking/ExtensionContracts");
import Contributions_Controls = require("VSS/Contributions/Controls");

/**
* Keeps track of control contribution promises for the work item view.  The renderer's populate this with the promises for 
* all control contributions on the form.  When the contributions are loaded, it will fire an 'onLoaded' event to them.  
* This is necessary because these controls are constructed asynchronously and miss the onLoaded call in 'bind'.
*/
class WorkItemViewContributionManager {

    private _disposed: boolean = false;
    private _workItem: WITOM.WorkItem
    private _controlContributionPromises: IPromise<Extensions.IContributionWithSource<ExtensionContracts.IWorkItemNotificationListener>>[] = [];
    private _controlContributionHosts: Contributions_Controls.IExtensionHost[] = [];

    constructor() {
    }

    /**
    * Add a contribution promise
    */
    public addPromise(contributionPromise: IPromise<Extensions.IContributionWithSource<ExtensionContracts.IWorkItemNotificationListener>>): void {
        this._controlContributionPromises.push(contributionPromise);

        contributionPromise.then((value) => {
            if (this._disposed) {
                // Do nothing if manager disposed before the promise returns
                return;
            }

            if (value.host) {
                this._controlContributionHosts.push(value.host);
            }

            // Fire 'onLoaded' manually here when the control completes loading the first time.  
            if (value.source && this._workItem && $.isFunction(value.source.onLoaded)) {
                const args: ExtensionContracts.IWorkItemLoadedArgs = {
                    id: this._workItem.id,
                    isNew: this._workItem.isNew(),
                    isReadOnly: this._workItem.isReadOnly(),
                };
                value.source.onLoaded(args);
            }
        });
    }

    public bind(workItem: WITOM.WorkItem): void {
        this._workItem = workItem;
    }

    public unbind(): void {
        this._workItem = null;
    }

    public dispose(): void {
        if (this._disposed) {
            return;
        }

        this.unbind();

        this._controlContributionHosts.forEach((host: Contributions_Controls.IExtensionHost) => {
            host.dispose();
        });

        this._disposed = true;
    }

    /**
    * Retrieve all known contribution promises
    */
    public getPromises(): IPromise<Extensions.IContributionWithSource<ExtensionContracts.IWorkItemNotificationListener>>[] {
        return this._controlContributionPromises;
    }
}

export = WorkItemViewContributionManager;
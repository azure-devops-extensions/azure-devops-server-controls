import { TagActionHub } from "Build/Scripts/Actions/Tags";
import { raiseTfsError } from "Build/Scripts/Events/MessageBarEvents";

import { BuildClientService } from "Build.Common/Scripts/ClientServices";

import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";

import { VssConnection } from "VSS/Service";
import { ignoreCaseComparer } from "VSS/Utils/String";

export class TagsSource extends TfsService {
    private _buildService: BuildClientService;

    public initializeConnection(connection: VssConnection) {
        super.initializeConnection(connection);

        this._buildService = this.getConnection().getService(BuildClientService);
    }

    public getTags(hub: TagActionHub): void {
        this._buildService.getSuggestedTags()
            .then((tags: string[]) => {
                tags = (tags || []).sort((a, b) => ignoreCaseComparer(a, b));
                hub.suggestionsRetrieved.invoke({
                    tags: tags
                });
            }, raiseTfsError);
    }
}
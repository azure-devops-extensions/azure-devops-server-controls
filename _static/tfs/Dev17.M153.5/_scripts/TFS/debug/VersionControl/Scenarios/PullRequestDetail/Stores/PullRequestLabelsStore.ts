import { autobind } from "OfficeFabric/Utilities";
import { RemoteStore } from "VSS/Flux/Store";
import { arrayEquals } from "VSS/Utils/Array";
import { ignoreCaseComparer } from "VSS/Utils/String";

import { WebApiTagDefinition } from "TFS/Core/Contracts";
import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";

export class PullRequestLabelsStore extends RemoteStore {
    private _labels: WebApiTagDefinition[] = [];

    public getLabels(): WebApiTagDefinition[] {
        return this._labels;
    }

     @autobind
    public onLabelsLoaded(payload: Actions.IPullRequestLabelsUpdatedPayload): void {
        this._loading = false;
        this._updateLabelsAndEmit(payload.pullRequestLabels);
    }

    @autobind
    public onLabelAdded(payload: Actions.IPullRequestLabelUpdatedPayload): void {
        if (!this._containsLabel(payload.pullRequestLabel)) {
            this._updateLabelsAndEmit([...this._labels, payload.pullRequestLabel]);
        }
    }

    @autobind
    public onLabelRemoved(payload: Actions.IPullRequestLabelUpdatedPayload): void {
        if (this._containsLabel(payload.pullRequestLabel)) {
            this._labels = this._labels.filter(l => l.id !== payload.pullRequestLabel.id);
            this.emitChanged();
        }
    }

    private _containsLabel(label: WebApiTagDefinition): boolean {
        return this._labels.some(l => l.id === label.id);
    }

    private _updateLabelsAndEmit(newLabels: WebApiTagDefinition[]) {
        const sortedNewLabels = newLabels.sort((a, b) => ignoreCaseComparer(a.name, b.name));
        const sorted = true;
        if (arrayEquals(sortedNewLabels, this._labels, (a, b) => a.name === b.name, undefined, sorted)) {
            return;
        }

        this._labels = sortedNewLabels;
        this.emitChanged();
    }
}

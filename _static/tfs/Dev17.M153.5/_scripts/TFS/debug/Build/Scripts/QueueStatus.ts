import { getDefinition } from "Build/Scripts/Actions/DefinitionsActionCreator";
import { DefinitionSource } from "Build/Scripts/Sources/Definitions";

import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";

import { DefinitionQueueStatus } from "TFS/Build/Contracts";

import { VssConnection, getCollectionService } from "VSS/Service";

class QueueStatusService extends TfsService {
    public initializeConnection(connection: VssConnection): void {
        super.initializeConnection(connection);

        this._definitionSource = this.getConnection().getService(DefinitionSource);
    }

    public updateDefinition(definitionId: number, status: DefinitionQueueStatus): void {
        getDefinition(this._definitionSource, definitionId).then(definition => {
            definition.queueStatus = status;
            this._definitionSource.updateDefinition(definition);
        });
    }

    private _definitionSource: DefinitionSource;
}

var __queueStatusHandler: QueueStatusHandler = null;

export class QueueStatusHandler {
    constructor() {
        this._queueStatusService = getCollectionService(QueueStatusService);
    }

    public pauseDefinition(definitionId: number) {
        return this._queueStatusService.updateDefinition(definitionId, DefinitionQueueStatus.Paused);
    }

    public enableDefinition(definitionId: number) {
        return this._queueStatusService.updateDefinition(definitionId, DefinitionQueueStatus.Enabled);
    }

    private _queueStatusService: QueueStatusService;
}

export function getQueueStatusHandler() {
    if (!__queueStatusHandler) {
        __queueStatusHandler = new QueueStatusHandler();
    }

    return __queueStatusHandler;
}
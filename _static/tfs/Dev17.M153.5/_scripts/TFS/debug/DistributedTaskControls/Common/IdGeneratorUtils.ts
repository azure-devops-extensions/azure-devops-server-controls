
import { Singleton } from "DistributedTaskControls/Common/Factory";

/**
 * @brief Utilities for generating unique ids
 */
export class IdGeneratorUtils extends Singleton {

    constructor() {
        super();
        this._startId = 0;
    }

    public static instance(): IdGeneratorUtils {
        return super.getInstance<IdGeneratorUtils>(IdGeneratorUtils);
    }

    public getUniqueNegativeId(): number {
        this._startId--;
        return this._startId;
    }

    private _startId: number;
}
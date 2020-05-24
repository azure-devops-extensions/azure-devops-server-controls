import { IterationDateUtil } from "Agile/Scripts/Common/IterationDateUtil";
import { getDateTimeFormat } from "VSS/Utils/Culture";
import { localeFormat, shiftToUTC, shiftToLocal } from "VSS/Utils/Date";
import { normalizePath } from "VSS/Utils/File";
import { DateRange } from "TFS/Work/Contracts";

export interface IIterationParams {
    name: string;
    iterationPath: string;
    id: string;
    startDateUTC?: Date;
    finishDateUTC?: Date;
}

export class Iteration {

    /** The node name (not including any path components), e.g. "Iteration 1" */
    public readonly name: string;
    /** The node friendly path, e.g. "Test Project\Iteration 1" */
    public readonly iterationPath: string;
    /** The node id. Generally a GUID */
    public readonly id: string;
    /** The iteration start date */
    public readonly startDateUTC: Date;
    /** The iteration finish (end) date */
    public readonly finishDateUTC: Date;

    public get localeDisplayStartDate(): string {
        if (this.startDateUTC) {
            const dateTimeFormat = getDateTimeFormat();
            return localeFormat(this.startDateUTC, dateTimeFormat.ShortDatePattern, true);
        }

        return "";
    }

    public get localeDisplayFinishDate(): string {
        if (this.finishDateUTC) {
            const dateTimeFormat = getDateTimeFormat();
            return localeFormat(this.finishDateUTC, dateTimeFormat.ShortDatePattern, true);
        }

        return "";
    }

    public get startDateLocal(): Date {
        if (this.startDateUTC) {
            return shiftToLocal(this.startDateUTC);
        }
    }

    public get finishDateLocal(): Date {
        if (this.finishDateUTC) {
            return shiftToLocal(this.finishDateUTC);
        }
    }

    public get normalizedIterationPath(): string {
        return normalizePath(this.iterationPath);
    }

    constructor(params: IIterationParams) {
        this.name = params.name;
        this.iterationPath = params.iterationPath;
        this.id = params.id;
        this.startDateUTC = params.startDateUTC;
        this.finishDateUTC = params.finishDateUTC;
    }

    public getWorkingDays(weekends: number[], teamDaysOff: DateRange[] = []): number {
        if (this.startDateUTC && this.finishDateUTC) {
            return IterationDateUtil.getNumberOfWorkingDays(this.startDateUTC, this.finishDateUTC, weekends, teamDaysOff);
        }

        return 0;
    }

    /**
     * Set the builder properties using custom values
     * @param toMerge Properties to merge with the builder
     * @return Self
     */
    public update(toMerge?: {
        name?: string,
        iterationPath?: string,
        id?: string,
        startDateUTC?: Date,
        finishDateUTC?: Date,
        startDate?: Date,
        finishDate?: Date
    }): Iteration {
        const params = this._getParams();

        if (toMerge) {
            for (const key in toMerge) {
                if (key === "finishDate" || key === "startDate") {
                    params[key] = shiftToUTC(toMerge[key] as Date);
                } else if (key === "startDateUTC") {
                    params.startDateUTC = toMerge[key];
                } else if (key === "finishDateUTC") {
                    params.finishDateUTC = toMerge[key];
                } else {
                    params[key] = toMerge[key];
                }
            }
        }

        return new Iteration(params);
    }

    protected _getParams(): IIterationParams {
        return {
            name: this.name,
            iterationPath: this.iterationPath,
            id: this.id,
            startDateUTC: new Date(this.startDateUTC),
            finishDateUTC: new Date(this.finishDateUTC)
        };
    }
}
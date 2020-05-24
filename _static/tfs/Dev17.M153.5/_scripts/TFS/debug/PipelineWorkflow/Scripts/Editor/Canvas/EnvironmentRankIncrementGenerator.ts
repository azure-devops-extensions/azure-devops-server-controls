import { MoveDirection } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentNodeMover";

export class EnvironmentRankIncrementGenerator {

    public resetIncrement(): void {
        this._rankIncrement = EnvironmentRankIncrementGenerator.c_initialRankIncrement;
    }

    public getNextIncrement(moveDirection: MoveDirection, subIndex: number): number {
        const incrementIndex = this._getIncrementIndex(moveDirection);
        return this._rankIncrement * (incrementIndex + subIndex * EnvironmentRankIncrementGenerator.c_incrementStep);
    }

    public updateIncrement(): void {
        // Use a simple math trick to update the environment rank.
        // If current environment rank is 3 and the next environment rank is 4, then update the current environment rank
        // as 4 + rankIncrement * incrementIndex => 4 + 0.1 * 1 = 4.1
        // And change the rankIncrement to rankIncrement + incrementStep = 0.1 + 0.00000001 = 0.10000001.
        // This increment ensures that multiple increments or decrements in the current session
        // do not overlap and still ensures that the ranks are adjusted just above or below 
        // the sibling.
        this._rankIncrement = this._rankIncrement + EnvironmentRankIncrementGenerator.c_incrementStep;
    }

    private _getIncrementIndex(moveDirection: MoveDirection): number {
        return moveDirection === MoveDirection.down ? 1 : -1;
    }

    private _rankIncrement: number = EnvironmentRankIncrementGenerator.c_initialRankIncrement;

    private static readonly c_initialRankIncrement = 0.1;
    private static readonly c_incrementStep: number = 0.00000001;
}
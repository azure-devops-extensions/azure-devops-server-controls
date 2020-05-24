import { MonteCarloProcessedDataResult } from "Widgets/Scripts/MonteCarloWidget/MonteCarloDataProcessor";
import { MonteCarloConstants } from "Widgets/Scripts/MonteCarloWidget/MonteCarloConstants";


export interface SimulationResult {
    daysToCompletion: Map<number, number>;
    numIterations: number;
}

/** This class runs a Monte Carlo Simulation based on a given standard deviation and average.
 * 
 *  It calculates the number of days until a given number of tasks are completed by getting a random
 *  number from a weighted normal distribution. It then does this repeatedly until it has a statistically-
 *  accurate model for the distribution of completion times.
 */
export class MonteCarloSimulator {
    public static readonly maxIterationsAllowed = 1000000; // ceiling for performance concerns
    private prevRandomNumber = 5000000; // seed
    private secondRandom: number = null;


    /** Returns a map of "the number of days until completion" to the "count of iterations with that result". */
    public getDaysToCompletion(result: MonteCarloProcessedDataResult, numTasks: number): SimulationResult {
        let daysToCompletionCount = new Map<number, number>([]);
        let numIterations: number = 1;

        if (numTasks === 0) { // if user hasn't set the number of tasks, don't run iterations
            return null;
        }

        if (result.stdDev === 0) {
            daysToCompletionCount.set(Math.ceil(numTasks / result.average), 1);
            return {
                daysToCompletion: daysToCompletionCount,
                numIterations: numIterations
            };
        }

        numIterations = this.calculateNumberOfIterations(result.average, result.stdDev);
        for (let i = 0; i < numIterations; i++)
            daysToCompletionCount = this.runIteration(result.average, result.stdDev, numTasks, daysToCompletionCount);

        return {
            daysToCompletion: daysToCompletionCount,
            numIterations: numIterations
        };
    }

    /** Calculates the number of iterations needed to achieve a set amount of statistical error. */
    private calculateNumberOfIterations(avg: number, stdDev: number): number {
        // https://www.projectsmart.co.uk/docs/monte-carlo-simulation.pdf
        const stdDevMultiplier = 3;
        let numIterations = Math.ceil(((stdDevMultiplier * stdDev) / (avg * MonteCarloConstants.targetError)) ** 2); // iteration formula: N = [(3 * stdDev) / error] ^ 2
        return numIterations <= MonteCarloSimulator.maxIterationsAllowed ? numIterations : MonteCarloSimulator.maxIterationsAllowed;
    }

    /** Runs one iteration of the simulation. */
    private runIteration(avg: number, stdDev: number, numTasks: number, daysToCompletionMap: Map<number, number>): Map<number, number> {
        let days = 0;
        let tasksLeft = numTasks;

        while (tasksLeft > 0) {
            tasksLeft -= this.getRandomNormallyDistributedNumber(avg, stdDev);
            days++;
        }
        
        let daysToCompletionCount = daysToCompletionMap.has(days) ? <number>daysToCompletionMap.get(days) + 1 : 1;
        daysToCompletionMap.set(days, daysToCompletionCount);
        return daysToCompletionMap;
    }

    /** gets normally distributed number based on the Marsaglia Polar method */
    private getRandomNormallyDistributedNumber(avg, stdDev): number {
        // Marsaglia Polar Method: https://en.wikipedia.org/wiki/Marsaglia_polar_method

        let normalDistNum: number;
        if (this.secondRandom) { // formula produces 2 normally distributed numbers, so we either save or use the second
            normalDistNum = this.secondRandom;
            this.secondRandom = null;
        } else {
            let x, y, s;
            do {
                x = this.getRandom() * 2 - 1; // convert random to between [-1, 1]
                y = this.getRandom() * 2 - 1;
                s = x ** 2 + y ** 2;
            } while (s >= 1 || s === 0);

            s = Math.sqrt(-2 * Math.log(s) / s);
            this.secondRandom = y * s;
            normalDistNum = x * s;
        }

        let scaledDistNum = normalDistNum / 4; // convert to [-1, 1]
        return stdDev * scaledDistNum + avg;
    }

    private getRandom(): number {
        // https://en.wikipedia.org/wiki/Linear_congruential_generator
        // random number formaula: x[n+1] = (a*x[n] + c) % m

        // a, c, and m are the numbers used by Microsoft Visual/Quick C/C++
        const a = 214013;
        const c = 2531011;
        const m = 2**32;
        this.prevRandomNumber = (a * this.prevRandomNumber + c) % m;

        // convert to [0,1]
        return this.prevRandomNumber / m;
    }
}
/// <reference types="react-addons-perf" />

import React = require("react");

export function start(): void {
    if (React.addons && React.addons.Perf) {
        React.addons.Perf.start();
    }
}

export function stop(): void {
    if (React.addons && React.addons.Perf) {
        React.addons.Perf.stop();
    }
}

export function getLastMeasurements(): React.Measurements[] {
    if (React.addons && React.addons.Perf) {
        return React.addons.Perf.getLastMeasurements();
    }
}

export function printWasted(measurements: React.Measurements[]): void {
    if (React.addons && React.addons.Perf) {
        // react perf uses console.table, which works in chrome but is not implemented in edge
        if (!(<any>console).table) {
            (<any>console).table = function (data: any[]): void {
                if (data && data.length) {
                    let keys: string[] = Object.keys(data[0]);
                    console.log(keys.join(", "));

                    data.forEach((item) => {
                        let values = keys.map((key) => item[key]);
                        console.log(values.join(", "));
                    });
                }
            };
        }
        React.addons.Perf.printWasted(measurements);
    }
}

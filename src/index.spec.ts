import 'mocha';
import { expect } from 'chai';

import JournalCtl, { JournalCtlOptions, JournalDDateString, JournalDPriority } from ".";

function createInstance(options: JournalCtlOptions = {}, outputFields?: string[]) {
    const j = new JournalCtl(options, outputFields);
    j.stop();
}


describe('JournalCtl class', () => {
    it('Invalid date', () => {
        const invalidDates: (JournalDDateString | Date)[] = [
            "2020-99-99",
            "2020-01-01 99:99",
            new Date("12345-11-99")
        ];

        for (let date of invalidDates) {
            expect(() => { createInstance({ since: date }); }, `${date}`).to.throw();
            expect(() => { createInstance({ until: date }); }, `${date}`).to.throw();
        }

        expect(() => {
            createInstance({
                since: "2020-01-01",
                until: "2019-01-01"
            });
        }).to.throw();
    });

    it('Invalid unit file name', () => {
        const invalidUnitNames: string[] = [
            "a|.service",
            "pp**",
            "123;;",
        ];

        for (let unitName of invalidUnitNames) {
            expect(() => { createInstance({ unit: unitName }); }, unitName).to.throw();
        }
    });

    it('Invalid lines', () => {
        const invalidLineAmounts: number[] = [
            123.5,
            -10,
            -0.01,
            NaN
        ];

        for (let lines of invalidLineAmounts) {
            expect(() => { createInstance({ lines: lines }); }, `${lines}`).to.throw();
        }
    });

    it('Invalid priority', () => {
        const invalidPriorities: number[] = [
            123.5,
            -10,
            -0.01,
            NaN
        ];

        for (let priority of invalidPriorities) {
            expect(() => { createInstance({ priority: priority as JournalDPriority }); }, `${priority}`).to.throw();
        }
    });

    it('Invalid syslog identifier', () => {
        const invalidSyslogIdentifiers: string[] = [
            "sss sss",
            "",
            "__ "
        ];

        for (let identifier of invalidSyslogIdentifiers) {
            expect(() => { createInstance({ identifier: identifier }); }, `"${identifier}"`).to.throw();
        }
    });

    it('Invalid field', () => {
        const invalidFieldNames: string[] = [
            "abc1234",
            "aSBC__",
            "**",
            ""
        ];

        for (let fieldName of invalidFieldNames) {
            expect(() => { createInstance({}, [fieldName]); }).to.throw();
        }
    });
});
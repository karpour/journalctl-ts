# journalctl-ts - A journalctl client for node.js

This hybrid CommonJS/ESM library allows for querying and streaming journalctl messages in node.js apps. It utilizes the json output function of journalctl and offers most functionality of the cli application.
The class is an `EventEmitter`, however an `AsyncGenerator` interface is also available which allows to `for await` over incoming messages.

Make sure that the user running this program is in the `systemd-journal` group.

## Usage

### EventEmitter Interface

The default way to use this class is by utilizing its EventEmitter interface. The class emits 3 events, `"message"`, `"error"` and `"exit"`. Errors will be emitted right after instantiation if journalctl is not accessible, or during runtime if any kind of error occurs. If the process exits with an error, both an `"error"` and `"exit"` event will be emitted.

```typescript
import JournalCtl, { JournalDEntry } from "journalctl-ts";

const journalCtl = new JournalCtl();
journalCtl.on("error", (err: Error) => console.error(err));
journalCtl.on("message", (message: JournalDEntry) => console.log(message.MESSAGE));
```

### AsyncGenerator Interface

The class also offers an `AsyncGenerator` which yields messages as they come in. For practical reasons, only one AsyncGenerator can be created per JournalCtl instance. Trying to create any more AsyngGenerators will throw an Error.

The AsyncGenerator will stop yielding messages when the journalctl process terminates, regardless of whether an error occurs or not. To handle errors, add a handler for the `"error"` event of the EventEmitter.

```typescript
import JournalCtl from "journalctl-ts";

async function main() {
    const journalCtl = new JournalCtl();
    journalCtl.on("error", (err: Error) => console.error(err));
    const generator = journalCtl.createGenerator();
    for await (let message of generator) {
        console.log(message.MESSAGE);
    }
}

main();
```

### Custom fields

By default, the emitted messages will include all fields. This can be fine-tuned by providing a list of keys that should be included in the messages. Regardless of provided field names, a message will always include the fields `__CURSOR`, `__REALTIME_TIMESTAMP`, `__MONOTONIC_TIMESTAMP`, `_BOOT_ID`, `MESSAGE` and `SYSLOG_IDENTIFIER`.

If the fields are already known at compile-time, we can leverage Typescript to create a proper custom JournalDMessage type which includes the above-mentioned minimal set of fields as well as the selected fields.

```typescript
import JournalCtl from "journalctl-ts";

const fields = ["CODE_FILE", "CUSTOM_FIELD"] as const;

const journalCtl = new JournalCtl({}, fields);

// The type of message is now 
// JournalDEntryWithExplicitFieldNames<readonly ["CODE_FILE", "CUSTOM_FIELD"]>
journalCtl.on("message", (message) => console.log(message.CUSTOM_FIELD));
```

It is not necessary to define `fields` as const, but rather a convenience which is recommended when the fields are hard-coded.

### Filters

It is possible to filter on any field of a message by providing one or more key-value pairs.

```typescript
// Filter messages from the logger utility
const journalCtl = new JournalCtl({
    filter: {
        "CODE_FILE": "misc-utils/logger.c"
    }
});
```

A specific unit file can be specified

```typescript
// Filter messages from nginx
const journalCtl = new JournalCtl({
    unit: "nginx"
});
```

There are 2 ways to filter on priority, either by supplying a specific priority level...

```typescript
// Filter to receive only messages with WARNING priority
const journalCtl = new JournalCtl({
    priority: WARNING
});
```

...or a range.

```typescript
// Filter to receive only messages with priority EMERG up until ERROR
const journalCtl = new JournalCtl({
    priority: {
        from: EMERG,
        to: ERROR
    }
});
```

Filtering by dates is possible by setting `since` and/or `until`. If `until` is set, tailing will be disabled.

```typescript
// Filter from 2022-01-01 12:00:00 until 2022-01-03 00:00:00
const journalCtl = new JournalCtl({
    since: "2022-01-01 12:00",
    until: "2022-01-03"
});
```

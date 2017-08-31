/*
Copyright 2016 Aviral Dasgupta

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// @flow

import type {Component} from 'react';
import CommandProvider from './CommandProvider';
import DuckDuckGoProvider from './DuckDuckGoProvider';
import RoomProvider from './RoomProvider';
import UserProvider from './UserProvider';
import EmojiProvider from './EmojiProvider';
import Promise from 'bluebird';

export type SelectionRange = {
    start: number,
    end: number
};

export type Completion = {
    completion: string,
    component: ?Component,
    range: SelectionRange,
    command: ?string,
    // If provided, apply a LINK entity to the completion with the
    // data = { url: href }.
    href: ?string,
};

const PROVIDERS = [
    UserProvider,
    RoomProvider,
    EmojiProvider,
    CommandProvider,
    DuckDuckGoProvider,
].map(completer => completer.getInstance());

// Providers will get rejected if they take longer than this.
const PROVIDER_COMPLETION_TIMEOUT = 3000;

export async function getCompletions(query: string, selection: SelectionRange, force: boolean = false): Array<Completion> {
    /* Note: That this waits for all providers to return is *intentional*
     otherwise, we run into a condition where new completions are displayed
     while the user is interacting with the list, which makes it difficult
     to predict whether an action will actually do what is intended
    */
    const completionsList = await Promise.all(
        // Array of inspections of promises that might timeout. Instead of allowing a
        // single timeout to reject the Promise.all, reflect each one and once they've all
        // settled, filter for the fulfilled ones
        PROVIDERS.map((provider) => {
            return provider
                .getCompletions(query, selection, force)
                .timeout(PROVIDER_COMPLETION_TIMEOUT)
                .reflect();
        }),
    );

    return completionsList.filter(
        (inspection) => inspection.isFulfilled(),
    ).map((completionsState, i) => {
        return {
            completions: completionsState.value(),
            provider: PROVIDERS[i],

            /* the currently matched "command" the completer tried to complete
             * we pass this through so that Autocomplete can figure out when to
             * re-show itself once hidden.
             */
            command: PROVIDERS[i].getCurrentCommand(query, selection, force),
        };
    });
}
